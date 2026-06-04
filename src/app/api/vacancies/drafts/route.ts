import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const drafts = await prisma.vacancy.findMany({
    where: { status: "DRAFT" },
    include: {
      client: { select: { id: true, name: true } },
      recruiter: { select: { id: true, name: true } },
      intakeSessions: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { id: true, token: true, contactName: true, channel: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(drafts);
}
