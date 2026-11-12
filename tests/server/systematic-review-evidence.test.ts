import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
vi.mock('../../lib/server/firebase.js', async (original) => ({ ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module }));
vi.mock('../../lib/server/usage.js', () => ({ recordUsage: async () => undefined }));

import { addRecords, appraisalTemplate, attachFullText, createReview, extractRows, fullTextPages, loadRecords, resolve, reviewAudit, reviewState, saveExtraction, suggestDecisions, vote, withFullTexts } from '../../lib/server/lib/systematicReview.js';
import { blindedRecord, checkedExtraction } from '../../lib/server/lib/systematicReviewEvidence.js';
import { forgetPlans } from '../../lib/server/lib/plans.js';
import { prismaCounts } from '../../lib/server/lib/systematicReviewStats.js';
import { USER, fakeLlm } from './assist-helpers.js';

const peer = { ...USER, id: '33333333-3333-4333-8333-333333333333', email: 'peer@example.com' };
const docId = '44444444-4444-4444-8444-444444444444';
const record = (id = 'paper') => ({ id, title: 'Interviews with staff', authors: [], year: 2024, venue: null, doi: null, pmid: null, abstract: 'An abstract with no sample size.', url: null, source: 'Imported', duplicate_of: null, dup_reason: null, search_id: null, order: 0, votes: {}, ai: {}, resolved: {} });

beforeEach(() => { fake.clear(); forgetPlans(); });

