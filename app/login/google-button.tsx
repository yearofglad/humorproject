"use client";

import { useState } from "react";
import { createBrowserAuthClient } from "@/lib/supabase/browser";

export function GoogleButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function signIn() {
    setPending(true);
    setError(undefined);
    try {
      const { error } = await createBrowserAuthClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch {
      setError("Google sign-in couldn’t start. Please try again.");
      setPending(false);
    }
  }

  return <>
    <button className="button" onClick={signIn} disabled={pending}>
      {pending ? "Opening Google…" : "Sign in with Google"}
    </button>
    {error && <p role="alert">{error}</p>}
  </>;
}
