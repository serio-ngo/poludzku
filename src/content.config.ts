import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const pages = defineCollection({
  // Key by file name: PL and EN share a slug, which the loader would otherwise use as the id.
  loader: glob({ pattern: '*.md', base: './src/content/pages', generateId: ({ entry }) => entry }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    lang: z.enum(['pl', 'en']),
    slug: z.string(),
  }),
});

export const collections = { pages };
