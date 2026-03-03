export type BlueprintNodeType = "agent" | "command" | "gate";

export interface BlueprintNode {
  id: string;
  type: BlueprintNodeType;
  name: string;
  deps: string[];

  // Agent node fields
  agentType?: string;
  prompt?: string;
  maxTokens?: number;
  timeout?: number;

  // Command node fields
  command?: string;
  expectedExitCode?: number;

  // Gate node fields
  onSuccess?: string;
  onFailure?: string;
  condition?: string;

  // Common
  maxRetries?: number;
  continueOnFailure?: boolean;
}

export type BlueprintNodeStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

export interface BlueprintNodeRun {
  nodeId: string;
  status: BlueprintNodeStatus;
  startedAt?: string;
  completedAt?: string;
  output?: string;
  exitCode?: number;
  error?: string;
  retryCount: number;
  durationMs?: number;
}

export interface BlueprintDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  triggers: {
    keywords: string[];
    complexity?: { min?: number; max?: number };
  };
  nodes: BlueprintNode[];
  variables?: Record<string, string>;
}

export type BlueprintRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface BlueprintRun {
  id: string;
  blueprintId: string;
  blueprintName: string;
  status: BlueprintRunStatus;
  startedAt: string;
  completedAt?: string;
  nodeRuns: BlueprintNodeRun[];
  variables: Record<string, string>;
  totalDurationMs?: number;
  context: Record<string, unknown>;
}

export interface BlueprintEvent {
  type:
    | "blueprint_started"
    | "blueprint_completed"
    | "blueprint_failed"
    | "node_started"
    | "node_completed"
    | "node_failed"
    | "node_retrying"
    | "gate_evaluated";
  runId: string;
  nodeId?: string;
  timestamp: string;
  data?: Record<string, unknown>;
}
