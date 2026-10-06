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
    <section className="intro"><p className="eyebrow">The caption studio</p><h1>Your photo.<br /><span>A new punchline.</span></h1>
      <p className="intro-copy">That dorm moment. That subway face. Turn it into something your friends would send back to you.</p></section>
    <aside className="daily-prompt"><p className="eyebrow">Today’s inspiration</p><p>{dailyPrompt()}</p></aside>
    {!enabled && <p className="notice" role="status">The studio is being connected. You can browse the gallery while setup is completed.</p>}
    <section className="notice"><GenerationForm enabled={enabled} /></section>
    <section className="history"><h2>Your recent attempts</h2>
      {error ? <p className="muted">Generation history isn’t available yet.</p> : !history?.length ? <p className="muted">Your first caption starts here.</p> : history.map(item => <article key={item.id} className="history-item">
        <div><strong>{TOPICS[item.topic as Topic]}</strong><span className="muted"> · {item.status === "complete" ? "Published" : item.status === "failed" ? "Couldn’t finish" : "Processing / awaiting completion"}</span></div>
        {item.captions?.[0]?.id && <Link className="inline-link" href={`/captions/${item.captions[0].id}`}>View caption →</Link>}
        <details><summary>Generation details</summary><p>Model: {item.model}</p><p>{item.description_prompt}</p><p>{item.caption_prompt || "Caption step not reached."}</p><p>{item.system_prompt}</p></details>
      </article>)}
    </section>
  </main>;
}
