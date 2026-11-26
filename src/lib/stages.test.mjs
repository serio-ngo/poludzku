import test from 'node:test';
import assert from 'node:assert/strict';
import { derive, present, specHash, PRESETS } from './stages.mjs';
import * as f from './fixtures/stages-cases.mjs';

const { issue, pr, standalone, t, HEAD, NEW_HEAD, HASH } = f;
const fail = [{ name: 'ci', conclusion: 'failure' }];
const pass = [{ name: 'ci', conclusion: 'success' }];
const wait = [{ name: 'ci', conclusion: null }];
const first = (ev, p) => ({ ...ev, prs: [{ ...ev.prs[0], ...p }] });

// stage, health, mover kind (undefined = not asserted); stage null = unknown
function is(ev, stage, health, mover) {
  const r = derive(ev);
  assert.equal(r.stage?.index ?? null, stage, `stage: ${JSON.stringify(r.evidence)}`);
  if (health) assert.equal(r.health, health);
  if (mover) assert.equal(r.mover.kind, mover);
  return r;
}

test('hash vector and presets', async () => {
  assert.equal(await specHash(f.TITLE, f.BODY), '4e3c31095063');
  assert.equal(await specHash('a', 'x\r\ny'), await specHash('a', 'x\ny'));
  assert.deepEqual([PRESETS.lifecycle.total, PRESETS.generic.total], [7, 5]);
});

test('lifecycle stages 1-3', () => {
  const r = is(issue(), 1, undefined, 'nobody');
  assert.equal(r.stage.total, 7);
  assert.equal(r.next.index, 2);
  is(issue({ assignees: ['bo'] }), 1, undefined, 'person');
  is(issue({ labels: [{ name: 'spec-review' }] }), 2);
  const q = { ...f.ready, verdict: 'questions' };
  const r2 = is(issue({ spec: { ...issue().spec, markers: [q] } }), 2, undefined, 'person');
  assert.equal(r2.mover.login, 'ala');
  is(issue({ spec: { ...issue().spec, markers: [f.ready] } }), 3, undefined, 'someone');
  is(issue({ spec: { ...issue().spec, markers: [{ ...f.ready, verified: false }] } }), null, undefined, 'unknown');
  is(issue({ spec: { ...f.approvedSpec, specOk: { present: true, verified: false } } }), null);
});

test('fixture table: stages 4-7', () => {
  is(f.writerRunning, 4, 'pending', 'agent');
  is(f.markerSubmitted, 5, undefined, 'someone');
  is(first(f.markerSubmitted, { requestedReviewers: ['cy'] }), 5, undefined, 'person');
  is(f.manualSubmitted, 5, undefined, 'someone');
  is(f.draftReviewed, 6);
  const d = is(f.dispatched, 6, 'pending', 'agent');
  assert.ok(d.evidence.some((e) => e.key === 'lock' && /unverified/.test(e.detail)));
  is(f.readyNewHead, 7);
  is(f.parkedAcceptance, 7, 'parked', 'someone');
  assert.equal(derive(f.parkedAcceptance).mover.login, undefined);
});

test('dispatch must belong to this review, pull request and head', () => {
  const run = f.dispatched.prs[0].deliverRun;
  for (const deliverRun of [{ ...run, reviewAt: t(9) }, { ...run, headSha: NEW_HEAD }, { ...run, verified: false }, { ...run, running: false }, null]) {
    is(first(f.dispatched, { deliverRun }), null, undefined, 'unknown');
  }
});

test('unverified lock leaves approval unknown', () => {
  const base = f.readyNewHead;
  for (const lk of [null, f.lock({ headSha: HEAD, at: t(6) }), f.lock({ headSha: NEW_HEAD, verified: false }), f.lock({ headSha: NEW_HEAD, at: t(3) }), f.lock({ headSha: NEW_HEAD, at: t(6), reviewCommit: NEW_HEAD })]) {
    is(first(base, { lock: lk }), null);
  }
});

