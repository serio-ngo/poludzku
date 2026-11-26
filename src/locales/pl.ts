export type View = {
  preset: "lifecycle" | "generic" | "custom" | "unknown"
  outcome: "open" | "done" | "closed"
  stage: { index: number; total: number } | null
  health: "passing" | "pending" | "failed" | "parked" | "no-checks" | "unknown"
  mover: { kind: "viewer" | "person" | "someone" | "agent" | "automation" | "nobody" | "unknown"; login?: string }
  next: { index: number } | null
  stageNameKey?: unknown
}

const open = (v: View) => v.outcome === "open"

export default {
  glyph: {
    hourglass: { word: "czeka" },
    "circle-dashed": { word: "w pracy" },
    "circle-check": { word: "sprawdzenia przeszły" },
    "circle-alert": { word: "stoi, sprawdzenie nie przeszło" },
    "circle-pause": { word: "stoi, wstrzymane" },
    circle: { word: "brak sprawdzeń" },
    "circle-help": { word: "brak danych" },
    viewer: { word: "Ty" },
    person: { word: "login" },
    "user-round": { word: "ktoś" },
    bot: { word: "agent" },
    cog: { word: "automat" },
    "circle-off": { word: "nikt" },
    "arrow-right": { word: "co dalej" },
    "external-link": { word: "Otwórz na GitHubie" },
    "refresh-cw": { word: "Odśwież" },
    "chevron-right": { word: "Szczegóły" },
    "log-in": { word: "Zaloguj" },
    "log-out": { word: "Wyloguj" },
    scale: { word: "Regulamin" },
    lock: { word: "Brak dostępu" },
    "cloud-off": { word: "GitHub nie odpowiada" },
    "git-branch": { word: "Brak zadania" },
    "search-x": { word: "Nie ma strony" },
    inbox: { word: "Nic nie czeka" },
    ellipsis: { word: "Lista niepełna" },
  },
  legend: [
    "hourglass", "circle-dashed", "circle-check", "circle-alert", "circle-pause", "circle", "circle-help",
    "viewer", "person", "user-round", "bot", "cog", "circle-off", "arrow-right", "external-link",
    "refresh-cw", "chevron-right", "log-in", "log-out", "scale",
  ] as const,
  stages: {
    lifecycle: {
      1: "Opis zadania", 2: "Przegląd opisu", 3: "Zatwierdzenie opisu", 4: "Testy",
      5: "Zatwierdzenie testów", 6: "Kod", 7: "Odbiór",
    } as Record<number, string>,
    generic: { 1: "Zadanie", 2: "W pracy", 3: "Sprawdzanie", 4: "Przegląd", 5: "Poprawki" } as Record<number, string>,
  },
  mover: { viewer: "Ty", someone: "ktoś", agent: "agent", automation: "automat", nobody: "nikt", unknown: "brak danych" },
  outcome: { done: "gotowe", closed: "zamknięte" },
  stripLabel: (index: number, total: number, name: string) => `${index} z ${total} · ${name}`,
  answers: {
    happening: (v: View): string =>
      (v.outcome === "done" ? "Zmiana weszła. Nikt nie musi nic robić."
      : v.outcome === "closed" ? "Zadanie zamknięto bez zmiany. Nikt nie musi nic robić."
      : v.mover.kind === "agent" ? "Agent pracuje nad zadaniem."
      : v.mover.kind === "automation" ? "Automat sprawdza zmianę."
      : v.mover.kind === "viewer" ? "Zadanie czeka na Ciebie."
      : v.mover.kind === "person" || v.mover.kind === "someone" ? "Zadanie czeka na człowieka."
      : v.mover.kind === "nobody" ? "Nikt teraz nie pracuje nad zadaniem."
      : "Nie wiadomo, co się dzieje."),
    stage: (v: View, name: string): string =>
      v.outcome === "done" ? "Wszystkie etapy za nami."
      : v.outcome === "closed" ? "Zadanie zamknięto przed końcem."
      : v.stage ? `Etap ${v.stage.index} z ${v.stage.total}: ${name}.`
      : "Nie wiadomo, na którym jest etapie.",
    health: (v: View): string =>
      !open(v) ? "Nic do sprawdzenia."
      : v.health === "passing" ? "Tak. Sprawdzenia przeszły."
      : v.health === "pending" ? "Praca trwa."
      : v.health === "failed" ? "Nie. Sprawdzenie nie przeszło."
      : v.health === "parked" ? "Wstrzymane, czeka na człowieka."
      : v.health === "no-checks" ? "Nie zgłoszono żadnych sprawdzeń."
      : "Nie wiadomo. Brak danych.",
    mover: (v: View, login?: string): string =>
      v.mover.kind === "viewer" ? "Ruch jest Twój."
      : v.mover.kind === "person" ? `Ruch ma ${login ?? v.mover.login ?? "ktoś"}.`
      : v.mover.kind === "someone" ? "Ruch ma ktoś."
      : v.mover.kind === "agent" ? "Ruch ma agent."
      : v.mover.kind === "automation" ? "Ruch ma automat."
      : v.mover.kind === "nobody" ? "Nikt nie musi nic robić."
      : "Nie wiadomo, kto ma ruch.",
    next: (v: View, name: string): string =>
      !open(v) ? "Nic dalej."
      : v.next ? `Potem etap: ${name}.`
      : "Nie wiadomo, co dalej.",
  },
  unavailable: {
    noAccess: "Brak dostępu",
    unavailable: "GitHub nie odpowiada",
    expired: "Sesja wygasła",
    noTask: "Brak zadania",
    notFound: "Nie ma strony",
    empty: "Nic nie czeka",
    partial: "Lista niepełna",
  },
  details: {
    happening: "Co się dzieje?",
    stage: "Na jakim etapie?",
    health: "Czy wszystko w porządku?",
    mover: "Czyj ruch?",
    next: "Co dalej?",
    checks: "Sprawdzenia (CI)",
    reviews: "Przeglądy (review)",
    labels: "Etykiety",
    linked: "Powiązane zadania i PR",
    commits: "Commity",
    deployments: "Wdrożenia",
  },
  groups: { people: "Ruch człowieka", rest: "Pozostałe" },
  tagline: { before: "Jedno zadanie. ", marked: "Czyj ruch.", after: " Co dalej." },
  entry: { label: "owner/repo lub adres z GitHuba", placeholder: "owner/repo", button: "Otwórz" },
  footer: { publisher: "Fundacja Serio", terms: "Regulamin", licence: "Licencja MIT", source: "Kod źródłowy" },
  nav: { lang: "EN", home: "Strona główna" },
  readAt: (time: string) => `Odczytano o ${time}`,
}
