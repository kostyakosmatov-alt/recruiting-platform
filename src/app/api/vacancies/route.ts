import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = session.user.role === "ADMIN";
  const userId = session.user.id;

  const vacancies = await prisma.vacancy.findMany({
    where: isAdmin
      ? undefined
      : { OR: [{ recruiterId: userId }, { teamRecruiters: { some: { id: userId } } }] },
    include: {
      client: { select: { name: true } },
      recruiter: { select: { id: true, name: true } },
      teamRecruiters: { select: { id: true, name: true } },
      _count: { select: { applications: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(vacancies);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, clientId, salaryFrom, salaryTo, status, priority, commissionType, commissionValue } = body;

  if (!title || !clientId) {
    return NextResponse.json({ error: "title и clientId обязательны" }, { status: 400 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const recruiterId = (isAdmin && body.recruiterId) ? body.recruiterId : session.user.id;

  // team = chosen recruiter only; don't auto-add admin
  const teamIds = isAdmin ? [recruiterId] : Array.from(new Set([recruiterId, session.user.id]));

  const vacancy = await prisma.vacancy.create({
    data: {
      title,
      description: description || null,
      clientId,
      salaryFrom: salaryFrom ? Number(salaryFrom) : null,
      salaryTo: salaryTo ? Number(salaryTo) : null,
      status: status || "OPEN",
      priority: priority || "MEDIUM",
      commissionType: commissionType || "FIXED",
      commissionValue: commissionValue ? Number(commissionValue) : 0,
      recruiterId,
      teamRecruiters: { connect: teamIds.map((id) => ({ id })) },
    },
    include: {
      client: { select: { name: true } },
      recruiter: { select: { id: true, name: true } },
      teamRecruiters: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(vacancy, { status: 201 });
}
