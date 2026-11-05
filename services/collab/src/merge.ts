/**
 * Comments sent from an older copy of the document: the sender's list wins, plus comments others
 * added after that copy (createdAt after `baseRevision`), which the sender could not have seen.
 */
export function mergeStaleComments(current: any[], incoming: any[], baseRevision: number): any[] {
  const sent = new Set(incoming.map((comment) => comment?.id));
  const addedElsewhere = current.filter((comment) => comment && !sent.has(comment.id) && Number(comment.createdAt) > baseRevision);
  return [...addedElsewhere, ...incoming];
}
