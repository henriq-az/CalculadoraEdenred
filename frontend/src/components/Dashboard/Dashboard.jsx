import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchHistory, fetchHistoryForMonth, fetchHistoryForYear, fetchScore, fetchImpact } from '../../services/api';
import { LEVELS, getLevel } from '../../lib/sustainability';
import arvoreIcon from '../../assets/Arvore.svg';
import maoIcon from '../../assets/Mao.svg';
import icFolha from '../../assets/ic-folha.svg';
import icFolha1 from '../../assets/ic-folha-1.svg';
import pixIcon from '../../assets/Pix.svg';
import nfcIcon from '../../assets/NFC.svg';
import transacoesIcon from '../../assets/transacoes.svg';
import comparativoIcon from '../../assets/ComparativoIcon.svg';
import './Dashboard.css';

// ── helpers ───────────────────────────────────────────────────────────────────
function deriveDates(period) {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  let start;
  if (period === 'weekly') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    start = d.toISOString().slice(0, 10);
  } else if (period === 'yearly') {
    start = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  }
  return { start, end };
}

function fmtCo2(grams) {
  if (grams >= 1_000_000) return `${(grams / 1_000_000).toFixed(1)}t`;
  if (grams >= 1_000)     return `${(grams / 1_000).toFixed(1)}kg`;
  return `${Math.round(grams)}g`;
}

// ── Chart ─────────────────────────────────────────────────────────────────────
const PHYSICAL_CO2  = 0.98;
const DIGITAL_TYPES = new Set(['PIX', 'NFC', 'TED', 'QR', 'WALLET']);
const MONTHS_PT     = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const DAYS_PT       = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function buildHistData(transactions, year) {
  const today    = new Date();
  const maxMonth = year === today.getFullYear() ? today.getMonth() : 11;
  const totals   = Array(12).fill(0);
  for (const tx of transactions) {
    const date = new Date(tx.transactionDate);
    if (date.getFullYear() !== year) continue;
    const month = date.getMonth();
    if (DIGITAL_TYPES.has(tx.paymentType)) {
      totals[month] += Math.max(0, PHYSICAL_CO2 - (tx.co2Grams ?? 0));
    }
  }
  return MONTHS_PT.slice(0, maxMonth + 1).map((month, i) => ({ month, value: +totals[i].toFixed(2) }));
}

function getWeekDates(offset) {
  const end = new Date();
  end.setDate(end.getDate() - offset * 7);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  return { start, end };
}

function buildWeeklyHistData(transactions, offset = 0) {
  const { start, end } = getWeekDates(offset);
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days.map(day => {
    const dayStr = day.toISOString().slice(0, 10);
    const total = transactions
      .filter(tx => {
        const txDate = new Date(tx.transactionDate);
        return txDate.toISOString().slice(0, 10) === dayStr && DIGITAL_TYPES.has(tx.paymentType);
      })
      .reduce((sum, tx) => sum + Math.max(0, PHYSICAL_CO2 - (tx.co2Grams ?? 0)), 0);
    return { month: String(day.getDate()), value: +total.toFixed(2) };
  });
}

function buildDailyHistData(transactions, year, month) {
  const today = new Date();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const maxDay = isCurrentMonth ? today.getDate() : daysInMonth;
  const totals = Array(daysInMonth + 1).fill(0);
  for (const tx of transactions) {
    const date = new Date(tx.transactionDate);
    if (date.getFullYear() !== year || date.getMonth() !== month) continue;
    const day = date.getDate();
    if (DIGITAL_TYPES.has(tx.paymentType)) {
      totals[day] += Math.max(0, PHYSICAL_CO2 - (tx.co2Grams ?? 0));
    }
  }
  return Array.from({ length: maxDay }, (_, i) => ({
    month: String(i + 1),
    value: +totals[i + 1].toFixed(2),
  }));
}

function fmtHistValue(g) {
  if (g >= 1000) return `${(g / 1000).toFixed(1)}kg`;
  return `${g.toFixed(2)}g`;
}

function fmtCo2Precise(g) {
  if (g >= 1_000_000) return `${(g / 1_000_000).toFixed(2)}t`;
  if (g >= 1_000)     return `${(g / 1_000).toFixed(2)}kg`;
  if (g >= 1)         return `${g.toFixed(2)}g`;
  return `${g.toFixed(3)}g`;
}

