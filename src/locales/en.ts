import type { Dict, View } from "./index.ts"

const open = (v: View) => v.outcome === "open"

const en: Dict = {
  glyph: {
    hourglass: { word: "waiting" },
    "circle-dashed": { word: "working" },
    "circle-check": { word: "checks passed" },
    "circle-alert": { word: "stuck, a check failed" },
    "circle-pause": { word: "stuck, parked" },
    circle: { word: "no checks" },
    "circle-help": { word: "unknown" },
    viewer: { word: "You" },
    person: { word: "login" },
    "user-round": { word: "someone" },
    bot: { word: "agent" },
    cog: { word: "automation" },
    "circle-off": { word: "nobody" },
    "arrow-right": { word: "what next" },
    "external-link": { word: "Open on GitHub" },
    "refresh-cw": { word: "Reload" },
    "chevron-right": { word: "Details" },
    "log-in": { word: "Sign in" },
    "log-out": { word: "Sign out" },
    scale: { word: "Terms" },
    lock: { word: "No access" },
    "cloud-off": { word: "GitHub not responding" },
    "git-branch": { word: "No task" },
    "search-x": { word: "Page not found" },
    inbox: { word: "Nothing waiting" },
    ellipsis: { word: "List incomplete" },
  },
  legend: [
    "hourglass", "circle-dashed", "circle-check", "circle-alert", "circle-pause", "circle", "circle-help",
    "viewer", "person", "user-round", "bot", "cog", "circle-off", "arrow-right", "external-link",
    "refresh-cw", "chevron-right", "log-in", "log-out", "scale",
  ],
  stages: {
    lifecycle: {
      1: "Task description", 2: "Description review", 3: "Description approval", 4: "Tests",
      5: "Test approval", 6: "Code", 7: "Acceptance",
    },
    generic: { 1: "Task", 2: "In progress", 3: "Checks", 4: "Review", 5: "Revisions" },
  },
  mover: { viewer: "You", someone: "someone", agent: "agent", automation: "automation", nobody: "nobody", unknown: "unknown" },
  outcome: { done: "done", closed: "closed" },
  stripLabel: (index, total, name) => `${index} of ${total} · ${name}`,
  answers: {
    happening: (v) =>
      (v.outcome === "done" ? "The change is in. Nobody needs to do anything."
      : v.outcome === "closed" ? "The task was closed without a change. Nobody needs to do anything."
      : v.mover.kind === "agent" ? "An agent is working on the task."
      : v.mover.kind === "automation" ? "Automation is checking the change."
      : v.mover.kind === "viewer" ? "The task is waiting for you."
      : v.mover.kind === "person" || v.mover.kind === "someone" ? "The task is waiting for a person."
      : v.mover.kind === "nobody" ? "Nobody is working on the task right now."
      : "It is not clear what is happening."),
    stage: (v, name) =>
      v.outcome === "done" ? "All stages are behind it."
      : v.outcome === "closed" ? "The task was closed before the end."
      : v.stage ? `Stage ${v.stage.index} of ${v.stage.total}: ${name}.`
      : "It is not clear which stage this is.",
    health: (v) =>
      !open(v) ? "Nothing to check."
      : v.health === "passing" ? "Yes. The checks passed."
      : v.health === "pending" ? "Work is underway."
      : v.health === "failed" ? "No. A check failed."
      : v.health === "parked" ? "Parked, waiting for a person."
      : v.health === "no-checks" ? "No checks were reported."
      : "Not known. No data.",
    mover: (v, login) =>
      v.mover.kind === "viewer" ? "The move is yours."
      : v.mover.kind === "person" ? `The move is ${login ?? v.mover.login ?? "someone's"}.`
      : v.mover.kind === "someone" ? "Someone has the move."
      : v.mover.kind === "agent" ? "The agent has the move."
      : v.mover.kind === "automation" ? "Automation has the move."
      : v.mover.kind === "nobody" ? "Nobody needs to do anything."
      : "It is not clear whose move it is.",
    next: (v, name) =>
      !open(v) ? "Nothing next."
      : v.next ? `Next stage: ${name}.`
      : "It is not clear what comes next.",
  },
  unavailable: {
    noAccess: "No access",
    unavailable: "GitHub not responding",
    expired: "Session expired",
    noTask: "No task",
    notFound: "Page not found",
    empty: "Nothing waiting",
    partial: "List incomplete",
  },
  details: {
    happening: "What is happening?",
    stage: "Which stage?",
    health: "Is everything all right?",
    mover: "Whose move?",
    next: "What next?",
    checks: "Checks (CI)",
    reviews: "Reviews",
    labels: "Labels",
    linked: "Linked tasks and PRs",
    commits: "Commits",
    deployments: "Deployments",
  },
  tagline: { before: "Whose ", marked: "move", after: "?" },
  entry: { label: "owner/repo or a GitHub address", placeholder: "owner/repo", button: "Open", preview: "Example stage board" },
  board: { mine: "Your move", all: "All" },
  cells: { mover: "Move", checks: "Checks", next: "Next", yours: "Yours" },
  footer: { publisher: "Fundacja Serio", terms: "Terms", source: "Source code" },
  nav: { lang: "PL", home: "Home" },
  readAt: (time) => `Read at ${time}`,
}

export default en
