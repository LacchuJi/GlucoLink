import { requireAssignedPatient, audit } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const noteSchema = z.object({
  patientId: z.string(),
  content: z.string().min(1, "Note cannot be empty"),
  status: z.enum(["draft", "signed"]),
  noteId: z.string().optional(), // For updating drafts
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    if (!patientId) return Response.json({ error: "Missing patientId" }, { status: 400 });

    await requireAssignedPatient(patientId);

    const notes = await prisma.clinicalNote.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ notes });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return Response.json({ error: "Access denied" }, { status: 403 });
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = noteSchema.safeParse(json);
    if (!parsed.success) return Response.json({ error: "Invalid data" }, { status: 400 });

    const { patientId, content, status, noteId } = parsed.data;
    const { doctor, user } = await requireAssignedPatient(patientId);

    if (noteId) {
      // Update existing draft
      const existing = await prisma.clinicalNote.findUnique({ where: { id: noteId } });
      if (!existing || existing.doctorId !== doctor.id || existing.patientId !== patientId) {
        return Response.json({ error: "Not found or forbidden" }, { status: 404 });
      }
      if (existing.status === "signed") {
        return Response.json({ error: "Cannot edit a signed note" }, { status: 400 });
      }

      const updated = await prisma.clinicalNote.update({
        where: { id: noteId },
        data: { content, status },
      });
      await audit(user.id, "UPDATE_NOTE", "ClinicalNote", updated.id);
      return Response.json({ note: updated });
    } else {
      // Create new note
      const note = await prisma.clinicalNote.create({
        data: {
          patientId,
          doctorId: doctor.id,
          content,
          status,
        },
      });
      await audit(user.id, "CREATE_NOTE", "ClinicalNote", note.id);
      return Response.json({ note });
    }
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return Response.json({ error: "Access denied" }, { status: 403 });
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
