import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { recruiterId } = await req.json();
  if (!recruiterId) return NextResponse.json({ error: "recruiterId required" }, { status: 400 });

  const vacancy = await prisma.vacancy.findUnique({ where: { id } });
  if (!vacancy) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (vacancy.status !== "DRAFT") return NextResponse.json({ error: "Not a draft" }, { status: 400 });

  const updated = await prisma.vacancy.update({
    where: { id },
    data: {
      status: "OPEN",
      recruiterId,
      teamRecruiters: { connect: { id: recruiterId } },
    },
    include: {
      client: { select: { name: true } },
      recruiter: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
}
