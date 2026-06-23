// Deterministic graders for the golden-prompt harness (019/US3).
// Pure functions: no I/O, no network, no model calls (W2 D1 — deterministic-first;
// LLM-judge forbidden per W2 D4). Heuristics are intentionally simple and
// documented; on a fail, suspect the eval first (see README protocol, US4).

export interface CaseSpec {
  id?: string;
  prompt?: string;
  type?: string;
  grader?: string;
  expected?: string;
  trials?: number;
  source?: string;
}

export interface GradeResult {
  pass: boolean;
  detail: string;
}

export type Grader = (transcript: string, caseSpec?: CaseSpec) => GradeResult;

/** Remove fenced code blocks and inline code so they never poison prose checks. */
export function stripCode(text: string): string {
  return text.replace(/```[\s\S]*?```/g, " ").replace(/`[^`\n]*`/g, " ");
}

/** Remove fenced code blocks ONLY — keep inline `code`. Used by labelPresence, because
 * the house style writes confidence labels in inline backticks (`[Suposición — …]`), so
 * stripping inline code would hide a perfectly valid label (false negative). Fenced blocks
 * are still stripped: a label illustrated inside a ```fence``` is an example, not a real one. */
export function stripFenced(text: string): string {
  return text.replace(/```[\s\S]*?```/g, " ");
}

/** Remove double-quoted and «» segments (literal quotes are exempt from style rules). */
function stripQuoted(text: string): string {
  return text.replace(/"[^"\n]*"/g, " ").replace(/«[^»\n]*»/g, " ").replace(/“[^”\n]*”/g, " ");
}

// Kill-list from output-styles/poneglyph.md §Anti-sycophancy (ES + EN).
const BANNED_OPENERS = [
  "buena pregunta",
  "tienes toda la razón",
  "tiene mucho sentido",
  "por supuesto",
  "sin duda",
  "great question",
  "you're absolutely right",
  "makes total sense",
  "of course",
  "no doubt",
];

export const bannedOpeners: Grader = (transcript) => {
  const prose = stripQuoted(stripCode(transcript)).toLowerCase();
  for (const phrase of BANNED_OPENERS) {
    if (prose.includes(phrase)) {
      return { pass: false, detail: `banned opener present: "${phrase}"` };
    }
  }
  return { pass: true, detail: "no banned openers" };
};

// Translated-English calques from output-styles/poneglyph.md §Language (the spec's own
// counter-examples). Multi-word anchors → low false-positive rate; single words like
// "déjame" alone are legitimate Spanish and are NOT listed. Failure origin: 017 retro
// (translated-English style debt). Code/quotes are stripped first (literal-quote exempt).
const CALQUES = [
  "voy a proceder a",
  "hace sentido",
  "haría sentido",
  "déjame verificar",
  "déjame comprobar",
  "es debido a que",
];

export const calqueDetect: Grader = (transcript) => {
  const prose = stripQuoted(stripCode(transcript)).toLowerCase();
  for (const phrase of CALQUES) {
    if (prose.includes(phrase)) {
      return { pass: false, detail: `calque present: "${phrase}"` };
    }
  }
  return { pass: true, detail: "no calques" };
};

// Minimal stopword lists — enough signal to separate es-ES prose from English prose.
const ES_STOPWORDS = ["el", "la", "los", "las", "de", "del", "que", "porque", "una", "con", "para", "está", "es", "en", "no", "se", "por", "como", "más", "pero", "desde", "así", "queda", "falta", "añadir"];
const EN_STOPWORDS = ["the", "of", "and", "to", "is", "that", "it", "for", "with", "from", "does", "not", "because", "this", "are", "was", "be", "have"];

export const esEsDetect: Grader = (transcript) => {
  const words = stripCode(transcript).toLowerCase().split(/[^\p{L}áéíóúüñ]+/u).filter(Boolean);
  if (words.length === 0) return { pass: true, detail: "no prose to grade" };
  const es = words.filter((w) => ES_STOPWORDS.includes(w)).length;
  const en = words.filter((w) => EN_STOPWORDS.includes(w)).length;
  if (es >= en) return { pass: true, detail: `spanish-dominant prose (es=${es}, en=${en})` };
  return { pass: false, detail: `english-dominant prose (es=${es}, en=${en})` };
};

// Preamble openers that signal the answer was NOT led with (BLUF violation).
const PREAMBLE_OPENERS = [
  "primero voy a",
  "antes de responder",
  "antes de nada",
  "para entender",
  "voy a explicar",
  "empecemos por",
  "let me start",
  "let me first",
  "first, i will",
  "to understand",
  "before answering",
];

export const blufPosition: Grader = (transcript) => {
  const prose = stripCode(transcript).trim();
  const firstParagraph = prose.split(/\n\s*\n/)[0]?.trim().toLowerCase() ?? "";
  for (const opener of PREAMBLE_OPENERS) {
    if (firstParagraph.startsWith(opener) || firstParagraph.startsWith(`¡${opener}`)) {
      return { pass: false, detail: `first paragraph is preamble ("${opener}…") — answer not led` };
    }
  }
  return { pass: true, detail: "first paragraph leads with content" };
};

const LABEL_RE = /\[(Seguro|Probable|Suposición)(\s*—\s*[^\]]+)?\]/gu;

export const labelPresence: Grader = (transcript, caseSpec) => {
  const prose = stripFenced(transcript);
  const matches = [...prose.matchAll(LABEL_RE)];
  if (matches.length === 0) {
    return { pass: false, detail: "no confidence label found" };
  }
  if (caseSpec?.expected === "payload-required") {
    const bare = matches.filter((m) => !m[2]);
    if (bare.length > 0) {
      return { pass: false, detail: `label without payload: [${bare[0][1]}] — labels must carry payload` };
    }
  }
  return { pass: true, detail: `${matches.length} labeled block(s), payload present` };
};

export const skillTriggerParse: Grader = (transcript, caseSpec) => {
  const expected = caseSpec?.expected ?? "";
  for (const line of transcript.split("\n")) {
    let event: unknown;
    try {
      event = JSON.parse(line);
    } catch {
      continue; // corrupt lines tolerated (T3.9)
    }
    const content = (event as { message?: { content?: unknown[] } })?.message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      const b = block as { type?: string; name?: string; input?: { skill?: string } };
      if (b.type === "tool_use" && b.name === "Skill" && b.input?.skill === expected) {
        return { pass: true, detail: `Skill(${expected}) invoked` };
      }
    }
  }
  return { pass: false, detail: `expected Skill(${expected}) invocation not found in transcript` };
};

export const graders: Record<string, Grader> = {
  bannedOpeners,
  esEsDetect,
  blufPosition,
  labelPresence,
  skillTriggerParse,
  calqueDetect,
};
