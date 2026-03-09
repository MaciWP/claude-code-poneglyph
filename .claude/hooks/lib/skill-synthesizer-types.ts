export interface SynthesizedSkill {
  name: string;
  description: string;
  triggers: string[];
  content: {
    patterns: string[];
    conventions: string[];
    antiPatterns: string[];
    examples: string[];
  };
  source: {
    patternId: string;
    traceCount: number;
    confidence: number;
  };
  version: number;
}

export interface SynthesisResult {
  status: "created" | "skipped";
  skillName: string | null;
  reason: string;
  draftPath: string | null;
  gateResults: QualityGateResult[];
}

export interface QualityGateResult {
  gate: string;
  passed: boolean;
  detail: string;
}

export interface SynthesisLog {
  timestamp: string;
  patternId: string;
  result: SynthesisResult;
}
