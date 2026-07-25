import { audit, requireUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const user = await requireUser();
    if (user.role !== "PATIENT") return Response.json({ error: "Only patient self-enrollment is enabled" }, { status: 403 });
    const patient = await prisma.patient.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
    await audit(user.id, "CREATE", "Patient", patient.id);
    return Response.json({ patient }, { status: 201 });
  } catch { return Response.json({ error: "Sign in required" }, { status: 401 }); }
}
