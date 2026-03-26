import {
  doc,
  getDoc,
  getDocs,
  runTransaction,
  setDoc,
  collection,
} from "firebase/firestore";
import { getFirestoreInstance } from "./firebaseClient";
import type {
  AuctionMode,
  AuctionPhase,
  RoomDoc,
  Seat,
} from "./auctionTypes";
import { getPlayerById } from "@/data/playersFromCsv";

// NOTE: This file was introduced during MVP implementation.
// To keep the clone moving, we store `timerEndAtMs` and other timestamps as numbers (client time model).

function roomRef(roomCode: string) {
  return doc(getFirestoreInstance(), "rooms", roomCode);
}

function seatRef(roomCode: string, seatId: string) {
  return doc(getFirestoreInstance(), "rooms", roomCode, "seats", seatId);
}

function ratingsRef(roomCode: string, playerId: string) {
  return doc(getFirestoreInstance(), "rooms", roomCode, "ratings", playerId);
}

function computeCurrentStepBidLakhs(currentBidLakhs: number) {
  // Rough approximation of IPL bid-step ladder (rules say depends on current bid).
  // All values are in lakhs (1 = 1L INR).
  if (currentBidLakhs < 10) return 5;
  if (currentBidLakhs < 25) return 10;
  if (currentBidLakhs < 50) return 15;
  return 25;
}

export function getStepForBid(currentBidLakhs: number) {
  return computeCurrentStepBidLakhs(currentBidLakhs);
}

export async function createRoom(params: {
  roomCode: string;
  hostSeat: Seat;
  mode: AuctionMode;
  deckPlayerIds: string[];
  defaultTimerSeconds?: number; // default 10
  resetSeconds?: number; // default 5
}) {
  const {
    roomCode,
    hostSeat,
    mode,
    deckPlayerIds,
    defaultTimerSeconds = 10,
    resetSeconds = 5,
  } = params;

  const adminKey = hostSeat.seatId + "_" + Math.random().toString(36).slice(2, 10);

  await setDoc(roomRef(roomCode), {
    roomCode,
    hostSeatId: hostSeat.seatId,
    adminKey,
    mode,
    phase: "lobby",
    deckPlayerIds,
    currentDeckIndex: 0,

    highestBidLakhs:
      getPlayerById(deckPlayerIds[0] ?? "")?.basePriceLakhs ?? 0,
    highestBidderSeatId: null,
    timerEndAtMs: null,
    defaultTimerSeconds,
    resetSeconds,
    finalizedDeckIndex: -1,

    createdAtMs: Date.now(),
    startedAtMs: null,
    endedAtMs: null,
  });

  await setDoc(seatRef(roomCode, hostSeat.seatId), hostSeat);

  return { adminKey };
}

export async function joinRoomSeat(params: {
  roomCode: string;
  seat: Seat;
  maxSeats?: number; // default 10
}) {
  const { roomCode, seat, maxSeats = 10 } = params;
  const seatsCol = collection(getFirestoreInstance(), "rooms", roomCode, "seats");

  const seatsSnap = await getDocs(seatsCol);
  const seatCount = seatsSnap.size;
  if (seatCount >= maxSeats) {
    throw new Error("Room is full.");
  }

  const snap = await getDoc(seatRef(roomCode, seat.seatId));
  if (snap.exists()) return;

  await setDoc(seatRef(roomCode, seat.seatId), seat);
}

export async function startAuction(params: { roomCode: string; hostSeatId: string }) {
  const { roomCode, hostSeatId } = params;
  await runTransaction(getFirestoreInstance(), async (tx) => {
    const room = roomRef(roomCode);
    const roomSnap = await tx.get(room);
    if (!roomSnap.exists()) throw new Error("Room not found.");
    const data = roomSnap.data() as RoomDoc;
    if (data.hostSeatId !== hostSeatId) throw new Error("Only host can start.");
    if (data.phase !== "lobby") return;

    const now = Date.now();
    const firstPlayerId = data.deckPlayerIds[0] ?? "";
    const first = getPlayerById(firstPlayerId);
    tx.update(room, {
      phase: "bidding" satisfies AuctionPhase,
      startedAtMs: now,
      currentDeckIndex: 0,
      highestBidLakhs: first?.basePriceLakhs ?? 0,
      highestBidderSeatId: null,
      timerEndAtMs: now + data.defaultTimerSeconds * 1000,
      finalizedDeckIndex: -1,
    });
  });
}

