-- Optimize RLS policies to use InitPlan for auth.uid()
-- Performance improvement: 9-94% faster queries

DROP POLICY IF EXISTS user_settings_owner_policy ON public.user_settings;
CREATE POLICY user_settings_owner_policy ON public.user_settings
  FOR ALL
  USING (user_id = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS test_runs_owner_policy ON public.test_runs;
CREATE POLICY test_runs_owner_policy ON public.test_runs
  FOR ALL
  USING (user_id = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS saved_tests_owner_policy ON public.saved_tests;
CREATE POLICY saved_tests_owner_policy ON public.saved_tests
  FOR ALL
  USING (user_id = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS fingerprints_owner_policy ON public.element_fingerprints;
CREATE POLICY fingerprints_owner_policy ON public.element_fingerprints
  FOR ALL
  USING (user_id = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS execution_logs_owner_policy ON public.execution_logs;
CREATE POLICY execution_logs_owner_policy ON public.execution_logs
  FOR ALL
  USING (
    run_id IN (
      SELECT id FROM public.test_runs 
      WHERE user_id = (SELECT auth.uid()::text)
    )
  );

CREATE INDEX IF NOT EXISTS idx_saved_tests_run_id ON public.saved_tests(run_id);
