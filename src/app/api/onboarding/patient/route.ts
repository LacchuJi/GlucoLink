import { audit, requireUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const user = await requireUser();
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "PATIENT" }
    });
    const patient = await prisma.patient.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
    await audit(user.id, "CREATE", "Patient", patient.id);
    return Response.json({ patient, role: "PATIENT" }, { status: 201 });
  } catch (error) {
    return Response.json({ error: "Sign in required" }, { status: 401 });
  }
}