// Interpolação cúbica monotônica (Fritsch–Carlson): mantém a curva suave sem
// "estourar" para fora do intervalo dos pontos — evita as ondulações que saíam
// da área visível quando há trechos planos seguidos de uma subida.
function buildSmoothPath(pts) {
  const n = pts.length;
  if (n < 2) return '';
  if (n === 2) return `M ${pts[0][0]} ${pts[0][1]} L ${pts[1][0]} ${pts[1][1]}`;

  // Inclinações das secantes entre pontos consecutivos.
  const dx = [];
  const delta = [];
  for (let i = 0; i < n - 1; i++) {
    const h = pts[i + 1][0] - pts[i][0];
    dx.push(h);
    delta.push(h === 0 ? 0 : (pts[i + 1][1] - pts[i][1]) / h);
  }

  // Tangentes iniciais (média das secantes vizinhas; 0 nos extremos/locais).
  const m = new Array(n);
  m[0] = delta[0];
  m[n - 1] = delta[n - 2];
  for (let i = 1; i < n - 1; i++) {
    m[i] = delta[i - 1] * delta[i] <= 0 ? 0 : (delta[i - 1] + delta[i]) / 2;
  }

  // Ajuste de monotonicidade — limita as tangentes para não haver overshoot.
  for (let i = 0; i < n - 1; i++) {
    if (delta[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / delta[i];
    const b = m[i + 1] / delta[i];
    const s = a * a + b * b;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      m[i] = tau * a * delta[i];
      m[i + 1] = tau * b * delta[i];
    }
  }

  // Constrói cada segmento como uma curva de Bézier cúbica a partir das tangentes.
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const c1x = pts[i][0] + dx[i] / 3;
    const c1y = pts[i][1] + (m[i] * dx[i]) / 3;
    const c2x = pts[i + 1][0] - dx[i] / 3;
    const c2y = pts[i + 1][1] - (m[i + 1] * dx[i]) / 3;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${pts[i + 1][0]} ${pts[i + 1][1]}`;
  }
  return d;
}

function HistChart({ data }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const W = 520;
  const H = 200;
  const padX = 28;
  const padTop = 32;
  const padBottom = 44;

  if (!data || data.length === 0) {
    return (
      <svg className="fg-hist" viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        <text x={W / 2} y={H / 2} textAnchor="middle" fill="#999" fontSize="14">
          Sem dados no período
        </text>
      </svg>
    );
  }

  const max      = Math.max(...data.map(d => d.value));
  const min      = 0;
  const range    = max || 1;
  const innerW   = W - padX * 2;
  const innerH   = H - padTop - padBottom;
  const baselineY = H - padBottom;
  const sparse   = data.length > 15;

  function showLabel(i) {
    if (!sparse) return true;
    return i === 0 || (i + 1) % 5 === 0;
  }

  const pts = data.map((d, i) => [
    padX + (i / (data.length - 1)) * innerW,
    padTop + (1 - (d.value - min) / range) * innerH,
  ]);

  const path = buildSmoothPath(pts);

  return (
    <svg
      className="fg-hist"
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <linearGradient
          id="fg-hist-gradient"
          gradientUnits="userSpaceOnUse"
          x1={padX}
          y1="0"
          x2={W - padX}
          y2="0"
        >
          <stop offset="0%" className="fg-hist-grad-start" />
          <stop offset="100%" className="fg-hist-grad-end" />
        </linearGradient>
        <clipPath id="fg-hist-clip">
          <rect x={0} y={0} width={W} height={baselineY + 1} />
        </clipPath>
      </defs>

      {pts.map(([x, y], i) => showLabel(i) && (
        <line
          key={`dash-${i}`}
          className="fg-hist-dash"
          x1={x}
          y1={y + 6}
          x2={x}
          y2={baselineY - 2}
        />
      ))}

      <line
        className="fg-hist-axis"
        x1={padX - 8}
        y1={baselineY}
        x2={W - padX + 8}
        y2={baselineY}
      />

      <path className="fg-hist-line" d={path} clipPath="url(#fg-hist-clip)" />

      {pts.map(([x, y], i) => (
        <g
          key={`pt-${i}`}
          onMouseEnter={() => setHoveredIndex(i)}
          onMouseLeave={() => setHoveredIndex(null)}
          style={{ cursor: 'default' }}
        >
          <circle cx={x} cy={y} r="16" fill="transparent" />
          <circle className="fg-hist-dot" cx={x} cy={y} r={hoveredIndex === i ? 6.5 : 4.5} />
          {hoveredIndex === i && (
            <text className="fg-hist-value" x={x} y={y - 14} textAnchor="middle">
              {fmtHistValue(data[i].value)}
            </text>
          )}
          {showLabel(i) && (
            <text className="fg-hist-month" x={x} y={baselineY + 22} textAnchor="middle">
              {data[i].month}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

const PAYMENT_TYPES = [
  { key: 'PIX', label: 'PIX', icon: <img src={pixIcon} alt="PIX" width="22" height="22" /> },
  { key: 'NFC', label: 'NFC', icon: <img src={nfcIcon} alt="NFC" width="18" height="22" /> },
  { key: 'TED', label: 'Transferência bancária', icon: <img src={transacoesIcon} alt="Transferência bancária" width="22" height="22" /> },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { empresa }                       = useAuth();
  const companyId                         = empresa?.id ?? '1';
  const { period }                        = useOutletContext();
  const [impact, setImpact]               = useState(null);
  const [score, setScore]                 = useState(null);
  const [transactions, setTransactions]   = useState([]);
  const [histChartData, setHistChartData] = useState([]);
  const [histYear, setHistYear]           = useState(new Date().getFullYear());
  const [histMonth, setHistMonth]         = useState(new Date().getMonth());
  const [histWeekOffset, setHistWeekOffset] = useState(0);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    const { start, end } = deriveDates(period);

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [impactData, scoreData, histData] = await Promise.all([
          fetchImpact(companyId, period),
          fetchScore(companyId, start, end, period),
          fetchHistory(companyId, start, end),
        ]);
        if (!cancelled) {
          setImpact(impactData);
          setScore(scoreData);
          setTransactions(histData);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [companyId, period]);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    setHistChartData([]);
    if (period === 'yearly') {
      fetchHistoryForYear(companyId, histYear)
        .then(txs => { if (!cancelled) setHistChartData(buildHistData(txs, histYear)); })
        .catch(() => {});
    } else if (period === 'weekly') {
      const { start, end } = getWeekDates(histWeekOffset);
      fetchHistory(companyId, start.toISOString().slice(0, 10), end.toISOString().slice(0, 10))
        .then(txs => { if (!cancelled) setHistChartData(buildWeeklyHistData(txs, histWeekOffset)); })
        .catch(() => {});
    } else {
      fetchHistoryForMonth(companyId, histYear, histMonth)
        .then(txs => { if (!cancelled) setHistChartData(buildDailyHistData(txs, histYear, histMonth)); })
        .catch(() => {});
    }
    return () => { cancelled = true; };
  }, [companyId, period, histYear, histMonth, histWeekOffset]);

  const rawScore   = Number((score?.score ?? 0).toFixed(2));
  const lvlIdx     = getLevel(rawScore);
  const lvlData    = LEVELS[lvlIdx];
  const nextLevel  = lvlIdx < 3 ? LEVELS[lvlIdx + 1] : null;

  const totalTx    = score?.totalTransactions ?? 0;
  const digitalTx  = score?.digitalTransactions ?? 0;
  const digitalPct = totalTx > 0 ? Math.round((digitalTx / totalTx) * 100) : 0;

  const co2Grams   = impact?.co2Grams ?? 0;
  const treesEq    = impact?.treesEquivalent ?? 0;

  const co2ByType  = transactions.reduce((acc, tx) => {
    const t = tx.paymentType || 'UNKNOWN';
    if (!acc[t]) acc[t] = { co2: 0, count: 0 };
    acc[t].co2   += tx.co2Grams ?? 0;
    acc[t].count += 1;
    return acc;
  }, {});

  const digTxs    = transactions.filter(tx => tx.paymentType !== 'PHYSICAL' && tx.paymentType !== 'UNKNOWN');
  const avgToday  = transactions.length > 0
    ? transactions.reduce((s, tx) => s + (tx.co2Grams ?? 0), 0) / transactions.length : 0;
  const avgDig    = digTxs.length > 0
    ? digTxs.reduce((s, tx) => s + (tx.co2Grams ?? 0), 0) / digTxs.length : 0;
  const maxAvg    = Math.max(avgToday, avgDig, 0.001);
  const redPct    = avgToday > 0 ? Math.round((1 - avgDig / avgToday) * 100) : 0;
  const benchPct = rawScore;

  return (
    <>
      {loading && <div className="fg-loading">Carregando…</div>}
      {error   && <div className="fg-error">{error}</div>}

      {!loading && !error && (
        <>
              {/* KPI ROW */}
              <div className="fg-kpi-row">
                <div className="fg-kpi-card fg-kpi-card--co2">
                  <span className="fg-kpi-label">CO₂ evitado no período</span>
                  <span className="fg-kpi-value">{fmtCo2(co2Grams)}</span>
                  <span className="fg-kpi-delta">{score ? `${digitalPct}% digital` : '—'}</span>
                </div>
                <div className="fg-kpi-card fg-kpi-card--digital">
                  <span className="fg-kpi-label">Transações digitais</span>
                  <span className="fg-kpi-value">{digitalTx.toLocaleString('pt-BR')}</span>
                  <span className="fg-kpi-delta">
                    {totalTx > 0 ? `de ${totalTx.toLocaleString('pt-BR')} totais (${digitalPct}%)` : '—'}
                  </span>
                </div>
                <div className="fg-kpi-card fg-kpi-card--pct">
                  <span className="fg-kpi-label">Pagamento digital</span>
                  <span className="fg-kpi-value">{digitalPct}%</span>
                  <span className="fg-kpi-delta">{score ? 'do total de transações' : '—'}</span>
                </div>
              </div>

              {/* MID ROW */}
              <div className="fg-mid-row">

                <div className="fg-card fg-card--progress">
                  <div className="fg-card-head fg-card-head--progress">
                    <div>
                      <div className="fg-card-title fg-card-title--progress">Progresso de Sustentabilidade</div>
                      <div className="fg-card-sub fg-card-sub--progress">Seu nível de evolução</div>
                    </div>
                  </div>
                  <div className="fg-level-badge">
                    <div className="fg-level-badge-icon">
                      <img src={icFolha1} alt="" className="fg-eco-folha fg-eco-folha--left" />
                      <img src={icFolha}  alt="" className="fg-eco-folha fg-eco-folha--right" />
                      <img src={maoIcon}  alt="" className="fg-eco-mao" />
                    </div>
                    <span className="fg-level-badge-label">{lvlData.badge}</span>
                  </div>
                  <img src={arvoreIcon} alt="Árvore" width="84" height="125" className="fg-tree-img" />
                  <div className="fg-progress-body">
                    <div className="fg-score-col">
                      <div className="fg-score-big">
                        <span className="fg-score-num">{rawScore}</span>
                        <span className="fg-score-den">/100</span>
                      </div>
                      <div className="fg-score-sub">Score de Sustentabilidade</div>
                    </div>
                  </div>
                  <div className="fg-prog-row">
                    <div className="fg-prog-track">
                      <div className="fg-prog-fill" style={{ width: `${rawScore}%` }} />
                      <div className="fg-prog-empty" style={{ width: `${100 - rawScore}%` }} />
                    </div>
                  </div>
                  <span className="fg-prog-pct">{rawScore}%</span>
                  {nextLevel && (
                    <div className="fg-next-level">
                      <span className="fg-next-tag">Próximo nível:</span>
                      <span className="fg-next-desc">{nextLevel.name} aos {nextLevel.min} pontos</span>
                    </div>
                  )}
                </div>

                <div className="fg-card fg-card--co2type">

                  <div className="fg-card-head">
                    <div className="fg-co2type-head-text">
                      <div className="fg-card-title">CO₂ evitado por tipo de pagamento</div>
                      <div className="fg-card-sub">Baseado nas transações do período selecionado</div>
                    </div>
                  </div>
                  <div className="fg-co2type-list">
                    {PAYMENT_TYPES.map(({ key, label, icon }) => {
                      const d = co2ByType[key];
                      return (
                        <div key={key} className="fg-co2type-item">
                          <div className="fg-co2type-icon">{icon}</div>
                          <span className="fg-co2type-name">{label}</span>
                          <div className="fg-co2type-spacer" />
                          <span className="fg-co2type-val">{d ? fmtCo2(d.co2) : '0g'}</span>
                          <div className="fg-co2type-count-col">
                            <span className="fg-co2type-count-num">{d ? d.count.toLocaleString('pt-BR') : '0'}</span>
                            <span className="fg-co2type-count-label">transações</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* BOTTOM ROW */}
              <div className="fg-bottom-row">

                <div className="fg-col">
                  <div className="fg-card fg-card--comparativo">
                    <div className="fg-card-head">
                      <div>
                        <div className="fg-card-title fg-card-title--comparativo">Comparativo: hoje vs 100% digital</div>
                        <div className="fg-card-sub fg-card-sub--comparativo">Impacto de transação média</div>
                      </div>
                      {redPct > 0 && (
                        <span className="fg-badge-reducao">
                          <img src={comparativoIcon} alt="" width="15" height="14" />
                          {redPct}% de redução potencial
                        </span>
                      )}
                    </div>
                    <div className="fg-compare-list">
                      <span className="fg-compare-label">Hoje (físico + digital)</span>
                      <div className="fg-compare-track">
                        <div className="fg-compare-fill" style={{ width: `${(avgToday / maxAvg) * 100}%` }} />
                      </div>
                      <span className="fg-compare-val">{fmtCo2Precise(avgToday)} CO₂</span>

                      <span className="fg-compare-label">100% digital</span>
                      <div className="fg-compare-track">
                        <div className="fg-compare-fill fg-compare-fill--pink" style={{ width: `${(avgDig / maxAvg) * 100}%` }} />
                      </div>
                      <span className="fg-compare-val fg-compare-val--pink">{fmtCo2Precise(avgDig)} CO₂</span>
                    </div>
                  </div>

                  <div className="fg-card">
                    <div className="fg-card-head">
                      <div>
                        <div className="fg-card-title">Benchmark setorial</div>
                        <div className="fg-card-sub">Sua posição no mercado</div>
                      </div>
                    </div>
                    <div className="fg-benchmark">
                      <div className="fg-bench-bar">
                        <div className="fg-bench-indicator" style={{ left: `${benchPct}%` }} />
                      </div>
                      <div className="fg-bench-axis">
                        <span>Baixo desempenho</span>
                        <span>Alto desempenho</span>
                      </div>
                      <p className="fg-bench-desc">
                        Seu score de sustentabilidade é {benchPct.toFixed(1)}/100
                      </p>
                    </div>
                  </div>
                </div>

                <div className="fg-col">
                  <div className="fg-card fg-card--hist">
                    {(() => {
                      const today = new Date();
                      const isYearly  = period === 'yearly';
                      const isWeekly  = period === 'weekly';
                      const isCurrentMonth = histYear === today.getFullYear() && histMonth === today.getMonth();
                      const isCurrentYear  = histYear >= today.getFullYear();
                      const daysInMonth    = new Date(histYear, histMonth + 1, 0).getDate();
                      const maxDay         = isCurrentMonth ? today.getDate() : daysInMonth;

                      // Label da semana
                      const { start: wStart, end: wEnd } = getWeekDates(histWeekOffset);
                      const weekLabel = wStart.getMonth() === wEnd.getMonth()
                        ? `${wStart.getDate()}–${wEnd.getDate()} ${MONTHS_PT[wStart.getMonth()]}`
                        : `${wStart.getDate()} ${MONTHS_PT[wStart.getMonth()]}–${wEnd.getDate()} ${MONTHS_PT[wEnd.getMonth()]}`;

                      function prevNav() {
                        if (isYearly)  { setHistYear(y => y - 1); }
                        else if (isWeekly) { setHistWeekOffset(w => w + 1); }
                        else if (histMonth === 0) { setHistYear(y => y - 1); setHistMonth(11); }
                        else { setHistMonth(m => m - 1); }
                      }
                      function nextNav() {
                        if (isYearly)  { if (!isCurrentYear) setHistYear(y => y + 1); }
                        else if (isWeekly) { if (histWeekOffset > 0) setHistWeekOffset(w => w - 1); }
                        else if (!isCurrentMonth) {
                          if (histMonth === 11) { setHistYear(y => y + 1); setHistMonth(0); }
                          else { setHistMonth(m => m + 1); }
                        }
                      }
                      const navLabel = isYearly ? `${histYear}` : isWeekly ? weekLabel : `${MONTHS_PT[histMonth]} ${histYear}`;
                      const navMinW  = isYearly ? '36px' : isWeekly ? '110px' : '80px';
                      const prevDis  = isYearly ? histYear <= 2020 : isWeekly ? false : (histYear <= 2020 && histMonth === 0);
                      const nextDis  = isYearly ? isCurrentYear : isWeekly ? histWeekOffset === 0 : isCurrentMonth;
                      const subtitle = isYearly
                        ? `Janeiro a ${isCurrentYear ? MONTHS_PT[today.getMonth()] : 'Dezembro'} ${histYear}`
                        : isWeekly ? weekLabel
                        : `Dia 1 a ${maxDay} — ${MONTHS_PT[histMonth]} ${histYear}`;

                      return (
                        <>
                          <div className="fg-card-head">
                            <div>
                              <div className="fg-card-title">Histórico de CO₂ evitado</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <button onClick={prevNav} disabled={prevDis} style={{ background: 'none', border: '1px solid #ddd', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>‹</button>
                              <span style={{ fontWeight: 600, fontSize: '14px', minWidth: navMinW, textAlign: 'center' }}>{navLabel}</span>
                              <button onClick={nextNav} disabled={nextDis} style={{ background: 'none', border: '1px solid #ddd', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>›</button>
                            </div>
                          </div>
                          <div className="fg-chart-wrap">
                            <HistChart data={histChartData} />
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="fg-card">
                    <div className="fg-card-head">
                      <div>
                        <div className="fg-card-title">Impacto acumulado</div>
                        <div className="fg-card-sub">No período selecionado</div>
                      </div>
                    </div>
                    <div className="fg-impact-list">
                      <div className="fg-impact-item">
                        <svg width="22" height="22" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <g clipPath="url(#co2clip)">
                            <path d="M36 6H12C8.68629 6 6 8.68629 6 12V36C6 39.3137 8.68629 42 12 42H36C39.3137 42 42 39.3137 42 36V12C42 8.68629 39.3137 6 36 6Z" stroke="#CC2222" strokeWidth="3"/>
                            <path d="M21.259 17.2734H19.7036C19.6752 17.0722 19.6172 16.8935 19.5296 16.7372C19.442 16.5786 19.3295 16.4437 19.1922 16.3324C19.0549 16.2211 18.8963 16.1359 18.7164 16.0767C18.5388 16.0175 18.3459 15.9879 18.1375 15.9879C17.7611 15.9879 17.4332 16.0814 17.1539 16.2685C16.8745 16.4531 16.6579 16.723 16.504 17.0781C16.3501 17.4309 16.2732 17.8594 16.2732 18.3636C16.2732 18.8821 16.3501 19.3177 16.504 19.6705C16.6602 20.0232 16.878 20.2895 17.1574 20.4695C17.4368 20.6494 17.7599 20.7393 18.1269 20.7393C18.3328 20.7393 18.5234 20.7121 18.6986 20.6577C18.8762 20.6032 19.0336 20.5239 19.1709 20.4197C19.3082 20.3132 19.4218 20.1842 19.5118 20.0327C19.6041 19.8812 19.6681 19.7083 19.7036 19.5142L21.259 19.5213C21.2187 19.8551 21.1181 20.1771 20.9571 20.4872C20.7985 20.795 20.5843 21.0708 20.3144 21.3146C20.0468 21.5561 19.7272 21.7479 19.3556 21.8899C18.9862 22.0296 18.5684 22.0994 18.102 22.0994C17.4533 22.0994 16.8733 21.9527 16.3619 21.6591C15.853 21.3655 15.4505 20.9406 15.1546 20.3842C14.861 19.8279 14.7142 19.1544 14.7142 18.3636C14.7142 17.5705 14.8634 16.8958 15.1617 16.3395C15.46 15.7831 15.8648 15.3594 16.3762 15.0682C16.8875 14.7746 17.4628 14.6278 18.102 14.6278C18.5234 14.6278 18.914 14.687 19.2739 14.8054C19.6361 14.9238 19.9569 15.0966 20.2362 15.3239C20.5156 15.5488 20.7429 15.8246 20.9181 16.1513C21.0956 16.478 21.2093 16.852 21.259 17.2734ZM29.0448 18.3636C29.0448 19.1567 28.8945 19.8314 28.5938 20.3878C28.2955 20.9441 27.8883 21.3691 27.3722 21.6626C26.8585 21.9538 26.2809 22.0994 25.6393 22.0994C24.993 22.0994 24.413 21.9527 23.8992 21.6591C23.3855 21.3655 22.9795 20.9406 22.6812 20.3842C22.3829 19.8279 22.2338 19.1544 22.2338 18.3636C22.2338 17.5705 22.3829 16.8958 22.6812 16.3395C22.9795 15.7831 23.3855 15.3594 23.8992 15.0682C24.413 14.7746 24.993 14.6278 25.6393 14.6278C26.2809 14.6278 26.8585 14.7746 27.3722 15.0682C27.8883 15.3594 28.2955 15.7831 28.5938 16.3395C28.8945 16.8958 29.0448 17.5705 29.0448 18.3636ZM27.4859 18.3636C27.4859 17.8499 27.4089 17.4167 27.2551 17.0639C27.1035 16.7112 26.8893 16.4437 26.6123 16.2614C26.3353 16.0791 26.011 15.9879 25.6393 15.9879C25.2676 15.9879 24.9433 16.0791 24.6663 16.2614C24.3893 16.4437 24.1739 16.7112 24.02 17.0639C23.8685 17.4167 23.7927 17.8499 23.7927 18.3636C23.7927 18.8774 23.8685 19.3106 24.02 19.6634C24.1739 20.0161 24.3893 20.2836 24.6663 20.4659C24.9433 20.6482 25.2676 20.7393 25.6393 20.7393C26.011 20.7393 26.3353 20.6482 26.6123 20.4659C26.8893 20.2836 27.1035 20.0161 27.2551 19.6634C27.4089 19.3106 27.4859 18.8774 27.4859 18.3636ZM29.9885 23.25V22.4652L31.718 21.0838C31.8505 20.9749 31.9653 20.8767 32.0624 20.7891C32.1595 20.7015 32.2352 20.6127 32.2897 20.5227C32.3441 20.4328 32.3714 20.3333 32.3714 20.2244C32.3714 20.054 32.3015 19.9226 32.1618 19.8303C32.0222 19.7379 31.8529 19.6918 31.654 19.6918C31.441 19.6918 31.2693 19.7438 31.1391 19.848C31.0113 19.9498 30.9474 20.0978 30.9474 20.2919H29.8998C29.8998 19.8374 30.0655 19.4811 30.3969 19.223C30.7284 18.9626 31.1521 18.8324 31.6682 18.8324C32.021 18.8324 32.3276 18.8939 32.588 19.017C32.8484 19.1378 33.0496 19.3023 33.1917 19.5107C33.3361 19.719 33.4083 19.9522 33.4083 20.2102C33.4083 20.4186 33.3645 20.6127 33.2769 20.7926C33.1917 20.9702 33.0591 21.1454 32.8792 21.3182C32.7016 21.4886 32.472 21.6674 32.1903 21.8544L31.5581 22.3232V22.3622H33.458V23.25H29.9885Z" fill="#CC2222"/>
                            <path d="M13 27H20L24.5 32.5H32L36 37" stroke="#CC2222" strokeWidth="2"/>
                            <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 12 28)" fill="#CC2222"/>
                            <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 35 38)" fill="#CC2222"/>
                          </g>
                          <defs>
                            <clipPath id="co2clip">
                              <rect width="48" height="48" fill="white"/>
                            </clipPath>
                          </defs>
                        </svg>
                        <span className="fg-impact-label">CO₂ evitado</span>
                        <span className="fg-impact-val">{fmtCo2Precise(co2Grams)}</span>
                      </div>
                      <div className="fg-impact-item">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4F8C5A" strokeWidth="1.5">
                          <path d="M12 22V12"/><path d="M12 12C12 12 7 8 7 4a5 5 0 0 1 10 0c0 4-5 8-5 8z"/>
                        </svg>
                        <span className="fg-impact-label">Árvores equivalentes</span>
                        <span className="fg-impact-val">{treesEq < 0.01 ? '< 0.01' : treesEq.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
        </>
      )}
    </>
  );
}
