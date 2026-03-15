export type SpecStatus =
  | "draft"
  | "review"
  | "approved"
  | "in_progress"
  | "implemented"
  | "deprecated";

export interface SectionCheck {
  section: number;
  name: string;
  present: boolean;
  quality: "complete" | "partial" | "missing";
}

export interface BddCheck {
  scenario: string;
  hasGiven: boolean;
  hasWhen: boolean;
  hasThen: boolean;
  isExecutable: boolean;
}

export interface ComplianceIssue {
  type:
    | "missing_section"
    | "empty_bdd"
    | "no_sources"
    | "spec_drift"
    | "stale_spec";
  severity: "critical" | "major" | "minor";
  message: string;
  suggestion: string;
}

export interface SpecComplianceCheck {
  specId: string;
  specPath: string;
  status: SpecStatus;
  sections: SectionCheck[];
  bddScenarios: BddCheck[];
  overallCompliance: number;
  issues: ComplianceIssue[];
}

export interface SpecFrontmatter {
  status: SpecStatus;
  priority?: string;
  research_confidence?: string;
  sources_count?: number;
  depends_on?: string[];
  enables?: string[];
  created?: string;
  updated?: string;
}

export const SPEC_SECTIONS: Array<{ section: number; name: string }> = [
  { section: 0, name: "Research Summary" },
  { section: 1, name: "Vision" },
  { section: 2, name: "Goals & Non-Goals" },
  { section: 3, name: "Alternatives Considered" },
  { section: 4, name: "Design" },
  { section: 5, name: "FAQ" },
  { section: 6, name: "Acceptance Criteria" },
  { section: 7, name: "Open Questions" },
  { section: 8, name: "Sources" },
  { section: 9, name: "Next Steps" },
];

export const VALID_TRANSITIONS: Record<SpecStatus, SpecStatus[]> = {
  draft: ["review", "deprecated"],
  review: ["approved", "draft", "deprecated"],
  approved: ["in_progress", "deprecated"],
  in_progress: ["implemented", "approved", "deprecated"],
  implemented: ["deprecated"],
  deprecated: [],
};

export const COMPLIANCE_THRESHOLDS = {
  APPROVE: 70,
  BLOCK: 50,
} as const;
