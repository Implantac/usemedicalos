import { TaskItem } from "./task-item";
import { TaskEmpty } from "./task-empty";
import { type Task, type TaskFilters } from "@/lib/tasks";

interface TaskListProps {
  tasks: Task[];
  filters: TaskFilters;
  onToggle: (id: string) => void;
  onEdit: (id: string, task: Omit<Task, "id" | "createdAt" | "updatedAt">) => void;
  onDelete: (id: string) => void;
}

export function TaskList({ tasks, filters, onToggle, onEdit, onDelete }: TaskListProps) {
  const hasFilters = filters.status !== "all" || filters.priority !== "all" || filters.search.trim() !== "";

  if (tasks.length === 0) {
    return <TaskEmpty hasFilters={hasFilters} />;
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={onToggle}
          onEdit={(updates) => onEdit(task.id, updates)}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
