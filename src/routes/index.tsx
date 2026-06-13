import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TaskFlow Pro — Stay productive" },
      { name: "description", content: "Modern task management to plan, prioritize, and complete your work." },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  return <Navigate to={user ? "/dashboard" : "/auth"} />;
}
