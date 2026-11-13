import { describe, expect, it } from 'vitest';
import { cleanMermaidSource, diagramPrompt, MAX_DIAGRAM_CHARS } from '../../lib/server/lib/diagram.js';

describe('Draw with AI: Mermaid output checks', () => {
  it('takes the source out of a code fence and the prose around it', () => {
    const raw = 'Here is your diagram:\n```mermaid\nflowchart TD\n  A["Records (n = 1240)"] --> B["Screened"]\n```\nHope this helps!';
    expect(cleanMermaidSource(raw)).toBe('flowchart TD\n  A["Records (n = 1240)"] --> B["Screened"]');
  });

  it('starts at the diagram type and keeps plain answers as they are', () => {
    expect(cleanMermaidSource('Sure.\ntimeline\n  title Study\n  2025 : Pilot')).toBe('timeline\n  title Study\n  2025 : Pilot');
    expect(cleanMermaidSource('  flowchart LR\n  A --> B  ')).toBe('flowchart LR\n  A --> B');
  });

  it('drops init directives, click handlers and HTML tags', () => {
    const cleaned = cleanMermaidSource('%%{init: {"securityLevel": "loose"}}%%\nflowchart TD\n  A --> B\n  click A "javascript:alert(1)"\n  B["<script>x</script>Done<img src=x>"]')!;
    expect(cleaned).not.toMatch(/init|click|<script|<img/);
    expect(cleaned).toContain('B["xDone"]');
  });

  it('refuses answers that are not a diagram, are a single line or are too long', () => {
    expect(cleanMermaidSource('I cannot draw that.')).toBeNull();
    expect(cleanMermaidSource('')).toBeNull();
    expect(cleanMermaidSource(null)).toBeNull();
    expect(cleanMermaidSource('flowchart TD')).toBeNull();
    expect(cleanMermaidSource(`flowchart TD\n${'  A --> B\n'.repeat(MAX_DIAGRAM_CHARS / 5)}`)).toBeNull();
  });

  it('asks for the chosen kind of diagram, Mermaid only', () => {
    const messages = diagramPrompt({ prompt: 'Screening 1,240 records to 32 studies', kind: 'study-flow' });
    expect(messages[0].content).toContain('Mermaid source only');
    expect(messages[1].content).toContain('CONSORT or PRISMA');
    expect(messages[1].content).toContain('1,240 records');
  });
});
