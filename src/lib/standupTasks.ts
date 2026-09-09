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

const toDateKey = (value: Date | string) => {
  const parsed = parseDateOnly(value);
  if (!parsed) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

export const parseStoredTodayTasks = (
  todayTasks: unknown,
  summaryToday?: string | null,
  entryDate?: string | null
): StandupPlanTask[] => {
  if (Array.isArray(todayTasks) && todayTasks.length > 0) {
    const parsed = todayTasks
      .map((task, index) => normalizeTask(task, { sortOrder: index }))
      .filter((task): task is StandupPlanTask => Boolean(task));

    if (parsed.length > 0) {
      return parsed.map((task, index) => ({ ...task, sortOrder: index }));
    }
  }

  return parseLegacySummaryToday(summaryToday, entryDate);
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

    const entryTasks = parseStoredTodayTasks(
      entry.todayTasks,
      entry.summaryToday,
      entryDateKey
    );

    for (const task of entryTasks) {
      if (task.done) {
        openTasks.delete(task.id);
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

export const buildEditableTasksForDate = (
  previousEntries: StandupEntryLike[],
  currentEntry: StandupEntryLike | null,
  targetDate: Date | string
): StandupPlanTask[] => {
  const carriedTasks = mergeOpenTasksForDate(previousEntries, null, targetDate);
  const targetDateKey = toDateKey(targetDate);
  const currentDateKey = currentEntry ? toDateKey(currentEntry.date) : targetDateKey;

  const currentTasks = currentEntry
    ? parseStoredTodayTasks(
        currentEntry.todayTasks,
        currentEntry.summaryToday,
        currentDateKey
      )
    : [];

  const merged = new Map<string, StandupPlanTask>();
  for (const task of carriedTasks) {
    merged.set(task.id, task);
  }
  for (const task of currentTasks) {
    merged.set(task.id, task);
  }

  const combined = Array.from(merged.values());
  if (!combined.length) return [];

  return combined
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((task, index) => ({ ...task, sortOrder: index }));
};

export const normalizeIncomingTasks = (input: unknown): StandupPlanTask[] => {
  if (!Array.isArray(input)) return [];

  return input
    .map((task, index) => normalizeTask(task, { sortOrder: index }))
    .filter((task): task is StandupPlanTask => Boolean(task))
    .map((task, index) => ({ ...task, sortOrder: index }));
};

export const createEmptyTask = (sortOrder = 0): StandupPlanTask => ({
  id: createTaskId(),
  text: "",
  deadline: null,
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
