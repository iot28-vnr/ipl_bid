"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { getFirestoreInstance } from "@/lib/firebaseClient";
import type { AuctionPlayer, AuctionPhase, RoomDoc, Seat } from "@/lib/auctionTypes";
import { finalizeCurrentPlayer, getStepForBid, placeBid, setPlayerRating } from "@/lib/roomsApi";
import { useLocalStorageState } from "@/lib/useLocalStorage";
import { formatLakhsCompact } from "@/lib/money";
import { getPlayerById } from "@/data/playersFromCsv";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getErrorMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  return "Something went wrong.";
}

export default function RoomPage() {
  const params = useParams<{ roomCode: string }>();
  const router = useRouter();
  const code = String(params.roomCode ?? "").toUpperCase();

  const {
    value: storedSeat,
    hydrated,
  } = useLocalStorageState<Seat | null>("auction-seat", null);

  const mySeatId = storedSeat?.seatId ?? null;

  const [room, setRoom] = useState<RoomDoc | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});

  // For bid input
  const [bidInput, setBidInput] = useState<string>("");
  const [bidBusy, setBidBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const lastFinalizeAttemptMs = useRef<number>(0);

  // Subscribe to room doc
  useEffect(() => {
    if (!code) return;

    const roomDocRef = doc(getFirestoreInstance(), "rooms", code);
    const unsub = onSnapshot(roomDocRef, (snap) => {
      if (!snap.exists()) {
        setRoom(null);
        return;
      }
      setRoom(snap.data() as RoomDoc);
    });

    return () => unsub();
  }, [code]);

  // Subscribe to seats
  useEffect(() => {
    if (!code) return;

    const seatsCol = collection(getFirestoreInstance(), "rooms", code, "seats");
    const q = query(seatsCol, orderBy("createdAtMs", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const next: Seat[] = [];
      snap.forEach((d) => next.push(d.data() as Seat));
      setSeats(next);
    });
    return () => unsub();
  }, [code]);

  // Subscribe to ratings (only used in results)
  useEffect(() => {
    if (!code) return;

    const ratingsCol = collection(getFirestoreInstance(), "rooms", code, "ratings");
    const unsub = onSnapshot(ratingsCol, (snap) => {
      const next: Record<string, number> = {};
      snap.forEach((d) => {
        const data = d.data() as { rating?: unknown; playerId?: string };
        if (typeof data.rating === "number" && typeof data.playerId === "string") {
          next[data.playerId] = data.rating;
        }
      });
      setRatings(next);
    });
    return () => unsub();
  }, [code]);

  const currentPlayer: AuctionPlayer | null = useMemo(() => {
    if (!room) return null;
    const idx = room.currentDeckIndex;
    const playerId = room.deckPlayerIds[idx];
    return playerId ? getPlayerById(playerId) ?? null : null;
  }, [room]);

  const phase: AuctionPhase | null = room?.phase ?? null;

  const mySeat: Seat | null = useMemo(() => {
    if (!mySeatId) return null;
    return seats.find((s) => s.seatId === mySeatId) ?? null;
  }, [seats, mySeatId]);

  // Host-only auto-finalization (reduces duplicate transactions).
  useEffect(() => {
    if (!room) return;
    if (room.phase !== "bidding") return;
    if (!mySeatId) return;
    if (room.hostSeatId !== mySeatId) return;
    if (room.timerEndAtMs == null) return;
    const timerEndAtMs = room.timerEndAtMs;

    const interval = window.setInterval(() => {
      const now = Date.now();
      if (now < timerEndAtMs) return;

      // Throttle attempts to avoid rapid repeats.
      if (now - lastFinalizeAttemptMs.current < 800) return;
      lastFinalizeAttemptMs.current = now;

      // Fire-and-forget. Transaction guard handles duplicates.
      void finalizeCurrentPlayer({ roomCode: code });
    }, 500);

    return () => window.clearInterval(interval);
  }, [room, mySeatId, code]);

  const highestBid = room?.highestBidLakhs ?? 0;
  const timerRemainingSec = useMemo(() => {
    if (!room?.timerEndAtMs) return 0;
    return Math.max(0, Math.ceil((room.timerEndAtMs - Date.now()) / 1000));
  }, [room?.timerEndAtMs]);

  const step = getStepForBid(highestBid);
  const suggestedBids = useMemo(() => {
    return [step, step * 2, step * 3].map((mul) => highestBid + mul);
  }, [highestBid, step]);

  async function submitBid(bidLakhs: number) {
    if (!code || !mySeatId) return;
    setBidBusy(true);
    setStatus(null);
    try {
      await placeBid({ roomCode: code, seatId: mySeatId, bidLakhs });
      setBidInput("");
    } catch (e: unknown) {
      setStatus(getErrorMessage(e));
    } finally {
      setBidBusy(false);
    }
  }

  const allSquadPlayers = useMemo(() => {
    if (!room) return [];
    const ids = new Set<string>();
    for (const s of seats) for (const pid of s.squadPlayerIds) ids.add(pid);
    return Array.from(ids);
  }, [seats, room]);

  const adminRatingDraftInitial = useMemo(() => {
    const draft: Record<string, number> = {};
    for (const pid of allSquadPlayers) {
      draft[pid] = ratings[pid] ?? 0;
    }
    return draft;
  }, [allSquadPlayers, ratings]);

  const [adminDraft, setAdminDraft] = useState<Record<string, number>>({});

  useEffect(() => {
    setAdminDraft(adminRatingDraftInitial);
  }, [adminRatingDraftInitial]);

  const teamTotals = useMemo(() => {
    const totals: Array<{ seat: Seat; total: number }> = seats.map((s) => {
      const total = s.squadPlayerIds.reduce((acc, pid) => acc + (ratings[pid] ?? 0), 0);
      return { seat: s, total };
    });
    totals.sort((a, b) => b.total - a.total);
    return totals;
  }, [seats, ratings]);

  const bestTeamSeatId = teamTotals[0]?.seat.seatId ?? null;

  async function saveAdminRatings() {
    if (!room || !mySeatId) return;
    if (room.hostSeatId !== mySeatId) return;
    setSaveBusy(true);
    setStatus(null);
    try {
      const playerIds = Object.keys(adminDraft);
      for (const pid of playerIds) {
        const r = clamp(Number(adminDraft[pid] ?? 0), 0, 100);
        await setPlayerRating({
          roomCode: code,
          hostSeatId: mySeatId,
          playerId: pid,
          rating: r,
        });
      }
      setStatus("Ratings saved.");
    } catch (e: unknown) {
      setStatus(getErrorMessage(e));
    } finally {
      setSaveBusy(false);
    }
  }

  if (!hydrated) {
    return <div className="mx-auto w-full max-w-5xl px-4 py-10">Loading…</div>;
  }

  if (!code) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        Invalid room code.
      </div>
    );
  }

  if (!room) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        Loading room…
      </div>
    );
  }

  if (!mySeat) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          You’re not joined as a player on this device. Go back to{" "}
          <button
            type="button"
            onClick={() => router.push("/lobby")}
            className="font-semibold underline"
          >
            Lobby
          </button>{" "}
          and join using your room code.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="w-full lg:flex-1">
          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:bg-black/30 dark:border-white/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  Room <span className="font-mono">{code}</span> • {room.mode}
                </div>
                <div className="mt-1 text-lg font-bold">
                  {phase === "lobby"
                    ? "Waiting for players"
                    : phase === "bidding"
                      ? "Auction in progress"
                      : "Auction results"}
                </div>
              </div>
              {mySeat.seatId === room.hostSeatId ? (
                <div className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold dark:border-white/10 dark:bg-black/20">
                  You are the host
                </div>
              ) : (
                <div className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold dark:border-white/10 dark:bg-black/20">
                  {mySeat.team} Owner
                </div>
              )}
            </div>

            {phase === "bidding" && currentPlayer ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-zinc-950 p-5 text-white">
                  <div className="text-sm text-white/70">Now auctioning</div>
                  <div className="mt-1 text-2xl font-bold">{currentPlayer.name}</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-sm text-white/80">
                    <span className="rounded-full bg-white/10 px-3 py-1">
                      {currentPlayer.role}
                    </span>
                    <span className="rounded-full bg-white/10 px-3 py-1">
                      {currentPlayer.overseas ? "Overseas" : "Indian"}
                    </span>
                    <span className="rounded-full bg-white/10 px-3 py-1">
                      Base {formatLakhsCompact(currentPlayer.basePriceLakhs)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      Highest bid
                    </div>
                    <div className="mt-1 text-2xl font-bold">
                      {formatLakhsCompact(highestBid)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-black/20">
                    <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      Timer
                    </div>
                    <div className="mt-1 text-3xl font-extrabold">
                      {timerRemainingSec}s
                    </div>
                    <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Resets by {room.resetSeconds}s on each valid bid
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-semibold">Place a bid</div>
                  <div className="flex flex-wrap gap-2">
                    {suggestedBids.map((b) => (
                      <button
                        key={b}
                        type="button"
                        disabled={bidBusy}
                        onClick={() => submitBid(b)}
                        className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
                      >
                        {formatLakhsCompact(b)}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      value={bidInput}
                      onChange={(e) => setBidInput(e.target.value)}
                      inputMode="numeric"
                      placeholder={`Enter amount in L (min ${highestBid + step}L)`}
                      className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/20 dark:border-white/10 dark:bg-black/20"
                    />
                    <button
                      type="button"
                      disabled={bidBusy || !bidInput}
                      onClick={() => {
                        const n = Number(bidInput);
                        if (!Number.isFinite(n)) return;
                        void submitBid(n);
                      }}
                      className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
                    >
                      Bid
                    </button>
                  </div>

                  {status ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                      {status}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {phase === "lobby" ? (
              <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5 text-sm shadow-sm dark:border-white/10 dark:bg-black/20">
                Waiting for the host to start the auction.
              </div>
            ) : null}

            {phase === "results" ? (
              <div className="mt-6 space-y-5">
                <div className="rounded-2xl bg-zinc-950 p-5 text-white">
                  <div className="text-sm text-white/70">Final standings</div>
                  <div className="mt-1 text-2xl font-bold">Best Team:{" "}
                    {bestTeamSeatId ? (
                      <span className="text-white/90">
                        {seats.find((s) => s.seatId === bestTeamSeatId)?.team}
                      </span>
                    ) : (
                      <span className="text-white/90">—</span>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-white/80">
                    Totals are computed from admin-entered ratings.
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {teamTotals.map(({ seat, total }) => (
                    <div
                      key={seat.seatId}
                      className={`rounded-2xl border p-5 shadow-sm ${
                        seat.seatId === bestTeamSeatId
                          ? "border-yellow-400 bg-yellow-50/40 dark:bg-yellow-400/10"
                          : "border-black/10 bg-white dark:bg-black/20 dark:border-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-bold">
                          {seat.team} Owner {seat.seatId === room.hostSeatId ? "(Host)" : ""}
                        </div>
                        <div className="text-sm text-zinc-600 dark:text-zinc-300">
                          Total: <span className="font-semibold">{total}</span>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                        Squad players: <span className="font-semibold">{seat.squadPlayerIds.length}</span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {seat.squadPlayerIds.slice(0, 12).map((pid) => (
                          <span
                            key={pid}
                            className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs dark:border-white/10 dark:bg-black/20"
                          >
                            {pid.replace(/^p_/, "").slice(0, 10)}
                            {ratings[pid] != null ? ` (${ratings[pid]})` : ""}
                          </span>
                        ))}
                        {seat.squadPlayerIds.length > 12 ? (
                          <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs dark:border-white/10 dark:bg-black/20">
                            +{seat.squadPlayerIds.length - 12} more
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>

                {room.hostSeatId === mySeatId ? (
                  <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm dark:bg-black/20 dark:border-white/10">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-lg font-bold">Admin: enter ratings</div>
                        <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                          Rate players (0–100) to calculate the best team.
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={saveBusy}
                        onClick={() => void saveAdminRatings()}
                        className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
                      >
                        {saveBusy ? "Saving…" : "Save ratings"}
                      </button>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      {allSquadPlayers.map((pid) => (
                        <div key={pid} className="rounded-xl border border-black/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-black/20">
                          <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                            {pid}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={adminDraft[pid] ?? 0}
                              onChange={(e) => {
                                const n = Number(e.target.value);
                                setAdminDraft((prev) => ({
                                  ...prev,
                                  [pid]: Number.isFinite(n) ? n : 0,
                                }));
                              }}
                              className="w-full rounded-lg border border-black/10 bg-white px-2 py-2 text-sm outline-none focus:border-black/20 dark:border-white/10 dark:bg-black/20"
                            />
                            <div className="w-16 text-right text-sm text-zinc-500 dark:text-zinc-400">
                              /100
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {status ? (
                      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                        {status}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="w-full lg:max-w-sm">
          <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:bg-black/30 dark:border-white/10">
            <div className="text-lg font-bold">Players</div>
            <div className="mt-2 space-y-3">
              {seats
                .slice()
                .sort((a, b) => (a.seatId === room.hostSeatId ? -1 : 0) - (b.seatId === room.hostSeatId ? -1 : 0))
                .map((s) => {
                  const remaining = s.totalBudgetLakhs - s.spentBudgetLakhs;
                  return (
                    <div
                      key={s.seatId}
                      className={`rounded-xl border px-3 py-3 ${
                        s.seatId === mySeatId
                          ? "border-zinc-900 bg-zinc-50 dark:border-white/20 dark:bg-black/10"
                          : "border-black/10 dark:border-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">
                            {s.name} ({s.team})
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            Squad: {s.squadPlayerIds.length}
                          </div>
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          {formatLakhsCompact(remaining)} left
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:bg-black/30 dark:border-white/10">
            <div className="text-lg font-bold">Your budget</div>
            <div className="mt-3 text-3xl font-extrabold">
              {formatLakhsCompact(mySeat.totalBudgetLakhs - mySeat.spentBudgetLakhs)}
            </div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Spent: {formatLakhsCompact(mySeat.spentBudgetLakhs)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

