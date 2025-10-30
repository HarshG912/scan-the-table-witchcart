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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      orders: {
        Row: {
          accepted_at: string | null
          bill_downloaded: boolean | null
          bill_url: string | null
          completed_at: string | null
          cook_name: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          items_json: string
          last_updated_at: string | null
          last_updated_by: string | null
          notes: string | null
          order_id: string
          paid_at: string | null
          payment_claimed: boolean | null
          payment_mode: string | null
          payment_status: string
          qr_url: string | null
          service_charge: number | null
          service_charge_amount: number | null
          status: string
          subtotal: number | null
          table_id: string
          total: number
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          bill_downloaded?: boolean | null
          bill_url?: string | null
          completed_at?: string | null
          cook_name?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          items_json: string
          last_updated_at?: string | null
          last_updated_by?: string | null
          notes?: string | null
          order_id: string
          paid_at?: string | null
          payment_claimed?: boolean | null
          payment_mode?: string | null
          payment_status?: string
          qr_url?: string | null
          service_charge?: number | null
          service_charge_amount?: number | null
          status?: string
          subtotal?: number | null
          table_id: string
          total: number
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          bill_downloaded?: boolean | null
          bill_url?: string | null
          completed_at?: string | null
          cook_name?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          items_json?: string
          last_updated_at?: string | null
          last_updated_by?: string | null
          notes?: string | null
          order_id?: string
          paid_at?: string | null
          payment_claimed?: boolean | null
          payment_mode?: string | null
          payment_status?: string
          qr_url?: string | null
          service_charge?: number | null
          service_charge_amount?: number | null
          status?: string
          subtotal?: number | null
          table_id?: string
          total?: number
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string | null
          id: string
          login_type: string
          menu_sheet_url: string | null
          merchant_upi_id: string
          payment_modes: Json
          restaurant_address: string | null
          restaurant_name: string
          service_charge: number
          table_count: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          login_type?: string
          menu_sheet_url?: string | null
          merchant_upi_id?: string
          payment_modes?: Json
          restaurant_address?: string | null
          restaurant_name?: string
          service_charge?: number
          table_count?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          login_type?: string
          menu_sheet_url?: string | null
          merchant_upi_id?: string
          payment_modes?: Json
          restaurant_address?: string | null
          restaurant_name?: string
          service_charge?: number
          table_count?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_settings: {
        Row: {
          menu_sheet_url: string | null
          payment_modes: Json | null
          restaurant_address: string | null
          restaurant_name: string | null
          service_charge: number | null
          table_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_order_id: { Args: never; Returns: string }
      get_orders_by_table: {
        Args: { p_table_id: string }
        Returns: {
          bill_downloaded: boolean
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          id: string
          items_json: string
          last_updated_at: string
          last_updated_by: string
          notes: string
          order_id: string
          paid_at: string
          payment_claimed: boolean
          payment_status: string
          qr_url: string
          service_charge: number
          service_charge_amount: number
          status: string
          subtotal: number
          table_id: string
          total: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "cook" | "chef" | "waiter" | "manager"
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
      app_role: ["admin", "cook", "chef", "waiter", "manager"],
    },
  },
} as const
