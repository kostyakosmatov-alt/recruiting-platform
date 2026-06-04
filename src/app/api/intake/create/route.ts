import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId } = await req.json();
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const token = crypto.randomUUID().replace(/-/g, "");

  const intake = await prisma.intakeSession.create({
    data: { token, clientId, status: "PENDING", messages: [], files: [] },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return NextResponse.json({ token: intake.token, url: `${baseUrl}/intake/${intake.token}` });
}
