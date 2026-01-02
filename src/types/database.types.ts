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
      arrangements: {
        Row: {
          conductor: string | null
          created_at: string
          date: string
          grid_layout: Json | null
          grid_rows: number | null
          id: string
          image_url: string | null
          is_published: boolean
          service_info: string | null
          title: string
          updated_at: string
        }
        Insert: {
          conductor?: string | null
          created_at?: string
          date: string
          grid_layout?: Json | null
          grid_rows?: number | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          service_info?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          conductor?: string | null
          created_at?: string
          date?: string
          grid_layout?: Json | null
          grid_rows?: number | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          service_info?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendance_deadlines: {
        Row: {
          closed_at: string
          closed_by: string
          created_at: string
          date: string
          id: string
          part: Database["public"]["Enums"]["part"] | null
        }
        Insert: {
          closed_at?: string
          closed_by: string
          created_at?: string
          date: string
          id?: string
          part?: Database["public"]["Enums"]["part"] | null
        }
        Update: {
          closed_at?: string
          closed_by?: string
          created_at?: string
          date?: string
          id?: string
          part?: Database["public"]["Enums"]["part"] | null
        }
        Relationships: []
      }
      attendance_vote_deadlines: {
        Row: {
          created_at: string
          created_by: string | null
          deadline_at: string
          id: string
          service_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deadline_at: string
          id?: string
          service_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deadline_at?: string
          id?: string
          service_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendances: {
        Row: {
          created_at: string
          date: string
          id: string
          is_practice_attended: boolean
          is_service_available: boolean
          member_id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          is_practice_attended?: boolean
          is_service_available?: boolean
          member_id: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          is_practice_attended?: boolean
          is_service_available?: boolean
          member_id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendances_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendances_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_public"
            referencedColumns: ["id"]
          },
        ]
      }
      choir_events: {
        Row: {
          created_at: string | null
          date: string
          description: string | null
          end_time: string | null
          event_type: string
          id: string
          location: string | null
          start_time: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          description?: string | null
          end_time?: string | null
          event_type: string
          id?: string
          location?: string | null
          start_time?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          description?: string | null
          end_time?: string | null
          event_type?: string
          id?: string
          location?: string | null
          start_time?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          tags: string[] | null
          title: string
          updated_at: string
          uploaded_by: string | null
          year: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          tags?: string[] | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          year?: number | null
        }
        Relationships: []
      }
      member_seat_statistics: {
        Row: {
          col_consistency: number | null
          col_squared_sum: number | null
          col_sum: number | null
          created_at: string
          id: string
          is_fixed_seat: boolean | null
          last_arrangement_date: string | null
          member_id: string
          preferred_col: number | null
          preferred_row: number | null
          row_consistency: number | null
          row_counts: Json | null
          total_appearances: number | null
          updated_at: string
        }
        Insert: {
          col_consistency?: number | null
          col_squared_sum?: number | null
          col_sum?: number | null
          created_at?: string
          id?: string
          is_fixed_seat?: boolean | null
          last_arrangement_date?: string | null
          member_id: string
          preferred_col?: number | null
          preferred_row?: number | null
          row_consistency?: number | null
          row_counts?: Json | null
          total_appearances?: number | null
          updated_at?: string
        }
        Update: {
          col_consistency?: number | null
          col_squared_sum?: number | null
          col_sum?: number | null
          created_at?: string
          id?: string
          is_fixed_seat?: boolean | null
          last_arrangement_date?: string | null
          member_id?: string
          preferred_col?: number | null
          preferred_row?: number | null
          row_consistency?: number | null
          row_counts?: Json | null
          total_appearances?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_seat_statistics_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_seat_statistics_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members_public"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          conductor_notes_auth_tag: string | null
          conductor_notes_iv: string | null
          created_at: string
          email: string | null
          encrypted_conductor_notes: string | null
          id: string
          is_leader: boolean
          member_status: Database["public"]["Enums"]["member_status"]
          name: string
          notes: string | null
          part: Database["public"]["Enums"]["part"]
          phone_number: string | null
          updated_at: string
        }
        Insert: {
          conductor_notes_auth_tag?: string | null
          conductor_notes_iv?: string | null
          created_at?: string
          email?: string | null
          encrypted_conductor_notes?: string | null
          id?: string
          is_leader?: boolean
          member_status?: Database["public"]["Enums"]["member_status"]
          name: string
          notes?: string | null
          part: Database["public"]["Enums"]["part"]
          phone_number?: string | null
          updated_at?: string
        }
        Update: {
          conductor_notes_auth_tag?: string | null
          conductor_notes_iv?: string | null
          created_at?: string
          email?: string | null
          encrypted_conductor_notes?: string | null
          id?: string
          is_leader?: boolean
          member_status?: Database["public"]["Enums"]["member_status"]
          name?: string
          notes?: string | null
          part?: Database["public"]["Enums"]["part"]
          phone_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ml_arrangement_history: {
        Row: {
          arrangement_id: string
          created_at: string
          date: string
          grid_layout: Json
          id: string
          metrics: Json | null
          part_breakdown: Json
          quality_score: number | null
          service_type: string | null
          total_members: number
        }
        Insert: {
          arrangement_id: string
          created_at?: string
          date: string
          grid_layout: Json
          id?: string
          metrics?: Json | null
          part_breakdown: Json
          quality_score?: number | null
          service_type?: string | null
          total_members: number
        }
        Update: {
          arrangement_id?: string
          created_at?: string
          date?: string
          grid_layout?: Json
          id?: string
          metrics?: Json | null
          part_breakdown?: Json
          quality_score?: number | null
          service_type?: string | null
          total_members?: number
        }
        Relationships: [
          {
            foreignKeyName: "ml_arrangement_history_arrangement_id_fkey"
            columns: ["arrangement_id"]
            isOneToOne: true
            referencedRelation: "arrangements"
            referencedColumns: ["id"]
          },
        ]
      }
      row_distribution_patterns: {
        Row: {
          capacities: number[]
          id: string
          last_updated_at: string
          observations: number | null
          rows: number
          total_members: number
        }
        Insert: {
          capacities: number[]
          id?: string
          last_updated_at?: string
          observations?: number | null
          rows: number
          total_members: number
        }
        Update: {
          capacities?: number[]
          id?: string
          last_updated_at?: string
          observations?: number | null
          rows?: number
          total_members?: number
        }
        Relationships: []
      }
      seats: {
        Row: {
          arrangement_id: string
          created_at: string
          id: string
          is_row_leader: boolean | null
          member_id: string
          part: Database["public"]["Enums"]["part"]
          seat_column: number
          seat_row: number
        }
        Insert: {
          arrangement_id: string
          created_at?: string
          id?: string
          is_row_leader?: boolean | null
          member_id: string
          part: Database["public"]["Enums"]["part"]
          seat_column: number
          seat_row: number
        }
        Update: {
          arrangement_id?: string
          created_at?: string
          id?: string
          is_row_leader?: boolean | null
          member_id?: string
          part?: Database["public"]["Enums"]["part"]
          seat_column?: number
          seat_row?: number
        }
        Relationships: [
          {
            foreignKeyName: "seats_arrangement_id_fkey"
            columns: ["arrangement_id"]
            isOneToOne: false
            referencedRelation: "arrangements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seats_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seats_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members_public"
            referencedColumns: ["id"]
          },
        ]
      }
      service_schedules: {
        Row: {
          created_at: string | null
          date: string
          has_post_practice: boolean | null
          has_pre_practice: boolean | null
          hymn_name: string | null
          id: string
          notes: string | null
          offertory_performer: string | null
          post_practice_duration: number | null
          post_practice_location: string | null
          post_practice_start_time: string | null
          pre_practice_location: string | null
          pre_practice_minutes_before: number | null
          service_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          has_post_practice?: boolean | null
          has_pre_practice?: boolean | null
          hymn_name?: string | null
          id?: string
          notes?: string | null
          offertory_performer?: string | null
          post_practice_duration?: number | null
          post_practice_location?: string | null
          post_practice_start_time?: string | null
          pre_practice_location?: string | null
          pre_practice_minutes_before?: number | null
          service_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          has_post_practice?: boolean | null
          has_pre_practice?: boolean | null
          hymn_name?: string | null
          id?: string
          notes?: string | null
          offertory_performer?: string | null
          post_practice_duration?: number | null
          post_practice_location?: string | null
          post_practice_start_time?: string | null
          pre_practice_location?: string | null
          pre_practice_minutes_before?: number | null
          service_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          link_approved_at: string | null
          link_approved_by: string | null
          link_requested_at: string | null
          link_status: string | null
          linked_member_id: string | null
          name: string
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          link_approved_at?: string | null
          link_approved_by?: string | null
          link_requested_at?: string | null
          link_status?: string | null
          linked_member_id?: string | null
          name: string
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          link_approved_at?: string | null
          link_approved_by?: string | null
          link_requested_at?: string | null
          link_status?: string | null
          linked_member_id?: string | null
          name?: string
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_linked_member_id_fkey"
            columns: ["linked_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_linked_member_id_fkey"
            columns: ["linked_member_id"]
            isOneToOne: false
            referencedRelation: "members_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      members_public: {
        Row: {
          created_at: string | null
          email: string | null
          id: string | null
          is_leader: boolean | null
          member_status: Database["public"]["Enums"]["member_status"] | null
          name: string | null
          notes: string | null
          part: Database["public"]["Enums"]["part"] | null
          phone_number: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          is_leader?: boolean | null
          member_status?: Database["public"]["Enums"]["member_status"] | null
          name?: string | null
          notes?: string | null
          part?: Database["public"]["Enums"]["part"] | null
          phone_number?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          is_leader?: boolean | null
          member_status?: Database["public"]["Enums"]["member_status"] | null
          name?: string | null
          notes?: string | null
          part?: Database["public"]["Enums"]["part"] | null
          phone_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_all_document_tags: { Args: never; Returns: string[] }
      get_attendance_statistics: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: Json
      }
      get_attendance_summary_by_date: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          attendance_rate: number
          available_count: number
          date: string
          total_count: number
          unavailable_count: number
        }[]
      }
      get_linked_member_id: { Args: never; Returns: string }
      get_member_attendance_history: {
        Args: {
          p_end_date?: string
          p_member_id: string
          p_start_date?: string
        }
        Returns: {
          date: string
          is_available: boolean
          notes: string
        }[]
      }
      get_part_attendance_statistics: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          attendance_rate: number
          available_count: number
          part: string
          total_count: number
          unavailable_count: number
        }[]
      }
      get_upcoming_vote_deadlines: {
        Args: { limit_count?: number }
        Returns: {
          deadline_at: string
          is_passed: boolean
          service_date: string
        }[]
      }
      get_user_role: { Args: never; Returns: string }
      has_role: { Args: { required_roles: string[] }; Returns: boolean }
      is_member_linked: { Args: never; Returns: boolean }
      is_vote_deadline_passed: {
        Args: { target_date: string }
        Returns: boolean
      }
      recalculate_all_member_statistics: {
        Args: never
        Returns: {
          is_fixed_seat: boolean
          member_id: string
          total_appearances: number
        }[]
      }
      record_arrangement_to_ml_history: {
        Args: {
          p_arrangement_id: string
          p_metrics?: Json
          p_quality_score?: number
        }
        Returns: string
      }
    }
    Enums: {
      member_status: "REGULAR" | "NEW" | "ON_LEAVE" | "RESIGNED"
      part: "SOPRANO" | "ALTO" | "TENOR" | "BASS" | "SPECIAL"
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
      member_status: ["REGULAR", "NEW", "ON_LEAVE", "RESIGNED"],
      part: ["SOPRANO", "ALTO", "TENOR", "BASS", "SPECIAL"],
    },
  },
} as const
