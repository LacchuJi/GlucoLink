import { audit, requireUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const postSchema = z.object({
  patientId: z.string().optional(),
  content: z.string().min(1, "Message content cannot be empty"),
  readingId: z.string().optional(),
  attachmentJson: z.string().optional(),
  senderRole: z.enum(["PATIENT", "DOCTOR"]).optional()
});

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const queryPatientId = searchParams.get("patientId");

    let targetPatientId: string | null = null;
    let targetDoctorId: string | null = null;
    let patientsWithUnread: { id: string; name: string; email: string; unreadCount: number }[] = [];

    if (user.role === "DOCTOR") {
      const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
      if (!doctor) return Response.json({ error: "Doctor profile missing" }, { status: 403 });
      
      targetDoctorId = doctor.id;
      const assignments = await prisma.careAssignment.findMany({
        where: { doctorId: doctor.id },
        include: { patient: { include: { user: true } } }
      });
      
      patientsWithUnread = await Promise.all(
        assignments.map(async (a) => {
          const unread = await prisma.chatMessage.count({
            where: {
              patientId: a.patient.id,
              senderRole: "PATIENT",
              isRead: false
            }
          });
          return {
            id: a.patient.id,
            name: a.patient.user.name,
            email: a.patient.user.email,
            unreadCount: unread
          };
        })
      );

      if (queryPatientId) {
        targetPatientId = queryPatientId;
      } else if (assignments.length > 0) {
        targetPatientId = assignments[0].patient.id;
      }
    } else {
      // Patient Role
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
        if (firstDoctor) {
          assignment = await prisma.careAssignment.create({
            data: { doctorId: firstDoctor.id, patientId: patient.id }
          });
        }
      }
      targetDoctorId = assignment?.doctorId ?? null;
    }

    if (!targetPatientId) {
      return Response.json({ messages: [], patients: patientsWithUnread, unreadCount: 0 });
    }

    // Mark incoming messages as read
    const oppositeRole = user.role === "DOCTOR" ? "PATIENT" : "DOCTOR";
    await prisma.chatMessage.updateMany({
      where: {
        patientId: targetPatientId,
        senderRole: oppositeRole,
        isRead: false
      },
      data: { isRead: true, readAt: new Date() }
    });

    let messages = await prisma.chatMessage.findMany({
      where: {
        patientId: targetPatientId
      },
      include: {
        reading: true
      },
      orderBy: { createdAt: "asc" }
    });

    // Fallback: If logged-in patient has no messages yet, fetch demo patient thread messages
    if (messages.length === 0 && user.role !== "DOCTOR") {
      const demoPatient = await prisma.patient.findFirst({
        where: { id: { not: targetPatientId } }
      });
      if (demoPatient) {
        messages = await prisma.chatMessage.findMany({
          where: { patientId: demoPatient.id },
          include: { reading: true },
          orderBy: { createdAt: "asc" }
        });
      }
    }

    const unreadCount = await prisma.chatMessage.count({
      where: {
        patientId: targetPatientId,
        senderRole: oppositeRole,
        isRead: false
      }
    });

    return Response.json({ messages, patients: patientsWithUnread, unreadCount });
  } catch (error) {
    console.error("Messages GET Error:", error);
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

    const { content, patientId: bodyPatientId, readingId, attachmentJson, senderRole: bodySenderRole } = parsed.data;
    let targetPatientId: string;
    let targetDoctorId: string;
    let senderRole: "PATIENT" | "DOCTOR" = bodySenderRole || (user.role === "DOCTOR" ? "DOCTOR" : "PATIENT");

    if (senderRole === "DOCTOR") {
      let doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
      if (!doctor) {
        doctor = await prisma.doctor.findFirst();
      }
      if (!doctor) return Response.json({ error: "Doctor profile missing" }, { status: 403 });
      
      let targetPatient: { id: string } | null = null;
      if (bodyPatientId) {
        targetPatient = { id: bodyPatientId };
      } else {
        const firstAssign = await prisma.careAssignment.findFirst({ where: { doctorId: doctor.id } });
        if (firstAssign) targetPatient = { id: firstAssign.patientId };
      }

      if (!targetPatient) return Response.json({ error: "No target patient found" }, { status: 400 });

      targetDoctorId = doctor.id;
      targetPatientId = targetPatient.id;

      // Ensure CareAssignment exists
      await prisma.careAssignment.upsert({
        where: { doctorId_patientId: { doctorId: doctor.id, patientId: targetPatientId } },
        create: { doctorId: doctor.id, patientId: targetPatientId },
        update: {}
      });
    } else {
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
        content,
        readingId: readingId || null,
        attachmentJson: attachmentJson || null
      },
      include: {
        reading: true
      }
    });

    // Also mirror Care Directive to active user's patient thread if testing in preview mode
    const userPatient = await prisma.patient.findUnique({ where: { userId: user.id } });
    if (userPatient && userPatient.id !== targetPatientId) {
      await prisma.chatMessage.create({
        data: {
          patientId: userPatient.id,
          doctorId: targetDoctorId,
          senderId: user.id,
          senderRole,
          content,
          readingId: readingId || null,
          attachmentJson: attachmentJson || null
        }
      });
    }

    await audit(user.id, "CREATE_CHAT_MESSAGE", "ChatMessage", message.id);

    return Response.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Messages POST Error:", error);
    return Response.json({ error: "Failed to send message" }, { status: 500 });
  }
}
