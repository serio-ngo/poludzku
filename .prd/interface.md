# Interface

Two parents. From the po ludzku newsroom (`serio-ngo/news-interface`): the register row, the yellow marker, tokens only, no modal. From krok (`serio-ngo/krok`): one thing per screen, progress as dots, a control that cannot act is hidden, never greyed out.

The rules implement the W3C note [Making Content Usable for People with Cognitive and Learning Disabilities](https://www.w3.org/TR/coga-usable/): help users focus, use clear content, do not rely on memory. "Neurodivergent-friendly" is claimed only for what these rules, pa11y and keyboard tests prove, and after test sessions with neurodivergent users.

## Text budget

**Glyphs answer. Words wait in the folded details.** The home page and the article pages (`/regulamin`, `/<slug>`) are the only pages with sentences. A tool screen shows only:

- the wordmark, `owner/repo`, task numbers and GitHub titles;
- avatars, logins and the mover words `Ty`, `ktoś`, `agent`, `automat` and `nikt`;
- the current stage's name, and the next stage's name in the next tile;
- the read time, the language switch (`EN` / `PL`) and other numbers;
- on an unavailable view, at most three words and one action.

Everything else is a glyph: no headings, labels, captions, button words or explanatory lines. Every glyph has its words as visually hidden text and in a native `title`. The sentences of the five answers and the technical evidence live in the folded details. The home page carries the legend: each glyph with its word, once.

The owner's design canvas follows these layouts. Where it shows more words than this section allows, this section wins.

## Glyphs

Lucide icons, rendered to inline SVG on the server with `@lucide/astro`, as in the newsroom. Shape carries the meaning. Colour repeats it and is never alone. The same glyph means the same thing on every screen.

| Meaning | Glyph | Token | Words PL / EN |
| --- | --- | --- | --- |
| Waiting for a move | `hourglass` | `--state-watch` | czeka / waiting |
| Work or checks underway | `circle-dashed` | `--state-nochange` | w pracy / working |
| Checks passed | `circle-check` | `--state-nochange` | sprawdzenia przeszły / checks passed |
| Stuck: a check failed | `circle-alert` | `--state-change` | stoi, sprawdzenie nie przeszło / stuck, a check failed |
| Stuck: parked for a person | `circle-pause` | `--state-change` | stoi, wstrzymane / stuck, parked |
| No checks reported | `circle` | `--text-meta` | brak sprawdzeń / no checks |
| Evidence unavailable | `circle-help` | `--text-meta` | brak danych / unknown |
| The viewer's move | the viewer's avatar on the marker | `--marker` | Ty / You |
| A named person | GitHub avatar | none | login |
| Someone, at an unassigned gate | `user-round` | `--text-body` | ktoś / someone |
| Agent | `bot` | `--text-body` | agent / agent |
| Automation | `cog` | `--text-body` | automat / automation |
| Nobody | `circle-off` | `--text-meta` | nikt / nobody |
| What next | `arrow-right` | `--arrow-ink` | co dalej / what next |
| Open on GitHub | `external-link` | `--text-link` | Otwórz na GitHubie / Open on GitHub |
| Reload | `refresh-cw` | `--text-link` | Odśwież / Reload |
| Details | `chevron-right`, pointing down when open | `--text-body` | Szczegóły / Details |
| Sign in, sign out | `log-in`, `log-out` | `--text-link` | Zaloguj / Sign in, Wyloguj / Sign out |
| Terms | `scale` | `--text-meta` | Regulamin / Terms |

All words, including stage names, accessible names and the sentences in the details, live in one dictionary per language in `src/locales/`. The marker means "this is yours", as the newsroom's marker meant "this concerns you".

## Task screen

```text
po ludzku                                          EN   [log-in]
serio-ngo/poludzku › #42
Dodanie stopki do artykułu

  ●─────●─────●─────④┄┄┄┄┄○─────○─────○
                    Testy

  [bot] agent          [circle-dashed]          → Zatwierdzenie testów

  [external-link]            10:42 [refresh-cw]            [chevron-right]
```

- **The strip is the one emphasis.** One dot per configured stage. Completed dots are filled with ink. The current dot is pressed with the stamp shadow, carries its number and takes the state colour. The next dot is dashed and later dots are thin. The current stage's name sits under the strip in the display face. Its visually hidden label reads "4 z 7 · Testy" / "4 of 7 · Tests".
- **An unknown stage** draws every dot thin, with `circle-help` in place of the name. **Done** fills every dot and shows the word `gotowe`. **Closed without completion** draws every dot thin and shows `zamknięte`.
- **Three tiles in one row, no captions:** mover, health, next. Terminal outcomes hide the health and next tiles and show `nikt`. When progress evidence is unavailable, the next tile shows `circle-help` and names no stage.
- **Details** use the native folded `<details>`. Inside, words are allowed: the five answers as sentences, then checks, reviews, labels, linked tasks, commits and deployments as short labelled links. Raw logs stay on GitHub.

Name the viewer as `Ty` / `You` only when the verified viewer identity matches the mover. Otherwise use a known person's avatar and login, `ktoś` at an unassigned manual gate, the agent or automation word, or `nikt` where nobody can act. Use the unknown glyph only for unavailable evidence.

## Project list

```text
po ludzku                                          EN   [log-in]
serio-ngo/poludzku

#57  [circle-alert]   ●●●●●●⑦   Formularz zapisu na warsztaty    [avatar on marker] Ty
#38  [hourglass]      ●●③○○○○   Poprawa kontrastu w stopce       [avatar] ola
──────────────────────────────────────────────────────────────────────
#42  [circle-dashed]  ●●●④○○○   Dodanie stopki do artykułu       [bot] agent
#49  [circle-dashed]  ●●●●●●⑦   Nowy szablon strony              [cog] automat

10:42 [refresh-cw]
```

- One row per canonical task, and the whole row is one link. Order: number, state glyph, small strip, full title, mover.
- Rows where a person moves come first, then the rest, most recent activity first within each group. A hairline separates the groups and a visually hidden heading names each.
- The viewer's rows carry the marker and `Ty`.
- No counts, totals, filters or tabs. On a phone the strip moves under the title.

## Unavailable views

One glyph, at most three words and one action. Missing and unauthorized repositories share one view, so the response never reveals that a repository exists.

| View | Glyph | PL | EN | Action |
| --- | --- | --- | --- | --- |
| Repository missing, App not installed, or no access | `lock` | Brak dostępu | No access | Sign in when signed out, otherwise the App's install page |
| GitHub not answering or rate-limited | `cloud-off` | GitHub nie odpowiada | GitHub not responding | Reload |
| Session expired | `log-in` | Sesja wygasła | Session expired | Sign in |
| Branch with no task, or several | `git-branch` | Brak zadania | No task | The branch on GitHub |
| Page not found | `search-x` | Nie ma strony | Page not found | Home |
| Empty list | `inbox` | Nic nie czeka | Nothing waiting | None |
| Partial list, after the rows read | `ellipsis` | Lista niepełna | List incomplete | The repository on GitHub |

## Home page

The only tool page with sentences, and still short: at most 80 words outside the legend and the footer.

- The wordmark and one line, „Jedno zadanie. Czyj ruch. Co dalej.”, with the marker on „Czyj ruch.”
- The entry: one field for `owner/repo` or a GitHub address, and one button.
- The synthetic sample: the task screen with invented data, marked `Przykład` / `Example`.
- The legend: every glyph in the table above with its word.
- The footer: publisher, terms, licence and source code. Tool screens keep only the terms glyph.

## Calm rules

- One emphasis per screen: the current stage.
- No counts, totals, badges, toasts, sounds or notifications.
- Plain words. "PR", "CI", "merge" and "label" appear only inside the details.
- Every page passes pa11y (WCAG 2.2 AA) and keyboard-only use; the gates are copied from news-interface.

## Accessibility and freshness

- Every glyph link and the details summary is at least 44 × 44 px with a visible focus ring. Keyboard order follows the reading order: breadcrumb, title, strip, tiles, actions, details.
- Every meaning has its own shape, so colour is never the only carrier. Every glyph has visually hidden words for assistive technology.
- Keep the screen usable at 320 px wide and with text enlarged to 200 %. Tiles and the strip wrap in source order.
- Display the read time and a reload link. The reader decides when to reload. Use a colour transition of at most 150 ms, and none when reduced motion is requested. No animation, modal or sound.
- Test keyboard access and mobile reflow before release. Validate with neurodivergent readers before claiming accessibility for that audience.

## Article space

`src/content/pages/*.md` provides articles at `/<slug>` with the site's article typography. The custom home block comes from `src/content/home.md`. Keep content in Markdown with no components or embeds, so editors can update it directly. The matching EN routes use English content.
