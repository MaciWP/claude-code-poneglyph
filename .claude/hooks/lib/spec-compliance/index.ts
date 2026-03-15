export type {
  SpecStatus,
  SectionCheck,
  BddCheck,
  ComplianceIssue,
  SpecComplianceCheck,
  SpecFrontmatter,
} from "./types";

export {
  SPEC_SECTIONS,
  VALID_TRANSITIONS,
  COMPLIANCE_THRESHOLDS,
} from "./types";

export {
  parseSpecFrontmatter,
  validateSections,
  validateBddScenarios,
  checkSources,
  runComplianceCheck,
} from "./checker";

export {
  validateTransition,
  parseIndexEntry,
  updateIndexStatus,
} from "./lifecycle";

export { collectIssues, calculateCompliance } from "./scoring";
