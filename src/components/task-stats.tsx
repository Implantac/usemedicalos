import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, Clock, AlertCircle, TrendingUp } from "lucide-react";

interface TaskStatsProps {
  total: number;
  done: number;
  inProgress: number;
  todo: number;
  high: number;
  completionRate: number;
}

export function TaskStats({ total, done, inProgress, todo, high, completionRate }: TaskStatsProps) {
  const items = [
    { label: "Total", value: total, icon: TrendingUp, color: "text-primary" },
    { label: "Done", value: done, icon: CheckCircle2, color: "text-success" },
    { label: "In progress", value: inProgress, icon: Clock, color: "text-warning" },
    { label: "To do", value: todo, icon: Circle, color: "text-muted-foreground" },
    { label: "High priority", value: high, icon: AlertCircle, color: "text-destructive" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label} className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {item.label}
            </CardTitle>
            <item.icon className={`h-4 w-4 ${item.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{item.value}</div>
          </CardContent>
        </Card>
      ))}
      <Card className="card-shadow sm:col-span-2 lg:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Completion rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-bold tracking-tight">{completionRate}%</span>
            <span className="text-sm text-muted-foreground">{done} of {total} tasks completed</span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
