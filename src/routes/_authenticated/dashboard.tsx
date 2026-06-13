import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListChecks, CheckCircle2, Clock, CalendarDays, ArrowRight } from "lucide-react";
import type { TaskRow } from "@/components/task-dialog";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — TaskFlow Pro" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as TaskRow[];
    },
  });

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const pending = total - completed;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const dueToday = tasks.filter((t) => {
    if (!t.due_date || t.status === "completed") return false;
    const d = new Date(t.due_date);
    return d >= today && d < tomorrow;
  }).length;

  const stats = [
    { label: "Total tasks", value: total, icon: ListChecks, color: "text-blue-500" },
    { label: "Completed", value: completed, icon: CheckCircle2, color: "text-emerald-500" },
    { label: "Pending", value: pending, icon: Clock, color: "text-amber-500" },
    { label: "Due today", value: dueToday, icon: CalendarDays, color: "text-rose-500" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.email?.split("@")[0]}.</p>
        </div>
        <Button asChild>
          <Link to="/tasks">Go to tasks <ArrowRight className="ml-1 h-4 w-4" /></Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{isLoading ? "—" : s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : tasks.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No tasks yet.</p>
              <Button asChild className="mt-4"><Link to="/tasks">Create your first task</Link></Button>
            </div>
          ) : (
            <ul className="divide-y">
              {tasks.slice(0, 5).map((t) => (
                <li key={t.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className={`truncate font-medium ${t.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{t.priority} priority{t.due_date ? ` · due ${new Date(t.due_date).toLocaleDateString()}` : ""}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
