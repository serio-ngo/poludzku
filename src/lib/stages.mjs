// The stage engine: normalized GitHub evidence in, stage + health + mover out. Pure: no import, no network.
// Rules: .prd/stages.md. Evidence shape: emitted by src/lib/github.ts.

/**
 * @typedef {{ name: string, by?: string, at?: string }} Label
 * @typedef {{ name: string, conclusion: string|null, url?: string }} CheckItem
 * @typedef {{ state: string, body: string, commitId: string, at: string, author: string }} Review
 * @typedef {{ number: number, url: string, title: string, state: 'open'|'closed'|'merged', draft: boolean,
 *   author: string, authorIsBot: boolean, assignees: (string|null)[], requestedReviewers: string[], headSha: string,
 *   labels: Label[], closingIssues: number[], closingComplete: boolean, reviews: Review[], reviewsComplete: boolean,
 *   checks: { status: 'complete'|'incomplete'|'unavailable', items: CheckItem[] },
 *   lock: { verified: boolean, headSha: string, at: string, reviewCommit?: string }|null,
 *   testSubmission: { kind: 'marker'|'manual', at: string, verified: boolean }|null,
 *   deliverRun: { running: boolean, headSha: string, reviewAt: string, verified: boolean }|null }} Pr
 * @typedef {{ kind: 'issue'|'pr', number: number, title: string, body: string, url: string,
 *   state: 'open'|'closed'|'merged', stateReason: 'completed'|'not_planned'|'reopened'|null,
 *   labels: Label[], assignees: (string|null)[], author: string, updatedAt: string, topics: string[],
 *   config: { status: 'absent'|'valid'|'invalid'|'unavailable', stages?: { name: string|{pl: string, en: string}, label: string, mover: string }[] },
 *   spec: { hash: string, markers: { verdict: 'ready'|'questions', sha: string, at: string, verified: boolean }[],
 *     specOk: { present: boolean, at?: string, verified: boolean } },
 *   writeTests: { spec: string, at: string, runId?: number, verified: boolean }[],
 *   prs: Pr[], prsComplete: boolean,
 *   runs: { id: number, name: string, status: string, conclusion: string|null, headSha: string, prNumber?: number, taskNumber?: number, actorIsBot: boolean, url: string }[],
 *   viewer: string|null, partial: boolean }} Evidence  A kind 'pr' evidence carries its own PR in `prs`.
 * @typedef {{ kind: 'viewer'|'person'|'someone'|'agent'|'automation'|'nobody'|'unknown', login?: string }} Mover
 * @typedef {{ preset: 'lifecycle'|'generic'|'custom'|'unknown', outcome: 'open'|'done'|'closed',
 *   stage: { index: number, total: number, name?: * }|null, health: 'passing'|'pending'|'failed'|'parked'|'no-checks'|'unknown',
 *   mover: Mover, next: { index: number, name?: * }|null, evidence: { key: string, detail: string }[] }} Result
 * @typedef {Result & { stageNameKey: *, nextNameKey: *, healthGlyph: string, moverGlyph: string, stateGlyph: string }} View
 */

export const PRESETS = { lifecycle: { total: 7 }, generic: { total: 5 } };

const good = (c) => c === 'success' || c === 'neutral' || c === 'skipped';
const waiting = (c) => c == null || c === 'pending';
const latest = (list) => list.reduce((a, b) => (!a || b.at > a.at ? b : a), null);

/** @param {string} title @param {string} body @returns {Promise<string>} */
export async function specHash(title, body) {
  const bytes = new TextEncoder().encode(`${title}\n${body.replace(/\r\n/g, '\n')}`);
  const sum = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(sum)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 12);
}

