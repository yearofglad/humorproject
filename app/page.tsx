import Link from "next/link";
import { currentUser } from "@/lib/profile";
import { createAuthClient } from "@/lib/supabase/server";
import { CaptionCard } from "./components/caption-card";
import { dailyPrompt, isTopic, TOPICS } from "@/lib/generation";
import type { FeedCaption } from "@/lib/feed";

export default async function Home({ searchParams }: { searchParams: Promise<{ topic?: string; view?: string; page?: string }> }) {
  const params = await searchParams;
  const topic = isTopic(params.topic) ? params.topic : "all";
  const saved = params.view === "likes";
  const page = Math.min(1000, Math.max(1, Math.floor(Number(params.page) || 1)));
  const user = await currentUser();
  const supabase = await createAuthClient();
  let query = supabase.from("captions").select("id, content, generation_id, topic, created_at, images!inner(url, description, storage_path)");
  if (topic !== "all") query = query.eq("topic", topic);
  let likedIds: string[] = [];
  let likesError = false;
  if (saved && user) {
    const result = await supabase.from("caption_votes").select("caption_id").eq("user_id", user.id).eq("value", 1).order("created_at", { ascending: false }).range((page - 1) * 12, page * 12);
    likedIds = result.data?.map(v => v.caption_id) ?? [];
    likesError = Boolean(result.error);
    query = query.in("id", likedIds.length ? likedIds.slice(0, 12) : ["00000000-0000-0000-0000-000000000000"]);
  }
  const { data, error } = await query.order("created_at", { ascending: false }).order("id").range(saved ? 0 : (page - 1) * 12, saved ? 12 : page * 12);
  const captions = (data ?? []) as unknown as FeedCaption[];
  const ids = captions.slice(0, 12).map(c => c.id);
  const votes = user && ids.length ? await supabase.from("caption_votes").select("caption_id, value").eq("user_id", user.id).in("caption_id", ids) : { data: [], error: null };
  const voteMap = new Map(votes.data?.map(v => [v.caption_id, v.value]));
  const makeUrl = (nextPage: number, nextTopic = topic, nextSaved = saved) => `/?${new URLSearchParams({ topic: nextTopic, view: nextSaved ? "likes" : "new", page: String(nextPage) })}`;
  return <main className="page-shell">
    <header className="masthead"><span>A campus-sized comedy break</span><span>Columbia → NYC → your group chat</span></header>
    <section className="intro feed-intro"><div><p className="eyebrow">For the chronically online, between classes</p>
      <h1>Same city.<br /><span>Different punchline.</span></h1>
      <p className="intro-copy">Photo captions for dorm life, campus chaos, and weekends figuring out New York. Find a laugh. Make the next one.</p>
      <Link className="button" href="/create">Make a caption →</Link></div>
      <aside className="daily-prompt"><p className="eyebrow">Today’s inspiration</p><p>{dailyPrompt()}</p><Link href="/create" className="inline-link">Try it with your photo →</Link></aside>
    </section>
    <section aria-label="Caption gallery">
      <div className="feed-controls"><div className="filter-links"><Link aria-current={!saved ? "page" : undefined} href={makeUrl(1, "all", false)}>Fresh captions</Link><Link aria-current={saved ? "page" : undefined} href={makeUrl(1, "all", true)}>My likes</Link></div>
        {!saved && <div className="filter-links topics"><Link aria-current={topic === "all" ? "page" : undefined} href={makeUrl(1, "all")}>All</Link>{Object.entries(TOPICS).map(([key, label]) => <Link key={key} aria-current={topic === key ? "page" : undefined} href={makeUrl(1, key)}>{label}</Link>)}</div>}
      </div>
      {saved && !user ? <p className="notice"><Link className="inline-link" href="/login">Sign in to see your liked captions →</Link></p> : error || likesError ? <p className="notice" role="alert">The gallery is temporarily unavailable. Please try again shortly.</p> : <>
        {votes.error && <p className="notice" role="alert">We couldn’t load your previous ratings. Refresh before rating again.</p>}
        {captions.length ? <div className="gallery">{captions.slice(0, 12).map(caption => <CaptionCard key={`${caption.id}-${voteMap.get(caption.id) ?? 0}`} caption={caption} vote={voteMap.get(caption.id)} signedIn={Boolean(user) && !votes.error} />)}</div> : <div className="notice"><h2>{saved ? "Your kind of funny lives here." : "The next punchline could be yours."}</h2><p>{saved ? "Tap Funny on a caption to save it here." : "No captions in this theme yet. Upload a photo and give the AI a situation."}</p><Link className="inline-link" href={saved ? "/" : "/create"}>{saved ? "Explore captions →" : "Create the first one →"}</Link></div>}
        <nav className="pagination" aria-label="Gallery pages">{page > 1 && <Link href={makeUrl(page - 1)}>← Previous</Link>}{(saved ? likedIds.length > 12 : captions.length > 12) && <Link href={makeUrl(page + 1)}>More captions →</Link>}</nav>
      </>}
    </section>
    <footer>AI writes the captions. You decide what lands. Photos stay paired with their punchlines.</footer>
  </main>;
}
