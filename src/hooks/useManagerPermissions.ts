import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ManagerPermissions {
  can_create_apps: boolean;
  can_edit_apps: boolean;
  can_delete_apps: boolean;
  can_view_licenses: boolean;
  can_create_licenses: boolean;
  can_ban_licenses: boolean;
  can_reset_hwid: boolean;
}

const DEFAULT_PERMISSIONS: ManagerPermissions = {
  can_create_apps: true,
  can_edit_apps: true,
  can_delete_apps: true,
  can_view_licenses: true,
  can_create_licenses: false,
  can_ban_licenses: false,
  can_reset_hwid: false,
};

export function useManagerPermissions() {
  const { user, role } = useAuth();
  const [permissions, setPermissions] = useState<ManagerPermissions>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || role !== "manager") {
      setLoading(false);
      return;
    }

    supabase
      .from("manager_permissions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPermissions({
            can_create_apps: data.can_create_apps,
            can_edit_apps: data.can_edit_apps,
            can_delete_apps: data.can_delete_apps,
            can_view_licenses: data.can_view_licenses,
            can_create_licenses: data.can_create_licenses,
            can_ban_licenses: data.can_ban_licenses,
            can_reset_hwid: data.can_reset_hwid,
          });
        }
        setLoading(false);
      });
  }, [user, role]);

  return { permissions, loading };
}
