import { parseDateOnly } from "@/lib/standupWindow";

export type StandupPlanTask = {
  id: string;
  text: string;
  deadline: string | null;
  done: boolean;
  carriedFrom: string | null;
  sortOrder: number;
};

type StandupEntryLike = {
  date: Date | string;
  summaryToday?: string | null;
  todayTasks?: unknown;
};

export const toDateKey = (value: Date | string) => {
  const parsed = parseDateOnly(value);
  if (!parsed) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const daysBetweenKeys = (fromKey: string, toKey: string) => {
  const from = parseDateOnly(fromKey);
  const to = parseDateOnly(toKey);
  if (!from || !to) return 0;
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
};

const createTaskId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const normalizeTask = (
  raw: unknown,
  fallback: Partial<StandupPlanTask> = {}
): StandupPlanTask | null => {
  if (!raw || typeof raw !== "object") return null;

  const value = raw as Record<string, unknown>;
  const text = typeof value.text === "string" ? value.text.trim() : "";
  if (!text) return null;

  const deadline =
    typeof value.deadline === "string" && value.deadline.trim()
      ? value.deadline.trim()
      : null;

  const carriedFrom =
    typeof value.carriedFrom === "string" && value.carriedFrom.trim()
      ? value.carriedFrom.trim()
      : null;

  return {
    id: typeof value.id === "string" && value.id ? value.id : createTaskId(),
    text,
    deadline,
    done: Boolean(value.done),
    carriedFrom,
    sortOrder:
      typeof value.sortOrder === "number" && Number.isFinite(value.sortOrder)
        ? value.sortOrder
        : fallback.sortOrder ?? 0,
  };
};

export const parseLegacySummaryToday = (
  summaryToday?: string | null,
  entryDate?: string | null
): StandupPlanTask[] => {
  if (!summaryToday?.trim()) return [];

  const dateKey = entryDate ?? null;

  const tasks: StandupPlanTask[] = [];

  summaryToday
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line, index) => {
      const text = line.replace(/^[-*•]\s*/, "").replace(/^\[x\]\s*/i, "").trim();
      if (!text) return;

      const stableId = dateKey
        ? `legacy-${dateKey}-${index}-${text.slice(0, 40).replace(/\s+/g, "-").toLowerCase()}`
        : createTaskId();

      tasks.push({
        id: stableId,
        text,
        deadline: null,
        done: false,
        carriedFrom: null,
        sortOrder: index,
      });
    });

  return tasks;
};

export const parseStructuredTodayTasks = (todayTasks: unknown): StandupPlanTask[] => {
  if (!Array.isArray(todayTasks) || todayTasks.length === 0) return [];

  return todayTasks
    .map((task, index) => normalizeTask(task, { sortOrder: index }))
    .filter((task): task is StandupPlanTask => Boolean(task))
    .map((task, index) => ({ ...task, sortOrder: index }));
};

export const parseStoredTodayTasks = (
  todayTasks: unknown,
  summaryToday?: string | null,
  entryDate?: string | null
): StandupPlanTask[] => {
  const structured = parseStructuredTodayTasks(todayTasks);
  if (structured.length > 0) return structured;

  return parseLegacySummaryToday(summaryToday, entryDate);
};

export const isStructuredTask = (task: StandupPlanTask) =>
  !task.id.startsWith("legacy-");

export const isCarryOverCandidate = (
  task: StandupPlanTask,
  targetDate: Date | string
) => {
  if (!isStructuredTask(task) || task.done || !task.deadline) return false;

  const deadlineDate = parseDateOnly(task.deadline);
  const reference = parseDateOnly(targetDate);
  if (!deadlineDate || !reference) return false;

  return toDateKey(deadlineDate) < toDateKey(reference);
};

