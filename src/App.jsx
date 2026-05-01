import React, { useState, useEffect, useRef } from 'react';
import { voice, interpolate } from './voice';

// ── Formatters ───────────────────────────────────────────────────────────────
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
  good_shape: '#2d6a4f',
  on_track:   '#40916c',
  close:      '#b5800a',
  behind:     '#c45c00',
  far_behind: '#b83232',
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

function buildEmailBody(result, statusVariant, statusHeadline, { firstName, familyName, liveMo, liveRa, notes }) {
  const stateToken = btoa(JSON.stringify({
    age: result.age, income: result.income, savings: result.savings,
    monthly: result.monthly, retireAge: result.retireAge,
  }));
  const toolUrl         = `${window.location.origin}${window.location.pathname}?s=${stateToken}`;
  const marcusParagraph = voice[`email.marcus_paragraph.${statusVariant}`];

  const origRate = ((result.monthly * 12 / result.income) * 100).toFixed(0);
  const liveRate = ((liveMo * 12 / result.income) * 100).toFixed(0);

  const lines = [
    'Retirement Planning Summary',
    `${firstName} ${familyName}`,
    '',
    '─────────────────────────────────────',
    '',
    `Age: ${result.age}`,
    `Annual income: ${fmt(result.income)}`,
    `Current savings: ${fmt(result.savings)}`,
    `Monthly savings: $${Math.round(result.monthly).toLocaleString()}/month (${origRate}% of income)`,
    `Target retirement age: ${result.retireAge}`,
    '',
    `Status: ${statusHeadline}`,
    '',
    'Chosen path:',
    `Monthly savings: $${Math.round(liveMo).toLocaleString()}/month (${liveRate}% of income)`,
    `Retirement age: ${liveRa}`,
  ];

  if (notes?.trim()) {
    lines.push('');
    lines.push('Additional context:');
    lines.push(notes.trim());
  }

  lines.push('');
  lines.push('─────────────────────────────────────');
  lines.push(marcusParagraph);
  lines.push('');
  lines.push(`Tool link: ${toolUrl}`);

  return lines.join('\n');
}

