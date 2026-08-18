# Manual SQL - not part of the migration sequence

`planb_drop_trigger.sql` drops `on_auth_user_created` from `auth.users`.

That trigger was aborting every signup with "Database error saving new user":
it inserted into `public.users (id, email)` while the table requires
`auth_user_id` (NOT NULL, no default). Attempting to repair the trigger did
not clear the failure; dropping it did.

User provisioning is handled entirely by `authenticateUser` in
`backend/src/services/authService.ts`, which upserts on `auth_user_id` on
every authenticated request. The row is created on the user's first
authenticated call rather than at signup.

Do NOT move this file back into `supabase/migrations/` - a sequential runner
would apply it after any future trigger repair and silently undo it.