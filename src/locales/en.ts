import type { Dict, View } from "./index.ts"

const NOTES: Record<string, Record<number, Partial<Record<"agent" | "person" | "automation", string>>>> = {
  lifecycle: {
    1: { agent: "An agent is writing the description.", person: "Someone is writing the description." },
    2: { agent: "An agent is reviewing the description.", person: "Someone is answering questions about the description." },
    3: { person: "Someone is approving the description." },
    4: { agent: "An agent is preparing the tests.", person: "Someone is preparing the tests.", automation: "Automation is checking the tests." },
    5: { person: "Someone is reviewing the tests." },
    6: { agent: "An agent is writing the code.", person: "Someone is writing the code.", automation: "Automation is checking the code." },
    7: { agent: "An agent is fixing the change.", person: "Someone is reviewing the change.", automation: "Automation is checking the change." },
  },
  generic: {
    1: { agent: "An agent is starting the task.", person: "Someone is starting the task." },
    2: { agent: "An agent is working on the change.", person: "Someone is working on the change." },
    3: { automation: "Automation is checking the change.", person: "Someone is fixing the change.", agent: "An agent is fixing the change." },
    4: { person: "Someone is reviewing the change.", automation: "Automation is checking the change." },
    5: { agent: "An agent is fixing the change.", person: "Someone is fixing the change." },
  },
}

const note = (v: View) =>
  v.outcome === "open" && v.stage ? NOTES[v.preset]?.[v.stage.index]?.[v.mover.kind === "someone" || v.mover.kind === "person" ? "person" : v.mover.kind as "agent"] : undefined

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
      note(v) ?? (v.outcome === "done" ? "The change is in. Nobody needs to do anything."
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
  sample: "Example",
  tagline: { before: "One task. ", marked: "Whose move.", after: " What next." },
  entry: { label: "owner/repo or a GitHub address", placeholder: "owner/repo", button: "Open" },
  footer: { publisher: "Fundacja Serio", terms: "Terms", licence: "MIT licence", source: "Source code" },
  nav: { lang: "PL" },
  readAt: (time) => `Read at ${time}`,
}

export default en
