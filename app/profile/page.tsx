import Image from "next/image";
import { isComplete, requireProfile } from "@/lib/profile";
import { createAuthClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const { user, profile } = await requireProfile();
  let avatarUrl: string | undefined;
  if (profile.avatar_path?.startsWith(`${user.id}/`)) {
    const { data } = await (await createAuthClient()).storage.from("avatars").createSignedUrl(profile.avatar_path, 300);
    avatarUrl = data?.signedUrl;
  }
  return <main className="page-shell narrow">
    <section className="intro">
      <p className="eyebrow">A face behind the punchline</p>
      <h1>Your <span>profile.</span></h1>
      <p className="intro-copy">{isComplete(profile) ? "Make yourself at home. Update your name or add a fresh photo." : "Before you join the lounge, tell us your first and last name."}</p>
    </section>
    <section className="notice">
      <div className="profile-heading">
        {avatarUrl ? <Image className="avatar" src={avatarUrl} alt="Your profile photo" width={80} height={80} unoptimized /> : <div className="avatar avatar-placeholder" aria-label="No profile photo">{profile.first_name?.[0] ?? "?"}</div>}
        <div><h2>Personal details</h2><p className="muted">{user.email}</p></div>
      </div>
      <ProfileForm firstName={profile.first_name} lastName={profile.last_name} />
    </section>
  </main>;
}
