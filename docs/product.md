# Product decisions

Sam is a Columbia junior, chronically online, from the Midwest, living in a dorm and learning NYC. The product connects recognizable photos to small, specific campus and city situations instead of a generic joke generator.

## Reasons to return and share

A rotating daily photo idea lowers the effort of starting. Campus life, Dorm energy, and NYC weekends give the feed recognizable themes. The newest feed makes fresh uploads discoverable; My likes gives each user a personal collection. Each generated caption has a public permalink and a copy-link button so sharing does not require recipients to sign in.

The daily idea is inspiration, not a claim that new AI content has already been generated. Starter captions are honestly labeled human-written and cannot be voted on. No fabricated vote counts, trending claims, or fake AI outputs are used.

## Improving the caption experience

Keep the photo beside its caption, show the punchline first, and make the two voting choices explicit. Let visitors browse before asking them to sign in. Generation accepts optional context so the joke can reflect Sam's situation, but the image description grounds the result in visible details. A visible success link, useful error messages, and private generation history make completion clear.

The app publishes one caption per upload. This keeps the first version focused; generating several alternatives and choosing one could be explored after feedback. Publication is disclosed before submission. There are no engagement notifications or automatic messages.

## Week 5 PM feedback and iteration

Feedback supplied in this chat on October 20, 2026. The focus is Sam's repeat study-break use: browse a relevant theme, vote, see favorites rise, and return to personal likes.

| Feedback | Change | Verification |
| --- | --- | --- |
| Keep the pixel personality; long captions are difficult to read | Keep Redaction for the brand and headings; use Geist for captions, topic filters, tagline, and voting controls, with smaller type and more line spacing | Production build; desktop/mobile visual check |
| Remove “not vibe coded” | Replace with “Serious studies. Unserious captions.” | Header inspection |
| Only one AI caption; examples cannot be rated | Add 12 AI-written editorial captions with original local pixel illustrations; allow authenticated votes on both editorial and uploaded-photo AI captions | Full migration-chain tests; original human examples still reject votes |
| NYC weekends is empty and central to Sam | Six NYC weekend captions, plus three campus and three dorm captions | Database assertions on all topic counts |
| Prompt cannot be found | Link every AI card to “Behind the caption”; public editorial briefs and model labels; exact uploaded-photo prompts visible to their creator on the caption page and in clearly labeled history | Public editorial reads and private generation ownership tests |
| Votes should change what people see | Add Most liked ordered by persisted Funny vote count, with newest and ID tie-breakers; show real counts; preserve topic selection across views and pages | Real PostgreSQL engine tests verify vote insert/change affects counts and ranking across users |
| Duplicate “gallery of memesgallery” heading | Render a single heading in every viewport | Page markup and visual check |
| Double-check RLS on every table | RLS on all six public app tables; owner-only private profiles, generations, votes; public editorial provenance only for published images; service-only aggregate view | Full migration-chain tests and live security advisor |

The editorial captions are AI text authored in the Codex session, accurately labeled GPT-6, not claimed to be Gemini API calls. Their stored briefs capture the topic, scene, and writing constraints. User uploads continue through the existing two-step Gemini generation workflow, which saves exact system, description, and caption prompts before publication. Their prompts retain the existing owner-only privacy promise.

The ranking view uses invoker security and is not granted to browser roles. Trusted server code reads aggregate totals; public captions still load through the visitor's client under publication RLS. Individual vote rows are never exposed to build the leaderboard.
