import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const isAdmin = session.user.role === "ADMIN";

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      recruiter: { select: { id: true, name: true } },
      vacancies: {
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { applications: true } },
          applications: {
            where: { stage: "HIRED" },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isAdmin && client.recruiterId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(client);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const isAdmin = session.user.role === "ADMIN";
  const body = await req.json();
  const { name, contactName, contactEmail, contactPhone, recruiterId } = body;

  // Recruiter-only update (from inline select — no name in payload)
  if (!name && recruiterId !== undefined) {
    if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const client = await prisma.client.update({
      where: { id },
      data: { recruiterId: recruiterId || null },
      include: { recruiter: { select: { id: true, name: true } } },
    });
    return NextResponse.json(client);
  }

  if (!name?.trim()) {
    return NextResponse.json({ error: "Название компании обязательно" }, { status: 400 });
  }

  const client = await prisma.client.update({
    where: { id },
    data: {
      name: name.trim(),
      contactName: contactName?.trim() || null,
      contactEmail: contactEmail?.trim() || null,
      contactPhone: contactPhone?.trim() || null,
      ...(isAdmin && recruiterId ? { recruiterId } : {}),
    },
    include: { recruiter: { select: { id: true, name: true } } },
  });

  return NextResponse.json(client);
}
