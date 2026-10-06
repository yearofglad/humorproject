import { redirect } from "next/navigation";
import { currentUser } from "@/lib/profile";
import { GoogleButton } from "./google-button";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentUser()) redirect("/members");
  const { error } = await searchParams;
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return <main className="page-shell narrow">
    <section className="intro">
      <p className="eyebrow">Your study break, personalized</p>
      <h1>Join the<br /><span>inside joke.</span></h1>
      <p className="intro-copy">Sign in to set up your profile and step into the members’ lounge.</p>
    </section>
    <section className="notice auth-panel" aria-label="Sign in">
      {error && <p role="alert">We couldn’t complete your Google sign-in. Please try again.</p>}
      {configured ? <GoogleButton /> : <p>Sign-in is not configured yet. Follow the setup instructions in the README.</p>}
      <p className="muted">New here? Your account is created when you first sign in.</p>
    </section>
  </main>;
}