export const tasksToSummaryToday = (tasks: StandupPlanTask[]): string => {
  const activeTasks = tasks.filter((task) => task.text.trim());
  if (!activeTasks.length) return "";

  return activeTasks
    .map((task) => {
      const prefix = task.done ? "- [x] " : "- ";
      const deadlineSuffix = task.deadline
        ? ` [${formatDeadlineShort(task.deadline)}]`
        : "";
      return `${prefix}${task.text.trim()}${deadlineSuffix}`;
    })
    .join("\n");
};

export const hasPlanContent = (
  tasks: StandupPlanTask[],
  summaryToday?: string | null
) => {
  if (tasks.some((task) => task.text.trim())) return true;
  return Boolean(summaryToday?.trim());
};

export const mergeOpenTasksForDate = (
  previousEntries: StandupEntryLike[],
  currentEntry: StandupEntryLike | null,
  targetDate: Date | string
): StandupPlanTask[] => {
  const targetDateKey = toDateKey(targetDate);
  const openTasks = new Map<string, StandupPlanTask>();

  const sortedPrevious = [...previousEntries].sort((left, right) => {
    const leftKey = toDateKey(left.date);
    const rightKey = toDateKey(right.date);
    return leftKey.localeCompare(rightKey);
  });

  for (const entry of sortedPrevious) {
    const entryDateKey = toDateKey(entry.date);
    if (!entryDateKey || entryDateKey >= targetDateKey) continue;

    const entryTasks = parseStructuredTodayTasks(entry.todayTasks);

    for (const task of entryTasks) {
      if (!isCarryOverCandidate(task, targetDate)) {
        if (task.done) {
          openTasks.delete(task.id);
        }
        continue;
      }

      openTasks.set(task.id, {
        ...task,
        carriedFrom: entryDateKey,
        done: false,
      });
    }
  }

  const currentDateKey = currentEntry ? toDateKey(currentEntry.date) : targetDateKey;
  const currentTasks = currentEntry
    ? parseStoredTodayTasks(
        currentEntry.todayTasks,
        currentEntry.summaryToday,
        currentDateKey
      )
    : [];

  for (const task of currentTasks) {
    if (task.done) {
      openTasks.delete(task.id);
      continue;
    }

    openTasks.set(task.id, {
      ...task,
      carriedFrom: task.carriedFrom,
      done: false,
    });
  }

  return Array.from(openTasks.values())
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((task, index) => ({ ...task, sortOrder: index }));
};

export const buildYesterdayReviewTasks = (
  previousDayEntry: StandupEntryLike | null
): StandupPlanTask[] => {
  if (!previousDayEntry) return [];

  const structured = parseStructuredTodayTasks(previousDayEntry.todayTasks);
  if (structured.length > 0) return structured;

  return parseLegacySummaryToday(
    previousDayEntry.summaryToday,
    toDateKey(previousDayEntry.date)
  );
};

export const getRolledTasksFromPreviousDay = (
  previousDayEntry: StandupEntryLike | null
): StandupPlanTask[] => {
  if (!previousDayEntry) return [];

  const previousDateKey = toDateKey(previousDayEntry.date);

  return parseStructuredTodayTasks(previousDayEntry.todayTasks)
    .filter((task) => !task.done)
    .map((task, index) => ({
      ...task,
      carriedFrom: previousDateKey,
      done: false,
      sortOrder: index,
    }));
};

export const buildEditableTasksForDate = (
  previousEntries: StandupEntryLike[],
  previousDayEntry: StandupEntryLike | null,
  currentEntry: StandupEntryLike | null,
  targetDate: Date | string
): StandupPlanTask[] => {
  const previousDateKey = previousDayEntry ? toDateKey(previousDayEntry.date) : null;
  const rolledFromYesterday = getRolledTasksFromPreviousDay(previousDayEntry);

  const olderEntries = previousDateKey
    ? previousEntries.filter((entry) => toDateKey(entry.date) !== previousDateKey)
    : previousEntries;
  const olderCarried = mergeOpenTasksForDate(olderEntries, null, targetDate);

  const currentTasks = currentEntry
    ? parseStructuredTodayTasks(currentEntry.todayTasks)
    : [];

  const merged = new Map<string, StandupPlanTask>();
  for (const task of [...olderCarried, ...rolledFromYesterday, ...currentTasks]) {
    merged.set(task.id, task);
  }

  const combined = Array.from(merged.values());
  if (!combined.length) return [];

  return combined
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((task, index) => ({ ...task, sortOrder: index }));
};

