import Link from "next/link";
import { currentUser } from "@/lib/profile";
import { createAuthClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CaptionCard } from "./components/caption-card";
import { isTopic, TOPICS } from "@/lib/generation";
import { CAPTION_FIELDS, captionLikes, type FeedCaption } from "@/lib/feed";

export default async function Home({ searchParams }: { searchParams: Promise<{ topic?: string; view?: string; page?: string }> }) {
  const params = await searchParams;
  const topic = isTopic(params.topic) ? params.topic : "all";
  const view = params.view === "likes" || params.view === "top" ? params.view : "new";
  const saved = view === "likes";
  const top = view === "top";
  const page = Math.min(1000, Math.max(1, Math.floor(Number(params.page) || 1)));
  const user = await currentUser();
  const supabase = await createAuthClient();
  let query = supabase.from("captions").select(CAPTION_FIELDS);
  if (!saved) query = query.eq("is_listed", true);
  if (topic !== "all") query = query.eq("topic", topic);
  let selectedIds: string[] = [];
  let selectionError = false;
  let hasMore = false;
  let counts = new Map<string, number>();
  let countsError = false;
  if (top) {
    try {
      let ranking = createAdminClient().from("caption_rankings").select("id, funny_count").eq("is_listed", true);
      if (topic !== "all") ranking = ranking.eq("topic", topic);
      const result = await ranking.order("funny_count", { ascending: false }).order("created_at", { ascending: false }).order("id").range((page - 1) * 12, page * 12);
      selectionError = Boolean(result.error);
      hasMore = (result.data?.length ?? 0) > 12;
      selectedIds = result.data?.slice(0, 12).map(row => row.id) ?? [];
      counts = new Map(result.data?.map(row => [row.id, Number(row.funny_count)]));
    } catch { selectionError = true; }
  } else if (saved && user) {
    let liked = supabase.from("caption_votes").select("caption_id, captions!inner(topic)").eq("user_id", user.id).eq("value", 1);
    if (topic !== "all") liked = liked.eq("captions.topic", topic);
    const result = await liked.order("created_at", { ascending: false }).order("caption_id").range((page - 1) * 12, page * 12);
    selectedIds = result.data?.slice(0, 12).map(row => row.caption_id) ?? [];
    selectionError = Boolean(result.error);
    hasMore = (result.data?.length ?? 0) > 12;
  }
  if (top || saved) query = query.in("id", selectedIds.length ? selectedIds : ["00000000-0000-0000-0000-000000000000"]);
  const { data, error } = await query.order("created_at", { ascending: false }).order("id").range(top || saved ? 0 : (page - 1) * 12, top || saved ? 11 : page * 12);
  const captions = (data ?? []) as unknown as FeedCaption[];
  if (!top && !saved) hasMore = captions.length > 12;
  if (top || saved) {
    const order = new Map(selectedIds.map((id, index) => [id, index]));
    captions.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }
  const visible = captions.slice(0, 12);
  const ids = visible.map(c => c.id);
  if (!top) {
    try { counts = await captionLikes(ids); } catch { countsError = true; }
  }
  const votes = user && ids.length ? await supabase.from("caption_votes").select("caption_id, value").eq("user_id", user.id).in("caption_id", ids) : { data: [], error: null };
  const voteMap = new Map(votes.data?.map(v => [v.caption_id, v.value]));
  const makeUrl = (nextPage: number, nextTopic = topic, nextView = view) => `/?${new URLSearchParams({ topic: nextTopic, view: nextView, page: String(nextPage) })}`;
  return <main className="page-shell">
    <header className="gallery-heading"><div><p className="eyebrow">CAMPUS LIFE · DORMS · NYC</p><h1>{saved ? "Your saved captions" : top ? "Most liked captions" : "Gallery of memes"}</h1><p className="page-description">Turn everyday photos into captions. Vote on what lands and keep your favorites.</p></div><Link className="button" href="/create">Create a caption</Link></header>
    <section aria-label="Caption gallery">
      <div className="feed-controls"><nav className="filter-links" aria-label="Gallery views"><Link aria-current={view === "new" ? "page" : undefined} href={makeUrl(1, topic, "new")}>Newest</Link><Link aria-current={top ? "page" : undefined} href={makeUrl(1, topic, "top")}>Most liked</Link><Link aria-current={saved ? "page" : undefined} href={makeUrl(1, topic, "likes")}>Saved</Link></nav>
        <nav className="filter-links topics" aria-label="Caption topics"><Link aria-current={topic === "all" ? "page" : undefined} href={makeUrl(1, "all")}>All</Link>{Object.entries(TOPICS).map(([key, label]) => <Link key={key} aria-current={topic === key ? "page" : undefined} href={makeUrl(1, key)}>{label}</Link>)}</nav>
      </div>
      {saved && !user ? <p className="notice"><Link className="inline-link" href="/login?next=%2F%3Fview%3Dlikes">Sign in to see your saved captions →</Link></p> : error || selectionError ? <p className="notice" role="alert">The gallery is temporarily unavailable. Please try again shortly.</p> : <>
        {votes.error && <p className="notice" role="alert">We couldn’t load your previous ratings. Refresh before rating again.</p>}
        {countsError && <p className="muted" role="status">Like counts are temporarily unavailable. You can still browse and rate captions.</p>}
        {visible.length ? <div className="gallery">{visible.map(caption => <CaptionCard key={`${caption.id}-${voteMap.get(caption.id) ?? 0}-${counts.get(caption.id) ?? "unknown"}`} caption={caption} vote={voteMap.get(caption.id)} likes={counts.get(caption.id)} signedIn={Boolean(user) && !votes.error} />)}</div> : <div className="notice"><h2>{saved ? "No liked captions yet" : "No captions yet"}</h2><p>{saved ? "Tap Funny to save a caption here." : "Create a caption for this topic."}</p><Link className="inline-link" href={saved ? "/" : "/create"}>{saved ? "Browse captions →" : "Create a caption →"}</Link></div>}
        <nav className="pagination" aria-label="Gallery pages">{page > 1 && <Link href={makeUrl(page - 1)}>← Previous</Link>}{hasMore && <Link href={makeUrl(page + 1)}>More captions →</Link>}</nav>
      </>}
    </section>
  </main>;
}
