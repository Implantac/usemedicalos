import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TaskForm } from "./task-form";
import { Pencil, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { type Task } from "@/lib/tasks";

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => void;
  onDelete: (id: string) => void;
}

const statusLabels: Record<Task["status"], string> = {
  todo: "To do",
  "in-progress": "In progress",
  done: "Done",
};

const priorityVariants: Record<Task["priority"], "default" | "secondary" | "destructive"> = {
  low: "secondary",
  medium: "default",
  high: "destructive",
};

export function TaskItem({ task, onToggle, onEdit, onDelete }: TaskItemProps) {
  const [editOpen, setEditOpen] = useState(false);
  const isDone = task.status === "done";

  const handleEdit = (updates: Omit<Task, "id" | "createdAt" | "updatedAt">) => {
    onEdit(updates);
    setEditOpen(false);
  };

  return (
    <div
      className={`group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:card-shadow-hover ${isDone ? "opacity-60" : ""}`}
    >
      <Checkbox
        checked={isDone}
        onCheckedChange={() => onToggle(task.id)}
        className="mt-1"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3
            className={`font-medium ${isDone ? "text-muted-foreground line-through" : "text-foreground"}`}
          >
            {task.title}
          </h3>
          <Badge variant={priorityVariants[task.priority]}>{task.priority}</Badge>
          <Badge variant="outline">{statusLabels[task.status]}</Badge>
        </div>
        {task.description && (
          <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
        )}
        {task.dueDate && (
          <p className="mt-2 text-xs text-muted-foreground">
            Due {format(parseISO(task.dueDate), "MMM d, yyyy")}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 sm:opacity-100">
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit task</DialogTitle>
            </DialogHeader>
            <TaskForm onSubmit={handleEdit} initialTask={task} submitLabel="Save changes" />
          </DialogContent>
        </Dialog>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(task.id)}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete</span>
        </Button>
      </div>
    </div>
  );
}
