export const SITE = {
    url: "https://poludzku.info",
    name: "po ludzku",
    themeColor: "#faf7f2",
    cacheSeconds: 60,
    sessionHours: 8,
    installationTokenMinutes: 50,
    listPageSize: 50,
    requestBudget: { requests: 12, milliseconds: 8000 },
    presets: ["lifecycle", "generic"],
} as const;
