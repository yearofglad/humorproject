"use server";

import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { requireProfile, isComplete } from "@/lib/profile";
import { createAuthClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { captionPrompt, DESCRIPTION_PROMPT, isTopic, SYSTEM_PROMPT } from "@/lib/generation";
import { generateText } from "@/lib/gemini";
import { redirect } from "next/navigation";

export type GenerationState = { error?: string; captionId?: string };
export async function createCaption(_previous: GenerationState, form: FormData): Promise<GenerationState> {
  const { user, profile } = await requireProfile();
  if (!isComplete(profile)) redirect("/profile");
  if (!process.env.GEMINI_API_KEY) return { error: "Caption generation isn’t connected yet. Please try again once setup is complete." };
  const topic = form.get("topic");
  const context = form.get("context");
  const photo = form.get("photo");
  if (!isTopic(topic) || typeof context !== "string" || context.trim().length > 300) return { error: "Choose a theme and keep your situation under 300 characters." };
  if (!(photo instanceof File) || photo.size === 0 || photo.size > 2 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(photo.type)) {
    return { error: "Choose a JPEG, PNG, or WebP photo up to 2 MB." };
  }
  let bytes: Buffer;
  try {
    const image = sharp(await photo.arrayBuffer(), { limitInputPixels: 25_000_000 });
    const metadata = await image.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format ?? "")) throw new Error("IMAGE");
    bytes = await image.rotate().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    if (bytes.length > 2 * 1024 * 1024) throw new Error("IMAGE");
  } catch { return { error: "That photo couldn’t be read. Try a smaller or different image." }; }

  const admin = createAdminClient();
  const supabase = await createAuthClient();
  const { data: generation, error: reserveError } = await admin.rpc("reserve_generation", {
    p_user: user.id, p_topic: topic, p_context: context.trim(),
    p_model: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
    p_system: SYSTEM_PROMPT, p_description_prompt: DESCRIPTION_PROMPT,
  });
  if (reserveError || !generation) {
    const message = reserveError?.message || "";
    return { error: message.includes("USER_LIMIT") ? "You’ve used your five attempts for the past 24 hours. Come back later for another round." :
      message.includes("ALREADY_GENERATING") ? "Your last caption is still being made. Give it a moment." :
      message.includes("SITE_LIMIT") ? "The studio has reached today’s generation limit. Please come back later." : "We couldn’t start your caption. Please try again later." };
  }
  const imageId = crypto.randomUUID();
  const path = `${user.id}/${imageId}.webp`;
  let uploaded = false;
  let inserted = false;
  try {
    const { error: uploadError } = await supabase.storage.from("caption-images").upload(path, bytes, { contentType: "image/webp", upsert: false });
    if (uploadError) throw new Error("UPLOAD");
    uploaded = true;
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/authenticated/caption-images/${path}`;
    const { error: imageError } = await supabase.from("images").insert({ id: imageId, owner_id: user.id, storage_path: path, url, description: "Caption in progress" });
    if (imageError) throw new Error("SAVE");
    inserted = true;
    const description = await generateText(DESCRIPTION_PROMPT, "description", bytes);
    const prompt = captionPrompt(description, topic, context.trim());
    const { data: recorded, error: promptError } = await admin.from("generations").update({ image_id: imageId, image_description: description, caption_prompt: prompt })
      .eq("id", generation).eq("user_id", user.id).select("id").single();
    if (promptError || !recorded) throw new Error("SAVE");
    const caption = await generateText(prompt, "caption");
    const { data: captionId, error: completeError } = await admin.rpc("complete_generation", { p_generation: generation, p_caption: caption });
    if (completeError || !captionId) throw new Error("SAVE");
    revalidatePath("/"); revalidatePath("/create");
    return { captionId };
  } catch (error) {
    // If the publish transaction committed but its response was lost, keep the result.
    const { data: published } = await supabase.from("captions").select("id").eq("generation_id", generation).maybeSingle();
    if (published) { revalidatePath("/"); return { captionId: published.id }; }
    await admin.from("generations").update({ status: "failed" }).eq("id", generation).eq("status", "pending");
    if (inserted) await supabase.from("images").delete().eq("id", imageId).eq("is_published", false);
    if (uploaded) await supabase.storage.from("caption-images").remove([path]);
    const reason = error instanceof Error ? error.message : "";
    return { error: reason === "AI_BUSY" ? "The AI provider is busy. Please try again later." : reason === "AI_OUTPUT" ?
      "The AI couldn’t produce a usable caption for this photo. Try a different image or situation." :
      "We couldn’t finish your caption. Your attempt was recorded, and no unfinished caption was published. Please try again later." };
  }
}
