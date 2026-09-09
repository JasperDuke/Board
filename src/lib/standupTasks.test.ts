import { describe, expect, it } from "vitest";

import {
  buildEditableTasksForDate,
  isCarryOverCandidate,
  mergeOpenTasksForDate,
  parseLegacySummaryToday,
  parseStoredTodayTasks,
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

  it("carries only overdue structured tasks with deadlines", () => {
    const merged = mergeOpenTasksForDate(
      [
        {
          date: "2026-09-08",
          todayTasks: [
            {
              id: "task-1",
              text: "Bugfix",
              deadline: "2026-09-08",
              done: false,
              carriedFrom: null,
              sortOrder: 0,
            },
            {
              id: "task-2",
              text: "Finished item",
              deadline: null,
              done: true,
              carriedFrom: null,
              sortOrder: 1,
            },
            {
              id: "task-3",
              text: "Future work",
              deadline: "2026-09-12",
              done: false,
              carriedFrom: null,
              sortOrder: 2,
            },
          ],
        },
      ],
      null,
      "2026-09-09"
    );

    expect(merged).toHaveLength(1);
    expect(merged[0].text).toBe("Bugfix");
    expect(merged[0].carriedFrom).toBe("2026-09-08");
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

    expect(
      isCarryOverCandidate(
        {
          id: "legacy-2026-09-08-0-old",
          text: "Legacy",
          deadline: "2026-09-08",
          done: false,
          carriedFrom: null,
          sortOrder: 0,
        },
        "2026-09-09"
      )
    ).toBe(false);
  });

  it("merges overdue carried tasks with saved tasks for the current day", () => {
    const editable = buildEditableTasksForDate(
      [
        {
          date: "2026-09-08",
          todayTasks: [
            {
              id: "task-1",
              text: "Overdue task",
              deadline: "2026-09-08",
              done: false,
              carriedFrom: null,
              sortOrder: 0,
            },
          ],
        },
      ],
      {
        date: "2026-09-09",
        todayTasks: [
          {
            id: "task-2",
            text: "Saved today",
            deadline: null,
            done: false,
            carriedFrom: null,
            sortOrder: 0,
          },
        ],
      },
      "2026-09-09"
    );

    expect(editable).toHaveLength(2);
    expect(editable.map((task) => task.text)).toEqual(["Overdue task", "Saved today"]);
  });
});
