

## Plan: Add Manager Role to License System

### Overview
Add a new "manager" role that admins can assign to any user. Managers get full visibility but limited access — specifically they can manage applications (create, edit, delete) but cannot access resellers, settings, or other admin-only features.

### Database Changes

1. **Extend the `app_role` enum** to include `'manager'`:
   ```sql
   ALTER TYPE public.app_role ADD VALUE 'manager';
   ```

2. **Add RLS policies for manager access** on `applications` table:
   - Managers can SELECT, INSERT, UPDATE, DELETE on `applications` (using `has_role(auth.uid(), 'manager')`)

3. **Add RLS policies for manager on `activity_logs`** (read-only):
   - Managers can SELECT all logs

4. **Add RLS policy for manager on `licenses`** (read-only):
   - Managers can SELECT all licenses

### Auth & Routing Changes

5. **Update `AuthContext.tsx`**: Add `"manager"` to the `UserRole` type.

6. **Update `ProtectedRoute.tsx`**: Handle the manager role in redirect logic — managers go to `/manager` by default.

7. **Update `Login.tsx`**: Add manager redirect logic alongside admin/reseller.

8. **Update `App.tsx`**: Add manager routes:
   - `/manager` — Manager Dashboard (read-only stats view)
   - `/manager/apps` — Applications page (full CRUD)
   - `/manager/licenses` — Licenses page (read-only view)
   - `/manager/logs` — Logs page (read-only view)

### New Components & Pages

9. **Create `ManagerDashboard.tsx`**: Simplified dashboard showing stats (total apps, licenses, active/expired counts) — similar to admin dashboard but without reseller stats.

10. **Create `ManagerLayout.tsx` + `ManagerSidebar.tsx`**: Manager-specific navigation with only: Dashboard, Applications, Licenses (view), Logs (view).

11. **Create `ManagerLicenses.tsx`**: Read-only license list (no ban/unban/delete actions).

12. **Create `ManagerLogs.tsx`**: Read-only activity logs view.

### Admin UI for Assigning Manager Role

13. **Add "Managers" page for admin** (`/managers`): Admin can create manager accounts (similar to reseller creation flow using an edge function) and view/delete existing managers.

14. **Create `create-manager` edge function**: Similar to `create-reseller` — admin-only, creates auth user + assigns manager role.

15. **Update admin sidebar** (`DashboardSidebar.tsx`): Add "Managers" nav item.

### Files to Create
- `src/pages/ManagerDashboard.tsx`
- `src/pages/ManagerLicenses.tsx`
- `src/pages/ManagerLogs.tsx`
- `src/pages/ManagerApps.tsx` (reuses Applications logic)
- `src/pages/Managers.tsx` (admin page)
- `src/components/ManagerLayout.tsx`
- `src/components/ManagerSidebar.tsx`
- `supabase/functions/create-manager/index.ts`

### Files to Edit
- `src/contexts/AuthContext.tsx` — add manager to type
- `src/components/ProtectedRoute.tsx` — handle manager redirects
- `src/pages/Login.tsx` — manager redirect
- `src/App.tsx` — add manager + admin routes
- `src/components/DashboardSidebar.tsx` — add Managers nav link
- 1 migration for enum + RLS policies

