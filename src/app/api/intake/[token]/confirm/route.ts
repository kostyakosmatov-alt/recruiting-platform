import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { confirmIntakeSession } from "@/lib/intake-confirm";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const session = await prisma.intakeSession.findUnique({ where: { token } });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const { vacancyId } = await confirmIntakeSession(token);
    return NextResponse.json({ vacancyId });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
