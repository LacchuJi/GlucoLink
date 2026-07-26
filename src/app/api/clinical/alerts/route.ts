import { requireDoctor, audit } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  try {
    const { doctor } = await requireDoctor();
    
    const assignments = await prisma.careAssignment.findMany({
      where: { doctorId: doctor.id },
      select: { patientId: true }
    });
    
    const patientIds = assignments.map(a => a.patientId);
    
    const alerts = await prisma.alert.findMany({
      where: {
        patientId: { in: patientIds },
        status: "open"
      },
      orderBy: { triggeredAt: "desc" }
    });

    return Response.json({ alerts });
  } catch {
    return Response.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { user, doctor } = await requireDoctor();
    const body = await request.json();
    
    const schema = z.object({ alertId: z.string(), status: z.literal("resolved") });
    const parsed = schema.safeParse(body);
    if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
    
    const alert = await prisma.alert.findUnique({ where: { id: parsed.data.alertId } });
    if (!alert) return Response.json({ error: "Not found" }, { status: 404 });
    
    const assignment = await prisma.careAssignment.findUnique({
      where: { doctorId_patientId: { doctorId: doctor.id, patientId: alert.patientId } }
    });
    if (!assignment) return Response.json({ error: "Forbidden" }, { status: 403 });
    
    const updated = await prisma.alert.update({
      where: { id: alert.id },
      data: { status: "resolved", resolvedAt: new Date() }
    });
    
    await audit(user.id, "UPDATE", "Alert", alert.id);
    
    return Response.json({ alert: updated });
  } catch {
    return Response.json({ error: "Failed to update alert" }, { status: 500 });
  }
}
