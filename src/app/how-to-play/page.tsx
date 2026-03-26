import Link from "next/link";

export default function HowToPlay() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex flex-col gap-2">
        <div className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          How to Play IPL Auction Game
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Complete guide to hosting your own auction with friends
        </h1>
      </div>

      <div className="mt-8 space-y-8 text-sm leading-7 text-zinc-700 dark:text-zinc-200">
        <section>
          <h2 className="text-xl font-semibold">Quick Start Guide</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>
              <span className="font-semibold">Create Your Room</span> — Enter your
              name and pick your favorite IPL team. Click `Create Room` to get your
                unique room code.
            </li>
            <li>
              <span className="font-semibold">Invite Your Friends</span> — Share the
              room code. They can join on the homepage. Up to 10 players can join.
            </li>
            <li>
              <span className="font-semibold">Choose Auction Mode</span> — Select{" "}
              `2026 Mock Auction` (official-style mock) or `Mega Auction` (full draft
              experience).
            </li>
            <li>
              <span className="font-semibold">Start Bidding</span> — Players appear
              one by one. Bid before the timer ends.
            </li>
            <li>
              <span className="font-semibold">Build Your Squad</span> — Win players
              by having the highest bid when the timer hits 0.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Auction Rules</h2>
          <div className="mt-3 space-y-4">
            <div>
              <div className="font-semibold">Bidding Timer</div>
              <ul className="mt-2 list-disc pl-5">
                <li>
                  Each player has a countdown timer (default 10 seconds)
                </li>
                <li>Timer resets by 5 seconds when someone bids</li>
                <li>
                  When timer reaches 0, the highest bidder wins the player
                </li>
              </ul>
            </div>
            <div>
              <div className="font-semibold">Budget & Bidding</div>
              <ul className="mt-2 list-disc pl-5">
                <li>
                  Each team starts with a budget (Mega uses ₹120 Cr; Mock varies in the full app)
                </li>
                <li>
                  Bid increments follow an IPL-style ladder (simplified in the MVP clone)
                </li>
                <li>You cannot bid more than your remaining budget</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold">Squad Requirements</div>
              <ul className="mt-2 list-disc pl-5">
                <li>Minimum 18 players per squad</li>
                <li>Maximum 25 players per squad</li>
                <li>Maximum 8 overseas players allowed</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Auction Modes Explained</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:bg-black/30 dark:border-white/10">
              <div className="font-semibold">IPL 2026 Mock Auction</div>
              <p className="mt-2">
                Experience a structured mock auction with the official-style idea of retentions and base prices.
                MVP clone uses sample players until you import your CSV.
              </p>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:bg-black/30 dark:border-white/10">
              <div className="font-semibold">Mega Auction</div>
              <p className="mt-2">
                Full experience: every team starts with the full purse and bids players from the deck.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-zinc-950 p-6 text-white dark:bg-zinc-50 dark:text-black">
          <div className="text-lg font-semibold">Ready to Start Your Auction?</div>
          <p className="mt-2 text-sm text-white/80 dark:text-zinc-600">
            Now that you know the rules, it’s time to build your dream team.
          </p>
          <div className="mt-4">
            <Link
              href="/lobby"
              className="inline-flex h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-black transition hover:bg-zinc-200 dark:bg-zinc-950 dark:text-white"
            >
              Create Room & Play
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

