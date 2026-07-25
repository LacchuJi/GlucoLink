import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("UNAUTHENTICATED");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || !user.isActive) throw new Error("UNAUTHENTICATED");
  return user;
}

export async function requirePatient() {
  const user = await requireUser();
  if (user.role !== "PATIENT") throw new Error("FORBIDDEN");
  const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
  if (!patient) throw new Error("PATIENT_PROFILE_MISSING");
  return { user, patient };
}

export async function audit(userId: string, action: string, entityType: string, entityId?: string) {
  await prisma.auditLog.create({ data: { userId, action, entityType, entityId } });
}
