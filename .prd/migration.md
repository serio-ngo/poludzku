# Migration from the po ludzku newsroom

poludzku.info today serves the newsroom from private `serio-ngo/news-interface`: 49 source-reviewed records for neurodivergent adults, people with disabilities and caregivers, each with a return date. This product takes the address and the name. The newsroom stops; nothing of it disappears without a redirect.

## Why the order matters

Archiving news-interface first would stop its Monday source re-check while its pages still serve, so records with passed return dates would stay online unchecked. A record whose legal facts went stale is a harm to exactly the readers it was written for. The site switches first; the repository is archived last.

## Steps

| #   | Step                                                                                                                                                                                                                                           | Done when                                                       |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 1   | Build this product on a `*.workers.dev` address                                                                                                                                                                                                | Task pages of `serio-ngo/poludzku` render from live GitHub data |
| 2   | Write `src/content/pages/newsroom.md` (PL): the newsroom has closed, where official sources and Serio articles live, a link to krok                                                                                                            | Page renders at `/newsroom`                                     |
| 3   | Redirect every newsroom URL (`/<category>`, `/<category>/<slug>`, `/kalendarz`, `/zapisane`, `/metoda`, `/rss.xml`, `kalendarz.ics`, `llms.txt`) with 301 to `/newsroom`, through Workers static `_redirects` generated once from the 49 slugs | `lychee` over the old sitemap returns only 301 → 200            |
| 4   | Point the poludzku.info route at the new Worker                                                                                                                                                                                                | `curl -I https://poludzku.info/` serves the new site            |
| 5   | Change the outside references: the project card and `/poludzku` plan on serio.org.pl (audioblog), the four-domain ecosystem table                                                                                                              | No live page describes po ludzku as a newsroom                  |
| 6   | Archive `serio-ngo/news-interface`; close its open branches and lifecycle work as rejected                                                                                                                                                     | Repository read-only; its workflows no longer run               |

Step 4 is the one owner-visible switch and needs the owner's go on that day. The newsletter has no subscribers (`NEWSLETTER.formUrl` is empty), so no message is owed.

## Kept from the newsroom

Design tokens, layout, typesetting, gates and the deploy setup, listed in [tech.md](tech.md). The 49 records stay in the archived repository's history; they are not republished.

## Not decided here

Whether a newsroom of law changes for families returns somewhere else (a section of serio.org.pl, or a later po ludzku page). Until the owner decides, it does not exist.
