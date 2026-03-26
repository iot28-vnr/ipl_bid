export type AuctionMode = "mock" | "mega";

export type AuctionPhase = "lobby" | "bidding" | "results" | "ended";

export type TeamId =
  | "CSK"
  | "MI"
  | "GT"
  | "KKR"
  | "LSG"
  | "RCB"
  | "RR"
  | "DC"
  | "SRH"
  | "PBKS";

export type AuctionPlayer = {
  id: string;
  name: string;
  role: "BAT" | "BOWL" | "ALL" | "WK" | "AR";
  overseas: boolean;
  basePriceLakhs: number;
};

export type Seat = {
  seatId: string;
  name: string;
  team: TeamId;
  totalBudgetLakhs: number; // stored in lakhs (1 = 1L INR)
  spentBudgetLakhs: number;
  squadPlayerIds: string[]; // won players by id
  createdAtMs: number;
};

export type RoomDoc = {
  roomCode: string;
  hostSeatId: string;
  adminKey: string;
  mode: AuctionMode;
  phase: AuctionPhase;

  // Auction deck and progress
  // Store only player IDs to keep room documents small.
  deckPlayerIds: string[];
  currentDeckIndex: number;

  // Bidding
  highestBidLakhs: number;
  highestBidderSeatId: string | null;
  timerEndAtMs: number | null; // client-side time model for MVP
  defaultTimerSeconds: number;
  resetSeconds: number;

  // Win/finalize guard
  finalizedDeckIndex: number; // -1 when not finalized yet

  createdAtMs: number;
  startedAtMs: number | null;
  endedAtMs: number | null;
};

export type PlayerRating = {
  playerId: string;
  rating: number; // admin-defined scoring
  updatedAtMs: number;
};

