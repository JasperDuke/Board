"use client";

import { useEffect, useRef } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  createEmptyTask,
  formatDeadlineShort,
  getDeadlineStatus,
  getDeadlineStatusStyles,
  type StandupPlanTask,
} from "@/lib/standupTasks";

type StandupTaskEditorProps = {
  tasks: StandupPlanTask[];
  referenceDate: string;
  onChange: (tasks: StandupPlanTask[]) => void;
};

type SortableTaskRowProps = {
  task: StandupPlanTask;
  index: number;
  referenceDate: string;
  onUpdate: (task: StandupPlanTask) => void;
  onRemove: () => void;
};

const AutoGrowInput = ({
  value,
  done,
  onChange,
}: {
  value: string;
  done: boolean;
  onChange: (value: string) => void;
}) => {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = "0px";
    node.style.height = `${Math.max(36, node.scrollHeight)}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      onChange={(event) => onChange(event.target.value)}
      placeholder="What will you work on today?"
      className={`min-h-9 w-full resize-none overflow-hidden bg-transparent py-1.5 text-sm leading-5 outline-none placeholder:text-slate-400 ${
        done
          ? "text-slate-400 line-through dark:text-slate-500"
          : "text-slate-800 dark:text-slate-100"
      }`}
    />
  );
};

const SortableTaskRow = ({
  task,
  index,
  referenceDate,
  onUpdate,
  onRemove,
}: SortableTaskRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const status = getDeadlineStatus(task, referenceDate);
  const styles = getDeadlineStatusStyles(status);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`group relative rounded-xl border bg-white/90 dark:bg-slate-900/80 ${styles.border} ${
        isDragging ? "z-10 shadow-lg ring-1 ring-indigo-300/70" : ""
      } ${task.done ? "opacity-70" : ""}`}
    >
      <div aria-hidden="true" className={`absolute inset-y-2 left-0 w-0.5 rounded-full ${styles.stripe}`} />

      <div className="flex items-start gap-2 py-1.5 pl-3 pr-2">
        <button
          type="button"
          className="mt-1.5 grid h-6 w-4 shrink-0 place-items-center text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-300"
          aria-label="Reorder task"
          {...attributes}
          {...listeners}
        >
          <span className="text-[10px] leading-none tracking-tighter">::</span>
        </button>

        <span className="mt-1.5 w-4 shrink-0 text-center text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
          {index + 1}
        </span>

        <input
          type="checkbox"
          checked={task.done}
          onChange={(event) => onUpdate({ ...task, done: event.target.checked })}
          className="mt-2.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          aria-label={`Mark "${task.text || "task"}" as done`}
        />

        <div className="min-w-0 flex-1">
          <AutoGrowInput
            value={task.text}
            done={task.done}
            onChange={(text) => onUpdate({ ...task, text })}
          />
          {task.carriedFrom && !task.done && (
            <p className="pb-1 text-[10px] font-medium text-amber-600 dark:text-amber-300">
              Rolled from {task.carriedFrom}
            </p>
          )}
        </div>

        <label className="mt-1 flex h-8 shrink-0 items-center">
          <input
            type="date"
            value={task.deadline ?? ""}
            onChange={(event) =>
              onUpdate({
                ...task,
                deadline: event.target.value || null,
              })
            }
            className={`h-8 w-[8.75rem] cursor-pointer rounded-lg border bg-slate-50 px-2 text-[12px] text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-indigo-500/30 [&::-webkit-calendar-picker-indicator]:ml-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 ${styles.border}`}
            aria-label="Task deadline"
          />
        </label>

        {task.deadline && (
          <span
            className={`mt-1 hidden h-8 items-center rounded-lg px-2 text-[10px] font-semibold sm:inline-flex ${styles.badge}`}
          >
            {status === "overdue"
              ? "Overdue"
              : status === "due-today"
                ? "Today"
                : formatDeadlineShort(task.deadline)}
          </span>
        )}

        <button
          type="button"
          onClick={onRemove}
          className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-300 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
          aria-label="Remove task"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default function StandupTaskEditor({
  tasks,
  referenceDate,
  onChange,
}: StandupTaskEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex((task) => task.id === active.id);
    const newIndex = tasks.findIndex((task) => task.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    onChange(
      arrayMove(tasks, oldIndex, newIndex).map((task, index) => ({
        ...task,
        sortOrder: index,
      }))
    );
  };

  const handleAddTask = () => {
    onChange([...tasks, createEmptyTask(tasks.length, referenceDate)]);
  };

  const handleUpdateTask = (index: number, updatedTask: StandupPlanTask) => {
    onChange(tasks.map((task, taskIndex) => (taskIndex === index ? updatedTask : task)));
  };

  const handleRemoveTask = (index: number) => {
    onChange(
      tasks
        .filter((_, taskIndex) => taskIndex !== index)
        .map((task, taskIndex) => ({ ...task, sortOrder: taskIndex }))
    );
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Today&apos;s plan
          </span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Green on track · orange due today · red overdue
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddTask}
          className="rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110"
        >
          + Add task
        </button>
      </div>

      {tasks.length === 0 ? (
        <button
          type="button"
          onClick={handleAddTask}
          className="w-full rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400"
        >
          Add your first task for today
        </button>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {tasks.map((task, index) => (
                <SortableTaskRow
                  key={task.id}
                  task={task}
                  index={index}
                  referenceDate={referenceDate}
                  onUpdate={(updatedTask) => handleUpdateTask(index, updatedTask)}
                  onRemove={() => handleRemoveTask(index)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
