DROP POLICY IF EXISTS user_settings_owner_policy ON public.user_settings;
DROP POLICY IF EXISTS test_runs_owner_policy ON public.test_runs;
DROP POLICY IF EXISTS saved_tests_owner_policy ON public.saved_tests;
DROP POLICY IF EXISTS fingerprints_owner_policy ON public.element_fingerprints;
DROP POLICY IF EXISTS execution_logs_owner_policy ON public.execution_logs;

CREATE POLICY user_settings_owner_policy ON public.user_settings
  FOR ALL
  USING (user_id = COALESCE((auth.jwt()->>'user_id'), ''));

CREATE POLICY test_runs_owner_policy ON public.test_runs
  FOR ALL
  USING (user_id = COALESCE((auth.jwt()->>'user_id'), ''));

CREATE POLICY saved_tests_owner_policy ON public.saved_tests
  FOR ALL
  USING (user_id = COALESCE((auth.jwt()->>'user_id'), ''));

CREATE POLICY fingerprints_owner_policy ON public.element_fingerprints
  FOR ALL
  USING (user_id = COALESCE((auth.jwt()->>'user_id'), ''));

CREATE POLICY execution_logs_owner_policy ON public.execution_logs
  FOR ALL
  USING (
    run_id IN (
      SELECT id FROM public.test_runs
      WHERE user_id = COALESCE((auth.jwt()->>'user_id'), '')
    )
  );

CREATE INDEX IF NOT EXISTS idx_saved_tests_run_id ON public.saved_tests(run_id);
