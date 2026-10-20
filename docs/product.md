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
| Keep the pixel personality; long captions are difficult to read | Keep Redaction for the brand and headings; use Poppins for captions, topic filters, forms, and voting controls, with smaller type and more line spacing | Production build; desktop/mobile visual check |
| Remove “not vibe coded” | Remove the tagline entirely | Header inspection |
| Only one AI caption; examples cannot be rated | Add 12 AI-written editorial captions paired with real, locally hosted photographs; allow authenticated votes on both editorial and uploaded-photo AI captions | Full migration-chain tests; original human examples still reject votes |
| NYC weekends is empty and central to Sam | Six NYC weekend captions, plus three campus and three dorm captions | Database assertions on all topic counts |
| Prompt cannot be found | Link every AI card to “Behind the caption”; public editorial briefs and model labels; exact uploaded-photo prompts visible to their creator on the caption page and in clearly labeled history | Public editorial reads and private generation ownership tests |
| Votes should change what people see | Add Most liked ordered by persisted Funny vote count, with newest and ID tie-breakers; show real counts; preserve topic selection across views and pages | Real PostgreSQL engine tests verify vote insert/change affects counts and ranking across users |
| Duplicate “gallery of memesgallery” heading | Render a single heading in every viewport | Page markup and visual check |
| Double-check RLS on every table | RLS on all six public app tables; owner-only private profiles, generations, votes; public editorial provenance only for published images; service-only aggregate view | Full migration-chain tests and live security advisor |

The active editorial captions are AI text authored in the Codex session, accurately labeled GPT-6, paired with licensed real photographs. Their stored briefs capture the topic, photo description, photo source, and writing constraints. Photo credit, source, license, and conversion details appear beneath each photo. The photos themselves are not AI-generated. User uploads continue through the existing two-step Gemini generation workflow, which saves exact system, description, and caption prompts before publication. Their prompts retain the existing owner-only privacy promise.

The ranking view uses invoker security and is not granted to browser roles. Trusted server code reads aggregate totals; public captions still load through the visitor's client under publication RLS. Individual vote rows are never exposed to build the leaderboard.

## Follow-up: use real photographs

The instructor screenshot supplied by the user specifically questions generated cartoons of recognizable places. The final gallery follows this feedback: Butler Library, Central Park, a real subway interior, pizza, and a real shared dorm room replace the illustration collection. The dorm photo is credited to its actual source at Westfield State College; it is not presented as a Columbia dorm photo. Pixel typography remains in branding and headings.

The 12 earlier illustrated captions are unlisted from Fresh and Most liked, with their content and provenance preserved for existing permalinks and My likes. They are not silently edited after someone has voted. The 12 active photo captions have their own IDs, saved briefs and independent votes. User-uploaded photo generations remain listed by default.

## Verification and publication status

Commit `af73b2a` is deployed publicly at https://humorproject-ako1u4kwx-hp-d80d.vercel.app. Google OAuth completed successfully in the real browser. A public-domain dorm photo generated a new Gemini caption (`f6ea6fea-21e0-43e4-90c9-f362888fcf32`); its exact prompts and model were visible to its creator. A Funny vote survived reload, appeared in My likes, and moved the caption to the top of Most liked. Anonymous route-protection checks passed. The security advisor reported only the existing leaked-password-protection warning.

The user explicitly approved publication of the real-photo draft on October 20, 2026. Migration `20261020051027_replace_editorial_illustrations_with_photos.sql` is applied to the live database. All 12 illustrated captions retain their original content, shared permalinks, and votes; they are unlisted from Fresh and Most liked. The 12 new real-photo captions have independent IDs and saved generation briefs.

## Typography and copy follow-up

The user requested Poppins and removal of promotional filler, alongside screenshots calling out oversized text, excessive pixel type, forced wrapping, uneven card sizes, and redundant voting explanations. Poppins now handles all reading and control text; pixel type stays in branding and headings. Taglines, gallery blurbs, and promotional copy in Create, Profile, and Members were removed. Voting shows counts and selected buttons, with status text only while saving or on error. Generation disclosure, limits, validation, and saved prompt access remain.

The Create heading is “Create a caption” with no forced line break. Daily inspiration uses smaller Poppins text. Gallery cards stretch to equal row heights with consistent image frames. Actual component previews verified Poppins loaded, all three desktop cards measured 639 px high, and the 390 px mobile view had no horizontal overflow. The temporary preview route was removed after inspection.

Typography, shorter copy, equal card heights, and the history-link fix are committed separately as `e9651a9`, without any photo collection or database changes. The approved real-photo collection is now included for publication, retaining the deployed Poppins and copy changes.
