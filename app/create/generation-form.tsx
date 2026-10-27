"use client";
import {useActionState,useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import Image from "next/image";
import {createCaption} from "./actions";
import {TOPICS} from "@/lib/generation";
export function GenerationForm({enabled}:{enabled:boolean}){
 const [state,action,pending]=useActionState(createCaption,{});const router=useRouter();
 const [photo,setPhoto]=useState<File>();const [preview,setPreview]=useState<string>();const [topic,setTopic]=useState("campus");const [context,setContext]=useState("");const input=useRef<HTMLInputElement>(null);
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
 useEffect(()=>{if(state.draftId)router.push(`/drafts/${state.draftId}`);},[state.draftId,router]);
 return <form action={data=>{if(photo)data.set("photo",photo);action(data);}} className="profile-form generation-form">
  <label>Your photo<input ref={input} type="file" name="photo" required={!photo} accept="image/jpeg,image/png,image/webp" disabled={pending} onChange={e=>{const f=e.target.files?.[0];setPhoto(f);setPreview(f?URL.createObjectURL(f):undefined);}}/></label>
  {preview&&<div className="photo-selection"><Image src={preview} alt="Selected photo preview" width={800} height={500} unoptimized className="upload-preview"/><div className="selection-info"><span>{photo?.name}</span><button type="button" className="text-button" disabled={pending} onClick={()=>{setPhoto(undefined);setPreview(undefined);if(input.current)input.current.value="";}}>Remove photo</button></div></div>}
  <p className="field-help">JPEG, PNG or WebP · up to 2 MB</p>
  <label>Topic<select name="topic" value={topic} onChange={e=>setTopic(e.target.value)} disabled={pending}>{Object.entries(TOPICS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
  <label>What’s happening? <span className="optional">Optional</span><textarea name="context" value={context} onChange={e=>setContext(e.target.value)} maxLength={300} rows={3} disabled={pending} placeholder="Trying to study while my roommate reorganizes the room…"/></label>
  <p className="field-help">Google Gemini processes your photo and situation. Your draft stays private until you publish it.</p>
  {!pending&&state.error&&<div role="alert" className="form-error recovery-message">{state.error}</div>}
  <button className="button" disabled={pending||!enabled}>{pending?"Generating your draft…":state.retryable?"Try generation again":"Generate a draft"}</button>
  {pending&&<p className="generation-progress" role="status"><span className="progress-dot" aria-hidden="true"/>Reading your photo and writing a caption. Nothing is public yet.</p>}
  <p className="field-help">5 draft generations per 24 hours. Editing and publishing use no extra generations.</p>
 </form>;
}
