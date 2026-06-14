-- Restrict Realtime channel access: users can only join their own per-user topic
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own realtime channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = ('tasks-realtime:' || (SELECT auth.uid())::text)
);

CREATE POLICY "Users can write own realtime channel"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() = ('tasks-realtime:' || (SELECT auth.uid())::text)
);