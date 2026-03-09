export type KnowledgeCategory =
  | "pattern"
  | "architecture"
  | "api_shape"
  | "debug_insight"
  | "convention"
  | "gotcha";

export interface KnowledgeEntry {
  id: string;
  category: KnowledgeCategory;
  subject: string;
  content: string;
  relations: {
    relatedTo: string[];
    supersedes: string[];
    derivedFrom: string[];
  };
  provenance: {
    agent: string;
    session: string;
    confidence: number;
    createdAt: string;
    updatedAt: string;
    validatedBy: string[];
  };
  scope: {
    project?: string;
    files?: string[];
    domains?: string[];
  };
  ttl?: number;
}

export interface KnowledgeIndex {
  version: number;
  entryCount: number;
  byCategory: Record<string, string[]>;
  bySubject: Record<string, string[]>;
  byProject: Record<string, string[]>;
  byFile: Record<string, string[]>;
  byDomain: Record<string, string[]>;
}

export interface KnowledgeQuery {
  categories?: KnowledgeCategory[];
  subjects?: string[];
  files?: string[];
  domains?: string[];
  project?: string;
  minConfidence?: number;
  maxAge?: number;
  limit?: number;
}
