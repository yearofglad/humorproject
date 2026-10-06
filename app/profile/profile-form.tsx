"use client";

import { useActionState } from "react";
import Link from "next/link";
import { saveProfile } from "./actions";

export function ProfileForm({ firstName, lastName }: { firstName: string | null; lastName: string | null }) {
  const [state, action, pending] = useActionState(saveProfile, {});
  return <form action={action} className="profile-form">
    <div className="name-fields">
      <label>First name<input name="first_name" autoComplete="given-name" defaultValue={firstName ?? ""} required maxLength={80} /></label>
      <label>Last name<input name="last_name" autoComplete="family-name" defaultValue={lastName ?? ""} required maxLength={80} /></label>
    </div>
    <label>Profile photo <span className="muted">(optional)</span>
      <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="photo-help" />
    </label>
    <p id="photo-help" className="muted">JPEG, PNG, or WebP, up to 2 MB. Your photo is stored privately and cropped to a square.</p>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    {state.success && <p className="form-success" role="status">{state.success} <Link className="inline-link" href="/members">Go to the lounge →</Link></p>}
    <button className="button" disabled={pending}>{pending ? "Saving…" : "Save profile"}</button>
  </form>;
}
