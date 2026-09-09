"use client";

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
  formatDeadlineLabel,
  isTaskOverdue,
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

const SortableTaskRow = ({
  task,
  index,
  referenceDate,
  onUpdate,
  onRemove,
}: SortableTaskRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const overdue = isTaskOverdue(task, referenceDate);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative overflow-hidden rounded-2xl border bg-white/80 backdrop-blur transition dark:bg-slate-900/70 ${
        isDragging
          ? "border-indigo-400 shadow-lg ring-2 ring-indigo-200/60 dark:ring-indigo-500/30"
          : task.done
            ? "border-slate-200/70 opacity-80 dark:border-slate-800/70"
            : "border-slate-200/80 shadow-sm hover:border-indigo-200/80 hover:shadow-md dark:border-slate-800/80 dark:hover:border-indigo-500/30"
      }`}
    >
      <div
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1 ${
          task.done
            ? "bg-slate-300 dark:bg-slate-600"
            : overdue
              ? "bg-gradient-to-b from-rose-400 to-rose-600"
              : "bg-gradient-to-b from-indigo-400 to-violet-500"
        }`}
      />

      <div className="space-y-3 p-3 pl-4">
        <div className="flex items-start gap-2">
          <button
            type="button"
            className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Drag to reorder task"
            {...attributes}
            {...listeners}
          >
            <span aria-hidden="true" className="text-sm leading-none">⋮⋮</span>
          </button>

          <span
            className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            {index + 1}
          </span>

          <label className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center">
            <input
              type="checkbox"
              checked={task.done}
              onChange={(event) => onUpdate({ ...task, done: event.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              aria-label={`Mark "${task.text || "task"}" as done`}
            />
          </label>

          <textarea
            value={task.text}
            onChange={(event) => onUpdate({ ...task, text: event.target.value })}
            placeholder="What will you work on today?"
            rows={Math.min(4, Math.max(1, task.text.split("\n").length))}
            className={`min-h-[42px] min-w-0 flex-1 resize-y rounded-xl border px-3 py-2 text-sm shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200/70 dark:focus:ring-indigo-500/30 ${
              task.done
                ? "border-slate-200/80 bg-slate-50 text-slate-500 line-through dark:border-slate-700 dark:bg-slate-900/60"
                : "border-slate-200/80 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
            }`}
          />

          <button
            type="button"
            onClick={onRemove}
            className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
            aria-label="Remove task"
          >
            ×
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pl-9">
          {task.deadline && (
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                overdue
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {formatDeadlineLabel(task.deadline, referenceDate)}
            </span>
          )}

          <input
            type="date"
            value={task.deadline ?? ""}
            onChange={(event) =>
              onUpdate({
                ...task,
                deadline: event.target.value || null,
              })
            }
            className="rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200/70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-indigo-500/30"
            aria-label="Task deadline"
          />

          {task.carriedFrom && !task.done && (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/50">
              Rolled from {task.carriedFrom}
            </span>
          )}
        </div>
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
    onChange([...tasks, createEmptyTask(tasks.length)]);
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Today&apos;s plan
          </span>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            One focus per row. Add a deadline so standup stays sharp.
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
          className="w-full rounded-2xl border border-dashed border-slate-300/90 bg-white/50 px-4 py-8 text-sm text-slate-500 transition hover:border-indigo-300 hover:bg-indigo-50/40 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-950/20 dark:hover:text-indigo-200"
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
            <div className="space-y-2.5">
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
