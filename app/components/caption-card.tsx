import Image from "next/image";
import Link from "next/link";
import { imageUrl, type FeedCaption } from "@/lib/feed";
import { TOPICS, type Topic } from "@/lib/generation";
import { VoteButtons } from "./vote-buttons";
import { ShareButton } from "./share-button";

export async function CaptionCard({ caption, vote, signedIn, likes }: { caption: FeedCaption; vote?: number; signedIn: boolean; likes?: number }) {
  const url = await imageUrl(caption.images);
  const ai = Boolean(caption.generation_id || caption.editorial_generation_id);
  return <article className="caption-card" id={`caption-${caption.id}`}>
    <div className="card-body"><div className="card-meta"><Image className="author-icon" src={ai ? "/design/robot.png" : "/design/person.png"} alt="" width={50} height={50} /><p>{ai ? `AI caption · ${TOPICS[caption.topic as Topic] || "Campus life"}` : "Starter example · Human-written"}</p></div>
      <Link href={`/captions/${caption.id}`} className="caption-text">{caption.content}</Link></div>
    {url ? <Image src={url} alt={caption.images.description} width={900} height={650} unoptimized className="card-image" /> : <p className="notice">Photo temporarily unavailable. Please refresh.</p>}
    <div className="card-body card-actions">
      {ai ? <VoteButtons captionId={caption.id} initialVote={vote} signedIn={signedIn} likes={likes} /> : <p className="vote-status">Human-written example · explore AI captions to vote.</p>}
      <div className="card-share"><ShareButton id={caption.id} /></div>
    </div>
    {ai && <Link className="prompt-link" href={`/captions/${caption.id}#prompt`}>About this AI caption →</Link>}
  </article>;
}
