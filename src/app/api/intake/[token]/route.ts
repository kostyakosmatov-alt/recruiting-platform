import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const session = await prisma.intakeSession.findUnique({
    where: { token },
    include: { client: { select: { id: true, name: true } } },
  });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: session.id,
    status: session.status,
    messages: session.messages,
    files: session.files,
    clientId: session.clientId,
    clientName: session.client.name,
    vacancyId: session.vacancyId,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const authSession = await auth();
  if (!authSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await params;
  const session = await prisma.intakeSession.findUnique({ where: { token } });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.intakeSession.delete({ where: { token } });
  return NextResponse.json({ ok: true });
}