export const syncTodayTasksWithYesterday = (
  yesterdayTasks: StandupPlanTask[],
  todayTasks: StandupPlanTask[],
  yesterdayDate?: string | null
): StandupPlanTask[] => {
  const openYesterdayIds = new Set(
    yesterdayTasks.filter((task) => !task.done).map((task) => task.id)
  );

  const keptToday = todayTasks.filter(
    (task) => !task.carriedFrom || openYesterdayIds.has(task.id)
  );

  const rolled = yesterdayTasks
    .filter((task) => !task.done)
    .filter((task) => !keptToday.some((todayTask) => todayTask.id === task.id))
    .map((task) => ({
      ...task,
      carriedFrom: yesterdayDate ?? task.carriedFrom,
      done: false,
    }));

  return [...keptToday, ...rolled].map((task, index) => ({
    ...task,
    sortOrder: index,
  }));
};

export const tasksToProgressSinceYesterday = (tasks: StandupPlanTask[]) => {
  const completed = tasks.filter((task) => task.done && task.text.trim());
  if (!completed.length) return null;

  return completed.map((task) => `- [x] ${task.text.trim()}`).join("\n");
};

export const normalizeIncomingTasks = (input: unknown): StandupPlanTask[] => {
  if (!Array.isArray(input)) return [];

  return input
    .map((task, index) => normalizeTask(task, { sortOrder: index }))
    .filter((task): task is StandupPlanTask => Boolean(task))
    .map((task, index) => ({ ...task, sortOrder: index }));
};

export type DeadlineStatus = "none" | "on-track" | "due-today" | "overdue";

export const getDeadlineStatus = (
  task: StandupPlanTask,
  referenceDate: Date | string
): DeadlineStatus => {
  if (!task.deadline) return "none";
  if (isTaskOverdue(task, referenceDate)) return "overdue";
  if (isTaskDueToday(task, referenceDate)) return "due-today";
  return "on-track";
};

export const getDeadlineStatusStyles = (status: DeadlineStatus) => {
  switch (status) {
    case "overdue":
      return {
        stripe: "bg-gradient-to-b from-rose-400 to-rose-600",
        badge:
          "bg-rose-100 text-rose-700 ring-1 ring-rose-200/80 dark:bg-rose-950/60 dark:text-rose-200 dark:ring-rose-800/60",
        border: "border-rose-200/80 dark:border-rose-900/50",
      };
    case "due-today":
      return {
        stripe: "bg-gradient-to-b from-amber-400 to-orange-500",
        badge:
          "bg-amber-100 text-amber-800 ring-1 ring-amber-200/80 dark:bg-amber-950/60 dark:text-amber-200 dark:ring-amber-900/50",
        border: "border-amber-200/80 dark:border-amber-900/50",
      };
    case "on-track":
      return {
        stripe: "bg-gradient-to-b from-emerald-400 to-green-500",
        badge:
          "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-200 dark:ring-emerald-900/50",
        border: "border-emerald-200/70 dark:border-emerald-900/40",
      };
    default:
      return {
        stripe: "bg-gradient-to-b from-indigo-400 to-violet-500",
        badge:
          "bg-slate-100 text-slate-600 ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700/80",
        border: "border-slate-200/80 dark:border-slate-800/80",
      };
  }
};

export const createEmptyTask = (
  sortOrder = 0,
  defaultDeadline?: string | null
): StandupPlanTask => ({
  id: createTaskId(),
  text: "",
  deadline: defaultDeadline ?? null,
  done: false,
  carriedFrom: null,
  sortOrder,
});

