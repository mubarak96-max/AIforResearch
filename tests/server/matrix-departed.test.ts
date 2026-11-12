import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = await vi.hoisted(async () => (await import('./fakeFirestore.js')).createFakeFirestore());
vi.mock('../../lib/server/firebase.js', async (original) => ({
  ...(await original<typeof import('../../lib/server/firebase.js')>()), ...fake.module,
  getMany: async (collection: string, ids: string[]) => ids.flatMap((id) => {
    const data = fake.read(`${collection}/${id}`);
    return data ? [{ id, ...data }] : [];
  }),
}));

import { fillRow, papersForMatrix, verifiedQuote, type MatrixDoc } from '../../lib/server/lib/matrix.js';
import { removeMember } from '../../lib/server/lib/projects.js';
import type { Slots } from '../../lib/server/slots/types.js';

const owner = { id: 'owner', email: 'owner@example.test', full_name: 'Owner', account_id: 'account-owner', is_admin: false };
const peerSource = '22222222-2222-4222-8222-222222222222';
const ownSource = '33333333-3333-4333-8333-333333333333';

beforeEach(() => fake.clear());

describe('matrix sources after a member leaves', () => {
  it('stops reading the departed member\'s Library but keeps a bibliographic snapshot', async () => {
    fake.put('projects/shared', {
      name: 'Shared', owner_user_id: 'owner', owner_email: owner.email, member_ids: ['owner', 'peer'],
      members: [{ user_id: 'peer', email: 'peer@example.test', role: 'edit' }],
    });
    fake.put(`library_documents/${peerSource}`, { user_id: 'peer', title: 'Peer paper', abstract: 'Private abstract' });
    fake.put(`library_documents/${ownSource}`, { user_id: 'owner', title: 'Owner paper' });
    fake.put('review_matrices/m1', {
      user_id: 'owner', title: 'Matrix', columns: [], project_id: 'shared',
      document_ids: [peerSource, ownSource], document_owners: { [peerSource]: 'peer', [ownSource]: 'owner' },
      created_at: new Date(), updated_at: new Date(),
    });

    await removeMember(owner, 'shared', 'peer@example.test');

    const matrix = { id: 'm1', ...fake.read('review_matrices/m1') } as MatrixDoc;
    expect(Object.keys(matrix.departed_sources ?? {})).toEqual([peerSource]);
    fake.put(`library_documents/${peerSource}`, { user_id: 'peer', title: 'Renamed later' });
    const papers = await papersForMatrix(matrix);
    expect(papers.map((paper) => paper.title)).toEqual(['Peer paper', 'Owner paper']);
    expect(papers[0].abstract).toBeNull();
    await expect(fillRow({} as Slots, owner, matrix, peerSource)).rejects.toThrow('left the project');
  });
});

describe('matrix quotation check', () => {
  const passage = 'We interviewed 24 participants in 2021. The response rate was 81%.';
  it('accepts a real quotation and rejects trivially short or numeric ones', () => {
    expect(verifiedQuote('We interviewed 24 participants', passage)).toBe('We interviewed 24 participants');
    expect(verifiedQuote('the', passage)).toBeNull();
    expect(verifiedQuote('24', passage)).toBeNull();
    expect(verifiedQuote('2021. 81%', passage)).toBeNull();
    expect(verifiedQuote('We surveyed 24 people', passage)).toBeNull();
  });
});
