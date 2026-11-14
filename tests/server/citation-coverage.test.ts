import { describe, expect, it } from 'vitest';
import { checkCoverage, expandNumbers, findCitations, splitPaper } from '../../lib/citationCoverage.js';

const works = (text: string) => findCitations(text).flatMap((citation) => citation.works.map((work) => `${work.authors.join('+')}${work.etAl ? '+etal' : ''} ${work.year}`));

describe('finding citations', () => {
  it('reads parenthetical author-date citations, with several works and pages', () => {
    expect(works('As shown (Smith & Lee, 2019; Wu et al., 2021, p. 4), sleep matters (Smith, 2020).')).toEqual(['Smith+Lee 2019', 'Wu+etal 2021', 'Smith 2020']);
    expect(works('(see Brown, 2018, 2020a) and (Kahn 2017, 45) and (World Health Organization [WHO], 2023)')).toEqual(['Brown 2018', 'Brown 2020a', 'Kahn 2017', 'World Health Organization 2023']);
    expect(works('(Garcia, n.d.)')).toEqual(['Garcia n.d.']);
  });

  it('reads narrative citations', () => {
    expect(works('Smith (2020) and Smith and Lee (2019) agree, but Wu et al. (2021, p. 4) do not. De Vries’s (2018) view.')).toEqual(['Smith 2020', 'Smith+Lee 2019', 'Wu+etal 2021', 'De Vries 2018']);
  });

  it('ignores brackets that are not citations', () => {
    expect(works('In the trial (n = 40, 2020 cohort) and the Results (2020) table (see Figure 2).')).toEqual([]);
  });

  it('reads numeric citations and expands ranges', () => {
    const found = findCitations('Earlier work [1], [2–4] and [6, 8] showed this.¹');
    expect(found.map((citation) => citation.numbers)).toEqual([[1], [2, 3, 4], [6, 8]]);
    expect(expandNumbers('3-5; 9')).toEqual([3, 4, 5, 9]);
  });
});

describe('splitting one pasted document', () => {
  it('splits at the last References heading', () => {
    const split = splitPaper('Intro text (Smith, 2020).\n\nReferences\nSmith, J. (2020). T. P.');
    expect(split).toMatchObject({ heading: 'References', text: 'Intro text (Smith, 2020).\n\n' });
    expect(split.references.trim()).toBe('Smith, J. (2020). T. P.');
    expect(splitPaper('No list here.').heading).toBeNull();
  });
});

describe('coverage report', () => {
  const list = [
    'Lee, K. (2018). Listed but never cited. P.',
    'Smith, J. (2020). Sleep and memory. P.',
    'Smith, J., & Lee, K. (2019). Two authors. P.',
    'Wu, X., Park, Y., & Diaz, M. (2022). Three authors. P.',
  ].join('\n');

  it('reports cited but not listed, listed but never cited and year mismatches', () => {
    const report = checkCoverage('Sleep helps (Smith, 2020; Smith & Lee, 2019). Wu et al. (2021) disagree (Okafor, 2017).', list);
    expect(report.missing).toEqual([{ label: 'Okafor, 2017', count: 1 }]);
    expect(report.yearMismatches).toEqual([{ label: 'Wu et al., 2021', listed: ['2022'], count: 1 }]);
    expect(report.uncited.map((index) => report.references[index].text)).toEqual(['Lee, K. (2018). Listed but never cited. P.']);
    expect(report.counts).toMatchObject({ citations: 3, authorDate: 3, numeric: 0, references: 4 });
    expect(report.citations[0].status).toEqual(['matched', 'matched']);
  });

  it('matches numeric citations by list number', () => {
    const report = checkCoverage('Shown [1] and [3, 5].', '1. Smith J. One. 2020.\n2. Lee K. Two. 2019.\n3. Wu X. Three. 2021.');
    expect(report.missing).toEqual([{ label: '[5]', count: 1 }]);
    expect(report.uncited).toEqual([1]);
  });
});

describe('the example on the tool page', () => {
  it('finds one missing work, one year mismatch and one uncited entry', () => {
    const text = 'Sleep supports memory consolidation (Walker, 2017; Diekelmann & Born, 2010). Rasch and Born (2013) reviewed the evidence, and Stickgold et al. (2001, p. 1052) described the role of REM sleep. Sleep also changes with age (Mander et al., 2017).';
    const list = [
      'Diekelmann, S., & Born, J. (2010). The memory function of sleep. Nature Reviews Neuroscience, 11(2), 114–126. https://doi.org/10.1038/nrn2762',
      "Rasch, B., & Born, J. (2013). About sleep's role in memory. Physiological Reviews, 93(2), 681–766. https://doi.org/10.1152/physrev.00032.2012",
      'Stickgold, R., Hobson, J. A., Fosse, R., & Fosse, M. (2002). Sleep, learning, and dreams: Off-line memory reprocessing. Science, 294(5544), 1052–1057.',
      'Tononi, G., & Cirelli, C. (2014). Sleep and the price of plasticity. Neuron, 81(1), 12–34. https://doi.org/10.1016/j.neuron.2013.12.025',
      'Walker, M. P. (2017). Why we sleep. Scribner.',
    ].join('\n');
    const report = checkCoverage(text, list);
    expect(report.missing.map((item) => item.label)).toEqual(['Mander et al., 2017']);
    expect(report.yearMismatches.map((item) => item.label)).toEqual(['Stickgold et al., 2001']);
    expect(report.uncited.map((index) => report.references[index].authors[0].family)).toEqual(['Tononi']);
  });

  it('matches a no-author citation on the title and ignores accents', () => {
    const report = checkCoverage('As reported ("Climate Report Summary," 2021) and by Müller (2019).', 'Climate report summary for planners. (2021). Retrieved from https://example.org\nMuller, T. (2019). Title. Press.');
    expect(report.missing).toEqual([]);
    expect(report.uncited).toEqual([]);
  });
});
