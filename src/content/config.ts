import { defineCollection, z } from 'astro:content';

const videoSchema = z.object({
  title: z.string(),
  url: z.string(),
  description: z.string().optional(),
});

const frontMatter = defineCollection({
  schema: z.object({
    title: z.string(),
    category: z.string(),
    icon: z.string(),
    order: z.number().optional(),
  }),
});

const concepts = defineCollection({
  schema: z.object({
    title: z.string(),
    category: z.string(),
    icon: z.string(),
    order: z.number().optional(),
    levels: z.array(z.any()).optional(),
    journal: z.any().optional(),
    sources: z.array(z.string()).optional(),
    videos: z.array(videoSchema).optional(),
    related_concepts: z.array(z.string()).optional(),
  }),
});

const lifts = defineCollection({
  schema: z.object({
    title: z.string(),
    category: z.string(),
    icon: z.string(),
    order: z.number().optional(),
    levels: z.array(z.any()).optional(),
    journal: z.any().optional(),
    sources: z.array(z.string()).optional(),
  }),
});

const bodyweight = defineCollection({
  schema: z.object({
    title: z.string(),
    category: z.string(),
    icon: z.string(),
    order: z.number().optional(),
    levels: z.array(z.any()).optional(),
    journal: z.any().optional(),
    sources: z.array(z.string()).optional(),
    related_concepts: z.array(z.string()).optional(),
  }),
});

const mobility = defineCollection({
  schema: z.object({
    title: z.string(),
    category: z.string(),
    icon: z.string(),
    order: z.number().optional(),
    levels: z.array(z.any()).optional(),
    journal: z.any().optional(),
    sources: z.array(z.string()).optional(),
    related_concepts: z.array(z.string()).optional(),
  }),
});

const journal = defineCollection({
  schema: z.object({
    title: z.string(),
    category: z.string(),
    icon: z.string(),
    order: z.number().optional(),
    type: z.string().optional(),
    program: z.string().optional(),
    cycle_length_weeks: z.number().optional(),
    sessions_per_week: z.number().optional(),
    auto_generate_threshold: z.number().optional(),
    fields: z.array(z.any()).optional(),
    prompts: z.array(z.string()).optional(),
    frequency: z.string().optional(),
    frequency_by_level: z.any().optional(),
    revisit_interval_days: z.number().optional(),
  }),
});

const stories = defineCollection({
  schema: z.object({
    title: z.string(),
    icon: z.string(),
    linked_concepts: z.array(z.string()).optional(),
    level: z.number().optional(),
  }),
});

const programs = defineCollection({
  schema: z.object({
    title: z.string(),
    category: z.string(),
    icon: z.string(),
    order: z.number().optional(),
    type: z.string().optional(),
    prerequisites: z.array(z.string()).optional(),
    journals: z.array(z.string()).optional(),
    glossary_terms: z.array(z.string()).optional(),
  }),
});

const glossary = defineCollection({
  schema: z.object({
    term: z.string(),
    // Every spelling that should be highlighted in the text. Spellings with
    // two or more capital letters (RPE, 1RM, mTOR) match case-sensitively.
    aliases: z.array(z.string()).default([]),
    category: z.string().optional(),
    short: z.string(),
    related_concepts: z.array(z.string()).optional(),
    status: z.enum(['draft', 'final']).default('draft'),
    // Set to false to keep a term in the glossary without auto-highlighting it.
    highlight: z.boolean().default(true),
  }),
});

export const collections = {
  glossary,
  'front-matter': frontMatter,
  concepts,
  lifts,
  bodyweight,
  mobility,
  journal,
  stories,
  programs,
};
