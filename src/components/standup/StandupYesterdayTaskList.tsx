"use client";

import {
  formatDeadlineShort,
  getDeadlineStatus,
  getDeadlineStatusStyles,
  type StandupPlanTask,
} from "@/lib/standupTasks";

type StandupYesterdayTaskListProps = {
  tasks: StandupPlanTask[];
  referenceDate: string;
  onChange: (tasks: StandupPlanTask[]) => void;
};

export default function StandupYesterdayTaskList({
  tasks,
  referenceDate,
  onChange,
}: StandupYesterdayTaskListProps) {
  const handleToggle = (task: StandupPlanTask) => {
    onChange(
      tasks.map((item) =>
        item.id === task.id ? { ...item, done: !item.done } : item
      )
    );
  };

  if (!tasks.length) {
    return (
      <div className="mt-2 rounded-xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        No tasks from yesterday yet. After you save today&apos;s plan, they appear here tomorrow.
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Check finished. Unchecked items move into today automatically.
      </p>

      {tasks.map((task, index) => {
        const status = getDeadlineStatus(task, referenceDate);
        const styles = getDeadlineStatusStyles(status);

        return (
          <button
            key={task.id}
            type="button"
            onClick={() => handleToggle(task)}
            className={`relative flex w-full items-start gap-2.5 rounded-xl border bg-white px-3 py-2 text-left dark:bg-slate-900 ${styles.border} ${
              task.done ? "opacity-70" : ""
            }`}
          >
            <span
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                task.done
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"
              }`}
            >
              {task.done && (
                <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2.5 6.2l2.4 2.3 4.6-5" />
                </svg>
              )}
            </span>

            <span className="mt-px w-4 shrink-0 text-[11px] tabular-nums text-slate-400">
              {index + 1}
            </span>

            <span className="min-w-0 flex-1">
              <span
                className={`block text-sm leading-5 ${
                  task.done
                    ? "text-slate-400 line-through dark:text-slate-500"
                    : "text-slate-800 dark:text-slate-100"
                }`}
              >
                {task.text}
              </span>
            </span>

            {task.deadline && (
              <span className={`mt-px shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ${styles.badge}`}>
                {status === "overdue"
                  ? `Overdue · ${formatDeadlineShort(task.deadline)}`
                  : formatDeadlineShort(task.deadline)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
