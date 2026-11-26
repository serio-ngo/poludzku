import { defineConfig, fontProviders } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

const face = (weight, subset) => ({
    weight,
    style: "normal",
    src: [`./src/assets/fonts/${subset.file}-${subset.name}-${weight}-normal.woff2`],
    unicodeRange: subset.range.split(","),
});
const LATIN =
    "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
const LATIN_EXT =
    "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF";
const font = (name, file, cssVariable, weights, fallbacks, extra = []) => ({
    provider: fontProviders.local(),
    name,
    cssVariable,
    fallbacks,
    options: {
        variants: weights.flatMap((w) => [
            face(w, { file, name: "latin", range: LATIN }),
            face(w, { file, name: "latin-ext", range: LATIN_EXT }),
        ]).concat(extra),
    },
});

export default defineConfig({
    site: "https://poludzku.info",
    output: "server",
    adapter: cloudflare({ imageService: "passthrough" }),
    vite: { ssr: { optimizeDeps: { include: ["universal-github-app-jwt", "@lucide/astro"] } } },
    session: false,
    trailingSlash: "never",
    build: { format: "directory" },
    server: { port: 4321 },
    fonts: [
        font("Newsreader", "newsreader", "--font-newsreader", [600], ["Georgia", "serif"]),
        font(
            "Libre Franklin",
            "libre-franklin",
            "--font-libre-franklin",
            [400, 500, 600],
            ["Helvetica Neue", "Arial", "sans-serif"],
            [face(800, { file: "libre-franklin", name: "latin", range: LATIN })],
        ),
        font(
            "JetBrains Mono",
            "jetbrains-mono",
            "--font-jetbrains-mono",
            [400, 500, 600],
            ["ui-monospace", "Menlo", "monospace"],
        ),
    ],
});
