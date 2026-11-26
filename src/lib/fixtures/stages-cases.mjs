// Invented evidence for the stage engine. Every name, number and hash here is made up.
export const TITLE = 'Add an article footer';
export const BODY = 'AC1: The footer appears on article pages.';
export const HASH = '4e3c31095063';
export const HEAD = 'a'.repeat(40);
export const NEW_HEAD = 'b'.repeat(40);
export const t = (n) => `2026-01-01T10:${String(n).padStart(2, '0')}:00Z`;

export const pr = (o = {}) => ({
  number: 7, url: 'https://github.com/przyklad/demo/pull/7', title: 'Footer', state: 'open', draft: true,
  author: 'ala', authorIsBot: false, assignees: [], requestedReviewers: [], headSha: HEAD, labels: [],
  closingIssues: [1], closingComplete: true, reviews: [], reviewsComplete: true,
  checks: { status: 'complete', items: [] }, lock: null, testSubmission: null, deliverRun: null, ...o,
});

export const issue = (o = {}) => ({
  kind: 'issue', number: 1, title: TITLE, body: BODY, url: 'https://github.com/przyklad/demo/issues/1',
  state: 'open', stateReason: null, labels: [], assignees: [], author: 'ala', updatedAt: t(0),
  topics: ['lifecycle'], config: { status: 'absent' },
  spec: { hash: HASH, markers: [], specOk: { present: false, verified: true } },
  writeTests: [], prs: [], prsComplete: true, runs: [], viewer: null, partial: false, ...o,
});

/** A standalone pull request task: its own PR sits in `prs`. */
export const standalone = (o = {}, p = {}) => ({
  ...issue({ kind: 'pr', number: 7, topics: [], ...o }), prs: [pr({ closingIssues: [], ...p })],
});

export const ready = { verdict: 'ready', sha: HASH, at: t(1), verified: true };
export const approvedSpec = {
  hash: HASH, markers: [ready], specOk: { present: true, at: t(2), verified: true },
};
export const bot = (o = {}) => ({
  id: 1, name: 'write-tests', status: 'in_progress', conclusion: null, headSha: HEAD, taskNumber: 1,
  actorIsBot: true, url: 'https://github.com/przyklad/demo/actions/runs/1', ...o,
});
export const submission = { kind: 'marker', at: t(3), verified: true };
export const testsOk = (o = {}) => ({ state: 'COMMENTED', body: 'tests-ok', commitId: HEAD, at: t(4), author: 'bo', ...o });
export const lock = (o = {}) => ({ verified: true, headSha: HEAD, at: t(5), reviewCommit: HEAD, ...o });
export const marker = { spec: HASH, at: t(3), runId: 1, verified: true };

// Named Lifecycle cases (stages.md fixture table).
export const writerRunning = issue({ spec: approvedSpec, labels: [{ name: 'spec-ok' }], runs: [bot()] });
export const markerSubmitted = issue({
  spec: approvedSpec, writeTests: [marker], prs: [pr({ testSubmission: submission })],
});
export const manualSubmitted = issue({
  spec: approvedSpec, prs: [pr({ testSubmission: { kind: 'manual', at: t(3), verified: true } })],
});
export const draftReviewed = issue({
  spec: approvedSpec, writeTests: [marker],
  prs: [pr({ testSubmission: submission, reviews: [testsOk()], lock: lock() })],
});
export const dispatched = issue({
  spec: approvedSpec, writeTests: [marker],
  prs: [pr({
    testSubmission: submission, reviews: [testsOk()], lock: lock({ at: t(3) }),
    deliverRun: { running: true, headSha: HEAD, reviewAt: t(4), verified: true },
  })],
});
export const readyNewHead = issue({
  spec: approvedSpec, writeTests: [marker],
  prs: [pr({
    draft: false, headSha: NEW_HEAD, testSubmission: submission, reviews: [testsOk()],
    lock: lock({ headSha: NEW_HEAD, at: t(6) }),
  })],
});
export const parkedAcceptance = issue({
  ...readyNewHead, labels: [{ name: 'needs-human' }],
  prs: [{ ...readyNewHead.prs[0], checks: { status: 'complete', items: [{ name: 'ci', conclusion: 'success' }] } }],
});
