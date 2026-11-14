/**
 * Project continuity: which parts of the project's documents need another look.
 *
 *   PUT /api/documents/:id/evidence-links   the editor reports the citations in a document that point at
 *                                           project evidence (claim, claim state, finding); editors only
 *   GET /api/projects/:project/attention    for each project document: sentences changed since they were
 *                                           checked, citations of findings sent back for revision, still
 *                                           awaiting review or removed; plus the latest progress "next steps"
 *
 * Links are stored per project (projects/{p}/document_links/{documentId}), so deleting a project removes
 * them. The document keeps the list of projects it reported to (documents/{id}/evidence_links/current), so a
 * citation removed from the document also disappears from the project. Sentence excerpts are shown only to
 * people who can open the document.
 */
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { requireUser, type AppVariables, type AuthUser } from '../auth.js';
import { C, col, db, row, rows } from '../firebase.js';
import { currentUser, parseBody } from '../lib/assist-llm.js';
import { EDIT_ROLES, resolveAccess } from '../lib/access.js';
import { getProjectFor, listProgress } from '../lib/projects.js';

const id = z.string().trim().min(1).max(200).regex(/^[\w-]+$/);
const Link = z.object({
  citation_id: z.string().max(200).default(''),
  block_id: z.string().max(100).default(''),
  project_id: id,
  source_id: id.nullable().default(null),
  finding_id: id.nullable().default(null),
  library_document_id: z.string().max(200).nullable().default(null),
  claim: z.string().max(600).default(''),
  state: z.enum(['checked', 'changed', 'unchecked']),
  checked_at: z.string().max(40).nullable().default(null),
});
type StoredLink = z.output<typeof Link>;
type LinkDoc = { id: string; document_id: string; document_title: string; links: StoredLink[]; updated_at: Date; updated_by: string };

const linksRef = (project: string) => col(C.projects).doc(project).collection('document_links');
const reportRef = (document: string) => col(C.documents).doc(document).collection('evidence_links').doc('current');
const MAX_PROJECTS = 20;

export type AttentionItem = {
  kind: 'claim_changed' | 'finding_revision' | 'finding_unreviewed' | 'evidence_removed';
  block_id: string; claim: string | null; source_id: string | null; finding_id: string | null; href: string | null;
};

const DETAIL: Record<AttentionItem['kind'], string> = {
  claim_changed: 'The sentence changed after it was checked against its evidence.',
  finding_revision: 'A reviewer asked for the cited finding to be revised.',
  finding_unreviewed: 'The cited finding has not been reviewed yet.',
  evidence_removed: 'The cited finding or source is no longer in the project.',
};

/** 'missing' when the document was deleted, so its links can be dropped. */
async function canOpen(documentId: string, user: AuthUser): Promise<boolean | 'missing'> {
  if (!row(await col(C.documents).doc(documentId).get())) return 'missing';
  try { await resolveAccess(documentId, user, { blocks: false }); return true; } catch { return false; }
}

