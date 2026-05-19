import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; applicationId: string }> }
) {
  const { id: vacancyId, applicationId } = await params;
  const { stage } = await req.json();

  const valid = ["NEW", "SCREENING", "INTERVIEW", "TEST_TASK", "OFFER", "HIRED", "REJECTED"];
  if (!stage || !valid.includes(stage)) {
    return NextResponse.json({ error: "Недопустимый этап" }, { status: 400 });
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
  });
  if (!application || application.vacancyId !== vacancyId) {
    return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
  }

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: { stage },
  });

  return NextResponse.json(updated);
}
