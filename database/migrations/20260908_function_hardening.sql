-- handle_new_user is SECURITY DEFINER and was exposed as an RPC at
-- /rest/v1/rpc/handle_new_user, callable by anon and authenticated.
-- It is not attached to any trigger (verified against pg_trigger on
-- 2026-09-08) -- the backend's authenticateUser creates the public.users
-- row directly. Revoking EXECUTE removes API reachability. The function
-- is left in place rather than dropped; drop it once it has been unused
-- across a signup-path change.

revoke execute on function public.handle_new_user() from anon, authenticated, public;

-- Pin search_path so neither function resolves objects through a
-- caller-controlled schema search order.
alter function public.update_updated_at_column() set search_path = public, pg_temp;
alter function public.handle_new_user()          set search_path = public, pg_temp;
