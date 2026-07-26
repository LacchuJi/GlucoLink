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
  let patient = await prisma.patient.findUnique({ where: { userId: user.id } });
  if (!patient) {
    patient = await prisma.patient.create({ data: { userId: user.id } });
  }
  return { user, patient };
}

export async function requireDoctor() {
  const user = await requireUser();
  if (user.role !== "DOCTOR") throw new Error("FORBIDDEN");
  const doctor = await prisma.doctor.findUnique({ where: { userId: user.id }, include: { organization: true } });
  if (!doctor) throw new Error("DOCTOR_PROFILE_MISSING");
  return { user, doctor, organization: doctor.organization };
}

export async function requireAssignedPatient(patientId: string) {
  const { doctor } = await requireDoctor();
  const assignment = await prisma.careAssignment.findUnique({ where: { doctorId_patientId: { doctorId: doctor.id, patientId } } });
  if (!assignment) throw new Error("FORBIDDEN");
  const patient = await prisma.patient.findUnique({ where: { id: patientId }, include: { user: true } });
  if (!patient) throw new Error("PATIENT_NOT_FOUND");
  return { doctor, patient, user: patient.user };
}

export async function audit(userId: string, action: string, entityType: string, entityId?: string) {
  await prisma.auditLog.create({ data: { userId, action, entityType, entityId } });
}
