/**
 * Field source groups for Deep Research: database records a report can cite next to papers.
 * They are not paper indexes; each is asked only for the entity-like terms in the question (gene,
 * protein, compound or variant names), a few records per database, under one time budget. A
 * database that fails or is slow is skipped with a log line and never fails the run.
 *
 * Life sciences:
 * - NCBI Gene and ClinVar (E-utilities): eutils.ncbi.nlm.nih.gov, public domain, 3 requests a
 *   second, 10 with NCBI_API_KEY (ncbi.nlm.nih.gov/books/NBK25497).
 * - UniProt REST: rest.uniprot.org, CC BY 4.0 (uniprot.org/help/api, uniprot.org/help/license).
 * - Ensembl REST: rest.ensembl.org, free, 15 requests a second (github.com/Ensembl/ensembl-rest/wiki).
 * - Reactome Content Service: reactome.org/ContentService, CC BY 4.0 (reactome.org/license).
 * - RCSB PDB search and data APIs: search.rcsb.org, data.rcsb.org, CC0 (rcsb.org/pages/usage-policy).
 * - AlphaFold DB API: alphafold.ebi.ac.uk/api, CC BY 4.0 (alphafold.ebi.ac.uk/faq).
 * - GWAS Catalog REST API v2: ebi.ac.uk/gwas/rest/api/v2 (the v1 API is retired), EMBL-EBI terms, free.
 * Chemistry:
 * - PubChem PUG REST: pubchem.ncbi.nlm.nih.gov/rest/pug, public domain, at most 5 requests a second.
 * - ChEMBL web services: ebi.ac.uk/chembl/api/data, CC BY-SA 3.0 (cited with attribution, not redistributed).
 *
 * KEGG and HMDB are deliberately absent (their licences do not allow this use).
 */
import { env } from '../../env.js';
import { fetchSource } from './http.js';
import type { RecordDatabase, RecordGroup, RecordSource } from './types.js';

/** The entity-like terms a question names. */
export type RecordTerms = { genes: string[]; proteins: string[]; compounds: string[]; variants: string[]; organism: string | null };

export const RECORD_DATABASES: Record<RecordDatabase, { name: string; group: RecordGroup }> = {
  ncbi_gene: { name: 'NCBI Gene', group: 'life-sciences' },
  uniprot: { name: 'UniProt', group: 'life-sciences' },
  ensembl: { name: 'Ensembl', group: 'life-sciences' },
  reactome: { name: 'Reactome', group: 'life-sciences' },
  pdb: { name: 'RCSB PDB', group: 'life-sciences' },
  alphafold: { name: 'AlphaFold DB', group: 'life-sciences' },
  gwas: { name: 'GWAS Catalog', group: 'life-sciences' },
  clinvar: { name: 'ClinVar', group: 'life-sciences' },
  pubchem: { name: 'PubChem', group: 'chemistry' },
  chembl: { name: 'ChEMBL', group: 'chemistry' },
};

/** Records kept per database, and how long all the databases together may take. */
export const RECORDS_PER_DATABASE = 3;
const BUDGET_MS = 20_000;
const TIMEOUT_MS = 8_000;

