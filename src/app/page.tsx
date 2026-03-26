import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-120px)]">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.22),transparent_55%)] dark:bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.10),transparent_55%)]" />
        <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:py-16">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/80 px-4 py-2 text-xs text-zinc-600 shadow-sm backdrop-blur dark:bg-black/40 dark:text-zinc-300">
                <span className="text-zinc-800 dark:text-zinc-100">🔥</span>
                IPL 2026 Auction Ready
              </div>
              <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
                Play Cricket Auctions with Friends Online
              </h1>
              <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-300">
                Create private rooms, bid in real-time, and build your dream squad
                with an IPL-style countdown timer. No signup required.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/lobby"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
                >
                  Start Playing Now
                </Link>
                <Link
                  href="/how-to-play"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-black/10 bg-white/80 px-6 text-sm font-semibold text-zinc-900 transition hover:bg-white dark:border-white/15 dark:bg-black/40 dark:text-zinc-50"
                >
                  How it works
                </Link>
              </div>
            </div>

            <div className="w-full max-w-md rounded-2xl border border-black/5 bg-white/70 p-6 shadow-sm backdrop-blur dark:bg-black/40 dark:border-white/10">
              <h2 className="text-lg font-semibold">Quick Start</h2>
              <ol className="mt-4 space-y-3 text-sm text-zinc-700 dark:text-zinc-200">
                <li>
                  <span className="font-semibold">1.</span> Create or join a room with
                  a code
                </li>
                <li>
                  <span className="font-semibold">2.</span> Wait for players (up to 10)
                </li>
                <li>
                  <span className="font-semibold">3.</span> Bid before the timer ends
                </li>
              </ol>
              <div className="mt-6 rounded-xl bg-zinc-950 px-4 py-3 text-sm text-white dark:bg-zinc-50 dark:text-black">
                <div className="font-semibold">Timer rule</div>
                <div className="text-zinc-200/90">
                  Default 10s countdown, resets by 5s whenever someone bids.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-10">
        <h2 className="text-2xl font-bold">Why Play IPL Auction Game?</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Play with Friends",
              body: "Create private rooms and invite up to 10 friends.",
            },
            {
              title: "Real-Time Bidding",
              body: "Live auctions with instant updates and counter-bids.",
            },
            {
              title: "Authentic Timer System",
              body: "IPL-style countdown pressure on every bid decision.",
            },
            {
              title: "Works on Any Device",
              body: "Open in your browser on mobile, tablet, or desktop.",
            },
            {
              title: "No Sign Up Required",
              body: "Enter your name and start playing immediately.",
            },
            {
              title: "2026 Official Player List",
              body: "MVP uses sample data; CSV import supported in admin flow.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:bg-black/30 dark:border-white/10"
            >
              <div className="font-semibold">{f.title}</div>
              <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                {f.body}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-10">
        <h2 className="text-2xl font-bold">Choose Your Auction Mode</h2>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:bg-black/30 dark:border-white/10">
            <h3 className="text-lg font-semibold">IPL 2026 Mock Auction</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              Most Popular: mode with a structured deck and a faster pace.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-zinc-700 dark:text-zinc-200">
              <li>• MVP uses sample deck data</li>
              <li>• Timer + bid ladder + squad results</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:bg-black/30 dark:border-white/10">
            <h3 className="text-lg font-semibold">Mega Auction</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              Full experience: a fresh start with a full purse.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-zinc-700 dark:text-zinc-200">
              <li>• Default budget per team: 120 Cr</li>
              <li>• No retentions (MVP-ready)</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-16">
        <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            {
              q: "Is IPL Auction Game free to play?",
              a: "Yes. Create a room and start playing with friends.",
            },
            {
              q: "How many players can join one auction?",
              a: "Up to 10 players per room. Others can spectate via joining late (MVP).",
            },
            {
              q: "Do I need to download an app?",
              a: "No. It works in the browser.",
            },
            {
              q: "How does the bidding timer work?",
              a: "Default 10 seconds. When someone bids, timer resets by 5 seconds. Highest bidder wins.",
            },
          ].map((item) => (
            <div
              key={item.q}
              className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:bg-black/30 dark:border-white/10"
            >
              <div className="font-semibold">{item.q}</div>
              <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                {item.a}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl bg-zinc-950 p-6 text-white dark:bg-zinc-50 dark:text-black">
          <div className="text-lg font-semibold">Ready to Build Your Dream Team?</div>
          <div className="mt-2 text-sm text-zinc-200 dark:text-zinc-600">
            Join thousands of cricket fans and start bidding.
          </div>
          <div className="mt-4">
            <Link
              href="/lobby"
              className="inline-flex h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-black transition hover:bg-zinc-200 dark:bg-zinc-950 dark:text-white dark:hover:bg-black"
            >
              Start Playing Now
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
