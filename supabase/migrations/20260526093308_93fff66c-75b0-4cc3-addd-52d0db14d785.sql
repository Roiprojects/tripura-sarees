DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'homepage_banners'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.homepage_banners;
  END IF;
END$$;

ALTER TABLE public.homepage_banners REPLICA IDENTITY FULL;