export const formatDeadlineShort = (deadline: string) => {
  const parsed = parseDateOnly(deadline);
  if (!parsed) return deadline;

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

export const formatDeadlineLabel = (deadline: string, referenceDate: Date | string) => {
  const deadlineDate = parseDateOnly(deadline);
  const reference = parseDateOnly(referenceDate);
  if (!deadlineDate || !reference) return `Deadline: ${deadline}`;

  const deadlineKey = toDateKey(deadlineDate);
  const referenceKey = toDateKey(reference);

  if (deadlineKey === referenceKey) {
    return `Deadline: Today (${formatDeadlineShort(deadline)})`;
  }

  return `Deadline: ${formatDeadlineShort(deadline)}`;
};

export const isTaskOverdue = (task: StandupPlanTask, referenceDate: Date | string) => {
  if (!task.deadline || task.done) return false;

  const deadlineDate = parseDateOnly(task.deadline);
  const reference = parseDateOnly(referenceDate);
  if (!deadlineDate || !reference) return false;

  return toDateKey(deadlineDate) < toDateKey(reference);
};

export const isTaskDueToday = (task: StandupPlanTask, referenceDate: Date | string) => {
  if (!task.deadline || task.done) return false;

  const deadlineDate = parseDateOnly(task.deadline);
  const reference = parseDateOnly(referenceDate);
  if (!deadlineDate || !reference) return false;

  return toDateKey(deadlineDate) === toDateKey(reference);
};

export type StandupFollowUpTask = {
  id: string;
  text: string;
  deadline: string;
  firstSeen: string;
  lastSeen: string;
  carriedFrom: string | null;
  daysOverdue: number;
  durationDays: number;
};

type FollowUpEntryLike = StandupEntryLike & {
  userId: string;
};

export const collectFollowUpTasks = (
  entries: FollowUpEntryLike[],
  referenceDate: Date | string
): Map<string, StandupFollowUpTask[]> => {
  const referenceKey = toDateKey(referenceDate);
  const byUser = new Map<string, Map<string, StandupFollowUpTask>>();

  const sorted = [...entries].sort((left, right) =>
    toDateKey(left.date).localeCompare(toDateKey(right.date))
  );

  for (const entry of sorted) {
    const entryDateKey = toDateKey(entry.date);
    if (!entryDateKey || entryDateKey > referenceKey) continue;

    const tasks = parseStructuredTodayTasks(entry.todayTasks);
    if (!byUser.has(entry.userId)) {
      byUser.set(entry.userId, new Map());
    }
    const userTasks = byUser.get(entry.userId)!;

    for (const task of tasks) {
      if (!isStructuredTask(task) || !task.deadline) {
        if (task.done) userTasks.delete(task.id);
        continue;
      }

      if (task.done) {
        userTasks.delete(task.id);
        continue;
      }

      const existing = userTasks.get(task.id);
      userTasks.set(task.id, {
        id: task.id,
        text: task.text,
        deadline: task.deadline,
        firstSeen: existing?.firstSeen ?? task.carriedFrom ?? entryDateKey,
        lastSeen: entryDateKey,
        carriedFrom: task.carriedFrom,
        daysOverdue: 0,
        durationDays: 0,
      });
    }
  }

  const result = new Map<string, StandupFollowUpTask[]>();

  for (const [userId, taskMap] of byUser.entries()) {
    const overdue = Array.from(taskMap.values())
      .map((task) => ({
        ...task,
        daysOverdue: Math.max(0, daysBetweenKeys(task.deadline, referenceKey)),
        durationDays: Math.max(1, daysBetweenKeys(task.firstSeen, referenceKey) + 1),
      }))
      .filter((task) => task.daysOverdue > 0)
      .sort((left, right) => right.daysOverdue - left.daysOverdue);

    if (overdue.length) {
      result.set(userId, overdue);
    }
  }

  return result;
};
