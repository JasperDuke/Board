import prisma from "@/lib/db";
import { parseDateOnly } from "@/lib/standupWindow";

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

export const toDateInputValue = (value: Date | string | null | undefined) => {
  const parsed = parseDateOnly(value ?? null);
  if (!parsed) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
