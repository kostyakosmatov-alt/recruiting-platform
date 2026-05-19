import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = session.user.role === "ADMIN";

  const clients = await prisma.client.findMany({
    where: isAdmin ? undefined : { recruiterId: session.user.id },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      contactName: true,
      contactEmail: true,
      contactPhone: true,
      status: true,
      _count: { select: { vacancies: true } },
    },
  });
  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, contactName, contactEmail, contactPhone } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Название компании обязательно" }, { status: 400 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const recruiterId = (isAdmin && body.recruiterId) ? body.recruiterId : session.user.id;

  const client = await prisma.client.create({
    data: {
      name: name.trim(),
      contactName: contactName?.trim() || null,
      contactEmail: contactEmail?.trim() || null,
      contactPhone: contactPhone?.trim() || null,
      recruiterId,
    },
  });

  return NextResponse.json(client, { status: 201 });
}
