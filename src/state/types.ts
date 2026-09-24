export type RoomId = "deluxe" | "executive-suite" | "presidential-suite";

export interface RoomMedia {
  day_overview: string;
  night_overview: string;
  bathroom_detail: string;
  balcony_detail?: string;
}

export interface Room {
  id: RoomId;
  name: string;
  room_number: string;
  price_per_night: number;
  currency: "NGN";
  capacity: number;
  features: string[];
  has_balcony: boolean;
  has_bathtub: boolean;
  quiet_tier: "Standard" | "High" | "Maximum";
  description: string;
  media: RoomMedia;
}

export interface AccessCredential {
  token: string;
  issued_at: string;
  disclaimer: string;
}

export interface Booking {
  booking_id: string;
  room_id: RoomId;
  room_name: string;
  room_number: string;
  guest_name: string;
  nights: number;
  price_per_night: number;
  total_price: number;
  currency: "NGN";
  status: "CONFIRMED";
  created_at: string;
  access_credential: AccessCredential;
}

export type PrimaryState =
  | "IDLE"
  | "LISTENING"
  | "UNDERSTANDING"
  | "VISUAL_TRANSITION"
  | "RESPONDING"
  | "EXPLORING"
  | "BOOKING"
  | "KEY_ISSUED";

export type AmbianceMode = "day" | "night";
export type FeatureFocus = "overview" | "bathroom" | "balcony";

export interface AppNotification {
  id: string;
  message: string;
  level: "info" | "error";
  timestamp: number;
}

export type UIAction =
  | { type: "FOCUS_ROOM"; payload: { roomId: RoomId } }
  | { type: "SHOW_FEATURE"; payload: { roomId?: RoomId; feature: FeatureFocus } }
  | { type: "CHANGE_AMBIANCE"; payload: { mode: AmbianceMode } }
  | { type: "SHOW_BOOKING_SUMMARY"; payload: { bookingId: string } }
  | { type: "REVEAL_KEY"; payload: { booking: Booking } }
  | { type: "DISPLAY_NOTIFICATION"; payload: { message: string; level: "info" | "error" } };
