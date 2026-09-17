
CREATE TABLE IF NOT EXISTS public.erp_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  request_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  api_key_valid BOOLEAN NOT NULL DEFAULT false,
  status_code INTEGER NOT NULL,
  error_message TEXT
);
GRANT SELECT ON public.erp_api_logs TO authenticated;
GRANT ALL ON public.erp_api_logs TO service_role;
ALTER TABLE public.erp_api_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "erp_api_logs admin read" ON public.erp_api_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX IF NOT EXISTS erp_api_logs_time_idx ON public.erp_api_logs (request_time DESC);
