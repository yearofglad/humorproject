"use server";

import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { createAuthClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/profile";
import { MAX_PHOTO_BYTES, validateNames } from "@/lib/profile-validation";

export type ProfileState = { error?: string; success?: string };

export async function saveProfile(_previous: ProfileState, form: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const names = validateNames(form.get("first_name"), form.get("last_name"));
  if (!names) return { error: "Enter both names, using 1–80 characters for each." };
  const photo = form.get("photo");
  let image: Buffer | undefined;
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > MAX_PHOTO_BYTES) return { error: "Choose a photo smaller than 2 MB." };
    if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type)) {
      return { error: "Choose a JPEG, PNG, or WebP photo." };
    }
    try {
      const source = sharp(await photo.arrayBuffer(), { limitInputPixels: 25_000_000 });
      const metadata = await source.metadata();
      if (!["jpeg", "png", "webp"].includes(metadata.format ?? "")) throw new Error("Invalid format");
      // Decode and re-encode; reject corrupt content and remove metadata (including GPS).
      image = await source.rotate().resize(512, 512, { fit: "cover" }).webp({ quality: 85 }).toBuffer();
    } catch {
      return { error: "That image couldn’t be read. Try a different JPEG, PNG, or WebP photo." };
    }
  }

  const supabase = await createAuthClient();
  const { data: existing, error: readError } = await supabase.from("profiles")
    .select("avatar_path").eq("id", user.id).single();
  if (readError) return { error: "We couldn’t load your profile. Please try again." };
  const oldPath: string | null = existing.avatar_path;
  let newPath: string | undefined;
  if (image) {
    newPath = `${user.id}/${crypto.randomUUID()}.webp`;
    const { error } = await supabase.storage.from("avatars").upload(newPath, image, { contentType: "image/webp", upsert: false });
    if (error) return { error: "We couldn’t upload your photo. Please try again." };
  }
  // The owner always comes from the verified session, never form fields.
  const { data, error } = await supabase.from("profiles")
    .update({ ...names, ...(newPath ? { avatar_path: newPath } : {}), updated_at: new Date().toISOString() })
    .eq("id", user.id).select("id").single();
  if (error || !data) {
    if (newPath) await supabase.storage.from("avatars").remove([newPath]);
    return { error: "We couldn’t save your profile. Please try again." };
  }
  if (newPath && oldPath?.startsWith(`${user.id}/`)) {
    await supabase.storage.from("avatars").remove([oldPath]);
  }
  revalidatePath("/profile");
  revalidatePath("/members");
  return { success: "Profile saved. You’re ready for the members’ lounge." };
}
