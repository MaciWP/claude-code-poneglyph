import { readFileSync, writeFileSync } from "node:fs";

import type { SpecStatus } from "./types";
import { VALID_TRANSITIONS } from "./types";

export function validateTransition(
  current: SpecStatus,
  target: SpecStatus,
): { valid: boolean; allowed: SpecStatus[] } {
  const allowed = VALID_TRANSITIONS[current] ?? [];
  return {
    valid: allowed.includes(target),
    allowed,
  };
}

export function parseIndexEntry(
  line: string,
): { specId: string; status: SpecStatus } | null {
  if (!line.includes("|")) return null;

  const cells = line
    .split("|")
    .map((c) => c.trim())
    .filter(Boolean);

  if (cells.length < 6) return null;

  const idCell = cells[0];
  const idMatch = idCell.match(/SPEC-\d+/);
  if (!idMatch) return null;

  const statusCell = cells[5];
  const statusMatch = statusCell.match(
    /`(draft|review|approved|in_progress|implemented|deprecated)`/,
  );
  if (!statusMatch) return null;

  return {
    specId: idMatch[0],
    status: statusMatch[1] as SpecStatus,
  };
}

export function updateIndexStatus(
  indexPath: string,
  specId: string,
  newStatus: SpecStatus,
): { success: boolean; error?: string } {
  try {
    const content = readFileSync(indexPath, "utf-8");
    const lines = content.split("\n");

    let foundIndex = -1;
    let currentStatus: SpecStatus | null = null;

    for (let i = 0; i < lines.length; i++) {
      const entry = parseIndexEntry(lines[i]);
      if (entry && entry.specId === specId) {
        foundIndex = i;
        currentStatus = entry.status;
        break;
      }
    }

    if (foundIndex === -1) {
      return {
        success: false,
        error: `Spec ${specId} not found in index`,
      };
    }

    const transition = validateTransition(currentStatus!, newStatus);
    if (!transition.valid) {
      return {
        success: false,
        error: `Invalid transition: ${currentStatus} -> ${newStatus}. Allowed: ${transition.allowed.join(", ")}`,
      };
    }

    lines[foundIndex] = lines[foundIndex].replace(
      /`(draft|review|approved|in_progress|implemented|deprecated)`/,
      `\`${newStatus}\``,
    );

    writeFileSync(indexPath, lines.join("\n"));
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}