export async function projectAttention(user: AuthUser, projectId: string) {
  const project = await getProjectFor(user, projectId);
  const linkDocs = rows<LinkDoc>(await linksRef(project.id).get()).slice(0, 200);
  const findings = new Map<string, Map<string, { status: string }> | null>();
  const findingsOf = async (sourceId: string) => {
    if (!findings.has(sourceId)) {
      const source = col(C.projects).doc(project.id).collection('evidence').doc(sourceId);
      const exists = row(await source.get());
      findings.set(sourceId, exists ? new Map(rows<{ id: string; status: string }>(await source.collection('findings').get()).map((item) => [item.id, item])) : null);
    }
    return findings.get(sourceId)!;
  };
  const documents = [];
  for (const linked of linkDocs) {
    const access = await canOpen(linked.document_id, user);
    if (access === 'missing') { await linksRef(project.id).doc(linked.id).delete(); continue; }
    const accessible = access;
    const items: (AttentionItem & { detail: string })[] = [];
    let unchecked = 0;
    for (const link of linked.links) {
      const href = accessible ? `/editor?${new URLSearchParams({ doc: linked.document_id, ...(link.block_id ? { block: link.block_id } : {}) })}` : null;
      const base = { block_id: link.block_id, claim: accessible ? link.claim : null, source_id: link.source_id, finding_id: link.finding_id, href };
      let kind: AttentionItem['kind'] | null = null;
      if (link.source_id && link.finding_id) {
        const sourceFindings = await findingsOf(link.source_id);
        const finding = sourceFindings?.get(link.finding_id);
        if (!finding) kind = 'evidence_removed';
        else if (finding.status === 'needs_revision') kind = 'finding_revision';
        else if (link.state !== 'changed' && finding.status === 'needs_review') kind = 'finding_unreviewed';
      }
      if (link.state === 'changed' && kind !== 'evidence_removed' && kind !== 'finding_revision') kind = 'claim_changed';
      if (kind) items.push({ ...base, kind, detail: DETAIL[kind] });
      else if (link.state === 'unchecked') unchecked += 1;
    }
    documents.push({
      document_id: linked.document_id, title: accessible ? linked.document_title || 'Untitled document' : null, accessible,
      href: accessible ? `/editor?doc=${encodeURIComponent(linked.document_id)}` : null,
      citations: linked.links.length, unchecked, items,
      updated_at: new Date(linked.updated_at).toISOString(),
    });
  }
  const order = { claim_changed: 1, finding_revision: 0, evidence_removed: 2, finding_unreviewed: 3 } as const;
  for (const document of documents) document.items.sort((a, b) => order[a.kind] - order[b.kind]);
  documents.sort((a, b) => b.items.length - a.items.length || b.updated_at.localeCompare(a.updated_at));
  const { entries } = await listProgress(user, project.id);
  const latest = entries.find((entry) => entry.next?.trim() || entry.blockers?.trim()) ?? null;
  return {
    documents,
    total: documents.reduce((sum, document) => sum + document.items.length, 0),
    next_steps: latest ? { date: latest.date, next: latest.next || '', blockers: latest.blockers || '' } : null,
  };
}

export function projectAttentionRoutes() {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('/documents/:id/evidence-links', requireUser);
  app.use('/projects/:project/attention', requireUser);

  app.put('/documents/:id/evidence-links', async (c) => {
    const user = currentUser(c);
    const documentId = c.req.param('id');
    if (!/^[\w-]{1,200}$/.test(documentId)) throw new HTTPException(404, { message: 'Document not found' });
    const { document, role } = await resolveAccess(documentId, user, { blocks: false });
    if (!EDIT_ROLES.includes(role)) throw new HTTPException(403, { message: 'Only editors of this document can update its evidence links.' });
    const body = await parseBody(c, z.object({ links: z.array(Link).max(500) }));
    const byProject = new Map<string, StoredLink[]>();
    for (const link of body.links) byProject.set(link.project_id, [...(byProject.get(link.project_id) ?? []), link]);
    // Only projects this person may change; links to other projects stay as their members last reported them.
    const writable: string[] = [];
    for (const projectId of [...byProject.keys()].slice(0, MAX_PROJECTS)) {
      try { await getProjectFor(user, projectId, ['owner', 'edit']); writable.push(projectId); } catch { /* not a project editor */ }
    }
    const previous = (row<{ project_ids?: string[] }>(await reportRef(documentId).get())?.project_ids) ?? [];
    const batch = db().batch();
    const now = new Date();
    for (const projectId of writable) {
      batch.set(linksRef(projectId).doc(documentId), { document_id: documentId, document_title: String(document.title || '').slice(0, 300), links: byProject.get(projectId), updated_at: now, updated_by: user.id });
    }
    for (const projectId of previous) if (!byProject.has(projectId)) batch.delete(linksRef(projectId).doc(documentId));
    const kept = previous.filter((projectId) => byProject.has(projectId) && !writable.includes(projectId));
    batch.set(reportRef(documentId), { project_ids: [...new Set([...writable, ...kept])], updated_at: now });
    await batch.commit();
    return c.json({ saved: true, projects: writable });
  });

  app.get('/projects/:project/attention', async (c) => {
    c.header('Cache-Control', 'private, no-store');
    return c.json(await projectAttention(currentUser(c), c.req.param('project')));
  });
  return app;
}