test('invalidation: edited spec, dismissed review, replaced pull request, stale review', () => {
  is({ ...f.draftReviewed, spec: { ...f.approvedSpec, hash: 'ffffffffffff' } }, 1, undefined, 'nobody');
  is(first(f.draftReviewed, { reviews: [f.testsOk({ state: 'DISMISSED' })] }), 5);
  is(first(f.draftReviewed, { reviews: [f.testsOk({ state: 'CHANGES_REQUESTED' })] }), 5);
  is(first(f.draftReviewed, { reviews: [f.testsOk({ at: t(2) })] }), 5); // before the submission
  is(first(f.draftReviewed, { reviews: [f.testsOk({ body: 'tests-okay' })] }), 5);
  const replaced = { ...f.draftReviewed, prs: [pr({ number: 8, headSha: NEW_HEAD })] };
  is(replaced, null); // the old write-tests marker no longer links to a submission
  is({ ...replaced, writeTests: [] }, 4);
  is(first(f.draftReviewed, { testSubmission: { ...f.submission, at: t(0) } }), null); // marker, but the submission predates approval
  is({ ...first(f.draftReviewed, { testSubmission: { ...f.submission, at: t(0) } }), writeTests: [] }, 4); // earlier than approval
  is(first(f.draftReviewed, { testSubmission: { ...f.submission, verified: false } }), null);
  is(first(f.markerSubmitted, { testSubmission: null }), null); // marker alone
  is(first(f.draftReviewed, { reviewsComplete: false, reviews: [] }), null);
});

test('health stays separate from stage', () => {
  const checks = (items) => first(f.readyNewHead, { checks: { status: 'complete', items } });
  is(checks(fail), 7, 'failed', 'person');
  assert.equal(derive(checks(fail)).mover.login, 'ala');
  is(checks(wait), 7, 'pending', 'automation');
  is(checks(pass), 7, 'passing', 'someone');
  is(checks([]), 7, 'no-checks');
  is(first(f.readyNewHead, { checks: { status: 'incomplete', items: pass } }), 7, 'unknown');
  is(first(f.readyNewHead, { checks: { status: 'unavailable', items: [] } }), 7, 'unknown');
  is(first(f.readyNewHead, { checks: { status: 'incomplete', items: fail } }), 7, 'failed');
  is({ ...f.parkedAcceptance, prs: [{ ...f.parkedAcceptance.prs[0], checks: { status: 'complete', items: fail } }] }, 7, 'parked');
  is({ ...f.readyNewHead, partial: true }, 7, 'unknown');
});

test('terminal outcomes beat everything', () => {
  const parked = [{ name: 'needs-human' }];
  is(issue({ state: 'closed', stateReason: 'completed', labels: parked }), 7, 'unknown', 'nobody');
  assert.equal(derive(issue({ state: 'closed', stateReason: 'completed' })).outcome, 'done');
  const c = derive(issue({ state: 'closed', stateReason: 'not_planned' }));
  assert.deepEqual([c.outcome, c.stage, c.next], ['closed', null, null]);
  assert.equal(derive(issue({ state: 'closed', stateReason: null })).outcome, 'closed');
  assert.equal(derive(issue({ stateReason: 'reopened' })).outcome, 'open');
  const m = derive(standalone({ state: 'merged', labels: parked }));
  assert.deepEqual([m.outcome, m.mover.kind, m.next], ['done', 'nobody', null]);
  assert.equal(derive(standalone({ state: 'closed' })).outcome, 'closed');
});

test('linked pull request selection', () => {
  const base = { spec: f.approvedSpec };
  is(issue({ ...base, prs: [pr(), pr({ number: 8 })] }), null, 'unknown'); // several open
  is(issue({ ...base, prs: [pr()], prsComplete: false }), null);
  is(issue({ ...base, prs: [pr({ closingComplete: false })] }), null);
  is(issue({ ...base, prs: [pr({ closingIssues: [] })] }), 4, 'no-checks'); // no usable closing reference
  is(issue({ ...base, prs: [pr({ state: 'merged' })] }), null); // merged, issue still open
  is(issue({ ...base, prs: [pr({ state: 'merged' }), pr({ number: 9 })] }), 4);
  const closed = pr({ number: 8, state: 'closed', checks: { status: 'complete', items: fail }, labels: [{ name: 'needs-human' }] });
  is(issue({ ...base, prs: [closed] }), 4, 'no-checks'); // closed unmerged supplies no signals
  is(issue({ ...base, prs: [closed, pr({ number: 9, testSubmission: f.submission })] }), 5, 'no-checks');
});

