# Interface

Present one task per screen and one list per project. Use a compact register row, a monospaced state word, and a marker for the viewer's own moves. Use local design tokens for type, spacing, colour, and focus. Prioritize the answer to “What is happening?” with the most prominent type on the task page.

## Task screen

Show the breadcrumb and full GitHub task title, then the five answers in order. The following two views use the same synthetic task.

| Answer | PL | EN |
| --- | --- | --- |
| What is happening? | Agent przygotowuje testy. | An agent is preparing the tests. |
| Which stage? | 4 z 7 · Testy | 4 of 7 · Tests |
| Is it fine? | Praca trwa. | Work is in progress. |
| Whose move? | Agent | Agent |
| What next? | Potem ktoś sprawdzi testy. | A reviewer checks the tests next. |

```text
Przykładowy projekt › #42
Dodanie stopki do artykułu

Co się dzieje?
Agent przygotowuje testy.

○ ○ ○ ● ○ ○ ○
4 z 7 · Testy

Czy wszystko w porządku?
Praca trwa.
Czyj ruch?
Agent
Co dalej?
Potem ktoś sprawdzi testy.

Otwórz na GitHubie ↗
▸ Szczegóły
Stan z 10:42 · Odśwież
```

Use one dot per configured stage and a label containing the current number, total, and stage name. The labelled stage carries the meaning for assistive technology. Keep the dots decorative. Use a text answer for an unknown stage or terminal outcome. The next answer names a supported action or checkpoint. Completed work needs no action. If progress evidence is unavailable, say so without guessing the next step.

Name the viewer as “Ty” / “You” only when the verified viewer identity matches the mover. Otherwise use a known person's display name or login, a generic person at an unassigned manual gate, the localized agent or automation word, or “Nikt” / “Nobody” where nobody can act. Reserve an unknown mover label for unavailable evidence.

Only “Szczegóły” / “Details” shows technical evidence. Use the native folded element with short localized labels and source links for checks, reviews, labels, and linked pull requests. Commits and deployments appear as links there. Raw logs remain on GitHub. Keep the main GitHub action a normal link.

## Project list

Use one row per canonical task. Show the task number, state word, stage name, full title, and mover in the same order. Rows assigned to people come first, followed by other rows, with most recent activity first within each group. Add a marker and a visible “Twój ruch” / “Your move” cue on a row when the viewer can act. Use one line when space allows, and wrap on small screens. Keep one list and no filters in the first release.

| List state | PL | EN |
| --- | --- | --- |
| Waiting for a move | czeka | waiting |
| Work or checks underway | w pracy | working |
| Parked or failed | stoi | stuck |
| Completed | gotowe | done |
| Closed without completion | zamknięte | closed |
| Insufficient evidence | brak danych | unknown |

The task screen can explain whether a stuck task was parked or failed. Successful checks, current failures, pending work, a verified empty check set, and unavailable checks have distinct health text. Missing evidence can be “Brak danych o sprawdzeniach” / “Check results unavailable.”

## Accessibility and freshness

- Use short headings, consistent page order, full title text, visible focus, and a logical keyboard sequence. Use words and numbers as well as colour. Hide unavailable controls and explain an unavailable view in text.
- Keep the screen usable on a narrow mobile viewport and with text enlarged. Let text and the dot strip wrap in source order. Links and the details summary remain operable with the keyboard. Check contrast, focus order, language metadata, and WCAG 2.2 AA with automated and manual checks.
- Display the snapshot time and a reload link. The reader controls when it reloads. Use a colour transition of at most 150 ms and disable it when reduced motion is requested. Keep notifications, animation, modals, and sounds out of the task experience.
- Use familiar words in the five answers. Keep technical terms in details and define them in the shared PL and EN glossary.
- Test keyboard access and mobile reflow before release. Validate usability with neurodivergent readers before making claims about accessibility for that audience.

## Article space

`src/content/pages/*.md` provides articles at `/<slug>` with the site's article typography. The custom home block comes from `src/content/home.md`. Keep content in Markdown with no components or embeds, so editors can update it directly. The matching EN routes use English content.
