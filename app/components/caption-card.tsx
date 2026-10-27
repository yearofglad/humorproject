import Image from "next/image";
import Link from "next/link";
import { imageUrl, type FeedCaption } from "@/lib/feed";
import { TOPICS, type Topic } from "@/lib/generation";
import { PHOTO_CREDITS } from "@/lib/photo-credits";
import { VoteButtons } from "./vote-buttons";
import { ShareButton } from "./share-button";

export async function CaptionCard({ caption, vote, signedIn, likes }: { caption: FeedCaption; vote?: number; signedIn: boolean; likes?: number }) {
  const url = await imageUrl(caption.images);
  const ai = Boolean(caption.generation_id || caption.editorial_generation_id);
  const credit = PHOTO_CREDITS[caption.images.url];
  return <article className="caption-card" id={`caption-${caption.id}`}>
    <div className="card-meta"><Image className="author-icon" src={ai ? "/design/robot.png" : "/design/person.png"} alt="" width={28} height={28}/><p>{ai ? `AI caption${caption.edited_by_creator ? " · edited" : ""} · ${TOPICS[caption.topic as Topic] || "Campus life"}` : "Human-written example"}</p></div>
    {url ? <Link className="card-photo-link" href={`/captions/${caption.id}`} aria-label="Open photo and caption"><Image src={url} alt={caption.images.description} width={900} height={650} unoptimized className="card-image"/></Link> : <p className="notice">Photo unavailable. <Link href={`/captions/${caption.id}`}>Open caption →</Link></p>}
    <Link href={`/captions/${caption.id}`} className="caption-text">{caption.content}</Link>
    {credit&&<details className="photo-credit"><summary>Photo credit</summary><a href={credit.source} target="_blank" rel="noreferrer">{credit.author}</a> · {credit.licenseUrl ? <a href={credit.licenseUrl} target="_blank" rel="noreferrer">{credit.license}</a> : credit.license}<span>{credit.changes}</span></details>}
    <div className="card-body card-actions">
      {ai ? <VoteButtons captionId={caption.id} initialVote={vote} signedIn={signedIn} likes={likes} /> : <p className="vote-status">Human-written example · explore AI captions to vote.</p>}
      <div className="card-share"><ShareButton id={caption.id} /></div>
    </div>
    {ai && <Link className="prompt-link" href={`/captions/${caption.id}#prompt`}>About this AI caption →</Link>}
  </article>;
}
