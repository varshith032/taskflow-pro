import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, CalendarDays, ClipboardList } from "lucide-react";
import { TaskDialog, type TaskRow } from "@/components/task-dialog";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "Tasks — TaskFlow Pro" }] }),
  component: TasksPage,
});

const priorityStyles: Record<string, string> = {
  high: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
  low: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
};

function TasksPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TaskRow | null>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as TaskRow[];
    },
  });

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (priority !== "all" && t.priority !== priority) return false;
      if (status !== "all" && t.status !== status) return false;
      if (search && !`${t.title} ${t.description ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tasks, search, priority, status]);

  const toggleMutation = useMutation({
    mutationFn: async (t: TaskRow) => {
      const newStatus = t.status === "completed" ? "pending" : "completed";
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus, completed_at: newStatus === "completed" ? new Date().toISOString() : null })
        .eq("id", t.id);
      if (error) throw error;
      return newStatus;
    },
    onSuccess: (newStatus) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      if (newStatus === "completed") toast.success("Nice work — task completed! 🎉");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); toast.success("Task deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">{filtered.length} of {tasks.length} tasks</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="mr-1 h-4 w-4" /> New task
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search tasks…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="md:w-40"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="md:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={ClipboardList}
              title={tasks.length === 0 ? "No tasks yet" : "No tasks match your filters"}
              description={
                tasks.length === 0
                  ? "Create your first task to start organizing your day."
                  : "Try adjusting your search or filters."
              }
              action={
                tasks.length === 0 ? (
                  <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
                    <Plus className="mr-1 h-4 w-4" /> New task
                  </Button>
                ) : null
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((t, i) => {
            const overdue = t.due_date && t.status !== "completed" && new Date(t.due_date) < new Date(new Date().setHours(0,0,0,0));
            return (
              <Card
                key={t.id}
                className="transition-all hover:shadow-md hover:-translate-y-0.5 animate-fade-in"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  <Checkbox
                    checked={t.status === "completed"}
                    onCheckedChange={() => toggleMutation.mutate(t)}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={`font-semibold ${t.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{t.title}</h3>
                      <Badge variant="outline" className={`capitalize ${priorityStyles[t.priority]}`}>{t.priority}</Badge>
                      {t.due_date && (
                        <span className={`inline-flex items-center gap-1 text-xs ${overdue ? "text-rose-500" : "text-muted-foreground"}`}>
                          <CalendarDays className="h-3 w-3" />
                          {new Date(t.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {t.description && <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(t); setDialogOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPendingDelete(t)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <TaskDialog open={dialogOpen} onOpenChange={setDialogOpen} task={editing} />
      <ConfirmDeleteDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title={`Delete "${pendingDelete?.title ?? ""}"?`}
        description="This task will be permanently removed. This action cannot be undone."
        onConfirm={() => {
          if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
