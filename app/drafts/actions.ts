"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {requireUser} from "@/lib/profile";
import {createAdminClient} from "@/lib/supabase/admin";
export type DraftState={error?:string;savedCaption?:string;publishedId?:string};
export async function manageDraft(_previous:DraftState,form:FormData):Promise<DraftState>{
 const id=String(form.get("generation")||"");const user=await requireUser(`/drafts/${id}`);const content=String(form.get("caption")||"").trim();const intent=form.get("intent");
 if(!/^[a-f0-9-]{36}$/i.test(id)||!["save","publish"].includes(String(intent)))return {error:"This draft could not be identified. Return to your drafts and open it again."};
 if(!content||content.length>240)return {error:"Keep your caption between 1 and 240 characters."};
 const {data,error}=await createAdminClient().rpc("manage_generated_draft",{p_actor:user.id,p_generation:id,p_caption:content,p_publish:intent==="publish"});
 if(error||!data)return {error:error?.message.includes("INVALID_IMAGE")?"The photo is no longer available. Save your caption text and choose a new photo.":"Couldn’t save this change. Your text is kept here. Refresh to check the draft, then try again."};
 revalidatePath("/create");revalidatePath(`/drafts/${id}`);if(intent==="publish"){revalidatePath("/");redirect(`/captions/${data}?published=1`);}return {savedCaption:content};
}
