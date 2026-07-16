import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SiteHeader } from "@/components/site-header";
import { TaskForm } from "@/components/task-form";
import { TaskFilter } from "@/components/task-filter";
import { TaskList } from "@/components/task-list";
import { TaskStats } from "@/components/task-stats";
import { useTasks } from "@/hooks/use-tasks";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { type Task, type TaskFilters } from "@/lib/tasks";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard — TaskFlow" },
      { name: "description", content: "Manage your tasks and track your productivity with TaskFlow." },
    ],
  }),
});

function Dashboard() {
  const { hydrated, addTask, editTask, removeTask, toggleTaskStatus, getFilteredTasks, stats } = useTasks();
  const [filters, setFilters] = useState<TaskFilters>({
    status: "all",
    priority: "all",
    search: "",
  });
  const [createOpen, setCreateOpen] = useState(false);

  const filteredTasks = getFilteredTasks(filters);

  const handleAdd = (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => {
    addTask(task);
    setCreateOpen(false);
    toast.success("Task created");
  };

  const handleEdit = (id: string, updates: Omit<Task, "id" | "createdAt" | "updatedAt">) => {
    editTask(id, updates);
    toast.success("Task updated");
  };

  const handleDelete = (id: string) => {
    removeTask(id);
    toast.success("Task deleted");
  };

  const handleToggle = (id: string) => {
    const updated = toggleTaskStatus(id);
    if (updated?.status === "done") {
      toast.success("Task completed");
    }
  };

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader variant="app" />
        <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-muted" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader variant="app" />
      <Toaster position="bottom-right" />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
            <p className="mt-1 text-muted-foreground">Track your tasks and keep moving forward.</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="h-10 px-5">
                <Plus className="mr-2 h-4 w-4" />
                New task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create new task</DialogTitle>
              </DialogHeader>
              <TaskForm onSubmit={handleAdd} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-8">
          <TaskStats {...stats} />
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6 card-shadow">
          <div className="mb-6">
            <TaskFilter filters={filters} onChange={setFilters} />
          </div>
          <TaskList
            tasks={filteredTasks}
            filters={filters}
            onToggle={handleToggle}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </main>
    </div>
  );
}
