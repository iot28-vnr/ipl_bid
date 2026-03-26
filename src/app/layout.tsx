import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import AnonymousAuthGate from "@/components/AnonymousAuthGate";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IPL Auction Game",
  description: "Play cricket auctions with friends online.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-zinc-950 dark:bg-black dark:text-zinc-50">
        <header className="w-full border-b border-black/5 dark:border-white/10">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="text-lg font-semibold">
              IPL Auction Game
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/how-to-play" className="hover:underline">
                How to Play
              </Link>
              <Link href="/support" className="hover:underline">
                Support
              </Link>
              <Link href="/lobby" className="hover:underline">
                Lobby
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">
          <AnonymousAuthGate>{children}</AnonymousAuthGate>
        </main>
        <footer className="border-t border-black/5 dark:border-white/10">
          <div className="mx-auto w-full max-w-5xl px-4 py-6 text-xs text-zinc-500 dark:text-zinc-400">
            Made for cloning the experience of{" "}
            <a
              href="https://www.playauctiongame.com/"
              className="underline"
              target="_blank"
              rel="noreferrer"
            >
              playauctiongame.com
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
