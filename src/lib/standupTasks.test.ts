import { describe, expect, it } from "vitest";

import {
  buildEditableTasksForDate,
  collectFollowUpTasks,
  getDeadlineStatus,
  isCarryOverCandidate,
  mergeOpenTasksForDate,
  parseLegacySummaryToday,
  parseStoredTodayTasks,
  summarizeTaskCompletion,
  syncTodayTasksWithYesterday,
  tasksToSummaryToday,
} from "@/lib/standupTasks";

describe("standupTasks", () => {
  it("parses legacy summary text into task rows", () => {
    const tasks = parseLegacySummaryToday(
      "- First task\n- Second task",
      "2026-09-08"
    );

    expect(tasks).toHaveLength(2);
    expect(tasks[0].text).toBe("First task");
    expect(tasks[0].deadline).toBeNull();
    expect(tasks[0].id).toContain("legacy-2026-09-08");
  });

  it("serializes structured tasks back to summary text", () => {
    const summary = tasksToSummaryToday([
      {
        id: "1",
        text: "Ship feature",
        deadline: "2026-09-09",
        done: false,
        carriedFrom: null,
        sortOrder: 0,
      },
      {
        id: "2",
        text: "Write docs",
        deadline: null,
        done: true,
        carriedFrom: null,
        sortOrder: 1,
      },
    ]);

    expect(summary).toContain("- Ship feature [Sep 9]");
    expect(summary).toContain("- [x] Write docs");
  });

  it("carries only overdue structured tasks from older days", () => {
    const merged = mergeOpenTasksForDate(
      [
        {
          date: "2026-09-06",
          todayTasks: [
            {
              id: "task-1",
              text: "Bugfix",
              deadline: "2026-09-06",
              done: false,
              carriedFrom: null,
              sortOrder: 0,
            },
          ],
        },
      ],
      null,
      "2026-09-09"
    );

    expect(merged).toHaveLength(1);
    expect(merged[0].text).toBe("Bugfix");
  });

  it("rolls unfinished tasks from the previous standup day into today", () => {
    const previousDayEntry = {
      date: "2026-09-09",
      todayTasks: [
        {
          id: "task-1",
          text: "Still open",
          deadline: "2026-09-12",
          done: false,
          carriedFrom: null,
          sortOrder: 0,
        },
        {
          id: "task-2",
          text: "Finished",
          deadline: "2026-09-09",
          done: true,
          carriedFrom: null,
          sortOrder: 1,
        },
      ],
    };

    const editable = buildEditableTasksForDate(
      [previousDayEntry],
      previousDayEntry,
      null,
      "2026-09-10"
    );

    expect(editable).toHaveLength(1);
    expect(editable[0].text).toBe("Still open");
    expect(editable[0].carriedFrom).toBe("2026-09-09");
  });

  it("syncs today tasks when yesterday tasks are marked finished", () => {
    const synced = syncTodayTasksWithYesterday(
      [
        {
          id: "task-1",
          text: "Done task",
          deadline: "2026-09-09",
          done: true,
          carriedFrom: null,
          sortOrder: 0,
        },
        {
          id: "task-2",
          text: "Open task",
          deadline: "2026-09-10",
          done: false,
          carriedFrom: null,
          sortOrder: 1,
        },
      ],
      [
        {
          id: "task-1",
          text: "Done task",
          deadline: "2026-09-09",
          done: false,
          carriedFrom: "2026-09-09",
          sortOrder: 0,
        },
        {
          id: "task-2",
          text: "Open task",
          deadline: "2026-09-10",
          done: false,
          carriedFrom: "2026-09-09",
          sortOrder: 1,
        },
      ],
      "2026-09-09"
    );

    expect(synced).toHaveLength(1);
    expect(synced[0].id).toBe("task-2");
  });

  it("does not carry legacy summary text from previous days", () => {
    const merged = mergeOpenTasksForDate(
      [
        {
          date: "2026-09-08",
          summaryToday: "- Old bullet task\n- Another old task",
          todayTasks: null,
        },
      ],
      null,
      "2026-09-09"
    );

    expect(merged).toHaveLength(0);
  });

  it("uses stored tasks when present and falls back to legacy text for display", () => {
    const structured = parseStoredTodayTasks(
      [{ id: "a", text: "Structured", deadline: "2026-09-09", done: false }],
      "- Legacy"
    );
    expect(structured[0].text).toBe("Structured");

    const legacy = parseStoredTodayTasks(null, "- Legacy only", "2026-09-09");
    expect(legacy[0].text).toBe("Legacy only");
  });

  it("classifies deadline status", () => {
    expect(
      getDeadlineStatus(
        {
          id: "1",
          text: "Late",
          deadline: "2026-09-08",
          done: false,
          carriedFrom: null,
          sortOrder: 0,
        },
        "2026-09-09"
      )
    ).toBe("overdue");

    expect(
      getDeadlineStatus(
        {
          id: "2",
          text: "Today",
          deadline: "2026-09-09",
          done: false,
          carriedFrom: null,
          sortOrder: 0,
        },
        "2026-09-09"
      )
    ).toBe("due-today");

    expect(
      getDeadlineStatus(
        {
          id: "3",
          text: "Future",
          deadline: "2026-09-12",
          done: false,
          carriedFrom: null,
          sortOrder: 0,
        },
        "2026-09-09"
      )
    ).toBe("on-track");
  });

  it("collects overdue structured tasks for follow-up", () => {
    const result = collectFollowUpTasks(
      [
        {
          userId: "user-1",
          date: "2026-09-08",
          todayTasks: [
            {
              id: "task-1",
              text: "Stuck demo",
              deadline: "2026-09-08",
              done: false,
              carriedFrom: null,
              sortOrder: 0,
            },
          ],
        },
        {
          userId: "user-1",
          date: "2026-09-09",
          todayTasks: [
            {
              id: "task-1",
              text: "Stuck demo",
              deadline: "2026-09-08",
              done: false,
              carriedFrom: "2026-09-08",
              sortOrder: 0,
            },
          ],
        },
      ],
      "2026-09-11"
    );

    const tasks = result.get("user-1") ?? [];
    expect(tasks).toHaveLength(1);
    expect(tasks[0].daysOverdue).toBe(3);
    expect(tasks[0].durationDays).toBe(4);
  });

  it("only treats overdue structured tasks as carry-over candidates", () => {
    expect(
      isCarryOverCandidate(
        {
          id: "task-1",
          text: "Overdue",
          deadline: "2026-09-08",
          done: false,
          carriedFrom: null,
          sortOrder: 0,
        },
        "2026-09-09"
      )
    ).toBe(true);

    expect(
      isCarryOverCandidate(
        {
          id: "task-2",
          text: "Future",
          deadline: "2026-09-12",
          done: false,
          carriedFrom: null,
          sortOrder: 0,
        },
        "2026-09-09"
      )
    ).toBe(false);
  });

  it("summarizes structured task completion counts", () => {
    expect(
      summarizeTaskCompletion([
        {
          id: "1",
          text: "Done task",
          deadline: "2026-09-08",
          done: true,
          carriedFrom: null,
          sortOrder: 0,
        },
        {
          id: "2",
          text: "Open task",
          deadline: "2026-09-08",
          done: false,
          carriedFrom: null,
          sortOrder: 1,
        },
      ])
    ).toEqual({ done: 1, total: 2 });

    expect(summarizeTaskCompletion(null)).toBeNull();
  });
});
