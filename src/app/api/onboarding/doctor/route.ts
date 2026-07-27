import { requireUser, audit } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    let clinicName = "GlucoLink Care Clinic";
    try {
      const body = await request.json();
      if (body.clinicName?.trim()) {
        clinicName = body.clinicName.trim();
      }
    } catch {
      // Body optional
    }

    const org = await prisma.organization.create({
      data: { name: clinicName }
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { role: "DOCTOR" }
    });

    let doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
    if (!doctor) {
      doctor = await prisma.doctor.create({
        data: {
          userId: user.id,
          organizationId: org.id
        }
      });
    }

    await audit(user.id, "CREATE", "Doctor", doctor.id);

    return Response.json({ success: true, doctorId: doctor.id, role: "DOCTOR" });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : "Doctor onboarding failed" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await requireUser();

    if (user.role !== "DOCTOR") {
      const org = await prisma.organization.create({
        data: { name: "GlucoLink Care Clinic" }
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { role: "DOCTOR" }
      });

      let doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
      if (!doctor) {
        doctor = await prisma.doctor.create({
          data: {
            userId: user.id,
            organizationId: org.id
          }
        });
      }

      await audit(user.id, "CREATE", "Doctor", doctor.id);
    }
  } catch (error) {
    console.error(error);
  }
  
  redirect("/clinician");
}
