import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ListChecks,
  CheckCircle2,
  Clock,
  CalendarDays,
  ArrowRight,
  TrendingUp,
  Activity,
  Sparkles,
} from "lucide-react";
import type { TaskRow } from "@/components/task-dialog";
import { EmptyState } from "@/components/empty-state";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

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
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as TaskRow[];
    },
  });

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const pending = total - completed;
  const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dueToday = tasks.filter((t) => {
    if (!t.due_date || t.status === "completed") return false;
    const d = new Date(t.due_date);
    return d >= today && d < tomorrow;
  }).length;

  const stats = [
    { label: "Total tasks", value: total, icon: ListChecks, accent: "from-blue-500/20 to-blue-500/0", color: "text-blue-500" },
    { label: "Completed", value: completed, icon: CheckCircle2, accent: "from-emerald-500/20 to-emerald-500/0", color: "text-emerald-500" },
    { label: "Pending", value: pending, icon: Clock, accent: "from-amber-500/20 to-amber-500/0", color: "text-amber-500" },
    { label: "Due today", value: dueToday, icon: CalendarDays, accent: "from-rose-500/20 to-rose-500/0", color: "text-rose-500" },
  ];

  // Pie chart data — status breakdown
  const statusData = [
    { name: "Completed", value: completed, color: "hsl(142 71% 45%)" },
    { name: "Pending", value: pending, color: "hsl(38 92% 50%)" },
  ].filter((d) => d.value > 0);

  // Bar chart — priority breakdown
  const priorityData = [
    { name: "High", count: tasks.filter((t) => t.priority === "high").length, color: "hsl(0 84% 60%)" },
    { name: "Medium", count: tasks.filter((t) => t.priority === "medium").length, color: "hsl(38 92% 50%)" },
    { name: "Low", count: tasks.filter((t) => t.priority === "low").length, color: "hsl(142 71% 45%)" },
  ];

  // Recent activity — most recently created or completed
  const recent = [...tasks]
    .sort((a, b) => {
      const at = new Date(a.completed_at ?? a.created_at).getTime();
      const bt = new Date(b.completed_at ?? b.created_at).getTime();
      return bt - at;
    })
    .slice(0, 6);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.email?.split("@")[0]}.
          </p>
        </div>
        <Button asChild>
          <Link to="/tasks">
            Go to tasks <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Card
            key={s.label}
            className="relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 animate-fade-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${s.accent}`} />
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" /> Overall progress
              </CardTitle>
              <CardDescription>
                {completed} of {total} tasks completed
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold tabular-nums">{completionRate}%</div>
              {completionRate === 100 && total > 0 && (
                <Badge variant="secondary" className="mt-1 gap-1">
                  <Sparkles className="h-3 w-3" /> All done!
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={completionRate} className="h-3" />
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status breakdown</CardTitle>
            <CardDescription>Completed vs pending tasks</CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No data yet
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="mt-3 flex justify-center gap-4 text-sm">
              {statusData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-muted-foreground">
                    {d.name} · {d.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasks by priority</CardTitle>
            <CardDescription>How urgent your workload is</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {priorityData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" /> Recent activity
          </CardTitle>
          <CardDescription>Your latest task updates</CardDescription>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <EmptyState
              title="No activity yet"
              description="Create your first task to get started."
              action={
                <Button asChild>
                  <Link to="/tasks">Create a task</Link>
                </Button>
              }
            />
          ) : (
            <ul className="space-y-2">
              {recent.map((t, i) => {
                const done = t.status === "completed";
                const when = new Date(t.completed_at ?? t.created_at);
                return (
                  <li
                    key={t.id}
                    className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/40 animate-fade-in"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        done ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"
                      }`}
                    >
                      {done ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm font-medium ${
                          done ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {t.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {done ? "Completed" : "Created"} ·{" "}
                        {when.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {t.priority}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