test('runs count only when correlated', () => {
  const spec = { spec: f.approvedSpec };
  is(issue({ ...spec, runs: [f.bot({ taskNumber: 2 })] }), 4, 'no-checks');
  is(issue({ ...spec, runs: [f.bot({ taskNumber: undefined })] }), 4, 'no-checks');
  const withPr = (run) => issue({ ...spec, prs: [pr()], runs: [run] });
  is(withPr(f.bot({ prNumber: 7 })), 4, 'pending', 'agent');
  is(withPr(f.bot({ prNumber: 7, headSha: NEW_HEAD })), 4, 'no-checks');
  is(withPr(f.bot({ prNumber: 8 })), 4, 'no-checks');
  is(withPr(f.bot({ prNumber: 7, status: 'completed', conclusion: 'failure' })), 4, 'failed');
  // same title, two tasks, a run correlated with task 1 only
  const runs = [f.bot()];
  const one = issue({ spec: f.approvedSpec, runs });
  const two = issue({ spec: f.approvedSpec, runs, number: 2 });
  assert.equal(derive(one).mover.kind, 'agent');
  assert.notEqual(derive(two).mover.kind, 'agent');
  assert.equal(derive(two).health, 'no-checks');
});

test('movers: viewer and unreadable assignee', () => {
  const parked = [{ name: 'needs-human' }];
  const v = derive(issue({ labels: parked, assignees: ['bo'], viewer: 'bo' }));
  assert.deepEqual(v.mover, { kind: 'viewer', login: 'bo' });
  const u = derive(issue({ labels: parked, assignees: [null] }));
  assert.deepEqual(u.mover, { kind: 'person' });
  assert.equal(derive(issue({ labels: parked })).mover.kind, 'someone');
  assert.equal(derive(issue({ labels: parked, assignees: ['bo'] })).mover.login, 'bo');
});

test('generic preset', () => {
  const g = (p, o) => issue({ topics: [], prs: [pr(p)], ...o });
  const r = is(issue({ topics: [] }), 1, undefined, 'nobody');
  assert.equal(r.stage.total, 5);
  is(g({ draft: true, checks: { status: 'complete', items: fail } }), 2, 'failed', 'person');
  is(g({ draft: true, authorIsBot: true }), 2, undefined, 'agent');
  is(g({ draft: false, checks: { status: 'complete', items: wait } }), 3, 'pending', 'automation');
  is(g({ draft: false, checks: { status: 'complete', items: fail } }), 3, 'failed', 'person');
  is(g({ draft: false, checks: { status: 'complete', items: pass }, requestedReviewers: ['cy'] }), 4, 'passing', 'person');
  const rev = (o) => ({ state: 'COMMENTED', body: 'x', commitId: HEAD, at: t(1), author: 'cy', ...o });
  const withRev = (reviews, items = fail) => g({ draft: false, reviews, checks: { status: 'complete', items } });
  is(withRev([rev()]), 4, 'failed', 'person'); // review evidence stays 4 when checks fail
  is(withRev([rev({ state: 'CHANGES_REQUESTED' })]), 5, 'failed', 'person');
  is(withRev([rev({ state: 'CHANGES_REQUESTED', commitId: NEW_HEAD })], pass), 4); // new head invalidates
  is(withRev([rev({ state: 'CHANGES_REQUESTED', commitId: NEW_HEAD })], pass), 4);
  is(withRev([rev({ state: 'CHANGES_REQUESTED' }), rev({ state: 'APPROVED', at: t(2) })], pass), 4); // superseded
  is(withRev([rev({ state: 'CHANGES_REQUESTED', at: t(2) }), rev({ state: 'APPROVED' })], pass), 5);
  is(withRev([rev({ state: 'CHANGES_REQUESTED' }), rev({ state: 'DISMISSED' })], pass), 5);
  is(withRev([rev({ state: 'DISMISSED' })], pass), 4);
  // no checks configured vs unreadable checks
  is(g({ draft: false }), 4, 'no-checks');
  is(g({ draft: false, checks: { status: 'incomplete', items: [] } }), null, 'unknown');
  is(g({ draft: false, checks: { status: 'unavailable', items: [] } }), null, 'unknown');
  is(g({ draft: false, reviewsComplete: false }), null);
  is(g({ draft: false, closingIssues: [] }, { number: 5 }), 1); // issue 5 is not linked
  // a standalone pull request is itself the task
  is(standalone({}, { draft: false, assignees: ['dy'] }), 4);
  is(standalone({ labels: [{ name: 'needs-human' }], assignees: ['dy'] }, {}), 2, 'parked', 'person');
});

