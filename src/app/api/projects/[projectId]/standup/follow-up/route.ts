import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/auth";
import prisma from "@/lib/db";
import {
  ensureProjectRole,
  ForbiddenError,
  PROJECT_ADMIN_ROLES,
} from "@/lib/permissions";
import { resolveProjectId, type ProjectParams } from "@/lib/params";
import { collectFollowUpTasks, toDateKey } from "@/lib/standupTasks";
import { parseDateOnly } from "@/lib/standupWindow";

const LOOKBACK_DAYS = 30;

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<Awaited<ProjectParams>> }
) {
  const params = await ctx.params;
  const projectId = await resolveProjectId(params);

  if (!projectId) {
    return NextResponse.json({ message: "projectId is required" }, { status: 400 });
  }

  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureProjectRole(prisma, user.id, projectId, PROJECT_ADMIN_ROLES);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    throw error;
  }

  const date = parseDateOnly(request.nextUrl.searchParams.get("date") ?? new Date());
  if (!date) {
    return NextResponse.json({ message: "date is required" }, { status: 400 });
  }

  const lookbackStart = new Date(date);
  lookbackStart.setDate(lookbackStart.getDate() - LOOKBACK_DAYS);

  const [entries, members] = await Promise.all([
    prisma.dailyStandupEntry.findMany({
      where: {
        projectId,
        date: { gte: lookbackStart, lte: date },
      },
      select: {
        userId: true,
        date: true,
        todayTasks: true,
        summaryToday: true,
      },
      orderBy: { date: "asc" },
    }),
    prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    }),
  ]);

  const overdueByUser = collectFollowUpTasks(entries, date);
  const dateKey = toDateKey(date);

  const memberSummaries = members
    .map((member) => {
      const tasks = overdueByUser.get(member.user.id) ?? [];
      return {
        user: member.user,
        overdueCount: tasks.length,
        longestOverdue: tasks[0]?.daysOverdue ?? 0,
        longestDuration: tasks.reduce((max, task) => Math.max(max, task.durationDays), 0),
        tasks,
      };
    })
    .filter((member) => member.overdueCount > 0)
    .sort((left, right) => right.overdueCount - left.overdueCount);

  return NextResponse.json({
    date: dateKey,
    overdueCount: memberSummaries.reduce((sum, member) => sum + member.overdueCount, 0),
    memberCount: memberSummaries.length,
    members: memberSummaries,
  });
}
