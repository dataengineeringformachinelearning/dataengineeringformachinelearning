import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blueNotes = defineCollection({
  loader: glob({
    base: "./src/content/blue-notes",
    pattern: "**/*.{md,mdx}",
  }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    note: z.string(),
    categories: z.array(z.string()).min(1),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blueNotes };
