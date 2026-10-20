import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile, isComplete } from "@/lib/profile";
import { createAuthClient } from "@/lib/supabase/server";
import { dailyPrompt, TOPICS, type Topic } from "@/lib/generation";
import { GenerationForm } from "./generation-form";

export const maxDuration = 60;
export default async function CreatePage() {
  const { user, profile } = await requireProfile();
  if (!isComplete(profile)) redirect("/profile");
  const supabase = await createAuthClient();
  const { data: history, error } = await supabase.from("generations")
    .select("id, topic, status, created_at, caption_prompt, description_prompt, system_prompt, model, captions(id)")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
  const enabled = Boolean(process.env.GEMINI_API_KEY) && !error;
  return <main className="page-shell narrow">
    <section className="intro"><h1>Create a caption</h1></section>
    <aside className="daily-prompt"><p className="eyebrow">Today’s inspiration</p><p>{dailyPrompt()}</p></aside>
    {!enabled && <p className="notice" role="status">The studio is being connected. You can browse the gallery while setup is completed.</p>}
    <section className="notice"><GenerationForm enabled={enabled} /></section>
    <section className="history"><h2>Your recent attempts</h2>
      {error ? <p className="muted">Generation history isn’t available yet.</p> : !history?.length ? <p className="muted">No generations yet.</p> : history.map(item => {
        const related = item.captions as unknown as { id: string } | { id: string }[] | null;
        const captionId = Array.isArray(related) ? related[0]?.id : related?.id;
        return <article key={item.id} className="history-item">
        <div><strong>{TOPICS[item.topic as Topic]}</strong><span className="muted"> · {item.status === "complete" ? "Published" : item.status === "failed" ? "Couldn’t finish" : "Processing / awaiting completion"}</span></div>
        {captionId && <Link className="inline-link" href={`/captions/${captionId}`}>View caption →</Link>}
        <details><summary>Saved AI prompts & model</summary><p><strong>Model:</strong> {item.model}</p><p><strong>Photo description prompt:</strong> {item.description_prompt}</p><p><strong>Caption prompt:</strong> {item.caption_prompt || "Caption step not reached."}</p><p><strong>System prompt:</strong> {item.system_prompt}</p></details>
      </article>; })}
    </section>
  </main>;
}
