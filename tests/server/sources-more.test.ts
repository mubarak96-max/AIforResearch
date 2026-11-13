import { afterEach, describe, expect, it } from 'vitest';
import { searchSources, sourceGroups } from '../../lib/server/lib/sources/index.js';
import { net } from '../../lib/server/lib/sources/http.js';
import { coreQuery, coreToFound, dataciteToFound, openCitationsIds, trialToFound } from '../../lib/server/lib/sources/providers.js';

const realFetch = net.fetch;
afterEach(() => { net.fetch = realFetch; });

const TRIAL = {
  hasResults: true,
  protocolSection: {
    identificationModule: { nctId: 'NCT04862416', briefTitle: 'R0.6C vaccine', officialTitle: 'Safety of R0.6C Vaccine in Adults' },
    statusModule: { overallStatus: 'COMPLETED', startDateStruct: { date: '2021-05-17' } },
    descriptionModule: { briefSummary: 'A first-in-human  phase I study.' },
    designModule: { studyType: 'INTERVENTIONAL', phases: ['PHASE1'], designInfo: { allocation: 'RANDOMIZED' }, enrollmentInfo: { count: 32 } },
    sponsorCollaboratorsModule: { responsibleParty: { investigatorFullName: 'Matthew McCall' }, leadSponsor: { name: 'Radboud' } },
  },
};

const DATASET = {
  id: '10.5061/dryad.9s4mw6mp4',
  attributes: {
    doi: '10.5061/dryad.9s4mw6mp4', titles: [{ title: 'Data from: Atlas of <i>Plasmodium</i>' }],
    creators: [{ nameType: 'Personal', name: 'Liffner, Benjamin' }, { nameType: 'Organizational', name: 'Dryad Lab, Inc' }, { givenName: 'Ana', familyName: 'Diaz', name: 'Diaz, Ana' }],
    publisher: 'Dryad', publicationYear: 2023, published: '2023-03-01', citationCount: 2,
    descriptions: [{ descriptionType: 'Other', description: 'Methods' }, { descriptionType: 'Abstract', description: 'Parasites vary.' }],
    rightsList: [{ rightsUri: 'https://creativecommons.org/publicdomain/zero/1.0/legalcode' }], url: 'https://datadryad.org/x',
  },
};

describe('more scholarly sources', () => {
  it('reads a registered trial: id, design, status line and lead investigator', () => {
    const trial = trialToFound(TRIAL);
    expect(trial).toMatchObject({
      id: 'NCT:NCT04862416', title: 'Safety of R0.6C Vaccine in Adults', year: 2021, publication_date: '2021-05-17', study_type: 'rct',
      venue: 'ClinicalTrials.gov', url: 'https://clinicaltrials.gov/study/NCT04862416', is_oa: true, providers: ['clinicaltrials'],
    });
    expect(trial.abstract).toBe('Status: Completed. Phase 1. 32 participants. Results posted. A first-in-human phase I study.');
    expect(trial.authors).toEqual([{ name: 'Matthew McCall' }]);
    const observational = trialToFound({ protocolSection: { ...TRIAL.protocolSection, designModule: { studyType: 'OBSERVATIONAL', designInfo: { observationalModel: 'CASE_CONTROL' } } } });
    expect(observational.study_type).toBe('case-control');
  });

  it('reads a DataCite dataset: given-family names, the abstract and an open licence', () => {
    const dataset = dataciteToFound(DATASET);
    expect(dataset).toMatchObject({
      id: 'DC:10.5061/dryad.9s4mw6mp4', doi: '10.5061/dryad.9s4mw6mp4', title: 'Data from: Atlas of Plasmodium', year: 2023, venue: 'Dryad',
      abstract: 'Parasites vary.', cited_by_count: 2, is_oa: true, type: 'dataset', url: 'https://doi.org/10.5061/dryad.9s4mw6mp4',
    });
    expect(dataset.authors.map((author) => author.name)).toEqual(['Benjamin Liffner', 'Dryad Lab, Inc', 'Ana Diaz']);
  });

  it('reads a CORE work and writes its year range in CORE syntax', () => {
    const paper = coreToFound({ id: 42, title: 'Sleep and memory', authors: [{ name: 'Jan Born' }], yearPublished: 2019, doi: '10.1234/ABC', downloadUrl: 'https://core.ac.uk/download/42.pdf', journals: [{ title: 'Sleep' }] });
    expect(paper).toMatchObject({ id: 'CORE:42', doi: '10.1234/abc', year: 2019, venue: 'Sleep', is_oa: true, pdf_url: 'https://core.ac.uk/download/42.pdf', providers: ['core'] });
    expect(coreQuery('sleep memory', { fromYear: 2015, toYear: 2020 })).toBe('(sleep memory) AND yearPublished>=2015 AND yearPublished<=2020');
    expect(coreQuery('sleep memory', {})).toBe('sleep memory');
  });

  it('reads the ids in an OpenCitations row', () => {
    expect(openCitationsIds('omid:br/061101490124 pmid:23288346 doi:10.1007/s10549-012-2393-x openalex:W2093130510')).toEqual({ doi: '10.1007/s10549-012-2393-x', openalex: 'W2093130510' });
    expect(openCitationsIds('omid:br/1')).toEqual({ doi: null, openalex: null });
  });

  it('offers Clinical trials and Datasets, and searches them only when chosen', async () => {
    expect(sourceGroups().map((group) => group.id)).toEqual(expect.arrayContaining(['trials', 'datasets']));
    const asked: string[] = [];
    net.fetch = async (input) => {
      const url = String(input);
      asked.push(new URL(url).hostname);
      if (url.includes('clinicaltrials.gov')) return new Response(JSON.stringify({ studies: [TRIAL] }), { status: 200 });
      if (url.includes('datacite.org')) return new Response(JSON.stringify({ data: [DATASET] }), { status: 200 });
      return new Response('{}', { status: 500 });
    };
    const result = await searchSources({ query: 'malaria vaccine trial data', groups: ['trials', 'datasets'], limit: 10 });
    expect([...new Set(asked)].sort()).toEqual(['api.datacite.org', 'clinicaltrials.gov']);
    expect(result.counts).toEqual({ clinicaltrials: 1, datacite: 1 });
    expect(result.papers.map((paper) => paper.id).sort()).toEqual(['DC:10.5061/dryad.9s4mw6mp4', 'NCT:NCT04862416']);
  });
});
