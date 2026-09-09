"use client";

import { useState } from "react";

import {
  formatDeadlineShort,
  getDeadlineStatus,
  parseLegacySummaryToday,
  parseStoredTodayTasks,
  type StandupPlanTask,
} from "@/lib/standupTasks";

type StandupTaskDisplayProps = {
  tasks?: StandupPlanTask[] | null;
  summaryToday?: string | null;
  entryDate?: string | null;
  referenceDate: string;
  highlightMissing?: boolean;
  variant?: "default" | "presentation";
};

const LONG_TEXT_THRESHOLD = 96;
const isLongText = (text: string) => text.length > LONG_TEXT_THRESHOLD;

const getDisplayTasks = ({
  tasks,
  summaryToday,
  entryDate,
}: Pick<StandupTaskDisplayProps, "tasks" | "summaryToday" | "entryDate">) => {
  if (tasks?.length) return tasks;
  if (summaryToday?.trim()) {
    return parseStoredTodayTasks(null, summaryToday, entryDate);
  }
  return [];
};

const deadlineColor = (status: ReturnType<typeof getDeadlineStatus>, done: boolean) => {
  if (done) return "text-slate-400 dark:text-slate-500";
  if (status === "overdue") return "text-rose-600 dark:text-rose-400";
  if (status === "due-today") return "text-amber-600 dark:text-amber-400";
  if (status === "on-track") return "text-emerald-600 dark:text-emerald-400";
  return "text-slate-400 dark:text-slate-500";
};

export default function StandupTaskDisplay({
  tasks,
  summaryToday,
  entryDate,
  referenceDate,
  highlightMissing = false,
}: StandupTaskDisplayProps) {
  const displayTasks = getDisplayTasks({ tasks, summaryToday, entryDate });

  if (!displayTasks.length) {
    if (summaryToday?.trim()) {
      return (
        <p
          className={`whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-200 ${
            highlightMissing ? "text-amber-800 dark:text-amber-200" : ""
          }`}
        >
          {summaryToday}
        </p>
      );
    }

    const legacy = parseLegacySummaryToday(summaryToday, entryDate);
    if (!legacy.length) {
      return (
        <p className="text-sm text-slate-400 dark:text-slate-500">No tasks yet.</p>
      );
    }
  }

  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {displayTasks.map((task, index) => (
        <TaskRow
          key={task.id}
          task={task}
          index={index}
          referenceDate={referenceDate}
        />
      ))}
    </ul>
  );
}

function TaskRow({
  task,
  index,
  referenceDate,
}: {
  task: StandupPlanTask;
  index: number;
  referenceDate: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = getDeadlineStatus(task, referenceDate);
  const longText = isLongText(task.text);
  const deadlineLabel = task.deadline ? formatDeadlineShort(task.deadline) : null;

  return (
    <li className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
      <span
        className={`mt-0.5 w-4 shrink-0 text-[11px] tabular-nums ${
          task.done ? "text-slate-300 dark:text-slate-600" : "text-slate-400"
        }`}
      >
        {index + 1}
      </span>

      <div
        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
          task.done
            ? "bg-slate-300 dark:bg-slate-600"
            : status === "overdue"
              ? "bg-rose-500"
              : status === "due-today"
                ? "bg-amber-500"
                : status === "on-track"
                  ? "bg-emerald-500"
                  : "bg-slate-300"
        }`}
      />

      <div className="min-w-0 flex-1">
        <p
          className={`text-[13.5px] leading-6 ${
            task.done
              ? "text-slate-400 line-through decoration-slate-300 dark:text-slate-500 dark:decoration-slate-600"
              : "text-slate-800 dark:text-slate-100"
          } ${longText && !expanded ? "line-clamp-2" : "whitespace-pre-wrap break-words"}`}
        >
          {task.text}
        </p>
        {longText && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="mt-0.5 text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            {expanded ? "Less" : "More"}
          </button>
        )}
      </div>

      {deadlineLabel && (
        <span
          className={`mt-0.5 shrink-0 text-[11px] font-medium tabular-nums ${deadlineColor(
            status,
            task.done
          )}`}
        >
          {deadlineLabel}
        </span>
      )}
    </li>
  );
}
