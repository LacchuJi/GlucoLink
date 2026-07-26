import { requireUser, audit } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function GET() {
  try {
    const user = await requireUser();
    
    if (user.role === "DOCTOR") {
      return Response.json({ message: "Already a doctor" });
    }

    const org = await prisma.organization.create({
      data: { name: "GlucoLink Demo Clinic" }
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { role: "DOCTOR" }
    });

    const doctor = await prisma.doctor.create({
      data: {
        userId: user.id,
        organizationId: org.id
      }
    });

    await audit(user.id, "CREATE", "Doctor", doctor.id);
  } catch (error) {
    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error", stack: error instanceof Error ? error.stack : undefined }, { status: 500 });
  }
  
  redirect("/clinician");
}
