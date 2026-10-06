"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/profile";
import { createAuthClient } from "@/lib/supabase/server";

export async function rateCaption(captionId: string, value: number): Promise<{ error?: string; value?: number }> {
  const user = await requireUser();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(captionId) || ![1, -1].includes(value)) return { error: "Choose Funny or Not for me." };
  const supabase = await createAuthClient();
  // First rating inserts a row. A repeat or concurrent click never duplicates it.
  const { data, error } = await supabase.from("caption_votes").insert({ caption_id: captionId, user_id: user.id, value }).select("value").single();
  if (error?.code === "23505") {
    const { data: updated, error: updateError } = await supabase.from("caption_votes").update({ value })
      .eq("caption_id", captionId).eq("user_id", user.id).select("value").single();
    if (updateError || !updated) return { error: "Your rating wasn’t saved. Please try again." };
  } else if (error || !data) return { error: "Your rating wasn’t saved. Please try again." };
  revalidatePath("/"); revalidatePath(`/captions/${captionId}`);
  return { value };
}
