import { z } from "zod";

const bodySchema = z.object({ value: z.number().int().min(20).max(700), context: z.enum(["FASTING", "BEFORE_MEAL", "AFTER_MEAL", "BEDTIME", "RANDOM"]), source: z.enum(["MANUAL", "DEVICE_IMPORT", "WHATSAPP", "OCR"]), recordedAt: z.string().datetime() });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid glucose reading" }, { status: 400 });
  // Persist through ReadingService/Prisma after authenticated tenant context is resolved.
  return Response.json({ id: crypto.randomUUID(), ...parsed.data, verified: parsed.data.source === "DEVICE_IMPORT" }, { status: 201 });
}
