import Link from "next/link";
import { redirect } from "next/navigation";
import { isComplete, requireProfile } from "@/lib/profile";

export default async function Members() {
  const { profile } = await requireProfile();
  if (!isComplete(profile)) redirect("/profile");
  return <main className="page-shell narrow">
    <section className="intro">
      <h1>Welcome, {profile.first_name}.</h1>
    </section>
    <article className="notice">
      <Link className="button" href="/create">Create a caption</Link>
      <Link className="inline-link" href="/profile">Edit your profile</Link>
    </article>
  </main>;
}
