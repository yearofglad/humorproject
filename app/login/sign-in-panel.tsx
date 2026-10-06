import { redirect } from "next/navigation";
import { currentUser } from "@/lib/profile";
import { GoogleButton } from "./google-button";
import { SignInDialog } from "@/app/components/sign-in-dialog";

export async function SignInPanel({ error, intercepted = false }: { error?: string; intercepted?: boolean }) {
  if (await currentUser()) redirect("/members");
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return <SignInDialog intercepted={intercepted}>
    {error && <p className="modal-error" role="alert">We couldn’t complete your Google sign-in. Please try again.</p>}
    {configured ? <GoogleButton glass /> : <p>Sign-in is not configured yet. Please try again later.</p>}
  </SignInDialog>;
}
