import { ClipboardList } from "lucide-react";

interface TaskEmptyProps {
  hasFilters: boolean;
}

export function TaskEmpty({ hasFilters }: TaskEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background">
        <ClipboardList className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-medium text-foreground">
        {hasFilters ? "No tasks match your filters" : "No tasks yet"}
      </h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        {hasFilters
          ? "Try adjusting your search or filters to find what you're looking for."
          : "Add your first task above to start getting things done."}
      </p>
    </div>
  );
}
