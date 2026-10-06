"use client";
import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createCaption } from "./actions";
import { TOPICS } from "@/lib/generation";

export function GenerationForm({ enabled }: { enabled: boolean }) {
  const [state, action, pending] = useActionState(createCaption, {});
  const [preview, setPreview] = useState<string>();
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  return <form action={action} className="profile-form">
    <label>Your photo<input type="file" name="photo" required accept="image/jpeg,image/png,image/webp"
      disabled={pending} onChange={event => { const file = event.target.files?.[0]; setPreview(file ? URL.createObjectURL(file) : undefined); }} /></label>
    {preview && <Image src={preview} alt="Selected photo preview" width={800} height={500} unoptimized className="upload-preview" />}
    <p className="muted">JPEG, PNG, or WebP · up to 2 MB. Pick a photo with a clear scene or reaction.</p>
    <label>The vibe<select name="topic" defaultValue="campus" disabled={pending}>
      {Object.entries(TOPICS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select></label>
    <label>What’s the situation? <span className="muted">Optional</span>
      <textarea name="context" maxLength={300} rows={3} disabled={pending} placeholder="Me packing snacks for a three-stop subway ride…" />
    </label>
    <p className="muted">Your photo and situation go to Google Gemini. A completed caption and its photo are published in the gallery. Upload a photo you’re comfortable sharing.</p>
    <button className="button" disabled={pending || !enabled}>{pending ? "Finding the punchline…" : "Generate & publish caption"}</button>
    <p className="muted">Up to 5 attempts per rolling 24 hours. Usually takes under a minute.</p>
    {pending && <p role="status">Reading your photo, then writing a caption. Keep this page open.</p>}
    {state.error && <p role="alert" className="form-error">{state.error}</p>}
    {state.captionId && <div className="form-success" role="status">Your caption is live. <Link className="inline-link" href={`/captions/${state.captionId}`}>See it and share →</Link></div>}
  </form>;
}
