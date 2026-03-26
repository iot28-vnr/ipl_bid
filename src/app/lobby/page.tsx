"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { getFirestoreInstance } from "@/lib/firebaseClient";
import type { AuctionMode, Seat, TeamId } from "@/lib/auctionTypes";
import { createRoom, joinRoomSeat, startAuction } from "@/lib/roomsApi";
import { generateRoomCode } from "@/lib/roomCode";
import { useLocalStorageState } from "@/lib/useLocalStorage";
import { formatLakhsCompact } from "@/lib/money";
import { CSV_PLAYERS } from "@/data/playersFromCsv";

const TEAMS: TeamId[] = ["CSK", "MI", "GT", "KKR", "LSG", "RCB", "RR", "DC", "SRH", "PBKS"];

function budgetForMode(mode: AuctionMode) {
  // Simplified MVP budget mapping. Stored in lakhs.
  // Mega auction uses full ₹120 Cr purse = 12000 L.
  if (mode === "mega") return 12000;
  // Mock/Mini would normally be smaller depending on retentions.
  return 12000;
}

function getErrorMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  return "Something went wrong.";
}

export default function LobbyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialName = searchParams.get("name") ?? "";
  const initialTeam = (searchParams.get("team") ?? "") as TeamId;

  const { value: storedSeat, setValue: setStoredSeat } = useLocalStorageState<Seat | null>(
    "auction-seat",
    null
  );

  const [name, setName] = useState(initialName);
  const [team, setTeam] = useState<TeamId>(
    TEAMS.includes(initialTeam) ? initialTeam : "CSK"
  );
  const [mode, setMode] = useState<AuctionMode>("mock");
  const [roomCode, setRoomCode] = useState("");

  const [rooms, setRooms] = useState<Array<{ roomCode: string; createdAtMs: number }>>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const db = getFirestoreInstance();
    const q = query(
      collection(db, "rooms"),
      where("phase", "==", "lobby"),
      orderBy("createdAtMs", "desc"),
      limit(8)
    );

    const unsub = onSnapshot(q, (snap) => {
      const next: Array<{ roomCode: string; createdAtMs: number }> = [];
      snap.forEach((doc) => {
        const d = doc.data() as { createdAtMs?: number };
        next.push({
          roomCode: doc.id,
          createdAtMs: d.createdAtMs ?? 0,
        });
      });
      setRooms(next);
    });

    return () => unsub();
  }, []);

  async function onCreateRoom() {
    setStatus(null);
    try {
      if (!name.trim()) throw new Error("Enter your name.");

      const code = generateRoomCode(6);
      const seatId = storedSeat?.seatId ?? crypto.randomUUID();
      const seat: Seat = {
        seatId,
        name: name.trim(),
        team,
        totalBudgetLakhs: budgetForMode(mode),
        spentBudgetLakhs: 0,
        squadPlayerIds: [],
        createdAtMs: Date.now(),
      };
      setStoredSeat(seat);

      const MOCK_DECK_SIZE = 350;
      const MEGA_DECK_SIZE = 230;
      const deckPlayerIds = (mode === "mega"
        ? CSV_PLAYERS.slice(0, MEGA_DECK_SIZE)
        : CSV_PLAYERS.slice(0, MOCK_DECK_SIZE)
      ).map((p) => p.id);

      await createRoom({
        roomCode: code,
        hostSeat: seat,
        mode,
        deckPlayerIds,
      });

      router.push(`/room/${code}`);
    } catch (e: unknown) {
      setStatus(getErrorMessage(e));
    }
  }

  async function onJoinRoom() {
    setStatus(null);
    try {
      if (!name.trim()) throw new Error("Enter your name.");
      if (!roomCode.trim()) throw new Error("Enter a room code.");

      const code = roomCode.trim().toUpperCase();
      const seatId = storedSeat?.seatId ?? crypto.randomUUID();
      const seat: Seat = {
        seatId,
        name: name.trim(),
        team,
        totalBudgetLakhs: budgetForMode(mode),
        spentBudgetLakhs: 0,
        squadPlayerIds: [],
        createdAtMs: Date.now(),
      };
      setStoredSeat(seat);

      await joinRoomSeat({ roomCode: code, seat });
      router.push(`/room/${code}`);
    } catch (e: unknown) {
      setStatus(getErrorMessage(e));
    }
  }

  async function onHostStartIfReady(roomCodeToStart: string) {
    if (!storedSeat?.seatId) return;
    try {
      await startAuction({ roomCode: roomCodeToStart, hostSeatId: storedSeat.seatId });
      router.push(`/room/${roomCodeToStart}`);
    } catch (e: unknown) {
      setStatus(getErrorMessage(e));
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="w-full lg:max-w-lg">
          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-black/30">
            <h1 className="text-2xl font-bold">Join the Auction</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              Create private rooms and play live bidding with friends.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-semibold">Your Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/20 dark:border-white/10 dark:bg-black/20"
                  placeholder="e.g. Rohan"
                />
              </div>

              <div>
                <label className="text-sm font-semibold">Choose Your Team</label>
                <select
                  value={team}
                  onChange={(e) => setTeam(e.target.value as TeamId)}
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/20 dark:border-white/10 dark:bg-black/20"
                >
                  {TEAMS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold">Auction Mode</label>
                <div className="mt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setMode("mock")}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                      mode === "mock"
                        ? "border-black/20 bg-zinc-950 text-white"
                        : "border-black/10 bg-white text-zinc-800 hover:bg-zinc-50 dark:bg-black/20 dark:text-zinc-100 dark:hover:bg-black/10"
                    }`}
                  >
                    2026 Mock Auction
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("mega")}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                      mode === "mega"
                        ? "border-black/20 bg-zinc-950 text-white"
                        : "border-black/10 bg-white text-zinc-800 hover:bg-zinc-50 dark:bg-black/20 dark:text-zinc-100 dark:hover:bg-black/10"
                    }`}
                  >
                    Mega Auction
                  </button>
                </div>
                <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Budget: {formatLakhsCompact(budgetForMode(mode))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onCreateRoom}
                  className="flex-1 rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  Create Room
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/how-to-play")}
                  className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold transition hover:bg-zinc-50 dark:border-white/10 dark:bg-black/20 dark:hover:bg-black/10"
                >
                  Guide
                </button>
              </div>

              <div className="pt-4">
                <div className="text-sm font-semibold">Join a Room</div>
                <div className="mt-2 flex gap-3">
                  <input
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/20 dark:border-white/10 dark:bg-black/20"
                    placeholder="Enter room code"
                  />
                  <button
                    type="button"
                    onClick={onJoinRoom}
                    className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
                  >
                    Join
                  </button>
                </div>
              </div>

              {status ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                  {status}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-6 text-xs text-zinc-500 dark:text-zinc-400">
            No signup required. Your seat is stored locally on this device.
          </div>
        </div>

        <div className="w-full lg:flex-1">
          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-black/30">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold">Browse Live Auction Rooms</h2>
              <Link href="/room/___" className="hidden">
                placeholder
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {rooms.length === 0 ? (
                <div className="text-sm text-zinc-600 dark:text-zinc-300">
                  No live rooms right now.
                </div>
              ) : (
                rooms.map((r) => (
                  <div
                    key={r.roomCode}
                    className="flex items-center justify-between rounded-xl border border-black/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-black/20"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">
                        Room {r.roomCode}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        Lobby phase
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm font-semibold transition hover:bg-zinc-50 dark:border-white/10 dark:bg-black/10 dark:hover:bg-black/5"
                        onClick={() => {
                          setRoomCode(r.roomCode);
                          onJoinRoom();
                        }}
                      >
                        Join
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-zinc-950 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
                        onClick={() => onHostStartIfReady(r.roomCode)}
                      >
                        Start
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 text-xs text-zinc-500 dark:text-zinc-400">
              Hosts can press “Start” to begin bidding.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