const clip = (text: unknown, max: number) => String(text ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
const list = (value: unknown): any[] => (Array.isArray(value) ? value : []);
const facts = (items: (string | null | false | undefined)[]) => `${items.filter((item): item is string => Boolean(item)).map((item) => item.trim().replace(/\.+$/, '')).filter(Boolean).join('. ')}.`;

function record(database: RecordDatabase, identifier: string, title: string, url: string, summary: string): RecordSource {
  const { name, group } = RECORD_DATABASES[database];
  return { id: `record:${database}:${identifier}`, database, database_name: name, group, identifier, title: clip(title, 300), url, summary: clip(summary, 1600) };
}

// ------------------------------------------------------------------ terms

/** Capital-letter words that look like gene symbols but are not. */
const NOT_GENES = new Set(['DNA', 'RNA', 'MRNA', 'HIV', 'AIDS', 'COVID', 'USA', 'UK', 'EU', 'WHO', 'RCT', 'RCTS', 'ICU', 'BMI', 'PCR', 'CRISPR', 'GWAS', 'SNP', 'SNPS', 'AI', 'ML', 'NLP', 'FDA', 'NIH', 'CI', 'OR', 'HR', 'RR', 'SD', 'ALS', 'MS', 'PD', 'AD', 'ADHD', 'COPD', 'CVD', 'CKD', 'MRI', 'CT', 'PET', 'ECG', 'EEG', 'IQ', 'QOL', 'II', 'III', 'IV', 'VS', 'AND', 'NOT', 'THE']);

/** Gene-like symbols and rsIDs from text: the fallback when the model does not name terms. Pure, for tests. */
export function recordTermsFromText(text: string): RecordTerms {
  const genes = [...new Set((text.match(/\b[A-Z][A-Z0-9]{1,9}(?:-[A-Z0-9]{1,4})?\b/g) ?? []).filter((word) => !NOT_GENES.has(word) && (/\d/.test(word) || word.length >= 3)))];
  const variants = [...new Set((text.match(/\brs\d{3,12}\b/gi) ?? []).map((id) => id.toLowerCase()))];
  return { genes: genes.slice(0, 3), proteins: [], compounds: [], variants: variants.slice(0, 2), organism: null };
}

/** The model's answer to the terms prompt, made safe. Pure, for tests. */
export function cleanRecordTerms(raw: unknown): RecordTerms {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const terms = (key: string, max: number) => [...new Set(list(value[key]).map((item) => clip(item, 60)).filter((item) => /^[\p{L}\p{N}][\p{L}\p{N} .,'()+\-/]{0,59}$/u.test(item)))].slice(0, max);
  const organism = clip(value.organism, 60);
  return { genes: terms('genes', 3), proteins: terms('proteins', 2), compounds: terms('compounds', 2), variants: terms('variants', 2).filter((id) => /^rs\d{3,12}$/i.test(id)).map((id) => id.toLowerCase()), organism: /^[A-Z][a-z]+ [a-z]+$/.test(organism) ? organism : null };
}

/** The prompt that asks a fast model for the terms (the pipeline sends it). */
export function recordTermsPrompt(question: string, groups: RecordGroup[]) {
  const wanted = [groups.includes('life-sciences') ? 'genes (official symbols, e.g. BRCA1), proteins (names), variants (rsIDs only)' : null, groups.includes('chemistry') ? 'compounds (drug or chemical names)' : null].filter(Boolean).join('; ');
  return [
    { role: 'system' as const, content: 'You pick database search terms. Answer with JSON only: {"genes": [], "proteins": [], "compounds": [], "variants": [], "organism": null}. List only entities the question names or clearly implies, at most 3 genes and 2 of each other kind, in English. Leave a list empty when nothing fits; never guess. organism is a scientific name such as "Homo sapiens", or null.' },
    { role: 'user' as const, content: `Question: ${question.slice(0, 1200)}\n\nTerms wanted: ${wanted}.` },
  ];
}

// ------------------------------------------------------------------ life sciences

const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const NCBI_PACE = () => ({ key: 'ncbi', ms: env.ncbiApiKey ? 110 : 350, maxWaitMs: 6000 });
function eutils(path: string, params: Record<string, string>) {
  const url = new URL(`${EUTILS}/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set('retmode', 'json');
  url.searchParams.set('tool', 'aiforresearch');
  if (env.contactEmail) url.searchParams.set('email', env.contactEmail);
  if (env.ncbiApiKey) url.searchParams.set('api_key', env.ncbiApiKey);
  return url;
}
const get = <T = any>(url: string | URL, source: string, options: { method?: 'POST'; body?: unknown; pace?: { key: string; ms: number; maxWaitMs?: number } } = {}) =>
  fetchSource<T>(url, { source, timeoutMs: TIMEOUT_MS, ...options });

/** E-utilities esearch then esummary; the summaries in search order. */
async function eutilsSummaries(db: 'gene' | 'clinvar', term: string): Promise<any[]> {
  const found = await get(eutils('esearch.fcgi', { db, term, retmax: String(RECORDS_PER_DATABASE) }), db === 'gene' ? 'NCBI Gene' : 'ClinVar', { pace: NCBI_PACE() });
  const ids: string[] = list(found?.esearchresult?.idlist).map(String).slice(0, RECORDS_PER_DATABASE);
  if (!ids.length) return [];
  const data = await get(eutils('esummary.fcgi', { db, id: ids.join(',') }), db === 'gene' ? 'NCBI Gene' : 'ClinVar', { pace: NCBI_PACE() });
  return ids.map((id) => data?.result?.[id]).filter((item) => item && !item.error);
}

export function ncbiGeneRecord(item: any): RecordSource {
  const id = String(item.uid);
  const location = [item.chromosome ? `Chromosome ${item.chromosome}` : null, item.maplocation ? `location ${item.maplocation}` : null].filter(Boolean).join(', ');
  return record('ncbi_gene', id, `${item.name}: ${item.description || 'gene'}${item.organism?.scientificname ? ` (${item.organism.scientificname})` : ''}`, `https://www.ncbi.nlm.nih.gov/gene/${id}`, facts([
    `Gene ID ${id}`, location || null, item.otheraliases ? `Aliases: ${clip(item.otheraliases, 160)}` : null, item.mim?.length ? `OMIM ${list(item.mim).join(', ')}` : null, clip(item.summary, 1000) || null,
  ]));
}

async function ncbiGene(terms: RecordTerms) {
  const organism = terms.organism || 'Homo sapiens';
  const symbols = terms.genes.slice(0, RECORDS_PER_DATABASE);
  if (!symbols.length) return [];
  const term = `(${symbols.map((symbol) => `${symbol}[sym]`).join(' OR ')}) AND "${organism}"[orgn]`;
  return (await eutilsSummaries('gene', term)).map(ncbiGeneRecord);
}

export function clinvarRecord(item: any): RecordSource {
  const accession = String(item.accession || `VCV${item.uid}`);
  const classification = item.germline_classification || item.clinical_significance || {};
  const traits = list(classification.trait_set).map((trait) => trait?.trait_name).filter(Boolean).slice(0, 3);
  return record('clinvar', accession, String(item.title || accession), `https://www.ncbi.nlm.nih.gov/clinvar/variation/${item.uid}/`, facts([
    `ClinVar ${accession}`, item.obj_type ? `Type: ${item.obj_type}` : null, list(item.genes).length ? `Gene: ${list(item.genes).map((gene) => gene?.symbol).filter(Boolean).join(', ')}` : null,
    classification.description ? `Germline classification: ${classification.description}` : null, classification.review_status ? `Review status: ${classification.review_status}` : null,
    classification.last_evaluated ? `Last evaluated ${String(classification.last_evaluated).slice(0, 10)}` : null, traits.length ? `Conditions: ${traits.join('; ')}` : null,
  ]));
}

async function clinvar(terms: RecordTerms) {
  const parts = [...terms.variants, ...terms.genes.slice(0, 2).map((gene) => `(${gene}[gene] AND clinsig_pathogenic[prop])`)];
  if (!parts.length) return [];
  return (await eutilsSummaries('clinvar', parts.join(' OR '))).map(clinvarRecord);
}

export function uniprotRecord(entry: any): RecordSource {
  const accession = String(entry.primaryAccession);
  const name = entry.proteinDescription?.recommendedName?.fullName?.value || entry.proteinDescription?.submissionNames?.[0]?.fullName?.value || accession;
  const genes = list(entry.genes).map((gene) => gene?.geneName?.value).filter(Boolean);
  const fn = list(entry.comments).find((comment) => comment?.commentType === 'FUNCTION')?.texts?.[0]?.value;
  return record('uniprot', accession, `${name}${genes.length ? ` (${genes.join(', ')})` : ''}${entry.organism?.scientificName ? `, ${entry.organism.scientificName}` : ''}`, `https://www.uniprot.org/uniprotkb/${accession}/entry`, facts([
    `UniProtKB ${accession}`, entry.entryType ? String(entry.entryType) : null, entry.sequence?.length ? `${entry.sequence.length} amino acids` : null, fn ? `Function: ${clip(fn, 900)}` : null,
  ]));
}

/** Reviewed UniProt entries for the genes and proteins named (also feeds AlphaFold). */
async function uniprotEntries(terms: RecordTerms): Promise<any[]> {
  const names = [...terms.genes.map((gene) => `gene_exact:${gene}`), ...terms.proteins.map((protein) => `protein_name:"${protein.replace(/"/g, '')}"`)].slice(0, 4);
  if (!names.length) return [];
  const organism = terms.organism || 'Homo sapiens';
  const url = new URL('https://rest.uniprot.org/uniprotkb/search');
  url.searchParams.set('query', `(${names.join(' OR ')}) AND reviewed:true AND organism_name:"${organism}"`);
  url.searchParams.set('fields', 'accession,protein_name,gene_names,organism_name,cc_function,length');
  url.searchParams.set('format', 'json');
  url.searchParams.set('size', String(RECORDS_PER_DATABASE));
  const data = await get(url, 'UniProt');
  return list(data?.results).filter((entry) => entry?.primaryAccession).slice(0, RECORDS_PER_DATABASE);
}

export function ensemblRecord(gene: any): RecordSource {
  const id = String(gene.id);
  const species = String(gene.species || 'homo_sapiens');
  return record('ensembl', id, `${gene.display_name || id}: ${clip(gene.description, 160).replace(/\s*\[Source:.*$/, '') || 'gene'}`, `https://www.ensembl.org/${species[0].toUpperCase()}${species.slice(1)}/Gene/Summary?g=${id}`, facts([
    `Ensembl ${id}`, gene.biotype ? `Biotype: ${String(gene.biotype).replace(/_/g, ' ')}` : null, gene.seq_region_name ? `Chromosome ${gene.seq_region_name}:${gene.start}-${gene.end} (${gene.strand === -1 ? 'reverse' : 'forward'} strand)` : null,
    gene.assembly_name ? `Assembly ${gene.assembly_name}` : null, gene.canonical_transcript ? `Canonical transcript ${gene.canonical_transcript}` : null,
  ]));
}

async function ensembl(terms: RecordTerms) {
  const species = (terms.organism || 'Homo sapiens').toLowerCase().replace(/\s+/g, '_');
  const found = await Promise.all(terms.genes.slice(0, RECORDS_PER_DATABASE).map((symbol) =>
    get(`https://rest.ensembl.org/lookup/symbol/${encodeURIComponent(species)}/${encodeURIComponent(symbol)}?content-type=application/json`, 'Ensembl', { pace: { key: 'ensembl', ms: 80 } }).catch(() => null)));
  return found.filter((gene) => gene?.id).map(ensemblRecord);
}

export function reactomeRecord(entry: any): RecordSource {
  const id = String(entry.stId || entry.id);
  return record('reactome', id, `${clip(entry.name, 250)}${list(entry.species).length ? ` (${list(entry.species)[0]})` : ''}`, `https://reactome.org/content/detail/${id}`, facts([`Reactome pathway ${id}`, entry.summation ? clip(entry.summation, 1000) : null]));
}

async function reactome(terms: RecordTerms) {
  const query = [...terms.genes, ...terms.proteins].slice(0, 2).join(' ');
  if (!query) return [];
  const url = new URL('https://reactome.org/ContentService/search/query');
  url.searchParams.set('query', query);
  url.searchParams.set('species', terms.organism || 'Homo sapiens');
  url.searchParams.set('types', 'Pathway');
  url.searchParams.set('cluster', 'true');
  url.searchParams.set('rows', String(RECORDS_PER_DATABASE));
  const data = await get(url, 'Reactome');
  return list(data?.results).flatMap((group) => list(group?.entries)).filter((entry) => entry?.stId).slice(0, RECORDS_PER_DATABASE).map(reactomeRecord);
}

export function pdbRecord(entry: any): RecordSource {
  const id = String(entry.rcsb_id);
  const resolution = list(entry.rcsb_entry_info?.resolution_combined)[0];
  return record('pdb', id, clip(entry.struct?.title, 280) || `PDB ${id}`, `https://www.rcsb.org/structure/${id}`, facts([
    `PDB ${id}`, list(entry.exptl).length ? `Method: ${list(entry.exptl).map((item) => item?.method).filter(Boolean).join(', ').toLowerCase()}` : null,
    Number.isFinite(resolution) ? `Resolution ${resolution} Å` : null, entry.rcsb_accession_info?.initial_release_date ? `Released ${String(entry.rcsb_accession_info.initial_release_date).slice(0, 10)}` : null,
  ]));
}

async function pdb(terms: RecordTerms) {
  const value = [...terms.proteins, ...terms.genes].slice(0, 2).join(' ');
  if (!value) return [];
  const search = await get('https://search.rcsb.org/rcsbsearch/v2/query', 'RCSB PDB', {
    method: 'POST', body: { query: { type: 'terminal', service: 'full_text', parameters: { value } }, return_type: 'entry', request_options: { paginate: { start: 0, rows: RECORDS_PER_DATABASE } } },
  });
  const ids = list(search?.result_set).map((item) => String(item?.identifier || '')).filter((id) => /^[0-9A-Z]{4,12}$/i.test(id)).slice(0, RECORDS_PER_DATABASE);
  if (!ids.length) return [];
  const data = await get('https://data.rcsb.org/graphql', 'RCSB PDB', {
    method: 'POST', body: { query: `{entries(entry_ids:${JSON.stringify(ids)}){rcsb_id struct{title} exptl{method} rcsb_entry_info{resolution_combined} rcsb_accession_info{initial_release_date}}}` },
  });
  return list(data?.data?.entries).filter((entry) => entry?.rcsb_id).map(pdbRecord);
}

export function alphafoldRecord(model: any, name: string): RecordSource {
  const accession = String(model.uniprotAccession || model.modelEntityId?.split('-')[1] || '');
  const id = String(model.modelEntityId || model.entryId || `AF-${accession}-F1`);
  return record('alphafold', id, `Predicted structure of ${name}`, `https://alphafold.ebi.ac.uk/entry/${accession}`, facts([
    `AlphaFold DB ${id}`, 'A computational prediction, not an experimental structure', Number.isFinite(model.globalMetricValue) ? `Mean pLDDT ${Number(model.globalMetricValue).toFixed(1)} of 100` : null,
    Number.isFinite(model.fractionPlddtVeryHigh) ? `${Math.round(model.fractionPlddtVeryHigh * 100)}% of residues very high confidence, ${Math.round((model.fractionPlddtVeryLow ?? 0) * 100)}% very low` : null,
    model.latestVersion ? `Model version ${model.latestVersion}` : null,
  ]));
}

async function alphafold(entries: any[]) {
  const found = await Promise.all(entries.slice(0, RECORDS_PER_DATABASE).map(async (entry) => {
    const models = await get(`https://alphafold.ebi.ac.uk/api/prediction/${encodeURIComponent(entry.primaryAccession)}`, 'AlphaFold DB').catch(() => null);
    const model = list(models)[0];
    if (!model) return null;
    const name = entry.proteinDescription?.recommendedName?.fullName?.value || entry.primaryAccession;
    return alphafoldRecord({ uniprotAccession: entry.primaryAccession, ...model }, name);
  }));
  return found.filter((item): item is RecordSource => Boolean(item));
}

export function gwasRecord(association: any): RecordSource {
  const id = String(association.association_id);
  const snps = list(association.snp_allele).map((snp) => snp?.rs_id).filter(Boolean);
  const trait = list(association.efo_traits).map((item) => item?.efo_trait).filter(Boolean)[0] || list(association.reported_trait)[0] || 'trait';
  const p = Number.isFinite(association.pvalue_mantissa) && Number.isFinite(association.pvalue_exponent) ? `${association.pvalue_mantissa}e${association.pvalue_exponent}` : null;
  return record('gwas', id, `${snps.join(', ') || 'Variant'} and ${trait}${list(association.mapped_genes).length ? ` (${list(association.mapped_genes).join(', ')})` : ''}`, snps[0] ? `https://www.ebi.ac.uk/gwas/variants/${snps[0]}` : `https://www.ebi.ac.uk/gwas/studies/${association.accession_id ?? ''}`, facts([
    `GWAS Catalog association ${id}`, association.accession_id ? `Study ${association.accession_id}` : null, list(association.reported_trait).length ? `Reported trait: ${list(association.reported_trait).join('; ')}` : null,
    p ? `P = ${p}` : null, association.or_per_copy_number ? `Odds ratio ${association.or_per_copy_number}` : association.beta && association.beta !== '-' ? `Beta ${association.beta}` : null,
    association.risk_frequency && association.risk_frequency !== 'NR' ? `Risk allele frequency ${association.risk_frequency}` : null,
    association.first_author ? `First author ${association.first_author}${association.pubmed_id ? `, PMID ${association.pubmed_id}` : ''}` : null,
  ]));
}

async function gwas(terms: RecordTerms) {
  const asks = [...terms.variants.map((rs) => ({ rs_id: rs })), ...terms.genes.slice(0, 1).map((gene) => ({ mapped_gene: gene }))].slice(0, 2);
  const found = await Promise.all(asks.map((ask) => {
    const url = new URL('https://www.ebi.ac.uk/gwas/rest/api/v2/associations');
    for (const [key, value] of Object.entries(ask)) url.searchParams.set(key, value);
    url.searchParams.set('size', String(RECORDS_PER_DATABASE));
    url.searchParams.set('sort', 'p_value');
    url.searchParams.set('direction', 'asc');
    return get(url, 'GWAS Catalog').catch(() => null);
  }));
  return found.flatMap((data) => list(data?._embedded?.associations)).filter((item) => item?.association_id).slice(0, RECORDS_PER_DATABASE).map(gwasRecord);
}

// ------------------------------------------------------------------ chemistry

const PUBCHEM = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';
const PUBCHEM_PACE = { key: 'pubchem', ms: 250, maxWaitMs: 6000 };

export function pubchemRecord(props: any, description: string | null): RecordSource {
  const cid = String(props.CID);
  return record('pubchem', `CID ${cid}`, String(props.Title || props.IUPACName || `CID ${cid}`), `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`, facts([
    `PubChem CID ${cid}`, props.MolecularFormula ? `Formula ${props.MolecularFormula}` : null, props.MolecularWeight ? `Molecular weight ${props.MolecularWeight} g/mol` : null,
    props.IUPACName ? `IUPAC name ${clip(props.IUPACName, 200)}` : null, props.XLogP !== undefined ? `XLogP ${props.XLogP}` : null, props.InChIKey ? `InChIKey ${props.InChIKey}` : null,
    description ? clip(description, 700) : null,
  ]));
}

async function pubchem(terms: RecordTerms) {
  const found = await Promise.all(terms.compounds.slice(0, RECORDS_PER_DATABASE).map(async (name) => {
    const base = `${PUBCHEM}/compound/name/${encodeURIComponent(name)}`;
    const data = await get(`${base}/property/Title,IUPACName,MolecularFormula,MolecularWeight,InChIKey,XLogP/JSON`, 'PubChem', { pace: PUBCHEM_PACE }).catch(() => null);
    const props = list(data?.PropertyTable?.Properties)[0];
    if (!props?.CID) return null;
    const info = await get(`${PUBCHEM}/compound/cid/${props.CID}/description/JSON`, 'PubChem', { pace: PUBCHEM_PACE }).catch(() => null);
    const description = list(info?.InformationList?.Information).find((item) => item?.Description)?.Description ?? null;
    return pubchemRecord(props, description);
  }));
  return found.filter((item): item is RecordSource => Boolean(item));
}

export function chemblRecord(molecule: any): RecordSource {
  const id = String(molecule.molecule_chembl_id);
  const props = molecule.molecule_properties || {};
  const phase = Number(molecule.max_phase);
  return record('chembl', id, `${molecule.pref_name || id}`, `https://www.ebi.ac.uk/chembl/explore/compound/${id}`, facts([
    `ChEMBL ${id}`, molecule.molecule_type ? `Type: ${String(molecule.molecule_type).toLowerCase()}` : null,
    Number.isFinite(phase) && phase > 0 ? (phase >= 4 ? 'Approved drug (max phase 4)' : `Highest clinical phase ${phase}`) : null,
    molecule.first_approval ? `First approved ${molecule.first_approval}` : null, props.full_mwt ? `Molecular weight ${props.full_mwt}` : null,
    props.full_molformula ? `Formula ${props.full_molformula}` : null, Number.isFinite(Number(props.num_ro5_violations)) ? `Rule-of-five violations ${props.num_ro5_violations}` : null,
    molecule.molecule_structures?.standard_inchi_key ? `InChIKey ${molecule.molecule_structures.standard_inchi_key}` : null,
  ]));
}

async function chembl(terms: RecordTerms) {
  const found = await Promise.all(terms.compounds.slice(0, 2).map((name) =>
    get(`https://www.ebi.ac.uk/chembl/api/data/molecule/search.json?q=${encodeURIComponent(name)}&limit=2`, 'ChEMBL').catch(() => null)));
  const seen = new Set<string>();
  return found.flatMap((data) => list(data?.molecules)).filter((molecule) => molecule?.molecule_chembl_id && !seen.has(molecule.molecule_chembl_id) && seen.add(molecule.molecule_chembl_id))
    .slice(0, RECORDS_PER_DATABASE).map(chemblRecord);
}

// ------------------------------------------------------------------ all of them

type Logger = (message: string) => void;
const defaultLog: Logger = (message) => console.warn(`[records] ${message}`);

/**
 * Records for the chosen record groups. Every database runs at once; what has arrived when the
 * time budget ends is kept, and a database that fails is logged and skipped.
 */
export async function findRecords(groups: string[], terms: RecordTerms, options: { budgetMs?: number; log?: Logger } = {}): Promise<{ records: RecordSource[]; counts: Partial<Record<RecordDatabase, number>> }> {
  const log = options.log ?? defaultLog;
  const tasks: { database: RecordDatabase; run: () => Promise<RecordSource[]> }[] = [];
  if (groups.includes('life-sciences') && (terms.genes.length || terms.proteins.length || terms.variants.length)) {
    const entries = uniprotEntries(terms);
    entries.catch(() => undefined);
    tasks.push(
      { database: 'ncbi_gene', run: () => ncbiGene(terms) },
      { database: 'uniprot', run: async () => (await entries).map(uniprotRecord) },
      { database: 'ensembl', run: () => ensembl(terms) },
      { database: 'reactome', run: () => reactome(terms) },
      { database: 'pdb', run: () => pdb(terms) },
      { database: 'alphafold', run: async () => alphafold(await entries) },
      { database: 'gwas', run: () => gwas(terms) },
      { database: 'clinvar', run: () => clinvar(terms) },
    );
  }
  if (groups.includes('chemistry') && terms.compounds.length) {
    tasks.push({ database: 'pubchem', run: () => pubchem(terms) }, { database: 'chembl', run: () => chembl(terms) });
  }
  const done = new Map<RecordDatabase, RecordSource[]>();
  const work = Promise.all(tasks.map(({ database, run }) => run().then(
    (found) => { done.set(database, found.slice(0, RECORDS_PER_DATABASE)); },
    (error) => { log(`${RECORD_DATABASES[database].name} skipped: ${(error as Error)?.message || 'failed'}`); },
  )));
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([work, new Promise<void>((resolve) => { timer = setTimeout(() => { log('time budget reached; keeping the databases that answered'); resolve(); }, options.budgetMs ?? BUDGET_MS); })]);
  clearTimeout(timer);
  // Database order, not arrival order, so a run reads the same way each time.
  const records: RecordSource[] = [];
  const counts: Partial<Record<RecordDatabase, number>> = {};
  const seen = new Set<string>();
  for (const { database } of tasks) {
    const found = (done.get(database) ?? []).filter((item) => !seen.has(item.id) && seen.add(item.id));
    if (found.length) counts[database] = found.length;
    records.push(...found);
  }
  return { records, counts };
}
