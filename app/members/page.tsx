import Link from "next/link";
import { redirect } from "next/navigation";
import { isComplete, requireProfile } from "@/lib/profile";

export default async function Members() {
  const { profile } = await requireProfile();
  if (!isComplete(profile)) redirect("/profile");
  return <main className="page-shell narrow">
    <section className="intro">
      <p className="eyebrow">Members’ lounge</p>
      <h1>Welcome back,<br /><span>{profile.first_name}.</span></h1>
      <p className="intro-copy">You’re in. Your next study break starts with a photo and a punchline.</p>
    </section>
    <article className="notice">
      <p className="eyebrow">Make something worth sending</p>
      <p className="lounge-joke">Turn a campus moment into an AI caption, then let the gallery decide what lands.</p>
      <Link className="button" href="/create">Create a caption</Link>
      <Link className="inline-link" href="/profile">Edit your profile</Link>
    </article>
  </main>;
}
