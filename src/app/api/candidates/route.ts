import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const isAdmin = session.user.role === "ADMIN";

  const baseWhere = isAdmin ? undefined : { recruiterId: session.user.id };
  const searchWhere = q
    ? {
        OR: [
          { firstName: { contains: q, mode: "insensitive" as const } },
          { lastName: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const where =
    baseWhere && searchWhere
      ? { AND: [baseWhere, searchWhere] }
      : baseWhere ?? searchWhere;

  const candidates = await prisma.candidate.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      currentPosition: true,
      experience: true,
      createdAt: true,
      applications: {
        select: {
          vacancy: {
            select: {
              id: true,
              title: true,
              client: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return NextResponse.json(candidates);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { firstName, lastName, email, phone, experience, currentPosition } = body;

  if (!firstName?.trim() || !lastName?.trim()) {
    return NextResponse.json({ error: "Имя и фамилия обязательны" }, { status: 400 });
  }

  const candidate = await prisma.candidate.create({
    data: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      experience: experience ? Number(experience) : null,
      currentPosition: currentPosition?.trim() || null,
      recruiterId: session.user.id,
    },
  });

  return NextResponse.json(candidate, { status: 201 });
}
