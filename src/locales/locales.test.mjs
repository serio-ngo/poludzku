import { test } from "node:test"
import assert from "node:assert/strict"
import pl from "./pl.ts"
import en from "./en.ts"

const shape = (o) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v && typeof v === "object" && !Array.isArray(v) ? shape(v) : typeof v === "function" ? "fn" : Array.isArray(v) ? v.length : "str"]))
const strings = (o) => Object.values(o).flatMap((v) => (typeof v === "string" ? [v] : v && typeof v === "object" ? strings(v) : []))

const table = ["hourglass", "circle-dashed", "circle-check", "circle-alert", "circle-pause", "circle", "circle-help", "viewer", "person", "user-round", "bot", "cog", "circle-off", "arrow-right", "external-link", "refresh-cw", "chevron-right", "log-in", "log-out", "scale", "lock", "cloud-off", "git-branch", "search-x", "inbox", "ellipsis"]
const healths = ["passing", "pending", "failed", "parked", "no-checks", "unknown"]
const movers = ["viewer", "person", "someone", "agent", "automation", "nobody", "unknown"]

test("PL and EN have identical shape", () => assert.deepEqual(shape(pl), shape(en)))

for (const [lang, d] of [["pl", pl], ["en", en]]) {
  test(`${lang}: no empty strings, glyph words, short unavailable views, legend`, () => {
    for (const s of strings(d)) assert.ok(s.trim())
    for (const g of table) assert.ok(d.glyph[g]?.word)
    assert.deepEqual(d.legend.slice(), table.slice(0, 20))
    for (const s of Object.values(d.unavailable)) assert.ok(s.split(/\s+/).length <= 3)
  })
  test(`${lang}: answers cover every combination`, () => {
    const a = d.answers
    const views = []
    for (const outcome of ["open", "done", "closed"])
      for (const health of healths)
        for (const kind of movers)
          for (const stage of [null, { index: 4, total: 7 }])
            for (const next of [null, { index: 5 }]) for (const preset of ["lifecycle", "generic", "custom", "unknown"]) views.push({ preset, outcome, health, mover: { kind, login: "ola" }, stage, next })
    for (const v of views)
      for (const s of [a.happening(v), a.stage(v, "X"), a.health(v), a.mover(v), a.mover(v, "ola"), a.next(v, "X")])
        assert.ok(typeof s === "string" && s.length > 3)
  })
}

test("stage-specific happening", () => {
  const v = (preset, index, kind) => ({ preset, outcome: "open", health: "pending", mover: { kind }, stage: { index, total: 7 }, next: null })
  assert.equal(pl.answers.happening(v("lifecycle", 4, "agent")), "Agent przygotowuje testy.")
  assert.equal(pl.answers.happening(v("lifecycle", 5, "person")), "Ktoś sprawdza testy.")
  assert.equal(pl.answers.happening(v("generic", 3, "automation")), "Automat sprawdza zmianę.")
  assert.equal(pl.answers.happening(v("custom", 2, "agent")), "Agent pracuje nad zadaniem.")
  assert.equal(en.answers.happening(v("lifecycle", 4, "agent")), "An agent is preparing the tests.")
  assert.match(pl.answers.next({ outcome: "open", next: { index: 5 } }, "Testy"), /^Potem/)
})

test("stripLabel", () => {
  assert.equal(pl.stripLabel(4, 7, "Testy"), "4 z 7 · Testy")
  assert.equal(en.stripLabel(4, 7, "Tests"), "4 of 7 · Tests")
})
