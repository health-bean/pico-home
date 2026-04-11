-- ============================================================================
-- Migration: Enable Row-Level Security on all tables
-- Purpose: Protect data from unauthorized access via Supabase REST API (anon key)
-- Note: The app uses Drizzle ORM with DATABASE_URL (postgres role) which bypasses
--       RLS, so this migration only restricts PostgREST / Supabase client access.
-- ============================================================================

-- ─── Helper function: get internal user ID from Supabase auth ───────────────
-- This maps auth.uid() (Supabase Auth UUID) to our users.id (app UUID)
CREATE OR REPLACE FUNCTION public.get_app_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.users WHERE auth_id = auth.uid()
$$;

-- ─── Helper function: check if user is owner or member of a home ────────────
CREATE OR REPLACE FUNCTION public.user_has_home_access(p_home_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.homes
    WHERE id = p_home_id AND user_id = public.get_app_user_id()
  )
  OR EXISTS (
    SELECT 1 FROM public.home_members
    WHERE home_id = p_home_id AND user_id = public.get_app_user_id()
  )
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- 1. USERS
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own row
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth_id = auth.uid());

-- Users can insert their own row (during signup)
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth_id = auth.uid());

-- Users can update their own row
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- Users can delete their own row
CREATE POLICY "users_delete_own" ON public.users
  FOR DELETE USING (auth_id = auth.uid());


-- ════════════════════════════════════════════════════════════════════════════
-- 2. HOMES
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.homes ENABLE ROW LEVEL SECURITY;

-- Owner or member can read
CREATE POLICY "homes_select" ON public.homes
  FOR SELECT USING (
    user_id = public.get_app_user_id()
    OR EXISTS (
      SELECT 1 FROM public.home_members
      WHERE home_id = id AND user_id = public.get_app_user_id()
    )
  );

-- Only authenticated users can create homes (they become owner)
CREATE POLICY "homes_insert" ON public.homes
  FOR INSERT WITH CHECK (user_id = public.get_app_user_id());

-- Only owner can update
CREATE POLICY "homes_update" ON public.homes
  FOR UPDATE USING (user_id = public.get_app_user_id())
  WITH CHECK (user_id = public.get_app_user_id());

-- Only owner can delete
CREATE POLICY "homes_delete" ON public.homes
  FOR DELETE USING (user_id = public.get_app_user_id());


-- ════════════════════════════════════════════════════════════════════════════
-- 3. HOME_MEMBERS
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.home_members ENABLE ROW LEVEL SECURITY;

-- Members can see other members of homes they belong to
CREATE POLICY "home_members_select" ON public.home_members
  FOR SELECT USING (public.user_has_home_access(home_id));

-- Only home owner can add members
CREATE POLICY "home_members_insert" ON public.home_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.homes
      WHERE id = home_id AND user_id = public.get_app_user_id()
    )
  );

-- Only home owner can update member roles
CREATE POLICY "home_members_update" ON public.home_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.homes
      WHERE id = home_id AND user_id = public.get_app_user_id()
    )
  );

-- Owner can remove members; members can remove themselves
CREATE POLICY "home_members_delete" ON public.home_members
  FOR DELETE USING (
    user_id = public.get_app_user_id()
    OR EXISTS (
      SELECT 1 FROM public.homes
      WHERE id = home_id AND user_id = public.get_app_user_id()
    )
  );


-- ════════════════════════════════════════════════════════════════════════════
-- 4. HOME_INVITES
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.home_invites ENABLE ROW LEVEL SECURITY;

-- Home owner/members can see invites; invited user can see their invite
CREATE POLICY "home_invites_select" ON public.home_invites
  FOR SELECT USING (
    public.user_has_home_access(home_id)
    OR invited_email = (SELECT email FROM public.users WHERE auth_id = auth.uid())
  );

-- Only home owner can create invites
CREATE POLICY "home_invites_insert" ON public.home_invites
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.homes
      WHERE id = home_id AND user_id = public.get_app_user_id()
    )
  );

-- Owner or invited user can update (accept/decline)
CREATE POLICY "home_invites_update" ON public.home_invites
  FOR UPDATE USING (
    invited_by = public.get_app_user_id()
    OR invited_email = (SELECT email FROM public.users WHERE auth_id = auth.uid())
  );

