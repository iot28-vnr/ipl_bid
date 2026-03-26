"use client";

import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { getAuthInstance } from "@/lib/firebaseClient";

function getErrorMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  return "Something went wrong.";
}

export default function AnonymousAuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attemptedRef = useRef(false);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    try {
      const auth = getAuthInstance();

      unsub = onAuthStateChanged(auth, async (user) => {
        if (user) {
          setReady(true);
          return;
        }

        // No user yet: sign in anonymously once.
        if (attemptedRef.current) return;
        attemptedRef.current = true;
        try {
          await signInAnonymously(auth);
        } catch (e) {
          setError(getErrorMessage(e));
        }
      });
    } catch (e) {
      queueMicrotask(() => {
        setError(getErrorMessage(e));
        setReady(true);
      });
    }

    return () => {
      if (unsub) unsub();
    };
  }, []);

  if (error) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10 text-sm text-red-700">
        Firebase Auth error: {error}
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10 text-sm text-zinc-600">
        Connecting…
      </div>
    );
  }

  return <>{children}</>;
}