describe('full-text evidence and independent review', () => {
  it('uses the current owner account for record limits after leaving a Team, including collaborator imports', async () => {
    fake.put('accounts/old-team', { plan: 'team', plan_status: 'active', plan_source: 'dodo' });
    fake.put('projects/team-cap-project', { owner_user_id: USER.id, owner_email: USER.email, members: [{ user_id: peer.id, email: peer.email, role: 'edit' }] });
    const review = await createReview({ ...USER, account_id: 'old-team' }, { title: 'Portable review', question: 'Experiences?', review_type: 'qualitative', project_id: 'team-cap-project' });
    expect((await reviewState({ ...USER, account_id: 'old-team' }, review.id)).limit).toBe(10_000);
    fake.put(`users/${USER.id}`, { ...USER, disabled_at: null });
    expect((await reviewState(USER, review.id)).limit).toBe(50);
    expect((await reviewState({ ...peer, account_id: 'old-team' }, review.id)).limit).toBe(50);
    const imported = await addRecords({ ...peer, account_id: 'old-team' }, review.id, Array.from({ length: 60 }, (_, index) => ({ ...record(), title: `Distinct study ${index} on lived experiences` })), { database: 'Imported', query: 'saved.csv', count: 60, kind: 'upload' });
    expect(imported).toMatchObject({ added: 50, over_limit: 10, limit: 50 });
    expect(fake.read(`systematic_reviews/${review.id}`)?.account_id).toBe('old-team');
  });
  it('does not count legacy abstract-only full-stage AI suggestions as source-backed decisions', async () => {
    fake.put('systematic_reviews/legacy/records/paper', { ...record(), ai: { title: { decision: 'include', reason: 'Relevant' }, full: { decision: 'include', reason: 'Legacy suggestion' } } });
    const loaded = (await loadRecords('legacy'))[0];
    expect(loaded.ai?.title?.decision).toBe('include');
    expect(loaded.ai?.full).toBeNull();
  });
  it('rejects invented quotations and wrong page claims while preserving real page anchors', () => {
    const pages = [{ page: 4, text: 'We interviewed 24 participants. Interviews lasted one hour.', order: 0 }];
    expect(checkedExtraction('24', 'We interviewed 24 participants.', 4, pages, 'v1')).toMatchObject({ value: '24', page: 4, status: 'verified_quote', source_revision: 'v1' });
    expect(checkedExtraction('50', 'We interviewed 50 participants.', 4, pages, 'v1')).toMatchObject({ status: 'unverified', quote: null });
    expect(checkedExtraction('24', 'We interviewed 24 participants.', 8, pages, 'v1').status).toBe('unverified');
    expect(checkedExtraction('Not reported', null, null, pages, 'v1').status).toBe('not_reported');
  });

  it('does not send abstracts to a full-text operation without full text', async () => {
    const review = await createReview(USER, { title: 'Review', question: 'Experiences?', review_type: 'qualitative' });
    const llm = fakeLlm('{}');
    await expect(suggestDecisions(llm, review, 'full', [record()])).rejects.toThrow('requires an attached readable full text');
    await expect(extractRows(llm, review, [record()])).rejects.toThrow('requires an attached readable full text');
    expect(llm.calls).toHaveLength(0);
    expect(await withFullTexts(review.id, [record()])).toMatchObject({ ready: [], unavailable: [{ id: 'paper' }] });
  });

  it('copies only an owned Library document and invalidates decisions when its version changes', async () => {
    const review = await createReview(USER, { title: 'Review', question: 'Experiences?', review_type: 'qualitative' });
    fake.put(`systematic_reviews/${review.id}/records/paper`, record());
    fake.put(`library_documents/${docId}`, { user_id: peer.id, title: 'Private paper', processing_status: 'completed' });
    await expect(attachFullText(USER, review.id, 'paper', docId)).rejects.toThrow('Choose a document from your Library');
    fake.put(`library_documents/${docId}`, { user_id: USER.id, title: 'Owned paper', processing_status: 'completed' });
    fake.put(`library_documents/${docId}/chunks/0`, { content: 'We interviewed 24 participants.', page: 4, chunk_index: 0 });
    const snapshot = await attachFullText(USER, review.id, 'paper', docId);
    expect(snapshot).toMatchObject({ pages: 1, attached_by: USER.id });
    await vote(USER, review.id, 'paper', 'title', 'include', null);
    await vote(USER, review.id, 'paper', 'full', 'include', null);
    await saveExtraction(USER, review.id, 'paper', { sample_size: '24' }, {}, { template: 'qualitative', notes: { reflexivity: 'Researcher position explained on page 3.' } });
    const first = (await loadRecords(review.id))[0];
    expect(await fullTextPages(review.id, first)).toMatchObject([{ page: 4, text: 'We interviewed 24 participants.' }]);
    const replacement = await attachFullText(USER, review.id, 'paper', docId);
    expect(replacement.revision).not.toBe(snapshot.revision);
    const replaced = (await loadRecords(review.id))[0];
    expect(replaced.votes.full).toEqual({});
    expect(replaced.extraction).toEqual({});
    expect(replaced.appraisal_notes).toEqual({});
    expect((await reviewAudit(USER, review.id)).filter((event) => event.action === 'full_text_attached')).toHaveLength(2);
  });

  it('uses attached pages for extraction and rejects unsupported model output', async () => {
    const review = await createReview(USER, { title: 'Review', question: 'Experiences?', review_type: 'qualitative' });
    const evidence = { ...record(), full_text: { revision: 'v1', library_document_id: docId, title: 'Paper', sha256: 'a', pages: 1, characters: 31, attached_by: USER.id, attached_at: new Date().toISOString() }, evidence_pages: [{ page: 4, text: 'We interviewed 24 participants.', order: 0 }] };
    const llm = fakeLlm(JSON.stringify({ items: [{ id: 'paper', values: { sample_size: { value: '24', quote: 'We interviewed 24 participants.', page: 4 }, funding: { value: 'Industry', quote: 'Funded by industry.', page: 4 } } }] }));
    const result = await extractRows(llm, review, [evidence]);
    expect(llm.calls[0].messages[1].content).toContain('[Page 4] We interviewed 24 participants.');
    expect(llm.calls[0].messages[1].content).not.toContain('An abstract with no sample size.');
    expect(result.rows.get('paper')?.sample_size).toMatchObject({ value: '24', page: 4, status: 'verified_quote' });
    expect(result.rows.get('paper')?.funding?.status).toBe('unverified');
  });

  it('hides peer and AI opinions until an independent vote and restricts adjudication', async () => {
    const projectId = 'review-project-blinding';
    fake.put(`projects/${projectId}`, { owner_user_id: USER.id, owner_email: USER.email, members: [{ user_id: peer.id, email: peer.email, role: 'edit' }] });
    const review = await createReview(USER, { title: 'Review', question: 'Experiences?', review_type: 'qualitative', project_id: projectId });
    fake.put(`systematic_reviews/${review.id}/records/paper`, { ...record(), ai: { title: { decision: 'exclude', reason: 'Wrong design' } } });
    await vote(USER, review.id, 'paper', 'title', 'include', null);
    let state = await reviewState(peer, review.id);
    expect(state.records[0].votes.title).toEqual({});
    expect(state.records[0].ai?.title).toBeUndefined();
    expect(state.records[0].title_state.status).toBe('pending');
    expect((await reviewAudit(peer, review.id)).find((event) => event.action === 'vote')).toMatchObject({ before: null, after: null, blinded: true });
    await vote(peer, review.id, 'paper', 'title', 'exclude', 'Wrong study design');
    state = await reviewState(peer, review.id);
    expect(state.records[0].votes.title?.[USER.id].decision).toBe('include');
    expect(state.records[0].title_state.status).toBe('conflict');
    await expect(resolve(peer, review.id, 'paper', 'title', 'include', null)).rejects.toThrow('Only the review or project owner');
    await resolve(USER, review.id, 'paper', 'title', 'include', null);
    const events = await reviewAudit(USER, review.id);
    expect(events.filter((event) => event.action === 'vote')).toHaveLength(2);
    expect(events.some((event) => event.action === 'adjudication')).toBe(true);
  });

  it('separates unavailable reports from full texts assessed and keeps count reconciliation', () => {
    const missing = { ...record(), votes: { title: { a: { decision: 'include' as const } }, full: { a: { decision: 'exclude' as const, reason: 'Full text not available' } } } };
    const counts = prismaCounts([missing], { dual: false, aiSecond: false });
    expect(counts).toMatchObject({ sought: 1, assessed: 0, not_retrieved: 1, excluded_full_total: 0, included: 0 });
    expect(counts.sought).toBe(counts.assessed + counts.not_retrieved + counts.awaiting_full + counts.conflicts_full);
    expect(blindedRecord(missing, 'b', true).votes.title).toEqual({});
  });
});

