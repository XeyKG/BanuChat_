BEGIN;
CREATE OR REPLACE FUNCTION banuchat_academic.read_me(access_token text)
RETURNS TABLE(student jsonb, attempts jsonb)
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, pg_temp
AS $read$
  SELECT (to_jsonb(s) - 'dataset_release_id') ||
    jsonb_build_object('program_name', p.name, 'period_label', current_period.label),
    COALESCE((
      SELECT jsonb_agg((to_jsonb(a) - 'dataset_release_id' - 'profile_key') ||
        jsonb_build_object('course_name', c.name, 'period_label', period.label)
        ORDER BY a.course_key,a.attempt_number)
      FROM banuchat_academic.course_attempts a
      JOIN banuchat.courses c USING (dataset_release_id, course_key)
      JOIN banuchat_academic.periods period USING (dataset_release_id, period_key)
      WHERE (a.dataset_release_id,a.profile_key) = (s.dataset_release_id,s.profile_key)
    ), '[]'::jsonb)
  FROM banuchat_auth.resource_context(access_token,NULL,true,false) ctx
  JOIN banuchat_academic.students s
    ON s.dataset_release_id = ctx.release_id AND s.profile_key = ctx.profile_key
  JOIN banuchat_academic.programs p USING (dataset_release_id, program_key)
  JOIN banuchat_academic.periods current_period
    ON (current_period.dataset_release_id,current_period.period_key)=(s.dataset_release_id,s.current_period_key);
$read$;
COMMIT;