-- Only home owner can delete invites
CREATE POLICY "home_invites_delete" ON public.home_invites
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.homes
      WHERE id = home_id AND user_id = public.get_app_user_id()
    )
  );


-- ════════════════════════════════════════════════════════════════════════════
-- 5. HOME_SYSTEMS
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.home_systems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "home_systems_select" ON public.home_systems
  FOR SELECT USING (public.user_has_home_access(home_id));

CREATE POLICY "home_systems_insert" ON public.home_systems
  FOR INSERT WITH CHECK (public.user_has_home_access(home_id));

CREATE POLICY "home_systems_update" ON public.home_systems
  FOR UPDATE USING (public.user_has_home_access(home_id))
  WITH CHECK (public.user_has_home_access(home_id));

CREATE POLICY "home_systems_delete" ON public.home_systems
  FOR DELETE USING (public.user_has_home_access(home_id));


-- ════════════════════════════════════════════════════════════════════════════
-- 6. ROOMS
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rooms_select" ON public.rooms
  FOR SELECT USING (public.user_has_home_access(home_id));

CREATE POLICY "rooms_insert" ON public.rooms
  FOR INSERT WITH CHECK (public.user_has_home_access(home_id));

CREATE POLICY "rooms_update" ON public.rooms
  FOR UPDATE USING (public.user_has_home_access(home_id))
  WITH CHECK (public.user_has_home_access(home_id));

CREATE POLICY "rooms_delete" ON public.rooms
  FOR DELETE USING (public.user_has_home_access(home_id));


-- ════════════════════════════════════════════════════════════════════════════
-- 7. APPLIANCES
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.appliances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appliances_select" ON public.appliances
  FOR SELECT USING (public.user_has_home_access(home_id));

CREATE POLICY "appliances_insert" ON public.appliances
  FOR INSERT WITH CHECK (public.user_has_home_access(home_id));

CREATE POLICY "appliances_update" ON public.appliances
  FOR UPDATE USING (public.user_has_home_access(home_id))
  WITH CHECK (public.user_has_home_access(home_id));

CREATE POLICY "appliances_delete" ON public.appliances
  FOR DELETE USING (public.user_has_home_access(home_id));


-- ════════════════════════════════════════════════════════════════════════════
-- 8. TASK_TEMPLATES (system-wide, read-only for authenticated users)
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read system templates
CREATE POLICY "task_templates_select" ON public.task_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- No insert/update/delete via API — managed by migrations/admin only


-- ════════════════════════════════════════════════════════════════════════════
-- 9. TASK_INSTANCES
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.task_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_instances_select" ON public.task_instances
  FOR SELECT USING (public.user_has_home_access(home_id));

CREATE POLICY "task_instances_insert" ON public.task_instances
  FOR INSERT WITH CHECK (public.user_has_home_access(home_id));

CREATE POLICY "task_instances_update" ON public.task_instances
  FOR UPDATE USING (public.user_has_home_access(home_id))
  WITH CHECK (public.user_has_home_access(home_id));

CREATE POLICY "task_instances_delete" ON public.task_instances
  FOR DELETE USING (public.user_has_home_access(home_id));


-- ════════════════════════════════════════════════════════════════════════════
-- 10. TASK_COMPLETIONS
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;

-- Access via task_instance -> home chain
CREATE POLICY "task_completions_select" ON public.task_completions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.task_instances ti
      WHERE ti.id = task_instance_id
        AND public.user_has_home_access(ti.home_id)
    )
  );

CREATE POLICY "task_completions_insert" ON public.task_completions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.task_instances ti
      WHERE ti.id = task_instance_id
        AND public.user_has_home_access(ti.home_id)
    )
  );

CREATE POLICY "task_completions_update" ON public.task_completions
  FOR UPDATE USING (
    completed_by = public.get_app_user_id()
  );

CREATE POLICY "task_completions_delete" ON public.task_completions
  FOR DELETE USING (
    completed_by = public.get_app_user_id()
  );


-- ════════════════════════════════════════════════════════════════════════════
-- 11. CONTRACTORS
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contractors_select" ON public.contractors
  FOR SELECT USING (user_id = public.get_app_user_id());

