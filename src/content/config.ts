import { defineCollection, z } from 'astro:content';

/**
 * Content is edited both by hand and in the content editor (Pages CMS, see
 * .pages.yml). The editor writes empty boxes as blank or null and dropdown
 * choices as text, so tidy each page's data before checking it:
 *   - drop blank values, nulls, empty lists and empty groups
 *   - turn "1" into 1 for the CFU answer pickers (correct_index, retry_correct_index)
 */
function tidy(v: unknown, key = ''): unknown {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'string') {
    if (v.trim() === '') return undefined;
    if (/correct_index$/.test(key) && /^\d+$/.test(v.trim())) return Number(v.trim());
    return v;
  }
  if (Array.isArray(v)) {
    const out = v.map((x) => tidy(x)).filter((x) => x !== undefined);
    return out.length ? out : undefined;
  }
  if (typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      const t = tidy(x, k);
      if (t !== undefined) out[k] = t;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return v;
}
const tidied = <T extends z.ZodTypeAny>(schema: T) => z.preprocess((v) => tidy(v) ?? {}, schema);

const videoSchema = z.object({
  title: z.string(),
  url: z.string(),
  description: z.string().optional(),
});

const frontMatter = defineCollection({
  schema: tidied(z.object({
    title: z.string(),
    category: z.string().default('FrontMatter'),
    icon: z.string().default('•'),
    order: z.number().optional(),
  })),
});

const concepts = defineCollection({
  schema: tidied(z.object({
    title: z.string(),
    category: z.string().default('Concept'),
    icon: z.string().default('•'),
    order: z.number().optional(),
    levels: z.array(z.any()).optional(),
    journal: z.any().optional(),
    sources: z.array(z.string()).optional(),
    videos: z.array(videoSchema).optional(),
    related_concepts: z.array(z.string()).optional(),
  })),
});

const lifts = defineCollection({
  schema: tidied(z.object({
    title: z.string(),
    category: z.string().default('Lift'),
    icon: z.string().default('•'),
    order: z.number().optional(),
    levels: z.array(z.any()).optional(),
    journal: z.any().optional(),
    sources: z.array(z.string()).optional(),
    videos: z.array(videoSchema).optional(),
    related_concepts: z.array(z.string()).optional(),
  })),
});

const bodyweight = defineCollection({
  schema: tidied(z.object({
    title: z.string(),
    category: z.string().default('Bodyweight'),
    icon: z.string().default('•'),
    order: z.number().optional(),
    levels: z.array(z.any()).optional(),
    journal: z.any().optional(),
    sources: z.array(z.string()).optional(),
    related_concepts: z.array(z.string()).optional(),
  })),
});

const mobility = defineCollection({
  schema: tidied(z.object({
    title: z.string(),
    category: z.string().default('Mobility'),
    icon: z.string().default('•'),
    order: z.number().optional(),
    levels: z.array(z.any()).optional(),
    journal: z.any().optional(),
    sources: z.array(z.string()).optional(),
    related_concepts: z.array(z.string()).optional(),
  })),
});

const journal = defineCollection({
  schema: tidied(z.object({
    title: z.string(),
    category: z.string().default('Journal'),
    icon: z.string().default('•'),
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
  })),
});

const stories = defineCollection({
  schema: tidied(z.object({
    title: z.string(),
    icon: z.string().default('•'),
    linked_concepts: z.array(z.string()).optional(),
    level: z.number().optional(),
  })),
});

const programs = defineCollection({
  schema: tidied(z.object({
    title: z.string(),
    category: z.string().default('Program'),
    icon: z.string().default('•'),
    order: z.number().optional(),
    type: z.string().optional(),
    prerequisites: z.array(z.string()).optional(),
    journals: z.array(z.string()).optional(),
    glossary_terms: z.array(z.string()).optional(),
  })),
});

const glossary = defineCollection({
  schema: tidied(z.object({
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
  })),
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
