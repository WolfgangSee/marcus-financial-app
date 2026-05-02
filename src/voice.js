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

  // ── Header ───────────────────────────────────────────────────────────────────
  // NOTE: header.welcome_note and header.signature are NEW keys.
  // App.jsx needs to render them under the existing headline.
  // header.signature can later be swapped for an SVG asset (real handwritten signature).
  'header.practice_name': 'Marcus Financial · Denver, CO',
  'header.headline':      'Are we okay?',
  'header.sub':           'Put your numbers in. I\'ll tell you where you stand — honestly.',
  'header.welcome_note':  'Glad you booked. Every client asks me the same question early on: are we okay? This is a rough cut at an answer — three minutes, your numbers, where you stand. Not the plan. The plan is what we build together.',
  'header.signature':     '— Marcus',

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
  // STATUS TEXTS — held for now, planning from the numbers side first.
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

  // ── Results — situation flags (page surface) ────────────────────────────────
  // Single-line acknowledgments. Render below results.status.{variant}.sub when flag is true.
  // Multiple flags can fire and stack. App.jsx render order: negative_cashflow, has_debt, short_runway.
  // Written assuming the status sub was just read above — no transitions, no openers.
  'results.flag.has_debt.line':
    'I see the debt sitting on the other side of the ledger — that\'s its own piece of the conversation.',
  'results.flag.negative_cashflow.line':
    'The cashflow side is the part I\'m noticing first. We\'ll start there.',
  'results.flag.short_runway.line':
    'The runway is shorter than most of what I work with, and worth naming directly.',

  // ── Key number labels ────────────────────────────────────────────────────────
  'results.labels.you_need':    'You need',
  'results.labels.youll_have':  'You\'ll have',
  'results.labels.cushion':     'Cushion',
  'results.labels.gap':         'Gap',

  // ── Sliders ──────────────────────────────────────────────────────────────────
  'sliders.section_label':         'Play with the big levers',
  'sliders.projection_eyebrow':    'Where this plan lands you',
  'sliders.monthly.label':         'Monthly savings',
  'sliders.monthly.suffix':        '{rate}% of income',
  'sliders.retire.label':          'Retirement age',
  'sliders.retire.suffix':         '{years} years from now',

  // ── Plan response — slider-driven, sits above live projection ───────────────
  // One short line, declarative. The diagnosis above already did the emotional work.
  'plan_response.on_track':   'That gets you there.',
  'plan_response.cushion':    'That gets you there with room to spare.',
  'plan_response.short':      'That doesn\'t close the gap.',
  'plan_response.far_short':  'That\'s a conversation, not a calculator. Let\'s talk it through.',

  // ── Scenarios ────────────────────────────────────────────────────────────────
  // SCENARIO BODIES (.body / .covered / .save_more.unrealistic) — held for now,
  // planning from the numbers side first.
  'scenarios.section_label':       'Two ways to close the gap',
  'scenarios.save_more.title':     'Save more',
  'scenarios.save_more.body':      'Increase your monthly savings by ${extraMonthly} — to ${newMonthly}/month ({newRate}% of income) — and you hit your number by {retireAge}.',
  // Override for scenarios.save_more.body when required savings rate exceeds threshold (~60-70%).
  'scenarios.save_more.unrealistic':
    'At this point, the math says save more than most people earn — which means saving rate isn\'t really the conversation. The real one is about timeline, income, or what retirement actually has to look like, and that\'s what we\'ll dig into when we meet.',
  'scenarios.work_longer.title':   'Work a bit longer',
  'scenarios.work_longer.body':    'Keep your current savings rate and retire at {scenarioRetireAge} instead of {retireAge}. That\'s {extraYears} more {yearsWord} — and you\'re there.',
  'scenarios.work_longer.covered': 'At your current savings rate, you\'re covered regardless. Let\'s talk about what retirement actually looks like for you.',
  // Override for scenarios.work_longer.body when no retirement age up to 75 closes the gap.
  // Pairs with scenarios.save_more.unrealistic — both can fire together.
  'scenarios.work_longer.no_path':
    'Working longer alone doesn\'t close it — even retiring at 75 leaves a gap at your current savings rate. That tells me we need to combine levers, not just stretch one of them, and that\'s the meeting.',
  'scenarios.footer':              'Use the sliders below to build your own version of the plan. Most people end up somewhere in between.',
  'scenarios.footer.ahead':        'Use the sliders to see how different choices play out — earlier retirement, more cushion, whatever matters to you.',

  // ── CTA card ─────────────────────────────────────────────────────────────────
  'cta.heading':             'Ready to talk through what this means for you?',
  'cta.heading.personalized':'Ready to talk, {firstName}?',
  'cta.sub':                 'These numbers are a starting point. Our first meeting is where we turn them into an actual plan.',
  'cta.button':              'Send Marcus my numbers →',

  // ── Modal ────────────────────────────────────────────────────────────────────
  'modal.title':             'Summary of where you stand',
  'modal.framing':           'Quick look before you hit send.',
  'modal.email.label':       'Your email (so you get a copy too)',
  'modal.email.placeholder': 'you@example.com',
  'modal.notes.label':       'Anything else you want Marcus to know before we meet?',
  'modal.notes.placeholder': 'Optional — anything that doesn\'t fit in numbers.',
  'modal.cta.send':          'Send email (Demo)',
  'modal.cta.copy':          'Copy to clipboard',
  'modal.copied_confirmation':'Copied!',
  'modal.close_aria':        'Close preview',

  // ── Email ────────────────────────────────────────────────────────────────────
  // App.jsx changes required so the email uses these keys correctly:
  //   1. Subject: interpolate(voice['email.subject'], { firstName, familyName }).
  //   2. Drop the 'Retirement Planning Summary' header line entirely.
  //   3. Insert email.intro_line right after the name + a blank line.
  //   4. Below the data block:
  //        - Capitalized status headline (e.g. "You're on track.")
  //        - When any flag fires: email.section.flags + ': ' + comma-joined flag tags
  //   5. Replace 'Chosen path:' with email.section.levers.
  //   6. Replace 'Additional context:' with email.section.notes.
  //   7. The marcus_paragraph block stacks the status paragraph + each
  //      flag paragraph that fires (priority order: negative_cashflow,
  //      has_debt, short_runway), separated by a blank line.
  //   8. Above the URL, add email.link_explainer on its own line, then
  //      the URL on its own line (no 'Tool link: ' prefix).
  'email.subject':       'Marcus Financial | Meeting Prep | {firstName} {familyName}',
  'email.intro_line':    'Took a few minutes with the prep tool ahead of our meeting. Here\'s where I\'m at.',
  'email.section.levers':'How I\'d set the levers:',
  'email.section.notes': 'One more thing:',
  'email.section.flags': 'Flags',
  'email.link_explainer':'Link to reopen the tool with these numbers prefilled — useful if you want to keep tweaking before we meet.',

  // Short flag tags — comma-joined into a list under the data block.
  'email.flag_tag.has_debt':          'carrying debt',
  'email.flag_tag.negative_cashflow': 'negative cashflow',
  'email.flag_tag.short_runway':      'short runway',

  // EMAIL MARCUS PARAGRAPHS (status-keyed) — held for now, planning from the numbers side first.
  // One of these five always fires based on status.
  'email.marcus_paragraph.good_shape': 'The math is working in your favor — you\'re tracking well ahead of where you need to be. The work now is less about whether you get there and more about what "there" looks like and whether we\'re optimizing along the way. That\'s exactly the kind of conversation I want to have when we sit down.',
  'email.marcus_paragraph.on_track':   'You\'re on track, which is genuinely not where most people are. The job now is staying the course and being smart about the variables that still matter — timing, allocation, what you\'re drawing from first. A lot of good work to build on.',
  'email.marcus_paragraph.close':      'The gap is smaller than it probably feels — we\'re talking about a modest shortfall, not a structural problem. A few targeted adjustments and you\'re likely in much better shape. That\'s a productive conversation to have.',
  'email.marcus_paragraph.behind':     'There\'s real ground to make up, but the math still has room to work with. The levers — savings rate, retirement timing, possibly both — can close most of this gap. How we use them is what our meeting should be about.',
  'email.marcus_paragraph.far_behind': 'I want to be honest with you: the gap is significant, and closing it entirely through savings alone isn\'t realistic for most people. What I can do is help you see clearly what\'s movable, what isn\'t, and what a practical path forward actually looks like. That\'s worth an honest conversation.',

  // FLAG-BASED EMAIL PARAGRAPHS — APPEND below the status paragraph (do NOT replace).
  // Multiple can stack. App.jsx render order: negative_cashflow, has_debt, short_runway.
  // Written assuming a status paragraph just sat above — no transitions, no openers.
  'email.marcus_paragraph.has_debt':
    'One thing the retirement math doesn\'t capture: the debt on your balance sheet is its own piece of the puzzle. Clearing it usually comes before retirement saving really compounds in your favor — interest cuts both ways. That\'s a conversation we should have early in our meeting.',
  'email.marcus_paragraph.negative_cashflow':
    'The bigger flag for me is the monthly cashflow — more is going out than coming in. That changes the shape of our first meeting. Before we get to retirement planning, we need to look at the cashflow side honestly and figure out where it\'s leaking.',
  'email.marcus_paragraph.short_runway':
    'The runway is the part I want to be straight about. With the time you have left, the standard "save more for longer" playbook only goes so far — the levers that actually move are different ones. Retirement timing, phased options, Social Security strategy, what retirement itself has to look like. Real planning to do, just a different shape of it.',

  // ── Resolution view ──────────────────────────────────────────────────────────
  // NOTE: resolution.opener, resolution.closing, resolution.signature are NEW keys.
  // App.jsx needs to render opener above the bullets, closing + signature below.
  // Existing resolution.heading shifts role: it's now the sub-heading
  // ("Here's what happens next:") that sits between the opener and the bullets.
  'resolution.opener':    'Thanks — got it.',
  'resolution.heading':   'Here\'s what happens next:',
  'resolution.bullet_1':  '→ Check your inbox — your numbers are on their way to me',
  'resolution.bullet_2':  '→ I\'ll read through them before we meet, so I can think about your situation specifically',
  'resolution.bullet_3':  '→ We\'ll spend our time on the conversation, not the math',
  'resolution.closing':   'Looking forward to it.',
  'resolution.signature': '— Marcus',
  'resolution.back_link': '← Back to your numbers',

  // ── Errors ───────────────────────────────────────────────────────────────────
  'error.retire_age_below_current': 'Retirement age needs to be higher than your current age.',
  'error.degenerate_numbers':       'These numbers are a little unusual for the prep tool. Let\'s talk through them directly when we meet — no need to force them into a calculator.',
  'error.boundary_fallback':        'Something broke on my end.',
  'error.boundary_email_prompt':    'Email Marcus directly at {email} and we\'ll sort it out.',

  // ── Footer ───────────────────────────────────────────────────────────────────
  'footer.practice_line': 'Marcus Financial · Denver, Colorado',
  'footer.tagline':       'Your numbers, your goal, our plan.',
  'footer.disclaimer':    'Target is roughly 25× your estimated annual expenses, derived from your income minus your current savings. When you move the sliders, the target stays put — saving more would actually lower it a bit, but we\'ve kept the goalpost still to keep things readable. Assumes a 7% average annual return, doesn\'t account for inflation, taxes beyond a typical bite, Social Security, or fees. Not financial advice — a starting point for a real conversation.',

  // ── Meta (reference for index.html — update both together) ──────────────────
  'meta.title':          'Are we okay? — Marcus Financial prep tool',
  'meta.description':    'A 3-minute prep tool for our first meeting. Put in your numbers, see where you stand, send me a summary so we can hit the ground running.',
  'meta.og_title':       'Are we okay? — Marcus Financial prep tool',
  'meta.og_description': 'A 3-minute prep tool for our first meeting.',
};
