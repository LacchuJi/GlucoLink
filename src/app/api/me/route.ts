import { requireUser } from "@/lib/access";
export async function GET() { try { return Response.json({ user: await requireUser() }); } catch { return Response.json({ error: "Sign in required" }, { status: 401 }); } }
