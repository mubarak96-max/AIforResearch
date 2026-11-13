import { afterEach, describe, expect, it } from 'vitest';
import { searchSources, sourceGroups } from '../../lib/server/lib/sources/index.js';
import { net } from '../../lib/server/lib/sources/http.js';
import { dblpToFound, searchDblp } from '../../lib/server/lib/sources/providers.js';
import {
  chemblRecord, cleanRecordTerms, clinvarRecord, findRecords, gwasRecord, ncbiGeneRecord, pubchemRecord, recordTermsFromText, uniprotRecord, type RecordTerms,
} from '../../lib/server/lib/sources/records.js';
import { recordSource, sourcesBlock } from '../../lib/server/lib/research.js';
import { recordStep } from '../../lib/server/lib/researchPipeline.js';
import { usage0 } from '../../lib/server/lib/research.js';

const realFetch = net.fetch;
afterEach(() => { net.fetch = realFetch; });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const terms = (partial: Partial<RecordTerms>): RecordTerms => ({ genes: [], proteins: [], compounds: [], variants: [], organism: null, ...partial });

const DBLP_HIT = {
  '@id': '1', info: {
    authors: { author: [{ '@pid': '1', text: 'Thomas N. Kipf' }, { '@pid': '2', text: 'Max Welling 0001' }] },
    title: 'Semi-Supervised Classification with Graph Convolutional Networks.', venue: 'ICLR', year: '2017', type: 'Conference and Workshop Papers',
    key: 'conf/iclr/KipfW17', ee: 'https://openreview.net/forum?id=SJU4ayYgl', url: 'https://dblp.org/rec/conf/iclr/KipfW17',
  },
};
const CORR_HIT = { info: { authors: { author: { text: 'Ada Lovelace' } }, title: 'Notes.', venue: 'CoRR', year: '2021', type: 'Informal and Other Publications', key: 'journals/corr/abs-2101-00001', doi: '10.48550/ARXIV.2101.00001', ee: 'https://arxiv.org/abs/2101.00001' } };

describe('DBLP', () => {
  it('reads a hit: authors without disambiguation numbers, venue, year and link', () => {
    const paper = dblpToFound(DBLP_HIT);
    expect(paper).toMatchObject({
      id: 'DBLP:conf/iclr/KipfW17', title: 'Semi-Supervised Classification with Graph Convolutional Networks', year: 2017, venue: 'ICLR', providers: ['dblp'],
      url: 'https://openreview.net/forum?id=SJU4ayYgl', is_preprint: false, type: 'proceedings-article', doi: null,
    });
    expect(paper.authors).toEqual([{ name: 'Thomas N. Kipf' }, { name: 'Max Welling' }]);
  });

  it('reads CoRR entries as arXiv preprints so they merge with arXiv', () => {
    const paper = dblpToFound(CORR_HIT);
    expect(paper).toMatchObject({ arxiv_id: '2101.00001', is_preprint: true, venue: 'CoRR (arXiv)', doi: '10.48550/arxiv.2101.00001', authors: [{ name: 'Ada Lovelace' }] });
  });

  it('searches DBLP only when chosen, merges with other sources and handles empty and bot-check answers', async () => {
    expect(sourceGroups().map((group) => group.id)).toContain('dblp');
    const asked: string[] = [];
    net.fetch = async (input) => {
      const url = new URL(String(input));
      asked.push(url.hostname);
      if (url.hostname === 'dblp.org') return new Response(JSON.stringify({ result: { hits: { '@total': '2', hit: [DBLP_HIT, CORR_HIT] } } }), { status: 200 });
      return new Response('{}', { status: 500 });
    };
    const result = await searchSources({ query: 'graph convolutional networks semi supervised', groups: ['dblp'], limit: 10 });
    expect([...new Set(asked)]).toEqual(['dblp.org']);
    expect(result.counts).toEqual({ dblp: 2 });
    expect(result.papers.map((paper) => paper.id).sort()).toEqual(['DBLP:conf/iclr/KipfW17', 'DBLP:journals/corr/abs-2101-00001']);

    net.fetch = async () => new Response(JSON.stringify({ result: { hits: { '@total': '0' } } }), { status: 200 });
    expect(await searchDblp({ query: 'no hits at all here', filters: {}, limit: 5, sort: 'relevance' })).toEqual([]);

    net.fetch = async () => new Response('<!doctype html><title>Making sure you are not a bot!</title>', { status: 202 });
    const blocked = await searchSources({ query: 'graph neural networks browser check', groups: ['dblp'], limit: 5 });
    expect(blocked.papers).toEqual([]);
    expect(blocked.errors).toEqual([{ provider: 'dblp', message: expect.stringContaining('DBLP') }]);
  });
});

