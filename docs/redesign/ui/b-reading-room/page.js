// Style B landing page: the Ask box, the mode switch, the audience list, the command list and the plans.
// Everything here is enhancement: the page reads complete without script.

// ---- entrances: reveal once, never leave content hidden
(() => {
  const targets = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window)) { targets.forEach((el) => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  targets.forEach((el) => io.observe(el));
  window.addEventListener('load', () => setTimeout(() => {
    targets.forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in'); });
  }, 2500));
})();

// ---- the mode switch (hero and poster stay in step)
const MODES = {
  summary: { word: 'short', line: 'A short cited answer. 1 credit.', hint: 'Summary: a short cited answer · 1 credit' },
  deep: { word: 'deep', line: 'A structured report from 20–40 papers. 5 credits.', hint: 'Deep: a structured report from 20–40 papers · 5 credits' },
  detailed: { word: 'detailed', line: 'A long report with tables from 50+ papers. 20 credits.', hint: 'Detailed: a long report with tables from 50+ papers · 20 credits' },
};
function setMode(mode) {
  const m = MODES[mode];
  if (!m) return;
  document.querySelectorAll('[data-mode-group] input').forEach((input) => { input.checked = input.value === mode; });
  document.getElementById('ask-hint').textContent = m.hint;
  document.getElementById('show-word').textContent = m.word;
  document.getElementById('show-line').textContent = m.line;
  document.getElementById('depth').dataset.field = mode;
}
document.querySelectorAll('[data-mode-group] input').forEach((input) => input.addEventListener('change', () => setMode(input.value)));

// ---- the Ask box
const SAMPLE = 'Does sleep after learning improve memory consolidation?';
document.getElementById('attach').addEventListener('change', (event) => {
  const file = event.target.files[0];
  document.getElementById('attach-name').textContent = file ? file.name : 'Attach PDF';
});
document.getElementById('ask').addEventListener('submit', (event) => {
  event.preventDefault();
  const own = document.getElementById('q').value.trim() !== SAMPLE;
  document.getElementById('ans-label').textContent = own
    ? 'Your own question runs in the workspace, free. This is the sample answer for the example question.'
    : 'Sample answer for the example question';
  document.getElementById('ask-answer').hidden = false;
});

// ---- who it is for: the active row sets the object on the left
const AUDIENCES = {
  ug: { role: 'Undergraduate', foot: 'Most used mode: Summary', tasks: [['Find Papers', 'Sources you can cite, by year and type'], ['Deep Research · Summary', 'A short cited answer to start from'], ['Citation Generator', 'APA, MLA, Harvard and 10,000+ styles'], ['Check citations', 'Before you hand in']] },
  ms: { role: "Master's student", foot: 'Most used mode: Deep', tasks: [['Thesis Suite', 'Outline and chapter plan'], ['Write a literature review', 'Built from the papers you kept'], ["Reviewer · Master's", 'Comments and a scorecard per chapter'], ['Data Lab', 'Tests, tables and charts from your data']] },
  phd: { role: 'PhD candidate', foot: 'Most used mode: Detailed', tasks: [['Systematic Review', 'PRISMA first: search, screen, extract'], ['Thesis Suite', 'Outline, methodology, chapters'], ['Reviewer · PhD', 'Comments and a scorecard per chapter'], ['Make slides', 'A defence deck from your thesis']] },
  ac: { role: 'Academic staff', foot: 'Works in shared projects', tasks: [['Reviewer', "A student's chapter, in a shared project"], ['Thesis to Manuscript', 'A chapter into a journal paper'], ['Proposal Studio', 'Research and grant proposals'], ['Peer review', 'A second read before you submit']] },
  med: { role: 'Clinician', foot: 'Sources: Medical (PubMed)', tasks: [['Deep Research', 'Clinical questions against PubMed'], ['Filter the evidence', 'RCTs and meta-analyses first'], ['Systematic Review', 'Screening and extraction, PRISMA first'], ['Library', 'Keep the sources for your review']] },
  ind: { role: 'Industry analyst', foot: 'Sources: All papers and Web', tasks: [['Deep Research · Detailed', 'A long cited report with tables'], ['Web sources', 'Papers and the web together'], ['Check citations', 'Each claim against its source'], ['Make slides', 'A deck from the report']] },
};
function setAudience(row) {
  const data = AUDIENCES[row.dataset.k];
  if (!data || row.classList.contains('on')) return;
  document.querySelectorAll('.aud-row').forEach((item) => item.classList.toggle('on', item === row));
  document.getElementById('aud-chip').textContent = data.role;
  document.getElementById('aud-foot').textContent = data.foot;
  document.getElementById('aud-tasks').innerHTML = data.tasks.map(([name, what]) => `<li><b>${name}</b><span>${what}</span></li>`).join('');
}
document.querySelectorAll('.aud-row').forEach((row) => {
  const button = row.querySelector('button');
  button.addEventListener('click', () => setAudience(row));
  button.addEventListener('focus', () => setAudience(row));
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) button.addEventListener('mouseenter', () => setAudience(row));
});

