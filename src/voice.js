// All user-facing strings live here. No string is inlined in JSX.
// Keys use dot-notation grouped by surface so a copywriter moves naturally through the user's experience.
// Strings with runtime values use {curly} placeholders resolved by interpolate().
// Bracketed ALL-CAPS entries are the copywriter's worklist — replace before launch.

export function interpolate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    vars[key] !== undefined ? String(vars[key]) : `{${key}}`
  );
}

export const voice = {

  // ── Form ────────────────────────────────────────────────────────────────────
  'form.label.firstName':       'First name',
  'form.label.familyName':      'Last name',
  'form.placeholder.firstName': 'e.g. Sarah',
  'form.placeholder.familyName':'e.g. Miller',
  'form.label.age':             'Current age',
  'form.label.income':          'Annual income ($)',
  'form.label.savings':         'Current savings ($)',
  'form.label.monthly':         'Monthly savings ($)',
  'form.label.retireAge':       'Target retirement age',
  'form.placeholder.age':       'e.g. 42',
  'form.placeholder.income':    'e.g. 120,000',
  'form.placeholder.savings':   'e.g. 85,000',
  'form.placeholder.monthly':   'e.g. 1,200',
  'form.placeholder.retireAge': 'e.g. 65',
  'form.cta.calculate':         'Show me where I stand →',

  // ── Results — status (5 variants) ───────────────────────────────────────────
  'results.status.good_shape.headline': 'you\'re in good shape.',
  'results.status.good_shape.sub':      'At your current pace, you\'re on track to hit your retirement number — and then some. Keep doing what you\'re doing.',
  'results.status.on_track.headline':   'you\'re on track.',
  'results.status.on_track.sub':        'You\'re covering your target. Not a lot of cushion, but you\'re there. A few good years and you\'ll be solidly ahead.',
  'results.status.close.headline':      'you\'re close — but not quite there yet.',
  'results.status.close.sub':           'You\'re within range. A modest adjustment to your savings rate and you\'ll close this gap without breaking a sweat.',
  'results.status.behind.headline':     'you\'re behind — but this is fixable.',
  'results.status.behind.sub':          'The gap is real, but you have time. Below, I\'ll show you what it takes to close it.',
  'results.status.far_behind.headline': 'you\'ve got some catching up to do.',
  'results.status.far_behind.sub':      'No sugarcoating: there\'s a meaningful gap. But you\'re here, looking at the numbers, and that already puts you ahead of most people. Let\'s look at what it takes.',

  // ── Key number labels ────────────────────────────────────────────────────────
  'results.labels.you_need':    'You need',
  'results.labels.youll_have':  'You\'ll have',
  'results.labels.cushion':     'Cushion',
  'results.labels.gap':         'Gap',

  // ── Sliders ──────────────────────────────────────────────────────────────────
  'sliders.section_label':  'Choose your optimal path',
  'sliders.monthly.label':  'Monthly savings',
  'sliders.monthly.suffix': '{rate}% of income',
  'sliders.retire.label':   'Retirement age',
  'sliders.retire.suffix':  '{years} years from now',

  // ── Scenarios ────────────────────────────────────────────────────────────────
  'scenarios.section_label':       'Two ways to close the gap',
  'scenarios.save_more.title':     'Save more',
  'scenarios.save_more.body':      'Increase your monthly savings by ${extraMonthly} — to ${newMonthly}/month ({newRate}% of income) — and you hit your number by {retireAge}.',
  'scenarios.work_longer.title':   'Work a bit longer',
  'scenarios.work_longer.body':    'Keep your current savings rate and retire at {scenarioRetireAge} instead of {retireAge}. That\'s {extraYears} more {yearsWord} — and you\'re there.',
  'scenarios.work_longer.covered': 'At your current savings rate, you\'re covered regardless. Let\'s talk about what retirement actually looks like for you.',
  'scenarios.footer':              'Use the sliders above to build your own version of the plan. Most people end up somewhere in between.',

  // ── CTA card ─────────────────────────────────────────────────────────────────
  'cta.heading':             'Ready to talk through what this means for you?',
  'cta.heading.personalized':'Ready to talk, {firstName}?',
  'cta.sub':                 'These numbers are a starting point. Our first meeting is where we turn them into an actual plan.',
  'cta.button':              'Send Marcus my numbers →',

  // ── Modal ────────────────────────────────────────────────────────────────────
  'modal.title':             'Preview — Summary Report',
  'modal.framing':           'Here\'s a summary of your inputs. Review it before sending.',
  'modal.email.label':       'Your email (so you get a copy too)',
  'modal.email.placeholder': 'you@example.com',
  'modal.notes.label':       'Anything else you want Marcus to know before we meet?',
  'modal.notes.placeholder': 'Optional — anything that won\'t fit in numbers (changing jobs, kid heading to college, just curious...)',
  'modal.cta.send':          'Send email (Demo)',
  'modal.cta.copy':          'Copy to clipboard',
  'modal.copied_confirmation':'Copied!',
  'modal.close_aria':        'Close preview',

  // ── Email ─────────────────────────────────────────────────────────────────────
  'email.subject': 'Prep tool numbers — ahead of our call',

  // Marcus voice paragraphs — 5 variants, one per status (final copy TBD)
  'email.marcus_paragraph.good_shape': '[MARCUS PARAGRAPH — prospect is well ahead of target (>20% cushion). 2-3 sentences on what\'s working and what to build on in the meeting.]',
  'email.marcus_paragraph.on_track':   '[MARCUS PARAGRAPH — prospect is on track with a modest cushion (≤20%). 2-3 sentences on staying the course and where to optimize.]',
  'email.marcus_paragraph.close':      '[MARCUS PARAGRAPH — prospect is close but behind by less than 15%. 2-3 sentences on the small gap and the easy path to close it.]',
  'email.marcus_paragraph.behind':     '[MARCUS PARAGRAPH — prospect is behind, gap is 15–40% of target. 2-3 sentences on the path forward and time still available.]',
  'email.marcus_paragraph.far_behind': '[MARCUS PARAGRAPH — prospect has a significant gap (>40% of target). 2-3 sentences acknowledging the reality honestly and focusing on what\'s actionable.]',

  // ── Resolution view ──────────────────────────────────────────────────────────
  'resolution.heading':  'What happens next:',
  'resolution.bullet_1': '→ Check your inbox — your numbers are on their way to me',
  'resolution.bullet_2': '→ I\'ll have read through them before we meet',
  'resolution.bullet_3': '→ We\'ll spend our hour on the conversation, not the math',
  'resolution.back_link': '← Back to your numbers',

  // ── Errors ───────────────────────────────────────────────────────────────────
  'error.retire_age_below_current': 'Retirement age needs to be higher than your current age.',
  'error.degenerate_numbers':       'These numbers are a little unusual for the prep tool. Let\'s talk through them directly when we meet — no need to force them into a calculator.',
  'error.boundary_fallback':        'Something went wrong.',
  'error.boundary_email_prompt':    'Email Marcus directly at {email} and we\'ll sort it out.',

  // ── Header ───────────────────────────────────────────────────────────────────
  'header.practice_name': 'Reed Wealth Planning · Denver, CO',
  'header.headline':      'Are we okay?',
  'header.sub':           'Put your numbers in. I\'ll tell you where you stand — honestly.',

  // ── Footer ───────────────────────────────────────────────────────────────────
  'footer.practice_line': 'Marcus Reed · Reed Wealth Planning · Denver, CO',
  'footer.tagline':       '[TAGLINE — one line, Marcus\'s voice, sets the tone for the practice.]',
  'footer.disclaimer':    'Target is based on roughly 25× your annual expenses, estimated from your income and savings. We assume taxes take a typical bite. This calculator uses a 7% average annual return and doesn\'t account for inflation, Social Security, or investment fees. This isn\'t financial advice — it\'s a starting point for a real conversation.',

  // ── Meta (reference for index.html — update both together) ──────────────────
  'meta.title':          'Are we okay? — Reed Wealth Planning prep tool',
  'meta.description':    'A 3-minute prep tool for our first meeting. Put in your numbers, see where you stand, send me a summary so we can hit the ground running.',
  'meta.og_title':       'Are we okay? — Reed Wealth Planning prep tool',
  'meta.og_description': 'A 3-minute prep tool for our first meeting.',
};
