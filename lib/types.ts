// Database type definitions — mirrors the PRD data model.
// TODO: replace with auto-generated types from `supabase gen types typescript`

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type PaymentMethod = 'zeffy' | 'venmo' | 'cash' | 'square' | 'other'
export type PaymentStatus = 'paid' | 'unpaid' | 'partial'
export type ContestType = 'none' | 'closest_to_pin' | 'long_drive' | 'hole_in_one'
export type SponsorTier = 'eagle' | 'birdie' | 'par'
export type PurchaseChannel = 'signup' | 'check_in' | 'during_round'

export interface Database {
  public: {
    Tables: {
      // ── Event ──────────────────────────────────────────────
      event: {
        Row: {
          id: string
          name: string
          date: string
          course: string
          format: string
          hole_count: number
          registration_fee: number
          greens_fee_cost: number
          shotgun_time: string | null
          schedule: Json | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['event']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['event']['Insert']>
      }

      // ── Hole ───────────────────────────────────────────────
      hole: {
        Row: {
          id: string
          event_id: string
          number: number
          par: number
          contest_type: ContestType
          hole_sponsor_id: string | null
        }
        Insert: Omit<Database['public']['Tables']['hole']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['hole']['Insert']>
      }

      // ── Group (foursome) ───────────────────────────────────
      group: {
        Row: {
          id: string
          event_id: string
          number: number
          starting_hole: number
        }
        Insert: Omit<Database['public']['Tables']['group']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['group']['Insert']>
      }

      // ── Team ──────────────────────────────────────────────
      team: {
        Row: {
          id: string
          event_id: string
          name: string
          pin: string
          group_id: string | null
          registration_id: string | null
          payment_status: PaymentStatus
          checked_in: boolean
          single_golfer: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['team']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['team']['Insert']>
      }

      // ── Player ────────────────────────────────────────────
      player: {
        Row: {
          id: string
          team_id: string
          name: string
          email: string
          phone: string | null
          shirt_size: string | null
          dietary_notes: string | null
          arrived: boolean
        }
        Insert: Omit<Database['public']['Tables']['player']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['player']['Insert']>
      }

      // ── Registration ──────────────────────────────────────
      registration: {
        Row: {
          id: string
          team_id: string
          fee_amount: number
          payment_method: PaymentMethod | null
          payment_status: PaymentStatus
          registered_at: string
        }
        Insert: Omit<Database['public']['Tables']['registration']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['registration']['Insert']>
      }

      // ── Sponsor ───────────────────────────────────────────
      sponsor: {
        Row: {
          id: string
          event_id: string
          name: string
          tier: SponsorTier
          amount: number
          logo_url: string | null
          website: string | null
          hole_id: string | null
        }
        Insert: Omit<Database['public']['Tables']['sponsor']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['sponsor']['Insert']>
      }

      // ── Donor ─────────────────────────────────────────────
      donor: {
        Row: {
          id: string
          event_id: string
          name: string
          donated_item: string
          estimated_value: number
          logo_url: string | null
          use: 'raffle' | 'prize'
        }
        Insert: Omit<Database['public']['Tables']['donor']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['donor']['Insert']>
      }

      // ── Catalog Item ──────────────────────────────────────
      catalog_item: {
        Row: {
          id: string
          event_id: string
          name: string
          price: number
          unit: 'each' | 'bundle'
          channels: PurchaseChannel[]
          active: boolean
          description: string | null
        }
        Insert: Omit<Database['public']['Tables']['catalog_item']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['catalog_item']['Insert']>
      }

      // ── Purchase ──────────────────────────────────────────
      purchase: {
        Row: {
          id: string
          catalog_item_id: string
          team_id: string | null
          player_id: string | null
          quantity: number
          amount: number
          paid_status: PaymentStatus
          payment_method: PaymentMethod | null
          channel: PurchaseChannel
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['purchase']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['purchase']['Insert']>
      }

      // ── Mulligan ──────────────────────────────────────────
      mulligan: {
        Row: {
          id: string
          team_id: string
          hole_number: number
          count: number  // 0–2
        }
        Insert: Omit<Database['public']['Tables']['mulligan']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['mulligan']['Insert']>
      }

      // ── Score ─────────────────────────────────────────────
      score: {
        Row: {
          id: string
          team_id: string
          hole_number: number
          strokes: number
        }
        Insert: Omit<Database['public']['Tables']['score']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['score']['Insert']>
      }

      // ── Expense ───────────────────────────────────────────
      expense: {
        Row: {
          id: string
          event_id: string
          description: string
          amount: number
          category: 'greens_fees' | 'other'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['expense']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['expense']['Insert']>
      }

      // ── Announcement ──────────────────────────────────────
      announcement: {
        Row: {
          id: string
          event_id: string
          message: string
          pinned: boolean
          posted_at: string
        }
        Insert: Omit<Database['public']['Tables']['announcement']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['announcement']['Insert']>
      }
    }
  }
}

// ── Convenience row types ─────────────────────────────────────
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TeamRow       = Tables<'team'>
export type PlayerRow     = Tables<'player'>
export type SponsorRow    = Tables<'sponsor'>
export type HoleRow       = Tables<'hole'>
export type ScoreRow      = Tables<'score'>
export type MulliganRow   = Tables<'mulligan'>
export type PurchaseRow   = Tables<'purchase'>
export type CatalogRow    = Tables<'catalog_item'>
export type AnnouncementRow = Tables<'announcement'>

// ── Composite types used in the UI ───────────────────────────
export interface TeamWithPlayers extends TeamRow {
  players: PlayerRow[]
  group: { starting_hole: number; number: number } | null
}

export interface LeaderboardEntry {
  rank: number
  teamId: string
  teamName: string
  totalStrokes: number
  toPar: number
  thru: number
  isYourTeam: boolean
}
