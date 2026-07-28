import { audit, requireUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { rateLimit, getRateLimitKey, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";

// senderRole is derived server-side from user.role — never trusted from client
const postSchema = z.object({
  patientId: z.string().optional(),
  content: z.string().min(1, "Message content cannot be empty").max(2000, "Message too long"),
  readingId: z.string().optional(),
  attachmentJson: z.string().max(4000).optional(),
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
      // Doctors: must have a doctor profile — no fallback to first doctor
      const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
      if (!doctor) return Response.json({ error: "Doctor profile not found" }, { status: 403 });

      targetDoctorId = doctor.id;
      const assignments = await prisma.careAssignment.findMany({
        where: { doctorId: doctor.id },
        include: { patient: { include: { user: true } } }
      });

      patientsWithUnread = await Promise.all(
        assignments.map(async (a) => {
          const unread = await prisma.chatMessage.count({
            where: { patientId: a.patient.id, senderRole: "PATIENT", isRead: false }
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
        // Verify the doctor is actually assigned to this patient (IDOR prevention)
        const validAssignment = assignments.find((a) => a.patient.id === queryPatientId);
        if (!validAssignment) {
          return Response.json({ error: "Access denied to this patient thread" }, { status: 403 });
        }
        targetPatientId = queryPatientId;
      } else if (assignments.length > 0) {
        targetPatientId = assignments[0].patient.id;
      }
    } else {
      // Patients: can only see their own thread
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
      where: { patientId: targetPatientId, senderRole: oppositeRole, isRead: false },
      data: { isRead: true, readAt: new Date() }
    });

    // Fetch only this patient's messages — no cross-patient fallback
    const messages = await prisma.chatMessage.findMany({
      where: { patientId: targetPatientId },
      include: { reading: true },
      orderBy: { createdAt: "asc" }
    });

    const unreadCount = await prisma.chatMessage.count({
      where: { patientId: targetPatientId, senderRole: oppositeRole, isRead: false }
    });

    return Response.json({ messages, patients: patientsWithUnread, unreadCount });
  } catch (error) {
    const isAuth = error instanceof Error && (error.message === "UNAUTHENTICATED" || error.message === "FORBIDDEN");
    return Response.json(
      { error: isAuth ? "Access denied" : "Failed to fetch messages" },
      { status: isAuth ? 401 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Rate limit: 30 messages per minute per IP
    const rlKey = getRateLimitKey(request, "messages");
    const rl = rateLimit(rlKey, RATE_LIMITS.MESSAGES);
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const user = await requireUser();
    const body = await request.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid message data" }, { status: 400 });
    }

    const { content, patientId: bodyPatientId, readingId, attachmentJson } = parsed.data;
    // senderRole is derived from the verified server-side session — never from request body
    const senderRole: "PATIENT" | "DOCTOR" = user.role === "DOCTOR" ? "DOCTOR" : "PATIENT";
    let targetPatientId: string;
    let targetDoctorId: string;

    if (senderRole === "DOCTOR") {
      // Strict doctor check — no fallback
      const doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
      if (!doctor) return Response.json({ error: "Doctor profile not found" }, { status: 403 });

      // Resolve target patient
      let targetPatientRecord: { id: string } | null = null;
      if (bodyPatientId) {
        // Verify doctor is assigned to this patient (IDOR prevention)
        const assignment = await prisma.careAssignment.findUnique({
          where: { doctorId_patientId: { doctorId: doctor.id, patientId: bodyPatientId } }
        });
        if (!assignment) {
          return Response.json({ error: "You are not assigned to this patient" }, { status: 403 });
        }
        targetPatientRecord = { id: bodyPatientId };
      } else {
        const firstAssign = await prisma.careAssignment.findFirst({ where: { doctorId: doctor.id } });
        if (firstAssign) targetPatientRecord = { id: firstAssign.patientId };
      }

      if (!targetPatientRecord) {
        return Response.json({ error: "No target patient found" }, { status: 400 });
      }

      targetDoctorId = doctor.id;
      targetPatientId = targetPatientRecord.id;
    } else {
      // Patient sending a message
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
      include: { reading: true }
    });

    await audit(user.id, "CREATE_CHAT_MESSAGE", "ChatMessage", message.id);

    return Response.json({ message }, { status: 201 });
  } catch (error) {
    const isAuth = error instanceof Error && (error.message === "UNAUTHENTICATED" || error.message === "FORBIDDEN");
    return Response.json(
      { error: isAuth ? "Access denied" : "Failed to send message" },
      { status: isAuth ? 401 : 500 }
    );
  }
}
