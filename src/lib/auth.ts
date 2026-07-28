import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
  },
  session: {
    // Sessions expire after 24 hours of inactivity
    expiresIn: 60 * 60 * 24,
    // Session token is refreshed if the last update was more than 1 hour ago
    updateAge: 60 * 60,
    // Use strict cookie security
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // Cache for 5 minutes to reduce DB lookups
    },
  },
  trustedOrigins: [
    process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ],
  rateLimit: {
    enabled: true,
    window: 60,   // 60-second window
    max: 20,      // 20 auth requests per minute per IP
  },
});
