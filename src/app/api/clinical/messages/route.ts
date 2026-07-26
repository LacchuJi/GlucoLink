import { audit, requireDoctor, requireUser, requirePatient } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const postSchema = z.object({
  patientId: z.string().optional(),
  content: z.string().min(1, "Message content cannot be empty")
});

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const queryPatientId = searchParams.get("patientId");

    let targetPatientId: string | null = null;
    let targetDoctorId: string | null = null;

    if (user.role === "DOCTOR") {
      const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
      if (!doctor) return Response.json({ error: "Doctor profile missing" }, { status: 403 });
      
      targetDoctorId = doctor.id;
      if (!queryPatientId) {
        // Return active patients list for messaging
        const assignments = await prisma.careAssignment.findMany({
          where: { doctorId: doctor.id },
          include: { patient: { include: { user: true } } }
        });
        return Response.json({
          patients: assignments.map(a => ({ id: a.patient.id, name: a.patient.user.name, email: a.patient.user.email })),
          messages: []
        });
      }
      targetPatientId = queryPatientId;
    } else {
      // Patient user
      let patient = await prisma.patient.findUnique({ where: { userId: user.id } });
      if (!patient) {
        patient = await prisma.patient.create({ data: { userId: user.id } });
      }
      targetPatientId = patient.id;

      // Find care assignment for doctor
      const assignment = await prisma.careAssignment.findFirst({
        where: { patientId: patient.id }
      });

      if (!assignment) {
        // Auto-assign to first doctor if demo care team
        const firstDoctor = await prisma.doctor.findFirst();
        if (firstDoctor) {
          const newAssign = await prisma.careAssignment.create({
            data: { doctorId: firstDoctor.id, patientId: patient.id }
          });
          targetDoctorId = newAssign.doctorId;
        }
      } else {
        targetDoctorId = assignment.doctorId;
      }
    }

    if (!targetPatientId || !targetDoctorId) {
      return Response.json({ messages: [] });
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        patientId: targetPatientId,
        doctorId: targetDoctorId
      },
      orderBy: { createdAt: "asc" }
    });

    return Response.json({ messages });
  } catch (error) {
    return Response.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid message data" }, { status: 400 });
    }

    const { content, patientId: bodyPatientId } = parsed.data;
    let targetPatientId: string;
    let targetDoctorId: string;
    let senderRole: "PATIENT" | "DOCTOR";

    if (user.role === "DOCTOR") {
      senderRole = "DOCTOR";
      const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
      if (!doctor) return Response.json({ error: "Doctor profile missing" }, { status: 403 });
      if (!bodyPatientId) return Response.json({ error: "Patient ID required for clinician message" }, { status: 400 });

      targetDoctorId = doctor.id;
      targetPatientId = bodyPatientId;
    } else {
      senderRole = "PATIENT";
      let patient = await prisma.patient.findUnique({ where: { userId: user.id } });
      if (!patient) {
        patient = await prisma.patient.create({ data: { userId: user.id } });
      }
      targetPatientId = patient.id;

      let assignment = await prisma.careAssignment.findFirst({
        where: { patientId: patient.id }
      });

      if (!assignment) {
        const firstDoctor = await prisma.doctor.findFirst();
        if (!firstDoctor) {
          return Response.json({ error: "No available doctor in system" }, { status: 400 });
        }
        assignment = await prisma.careAssignment.create({
          data: { doctorId: firstDoctor.id, patientId: patient.id }
        });
      }
      targetDoctorId = assignment.doctorId;
    }

    const message = await prisma.chatMessage.create({
      data: {
        patientId: targetPatientId,
        doctorId: targetDoctorId,
        senderId: user.id,
        senderRole,
        content
      }
    });

    await audit(user.id, "CREATE_CHAT_MESSAGE", "ChatMessage", message.id);

    return Response.json({ message }, { status: 201 });
  } catch (error) {
    return Response.json({ error: "Failed to send message" }, { status: 500 });
  }
}
