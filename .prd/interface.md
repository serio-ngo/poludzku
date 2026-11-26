# Interface

Two parents. From the po ludzku newsroom (`serio-ngo/news-interface`): the register row, the mono state word, the yellow marker, tokens only, no hero, no modal. From krok (`serio-ngo/krok`): one thing per screen, progress as dots, a control that cannot act is hidden, never greyed out.

The rules below implement the W3C note [Making Content Usable for People with Cognitive and Learning Disabilities](https://www.w3.org/TR/coga-usable/): its objectives to help users focus, use clear content and not rely on memory. "Neurodivergent-friendly" is claimed only for what these rules, pa11y and keyboard tests prove, and after test sessions with neurodivergent users.

## The task screen

Top to bottom, nothing else above the fold:

1. Breadcrumb: project › number. The task title from GitHub as the H1, cut nowhere.
2. **Co się dzieje?** — one sentence, the largest text on the page.
3. The stage strip: seven dots, the current one filled and labelled ("4 z 7 · Testy"). No bar, no percentage.
4. Three lines, each a label and a word: `W porządku: tak` · `Ruch: agent` · `Dalej: przegląd testów`.
5. One link: "Otwórz na GitHubie →". Never a button.
6. "Szczegóły", folded: checks with their results, reviews, labels, linked pull requests, commits and deployments as links, the raw `lifecycle-status` log.

## The project list

One row per task, one line: number, state word, stage name, title, mover. Rows whose move is a person's come first, then by last activity. The viewer's own moves carry the marker on the number — the newsroom's rule "this changes your life" becomes "this is yours". Filters: none in v1.

## State words

One dictionary, one place (`STATES` in `src/config/site.ts`), mono, coloured by its token, always also a word.

| State     | PL      | EN      | Token              |
| --------- | ------- | ------- | ------------------ |
| `now`     | czeka   | waiting | `--state-watch`    |
| `working` | w pracy | working | `--state-nochange` |
| `fail`    | stoi    | stuck   | `--state-change`   |
| `done`    | gotowe  | done    | `--text-strong`    |

Colour is never the only carrier: the word is always there, and the strip dot of the current stage carries its number.

## Calm rules

- No animation except a 150 ms colour transition; honour `prefers-reduced-motion` by removing even that.
- Nothing refreshes or moves by itself. The page prints "stan z 10:42" and a reload link; the reader decides.
- No counts in red, no badges, no toasts, no sound, no notifications.
- One emphasis per screen: the "Co się dzieje?" sentence.
- Plain words. No "PR", "CI", "merge" or "label" in the five answers; they may appear only inside "Szczegóły". The glossary lives in `src/config/words.ts`, PL and EN side by side.
- Every page passes pa11y (WCAG 2.2 AA) and keyboard-only use; the gates are copied from news-interface.

## Article space

`src/content/pages/*.md` renders at `/<slug>` with the newsroom's article typography. `src/content/home.md` is the custom block on `/`. Markdown only: no components, no embeds, so a non-developer can edit it on GitHub.
