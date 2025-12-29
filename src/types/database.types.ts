export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      arrangements: {
        Row: {
          conductor: string | null
          created_at: string
          date: string
          grid_layout: {
            rows: number
            rowCapacities: number[]
            zigzagPattern: 'even' | 'odd' | 'none'
          } | null
          grid_rows: number
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
          grid_layout?: {
            rows: number
            rowCapacities: number[]
            zigzagPattern: 'even' | 'odd' | 'none'
          } | null
          grid_rows?: number
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
          grid_layout?: {
            rows: number
            rowCapacities: number[]
            zigzagPattern: 'even' | 'odd' | 'none'
          } | null
          grid_rows?: number
          id?: string
          image_url?: string | null
          is_published?: boolean
          service_info?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendances: {
        Row: {
          created_at: string
          date: string
          id: string
          is_service_available: boolean
          is_practice_attended: boolean
          member_id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          is_service_available?: boolean
          is_practice_attended?: boolean
          member_id: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          is_service_available?: boolean
          is_practice_attended?: boolean
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
          }
        ]
      }
      attendance_deadlines: {
        Row: {
          id: string
          date: string
          part: Database['public']['Enums']['part'] | null
          closed_at: string
          closed_by: string
          created_at: string
        }
        Insert: {
          id?: string
          date: string
          part?: Database['public']['Enums']['part'] | null
          closed_at?: string
          closed_by: string
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          part?: Database['public']['Enums']['part'] | null
          closed_at?: string
          closed_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_deadlines_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
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
          member_status: Database['public']['Enums']['member_status']
          name: string
          notes: string | null
          part: Database['public']['Enums']['part']
          phone_number: string | null
          updated_at: string
          version: number
        }
        Insert: {
          conductor_notes_auth_tag?: string | null
          conductor_notes_iv?: string | null
          created_at?: string
          email?: string | null
          encrypted_conductor_notes?: string | null
          id?: string
          is_leader?: boolean
          member_status?: Database['public']['Enums']['member_status']
          name: string
          notes?: string | null
          part: Database['public']['Enums']['part']
          phone_number?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          conductor_notes_auth_tag?: string | null
          conductor_notes_iv?: string | null
          created_at?: string
          email?: string | null
          encrypted_conductor_notes?: string | null
          id?: string
          is_leader?: boolean
          member_status?: Database['public']['Enums']['member_status']
          name?: string
          notes?: string | null
          part?: Database['public']['Enums']['part']
          phone_number?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      seats: {
        Row: {
          arrangement_id: string
          created_at: string
          id: string
          member_id: string
          part: Database['public']['Enums']['part']
          seat_column: number
          seat_row: number
        }
        Insert: {
          arrangement_id: string
          created_at?: string
          id?: string
          member_id: string
          part: Database['public']['Enums']['part']
          seat_column: number
          seat_row: number
        }
        Update: {
          arrangement_id?: string
          created_at?: string
          id?: string
          member_id?: string
          part?: Database['public']['Enums']['part']
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
          }
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

// Helper types for convenience
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]
