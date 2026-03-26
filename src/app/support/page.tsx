export default function Support() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex flex-col gap-2">
        <div className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          Support IPL Auction Game
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Help us keep the servers running
        </h1>
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-200">
          50,000+ cricket fans have already played this game for free.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-black/30">
        <p className="text-sm text-zinc-700 dark:text-zinc-200">
          If you enjoyed playing with your friends, we’d love your support. Every
          little contribution helps us keep the servers running and improve the
          game.
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-zinc-700 dark:text-zinc-200">
          <li>Keep the servers running 24/7</li>
          <li>Add new features and improvements</li>
          <li>Create more entertaining games</li>
          <li>Keep the game free for everyone</li>
        </ul>
        <div className="mt-6 rounded-xl bg-zinc-950 px-4 py-3 text-white dark:bg-zinc-50 dark:text-black">
          <div className="font-semibold">Scan to Pay (UPI)</div>
          <div className="mt-1 text-sm">
            UPI ID: <span className="font-mono">dhivalogu@okhdfcbank</span>
          </div>
          <div className="mt-3">
            <a
              href="upi://pay?pa=dhivalogu@okhdfcbank&amp;pn=IPLAuctionGame&amp;cu=INR"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-white px-4 text-sm font-semibold text-black transition hover:bg-zinc-200 dark:bg-black/90 dark:text-white"
            >
              Pay with UPI
            </a>
          </div>
        </div>
        <div className="mt-6 text-xs text-zinc-500 dark:text-zinc-400">
          Made with by <a href="https://x.com/imdhiva" className="underline" target="_blank" rel="noreferrer">@imdhiva</a>
        </div>
      </div>
    </div>
  );
}

