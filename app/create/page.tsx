import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile, isComplete } from "@/lib/profile";
import { createAuthClient } from "@/lib/supabase/server";
import { TOPICS, type Topic } from "@/lib/generation";
import { GenerationForm } from "./generation-form";

export const maxDuration = 60;
export default async function CreatePage() {
  const { user, profile } = await requireProfile("/create");
  if (!isComplete(profile)) redirect("/profile");
  const supabase = await createAuthClient();
  const { data: history, error } = await supabase.from("generations")
    .select("id, topic, status, created_at, caption_prompt, description_prompt, system_prompt, model, draft_caption, captions(id)")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
  const enabled = Boolean(process.env.GEMINI_API_KEY) && !error;
  return <main className="page-shell narrow">
    <header className="page-heading"><p className="eyebrow">CAPTION STUDIO</p><h1>Create a caption</h1><p className="page-description">Choose a photo, generate a draft, then make it yours before publishing.</p></header>
    <ol className="flow-steps" aria-label="Caption creation steps"><li aria-current="step"><span>1</span>Choose a photo</li><li><span>2</span>Generate</li><li><span>3</span>Review & edit</li><li><span>4</span>Publish</li></ol>
    {!enabled&&<p className="notice" role="alert">The caption service is temporarily unavailable. You can still open your saved drafts below.</p>}
    <section className="studio-panel"><GenerationForm enabled={enabled}/></section>
    <section className="history"><h2>Your drafts & recent activity</h2>
      {error ? <p className="muted">Generation history isn’t available yet.</p> : !history?.length ? <p className="muted">No generations yet.</p> : history.map(item => {
        const related = item.captions as unknown as { id: string } | { id: string }[] | null;
        const captionId = Array.isArray(related) ? related[0]?.id : related?.id;
        return <article key={item.id} className="history-item">
        <div><strong>{TOPICS[item.topic as Topic]}</strong><span className="muted"> · {item.status === "complete" ? "Published" : item.status === "ready" ? "Private draft" : item.status === "failed" ? "Generation failed" : "Generating"}</span></div>
        {item.status === "ready" && <Link className="inline-link" href={`/drafts/${item.id}`}>Review draft →</Link>}
        {captionId && <Link className="inline-link" href={`/captions/${captionId}`}>View caption →</Link>}
        <details><summary>Saved AI prompts & model</summary><p><strong>Model:</strong> {item.model}</p><p><strong>Photo description prompt:</strong> {item.description_prompt}</p><p><strong>Caption prompt:</strong> {item.caption_prompt || "Caption step not reached."}</p><p><strong>System prompt:</strong> {item.system_prompt}</p></details>
      </article>; })}
    </section>
  </main>;
}
