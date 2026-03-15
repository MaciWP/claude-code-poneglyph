export type HallucinationType =
  | "phantom_import"
  | "phantom_symbol"
  | "wrong_arity"
  | "type_mismatch"
  | "phantom_property"
  | "phantom_type";

export interface SourceLocation {
  file: string;
  line: number;
  column: number;
}

export interface Hallucination {
  type: HallucinationType;
  message: string;
  location: SourceLocation;
  suggestion?: string;
  blocking: boolean;
}

export interface CheckSummary {
  file: string;
  hallucinations: Hallucination[];
  durationMs: number;
  checkersDurationMs: Record<string, number>;
}
