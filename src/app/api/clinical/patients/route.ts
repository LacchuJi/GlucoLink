import { requireDoctor, audit } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { user, doctor, organization } = await requireDoctor();
    
    const assignments = await prisma.careAssignment.findMany({
      where: { doctorId: doctor.id },
      include: {
        patient: {
          include: {
            user: true,
            readings: {
              where: {
                recordedAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }
              },
              orderBy: { recordedAt: "desc" }
            }
          }
        }
      }
    });

    const snapshots = assignments.map(assignment => {
      const p = assignment.patient;
      const u = p.user;
      const readings = p.readings;
      
      const initials = (u.name || "Unknown Patient").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
      
      const lastReading = readings.length > 0 ? readings[0].valueMgDl : 0;
      const lastLoggedHoursAgo = readings.length > 0 ? Math.floor((Date.now() - readings[0].recordedAt.getTime()) / (1000 * 60 * 60)) : 999;
      
      const lowEvents7d = readings.filter(r => r.valueMgDl < 70 && r.recordedAt.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000).length;
      
      const timeInRange = readings.length > 0 ? Math.round((readings.filter(r => r.valueMgDl >= 70 && r.valueMgDl <= 180).length / readings.length) * 100) : 0;
      
      const average = readings.length > 0 ? Math.round(readings.reduce((sum, r) => sum + r.valueMgDl, 0) / readings.length) : 0;
      const a1c = average > 0 ? parseFloat(((average + 46.7) / 28.7).toFixed(1)) : 0;
      
      return {
        id: p.id,
        name: u.name,
        initials,
        age: 50,
        a1c,
        timeInRange,
        average,
        lastReading,
        lastLoggedHoursAgo,
        unreadMessages: 0,
        lowEvents7d,
        trendPct14d: 0
      };
    });

    await audit(user.id, "READ", "PatientList");

    return Response.json({ patients: snapshots, organization });
  } catch {
    return Response.json({ error: "Failed to fetch assigned patients" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { doctor } = await requireDoctor();
    const { email } = await request.json();
    if (!email) return Response.json({ error: "Email is required" }, { status: 400 });

    const userToAssign = await prisma.user.findFirst({ 
      where: { email: { equals: email.trim(), mode: "insensitive" } } 
    });
    
    if (!userToAssign) {
      return Response.json({ error: `No account found for "${email}". The patient must create an account first.` }, { status: 404 });
    }
    
    if (userToAssign.role !== "PATIENT") {
      return Response.json({ error: `The account "${email}" is registered as a ${userToAssign.role}, not a PATIENT.` }, { status: 404 });
    }

    // Ensure patient profile exists
    let patient = await prisma.patient.findUnique({ where: { userId: userToAssign.id } });
    if (!patient) {
      patient = await prisma.patient.create({ data: { userId: userToAssign.id } });
    }

    // Create assignment
    await prisma.careAssignment.upsert({
      where: { doctorId_patientId: { doctorId: doctor.id, patientId: patient.id } },
      update: {},
      create: { doctorId: doctor.id, patientId: patient.id }
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Assignment error:", error);
    return Response.json({ error: error instanceof Error ? error.message : "Failed to assign patient" }, { status: 500 });
  }
}