/** @param {Evidence} ev @returns {Result} */
export function derive(ev) {
  const evidence = [];
  const note = (key, detail) => evidence.push({ key, detail });
  const isPr = ev.kind === 'pr';
  const cfg = ev.config ?? { status: 'unavailable' };
  const entries = cfg.status === 'valid' && cfg.stages?.length ? cfg.stages : null;
  const preset = entries ? 'custom' : cfg.status === 'absent' ? (ev.topics.includes('lifecycle') ? 'lifecycle' : 'generic') : 'unknown';
  const total = entries ? entries.length : (PRESETS[preset]?.total ?? 0);
  note('preset', preset);

  const outcome = ev.state === 'open' ? 'open' : (isPr ? ev.state === 'merged' : ev.stateReason === 'completed') ? 'done' : 'closed';
  if (outcome !== 'open') {
    note('outcome', `${ev.kind} ${ev.state}${ev.stateReason ? ` ${ev.stateReason}` : ''}`);
    const name = entries?.at(-1).name;
    return { preset, outcome, stage: outcome === 'done' && total ? { index: total, total, name } : null, health: 'unknown', mover: { kind: 'nobody' }, next: null, evidence };
  }

  // Active PR: object, null (known none) or undefined (unknown). Merged linked PRs never complete an open issue.
  const prs = ev.prs ?? [];
  const linked = prs.filter((p) => p.closingIssues.includes(ev.number));
  const open = linked.filter((p) => p.state === 'open');
  const pr = isPr
    ? prs.find((p) => p.number === ev.number)
    : !ev.prsComplete || linked.some((p) => !p.closingComplete) || open.length > 1
      ? undefined
      : (open[0] ?? (linked.some((p) => p.state === 'merged') ? undefined : null));
  note('pr', pr ? `#${pr.number}` : pr === null ? 'none' : 'unknown');

  // Only runs tied to the PR and its current head, or (before a PR exists) to the task, count.
  const runs = pr
    ? ev.runs.filter((r) => r.prNumber === pr.number && r.headSha === pr.headSha)
    : pr === null ? ev.runs.filter((r) => r.taskNumber === ev.number) : [];
  const live = runs.filter((r) => r.status !== 'completed');
  const items = pr?.checks.items ?? [];
  const labels = [...ev.labels, ...(pr?.labels ?? [])].map((l) => l.name);
  const deliver = pr?.deliverRun?.verified && pr.deliverRun.running && pr.deliverRun.headSha === pr.headSha;

  const bad = runs.some((r) => r.status === 'completed' && r.conclusion && !good(r.conclusion)) || items.some((i) => !good(i.conclusion) && !waiting(i.conclusion));
  const wait = live.length > 0 || deliver || items.some((i) => waiting(i.conclusion));
  const gap = pr === undefined || ev.partial || (pr && pr.checks.status !== 'complete');
  const health = labels.includes('needs-human') ? 'parked' : bad ? 'failed' : wait ? 'pending' : gap ? 'unknown' : items.length || runs.length ? 'passing' : 'no-checks';
  note('health', health);

  const named = (kind, login) => ({ kind: login && login === ev.viewer ? 'viewer' : kind, ...(login ? { login } : {}) });
  const person = (login) => named('person', login);
  const assignee = (list) => (list.length ? person(list[0]) : { kind: 'someone' }); // [null] = unreadable assignee
  const doer = pr?.authorIsBot ? { kind: 'agent' } : person(pr?.author);
  const reviewer = () => (pr.requestedReviewers.length ? person(pr.requestedReviewers[0]) : { kind: 'someone' });
  const agent = live.some((r) => r.actorIsBot) ? { kind: 'agent' } : null;
  const stage = (index, mover, why) => ({ index, mover, why });
  const unknown = (why) => stage(null, { kind: 'unknown' }, why);

  const lifecycle = () => {
    const m = latest(ev.spec.markers);
    if (m && !m.verified) return unknown('spec marker unverified');
    const cur = m?.sha === ev.spec.hash ? m : null; // an edited spec voids earlier markers
    if (cur?.verdict === 'questions' || (cur?.verdict !== 'ready' && labels.includes('spec-review'))) {
      return stage(2, agent ?? (cur ? person(ev.author) : { kind: 'unknown' }), 'spec review');
    }
    if (!cur) return stage(1, ev.assignees.length ? person(ev.assignees[0]) : { kind: 'nobody' }, 'no current spec review');
    const ok = ev.spec.specOk;
    if (!ok.verified) return unknown('spec-ok unverified');
    if (!ok.present) return stage(3, assignee(ev.assignees), 'ready, awaiting spec-ok');
    const approved = cur.at > (ok.at ?? '') ? cur.at : (ok.at ?? '');
    const contributor = () => agent ?? (pr?.assignees.length ? person(pr.assignees[0]) : pr?.authorIsBot ? doer : ev.assignees.length ? person(ev.assignees[0]) : { kind: 'unknown' });
    if (pr === undefined) return unknown('active pull request unknown');
    if (pr === null) return stage(4, contributor(), 'spec approved, no pull request');
    const sub = pr.testSubmission?.at >= approved ? pr.testSubmission : null;
    if (!sub) return ev.writeTests.some((w) => w.spec === ev.spec.hash) ? unknown('write-tests marker without submission') : stage(4, contributor(), 'spec approved');
    if (!sub.verified) return unknown('test submission unverified');
    const rev = latest(pr.reviews.filter((r) => /^tests-ok\b/i.test(r.body.trim()) && (r.state === 'COMMENTED' || r.state === 'APPROVED') && r.at >= sub.at));
    if (!rev) return pr.reviewsComplete ? stage(5, reviewer(), 'tests submitted') : unknown('reviews incomplete');
    const lk = pr.lock;
    const locked = lk?.verified && lk.headSha === pr.headSha && lk.at >= rev.at && (!lk.reviewCommit || lk.reviewCommit === rev.commitId);
    const dispatched = pr.draft && deliver && pr.deliverRun.reviewAt === rev.at && rev.commitId === pr.headSha;
    if (dispatched && !locked) { note('lock', 'unverified, deliver running'); return stage(6, { kind: 'agent' }, 'deliver dispatched'); }
    if (!locked) return unknown('tests-ok lock unverified');
    note('lock', `verified for ${pr.headSha}`);
    if (pr.draft) return stage(6, deliver ? { kind: 'agent' } : wait ? { kind: 'automation' } : pr.assignees.length ? person(pr.assignees[0]) : doer, 'tests approved, draft');
    return stage(7, bad ? doer : wait ? { kind: 'automation' } : reviewer(), 'tests approved, ready');
  };

  const generic = () => {
    if (pr === undefined) return unknown('active pull request unknown');
    if (pr === null) return stage(1, ev.assignees.length ? person(ev.assignees[0]) : { kind: 'nobody' }, 'no pull request');
    if (pr.draft) return stage(2, agent ?? doer, 'draft');
    if (!pr.reviewsComplete) return unknown('reviews incomplete');
    const cur = pr.reviews.filter((r) => r.state !== 'DISMISSED' && r.commitId === pr.headSha);
    if (cur.some((r) => r.state === 'CHANGES_REQUESTED' && !cur.some((o) => o.author === r.author && o.state === 'APPROVED' && o.at > r.at))) return stage(5, agent ?? doer, 'changes requested');
    if (cur.length) return stage(4, bad ? doer : reviewer(), 'review');
    if (bad || wait) return stage(3, bad ? doer : { kind: 'automation' }, 'checks');
    return gap ? unknown('checks incomplete') : stage(4, reviewer(), 'checks complete');
  };

  const custom = () => {
    if (pr === undefined) return unknown('active pull request unknown');
    const i = entries.findLastIndex((e) => labels.includes(e.label));
    if (i < 0) return unknown('no label matches');
    const mover = entries[i].mover;
    return stage(i + 1, bad && pr ? doer : (agent ?? (mover !== 'person' ? { kind: mover } : pr?.requestedReviewers.length ? reviewer() : assignee(ev.assignees))), `label ${entries[i].label}`);
  };

  const s = { custom, lifecycle, generic, unknown: () => unknown('config invalid or unavailable') }[preset]();
  note('stage', s.why);
  const mover = health === 'parked' ? assignee(ev.assignees) : s.mover;
  return {
    preset, outcome,
    stage: s.index ? { index: s.index, total, name: entries?.[s.index - 1].name } : null,
    health, mover,
    next: s.index && s.index < total ? { index: s.index + 1, name: entries?.[s.index].name } : null,
    evidence,
  };
}

const HEALTH = { passing: 'circle-check', pending: 'circle-dashed', failed: 'circle-alert', parked: 'circle-pause', 'no-checks': 'circle', unknown: 'circle-help' };
const MOVER = { viewer: 'avatar', person: 'avatar', someone: 'user-round', agent: 'bot', automation: 'cog', nobody: 'circle-off', unknown: 'circle-help' };

/** @param {Result} r @returns {View} */
export function present(r) {
  const key = (s) => (s ? (r.preset === 'custom' ? { custom: s.name } : `${r.preset}.${s.index}`) : null);
  const healthGlyph = HEALTH[r.health];
  const waitingOnPerson = ['viewer', 'person', 'someone'].includes(r.mover.kind) && ['passing', 'pending', 'no-checks'].includes(r.health);
  const stateGlyph = r.outcome === 'done' ? 'circle-check' : r.outcome === 'closed' ? 'circle-off' : waitingOnPerson ? 'hourglass' : healthGlyph;
  return { ...r, stageNameKey: key(r.stage), nextNameKey: key(r.next), healthGlyph, moverGlyph: MOVER[r.mover.kind], stateGlyph };
}