// ── Error boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#f7f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <div style={{ maxWidth: 400, textAlign: 'center', fontFamily: "'Source Sans 3', sans-serif" }}>
            <p style={{ fontSize: 18, color: '#1a1a1a', marginBottom: 12 }}>{voice['error.boundary_fallback']}</p>
            <p style={{ fontSize: 15, color: '#555', lineHeight: 1.7 }}>
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

    const estimatedExpenses = income * 0.75 - monthly * 12;
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

    let scenarioRetireAge = retireAge;
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
    });
    setCalculated(true);
  };

  // Live projections driven by sliders
  const liveMo = sliderMonthly ?? result?.monthly ?? 0;
  const liveRa = sliderRetire  ?? result?.retireAge ?? 0;
  const liveProjected   = result ? calcProjected(result.age, liveRa, result.savings, liveMo) : null;
  const liveGap         = result ? liveProjected - result.target : null;
  const liveSavingsRate = result ? ((liveMo * 12) / result.income) * 100 : null;

  const statusVariant = result ? getStatusVariant(liveGap, result.target) : null;
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

  return (
    <div style={{ minHeight: '100vh', background: '#f7f5f0', fontFamily: "'Georgia', serif", padding: 0 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f7f5f0; }

        .card { background: #fff; border-radius: 2px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }

        input[type=number], input[type=text], input[type=email] {
          width: 100%; border: none; border-bottom: 2px solid #ddd;
          background: transparent; font-family: 'Source Sans 3', sans-serif;
          font-size: 17px; padding: 8px 0; color: #1a1a1a; outline: none;
          transition: border-color 0.2s;
        }
        input:focus { border-bottom-color: #1a3a2a; }
        input::placeholder { color: #aaa; font-size: 15px; }

        textarea {
          width: 100%; border: 1.5px solid #ddd; border-radius: 2px;
          background: transparent; font-family: 'Source Sans 3', sans-serif;
          font-size: 15px; padding: 10px 12px; color: #1a1a1a; outline: none;
          transition: border-color 0.2s; resize: vertical; min-height: 84px; line-height: 1.6;
        }
        textarea:focus { border-color: #1a3a2a; }
        textarea::placeholder { color: #aaa; font-size: 15px; }

        .field-label {
          font-family: 'Source Sans 3', sans-serif; font-size: 12px; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase; color: #888;
          display: block; margin-bottom: 6px;
        }

        .btn {
          background: #1a3a2a; color: #fff; border: none; cursor: pointer;
          font-family: 'Source Sans 3', sans-serif; font-size: 15px; font-weight: 600;
          letter-spacing: 0.05em; padding: 16px 40px; border-radius: 2px;
          transition: background 0.2s; width: 100%;
        }
        .btn:hover { background: #2d5a40; }
        .btn:disabled { background: #ccc; cursor: not-allowed; }

        .btn-secondary {
          background: transparent; color: #1a3a2a; border: 1.5px solid #1a3a2a;
          cursor: pointer; font-family: 'Source Sans 3', sans-serif; font-size: 15px;
          font-weight: 600; letter-spacing: 0.05em; padding: 14px 40px; border-radius: 2px;
          transition: background 0.2s, color 0.2s; width: 100%;
        }
        .btn-secondary:hover { background: #1a3a2a; color: #fff; }

        input[type=range] {
          -webkit-appearance: none; width: 100%; height: 3px;
          background: #ddd; border-radius: 2px; outline: none; cursor: pointer;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; width: 18px; height: 18px;
          background: #1a3a2a; border-radius: 50%; cursor: pointer;
        }

        .num-card { text-align: center; padding: 20px 16px; border: 1px solid #eee; border-radius: 2px; background: #fff; }
        .num-card .value { font-family: 'Playfair Display', serif; font-size: 26px; font-weight: 700; color: #1a1a1a; }
        .num-card .label-sm { font-family: 'Source Sans 3', sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #999; margin-top: 4px; }

        .scenario-box { border-left: 3px solid #1a3a2a; padding: 14px 18px; background: #f7f5f0; border-radius: 0 2px 2px 0; }

        .grid-3col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        .input-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px 24px; }

        @media (max-width: 480px) {
          .grid-3col { grid-template-columns: 1fr; }
          input[type=range]::-webkit-slider-thumb { width: 24px; height: 24px; }
        }
        @media (max-width: 479px) {
          .input-grid { grid-template-columns: 1fr; }
        }

        .modal-backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.55);
          display: flex; align-items: center; justify-content: center;
          padding: 16px; z-index: 100;
        }
        .modal-card {
          background: #fff; border-radius: 4px; width: 100%; max-width: 560px;
          max-height: 90vh; overflow-y: auto; box-shadow: 0 8px 40px rgba(0,0,0,0.18);
          display: flex; flex-direction: column;
        }
        .modal-topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 24px; border-bottom: 1px solid #eee; flex-shrink: 0;
          position: sticky; top: 0; background: #fff; z-index: 1;
        }
        .modal-body { padding: 24px; flex: 1; }
        .modal-footer {
          padding: 16px 24px; border-top: 1px solid #eee;
          display: flex; flex-direction: row; gap: 10px; flex-shrink: 0;
          position: sticky; bottom: 0; background: #fff;
        }
        .email-preview {
          font-family: 'Source Sans 3', sans-serif; font-size: 14px; line-height: 1.8;
          color: #333; white-space: pre-wrap; background: #f7f5f0; border-radius: 2px;
          padding: 16px 18px; margin-top: 12px;
        }
        .close-btn {
          background: none; border: none; cursor: pointer; font-size: 22px;
          color: #888; padding: 2px 8px; border-radius: 2px; line-height: 1;
          font-family: sans-serif;
        }
        .close-btn:hover { color: #1a1a1a; background: #f0f0f0; }

        .cta-btn-light {
          background: #fff; color: #1a3a2a; border: none; cursor: pointer;
          font-family: 'Source Sans 3', sans-serif; font-size: 15px; font-weight: 600;
          letter-spacing: 0.05em; padding: 16px 40px; border-radius: 2px; width: 100%;
          transition: background 0.2s;
        }
        .cta-btn-light:hover { background: #e8f4ee; }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ background: '#1a3a2a', padding: '32px 24px 28px', textAlign: 'center' }}>
        <div style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#7fb89a', marginBottom: 10 }}>
          {voice['header.practice_name']}
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(24px,5vw,36px)', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
          {voice['header.headline']}
        </h1>
        <p style={{ fontFamily: "'Source Sans 3', sans-serif", color: '#a8c8b8', fontSize: 15, maxWidth: 480, margin: '10px auto 0' }}>
          {voice['header.sub']}
        </p>
      </div>

      {sent && result && status ? (

        /* ── Thank-you screen (header + thank-you + footer only) ──────────── */
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '80px 20px 60px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, color: '#1a3a2a', marginBottom: 40, lineHeight: 1.3 }}>
              {voice['resolution.heading']}
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 420, width: '100%', marginBottom: 52 }}>
              {[1, 2, 3].map(n => (
                <li key={n} style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 17, color: '#444', lineHeight: 1.6 }}>
                  {voice[`resolution.bullet_${n}`]}
                </li>
              ))}
            </ul>
            <button
              onClick={() => setSent(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Source Sans 3', sans-serif", fontSize: 15, color: '#1a3a2a', textDecoration: 'underline', padding: 0 }}
            >
              {voice['resolution.back_link']}
            </button>
          </div>
          <div style={{ marginTop: 80, textAlign: 'center', paddingTop: 24, borderTop: '1px solid #e8e4de' }}>
            <p style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 12, color: '#bbb', marginBottom: 4 }}>
              {voice['footer.practice_line']}
            </p>
            <p style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 12, color: '#bbb', fontStyle: 'italic' }}>
              {voice['footer.tagline']}
            </p>
          </div>
        </div>

      ) : (

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* ── Name card ────────────────────────────────────────────────────── */}
        <div className="card" style={{ padding: '28px 28px 24px', marginBottom: 12 }}>
          <div className="input-grid">
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
        </div>

        {/* ── Input card ───────────────────────────────────────────────────── */}
        <div className="card" style={{ padding: '32px 28px 28px' }}>
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
          <div style={{ marginTop: 28 }}>
            <button
              className="btn"
              onClick={() => runCalculate()}
              disabled={!allFilled}
            >
              {voice['form.cta.calculate']}
            </button>
          </div>
        </div>

        {/* ── Results ──────────────────────────────────────────────────────── */}
        {calculated && (
          <div ref={resultsRef} style={{ marginTop: 24 }}>
            {calcError ? (
              <div className="card" style={{ padding: '28px', borderTop: '4px solid #999' }}>
                <p style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 16, color: '#555', lineHeight: 1.7 }}>
                  {calcError}
                </p>
              </div>
            ) : result && status && (
              <>
                  {/* Status card */}
                  <div className="card" style={{ padding: '28px 28px 24px', borderTop: `4px solid ${status.color}` }}>
                    <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: status.color, marginBottom: 10 }}>
                      {form.firstName
                        ? <>{form.firstName}, {status.headline}</>
                        : status.headline.replace(/^y/, 'Y')
                      }
                    </h2>
                    <p style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 16, color: '#444', lineHeight: 1.6 }}>
                      {status.sub}
                    </p>
                  </div>

                  {/* Key numbers */}
                  <div className="grid-3col" style={{ marginTop: 16 }}>
                    <div className="num-card">
                      <div className="value">{fmt(result.target)}</div>
                      <div className="label-sm">{voice['results.labels.you_need']}</div>
                    </div>
                    <div className="num-card">
                      <div className="value" style={{ color: liveGap >= 0 ? '#2d6a4f' : '#b83232' }}>
                        {fmt(liveProjected)}
                      </div>
                      <div className="label-sm">{voice['results.labels.youll_have']}</div>
                    </div>
                    <div className="num-card">
                      <div className="value" style={{ color: liveGap >= 0 ? '#2d6a4f' : '#b83232' }}>
                        {liveGap >= 0 ? '+' : ''}{fmtK(liveGap)}
                      </div>
                      <div className="label-sm">
                        {liveGap >= 0 ? voice['results.labels.cushion'] : voice['results.labels.gap']}
                      </div>
                    </div>
                  </div>

                  {/* Sliders */}
                  <div className="card" style={{ marginTop: 16, padding: '24px 28px' }}>
                    <div style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 20 }}>
                      {voice['sliders.section_label']}
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                        <label htmlFor="slider-monthly" className="field-label" style={{ margin: 0 }}>
                          {voice['sliders.monthly.label']}
                        </label>
                        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>
                          ${Math.round(liveMo).toLocaleString()}
                          <span style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 13, fontWeight: 400, color: '#888', marginLeft: 6 }}>
                            ({interpolate(voice['sliders.monthly.suffix'], { rate: liveSavingsRate?.toFixed(0) })})
                          </span>
                        </span>
                      </div>
                      <input
                        id="slider-monthly"
                        type="range"
                        min={0}
                        max={Math.round(result.monthly * 3)}
                        step={50}
                        value={liveMo}
                        onChange={e => setSliderMonthly(Number(e.target.value))}
                        aria-label={voice['sliders.monthly.label']}
                        aria-valuemin={0}
                        aria-valuemax={Math.round(result.monthly * 3)}
                        aria-valuenow={Math.round(liveMo)}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                        <label htmlFor="slider-retire" className="field-label" style={{ margin: 0 }}>
                          {voice['sliders.retire.label']}
                        </label>
                        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>
                          {liveRa}
                          <span style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 13, fontWeight: 400, color: '#888', marginLeft: 6 }}>
                            ({interpolate(voice['sliders.retire.suffix'], { years: liveRa - result.age })})
                          </span>
                        </span>
                      </div>
                      <input
                        id="slider-retire"
                        type="range"
                        min={result.age + 1}
                        max={75}
                        step={1}
                        value={liveRa}
                        onChange={e => setSliderRetire(Number(e.target.value))}
                        aria-label={voice['sliders.retire.label']}
                        aria-valuemin={result.age + 1}
                        aria-valuemax={75}
                        aria-valuenow={liveRa}
                      />
                    </div>
                  </div>

                  {/* Scenarios — shown only when behind on original numbers */}
                  {result.behind && (
                    <div className="card" style={{ marginTop: 16, padding: '24px 28px' }}>
                      <div style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 16 }}>
                        {voice['scenarios.section_label']}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div className="scenario-box">
                          <div style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 13, fontWeight: 600, color: '#1a3a2a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                            {voice['scenarios.save_more.title']}
                          </div>
                          <div style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 15, color: '#333', lineHeight: 1.5 }}>
                            {interpolate(voice['scenarios.save_more.body'], {
                              extraMonthly: Math.round(result.scenarioExtraMonthly).toLocaleString(),
                              newMonthly:   Math.round(result.monthly + result.scenarioExtraMonthly).toLocaleString(),
                              newRate:      (((result.monthly + result.scenarioExtraMonthly) * 12) / result.income * 100).toFixed(0),
                              retireAge:    String(result.retireAge),
                            })}
                          </div>
                        </div>
                        <div className="scenario-box">
                          <div style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 13, fontWeight: 600, color: '#1a3a2a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                            {voice['scenarios.work_longer.title']}
                          </div>
                          <div style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 15, color: '#333', lineHeight: 1.5 }}>
                            {result.scenarioRetireAge > result.retireAge
                              ? interpolate(voice['scenarios.work_longer.body'], {
                                  scenarioRetireAge: String(result.scenarioRetireAge),
                                  retireAge:         String(result.retireAge),
                                  extraYears:        String(result.scenarioRetireAge - result.retireAge),
                                  yearsWord:         result.scenarioRetireAge - result.retireAge === 1 ? 'year' : 'years',
                                })
                              : voice['scenarios.work_longer.covered']
                            }
                          </div>
                        </div>
                      </div>
                      <p style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 14, color: '#888', marginTop: 16, lineHeight: 1.6 }}>
                        {voice['scenarios.footer']}
                      </p>
                    </div>
                  )}

                  {/* CTA card */}
                  <div className="card" style={{ marginTop: 16, padding: '28px', background: '#1a3a2a', textAlign: 'center' }}>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: '#fff', marginBottom: 8 }}>
                      {form.firstName
                        ? interpolate(voice['cta.heading.personalized'], { firstName: form.firstName })
                        : voice['cta.heading']
                      }
                    </p>
                    <p style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 14, color: '#a8c8b8', lineHeight: 1.6, marginBottom: 24 }}>
                      {voice['cta.sub']}
                    </p>
                    <button className="cta-btn-light" onClick={openModal}>
                      {voice['cta.button']}
                    </button>
                  </div>

                  {/* Disclaimer */}
                  <p style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 12, color: '#aaa', marginTop: 20, lineHeight: 1.7, textAlign: 'center', padding: '0 8px' }}>
                    {voice['footer.disclaimer']}
                  </p>
                </>
            )}
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div style={{ marginTop: 56, textAlign: 'center', paddingTop: 24, borderTop: '1px solid #e8e4de' }}>
          <p style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 12, color: '#bbb', marginBottom: 4 }}>
            {voice['footer.practice_line']}
          </p>
          <p style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 12, color: '#bbb', fontStyle: 'italic' }}>
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
              {/* Top bar */}
              <div className="modal-topbar">
                <span
                  id="modal-title"
                  style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#666' }}
                >
                  {voice['modal.title']}
                </span>
                <button className="close-btn" onClick={closeModal} aria-label={voice['modal.close_aria']}>
                  ×
                </button>
              </div>

              {/* Body */}
              <div className="modal-body">
                <p style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 14, color: '#888', lineHeight: 1.6 }}>
                  {voice['modal.framing']}
                </p>
                <div className="email-preview">{emailBodyPreview}</div>

                <div style={{ marginTop: 24 }}>
                  <label htmlFor="modal-email" className="field-label">
                    {voice['modal.email.label']}
                  </label>
                  <input
                    id="modal-email"
                    type="email"
                    placeholder={voice['modal.email.placeholder']}
                    value={prospectEmail}
                    onChange={e => setProspectEmail(e.target.value)}
                    aria-label={voice['modal.email.label']}
                  />
                </div>

                <div style={{ marginTop: 24 }}>
                  <label htmlFor="modal-notes" className="field-label">
                    {voice['modal.notes.label']}
                  </label>
                  <textarea
                    id="modal-notes"
                    placeholder={voice['modal.notes.placeholder']}
                    value={extraNotes}
                    onChange={e => setExtraNotes(e.target.value)}
                    aria-label={voice['modal.notes.label']}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="modal-footer">
                <button
                  className="btn"
                  onClick={handleSend}
                  disabled={!isValidEmail(prospectEmail)}
                >
                  {voice['modal.cta.send']}
                </button>
                <button className="btn-secondary" onClick={handleCopy}>
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
