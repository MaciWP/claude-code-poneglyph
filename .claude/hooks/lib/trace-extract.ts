/**
 * Transcript extraction functions.
 * Extracts prompt, agents, and skills from Claude Code transcripts.
 */

export interface ContentBlock {
  type: string;
  text?: string;
  name?: string;
  input?: Record<string, unknown>;
}

export interface TranscriptMessage {
  role: string;
  content: string | ContentBlock[];
}

const AGENT_TOOLS: Record<string, boolean> = { Task: true, Agent: true };

function toBlocks(content: string | ContentBlock[]): ContentBlock[] {
  return Array.isArray(content) ? content : [];
}

function getInputString(block: ContentBlock, key: string): string | undefined {
  const val = block.input ? block.input[key] : undefined;
  return typeof val === "string" ? val : undefined;
}

export function getAssistantBlocks(
  transcript: TranscriptMessage[],
): ContentBlock[] {
  const result: ContentBlock[] = [];
  for (const msg of transcript) {
    if (msg.role === "assistant") result.push(...toBlocks(msg.content));
  }
  return result;
}

export function getMessageText(content: string | ContentBlock[]): string {
  if (typeof content === "string") return content;
  return toBlocks(content)
    .map((b: ContentBlock) => b.text || "")
    .join(" ");
}

function sumBlockLengths(blocks: ContentBlock[]): number {
  let length = 0;
  for (const block of blocks) {
    if (block.text) length += block.text.length;
    if (block.input) length += JSON.stringify(block.input).length;
  }
  return length;
}

export function getContentLength(content: string | ContentBlock[]): number {
  if (typeof content === "string") return content.length;
  return sumBlockLengths(toBlocks(content));
}

function findFirstTextContent(blocks: ContentBlock[]): string {
  const textBlock = blocks.find(
    (b: ContentBlock) => b.type === "text" && b.text,
  );
  return textBlock ? textBlock.text!.slice(0, 200) : "";
}

export function extractFirstUserPrompt(
  transcript: TranscriptMessage[],
): string {
  for (const msg of transcript) {
    if (msg.role !== "user") continue;
    if (typeof msg.content === "string") return msg.content.slice(0, 200);
    const text = findFirstTextContent(toBlocks(msg.content));
    if (text) return text;
  }
  return "unknown";
}

export function extractAgentsAndSkills(transcript: TranscriptMessage[]): {
  agents: string[];
  skills: string[];
} {
  const agents = new Set<string>();
  const skills = new Set<string>();
  const blocks = getAssistantBlocks(transcript);

  for (const block of blocks) {
    if (block.type !== "tool_use") continue;
    if (AGENT_TOOLS[block.name || ""]) {
      const val = getInputString(block, "subagent_type");
      if (val) agents.add(val);
    }
    if (block.name === "Skill") {
      const val = getInputString(block, "skill");
      if (val) skills.add(val);
    }
  }

  return { agents: Array.from(agents), skills: Array.from(skills) };
}
