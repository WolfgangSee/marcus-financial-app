import React, { useState, useEffect, useRef } from 'react';
import { voice, interpolate } from './voice';

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtAmt = (n) => {
  const abs  = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${sign}$${Math.round(abs / 1000)}K`;
  return `${sign}$${Math.round(abs)}`;
};
const fmt  = fmtAmt;
const fmtK = fmtAmt;

// ── Financial math ────────────────────────────────────────────────────────────
function calcProjected(age, retireAge, savings, monthly, rate = 0.07) {
  const years = retireAge - age;
  if (years <= 0) return savings;
  const r = rate / 12;
  const m = years * 12;
  return savings * Math.pow(1 + r, m) + monthly * ((Math.pow(1 + r, m) - 1) / r);
}

function solveMonthly(target, age, retireAge, savings, rate = 0.07) {
  const years = retireAge - age;
  if (years <= 0) return 0;
  const r = rate / 12;
  const m = years * 12;
  const factor = (Math.pow(1 + r, m) - 1) / r;
  if (factor === 0) return 0;
  const fvCurrent = savings * Math.pow(1 + r, m);
  const needed = target - fvCurrent;
  return needed <= 0 ? 0 : needed / factor;
}

// ── Status ────────────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  good_shape: '#2A5240',
  on_track:   '#2A5240',
  close:      '#8A5C10',
  behind:     '#7A2A1E',
  far_behind: '#7A2A1E',
};

function getStatusVariant(liveGap, target) {
  if (liveGap >= 0) return liveGap > target * 0.2 ? 'good_shape' : 'on_track';
  const pct = Math.abs(liveGap) / target;
  if (pct < 0.15) return 'close';
  if (pct < 0.40) return 'behind';
  return 'far_behind';
}

// ── Email helpers ─────────────────────────────────────────────────────────────
// TBD_EMAIL — replace marcus@@reedwealthplanning.com with real address before launch
const MARCUS_EMAIL = 'marcus@@reedwealthplanning.com';

const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

function buildEmailBody(result, statusVariant, statusHeadline, { firstName, familyName, liveMo, liveRa, notes, hasDebt, negativeCashflow, shortRunway }) {
  const stateToken = btoa(JSON.stringify({
    age: result.age, income: result.income, savings: result.savings,
    monthly: result.monthly, retireAge: result.retireAge,
  }));
  const toolUrl = `${window.location.origin}${window.location.pathname}?s=${stateToken}`;

  const origRate        = ((result.monthly * 12 / result.income) * 100).toFixed(0);
  const liveRate        = ((liveMo * 12 / result.income) * 100).toFixed(0);
  const shortRunwayActive = shortRunway && (statusVariant === 'behind' || statusVariant === 'far_behind');
  const capitalizedHeadline = statusHeadline.charAt(0).toUpperCase() + statusHeadline.slice(1);

  const flagTags = [];
  if (negativeCashflow)  flagTags.push(voice['email.flag_tag.negative_cashflow']);
  if (hasDebt)           flagTags.push(voice['email.flag_tag.has_debt']);
  if (shortRunwayActive) flagTags.push(voice['email.flag_tag.short_runway']);

  const lines = [
    `${firstName} ${familyName}`,
    '',
    voice['email.intro_line'],
    '',
    '─────────────────────────────────────',
    '',
    `Age: ${result.age}`,
    `Annual income: ${fmt(result.income)}`,
    `Current savings: ${fmt(result.savings)}`,
    `Monthly savings: $${Math.round(result.monthly).toLocaleString()}/month (${origRate}% of income)`,
    `Target retirement age: ${result.retireAge}`,
    '',
    capitalizedHeadline,
  ];

  if (flagTags.length > 0) {
    lines.push(`${voice['email.section.flags']}: ${flagTags.join(', ')}`);
  }

  lines.push('');
  lines.push('─────────────────────────────────────');
  const liveProjected = calcProjected(result.age, liveRa, result.savings, liveMo);
  const liveGap       = liveProjected - result.target;
  const planVariant   = liveGap >= 0
    ? (liveGap > result.target * 0.2 ? 'cushion' : 'on_track')
    : (Math.abs(liveGap) / result.target > 0.4 ? 'far_short' : 'short');

  lines.push(voice['email.section.levers']);
  lines.push(`Monthly savings: $${Math.round(liveMo).toLocaleString()}/month (${liveRate}% of income)`);
  lines.push(`Retirement age: ${liveRa}`);
  lines.push(voice[`plan_response.${planVariant}`]);

  if (notes?.trim()) {
    lines.push('');
    lines.push(voice['email.section.notes']);
    lines.push(notes.trim());
  }

  const marcusParagraphs = [voice[`email.marcus_paragraph.${statusVariant}`]];
  if (negativeCashflow)  marcusParagraphs.push(voice['email.marcus_paragraph.negative_cashflow']);
  if (hasDebt)           marcusParagraphs.push(voice['email.marcus_paragraph.has_debt']);
  if (shortRunwayActive) marcusParagraphs.push(voice['email.marcus_paragraph.short_runway']);

  lines.push('');
  lines.push('─────────────────────────────────────');
  lines.push(marcusParagraphs.join('\n\n'));
  lines.push('');
  lines.push(voice['email.link_explainer']);
  lines.push(toolUrl);

  return lines.join('\n');
}

// ── Error boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#EEF1F4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <div style={{ maxWidth: 400, textAlign: 'center' }}>
            <p style={{ fontFamily: "'Newsreader', serif", fontSize: 20, color: '#0F1923', marginBottom: 12, lineHeight: 1.5 }}>
              {voice['error.boundary_fallback']}
            </p>
            <p style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 15, color: '#3A4A58', lineHeight: 1.65 }}>
              {interpolate(voice['error.boundary_email_prompt'], { email: MARCUS_EMAIL })}
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  const [form, setForm] = useState({
    firstName: '', familyName: '',
    age: '', income: '', savings: '', monthly: '', retireAge: '',
  });
  const [extraNotes,    setExtraNotes]    = useState('');
  const [sliderMonthly, setSliderMonthly] = useState(null);
  const [sliderRetire,  setSliderRetire]  = useState(null);
  const [result,        setResult]        = useState(null);
  const [calcError,     setCalcError]     = useState(null);
  const [calculated,    setCalculated]    = useState(false);
  const [showModal,     setShowModal]     = useState(false);
  const [prospectEmail, setProspectEmail] = useState('');
  const [sent,          setSent]          = useState(false);
  const [copied,        setCopied]        = useState(false);
  const [formCollapsed, setFormCollapsed] = useState(false);

  const modalRef   = useRef(null);
  const resultsRef = useRef(null);

  // URL state restoration — pre-fill and auto-calculate when ?s= param is present
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get('s');
    if (!s) return;
    try {
      const state = JSON.parse(atob(s));
      const f = {
        firstName: '', familyName: '',
        age:       String(state.age       ?? ''),
        income:    String(state.income    ?? ''),
        savings:   String(state.savings   ?? ''),
        monthly:   String(state.monthly   ?? ''),
        retireAge: String(state.retireAge ?? ''),
      };
      setForm(f);
      runCalculate(f);
    } catch {
      // malformed token — ignore silently
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Esc closes modal
  useEffect(() => {
    if (!showModal) return;
    const handler = (e) => { if (e.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showModal]);

  // Move focus into modal when it opens
  useEffect(() => {
    if (!showModal || !modalRef.current) return;
    const el = modalRef.current.querySelector('button, input, textarea, [tabindex]:not([tabindex="-1"])');
    el?.focus();
  }, [showModal]);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setCalculated(false);
    setResult(null);
    setCalcError(null);
    setSent(false);
    setFormCollapsed(false);
  };

  const runCalculate = (f = form) => {
    const age       = parseInt(f.age);
    const income    = parseFloat(String(f.income).replace(/,/g, ''));
    const savings   = parseFloat(String(f.savings).replace(/,/g, ''));
    const monthly   = parseFloat(String(f.monthly).replace(/,/g, ''));
    const retireAge = parseInt(f.retireAge);

    if ([age, income, savings, monthly, retireAge].some(isNaN)) {
      setCalcError(voice['error.degenerate_numbers']);
      setCalculated(true);
      return;
    }
    if (retireAge <= age) {
      setCalcError(voice['error.retire_age_below_current']);
      setCalculated(true);
      return;
    }

    const hasDebt          = savings < 0;
    const negativeCashflow = monthly < 0;
    const shortRunway      = (retireAge - age) < 10;

    const estimatedExpenses = negativeCashflow ? income * 0.75 : income * 0.75 - monthly * 12;
    if (estimatedExpenses <= 0) {
      setCalcError(voice['error.degenerate_numbers']);
      setCalculated(true);
      return;
    }

    const target    = estimatedExpenses * 25;
    const projected = calcProjected(age, retireAge, savings, monthly);
    const gap       = projected - target;

    const neededMonthly        = solveMonthly(target, age, retireAge, savings);
    const scenarioExtraMonthly = Math.max(0, neededMonthly - monthly);

    const newRate             = ((monthly + scenarioExtraMonthly) * 12) / income;
    const saveMoreUnrealistic = negativeCashflow || newRate > 0.70;

    let scenarioRetireAge = null;
    for (let ra = retireAge + 1; ra <= 75; ra++) {
      if (calcProjected(age, ra, savings, monthly) >= target) { scenarioRetireAge = ra; break; }
    }

    setSliderMonthly(monthly);
    setSliderRetire(retireAge);
    setCalcError(null);
    setSent(false);
    setResult({
      target, income, savings, monthly, retireAge, age,
      gap, savingsRate: ((monthly * 12) / income) * 100,
      scenarioExtraMonthly, scenarioRetireAge,
      behind: gap < 0,
      hasDebt, negativeCashflow, shortRunway, saveMoreUnrealistic,
    });
    setCalculated(true);
    setFormCollapsed(true);
  };

  // Live projections driven by sliders
  const liveMo = sliderMonthly ?? result?.monthly ?? 0;
  const liveRa = sliderRetire  ?? result?.retireAge ?? 0;
  const liveProjected   = result ? calcProjected(result.age, liveRa, result.savings, liveMo) : null;
  const liveGap         = result ? liveProjected - result.target : null;
  const liveSavingsRate = result ? ((liveMo * 12) / result.income) * 100 : null;

  const statusVariant = result ? getStatusVariant(result.gap, result.target) : null;
  const planVariant   = result
    ? (liveGap >= 0
        ? (liveGap > result.target * 0.2 ? 'cushion' : 'on_track')
        : (Math.abs(liveGap) / result.target > 0.4 ? 'far_short' : 'short'))
    : null;
  const status = statusVariant ? {
    headline: voice[`results.status.${statusVariant}.headline`],
    sub:      voice[`results.status.${statusVariant}.sub`],
    color:    STATUS_COLORS[statusVariant],
  } : null;

  const openModal  = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  const handleModalKeyDown = (e) => {
    if (e.key !== 'Tab' || !modalRef.current) return;
    const focusable = [...modalRef.current.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )];
    if (!focusable.length) return;
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  };

  const emailOpts = () => ({
    firstName: form.firstName,
    familyName: form.familyName,
    liveMo,
    liveRa,
    notes: extraNotes,
    hasDebt:          result?.hasDebt,
    negativeCashflow: result?.negativeCashflow,
    shortRunway:      result?.shortRunway,
  });

  const handleSend = () => {
    closeModal();
    setSent(true);
  };

  const handleCopy = async () => {
    const body = buildEmailBody(result, statusVariant, status.headline, emailOpts());
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setTimeout(() => { closeModal(); setSent(true); }, 700);
    } catch {
      closeModal();
      setSent(true);
    }
  };

  const allFilled = form.firstName && form.familyName &&
    form.age && form.income && form.savings && form.monthly && form.retireAge;

  // Original projected (static — does not update with sliders)
  const originalProjected = result ? result.target + result.gap : null;
  // Whether sliders have been moved from their initial state
  const slidersChanged = result && (liveMo !== result.monthly || liveRa !== result.retireAge);

  // Style helpers for number columns
  const numColTop = (color) => ({ borderTop: `4px solid ${color}`, paddingTop: 16 });
  const numVal    = (color) => ({
    fontFamily: "'Newsreader', serif",
    fontSize: 'clamp(20px, 3.5vw, 28px)',
    fontWeight: 700,
    fontFeatureSettings: "'tnum'",
    letterSpacing: '-0.02em',
    color,
    lineHeight: 1.15,
  });

  return (
    <div style={{ minHeight: '100vh', background: '#EEF1F4', padding: 0 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&family=Instrument+Sans:wght@400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #EEF1F4; }

        input[type=number], input[type=text], input[type=email] {
          width: 100%; border: none; border-bottom: 1.5px solid #C8D0D8;
          background: transparent; font-family: 'Newsreader', serif;
          font-size: 20px; padding: 8px 0; color: #0F1923; outline: none;
          transition: border-color 0.2s; -moz-appearance: textfield;
        }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input:focus { border-bottom-color: #D4751A; }
        input::placeholder { color: #7A8A98; font-size: 17px; font-family: 'Newsreader', serif; }

        textarea {
          width: 100%; border: none; border-bottom: 1.5px solid #C8D0D8;
          background: transparent; font-family: 'Newsreader', serif;
          font-size: 17px; padding: 8px 0; color: #0F1923; outline: none;
          transition: border-color 0.2s; resize: vertical; min-height: 80px; line-height: 1.65;
        }
        textarea:focus { border-bottom-color: #D4751A; }
        textarea::placeholder { color: #7A8A98; }

        .eyebrow {
          display: block; font-family: 'Instrument Sans', sans-serif;
          font-size: 11px; font-weight: 600; letter-spacing: 0.14em;
          text-transform: uppercase; color: #7A8A98; margin-bottom: 28px;
        }
        .field-label {
          display: block; font-family: 'Instrument Sans', sans-serif;
          font-size: 11px; font-weight: 600; letter-spacing: 0.14em;
          text-transform: uppercase; color: #7A8A98; margin-bottom: 8px;
        }
        .label-sm {
          font-family: 'Instrument Sans', sans-serif; font-size: 11px;
          text-transform: uppercase; letter-spacing: 0.14em; color: #7A8A98; margin-top: 8px;
        }

        .btn {
          background: #1C2A3A; color: #EEF1F4; border: none; border-radius: 0;
          cursor: pointer; font-family: 'Instrument Sans', sans-serif; font-size: 13px;
          font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
          padding: 16px 32px; width: 100%; transition: opacity 0.2s;
        }
        .btn:hover:not(:disabled) { opacity: 0.85; }
        .btn:disabled { background: #C8D0D8; color: #7A8A98; cursor: not-allowed; }

        .btn-accent {
          background: #D4751A; color: #fff; border: none; border-radius: 0;
          cursor: pointer; font-family: 'Instrument Sans', sans-serif; font-size: 13px;
          font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
          padding: 16px 32px; width: 100%; transition: opacity 0.2s;
        }
        .btn-accent:hover { opacity: 0.85; }

        .btn-outline {
          background: transparent; color: #1C2A3A; border: 1.5px solid #1C2A3A;
          border-radius: 0; cursor: pointer; font-family: 'Instrument Sans', sans-serif;
          font-size: 13px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
          padding: 14px 32px; width: 100%; transition: opacity 0.2s;
        }
        .btn-outline:hover { opacity: 0.75; }

        .divider { height: 1px; border: none; background: #C8D0D8; margin: 48px 0; }

        .input-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 32px 40px; }
        .grid-3col   { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 32px; }
        .grid-2col   { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }

        input[type=range] {
          -webkit-appearance: none; width: 100%; height: 3px;
          background: #C8D0D8; border-radius: 0; outline: none; cursor: pointer;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; width: 20px; height: 20px; background: #1C2A3A;
          border-radius: 50%; cursor: pointer; border: 2.5px solid #EEF1F4;
          box-shadow: 0 0 0 1.5px #C8D0D8;
        }
        input[type=range]::-moz-range-thumb {
          width: 20px; height: 20px; background: #1C2A3A; border-radius: 50%;
          cursor: pointer; border: 2.5px solid #EEF1F4; box-shadow: 0 0 0 1.5px #C8D0D8;
        }

        .page-content { max-width: 600px; margin: 0 auto; padding: 0 32px 80px; }

        .modal-backdrop {
          position: fixed; inset: 0; background: rgba(15,25,35,0.65);
          display: flex; align-items: center; justify-content: center;
          padding: 16px; z-index: 100;
        }
        .modal-card {
          background: #EEF1F4; border-radius: 0; width: 100%; max-width: 560px;
          max-height: 90vh; overflow-y: auto; display: flex; flex-direction: column;
        }
        .modal-topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 28px; border-bottom: 1px solid #C8D0D8; flex-shrink: 0;
          position: sticky; top: 0; background: #EEF1F4; z-index: 1;
        }
        .modal-body { padding: 28px; flex: 1; }
        .modal-footer {
          padding: 20px 28px; border-top: 1px solid #C8D0D8;
          display: flex; flex-direction: row; gap: 12px; flex-shrink: 0;
          position: sticky; bottom: 0; background: #EEF1F4;
        }
        .email-preview {
          font-family: 'Instrument Sans', sans-serif; font-size: 13px; line-height: 1.8;
          color: #3A4A58; white-space: pre-wrap; overflow-wrap: break-word;
          background: #fff; padding: 16px 18px; margin-top: 12px; border-left: 4px solid #C8D0D8;
        }
        .close-btn {
          background: none; border: none; cursor: pointer; font-size: 22px;
          color: #7A8A98; padding: 2px 8px; line-height: 1;
        }
        .close-btn:hover { color: #0F1923; }

        @media (max-width: 480px) {
          .input-grid  { grid-template-columns: 1fr; }
          .grid-3col   { grid-template-columns: 1fr; }
          .grid-2col   { grid-template-columns: 1fr; }
          .page-content { padding: 0 24px 80px; }
          input[type=range]::-webkit-slider-thumb { width: 24px; height: 24px; }
          input[type=range]::-moz-range-thumb { width: 24px; height: 24px; }
        }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={{ background: '#1C2A3A', padding: '52px 40px 44px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <span style={{
            display: 'block', fontFamily: "'Instrument Sans', sans-serif",
            fontSize: 11, fontWeight: 600, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: '#D4751A', marginBottom: 16,
          }}>
            {voice['header.practice_name']}
          </span>
          <h1 style={{
            fontFamily: "'Newsreader', serif", fontSize: 'clamp(40px, 6vw, 56px)',
            fontWeight: 700, color: '#EEF1F4', lineHeight: 1.0,
            letterSpacing: '-0.025em', marginBottom: 20, textAlign: 'center',
          }}>
            {voice['header.headline']}
          </h1>
          <p style={{
            fontFamily: "'Newsreader', serif", fontSize: 16, fontStyle: 'italic',
            color: '#8AA4BC', lineHeight: 1.65, maxWidth: 420, margin: '24px auto 0', textAlign: 'center',
          }}>
            {voice['header.welcome_note']}
          </p>
          <p style={{
            fontFamily: "'Newsreader', serif", fontSize: 15,
            color: '#8AA4BC', marginTop: 12, textAlign: 'right',
          }}>
            {voice['header.signature']}
          </p>
        </div>
      </header>

      {sent && result && status ? (

        /* ── Thank-you screen ──────────────────────────────────────────────── */
        <div className="page-content" style={{ paddingTop: 72 }}>
          <p style={{ fontFamily: "'Newsreader', serif", fontSize: 32, fontWeight: 700, color: '#1C2A3A', marginBottom: 16, lineHeight: 1.2 }}>
            {voice['resolution.opener']}
          </p>
          <p style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7A8A98', marginBottom: 28 }}>
            {voice['resolution.heading']}
          </p>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 420, marginBottom: 40 }}>
            {[1, 2, 3].map(n => (
              <li key={n} style={{ fontFamily: "'Newsreader', serif", fontSize: 18, color: '#3A4A58', lineHeight: 1.65 }}>
                {voice[`resolution.bullet_${n}`]}
              </li>
            ))}
          </ul>
          <p style={{ fontFamily: "'Newsreader', serif", fontSize: 18, fontStyle: 'italic', color: '#1C2A3A', lineHeight: 1.65, marginBottom: 4 }}>
            {voice['resolution.closing']}
          </p>
          <p style={{ fontFamily: "'Newsreader', serif", fontSize: 16, color: '#3A4A58', marginBottom: 40 }}>
            {voice['resolution.signature']}
          </p>
          <button
            onClick={() => setSent(false)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: "'Instrument Sans', sans-serif", fontSize: 14,
              color: '#D4751A', fontWeight: 600, letterSpacing: '0.06em', padding: 0,
            }}
          >
            {voice['resolution.back_link']}
          </button>
          <hr className="divider" style={{ marginTop: 72, marginBottom: 24 }} />
          <p style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 12, color: '#7A8A98', marginBottom: 4 }}>
            {voice['footer.practice_line']}
          </p>
          <p style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 12, color: '#7A8A98', fontStyle: 'italic' }}>
            {voice['footer.tagline']}
          </p>
        </div>

      ) : (

        <div className="page-content">

          {/* ── "Your numbers" section ─────────────────────────────────────── */}
          <div style={{ paddingTop: 56 }}>
            <span className="eyebrow">Your numbers</span>

            {formCollapsed && calculated && !calcError && result ? (
              /* Collapsed summary line */
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 14, color: '#3A4A58', lineHeight: 1.65 }}>
                  {`Age ${result.age} · ${fmt(result.income)} income · ${fmt(result.savings)} saved · $${Math.round(result.monthly).toLocaleString()}/mo · retire at ${result.retireAge}`}
                </span>
                <button
                  onClick={() => setFormCollapsed(false)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: "'Instrument Sans', sans-serif", fontSize: 13,
                    fontWeight: 600, color: '#D4751A', letterSpacing: '0.06em',
                    padding: 0, flexShrink: 0, lineHeight: 1.65,
                  }}
                >
                  Edit
                </button>
              </div>
            ) : (
              /* Full form */
              <>
                <div className="input-grid" style={{ marginBottom: 32 }}>
                  <div>
                    <label htmlFor="f-firstName" className="field-label">{voice['form.label.firstName']}</label>
                    <input
                      id="f-firstName" type="text"
                      placeholder={voice['form.placeholder.firstName']}
                      value={form.firstName}
                      onChange={e => set('firstName', e.target.value)}
                      aria-label={voice['form.label.firstName']}
                    />
                  </div>
                  <div>
                    <label htmlFor="f-familyName" className="field-label">{voice['form.label.familyName']}</label>
                    <input
                      id="f-familyName" type="text"
                      placeholder={voice['form.placeholder.familyName']}
                      value={form.familyName}
                      onChange={e => set('familyName', e.target.value)}
                      aria-label={voice['form.label.familyName']}
                    />
                  </div>
                </div>

                <div className="input-grid">
                  <div>
                    <label htmlFor="f-age" className="field-label">{voice['form.label.age']}</label>
                    <input
                      id="f-age" type="number" min="18" max="70"
                      placeholder={voice['form.placeholder.age']}
                      value={form.age}
                      onChange={e => set('age', e.target.value)}
                      aria-label={voice['form.label.age']}
                    />
                  </div>
                  <div>
                    <label htmlFor="f-income" className="field-label">{voice['form.label.income']}</label>
                    <input
                      id="f-income" type="text"
                      placeholder={voice['form.placeholder.income']}
                      value={form.income}
                      onChange={e => set('income', e.target.value)}
                      aria-label={voice['form.label.income']}
                    />
                  </div>
                  <div>
                    <label htmlFor="f-savings" className="field-label">{voice['form.label.savings']}</label>
                    <input
                      id="f-savings" type="text"
                      placeholder={voice['form.placeholder.savings']}
                      value={form.savings}
                      onChange={e => set('savings', e.target.value)}
                      aria-label={voice['form.label.savings']}
                    />
                  </div>
                  <div>
                    <label htmlFor="f-monthly" className="field-label">{voice['form.label.monthly']}</label>
                    <input
                      id="f-monthly" type="text"
                      placeholder={voice['form.placeholder.monthly']}
                      value={form.monthly}
                      onChange={e => set('monthly', e.target.value)}
                      aria-label={voice['form.label.monthly']}
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label htmlFor="f-retire" className="field-label">{voice['form.label.retireAge']}</label>
                    <input
                      id="f-retire" type="number" min="45" max="75"
                      placeholder={voice['form.placeholder.retireAge']}
                      value={form.retireAge}
                      onChange={e => set('retireAge', e.target.value)}
                      aria-label={voice['form.label.retireAge']}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 40 }}>
                  <button className="btn" onClick={() => runCalculate()} disabled={!allFilled}>
                    {voice['form.cta.calculate']}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ── Results ──────────────────────────────────────────────────────── */}
          {calculated && (
            <div ref={resultsRef}>
              {calcError ? (
                <>
                  <hr className="divider" />
                  <div style={{ borderLeft: '4px solid #7A8A98', paddingLeft: 22 }}>
                    <p style={{ fontFamily: "'Newsreader', serif", fontSize: 18, color: '#3A4A58', lineHeight: 1.65 }}>
                      {calcError}
                    </p>
                  </div>
                </>
              ) : result && status && (
                <>
                  {/* Rule */}
                  <hr className="divider" />

                  {/* 1. Status callout */}
                  <div style={{ borderLeft: `4px solid ${status.color}`, paddingLeft: 22 }}>
                    <h2 style={{
                      fontFamily: "'Newsreader', serif",
                      fontSize: 'clamp(22px, 4vw, 30px)',
                      fontWeight: 700, color: status.color,
                      letterSpacing: '-0.01em', lineHeight: 1.2, marginBottom: 12,
                    }}>
                      {form.firstName
                        ? <>{form.firstName}, {status.headline}</>
                        : status.headline.replace(/^y/, 'Y')
                      }
                    </h2>
                    <p style={{ fontFamily: "'Newsreader', serif", fontSize: 17, color: '#3A4A58', lineHeight: 1.65 }}>
                      {status.sub}
                    </p>
                    {result.negativeCashflow && (
                      <p style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 14, color: '#7A8A98', lineHeight: 1.65, marginTop: 10 }}>
                        {voice['results.flag.negative_cashflow.line']}
                      </p>
                    )}
                    {result.hasDebt && (
                      <p style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 14, color: '#7A8A98', lineHeight: 1.65, marginTop: 10 }}>
                        {voice['results.flag.has_debt.line']}
                      </p>
                    )}
                    {result.shortRunway && (statusVariant === 'behind' || statusVariant === 'far_behind') && (
                      <p style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 14, color: '#7A8A98', lineHeight: 1.65, marginTop: 10 }}>
                        {voice['results.flag.short_runway.line']}
                      </p>
                    )}
                  </div>

                  {/* Rule */}
                  <hr className="divider" />

                  {/* 3. "The numbers" — static 3-column (does not update with sliders) */}
                  <span className="eyebrow">The numbers</span>
                  <div className="grid-3col">
                    <div style={numColTop('#0F1923')}>
                      <div style={numVal('#0F1923')}>{fmt(result.target)}</div>
                      <div className="label-sm">{voice['results.labels.you_need']}</div>
                    </div>
                    <div style={numColTop(result.gap >= 0 ? '#2A5240' : '#7A2A1E')}>
                      <div style={numVal(result.gap >= 0 ? '#2A5240' : '#7A2A1E')}>{fmt(originalProjected)}</div>
                      <div className="label-sm">{voice['results.labels.youll_have']}</div>
                    </div>
                    <div style={numColTop(result.gap >= 0 ? '#2A5240' : '#7A2A1E')}>
                      <div style={numVal(result.gap >= 0 ? '#2A5240' : '#7A2A1E')}>
                        {result.gap >= 0 ? '+' : ''}{fmtK(result.gap)}
                      </div>
                      <div className="label-sm">
                        {result.gap >= 0 ? voice['results.labels.cushion'] : voice['results.labels.gap']}
                      </div>
                    </div>
                  </div>

                  {/* Rule */}
                  <hr className="divider" />

                  {/* 5. Scenarios — conditional, only when behind */}
                  {result.behind && (
                    <>
                      <span className="eyebrow">{voice['scenarios.section_label']}</span>
                      <div className="grid-2col">
                        <div style={{ borderTop: '4px solid #D4751A', paddingTop: 16 }}>
                          <div style={{
                            fontFamily: "'Instrument Sans', sans-serif", fontSize: 11,
                            fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em',
                            color: '#D4751A', marginBottom: 12,
                          }}>
                            {voice['scenarios.save_more.title']}
                          </div>
                          <p style={{ fontFamily: "'Newsreader', serif", fontSize: 16, color: '#3A4A58', lineHeight: 1.65 }}>
                            {result.saveMoreUnrealistic
                              ? voice['scenarios.save_more.unrealistic']
                              : interpolate(voice['scenarios.save_more.body'], {
                                  extraMonthly: Math.round(result.scenarioExtraMonthly).toLocaleString(),
                                  newMonthly:   Math.round(result.monthly + result.scenarioExtraMonthly).toLocaleString(),
                                  newRate:      (((result.monthly + result.scenarioExtraMonthly) * 12) / result.income * 100).toFixed(0),
                                  retireAge:    String(result.retireAge),
                                })}
                          </p>
                        </div>
                        <div style={{ borderTop: '4px solid #D4751A', paddingTop: 16 }}>
                          <div style={{
                            fontFamily: "'Instrument Sans', sans-serif", fontSize: 11,
                            fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em',
                            color: '#D4751A', marginBottom: 12,
                          }}>
                            {voice['scenarios.work_longer.title']}
                          </div>
                          <p style={{ fontFamily: "'Newsreader', serif", fontSize: 16, color: '#3A4A58', lineHeight: 1.65 }}>
                            {result.scenarioRetireAge === null
                              ? voice['scenarios.work_longer.no_path']
                              : result.scenarioRetireAge > result.retireAge
                                ? interpolate(voice['scenarios.work_longer.body'], {
                                    scenarioRetireAge: String(result.scenarioRetireAge),
                                    retireAge:         String(result.retireAge),
                                    extraYears:        String(result.scenarioRetireAge - result.retireAge),
                                    yearsWord:         result.scenarioRetireAge - result.retireAge === 1 ? 'year' : 'years',
                                  })
                                : voice['scenarios.work_longer.covered']
                            }
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* 6. Hint text */}
                  {result.behind ? (
                    <p style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 13, color: '#7A8A98', lineHeight: 1.65, marginTop: 28 }}>
                      {voice['scenarios.footer']}
                    </p>
                  ) : (
                    <p style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 13, color: '#7A8A98', lineHeight: 1.65 }}>
                      {voice['scenarios.footer.ahead']}
                    </p>
                  )}

                  {/* Rule */}
                  <hr className="divider" />

                  {/* 8. Sliders */}
                  <span className="eyebrow">{voice['sliders.section_label']}</span>

                  {/* Monthly savings slider */}
                  <div style={{ marginBottom: 36 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                      <label htmlFor="slider-monthly" className="field-label" style={{ margin: 0 }}>
                        {voice['sliders.monthly.label']}
                      </label>
                      <span>
                        <span style={{ fontFamily: "'Newsreader', serif", fontSize: 22, fontWeight: 700, color: '#0F1923' }}>
                          ${Math.round(liveMo).toLocaleString()}
                        </span>
                        <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 12, color: '#7A8A98', marginLeft: 8 }}>
                          {interpolate(voice['sliders.monthly.suffix'], { rate: liveSavingsRate?.toFixed(0) })}
                        </span>
                      </span>
                    </div>
                    <input
                      id="slider-monthly" type="range"
                      min={0} max={Math.max(Math.round(result.monthly * 3), Math.round(result.income / 12))} step={50}
                      value={liveMo}
                      onChange={e => setSliderMonthly(Number(e.target.value))}
                      aria-label={voice['sliders.monthly.label']}
                      aria-valuemin={0}
                      aria-valuemax={Math.max(Math.round(result.monthly * 3), Math.round(result.income / 12))}
                      aria-valuenow={Math.round(liveMo)}
                    />
                  </div>

                  {/* Retirement age slider */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                      <label htmlFor="slider-retire" className="field-label" style={{ margin: 0 }}>
                        {voice['sliders.retire.label']}
                      </label>
                      <span>
                        <span style={{ fontFamily: "'Newsreader', serif", fontSize: 22, fontWeight: 700, color: '#0F1923' }}>
                          {liveRa}
                        </span>
                        <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 12, color: '#7A8A98', marginLeft: 8 }}>
                          {interpolate(voice['sliders.retire.suffix'], { years: liveRa - result.age })}
                        </span>
                      </span>
                    </div>
                    <input
                      id="slider-retire" type="range"
                      min={result.age + 1} max={75} step={1}
                      value={liveRa}
                      onChange={e => setSliderRetire(Number(e.target.value))}
                      aria-label={voice['sliders.retire.label']}
                      aria-valuemin={result.age + 1}
                      aria-valuemax={75}
                      aria-valuenow={liveRa}
                    />
                  </div>

                  {/* Live projection — only when sliders have changed from initial */}
                  {slidersChanged && (
                    <div style={{ marginTop: 36, paddingTop: 28, borderTop: '1px solid #C8D0D8' }}>
                      <span className="eyebrow" style={{ marginBottom: 20 }}>{voice['sliders.projection_eyebrow']}</span>
                      <p style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 14, color: '#3A4A58', lineHeight: 1.65, marginBottom: 20 }}>
                        {voice[`plan_response.${planVariant}`]}
                      </p>
                      <div className="grid-3col">
                        <div style={numColTop('#0F1923')}>
                          <div style={numVal('#0F1923')}>{fmt(result.target)}</div>
                          <div className="label-sm">{voice['results.labels.you_need']}</div>
                        </div>
                        <div style={numColTop(liveGap >= 0 ? '#2A5240' : '#7A2A1E')}>
                          <div style={numVal(liveGap >= 0 ? '#2A5240' : '#7A2A1E')}>{fmt(liveProjected)}</div>
                          <div className="label-sm">{voice['results.labels.youll_have']}</div>
                        </div>
                        <div style={numColTop(liveGap >= 0 ? '#2A5240' : '#7A2A1E')}>
                          <div style={numVal(liveGap >= 0 ? '#2A5240' : '#7A2A1E')}>
                            {liveGap >= 0 ? '+' : ''}{fmtK(liveGap)}
                          </div>
                          <div className="label-sm">
                            {liveGap >= 0 ? voice['results.labels.cushion'] : voice['results.labels.gap']}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rule */}
                  <hr className="divider" />

                  {/* 10. CTA */}
                  <p style={{
                    fontFamily: "'Newsreader', serif", fontSize: 22,
                    fontStyle: 'italic', fontWeight: 400,
                    color: '#0F1923', lineHeight: 1.35, marginBottom: 16,
                  }}>
                    {form.firstName
                      ? interpolate(voice['cta.heading.personalized'], { firstName: form.firstName })
                      : voice['cta.heading']
                    }
                  </p>
                  <p style={{
                    fontFamily: "'Instrument Sans', sans-serif", fontSize: 14,
                    color: '#7A8A98', lineHeight: 1.65, marginBottom: 28,
                  }}>
                    {voice['cta.sub']}
                  </p>
                  <button className="btn-accent" onClick={openModal}>
                    {voice['cta.button']}
                  </button>

                  {/* Rule */}
                  <hr className="divider" style={{ margin: '40px 0 24px' }} />

                  {/* 11. Disclaimer */}
                  <p style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 12, color: '#7A8A98', lineHeight: 1.75 }}>
                    {voice['footer.disclaimer']}
                  </p>
                </>
              )}
            </div>
          )}

          {/* ── Footer ───────────────────────────────────────────────────────── */}
          <div style={{ marginTop: 56, paddingTop: 24, borderTop: '1px solid #C8D0D8' }}>
            <p style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 12, color: '#7A8A98', marginBottom: 4 }}>
              {voice['footer.practice_line']}
            </p>
            <p style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 12, color: '#7A8A98', fontStyle: 'italic' }}>
              {voice['footer.tagline']}
            </p>
          </div>

        </div>

      )} {/* end sent ternary */}

      {/* ── Modal ────────────────────────────────────────────────────────────── */}
      {showModal && result && status && (() => {
        const emailBodyPreview = buildEmailBody(result, statusVariant, status.headline, emailOpts());
        return (
          <div
            className="modal-backdrop"
            onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          >
            <div
              ref={modalRef}
              className="modal-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
              onKeyDown={handleModalKeyDown}
            >
              <div className="modal-topbar">
                <span
                  id="modal-title"
                  style={{
                    fontFamily: "'Instrument Sans', sans-serif", fontSize: 11,
                    fontWeight: 600, letterSpacing: '0.14em',
                    textTransform: 'uppercase', color: '#7A8A98',
                  }}
                >
                  {voice['modal.title']}
                </span>
                <button className="close-btn" onClick={closeModal} aria-label={voice['modal.close_aria']}>
                  ×
                </button>
              </div>

              <div className="modal-body">
                <p style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 13, color: '#7A8A98', lineHeight: 1.65 }}>
                  {voice['modal.framing']}
                </p>
                <div style={{ marginTop: 16, marginBottom: 2 }}>
                  <span className="field-label">Subject</span>
                  <p style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 13, color: '#3A4A58', lineHeight: 1.5 }}>
                    {interpolate(voice['email.subject'], { firstName: form.firstName, familyName: form.familyName })}
                  </p>
                </div>
                <div className="email-preview" style={{ marginTop: 12 }}>{emailBodyPreview}</div>

                <div style={{ marginTop: 28 }}>
                  <label htmlFor="modal-email" className="field-label">
                    {voice['modal.email.label']}
                  </label>
                  <input
                    id="modal-email" type="email"
                    placeholder={voice['modal.email.placeholder']}
                    value={prospectEmail}
                    onChange={e => setProspectEmail(e.target.value)}
                    aria-label={voice['modal.email.label']}
                    style={{ background: '#fff', padding: '8px 10px' }}
                  />
                </div>

                <div style={{ marginTop: 28 }}>
                  <label htmlFor="modal-notes" className="field-label">
                    {voice['modal.notes.label']}
                  </label>
                  <textarea
                    id="modal-notes"
                    placeholder={voice['modal.notes.placeholder']}
                    value={extraNotes}
                    onChange={e => setExtraNotes(e.target.value)}
                    aria-label={voice['modal.notes.label']}
                    style={{ background: '#fff', padding: '8px 10px' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn" onClick={handleSend} disabled={!isValidEmail(prospectEmail)}>
                  {voice['modal.cta.send']}
                </button>
                <button className="btn-outline" onClick={handleCopy}>
                  {copied ? voice['modal.copied_confirmation'] : voice['modal.cta.copy']}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default function Root() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
