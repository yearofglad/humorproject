import Home from "@/app/page";
import { SignInPanel } from "./sign-in-panel";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <><Home searchParams={Promise.resolve({})} /><SignInPanel error={error} /></>;
}
