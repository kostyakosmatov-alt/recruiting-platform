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
  const userId = session.user.id;

  const vacancy = await prisma.vacancy.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      recruiter: { select: { id: true, name: true, email: true, telegramUsername: true } },
      teamRecruiters: { select: { id: true, name: true } },
      applications: {
        include: {
          candidate: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true, experience: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!vacancy) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hasAccess =
    isAdmin ||
    vacancy.recruiterId === userId ||
    vacancy.teamRecruiters.some((r) => r.id === userId);

  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json(vacancy);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const isAdmin = session.user.role === "ADMIN";
  const userId = session.user.id;

  const existing = await prisma.vacancy.findUnique({
    where: { id },
    include: { teamRecruiters: { select: { id: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hasAccess =
    isAdmin ||
    existing.recruiterId === userId ||
    existing.teamRecruiters.some((r) => r.id === userId);
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { recruiterId, addUserId, removeUserId, title, description, status, priority, salaryFrom, salaryTo, commissionType, commissionValue } = body;

  let data: Parameters<typeof prisma.vacancy.update>[0]["data"] = {};

  // Team management — admin only
  if (isAdmin) {
    if (recruiterId) {
      data.recruiterId = recruiterId;
      data.teamRecruiters = { connect: { id: recruiterId } };
    }
    if (addUserId) data.teamRecruiters = { connect: { id: addUserId } };
    if (removeUserId) data.teamRecruiters = { disconnect: { id: removeUserId } };
  }

  // Field editing — any team member
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description || null;
  if (status !== undefined) data.status = status;
  if (priority !== undefined) data.priority = priority;
  if (salaryFrom !== undefined) data.salaryFrom = salaryFrom ? Number(salaryFrom) : null;
  if (salaryTo !== undefined) data.salaryTo = salaryTo ? Number(salaryTo) : null;
  if (commissionType !== undefined) data.commissionType = commissionType;
  if (commissionValue !== undefined) data.commissionValue = Number(commissionValue);

  const vacancy = await prisma.vacancy.update({
    where: { id },
    data,
    include: {
      client: { select: { id: true, name: true } },
      recruiter: { select: { id: true, name: true } },
      teamRecruiters: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(vacancy);
}
