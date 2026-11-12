// Style A landing page: the Ask box, the depth control, the switches and the plans.
(() => {
  // Sample figures for the three modes (see CONTENT.md; Summary and Detailed stats are samples).
  const MODES = {
    summary: { name: 'Summary', title: 'Summary answer', stats: '8 papers read · 5 cited · 12 s', line: 'a short cited answer', credits: 1,
      long: 'A short cited answer, a paragraph you can read in a minute, with the papers it rests on.', cost: '1 credit an answer. Paper search itself uses none.' },
    deep: { name: 'Deep', title: 'Deep report', stats: '32 papers read · 18 cited · 2 min 40 s', line: 'a structured report from 20–40 papers', credits: 5,
      long: 'A structured report from 20–40 papers, with headings, a consensus line and the places where studies disagree.', cost: '5 credits a report. Paper search itself uses none.' },
    detailed: { name: 'Detailed', title: 'Detailed report', stats: '64 papers read · 41 cited · 9 min', line: 'a long report with tables from 50+ papers', credits: 20,
      long: 'A long report with evidence tables from 50+ papers, ready to become a literature review chapter.', cost: '20 credits a report. Paper search itself uses none.' },
  };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const answer = $('#answer');
  const depth = $('#depth');
  let mode = 'deep';

  function setMode(next) {
    if (!MODES[next]) return;
    mode = next;
    const m = MODES[mode];
    $$('input[name="mode"], input[name="depth"]').forEach((input) => { input.checked = input.value === mode; });
    if (answer) {
      answer.dataset.mode = mode;
      $('#answer-title').textContent = m.title;
      $('#answer-stats').textContent = m.stats;
    }
    const line = $('#ask-line');
    if (line) line.innerHTML = `<b>${m.name}</b>: ${m.line} · ${m.credits} ${m.credits === 1 ? 'credit' : 'credits'}`;
    if (depth) {
      depth.dataset.mode = mode;
      $('#depth-word').textContent = m.name;
      $('#depth-line').textContent = m.long;
      $('#depth-cost').textContent = m.cost;
    }
  }
  $$('input[name="mode"], input[name="depth"]').forEach((input) => input.addEventListener('change', () => setMode(input.value)));

  // "Ask" runs the sample answer in place: search, read, write, then the answer for the chosen mode.
  const form = $('#ask');
  if (form && answer) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const steps = $$('.run li', answer);
      const source = form.elements.src.value;
      $$('[data-run-src]', answer).forEach((el) => { el.textContent = source; });
      steps.forEach((step) => step.classList.remove('is-done'));
      answer.classList.add('is-running');
      answer.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      const quick = matchMedia('(prefers-reduced-motion: reduce)').matches;
      steps.forEach((step, index) => setTimeout(() => step.classList.add('is-done'), quick ? 0 : 450 * (index + 1)));
      setTimeout(() => answer.classList.remove('is-running'), quick ? 0 : 450 * steps.length + 350);
    });
  }

  // A citation number lights its source row.
  $$('.cite').forEach((cite) => {
    const row = document.getElementById((cite.getAttribute('href') || '').slice(1));
    if (!row) return;
    const on = () => { $$('.source.is-on').forEach((el) => el.classList.remove('is-on')); $$('.cite.is-on').forEach((el) => el.classList.remove('is-on')); row.classList.add('is-on'); $$(`.cite[href="#${row.id}"]`).forEach((el) => el.classList.add('is-on')); };
    cite.addEventListener('mouseenter', on);
    cite.addEventListener('focus', on);
    cite.addEventListener('click', (event) => { event.preventDefault(); on(); if (innerWidth < 1024) row.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
  });

  // "Ask a question" puts the cursor in the Ask box.
  $$('a[href="#q"]').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); const field = $('#q'); field.focus({ preventScroll: true }); field.select(); field.scrollIntoView({ block: 'center', behavior: 'smooth' }); }));

  // Feature switches.
  $$('.switch').forEach((button) => button.addEventListener('click', () => {
    const on = button.getAttribute('aria-checked') !== 'true';
    button.setAttribute('aria-checked', String(on));
    button.closest('.band').classList.toggle('is-on', on);
  }));

  // Plans: the selected name shows its price.
  const names = $$('.plan-name');
  const pick = (button) => {
    names.forEach((name) => { const on = name === button; name.setAttribute('aria-pressed', String(on)); document.getElementById(name.getAttribute('aria-controls')).classList.toggle('is-on', on); });
  };
  names.forEach((button) => { button.addEventListener('click', () => pick(button)); button.addEventListener('focus', () => { if (button.matches(':focus-visible')) pick(button); }); });

  // Reveal once on entering the viewport; never leaves content hidden.
  const targets = $$('[data-reveal]');
  if (!('IntersectionObserver' in window)) targets.forEach((el) => el.classList.add('is-in'));
  else {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) { if (!entry.isIntersecting) continue; entry.target.classList.add('is-in'); io.unobserve(entry.target); }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    targets.forEach((el) => io.observe(el));
    addEventListener('load', () => setTimeout(() => targets.forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in'); }), 2500));
  }
})();