test('custom labels', () => {
  const stages = [
    { name: { pl: 'Pomysł', en: 'Idea' }, label: 'idea', mover: 'nobody' },
    { name: 'Build', label: 'build', mover: 'agent' },
    { name: 'Look', label: 'look', mover: 'person' },
  ];
  const c = (o) => issue({ topics: ['lifecycle'], config: { status: 'valid', stages }, ...o });
  const r = is(c({ labels: [{ name: 'idea' }, { name: 'build' }] }), 2, undefined, 'agent');
  assert.deepEqual([r.preset, r.stage.total, r.stage.name, r.next.index], ['custom', 3, 'Build', 3]);
  is(c({ labels: [{ name: 'build' }, { name: 'idea' }] }), 2); // last in declared order
  is(c({ labels: [{ name: 'idea' }] }), 1, undefined, 'nobody');
  const l = is(c({ labels: [{ name: 'look' }] }), 3, undefined, 'someone');
  assert.equal(l.next, null);
  is(c({ labels: [{ name: 'other' }] }), null);
  is(c({ prs: [pr({ labels: [{ name: 'look' }], requestedReviewers: ['cy'] })] }), 3, 'no-checks', 'person');
  is(c({ labels: [{ name: 'look' }], prs: [pr(), pr({ number: 8 })] }), null);
  const bad = c({ labels: [{ name: 'look' }], prs: [pr({ checks: { status: 'complete', items: fail } })] });
  is(bad, 3, 'failed', 'person');
  assert.equal(derive(c({ state: 'closed', stateReason: 'completed' })).stage.index, 3);
  for (const status of ['invalid', 'unavailable']) {
    const u = is(issue({ config: { status } }), null, undefined, 'unknown');
    assert.deepEqual([u.preset, u.next], ['unknown', null]);
  }
  is(issue({ config: { status: 'valid', stages: [] } }), null);
  assert.equal(derive(issue({ topics: [], config: { status: 'valid', stages } })).preset, 'custom');
});

test('present picks glyphs and name keys', () => {
  const v = present(derive(f.writerRunning));
  assert.deepEqual([v.stageNameKey, v.nextNameKey, v.healthGlyph, v.moverGlyph, v.stateGlyph], ['lifecycle.4', 'lifecycle.5', 'circle-dashed', 'bot', 'circle-dashed']);
  const w = present(derive(f.markerSubmitted));
  assert.deepEqual([w.moverGlyph, w.stateGlyph], ['user-round', 'hourglass']);
  const p = present(derive(f.parkedAcceptance));
  assert.deepEqual([p.healthGlyph, p.stateGlyph, p.nextNameKey], ['circle-pause', 'circle-pause', null]);
  assert.equal(present(derive(issue({ assignees: ['bo'], viewer: 'bo' }))).moverGlyph, 'avatar');
  assert.equal(present(derive(issue({ topics: [], state: 'closed', stateReason: 'not_planned' }))).stateGlyph, 'circle-off');
  assert.equal(present(derive(standalone({ state: 'merged' }))).stateGlyph, 'circle-check');
  assert.equal(present(derive(issue({ config: { status: 'invalid' } }))).stageNameKey, null);
  const stages = [{ name: 'Build', label: 'build', mover: 'agent' }, { name: 'Ship', label: 'ship', mover: 'nobody' }];
  const c = present(derive(issue({ config: { status: 'valid', stages }, labels: [{ name: 'build' }] })));
  assert.deepEqual([c.stageNameKey, c.nextNameKey], [{ custom: 'Build' }, { custom: 'Ship' }]);
});