describe('screening outcome changes and locked decisions', () => {
  const third = { ...USER, id: '55555555-5555-4555-8555-555555555555', email: 'third@example.com' };
  const setupProject = (projectId: string) => fake.put(`projects/${projectId}`, {
    owner_user_id: USER.id, owner_email: USER.email,
    members: [{ user_id: peer.id, email: peer.email, role: 'edit' }, { user_id: third.id, email: third.email, role: 'edit' }],
  });
  const attachOwned = async (reviewId: string) => {
    fake.put(`library_documents/${docId}`, { user_id: USER.id, title: 'Owned paper', processing_status: 'completed' });
    fake.put(`library_documents/${docId}/chunks/0`, { content: 'We interviewed 24 participants.', page: 4, chunk_index: 0 });
    await attachFullText(USER, reviewId, 'paper', docId);
  };

  it('keeps full-text work when a late title vote agrees, and clears it when the outcome flips', async () => {
    setupProject('outcome-project');
    const review = await createReview(USER, { title: 'Review', question: 'Experiences?', review_type: 'qualitative', project_id: 'outcome-project' });
    fake.put(`systematic_reviews/${review.id}/records/paper`, record());
    await attachOwned(review.id);
    await vote(USER, review.id, 'paper', 'title', 'include', null);
    await vote(peer, review.id, 'paper', 'title', 'include', null);
    await vote(USER, review.id, 'paper', 'full', 'include', null);
    await saveExtraction(USER, review.id, 'paper', { sample_size: '24' }, {});
    await vote(third, review.id, 'paper', 'title', 'include', null);
    let saved = (await loadRecords(review.id))[0];
    expect(saved.votes.full?.[USER.id]?.decision).toBe('include');
    expect(saved.extraction?.sample_size?.value).toBe('24');
    await resolve(USER, review.id, 'paper', 'title', 'exclude', 'Wrong population');
    saved = (await loadRecords(review.id))[0];
    expect(saved.votes.full).toEqual({});
    expect(saved.extraction).toEqual({});
    expect((await reviewAudit(USER, review.id)).some((event) => event.action === 'downstream_invalidated')).toBe(true);
  });

  it('locks a decision once other decisions are visible and leaves changes to adjudication', async () => {
    setupProject('lock-project');
    const review = await createReview(USER, { title: 'Review', question: 'Experiences?', review_type: 'qualitative', project_id: 'lock-project' });
    fake.put(`systematic_reviews/${review.id}/records/paper`, record());
    await vote(USER, review.id, 'paper', 'title', 'include', null);
    await vote(USER, review.id, 'paper', 'title', 'maybe', null); // Nothing else visible yet.
    await vote(peer, review.id, 'paper', 'title', 'exclude', 'Wrong design');
    await expect(vote(peer, review.id, 'paper', 'title', 'include', null)).rejects.toThrow('locked');
    await expect(vote(USER, review.id, 'paper', 'title', null, null)).rejects.toThrow('locked');
    await resolve(USER, review.id, 'paper', 'title', 'include', null);
    expect((await loadRecords(review.id))[0].resolved?.title?.decision).toBe('include');
  });

  it('records only full-text data when a new full text is attached', async () => {
    const review = await createReview(USER, { title: 'Review', question: 'Experiences?', review_type: 'qualitative' });
    fake.put(`systematic_reviews/${review.id}/records/paper`, record());
    await vote(USER, review.id, 'paper', 'title', 'include', null);
    await attachOwned(review.id);
    await vote(USER, review.id, 'paper', 'full', 'include', null); // Full-stage audit entries are shown after voting there.
    const event = (await reviewAudit(USER, review.id)).find((item) => item.action === 'full_text_attached');
    expect(event.before.votes).toEqual({ full: {} });
    expect(Object.keys(event.after.votes)).toEqual(['full']);
    expect(Object.keys(event.before.resolved)).toEqual(['full']);
  });

  it('keeps the qualitative appraisal template when a save does not name one', async () => {
    const review = await createReview(USER, { title: 'Review', question: 'Experiences?', review_type: 'qualitative' });
    fake.put(`systematic_reviews/${review.id}/records/paper`, record());
    await saveExtraction(USER, review.id, 'paper', { sample_size: '24' }, {});
    expect(fake.read(`systematic_reviews/${review.id}/records/paper`)?.appraisal_template).toBe('qualitative');
    expect(appraisalTemplate(undefined, 'observational', 'qualitative')).toBe('observational');
    expect(appraisalTemplate('made-up', undefined, 'systematic')).toBe('intervention');
  });
});