describe('field source groups', () => {
  it('lists the record groups only for Deep Research, and never searches papers with them', async () => {
    expect(sourceGroups().map((group) => group.id)).not.toContain('life-sciences');
    expect(sourceGroups({ records: true }).filter((group) => 'kind' in group).map((group) => group.id)).toEqual(['life-sciences', 'chemistry']);
    const asked: string[] = [];
    net.fetch = async (input) => { asked.push(new URL(String(input)).hostname); return json({ studies: [] }); };
    await searchSources({ query: 'brca1 breast cancer trials', groups: ['trials', 'life-sciences'], limit: 5 });
    expect([...new Set(asked)]).toEqual(['clinicaltrials.gov']);
  });

  it('picks gene symbols and rsIDs from text, and cleans the model terms', () => {
    expect(recordTermsFromText('Does BRCA1 or TP53 loss change PARP inhibitor response in RCT data? rs7412 too')).toEqual({ genes: ['BRCA1', 'TP53', 'PARP'], proteins: [], compounds: [], variants: ['rs7412'], organism: null });
    expect(cleanRecordTerms({ genes: ['BRCA1', 'BRCA1', '<script>'], compounds: ['imatinib'], variants: ['rs429358', 'c.68_69del'], organism: 'Mus musculus' }))
      .toEqual({ genes: ['BRCA1'], proteins: [], compounds: ['imatinib'], variants: ['rs429358'], organism: 'Mus musculus' });
    expect(cleanRecordTerms(null)).toEqual(terms({}));
  });

  it('reads records from each database into one citable shape', () => {
    expect(ncbiGeneRecord({ uid: '672', name: 'BRCA1', description: 'BRCA1 DNA repair associated', chromosome: '17', maplocation: '17q21.31', mim: ['113705'], summary: 'Tumour suppressor.', organism: { scientificname: 'Homo sapiens' } }))
      .toMatchObject({ id: 'record:ncbi_gene:672', database_name: 'NCBI Gene', group: 'life-sciences', url: 'https://www.ncbi.nlm.nih.gov/gene/672', title: 'BRCA1: BRCA1 DNA repair associated (Homo sapiens)', summary: 'Gene ID 672. Chromosome 17, location 17q21.31. OMIM 113705. Tumour suppressor.' });
    expect(uniprotRecord({ primaryAccession: 'P38398', entryType: 'UniProtKB reviewed (Swiss-Prot)', proteinDescription: { recommendedName: { fullName: { value: 'Breast cancer type 1 susceptibility protein' } } }, genes: [{ geneName: { value: 'BRCA1' } }], organism: { scientificName: 'Homo sapiens' }, comments: [{ commentType: 'FUNCTION', texts: [{ value: 'E3 ligase.' }] }] }))
      .toMatchObject({ identifier: 'P38398', url: 'https://www.uniprot.org/uniprotkb/P38398/entry', summary: expect.stringContaining('Function: E3 ligase.') });
    expect(clinvarRecord({ uid: '55361', accession: 'VCV000055361', title: 'NM_007294.4(BRCA1):c.5044G>A', obj_type: 'single nucleotide variant', genes: [{ symbol: 'BRCA1' }], germline_classification: { description: 'Benign', review_status: 'reviewed by expert panel', trait_set: [{ trait_name: 'Breast-ovarian cancer' }] } }).summary)
      .toContain('Germline classification: Benign. Review status: reviewed by expert panel');
    expect(gwasRecord({ association_id: 1, accession_id: 'GCST1', snp_allele: [{ rs_id: 'rs7412' }], efo_traits: [{ efo_trait: 'LDL cholesterol' }], mapped_genes: ['APOE'], pvalue_mantissa: 4, pvalue_exponent: -20 }))
      .toMatchObject({ title: 'rs7412 and LDL cholesterol (APOE)', url: 'https://www.ebi.ac.uk/gwas/variants/rs7412', summary: expect.stringContaining('P = 4e-20') });
    expect(pubchemRecord({ CID: 2244, Title: 'Aspirin', MolecularFormula: 'C9H8O4', MolecularWeight: '180.16' }, null)).toMatchObject({ identifier: 'CID 2244', group: 'chemistry', url: 'https://pubchem.ncbi.nlm.nih.gov/compound/2244' });
    expect(chemblRecord({ molecule_chembl_id: 'CHEMBL941', pref_name: 'IMATINIB', max_phase: '4.0', first_approval: 2001 }).summary).toContain('Approved drug (max phase 4). First approved 2001');
  });

  it('asks every database once, caps records per database, and skips failures with a log', async () => {
    const hosts: string[] = [];
    net.fetch = async (input) => {
      const url = new URL(String(input));
      hosts.push(url.hostname);
      if (url.pathname.endsWith('esearch.fcgi')) return json({ esearchresult: { idlist: url.searchParams.get('db') === 'gene' ? ['672'] : ['1', '2', '3', '4'] } });
      if (url.pathname.endsWith('esummary.fcgi')) return json({ result: Object.fromEntries(['672', '1', '2', '3'].map((id) => [id, { uid: id, name: 'BRCA1', description: 'gene', title: `variant ${id}` }])) });
      if (url.hostname === 'rest.uniprot.org') return json({ results: [{ primaryAccession: 'P38398', proteinDescription: { recommendedName: { fullName: { value: 'BRCA1 protein' } } } }] });
      if (url.hostname === 'alphafold.ebi.ac.uk') return json([{ modelEntityId: 'AF-P38398-F1', globalMetricValue: 41.6 }]);
      if (url.hostname === 'rest.ensembl.org') return json({ error: 'gone' }, 500);
      if (url.hostname === 'reactome.org') return json({ results: [] });
      if (url.hostname === 'search.rcsb.org') return new Response('', { status: 204 });
      if (url.hostname === 'www.ebi.ac.uk') return json({ _embedded: { associations: [] } });
      return json({}, 404);
    };
    const logs: string[] = [];
    const found = await findRecords(['life-sciences'], terms({ genes: ['BRCA1'] }), { log: (line) => logs.push(line) });
    expect(found.counts).toEqual({ ncbi_gene: 1, uniprot: 1, alphafold: 1, clinvar: 3 });
    expect(found.records.map((record) => record.id)).toEqual(['record:ncbi_gene:672', 'record:uniprot:P38398', 'record:alphafold:AF-P38398-F1', 'record:clinvar:VCV1', 'record:clinvar:VCV2', 'record:clinvar:VCV3']);
    expect(logs.join(' ')).toMatch(/RCSB PDB skipped/);
    expect(hosts).not.toContain('pubchem.ncbi.nlm.nih.gov');
  });

  it('asks nothing when the question names no entity, and keeps what arrived when time runs out', async () => {
    let calls = 0;
    net.fetch = async () => { calls += 1; return json({}); };
    expect(await findRecords(['life-sciences', 'chemistry'], terms({}))).toEqual({ records: [], counts: {} });
    expect(calls).toBe(0);

    net.fetch = async (input) => {
      const url = new URL(String(input));
      if (url.hostname === 'www.ebi.ac.uk') return json({ molecules: [{ molecule_chembl_id: 'CHEMBL941', pref_name: 'IMATINIB' }] });
      return new Promise<Response>(() => undefined); // PubChem never answers
    };
    const logs: string[] = [];
    const found = await findRecords(['chemistry'], terms({ compounds: ['imatinib'] }), { budgetMs: 300, log: (line) => logs.push(line) });
    expect(found.records.map((record) => record.database)).toEqual(['chembl']);
    expect(logs).toContain('time budget reached; keeping the databases that answered');
  });

  it('numbers records as sources the model can cite, with their database name', async () => {
    const source = recordSource({ id: 'record:uniprot:P38398', database: 'uniprot', database_name: 'UniProt', group: 'life-sciences', identifier: 'P38398', title: 'BRCA1 protein', url: 'https://www.uniprot.org/uniprotkb/P38398/entry', summary: 'UniProtKB P38398. Function: E3 ligase.' }, 7);
    expect(source).toMatchObject({ n: 7, marker: 'S7', kind: 'web', database: 'UniProt', venue: 'UniProt P38398', study_type_label: 'UniProt record', providers: ['uniprot'] });
    expect(sourcesBlock([source], 500)).toContain('[S7] UniProt P38398 (n.d.). BRCA1 protein. UniProt P38398 [UniProt record]\nDatabase record: UniProtKB P38398. Function: E3 ligase.');
  });

  it('uses the model terms when it names some, and never fails the run', async () => {
    const asked: string[] = [];
    net.fetch = async (input) => { asked.push(String(input)); return json({}, 500); };
    const llm = { complete: async () => ({ text: '{"compounds": ["nilotinib"]}', usage: { input: 1, output: 1 } }) } as any;
    const result = await recordStep(llm, 'How does Gleevec work?', ['chemistry'], usage0());
    expect(result).toEqual({ records: [], counts: {} });
    expect(asked.some((url) => url.includes('nilotinib'))).toBe(true);
    const failing = { complete: async () => { throw new Error('model down'); } } as any;
    expect(await recordStep(failing, 'nothing named here', ['chemistry'], usage0())).toEqual({ records: [], counts: {} });
  });
});