// ---- features: a command list that filters and follows the pointer and the arrow keys
(() => {
  const input = document.getElementById('cmd-q');
  const items = [...document.querySelectorAll('#cmd-list li')];
  const empty = document.getElementById('cmd-empty');
  const visible = () => items.filter((item) => !item.hidden);
  const select = (item) => items.forEach((other) => {
    other.classList.toggle('on', other === item);
    other.setAttribute('aria-selected', other === item ? 'true' : 'false');
  });
  const move = (step) => {
    const list = visible();
    if (!list.length) return;
    const at = list.findIndex((item) => item.classList.contains('on'));
    select(list[(at + step + list.length) % list.length]);
  };
  input.addEventListener('input', () => {
    const term = input.value.trim().toLowerCase();
    items.forEach((item) => { item.hidden = term !== '' && !item.textContent.toLowerCase().includes(term); });
    const list = visible();
    empty.hidden = list.length > 0;
    if (list.length && !list.some((item) => item.classList.contains('on'))) select(list[0]);
  });
  const keys = (event) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); move(1); }
    if (event.key === 'ArrowUp') { event.preventDefault(); move(-1); }
  };
  input.addEventListener('keydown', keys);
  items.forEach((item) => {
    item.addEventListener('mouseenter', () => select(item));
    item.addEventListener('click', () => select(item));
    item.addEventListener('focus', () => select(item));
    item.addEventListener('keydown', keys);
  });
})();

// ---- pricing: plan names, one live figure
const PLANS = {
  free: { name: 'Free', price: '$0', period: 'for as long as you like', credits: '30 credits a month', text: 'For trying every tool: Summary and Deep modes, and a preview of each workspace. No card.', cta: 'Start free' },
  plus: { name: 'Plus', price: '$12', period: 'a month, or $8 a month billed yearly ($96)', credits: '500 credits a month', text: 'For students writing every week: more answers, reports and reviews each month.', cta: 'Choose Plus' },
  pro: { name: 'Pro', price: '$29', period: 'a month, or $19 a month billed yearly ($228)', credits: '1,500 credits a month', text: 'For theses and systematic reviews. High-quality mode, Detailed reports and project sharing with your supervisor or co-authors.', cta: 'Choose Pro' },
  team: { name: 'Team', price: '$25', period: 'a seat a month, billed yearly, 3 seats or more', credits: '2,000 credits a seat, pooled', text: 'For labs and departments: a shared Library and one invoice for the whole group.', cta: 'Talk to us about Team' },
  pass: { name: 'Defence Pass', price: '$49', period: 'once, with no renewal', credits: '90 days of Pro', text: 'For the last stretch before a defence: everything in Pro for 90 days, paid once.', cta: 'Get the Defence Pass' },
};
(() => {
  const stage = document.getElementById('stage');
  const tabs = [...document.querySelectorAll('#plans button')];
  const phone = matchMedia('(max-width: 700px)');
  const place = () => {
    const current = tabs.find((tab) => tab.getAttribute('aria-selected') === 'true');
    if (phone.matches) current.after(stage);
    else document.querySelector('.price-g').append(stage);
  };
  const fill = (key) => {
    const plan = PLANS[key];
    document.getElementById('st-price').textContent = plan.price;
    document.getElementById('st-period').textContent = plan.period;
    document.getElementById('st-credits').textContent = plan.credits;
    document.getElementById('st-text').textContent = plan.text;
    document.getElementById('st-cta').textContent = plan.cta;
  };
  const choose = (tab) => {
    if (tab.getAttribute('aria-selected') === 'true') return;
    tabs.forEach((other) => other.setAttribute('aria-selected', other === tab ? 'true' : 'false'));
    stage.classList.add('swap');
    setTimeout(() => { fill(tab.dataset.plan); place(); stage.classList.remove('swap'); }, 200);
  };
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => choose(tab));
    tab.addEventListener('focus', () => choose(tab));
  });
  phone.addEventListener('change', place);
  place();
})();
