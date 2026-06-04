export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          application_id: string | null
          application_name: string | null
          country: string | null
          created_at: string
          device_name: string | null
          hwid: string | null
          id: string
          ip: string | null
          license_key: string | null
          response_time_ms: number | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          application_id?: string | null
          application_name?: string | null
          country?: string | null
          created_at?: string
          device_name?: string | null
          hwid?: string | null
          id?: string
          ip?: string | null
          license_key?: string | null
          response_time_ms?: number | null
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          application_id?: string | null
          application_name?: string | null
          country?: string | null
          created_at?: string
          device_name?: string | null
          hwid?: string | null
          id?: string
          ip?: string | null
          license_key?: string | null
          response_time_ms?: number | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          created_at: string
          description: string | null
          id: string
          kill_switch: boolean
          name: string
          signature_required: boolean
          signing_secret: string | null
          suspended: boolean
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          kill_switch?: boolean
          name: string
          signature_required?: boolean
          signing_secret?: string | null
          suspended?: boolean
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          kill_switch?: boolean
          name?: string
          signature_required?: boolean
          signing_secret?: string | null
          suspended?: boolean
          tenant_id?: string
          user_id?: string
        }
        Relationships: []
      }
      blacklist: {
        Row: {
          created_at: string
          created_by: string
          id: string
          license_key: string | null
          reason: string | null
          tenant_id: string
          type: string
          value: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          license_key?: string | null
          reason?: string | null
          tenant_id: string
          type: string
          value: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          license_key?: string | null
          reason?: string | null
          tenant_id?: string
          type?: string
          value?: string
        }
        Relationships: []
      }
      license_ips: {
        Row: {
          first_seen: string
          id: string
          ip: string
          last_seen: string
          license_id: string
        }
        Insert: {
          first_seen?: string
          id?: string
          ip: string
          last_seen?: string
          license_id: string
        }
        Update: {
          first_seen?: string
          id?: string
          ip?: string
          last_seen?: string
          license_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "license_ips_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      licenses: {
        Row: {
          application_id: string
          banned: boolean
          banned_by_admin: boolean
          created_at: string
          created_by_reseller: string | null
          device_name: string | null
          expires_at: string
          hwid: string | null
          id: string
          ip: string | null
          last_used: string | null
          license_key: string
          notes: string | null
          owner_name: string | null
          status: string
          tags: string[] | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          application_id: string
          banned?: boolean
          banned_by_admin?: boolean
          created_at?: string
          created_by_reseller?: string | null
          device_name?: string | null
          expires_at: string
          hwid?: string | null
          id?: string
          ip?: string | null
          last_used?: string | null
          license_key: string
          notes?: string | null
          owner_name?: string | null
          status?: string
          tags?: string[] | null
          tenant_id: string
          user_id: string
        }
        Update: {
          application_id?: string
          banned?: boolean
          banned_by_admin?: boolean
          created_at?: string
          created_by_reseller?: string | null
          device_name?: string | null
          expires_at?: string
          hwid?: string | null
          id?: string
          ip?: string | null
          last_used?: string | null
          license_key?: string
          notes?: string | null
          owner_name?: string | null
          status?: string
          tags?: string[] | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "licenses_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licenses_created_by_reseller_fkey"
            columns: ["created_by_reseller"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_permissions: {
        Row: {
          can_ban_licenses: boolean
          can_create_apps: boolean
          can_create_licenses: boolean
          can_delete_apps: boolean
          can_edit_apps: boolean
          can_reset_hwid: boolean
          can_view_licenses: boolean
          created_at: string
          id: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_ban_licenses?: boolean
          can_create_apps?: boolean
          can_create_licenses?: boolean
          can_delete_apps?: boolean
          can_edit_apps?: boolean
          can_reset_hwid?: boolean
          can_view_licenses?: boolean
          created_at?: string
          id?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_ban_licenses?: boolean
          can_create_apps?: boolean
          can_create_licenses?: boolean
          can_delete_apps?: boolean
          can_edit_apps?: boolean
          can_reset_hwid?: boolean
          can_view_licenses?: boolean
          created_at?: string
          id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          banned: boolean
          banned_at: string | null
          banned_reason: string | null
          created_at: string
          email: string | null
          id: string
          role: string
          user_id: string
          username: string
        }
        Insert: {
          banned?: boolean
          banned_at?: string | null
          banned_reason?: string | null
          created_at?: string
          email?: string | null
          id?: string
          role?: string
          user_id: string
          username: string
        }
        Update: {
          banned?: boolean
          banned_at?: string | null
          banned_reason?: string | null
          created_at?: string
          email?: string | null
          id?: string
          role?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          attempt_count: number
          created_at: string
          endpoint: string
          id: string
          ip: string
          window_start: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          endpoint?: string
          id?: string
          ip: string
          window_start?: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          endpoint?: string
          id?: string
          ip?: string
          window_start?: string
        }
        Relationships: []
      }
      reseller_app_credits: {
        Row: {
          application_id: string
          created_at: string
          credits: number
          id: string
          reseller_id: string
          total_generated: number
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          credits?: number
          id?: string
          reseller_id: string
          total_generated?: number
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          credits?: number
          id?: string
          reseller_id?: string
          total_generated?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_app_credits_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_app_credits_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      resellers: {
        Row: {
          admin_id: string
          allowed_apps: string[] | null
          created_at: string
          credits: number
          email: string
          id: string
          tenant_id: string
          total_generated: number
          user_id: string | null
          username: string
        }
        Insert: {
          admin_id: string
          allowed_apps?: string[] | null
          created_at?: string
          credits?: number
          email: string
          id?: string
          tenant_id: string
          total_generated?: number
          user_id?: string | null
          username: string
        }
        Update: {
          admin_id?: string
          allowed_apps?: string[] | null
          created_at?: string
          credits?: number
          email?: string
          id?: string
          tenant_id?: string
          total_generated?: number
          user_id?: string | null
          username?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          id: string
          key: string
          tenant_id: string
          updated_at: string
          user_id: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          tenant_id: string
          updated_at?: string
          user_id: string
          value?: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
          value?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          billing_cycle: string
          created_at: string
          id: string
          name: string
          owner_user_id: string
          plan: string
          plan_expires_at: string | null
          plan_started_at: string
          suspended: boolean
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          id?: string
          name: string
          owner_user_id: string
          plan?: string
          plan_expires_at?: string | null
          plan_started_at?: string
          suspended?: boolean
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string
          plan?: string
          plan_expires_at?: string | null
          plan_started_at?: string
          suspended?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_tenant_member: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "reseller" | "manager" | "seller"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "reseller", "manager", "seller"],
    },
  },
} as const
