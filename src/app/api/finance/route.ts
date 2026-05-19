import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

function calcCommission(v: {
  commissionType: string;
  commissionValue: number;
  salaryTo: number | null;
}): number {
  if (v.commissionType === "FIXED") return v.commissionValue;
  if (!v.salaryTo) return 0;
  return (v.commissionValue / 100) * v.salaryTo * 12;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
    if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to);
  }

  const vacancies = await prisma.vacancy.findMany({
    where,
    include: {
      client: { select: { id: true, name: true } },
      recruiter: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const byClientMap = new Map<string, { id: string; name: string; commission: number; count: number }>();
  const byRecruiterMap = new Map<string, { id: string; name: string; commission: number; count: number }>();
  let total = 0;

  const byVacancy = vacancies.map((v) => {
    const commission = calcCommission(v);
    total += commission;

    const cid = v.client.id;
    if (!byClientMap.has(cid)) byClientMap.set(cid, { id: cid, name: v.client.name, commission: 0, count: 0 });
    const cr = byClientMap.get(cid)!;
    cr.commission += commission;
    cr.count += 1;

    const rid = v.recruiter.id;
    if (!byRecruiterMap.has(rid)) byRecruiterMap.set(rid, { id: rid, name: v.recruiter.name, commission: 0, count: 0 });
    const rr = byRecruiterMap.get(rid)!;
    rr.commission += commission;
    rr.count += 1;

    return {
      id: v.id,
      title: v.title,
      clientName: v.client.name,
      recruiterName: v.recruiter.name,
      commissionType: v.commissionType,
      commissionValue: v.commissionValue,
      commission,
      status: v.status,
      salaryTo: v.salaryTo,
    };
  });

  return NextResponse.json({
    total,
    byClient: Array.from(byClientMap.values()).sort((a, b) => b.commission - a.commission),
    byRecruiter: Array.from(byRecruiterMap.values()).sort((a, b) => b.commission - a.commission),
    byVacancy,
  });
}
