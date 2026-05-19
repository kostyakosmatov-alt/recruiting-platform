import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: vacancyId } = await params;
  const { candidateId, stage } = await req.json();

  if (!candidateId) {
    return NextResponse.json({ error: "candidateId обязателен" }, { status: 400 });
  }

  const existing = await prisma.application.findUnique({
    where: { candidateId_vacancyId: { candidateId, vacancyId } },
  });
  if (existing) {
    return NextResponse.json({ error: "Кандидат уже добавлен в эту вакансию" }, { status: 409 });
  }

  const application = await prisma.application.create({
    data: {
      candidateId,
      vacancyId,
      recruiterId: session.user.id,
      stage: stage || "NEW",
    },
    include: {
      candidate: {
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      },
    },
  });

  return NextResponse.json(application, { status: 201 });
}
