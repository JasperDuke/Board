import prisma from "@/lib/db";
import {
  getPreviousStandupDate,
  toDateInputValue,
} from "@/lib/standupWindow";

export { toDateInputValue };

const MAX_LOOKBACK_DAYS = 30;

export const getPreviousStandupEntries = async (
  projectId: string,
  userId: string,
  beforeDate: Date
) => {
  const lookbackStart = new Date(beforeDate);
  lookbackStart.setDate(lookbackStart.getDate() - MAX_LOOKBACK_DAYS);

  return prisma.dailyStandupEntry.findMany({
    where: {
      projectId,
      userId,
      date: {
        gte: lookbackStart,
        lt: beforeDate,
      },
    },
    orderBy: { date: "asc" },
    select: {
      date: true,
      summaryToday: true,
      todayTasks: true,
    },
  });
};

export const getPreviousStandupDayEntry = async (
  projectId: string,
  userId: string,
  date: Date,
  skipWeekends = false
) => {
  const previousDate = getPreviousStandupDate(date, skipWeekends);

  return prisma.dailyStandupEntry.findUnique({
    where: {
      projectId_userId_date: {
        projectId,
        userId,
        date: previousDate,
      },
    },
    select: {
      date: true,
      summaryToday: true,
      todayTasks: true,
      progressSinceYesterday: true,
    },
  });
};

