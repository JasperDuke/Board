"use client";

import { useState } from "react";

import {
  formatDeadlineShort,
  isTaskDueToday,
  isTaskOverdue,
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

type TaskCardProps = {
  task: StandupPlanTask;
  index: number;
  referenceDate: string;
  variant: "default" | "presentation";
};

function TaskCard({ task, index, referenceDate, variant }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const overdue = isTaskOverdue(task, referenceDate);
  const dueToday = isTaskDueToday(task, referenceDate);
  const longText = isLongText(task.text);
  const deadlineLabel = task.deadline ? formatDeadlineShort(task.deadline) : null;

  const presentation = variant === "presentation";

  return (
    <li
      className={`group relative overflow-hidden rounded-2xl border transition ${
        task.done
          ? "border-slate-200/70 bg-slate-50/80 opacity-70 dark:border-slate-800/70 dark:bg-slate-900/50"
          : overdue
            ? "border-rose-200/80 bg-gradient-to-br from-rose-50/90 via-white/90 to-white/90 shadow-sm dark:border-rose-900/50 dark:from-rose-950/40 dark:via-slate-900/80 dark:to-slate-900/80"
            : "border-slate-200/80 bg-white/80 shadow-sm hover:border-indigo-200/80 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900/70 dark:hover:border-indigo-500/30"
      } ${presentation ? "p-4" : "p-3"}`}
    >
      {!task.done && (
        <div
          aria-hidden="true"
          className={`absolute inset-y-0 left-0 w-1 ${
            overdue
              ? "bg-gradient-to-b from-rose-400 to-rose-600"
              : dueToday
                ? "bg-gradient-to-b from-indigo-400 to-violet-500"
                : "bg-gradient-to-b from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500"
          }`}
        />
      )}

      <div className="flex items-start gap-3 pl-2">
        <span
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
            task.done
              ? "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          {index + 1}
        </span>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p
              className={`min-w-0 flex-1 text-sm leading-relaxed ${
                presentation ? "text-[15px] leading-6" : ""
              } ${
                task.done
                  ? "text-slate-500 line-through dark:text-slate-400"
                  : "text-slate-800 dark:text-slate-100"
              } ${longText && !expanded ? "line-clamp-3" : "whitespace-pre-wrap break-words"}`}
            >
              {task.text}
            </p>

            {deadlineLabel && (
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${
                  overdue
                    ? "bg-rose-100 text-rose-700 ring-1 ring-rose-200/80 dark:bg-rose-950/60 dark:text-rose-200 dark:ring-rose-800/60"
                    : dueToday
                      ? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200/80 dark:bg-indigo-950/60 dark:text-indigo-200 dark:ring-indigo-800/60"
                      : "bg-slate-100 text-slate-600 ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700/80"
                }`}
              >
                {overdue && <span aria-hidden="true">!</span>}
                {deadlineLabel}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {longText && (
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200"
              >
                {expanded ? "Show less" : "Show full task"}
              </button>
            )}

            {task.carriedFrom && !task.done && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/50">
                Rolled from {task.carriedFrom}
              </span>
            )}

            {task.done && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/50">
                Done
              </span>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

export default function StandupTaskDisplay({
  tasks,
  summaryToday,
  entryDate,
  referenceDate,
  highlightMissing = false,
  variant = "default",
}: StandupTaskDisplayProps) {
  const displayTasks = getDisplayTasks({ tasks, summaryToday, entryDate });
  const presentation = variant === "presentation";

  const shellClass = `mt-1 rounded-2xl border p-3 ${
    highlightMissing
      ? "border-amber-300/80 bg-amber-50/70 dark:border-amber-600/50 dark:bg-amber-950/30"
      : presentation
        ? "border-slate-200/60 bg-slate-50/50 backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/40"
        : "border-slate-200/80 bg-white/70 dark:border-slate-700/80 dark:bg-slate-900/70"
  }`;

  if (!displayTasks.length) {
    const legacyLines = parseLegacySummaryToday(summaryToday, entryDate);
    if (!legacyLines.length) {
      return (
        <p className={`${shellClass} text-sm leading-relaxed text-slate-500 dark:text-slate-400`}>
          —
        </p>
      );
    }
  }

  if (!displayTasks.length && summaryToday?.trim()) {
    const longLegacy = isLongText(summaryToday);
    return (
      <div className={shellClass}>
        <p
          className={`whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800 dark:text-slate-100 ${
            presentation ? "text-[15px] leading-6" : ""
          } ${longLegacy ? "line-clamp-6" : ""}`}
        >
          {summaryToday}
        </p>
        {longLegacy && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Legacy entry — edit and save to split into task cards with deadlines.
          </p>
        )}
      </div>
    );
  }

  return (
    <ul className={`${shellClass} space-y-2.5`}>
      {displayTasks.map((task, index) => (
        <TaskCard
          key={task.id}
          task={task}
          index={index}
          referenceDate={referenceDate}
          variant={variant}
        />
      ))}
    </ul>
  );
}
