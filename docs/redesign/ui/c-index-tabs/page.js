// Style C, "Index tabs": the landing page's behaviour. Everything reads without it.
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  // ---- the modes: one fact per mode, used by the Ask box and by the enlarged switch
  const FREE_CREDITS = 30;
  const MODES = {
    summary: { name: 'Summary', credits: 1, papers: 'The closest matches', line: 'a short cited answer', say: 'A short cited answer: the finding in a few sentences, each with the paper it comes from.', field: 'var(--sand)', free: true },
    deep: { name: 'Deep', credits: 5, papers: '20–40', line: 'a structured report from 20–40 papers', say: 'A structured report from 20–40 papers: findings, disagreements, limits and open questions.', field: 'var(--periwinkle)', free: true },
    detailed: { name: 'Detailed', credits: 20, papers: '50+', line: 'a long report with tables from 50+ papers', say: 'A long report with tables from 50+ papers, for a literature chapter or a review.', field: 'var(--peach)', free: false },
  };
  let mode = 'deep';

  const depth = $('[data-depth]');
  const ctl = $('[data-depth-ctl]');
  function placeControl() {
    if (!depth || !ctl) return;
    const active = $(`[data-mode="${mode}"]`, ctl);
    const width = depth.clientWidth;
    const phone = width < 640;
    const centre = active.offsetLeft + active.offsetWidth / 2;
    // The chosen segment sits right of centre; the far end of the control runs off the edge.
    let shift = width * (phone ? 0.5 : 0.62) - centre;
    shift = Math.min(shift, width * (phone ? 0.04 : 0.34));
    ctl.style.setProperty('--shift', `${Math.round(shift)}px`);
  }

  function setMode(next) {
    mode = next;
    const m = MODES[mode];
    $$('[data-mode-group] [data-mode]').forEach((button) => button.setAttribute('aria-checked', String(button.dataset.mode === mode)));
    const line = $('[data-mode-line]');
    if (line) line.textContent = `${m.name}: ${m.line} · ${m.credits} ${m.credits === 1 ? 'credit' : 'credits'}`;
    if (depth) {
      depth.style.setProperty('--depth', m.field);
      $('[data-depth-word]').textContent = m.name;
      $('[data-depth-say]').textContent = m.say;
      $('[data-depth-credits]').textContent = m.credits;
      $('[data-depth-papers]').textContent = m.papers;
      $('[data-depth-free]').textContent = m.free ? `${Math.floor(FREE_CREDITS / m.credits)} a month` : 'Plus and up';
      placeControl();
    }
  }

  // radio groups: click, arrows, Space and Enter
  $$('[role="radiogroup"]').forEach((group) => {
    const buttons = $$('[role="radio"]', group);
    const choose = (button) => {
      if (button.dataset.mode) { setMode(button.dataset.mode); return; }
      buttons.forEach((b) => b.setAttribute('aria-checked', String(b === button)));
    };
    buttons.forEach((button, index) => {
      button.addEventListener('click', () => choose(button));
      button.addEventListener('keydown', (event) => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
        if (!step) return;
        event.preventDefault();
        const target = buttons[(index + step + buttons.length) % buttons.length];
        target.focus();
        choose(target);
      });
    });
  });
  setMode(mode);
  window.addEventListener('resize', placeControl);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeControl);

  // attach: show the chosen file's name
  const attach = $('[data-attach]');
  if (attach) attach.addEventListener('change', () => {
    $('[data-attach-label]').textContent = attach.files.length ? attach.files[0].name : 'Attach PDF';
  });

  // ---- who it is for: tabs
  const tabs = $$('.tabs__tab');
  const selectTab = (tab, focus) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (event) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
      if (!step) return;
      event.preventDefault();
      selectTab(tabs[(index + step + tabs.length) % tabs.length], true);
    });
  });

  // ---- features: the switches
  $$('.band').forEach((band) => {
    const toggle = $('.switch', band);
    toggle.addEventListener('click', () => {
      const on = toggle.getAttribute('aria-checked') !== 'true';
      toggle.setAttribute('aria-checked', String(on));
      band.classList.toggle('is-on', on);
    });
  });

  // ---- tools: the list drives one preview
  const cite = (n) => `<span class="u-cite">${n}</span>`;
  const kv = (left, right) => `<p class="kv"><span>${left}</span><span class="u-muted nums">${right}</span></p>`;
  const consensus = '<div><p class="u-small">14 of 18 studies report a benefit</p><div class="consensus" role="img" aria-label="Supports 14, mixed 3, does not support 1"><i class="yes" style="flex: 14"></i><i class="mix" style="flex: 3"></i><i class="no" style="flex: 1"></i></div></div>';
  const chapters = [['Introduction', 2000], ['Literature review', 4800], ['Method', 3200], ['Results', 3600], ['Discussion', 3600], ['Conclusion', 1200]];
  const words = chapters.reduce((sum, [, n]) => sum + n, 0);
  console.assert(words === 18400, 'the outline adds up to 18,400 words');
  const SHOTS = {
    deep: { tab: 'Deep Research', html: `<h4>Does sleep after learning improve memory consolidation?</h4><p>Sleep in the hours after learning improves later recall of declarative material compared with an equal period awake ${cite(1)}${cite(2)}. The effect is linked to slow-wave sleep and hippocampal replay ${cite(2)}${cite(3)}.</p>${consensus}<div>${kv('<b>Diekelmann and Born</b> · Nature Reviews Neuroscience', 2010)}${kv('<b>Rasch and Born</b> · Physiological Reviews', 2013)}${kv('<b>Stickgold</b> · Nature', 2005)}</div>` },
    find: { tab: 'Find Papers', html: `<h4>sleep memory consolidation</h4><p><span class="u-chip">Year: any</span> <span class="u-chip">Review</span> <span class="u-chip">Q1</span> <span class="u-chip">Exclude retracted</span></p><div>${kv('<b>The memory function of sleep.</b><br><span class="u-muted">Diekelmann S, Born J · Review</span>', 2010)}${kv('<b>About sleep\'s role in memory.</b><br><span class="u-muted">Rasch B, Born J · Review</span>', 2013)}${kv('<b>Sleep, memory, and plasticity.</b><br><span class="u-muted">Walker MP, Stickgold R · Review</span>', 2006)}${kv('<b>Sleep-dependent memory consolidation.</b><br><span class="u-muted">Stickgold R · Review</span>', 2005)}</div>` },
    pdf: { tab: 'Chat with PDF', html: `<h4>Rasch and Born (2013).pdf</h4><p class="quote">Which sleep stage do the authors link to declarative memory?</p><p>The review links the consolidation of declarative memory mainly to slow-wave sleep, when newly encoded memories are reactivated ${cite('p. 3')}.</p><p class="quote">And what does that depend on?</p><p>It describes a dialogue between the hippocampus and the neocortex during slow oscillations ${cite('p. 4')}.</p>` },
    library: { tab: 'Library', html: `<h4>Library · 148 papers</h4><div>${kv('<b>MSc thesis: sleep and memory</b>', '96')}${kv('<b>Systematic review: napping in shift workers</b>', '41')}${kv('<b>Grant: NRF 2027</b>', '11')}</div><p class="u-small u-muted">Recently added</p><div>${kv('The memory function of sleep', 2010)}${kv('About sleep\'s role in memory', 2013)}${kv('Obliviscence during sleep and waking', 1924)}</div><p><span class="u-chip">Import from Zotero</span> <span class="u-chip">Import from Mendeley</span></p>` },
    thesis: { tab: 'Thesis Suite', html: `<h4>Thesis outline v3</h4><div>${chapters.map(([name, n], i) => kv(`<b>Chapter ${i + 1}</b> · ${name}`, n.toLocaleString('en-US'))).join('')}${kv('<b>6 chapters</b>', `${words.toLocaleString('en-US')} words planned`)}</div>` },
    proposal: { tab: 'Proposal Studio', html: `<h4>Proposal draft for ethics board</h4><div>${kv('<b>Aims and research question</b>', 'Drafted')}${kv('<b>Significance</b>', 'Drafted')}${kv('<b>Method and sample</b>', 'Drafted')}${kv('<b>Timeline</b>', 'To write')}${kv('<b>Ethics and consent</b>', 'In review')}</div><p class="u-small u-muted">Shared with Dr. Lindqvist</p>` },
    manuscript: { tab: 'Thesis to Manuscript', html: `<h4>Chapter 2: Literature review.docx</h4><div>${kv('<b>Thesis chapter</b>', '9,840 words')}${kv('<b>References</b>', '41')}${kv('<b>Target</b>', 'Journal article')}${kv('<b>Structure</b>', 'Introduction, Methods, Results, Discussion')}</div><p><span class="u-chip">Keep every reference</span> <span class="u-chip">Word, PDF or LaTeX</span></p>` },
    cite: { tab: 'Citation Generator', html: `<h4>10.1038/nrn2762</h4><p><span class="u-chip">APA 7</span> <span class="u-chip">MLA</span> <span class="u-chip">Chicago</span> <span class="u-chip">10,000+ styles</span></p><p class="quote">Diekelmann, S., &amp; Born, J. (2010). The memory function of sleep. <i>Nature Reviews Neuroscience, 11</i>(2), 114–126. https://doi.org/10.1038/nrn2762</p>${`<div>${kv('<b>In text</b>', '(Diekelmann &amp; Born, 2010)')}</div>`}` },
    human: { tab: 'Text Humanizer', html: `<h4>Natural-style rewrite</h4><p class="u-small u-muted">Before</p><p class="quote">It is important to note that sleep plays a crucial role in the consolidation of memory ${cite(1)}.</p><p class="u-small u-muted">After</p><p class="quote">Sleep helps new memories settle ${cite(1)}.</p><p class="u-small u-muted">The citation and the claim are unchanged.</p>` },
  };
  const shot = $('[data-tool-shot]');
  const shotTab = $('[data-tool-tab]');
  const rows = $$('.tool');
  let current = 'deep';
  let swap;
  const activate = (row) => {
    const key = row.dataset.tool;
    if (key === current) return;
    current = key;
    rows.forEach((r) => r.classList.toggle('is-active', r === row));
    shot.classList.add('is-swapping');
    clearTimeout(swap);
    swap = setTimeout(() => {
      shot.innerHTML = SHOTS[key].html;
      shotTab.textContent = SHOTS[key].tab;
      shot.classList.remove('is-swapping');
    }, 200);
  };
  rows.forEach((row) => {
    row.addEventListener('pointerenter', () => activate(row));
    row.addEventListener('focusin', () => activate(row));
  });

  // ---- entrances: once, and never left hidden
  const revealTargets = $('[data-reveal], [data-blocks]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealTargets.forEach((el) => io.observe(el));
    window.addEventListener('load', () => setTimeout(() => {
      revealTargets.forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in'); });
    }, 2500));
  } else {
    revealTargets.forEach((el) => el.classList.add('is-in'));
  }
})();
