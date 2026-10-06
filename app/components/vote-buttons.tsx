"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useTransition } from "react";
import { rateCaption } from "@/app/captions/actions";

export function VoteButtons({ captionId, initialVote, signedIn }: { captionId: string; initialVote?: number; signedIn: boolean }) {
  const [vote, setVote] = useState(initialVote);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  if (!signedIn) return <Link className="rate-link" href="/login" aria-label="Sign in to rate this caption">RATE</Link>;
  function rate(value: number) {
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await rateCaption(captionId, value);
        if (result.error) setError(result.error);
        else setVote(result.value);
      } catch { setError("Please refresh and sign in again to save your rating."); }
    });
  }
  return <div className="vote-area"><div className="vote-buttons" aria-label="Rate this caption">
    <button disabled={pending} aria-pressed={vote === 1} onClick={() => rate(1)} aria-label="Funny — save to My likes"><Image src={vote === 1 ? "/design/heart-filled.png" : "/design/heart.png"} alt="" width={50} height={50} /></button>
    <button disabled={pending} aria-pressed={vote === -1} onClick={() => rate(-1)}>Not for me</button>
  </div>
    <p className="vote-status" role="status">{pending ? "Saving…" : vote === 1 ? "Saved to My likes. You can change your vote." : vote === -1 ? "Rating saved. You can change your vote." : "Your vote, your call."}</p>
    {error && <p className="form-error" role="alert">{error}</p>}
  </div>;
}
