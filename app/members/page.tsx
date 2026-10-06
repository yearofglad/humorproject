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
      <p className="intro-copy">You’re in. A little bonus material for your next study break.</p>
    </section>
    <article className="notice">
      <p className="eyebrow">Today’s members-only observation</p>
      <p className="lounge-joke">My study plan has three stages: open the textbook, admire the font, take a well-earned break.</p>
      <Link className="button" href="/">Back to the gallery</Link>
      <Link className="inline-link" href="/profile">Edit your profile</Link>
    </article>
  </main>;
}
