import type { KnowledgeEntry } from "./types";
import { nowIso } from "./graph-storage";

const DEFAULT_RELATIONS = {
  relatedTo: [] as string[],
  supersedes: [] as string[],
  derivedFrom: [] as string[],
};

function resolveProvenance(
  prov: KnowledgeEntry["provenance"] | undefined,
  now: string,
): KnowledgeEntry["provenance"] {
  if (!prov) {
    return {
      agent: "unknown",
      session: "unknown",
      confidence: 0.5,
      createdAt: now,
      updatedAt: now,
      validatedBy: [],
    };
  }
  return {
    agent: prov.agent,
    session: prov.session,
    confidence: prov.confidence,
    createdAt: prov.createdAt ?? now,
    updatedAt: now,
    validatedBy: prov.validatedBy ?? [],
  };
}

export function buildFullEntry(
  partial: Partial<KnowledgeEntry>,
): KnowledgeEntry {
  const now = nowIso();
  return {
    id: crypto.randomUUID(),
    category: partial.category!,
    subject: partial.subject!,
    content: partial.content!,
    relations: partial.relations ?? { ...DEFAULT_RELATIONS },
    provenance: resolveProvenance(partial.provenance, now),
    scope: partial.scope ?? {},
    ttl: partial.ttl,
  };
}

const VALID_CATEGORIES: Set<string> = new Set([
  "pattern",
  "architecture",
  "api_shape",
  "debug_insight",
  "convention",
  "gotcha",
]);

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validate(entry: Partial<KnowledgeEntry>): ValidationResult {
  const errors: string[] = [];

  if (!entry.category) {
    errors.push("category is required");
  } else if (!VALID_CATEGORIES.has(entry.category)) {
    errors.push(`invalid category: ${entry.category}`);
  }

  if (!entry.subject) {
    errors.push("subject is required");
  }

  if (!entry.content) {
    errors.push("content is required");
  }

  return { valid: errors.length === 0, errors };
}
