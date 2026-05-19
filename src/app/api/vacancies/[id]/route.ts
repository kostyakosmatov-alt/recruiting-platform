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
      recruiter: { select: { id: true, name: true } },
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

// PATCH handles two operations via body shape:
//   { recruiterId } — change responsible recruiter (admin only)
//   { addUserId }   — add recruiter to team (admin only)
//   { removeUserId }— remove recruiter from team (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { recruiterId, addUserId, removeUserId } = body;

  let data: Parameters<typeof prisma.vacancy.update>[0]["data"] = {};

  if (recruiterId) {
    data.recruiterId = recruiterId;
    // ensure new responsible recruiter is also in the team
    data.teamRecruiters = { connect: { id: recruiterId } };
  }
  if (addUserId) {
    data.teamRecruiters = { connect: { id: addUserId } };
  }
  if (removeUserId) {
    data.teamRecruiters = { disconnect: { id: removeUserId } };
  }

  const vacancy = await prisma.vacancy.update({
    where: { id },
    data,
    include: {
      recruiter: { select: { id: true, name: true } },
      teamRecruiters: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(vacancy);
}