CREATE POLICY "contractors_insert" ON public.contractors
  FOR INSERT WITH CHECK (user_id = public.get_app_user_id());

CREATE POLICY "contractors_update" ON public.contractors
  FOR UPDATE USING (user_id = public.get_app_user_id())
  WITH CHECK (user_id = public.get_app_user_id());

CREATE POLICY "contractors_delete" ON public.contractors
  FOR DELETE USING (user_id = public.get_app_user_id());


-- ════════════════════════════════════════════════════════════════════════════
-- 12. DOCUMENTS
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_select" ON public.documents
  FOR SELECT USING (user_id = public.get_app_user_id());

CREATE POLICY "documents_insert" ON public.documents
  FOR INSERT WITH CHECK (user_id = public.get_app_user_id());

CREATE POLICY "documents_update" ON public.documents
  FOR UPDATE USING (user_id = public.get_app_user_id())
  WITH CHECK (user_id = public.get_app_user_id());

CREATE POLICY "documents_delete" ON public.documents
  FOR DELETE USING (user_id = public.get_app_user_id());


-- ════════════════════════════════════════════════════════════════════════════
-- 13. NOTIFICATION_PREFERENCES
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_preferences_select" ON public.notification_preferences
  FOR SELECT USING (user_id = public.get_app_user_id());

CREATE POLICY "notification_preferences_insert" ON public.notification_preferences
  FOR INSERT WITH CHECK (user_id = public.get_app_user_id());

CREATE POLICY "notification_preferences_update" ON public.notification_preferences
  FOR UPDATE USING (user_id = public.get_app_user_id())
  WITH CHECK (user_id = public.get_app_user_id());

CREATE POLICY "notification_preferences_delete" ON public.notification_preferences
  FOR DELETE USING (user_id = public.get_app_user_id());


-- ════════════════════════════════════════════════════════════════════════════
-- 14. PUSH_SUBSCRIPTIONS
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions_select" ON public.push_subscriptions
  FOR SELECT USING (user_id = public.get_app_user_id());

CREATE POLICY "push_subscriptions_insert" ON public.push_subscriptions
  FOR INSERT WITH CHECK (user_id = public.get_app_user_id());

CREATE POLICY "push_subscriptions_update" ON public.push_subscriptions
  FOR UPDATE USING (user_id = public.get_app_user_id())
  WITH CHECK (user_id = public.get_app_user_id());

CREATE POLICY "push_subscriptions_delete" ON public.push_subscriptions
  FOR DELETE USING (user_id = public.get_app_user_id());


-- ════════════════════════════════════════════════════════════════════════════
-- 15. HOUSEHOLD_HEALTH_FLAGS
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.household_health_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household_health_flags_select" ON public.household_health_flags
  FOR SELECT USING (public.user_has_home_access(home_id));

CREATE POLICY "household_health_flags_insert" ON public.household_health_flags
  FOR INSERT WITH CHECK (public.user_has_home_access(home_id));

CREATE POLICY "household_health_flags_update" ON public.household_health_flags
  FOR UPDATE USING (public.user_has_home_access(home_id))
  WITH CHECK (public.user_has_home_access(home_id));

CREATE POLICY "household_health_flags_delete" ON public.household_health_flags
  FOR DELETE USING (public.user_has_home_access(home_id));


-- ════════════════════════════════════════════════════════════════════════════
-- 16. HOME_HEALTH_SCORES
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.home_health_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "home_health_scores_select" ON public.home_health_scores
  FOR SELECT USING (public.user_has_home_access(home_id));

-- Scores are calculated by the app, not inserted by users directly
CREATE POLICY "home_health_scores_insert" ON public.home_health_scores
  FOR INSERT WITH CHECK (public.user_has_home_access(home_id));

CREATE POLICY "home_health_scores_delete" ON public.home_health_scores
  FOR DELETE USING (public.user_has_home_access(home_id));


-- ════════════════════════════════════════════════════════════════════════════
-- Grant execute on helper functions to authenticated role
-- ════════════════════════════════════════════════════════════════════════════
GRANT EXECUTE ON FUNCTION public.get_app_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_home_access(uuid) TO authenticated;

-- Revoke all direct access from anon role (only authenticated users should access)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- Grant authenticated role access to tables (RLS will filter rows)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
