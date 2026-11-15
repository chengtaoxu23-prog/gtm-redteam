import type { Contract } from "../src/shared/research.js";
export function validationFields(c: Contract) {
  const success_criteria = c.success_criteria ?? c.supporting;
  const failure_criteria = c.failure_criteria ?? c.falsification;
  const validation_window = c.validation_window ?? c.validationWindow ?? "";
  const values = { success_criteria, failure_criteria, validation_window, metric: c.metric, method: c.method, decisionThreshold: c.decisionThreshold ?? "" };
  const missing_validation_fields = Object.entries(values).filter(([,v]) => !v.trim()).map(([k]) => k);
  // Historical locked contracts have not been human-confirmed against the new schema.
  if (c.validation_criteria_complete !== true) missing_validation_fields.push("human_confirmation");
  return { success_criteria, failure_criteria, validation_window, missing_validation_fields, validation_criteria_complete: missing_validation_fields.length === 0 };
}