export async function placeBid(params: {
  roomCode: string;
  seatId: string;
  bidLakhs: number;
}) {
  const { roomCode, seatId, bidLakhs } = params;

  await runTransaction(getFirestoreInstance(), async (tx) => {
    const room = roomRef(roomCode);
    const seat = seatRef(roomCode, seatId);
    const roomSnap = await tx.get(room);
    const seatSnap = await tx.get(seat);
    if (!roomSnap.exists()) throw new Error("Room not found.");
    if (!seatSnap.exists()) throw new Error("Seat not found.");

    const roomData = roomSnap.data() as RoomDoc;
    const seatData = seatSnap.data() as Seat;

    if (roomData.phase !== "bidding") throw new Error("Auction not active.");

    const now = Date.now();
    if (roomData.timerEndAtMs == null || now >= roomData.timerEndAtMs) {
      throw new Error("Timer expired.");
    }

    const step = computeCurrentStepBidLakhs(roomData.highestBidLakhs);
    const minAllowed = roomData.highestBidLakhs + step;
    if (bidLakhs < minAllowed) {
      throw new Error(`Bid too low. Min is ${minAllowed}L.`);
    }

    const remainingLakhs = seatData.totalBudgetLakhs - seatData.spentBudgetLakhs;
    if (bidLakhs > remainingLakhs) throw new Error("Not enough budget.");

    tx.update(room, {
      highestBidLakhs: bidLakhs,
      highestBidderSeatId: seatId,
      // Reset timer as per rules: when someone bids, timer resets by `resetSeconds`.
      timerEndAtMs: now + roomData.resetSeconds * 1000,
    });
  });
}

export async function finalizeCurrentPlayer(params: { roomCode: string }) {
  const { roomCode } = params;

  await runTransaction(getFirestoreInstance(), async (tx) => {
    const room = roomRef(roomCode);
    const roomSnap = await tx.get(room);
    if (!roomSnap.exists()) return;

    const roomData = roomSnap.data() as RoomDoc;
    if (roomData.phase !== "bidding") return;
    if (roomData.currentDeckIndex >= roomData.deckPlayerIds.length) return;

    if (roomData.timerEndAtMs == null) return;
    const now = Date.now();
    if (now < roomData.timerEndAtMs) return;

    // Finalize guard to avoid double-awarding within the same deck index.
    if (roomData.finalizedDeckIndex === roomData.currentDeckIndex) {
      return;
    }

    const currentPlayerId = roomData.deckPlayerIds[roomData.currentDeckIndex];
    const currentPlayer = getPlayerById(currentPlayerId);
    const winnerSeatId = roomData.highestBidderSeatId;
    const winnerBidLakhs = roomData.highestBidLakhs;

    if (!currentPlayer) return;

    if (winnerSeatId) {
      const winnerSeat = seatRef(roomCode, winnerSeatId);
      const winnerSnap = await tx.get(winnerSeat);
      if (!winnerSnap.exists()) throw new Error("Winner seat missing.");

      const winnerData = winnerSnap.data() as Seat;
      const remainingLakhs =
        winnerData.totalBudgetLakhs - winnerData.spentBudgetLakhs;

      if (winnerBidLakhs <= remainingLakhs) {
        const nextSquad = [...winnerData.squadPlayerIds, currentPlayerId];
        tx.update(winnerSeat, {
          spentBudgetLakhs: winnerData.spentBudgetLakhs + winnerBidLakhs,
          squadPlayerIds: nextSquad,
        });
      }
    }

    // Advance deck
    const nextIndex = roomData.currentDeckIndex + 1;
    if (nextIndex >= roomData.deckPlayerIds.length) {
      tx.update(room, {
        phase: "results" satisfies AuctionPhase,
        endedAtMs: now,
        finalizedDeckIndex: roomData.currentDeckIndex,
        currentDeckIndex: nextIndex,
        highestBidLakhs: 0,
        highestBidderSeatId: null,
        timerEndAtMs: null,
      });
      return;
    }

    const nextPlayerId = roomData.deckPlayerIds[nextIndex] ?? "";
    const nextPlayer = getPlayerById(nextPlayerId);
    if (!nextPlayer) return;
    tx.update(room, {
      finalizedDeckIndex: roomData.currentDeckIndex,
      currentDeckIndex: nextIndex,
      highestBidLakhs: nextPlayer.basePriceLakhs,
      highestBidderSeatId: null,
      timerEndAtMs: now + roomData.defaultTimerSeconds * 1000,
    });
  });
}

export async function setPlayerRating(params: {
  roomCode: string;
  hostSeatId: string;
  playerId: string;
  rating: number;
}) {
  const { roomCode, hostSeatId, playerId, rating } = params;
  const room = roomRef(roomCode);

  await runTransaction(getFirestoreInstance(), async (tx) => {
    const roomSnap = await tx.get(room);
    if (!roomSnap.exists()) throw new Error("Room not found.");
    const roomData = roomSnap.data() as RoomDoc;
    if (roomData.hostSeatId !== hostSeatId) throw new Error("Not allowed.");

    tx.set(ratingsRef(roomCode, playerId), {
      playerId,
      rating,
      updatedAtMs: Date.now(),
    });
  });
}

