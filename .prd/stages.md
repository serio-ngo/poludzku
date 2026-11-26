# Stages

A stage is derived, never stored. Labels alone do not tell the stage: in the Serio lifecycle three of seven stages are set by a review, a draft flag or a running workflow, not a label. The engine reads all signals and returns one result.

```ts
derive(task) -> { stage: 1..7 | 'done', state: 'now' | 'working' | 'fail' | 'done', mover: 'person' | 'agent' | 'ci' | 'none', who?: login, note, next }
```

One pure function in plain JavaScript (`src/lib/stages.mjs`), unit-tested, no import and no network inside it. Its first version is a port of `derive()` in `serio-ngo/ops` `lifecycle/console-mcp.mjs`, which already computes the stage and the person's next action for the lifecycle console, including the cloud and by-hand lanes. After the port the console loads this file from `serio-ngo/poludzku` `main` through `gh api` and drops its own copy; two copies would drift. `main` is protected by a human-only ruleset, so the loaded file is as trusted as the console.

## Agents of any kind

A task's mover is `agent` when the latest actor on it is a GitHub `Bot` and a workflow run is in progress or the bot's pull request is a draft. This one rule covers the Serio `serio-agent[bot]`, Claude Code's action, GitHub Copilot's coding agent and Codex alike. GitHub offers no read API for Copilot agent session state ([community discussion 185347](https://github.com/orgs/community/discussions/185347), January 2026), so drafts and running workflows are the only portable signal.

## Serio preset

Source: `serio-ngo/ops` `lifecycle/DESIGN.md`, "One task".

| #   | Stage (PL)           | Signals                                                                       | Whose move                                                            |
| --- | -------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | Opis zadania         | Open issue; no `spec-review` label, no review marker                          | assignee, or `nikt` when unassigned                                   |
| 2   | Przegląd opisu       | Label `spec-review`; comment `<!-- spec-review v1 … verdict=… -->`            | `agent` while a run works; the author when the verdict is `questions` |
| 3   | Zatwierdzenie opisu  | Latest marker `verdict=ready` for the current text; no `spec-ok`              | person (gate 1)                                                       |
| 4   | Testy                | Label `spec-ok`; draft pull request on `agent/<N>-…` or a running workflow    | `agent`                                                               |
| 5   | Zatwierdzenie testów | Draft pull request with tests; no review starting `tests-ok`                  | person (gate 2)                                                       |
| 6   | Kod                  | Review `tests-ok` exists; workflow running or pull request not ready          | `agent`; `automat` while checks run                                   |
| 7   | Odbiór               | Ready pull request after `tests-ok`; checks and the acceptance report comment | person (gate 3); `agent` during a fix run                             |
| —   | Gotowe               | Pull request merged or issue closed as completed                              | `nikt`                                                                |

`needs-human` on the issue or pull request sets `state: 'fail'` at the current stage and the move to the assignee. The note then comes from the last line of the `<!-- lifecycle-status v1 -->` comment, which the lifecycle already writes in plain words (`Now:` / `Next:`). A stage note is that text when it exists; the engine's own sentence is the fallback.

## Generic preset

For repositories outside the lifecycle. Detected when the repository has no `lifecycle` topic and no `.github/poludzku.yml`.

| #   | Stage       | Signals                                                                          | Whose move         |
| --- | ----------- | -------------------------------------------------------------------------------- | ------------------ |
| 1   | Zadanie     | Open issue, no linked pull request                                               | assignee or `nikt` |
| 2   | W pracy     | Draft pull request, or open pull request with commits newer than the last review | author             |
| 3   | Sprawdzanie | Checks pending                                                                   | `automat`          |
| 4   | Przegląd    | Checks green, review requested or none yet                                       | requested reviewer |
| 5   | Poprawki    | Changes requested, or checks red                                                 | author             |
| —   | Gotowe      | Merged, or issue closed as completed                                             | `nikt`             |

## Labels of another team

A team maps its own labels in `.github/poludzku.yml` at the default branch: `stages: [{ name, label, mover }]`. Only labels are mappable; reviews, checks and drafts keep their meaning. No file means the generic preset. The file is read, never written.

## Process stage versus technical state

The stage comes from the process (labels, markers, reviews). "Czy wszystko w porządku?" comes only from checks, workflow conclusions and `needs-human`. A task at stage 7 with red checks reads "Odbiór · coś się zatrzymało", never a lower stage.

## Tests

Fixtures are recorded GitHub API responses for every row of both presets plus: unassigned task, spec edited after `spec-ok`, two fix runs then `needs-human`, merged pull request whose issue stays open, pull request without `Fixes #N`.
