export const PRESETS = { lifecycle: { total: 7 }, generic: { total: 5 } };

const good = (c) => c === 'success' || c === 'neutral' || c === 'skipped';
const waiting = (c) => c == null || c === 'pending';
const latest = (list) => list.reduce((a, b) => (!a || b.at > a.at ? b : a), null);

export async function specHash(title, body) {
  const bytes = new TextEncoder().encode(`${title}\n${body.replace(/\r\n/g, '\n')}`);
  const sum = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(sum)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 12);
}

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

  const prs = ev.prs ?? [];
  const linked = prs.filter((p) => p.closingIssues.includes(ev.number));
  const open = linked.filter((p) => p.state === 'open');
  const pr = isPr
    ? prs.find((p) => p.number === ev.number)
    : !ev.prsComplete || linked.some((p) => !p.closingComplete) || open.length > 1
      ? undefined
      : (open[0] ?? (linked.some((p) => p.state === 'merged') ? undefined : null));
  note('pr', pr ? `#${pr.number}` : pr === null ? 'none' : 'unknown');

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
  const assignee = (list) => (list.length ? person(list[0]) : { kind: 'someone' });
  const doer = pr?.authorIsBot ? { kind: 'agent' } : person(pr?.author);
  const reviewer = () => (pr.requestedReviewers.length ? person(pr.requestedReviewers[0]) : { kind: 'someone' });
  const agent = live.some((r) => r.actorIsBot) ? { kind: 'agent' } : null;
  const stage = (index, mover, why) => ({ index, mover, why });
  const unknown = (why) => stage(null, { kind: 'unknown' }, why);

  const lifecycle = () => {
    const m = latest(ev.spec.markers);
    if (m && !m.verified) return unknown('spec marker unverified');
    const cur = m?.sha === ev.spec.hash ? m : null;
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

export function present(r) {
  const key = (s) => (s ? (r.preset === 'custom' ? { custom: s.name } : `${r.preset}.${s.index}`) : null);
  const healthGlyph = HEALTH[r.health];
  const waitingOnPerson = ['viewer', 'person', 'someone'].includes(r.mover.kind) && ['passing', 'pending', 'no-checks'].includes(r.health);
  const stateGlyph = r.outcome === 'done' ? 'circle-check' : r.outcome === 'closed' ? 'circle-off' : waitingOnPerson ? 'hourglass' : healthGlyph;
  return { ...r, stageNameKey: key(r.stage), nextNameKey: key(r.next), healthGlyph, moverGlyph: MOVER[r.mover.kind], stateGlyph };
}
