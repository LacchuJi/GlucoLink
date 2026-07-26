import { z } from "zod";
import { audit, requirePatient } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { evaluateAlerts } from "@/server/alerts/engine";

const bodySchema = z.object({ value: z.number().int().min(20).max(700), context: z.enum(["FASTING", "BEFORE_MEAL", "AFTER_MEAL", "BEDTIME", "RANDOM"]), source: z.enum(["MANUAL", "DEVICE_IMPORT", "WHATSAPP", "OCR", "HEALTH_CONNECT"]), recordedAt: z.string().datetime() });
const errorResponse = (error: unknown) => Response.json({ error: error instanceof Error && error.message === "UNAUTHENTICATED" ? "Sign in required" : "You do not have access to this resource" }, { status: error instanceof Error && error.message === "UNAUTHENTICATED" ? 401 : 403 });

export async function GET() {
  try { const { patient } = await requirePatient(); const readings = await prisma.reading.findMany({ where: { patientId: patient.id }, orderBy: { recordedAt: "desc" }, take: 180 }); return Response.json({ readings }); } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const { user, patient } = await requirePatient(); const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Invalid glucose reading" }, { status: 400 });
    const reading = await prisma.reading.create({ data: { patientId: patient.id, valueMgDl: parsed.data.value, context: parsed.data.context, source: parsed.data.source, recordedAt: new Date(parsed.data.recordedAt), verifiedAt: parsed.data.source === "DEVICE_IMPORT" ? new Date() : null } });
    await audit(user.id, "CREATE", "Reading", reading.id);
    
    // Evaluate alerts asynchronously (fire and forget)
    evaluateAlerts(patient.id).catch(console.error);

    return Response.json({ reading }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
