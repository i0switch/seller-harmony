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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          after_state: Json | null
          before_state: Json | null
          correlation_id: string | null
          created_at: string
          id: string
          reason: string | null
          target_id: string | null
          target_resource: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          after_state?: Json | null
          before_state?: Json | null
          correlation_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          target_id?: string | null
          target_resource?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          after_state?: Json | null
          before_state?: Json | null
          correlation_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          target_id?: string | null
          target_resource?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_identities: {
        Row: {
          access_token: string | null
          created_at: string
          discord_user_id: string
          discord_username: string | null
          id: string
          oauth_state: string | null
          oauth_state_created_at: string | null
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          discord_user_id: string
          discord_username?: string | null
          id?: string
          oauth_state?: string | null
          oauth_state_created_at?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          discord_user_id?: string
          discord_username?: string | null
          id?: string
          oauth_state?: string | null
          oauth_state_created_at?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discord_identities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_servers: {
        Row: {
          bot_installed: boolean
          bot_permission_status: Database["public"]["Enums"]["discord_bot_status"]
          created_at: string
          guild_id: string
          guild_name: string | null
          id: string
          seller_id: string
          updated_at: string
        }
        Insert: {
          bot_installed?: boolean
          bot_permission_status?: Database["public"]["Enums"]["discord_bot_status"]
          created_at?: string
          guild_id: string
          guild_name?: string | null
          id?: string
          seller_id: string
          updated_at?: string
        }
        Update: {
          bot_installed?: boolean
          bot_permission_status?: Database["public"]["Enums"]["discord_bot_status"]
          created_at?: string
          guild_id?: string
          guild_name?: string | null
          id?: string
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discord_servers_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          buyer_id: string
          created_at: string
          current_period_end: string | null
          dispute_status: string | null
          entitlement_ends_at: string | null
          final_payment_failure_at: string | null
          grace_period_ends_at: string | null
          grace_period_started_at: string | null
          id: string
          manual_override: boolean | null
          plan_id: string
          revoke_scheduled_at: string | null
          risk_flag: boolean
          seller_id: string
          status: Database["public"]["Enums"]["membership_status"]
          stripe_checkout_session_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          current_period_end?: string | null
          dispute_status?: string | null
          entitlement_ends_at?: string | null
          final_payment_failure_at?: string | null
          grace_period_ends_at?: string | null
          grace_period_started_at?: string | null
          id?: string
          manual_override?: boolean | null
          plan_id: string
          revoke_scheduled_at?: string | null
          risk_flag?: boolean
          seller_id: string
          status?: Database["public"]["Enums"]["membership_status"]
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          current_period_end?: string | null
          dispute_status?: string | null
          entitlement_ends_at?: string | null
          final_payment_failure_at?: string | null
          grace_period_ends_at?: string | null
          grace_period_started_at?: string | null
          id?: string
          manual_override?: boolean | null
          plan_id?: string
          revoke_scheduled_at?: string | null
          risk_flag?: boolean
          seller_id?: string
          status?: Database["public"]["Enums"]["membership_status"]
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          currency: string
          deleted_at: string | null
          description: string | null
          discord_role_id: string | null
          discord_server_id: string | null
          id: string
          interval: Database["public"]["Enums"]["plan_interval"]
          is_public: boolean
          name: string
          price: number
          seller_id: string
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          deleted_at?: string | null
          description?: string | null
          discord_role_id?: string | null
          discord_server_id?: string | null
          id?: string
          interval?: Database["public"]["Enums"]["plan_interval"]
          is_public?: boolean
          name: string
          price: number
          seller_id: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          deleted_at?: string | null
          description?: string | null
          discord_role_id?: string | null
          discord_server_id?: string | null
          id?: string
          interval?: Database["public"]["Enums"]["plan_interval"]
          is_public?: boolean
          name?: string
          price?: number
          seller_id?: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_discord_server_id_fkey"
            columns: ["discord_server_id"]
            isOneToOne: false
            referencedRelation: "discord_servers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      role_assignments: {
        Row: {
          actual_state: string
          created_at: string
          discord_user_id: string
          error_reason: string | null
          guild_id: string
          id: string
          last_synced_at: string
          membership_id: string
          role_id: string
          updated_at: string
        }
        Insert: {
          actual_state?: string
          created_at?: string
          discord_user_id: string
          error_reason?: string | null
          guild_id: string
          id?: string
          last_synced_at?: string
          membership_id: string
          role_id: string
          updated_at?: string
        }
        Update: {
          actual_state?: string
          created_at?: string
          discord_user_id?: string
          error_reason?: string | null
          guild_id?: string
          id?: string
          last_synced_at?: string
          membership_id?: string
          role_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_assignments_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: true
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_profiles: {
        Row: {
          created_at: string
          id: string
          platform_fee_rate_bps: number
          status: Database["public"]["Enums"]["seller_status"]
          store_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform_fee_rate_bps?: number
          status?: Database["public"]["Enums"]["seller_status"]
          store_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform_fee_rate_bps?: number
          status?: Database["public"]["Enums"]["seller_status"]
          store_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_connected_accounts: {
        Row: {
          account_type: string
          charges_enabled: boolean
          created_at: string
          details_submitted: boolean
          id: string
          last_synced_at: string
          payouts_enabled: boolean
          requirements_due: Json | null
          seller_id: string
          stripe_account_id: string
          updated_at: string
        }
        Insert: {
          account_type?: string
          charges_enabled?: boolean
          created_at?: string
          details_submitted?: boolean
          id?: string
          last_synced_at?: string
          payouts_enabled?: boolean
          requirements_due?: Json | null
          seller_id: string
          stripe_account_id: string
          updated_at?: string
        }
        Update: {
          account_type?: string
          charges_enabled?: boolean
          created_at?: string
          details_submitted?: boolean
          id?: string
          last_synced_at?: string
          payouts_enabled?: boolean
          requirements_due?: Json | null
          seller_id?: string
          stripe_account_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_connected_accounts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          job_id: string | null
          payload: Json
          processing_status: string
          seller_id: string | null
          stripe_event_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          job_id?: string | null
          payload: Json
          processing_status?: string
          seller_id?: string | null
          stripe_event_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          job_id?: string | null
          payload?: Json
          processing_status?: string
          seller_id?: string | null
          stripe_event_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_announcements: {
        Row: {
          body: string
          created_at: string
          ends_at: string | null
          id: string
          is_published: boolean
          severity: Database["public"]["Enums"]["announcement_severity"]
          starts_at: string | null
          status: Database["public"]["Enums"]["announcement_status"]
          target_scope: Database["public"]["Enums"]["announcement_target"]
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          ends_at?: string | null
          id?: string
          is_published?: boolean
          severity?: Database["public"]["Enums"]["announcement_severity"]
          starts_at?: string | null
          status?: Database["public"]["Enums"]["announcement_status"]
          target_scope?: Database["public"]["Enums"]["announcement_target"]
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          is_published?: boolean
          severity?: Database["public"]["Enums"]["announcement_severity"]
          starts_at?: string | null
          status?: Database["public"]["Enums"]["announcement_status"]
          target_scope?: Database["public"]["Enums"]["announcement_target"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      seller_memberships_public: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          plan_id: string
          seller_id: string
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_webhook_events_public: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          processing_status: string
          seller_id: string | null
          stripe_event_id: string
        }
        Relationships: []
      }
    }
    Functions: {
      expire_grace_period_memberships: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      announcement_severity: "info" | "warning" | "critical"
      announcement_status: "draft" | "published" | "ended"
      announcement_target: "all" | "active" | "trial" | "specific"
      discord_bot_status: "ok" | "insufficient" | "unknown"
      membership_status:
        | "pending_discord"
        | "active"
        | "grace_period"
        | "cancel_scheduled"
        | "payment_failed"
        | "canceled"
        | "expired"
        | "refunded"
      plan_interval: "month" | "year" | "one_time"
      seller_status: "draft" | "active" | "suspended"
      user_role: "platform_admin" | "seller" | "buyer"
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
      announcement_severity: ["info", "warning", "critical"],
      announcement_status: ["draft", "published", "ended"],
      announcement_target: ["all", "active", "trial", "specific"],
      discord_bot_status: ["ok", "insufficient", "unknown"],
      membership_status: [
        "pending_discord",
        "active",
        "grace_period",
        "cancel_scheduled",
        "payment_failed",
        "canceled",
        "expired",
        "refunded",
      ],
      plan_interval: ["month", "year", "one_time"],
      seller_status: ["draft", "active", "suspended"],
      user_role: ["platform_admin", "seller", "buyer"],
    },
  },
} as const
