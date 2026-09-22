
import Image from "next/image";
import { connection } from "next/server";
import { Suspense } from "react";
import { createSupabaseClient } from "@/lib/supabase";

type Caption = { id: string; content: string };
type HumorImage = {
  id: string;
  url: string;
  description: string;
  captions: Caption[];
};

async function CaptionGallery() {
  await connection();
  const supabase = createSupabaseClient();

  if (!supabase) {
    return <p className="notice">The gallery is not connected yet. Add the Supabase connection settings described in the project README.</p>;
  }

  const { data, error } = await supabase
    .from("images")
    .select("id, url, description, captions(id, content)")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(30);

  if (error) {
    console.error("Supabase gallery query failed:", error.message);
    return <p className="notice" role="alert">We couldn’t load the captions. Please refresh and try again.</p>;
  }

  const images: HumorImage[] = data ?? [];
  if (!images.length) {
    return <p className="notice">No images yet. The first laugh is still on its way.</p>;
  }

  return (
    <div className="gallery">
      {images.map((image, index) => (
        <article className="caption-card" key={image.id}>
          <Image src={image.url} alt={image.description} width={900} height={600} unoptimized className="card-image" />
          <div className="card-body">
            <p className="eyebrow">Exhibit {String(index + 1).padStart(2, "0")}</p>
            {image.captions.length ? (
              <ul className="captions">
                {image.captions.map((caption) => <li key={caption.id}>{caption.content}</li>)}
              </ul>
            ) : <p className="muted">Waiting for its punchline.</p>}
          </div>
        </article>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <main className="page-shell">
      <header className="masthead"><span>The Humor Project</span><span>Vol. 01 / Campus life</span></header>
      <section className="intro">
        <p className="eyebrow">A small collection of questionable observations</p>
        <h1>Serious studies.<br /><span>Unserious captions.</span></h1>
        <p className="intro-copy">A little perspective for your next study break. Same picture, different punchline.</p>
      </section>
      <section aria-label="Images and captions">
        <Suspense fallback={<p className="notice" role="status">Loading your next study break…</p>}>
          <CaptionGallery />
        </Suspense>
      </section>
      <footer>Made for a study break. Sample captions · Photos from Lorem Picsum.</footer>
    </main>
  );
}
