"use client";
import {useActionState,useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {manageDraft} from "./actions";
export function DraftEditor({id,initial}:{id:string;initial:string}){
 const [state,action,pending]=useActionState(manageDraft,{});const [text,setText]=useState(initial);const router=useRouter();const saved=state.savedCaption??initial;const dirty=text.trim()!==saved;
 useEffect(()=>{if(state.publishedId)router.replace(`/captions/${state.publishedId}?published=1`);},[state.publishedId,router]);
 return <form action={action} className="profile-form draft-editor"><input type="hidden" name="generation" value={id}/><div className="draft-label-row"><label htmlFor="draft-caption">Your caption</label><span className="private-badge">Private draft</span></div><textarea id="draft-caption" name="caption" value={text} onChange={e=>setText(e.target.value)} maxLength={240} rows={5} required disabled={pending} aria-describedby="caption-help"/><div id="caption-help" className="caption-help"><span>{dirty?"Unsaved changes — save your draft or publish.":"Edit the wording before sharing."}</span><span>{text.length}/240</span></div>{!pending&&state.error&&<p className="form-error recovery-message" role="alert">{state.error}</p>}{!pending&&state.savedCaption&&!dirty&&!state.publishedId&&<p className="form-success" role="status">Draft saved.</p>}<div className="draft-actions"><button className="button" name="intent" value="publish" disabled={pending||!text.trim()}>{pending?"Saving…":"Publish caption"}</button><button className="button outline" name="intent" value="save" disabled={pending||!dirty}>Save draft</button></div><p className="field-help">Publishing shares your photo and caption in the gallery. Saving a draft keeps both private.</p><Link className="inline-link" href="/create">← Your drafts & studio</Link></form>;
}
