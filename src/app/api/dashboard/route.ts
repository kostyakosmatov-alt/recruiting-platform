import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isAdmin = session.user.role === "ADMIN";
    const userId = session.user.id;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const userFilter = isAdmin ? {} : { recruiterId: userId };

    const [openVacancies, totalCandidates, hiredApps, topVacancies, recentCandidates] =
      await Promise.all([
        prisma.vacancy.count({ where: { status: "OPEN", ...userFilter } }),
        prisma.candidate.count({ where: isAdmin ? {} : { recruiterId: userId } }),
        prisma.application.count({
          where: {
            stage: "HIRED",
            updatedAt: { gte: thirtyDaysAgo },
            ...(isAdmin ? {} : { recruiterId: userId }),
          },
        }),
        prisma.vacancy.findMany({
          where: { status: "OPEN", ...userFilter },
          include: {
            client: { select: { name: true } },
            _count: { select: { applications: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.candidate.findMany({
          where: { createdAt: { gte: sevenDaysAgo }, ...(isAdmin ? {} : { recruiterId: userId }) },
          select: { createdAt: true },
        }),
      ]);

    // 7-day activity map
    const activityMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      activityMap[d.toISOString().split("T")[0]] = 0;
    }
    for (const c of recentCandidates) {
      const day = new Date(c.createdAt).toISOString().split("T")[0];
      if (day in activityMap) activityMap[day]++;
    }

    const conversion =
      totalCandidates > 0 ? Math.round((hiredApps / totalCandidates) * 100 * 10) / 10 : 0;

    const result: Record<string, unknown> = {
      openVacancies,
      totalCandidates,
      hiredLast30Days: hiredApps,
      conversion,
      topVacancies: topVacancies
        .map((v) => ({
          id: v.id,
          title: v.title,
          clientName: v.client.name,
          candidatesCount: v._count.applications,
        }))
        .sort((a, b) => b.candidatesCount - a.candidatesCount)
        .slice(0, 5),
      activityLast7Days: Object.entries(activityMap).map(([date, count]) => ({ date, count })),
    };

    if (isAdmin) {
      // Fetch recruiters without filtered _count (simpler, more compatible)
      const recruiters = await prisma.user.findMany({
        where: { isActive: true, role: "RECRUITER" },
        select: { id: true, name: true, email: true, role: true },
        orderBy: { createdAt: "asc" },
      });

      // Fetch open vacancy counts per user
      const openVacanciesPerUser = await prisma.vacancy.groupBy({
        by: ["recruiterId"],
        where: { status: "OPEN" },
        _count: { _all: true },
      });
      const vacancyMap: Record<string, number> = {};
      for (const v of openVacanciesPerUser) {
        vacancyMap[v.recruiterId] = v._count._all;
      }

      // Fetch candidate counts per user
      const candidatesPerUser = await prisma.candidate.groupBy({
        by: ["recruiterId"],
        _count: { _all: true },
      });
      const candidateMap: Record<string, number> = {};
      for (const c of candidatesPerUser) {
        candidateMap[c.recruiterId] = c._count._all;
      }

      // Fetch hired per user last 30 days
      const hiredPerUser = await prisma.application.groupBy({
        by: ["recruiterId"],
        where: { stage: "HIRED", updatedAt: { gte: thirtyDaysAgo } },
        _count: { _all: true },
      });
      const hiredMap: Record<string, number> = {};
      for (const h of hiredPerUser) {
        hiredMap[h.recruiterId] = h._count._all;
      }

      // Fetch client counts per user
      const clientsPerUser = await prisma.client.groupBy({
        by: ["recruiterId"],
        where: { recruiterId: { not: null } },
        _count: { _all: true },
      });
      const clientMap: Record<string, number> = {};
      for (const c of clientsPerUser) {
        if (c.recruiterId) clientMap[c.recruiterId] = c._count._all;
      }

      result.team = recruiters.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.role,
        openVacancies: vacancyMap[r.id] ?? 0,
        totalClients: clientMap[r.id] ?? 0,
        hiredLast30Days: hiredMap[r.id] ?? 0,
      }));
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error("[dashboard] error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
