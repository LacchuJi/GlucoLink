import { requireUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireUser();
    const [patient, doctor] = await Promise.all([
      prisma.patient.findUnique({ where: { userId: user.id } }),
      prisma.doctor.findUnique({ where: { userId: user.id }, include: { organization: true } })
    ]);

    return Response.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      patientId: patient?.id ?? null,
      doctorId: doctor?.id ?? null,
      clinicName: doctor?.organization?.name ?? null
    });
  } catch (error) {
    return Response.json({ user: null }, { status: 401 });
  }
}
