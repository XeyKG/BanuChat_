-- Experimental private database only; never apply to a product database.
DO $$ BEGIN IF current_database()<>'banuchat_p0_operational'
 OR to_regclass('banuchat.datasets') IS NOT NULL
 OR NOT EXISTS(SELECT 1 FROM banuchat.isolated_pilot_marker WHERE scope='NO_PUBLICATION')
 THEN RAISE EXCEPTION 'Isolated target rejected'; END IF; END $$;
-- Read/lock only. Runtime cannot UPDATE corpus, scope or grants merely to take locks.
CREATE FUNCTION banuchat_auth.lock_pilot_scope(p_principal uuid,p_deployment uuid,p_release uuid,p_sha text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM banuchat_auth.pilot_scope s
 JOIN banuchat.dataset_releases r ON r.id=s.release_id
 JOIN banuchat_auth.pilot_grants g ON g.principal_id=p_principal AND g.revoked_at IS NULL
 WHERE s.singleton AND s.deployment_id=p_deployment AND s.release_id=p_release
 AND s.manifest_sha256=p_sha AND r.status='ready' AND r.manifest_sha256=s.manifest_sha256
 FOR SHARE OF s,r,g)
$$;
REVOKE ALL ON FUNCTION banuchat_auth.lock_pilot_scope(uuid,uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION banuchat_auth.lock_pilot_scope(uuid,uuid,uuid,text) TO banuchat_pilot_http_runtime;
