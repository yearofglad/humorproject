import Image from "next/image";
import Link from "next/link";
import { imageUrl, type FeedCaption } from "@/lib/feed";
import { TOPICS, type Topic } from "@/lib/generation";
import { VoteButtons } from "./vote-buttons";
import { ShareButton } from "./share-button";

export async function CaptionCard({ caption, vote, signedIn }: { caption: FeedCaption; vote?: number; signedIn: boolean }) {
  const url = await imageUrl(caption.images);
  return <article className="caption-card" id={`caption-${caption.id}`}>
    <div className="card-body"><Image className="author-icon" src={caption.generation_id ? "/design/robot.png" : "/design/person.png"} alt="" width={50} height={50} /><p className="sr-only">{caption.generation_id ? `AI caption · ${TOPICS[caption.topic as Topic] || "Campus life"}` : "Starter example · Human-written"}</p>
      <Link href={`/captions/${caption.id}`} className="caption-text">{caption.content}</Link></div>
    {url ? <Image src={url} alt={caption.images.description} width={900} height={650} unoptimized className="card-image" /> : <p className="notice">Photo temporarily unavailable. Please refresh.</p>}
    <div className="card-body card-actions">
      {caption.generation_id ? <VoteButtons captionId={caption.id} initialVote={vote} signedIn={signedIn} /> : <p className="starter-label">Human-written example</p>}
      <div className="card-share"><ShareButton id={caption.id} /></div>
    </div>
  </article>;
}
