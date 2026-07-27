import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { role } = await request.json();
    const isDoctor = role === "DOCTOR";
    const demoEmail = isDoctor ? "doctor@glucolink.demo" : "patient@glucolink.demo";
    const demoName = isDoctor ? "Dr. Sarah Adams" : "Pawan Thakur (Demo Patient)";
    const demoPassword = isDoctor ? "DemoDoctor12345!" : "DemoPatient12345!";

    let user = await prisma.user.findUnique({ where: { email: demoEmail } });

    if (!user) {
      // Create user via Better Auth OR Prisma
      const created = await auth.api.signUpEmail({
        body: {
          email: demoEmail,
          password: demoPassword,
          name: demoName
        }
      });
      user = await prisma.user.findUnique({ where: { email: demoEmail } });
    }

    if (!user) {
      return Response.json({ error: "Failed to provision demo user" }, { status: 500 });
    }

    // Ensure role and profiles exist
    if (isDoctor) {
      await prisma.user.update({ where: { id: user.id }, data: { role: "DOCTOR" } });
      let org = await prisma.organization.findFirst({ where: { name: "GlucoLink Demo Clinic" } });
      if (!org) org = await prisma.organization.create({ data: { name: "GlucoLink Demo Clinic" } });
      
      let doc = await prisma.doctor.findUnique({ where: { userId: user.id } });
      if (!doc) await prisma.doctor.create({ data: { userId: user.id, organizationId: org.id } });
    } else {
      await prisma.user.update({ where: { id: user.id }, data: { role: "PATIENT" } });
      let pat = await prisma.patient.findUnique({ where: { userId: user.id } });
      if (!pat) pat = await prisma.patient.create({ data: { userId: user.id } });
      
      // Auto-assign to demo doctor if doctor exists
      const demoDoc = await prisma.doctor.findFirst();
      if (demoDoc) {
        await prisma.careAssignment.upsert({
          where: { doctorId_patientId: { doctorId: demoDoc.id, patientId: pat.id } },
          create: { doctorId: demoDoc.id, patientId: pat.id },
          update: {}
        });
      }
    }

    return Response.json({
      email: demoEmail,
      password: demoPassword,
      redirectTo: isDoctor ? "/clinician" : "/"
    });
  } catch (error) {
    console.error("Demo login error:", error);
    return Response.json({ error: "Demo provision failed" }, { status: 500 });
  }
}
