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
    <p className="muted">JPEG, PNG, or WebP · up to 2 MB</p>
    <label>Topic<select name="topic" defaultValue="campus" disabled={pending}>
      {Object.entries(TOPICS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select></label>
    <label>What’s the situation? <span className="muted">Optional</span>
      <textarea name="context" maxLength={300} rows={3} disabled={pending} placeholder="Me packing snacks for a three-stop subway ride…" />
    </label>
    <p className="muted">Google Gemini processes your photo and situation. Your photo and completed caption will be public.</p>
    <button className="button" disabled={pending || !enabled}>{pending ? "Generating…" : "Generate & publish"}</button>
    <p className="muted">5 attempts per 24 hours · usually under a minute</p>
    {pending && <p role="status">Generating your caption. Keep this page open.</p>}
    {state.error && <p role="alert" className="form-error">{state.error}</p>}
    {state.captionId && <div className="form-success" role="status">Your caption is live. <Link className="inline-link" href={`/captions/${state.captionId}`}>See it and share →</Link></div>}
  </form>;
}
