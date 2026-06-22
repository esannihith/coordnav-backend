// Denormalized place snapshot captured at share time and stored on a PLACE
// message (Prisma `place Json?`). Immutable — no re-fetch needed to render the
// card or center the map.
export type PlaceSnapshot = {
  placeId: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
};

export type MessageSender = {
  id: string;
  name: string | null;
  picture: string | null;
};

// Canonical chat message shape — identical for REST history items and the
// socket `chat:new` broadcast. `sender` is embedded so a member who later
// leaves still has their old messages render without the live roster.
export type ChatMessage = {
  id: string;
  roomId: string;
  sender: MessageSender;
  kind: "TEXT" | "PLACE";
  text?: string;
  place?: PlaceSnapshot;
  createdAt: string;
};
