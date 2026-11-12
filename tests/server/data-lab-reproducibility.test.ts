import { describe, expect, it } from 'vitest';
import { DATA_LAB_VERSION, datasetHash, parseAnalysisBundle, rerunAnalyses, runAnalysis, type Reproducibility } from '../../lib/dataLabReproducibility';

const data = 'x,y\n1,2\n2,4\n3,5\n4,4\n5,5\n,7';
const kinds = { x: 'numeric' as const, y: 'numeric' as const };

describe('Data Lab reproducibility bundles', () => {
  it('reruns a saved regression from the same data and records missing observations', async () => {
    const sha = await datasetHash(data);
    const run = runAnalysis(data, { test: 'regression', variables: ['x', 'y'], kinds });
    expect(run).toMatchObject({ rows_used: 5, rows_omitted: 1 });
    const reproduction: Reproducibility = { schema: 1, software: DATA_LAB_VERSION, created_at: new Date().toISOString(), dataset_sha256: sha, rows: 6, columns: ['x', 'y'], truncated: false, column_kinds: kinds, transformations: [], notes: 'Complete observations only.', analyses: [{ test: 'regression', variables: ['x', 'y'], kinds, at: new Date().toISOString(), dataset_sha256: sha, missing: 'complete_observations', rows_used: 5, rows_omitted: 1 }] };
    expect(await rerunAnalyses(data, reproduction)).toEqual([run.result]);
    await expect(rerunAnalyses(data.replace('3,5', '3,500'), reproduction)).rejects.toThrow('does not match');
    await expect(rerunAnalyses(data, { ...reproduction, software: 'old-algorithms' })).rejects.toThrow('another calculation version');
    const bundle = parseAnalysisBundle(JSON.stringify({ format: 'aiforresearch-data-lab', dataset_name: 'example.csv', dataset_csv: data, reproducibility: reproduction, results: [run.result] }));
    expect(bundle.dataset_csv).toBe(data);
  });

  it('rejects unknown computations and missing columns instead of silently choosing a default', () => {
    expect(() => runAnalysis(data, { test: 'pearson', variables: ['missing', 'y'], kinds })).toThrow('missing column');
    expect(() => parseAnalysisBundle(JSON.stringify({ format: 'aiforresearch-data-lab', reproducibility: { schema: 1, analyses: [{ test: 'made-up' }] }, results: [] }))).toThrow('unsupported analysis');
  });
});
