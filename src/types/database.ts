// Database types matching Supabase schema

export interface RSVP {
  id: string;
  full_name: string;
  phone: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface RSVPGuest {
  id: string;
  rsvp_id: string;
  name: string;
  phone: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      rsvps: {
        Row: RSVP;
        Insert: Omit<RSVP, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<RSVP, "id" | "created_at" | "updated_at">>;
      };
      rsvp_guests: {
        Row: RSVPGuest;
        Insert: Omit<RSVPGuest, "id" | "created_at">;
        Update: Partial<Omit<RSVPGuest, "id" | "created_at">>;
      };
    };
  };
}
