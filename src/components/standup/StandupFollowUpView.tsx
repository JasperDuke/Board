"use client";

import { useMemo, useState } from "react";

import { getDeadlineStatusStyles } from "@/lib/standupTasks";

export type FollowUpTask = {
  id: string;
  text: string;
  deadline: string;
  firstSeen: string;
  lastSeen: string;
  carriedFrom: string | null;
  daysOverdue: number;
  durationDays: number;
};

export type FollowUpMember = {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    avatarUrl?: string | null;
  };
  overdueCount: number;
  longestOverdue: number;
  longestDuration: number;
  tasks: FollowUpTask[];
};

type StandupFollowUpViewProps = {
  date: string;
  onDateChange: (date: string) => void;
  isLoading: boolean;
  error: string;
  overdueCount: number;
  memberCount: number;
  members: FollowUpMember[];
};

const formatShort = (value: string) =>
  new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export default function StandupFollowUpView({
  date,
  onDateChange,
  isLoading,
  error,
  overdueCount,
  memberCount,
  members,
}: StandupFollowUpViewProps) {
  const [query, setQuery] = useState("");
  const [minOverdueDays, setMinOverdueDays] = useState(1);
  const [minDurationDays, setMinDurationDays] = useState(1);

  const filteredMembers = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return members
      .map((member) => {
        const tasks = member.tasks.filter((task) => {
          if (task.daysOverdue < minOverdueDays) return false;
          if (task.durationDays < minDurationDays) return false;
          if (!needle) return true;
          return (
            task.text.toLowerCase().includes(needle) ||
            (member.user.name ?? "").toLowerCase().includes(needle) ||
            (member.user.email ?? "").toLowerCase().includes(needle)
          );
        });

        return { ...member, tasks, overdueCount: tasks.length };
      })
      .filter((member) => member.tasks.length > 0);
  }, [members, minDurationDays, minOverdueDays, query]);

  const visibleCount = filteredMembers.reduce((sum, member) => sum + member.overdueCount, 0);

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            Follow-up
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Open tasks with a passed deadline as of this date. Use it to see who needs a nudge.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">
            As of
            <input
              type="date"
              value={date}
              onChange={(event) => onDateChange(event.target.value)}
              className="mt-1 block h-9 w-[10.5rem] rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">
            Overdue at least
            <select
              value={minOverdueDays}
              onChange={(event) => setMinOverdueDays(Number(event.target.value))}
              className="mt-1 block h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value={1}>1 day</option>
              <option value={2}>2 days</option>
              <option value={3}>3 days</option>
              <option value={5}>5 days</option>
              <option value={7}>1 week</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">
            Open at least
            <select
              value={minDurationDays}
              onChange={(event) => setMinDurationDays(Number(event.target.value))}
              className="mt-1 block h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value={1}>any duration</option>
              <option value={3}>3 days</option>
              <option value={5}>5 days</option>
              <option value={7}>1 week</option>
            </select>
          </label>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search member or task"
            className="h-9 min-w-[180px] rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-rose-200/80 bg-rose-50/70 px-4 py-3 dark:border-rose-900/40 dark:bg-rose-950/30">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-300">
            Overdue tasks
          </p>
          <p className="mt-1 text-2xl font-semibold text-rose-700 dark:text-rose-200">
            {isLoading ? "—" : visibleCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/60">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Members
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">
            {isLoading ? "—" : filteredMembers.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/60">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Unfiltered
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {overdueCount} tasks · {memberCount} people
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-100">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading overdue work...</p>
      ) : filteredMembers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700">
          No overdue structured tasks match this date and filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMembers.map((member) => (
            <section
              key={member.user.id}
              className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800"
            >
              <header className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-3 dark:bg-slate-800/70">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {member.user.name ?? member.user.email}
                  </p>
                  <p className="text-xs text-slate-500">{member.user.email}</p>
                </div>
                <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-200">
                  {member.overdueCount} overdue
                </span>
              </header>

              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {member.tasks.map((task) => {
                  const styles = getDeadlineStatusStyles("overdue");
                  return (
                    <li key={task.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                      <p className="min-w-0 flex-1 text-sm leading-5 text-slate-800 dark:text-slate-100">
                        {task.text}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${styles.badge}`}>
                          Due {formatShort(task.deadline)} · {task.daysOverdue}d overdue
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          Open {task.durationDays}d
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800">
                          Since {formatShort(task.firstSeen)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
