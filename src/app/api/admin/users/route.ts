import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const users = await prisma.user.findMany({
      where: { role: { in: ["RECRUITER", "ADMIN"] } },
      select: {
        id: true, name: true, email: true,
        role: true, isActive: true, createdAt: true, telegramUsername: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const openVacanciesPerUser = await prisma.vacancy.groupBy({
      by: ["recruiterId"],
      where: { status: "OPEN" },
      _count: { _all: true },
    });
    const vacancyMap: Record<string, number> = {};
    for (const v of openVacanciesPerUser) vacancyMap[v.recruiterId] = v._count._all;

    const clientsPerUser = await prisma.client.groupBy({
      by: ["recruiterId"],
      where: { recruiterId: { not: null } },
      _count: { _all: true },
    });
    const clientMap: Record<string, number> = {};
    for (const c of clientsPerUser) {
      if (c.recruiterId) clientMap[c.recruiterId] = c._count._all;
    }

    const hiredPerUser = await prisma.application.groupBy({
      by: ["recruiterId"],
      where: { stage: "HIRED", updatedAt: { gte: thirtyDaysAgo } },
      _count: { _all: true },
    });
    const hiredMap: Record<string, number> = {};
    for (const h of hiredPerUser) hiredMap[h.recruiterId] = h._count._all;

    return NextResponse.json(
      users.map((u) => ({
        ...u,
        openVacancies: vacancyMap[u.id] ?? 0,
        totalClients: clientMap[u.id] ?? 0,
        hiredLast30Days: hiredMap[u.id] ?? 0,
      }))
    );
  } catch (e) {
    console.error("[admin/users] GET error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { name, email, password, role } = await req.json();
    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: "Имя, email и пароль обязательны" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.trim() } });
    if (existing) {
      return NextResponse.json({ error: "Пользователь с таким email уже существует" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: role === "ADMIN" ? "ADMIN" : "RECRUITER",
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (e) {
    console.error("[admin/users] POST error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
