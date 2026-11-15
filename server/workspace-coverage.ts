import type { Hypothesis } from "../src/shared/research.js";
import type { Material, WorkspaceRun } from "../src/shared/workspace.js";
import { digest, materialKey } from "./research-materials.js";
export const unitCoverageKey = (key: string, unit: string) => key + ":" + unit;
// Legacy source-level flags are intentionally not promoted to chunk coverage.
export const coverageRecords = (runs: WorkspaceRun[]) => runs.flatMap(r => r.chunkEvaluations ?? []);
export function hypothesisCoverage(h: Hypothesis, materials: Material[], runs: WorkspaceRun[], currentRunId?: string) {
  const records = coverageRecords(runs).filter(r => r.hypothesis_id === h.id && r.hypothesis_version === h.contracts.at(-1)!.revision);
  return materials.map(m => {
    const evaluated = m.units.filter(u => records.some(r => r.source_id === m.id && r.source_version === m.revision && r.chunk_id === u.id && r.content_hash === digest(u.text)));
    const added = evaluated.filter(u => records.some(r => r.source_id === m.id && r.source_version === m.revision && r.chunk_id === u.id && r.run_id === currentRunId));
    return { hypothesis_id: h.id, hypothesis_version: h.contracts.at(-1)!.revision, materialKey: materialKey(m), total_chunks: m.units.length,
      evaluated_chunks: evaluated.length, unread_chunks_remaining: m.units.length - evaluated.length,
      coverage_ratio: m.units.length ? evaluated.length / m.units.length : 0, newly_read_chunks: added.map(u => u.id),
      unread_chunk_ids: m.units.filter(u => !evaluated.includes(u)).map(u => u.id) };
  });
}
