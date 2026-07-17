-- Migration: sincronização de visualizações salvas da Inbox por usuário.
-- Aplicar assim que o Lovable Cloud estiver ativo.

CREATE TABLE public.inbox_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  state jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE INDEX inbox_views_user_id_idx ON public.inbox_views (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inbox_views TO authenticated;
GRANT ALL ON public.inbox_views TO service_role;

ALTER TABLE public.inbox_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own views"
  ON public.inbox_views FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own views"
  ON public.inbox_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own views"
  ON public.inbox_views FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own views"
  ON public.inbox_views FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_inbox_view_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER inbox_views_touch_updated
  BEFORE UPDATE ON public.inbox_views
  FOR EACH ROW EXECUTE FUNCTION public.touch_inbox_view_updated_at();
