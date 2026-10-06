import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_path: string | null;
};

export const currentUser = cache(async () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return null;
  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user;
});

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireProfile() {
  const user = await requireUser();
  const admin = createAdminClient();
  const { data, error } = await admin.from("profiles")
    .select("id, first_name, last_name, avatar_path").eq("id", user.id).single();
  if (error) throw new Error("Your profile could not be loaded. Please try again.");
  return { user, profile: data as Profile };
}

export function isComplete(profile: Profile) {
  return Boolean(profile.first_name?.trim() && profile.last_name?.trim());
}
