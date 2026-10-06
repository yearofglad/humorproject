"use client";

import { useState } from "react";
import { createBrowserAuthClient } from "@/lib/supabase/browser";

export function GoogleButton({ glass = false }: { glass?: boolean }) {
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
    <button className={glass ? "google-glass-button" : "button"} aria-label="Sign in with Google" onClick={signIn} disabled={pending}>
      {pending ? "Opening Google…" : glass ? <><span>SIGN IN with</span><span className="google-word" aria-hidden="true"><span>G</span><span>O</span><span>O</span><span>G</span><span>L</span><span>E</span></span></> : "Sign in with Google"}
    </button>
    {error && <p role="alert">{error}</p>}
  </>;
}
