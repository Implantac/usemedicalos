import { useCallback, useEffect, useState } from "react";
import {
  createTask,
  deleteTask,
  filterTasks,
  getTasks,
  getTaskStats,
  sortTasksByDate,
  updateTask,
  type Task,
  type TaskFilters,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/tasks";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setTasks(getTasks());
    setHydrated(true);
  }, []);

  const refresh = useCallback(() => {
    setTasks(getTasks());
  }, []);

  const addTask = useCallback(
    (draft: {
      title: string;
      description: string;
      status: TaskStatus;
      priority: TaskPriority;
      dueDate: string | null;
    }) => {
      const task = createTask(draft);
      refresh();
      return task;
    },
    [refresh],
  );

  const editTask = useCallback(
    (id: string, updates: Partial<Omit<Task, "id" | "createdAt">>) => {
      const task = updateTask(id, updates);
      refresh();
      return task;
    },
    [refresh],
  );

  const removeTask = useCallback(
    (id: string) => {
      const success = deleteTask(id);
      refresh();
      return success;
    },
    [refresh],
  );

  const toggleTaskStatus = useCallback(
    (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return null;
      const nextStatus: TaskStatus =
        task.status === "done" ? "todo" : task.status === "todo" ? "in-progress" : "done";
      return editTask(id, { status: nextStatus });
    },
    [tasks, editTask],
  );

  const getFilteredTasks = useCallback(
    (filters: TaskFilters) => {
      const filtered = filterTasks(tasks, filters);
      return sortTasksByDate(filtered);
    },
    [tasks],
  );

  const stats = getTaskStats(tasks);

  return {
    tasks,
    hydrated,
    addTask,
    editTask,
    removeTask,
    toggleTaskStatus,
    getFilteredTasks,
    stats,
  };
}
