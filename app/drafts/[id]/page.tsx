import Image from "next/image";
import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {requireUser} from "@/lib/profile";
import {createAuthClient} from "@/lib/supabase/server";
import {TOPICS,type Topic} from "@/lib/generation";
import {DraftEditor} from "../draft-editor";
export default async function Draft({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^[a-f0-9-]{36}$/i.test(id))notFound();const user=await requireUser(`/drafts/${id}`);const db=await createAuthClient();
 const {data:g,error}=await db.from("generations").select("id,user_id,image_id,draft_caption,status,topic").eq("id",id).eq("user_id",user.id).maybeSingle();if(error)throw new Error("Draft unavailable");if(!g)notFound();
 if(g.status==="complete"){const {data:c}=await db.from("captions").select("id").eq("generation_id",id).maybeSingle();if(c)redirect(`/captions/${c.id}`);}
 if(g.status!=="ready"||!g.draft_caption)return <main className="page-shell studio-shell"><h1>{g.status==="pending"?"Your caption is being generated":"This draft isn’t available"}</h1><p>Return to the studio to check your recent activity or try another photo.</p><Link className="button" href="/create">Back to the studio</Link></main>;
 const {data:image}=await db.from("images").select("description,storage_path,url").eq("id",g.image_id||"").maybeSingle();let url=image?.url;
 if(image?.storage_path){const {data:signed}=await db.storage.from("caption-images").createSignedUrl(image.storage_path,300);url=signed?.signedUrl;}
 return <main className="page-shell studio-shell"><header className="page-heading"><p className="eyebrow">{TOPICS[g.topic as Topic]}</p><h1>Review your caption</h1><p className="page-description">Make any edits, save for later, or publish when you’re ready.</p></header><ol className="flow-steps" aria-label="Caption creation steps"><li className="done"><span>✓</span>Photo chosen</li><li className="done"><span>✓</span>Generated</li><li aria-current="step"><span>3</span>Review & edit</li><li><span>4</span>Publish</li></ol><section className="draft-workspace"><div className="draft-photo">{url?<Image src={url} alt={image?.description||"Your selected photo"} width={900} height={650} className="draft-image" unoptimized/>:<p role="alert">The photo is no longer available. Your caption text is still shown.</p>}</div><DraftEditor id={id} initial={g.draft_caption}/></section></main>;
}
