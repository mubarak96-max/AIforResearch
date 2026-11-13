/**
 * "Draw with AI" for the editor's diagram block: the prompt that asks for Mermaid source, and the
 * checks its answer must pass before the browser parses it with mermaid itself. Pure, for tests.
 */
import type { ChatMessage } from '../slots/types.js';

export const DIAGRAM_KINDS = {
  flowchart: 'a flowchart of the process or decision steps, top to bottom ("flowchart TD")',
  framework: 'a conceptual framework: the constructs or variables as boxes and their hypothesised relationships as labelled arrows, left to right ("flowchart LR"); group related constructs in subgraphs where it helps',
  'study-flow': 'a study flow diagram in the style of CONSORT or PRISMA: enrolment or records identified, screening, exclusions with reasons (side boxes), allocation or inclusion, follow-up and analysis, top to bottom ("flowchart TD"); counts only where the description gives them, otherwise "n = [ ]"',
  timeline: 'a timeline of phases or events in order ("timeline", with a title line and "section" lines for phases if useful)',
} as const;
export type DiagramKind = keyof typeof DIAGRAM_KINDS;

/** Diagram types the block accepts (the first word of the source). */
const DIAGRAM_TYPES = /^(flowchart|graph|sequenceDiagram|timeline|mindmap|gantt|classDiagram|stateDiagram(?:-v2)?|erDiagram|journey|quadrantChart|pie)\b/;
export const MAX_DIAGRAM_CHARS = 8000;

export function diagramPrompt(input: { prompt: string; kind: DiagramKind; context?: string | null; language?: string | null }): ChatMessage[] {
  return [
    {
      role: 'system',
      content: 'You draw diagrams for academic documents as Mermaid source code. Answer with the Mermaid source only: no code fences, no explanation. ' +
        'Rules: short labels (under 8 words); put every label in double quotes, e.g. A["Recruited (n = 120)"], and never use double quotes inside a label; ' +
        'node ids are simple letters or words; no HTML, no "click" lines, no "%%{init}%%" directives, no styles or classDef; at most 25 nodes. ' +
        `Write the labels in ${input.language || 'the language of the request'}. Never invent numbers the request does not give.`,
    },
    {
      role: 'user',
      content: `Draw ${DIAGRAM_KINDS[input.kind]}.\n\nWhat to draw:\n${input.prompt.trim().slice(0, 4000)}` +
        (input.context?.trim() ? `\n\nThe document it goes in (for context only):\n${input.context.trim().slice(0, 6000)}` : ''),
    },
  ];
}

/**
 * The model's answer as Mermaid source, or null when it is not a diagram: code fences and prose
 * around it removed, init directives, click handlers and HTML tags dropped, a known diagram type
 * on the first line, and a sane size.
 */
export function cleanMermaidSource(raw: string | null | undefined): string | null {
  let text = String(raw ?? '').replace(/\r\n?/g, '\n').trim();
  const fenced = text.match(/```(?:mermaid)?[^\n]*\n([\s\S]*?)```/i);
  if (fenced) text = fenced[1];
  const lines = text.split('\n')
    .filter((line) => !/^\s*%%\{/.test(line)) // init / config directives
    .filter((line) => !/^\s*click\s/i.test(line)) // links and callbacks
    .map((line) => line.replace(/<\/?(?:script|iframe|object|embed|style|a|img)\b[^>]*>/gi, '').replace(/\s+$/, ''));
  // Start at the diagram type: any prose before it is dropped.
  const start = lines.findIndex((line) => DIAGRAM_TYPES.test(line.trim()));
  if (start < 0) return null;
  const body = lines.slice(start);
  body[0] = body[0].trim();
  const source = body.join('\n').trim();
  if (source.split('\n').length < 2 || source.length > MAX_DIAGRAM_CHARS || source.split('\n').length > 300) return null;
  return source;
}
