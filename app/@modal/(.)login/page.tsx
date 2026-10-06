import { SignInPanel } from "@/app/login/sign-in-panel";

export default async function LoginModal({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <SignInPanel error={error} intercepted />;
}
