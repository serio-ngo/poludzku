import type { APIRoute } from "astro";
import { entryRedirect } from "../../lib/entry.ts";

export const prerender = false;
export const GET: APIRoute = ({ url }) => entryRedirect(url, "en");
