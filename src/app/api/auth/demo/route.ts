import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getRateLimitKey, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";


// Demo credentials are SERVER-SIDE ONLY — never returned to client
const DEMO_CREDENTIALS = {
  DOCTOR: {
    email: "doctor@glucolink.demo",
    name: "Dr. Sarah Adams",
    password: process.env.DEMO_DOCTOR_PASSWORD ?? "DemoDoctor12345!",
    redirectTo: "/clinician",
    role: "DOCTOR" as const,
  },
  PATIENT: {
    email: "patient@glucolink.demo",
    name: "Pawan Thakur (Demo Patient)",
    password: process.env.DEMO_PATIENT_PASSWORD ?? "DemoPatient12345!",
    redirectTo: "/",
    role: "PATIENT" as const,
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Rate limit: 5 demo logins per minute per IP
    const rlKey = getRateLimitKey(request, "demo");
    const rl = rateLimit(rlKey, RATE_LIMITS.DEMO);
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const role = body?.role === "DOCTOR" ? "DOCTOR" : "PATIENT";
    const creds = DEMO_CREDENTIALS[role];


    // Provision demo user if not yet created
    let user = await prisma.user.findUnique({ where: { email: creds.email } });

    if (!user) {
      await auth.api.signUpEmail({
        body: {
          email: creds.email,
          password: creds.password,
          name: creds.name,
        },
      });
      user = await prisma.user.findUnique({ where: { email: creds.email } });
    }

    if (!user) {
      return NextResponse.json(
        { error: "Failed to provision demo account" },
        { status: 500 }
      );
    }

    // Ensure correct role and profile
    await prisma.user.update({
      where: { id: user.id },
      data: { role: creds.role },
    });

    if (role === "DOCTOR") {
      let org = await prisma.organization.findFirst({
        where: { name: "GlucoLink Demo Clinic" },
      });
      if (!org) {
        org = await prisma.organization.create({
          data: { name: "GlucoLink Demo Clinic" },
        });
      }
      const existingDoctor = await prisma.doctor.findUnique({
        where: { userId: user.id },
      });
      if (!existingDoctor) {
        await prisma.doctor.create({
          data: { userId: user.id, organizationId: org.id },
        });
      }
    } else {
      let pat = await prisma.patient.findUnique({ where: { userId: user.id } });
      if (!pat) {
        pat = await prisma.patient.create({ data: { userId: user.id } });
      }
      // Auto-assign to demo doctor if one exists
      const demoDoc = await prisma.doctor.findFirst();
      if (demoDoc) {
        await prisma.careAssignment.upsert({
          where: {
            doctorId_patientId: { doctorId: demoDoc.id, patientId: pat.id },
          },
          create: { doctorId: demoDoc.id, patientId: pat.id },
          update: {},
        });
      }
    }

    // Create a server-side session directly — credentials NEVER leave the server
    const signInResponse = await auth.api.signInEmail({
      body: { email: creds.email, password: creds.password },
      asResponse: true,
    });

    if (!signInResponse.ok) {
      return NextResponse.json(
        { error: "Demo sign-in failed" },
        { status: 500 }
      );
    }

    // Forward session cookies from Better Auth to the client
    const sessionCookies = signInResponse.headers.getSetCookie?.() ?? [];
    const response = NextResponse.json({ redirectTo: creds.redirectTo });
    for (const cookie of sessionCookies) {
      response.headers.append("Set-Cookie", cookie);
    }
    return response;
  } catch (err) {
    logger.error("demo-auth", "Demo login failed", err);
    return NextResponse.json({ error: "Demo login unavailable" }, { status: 500 });
  }
}

