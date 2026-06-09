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
const DIGITAL_TYPES = new Set(['PIX', 'NFC', 'TED']);
const MONTHS_PT     = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

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
    } else {
      fetchHistoryForMonth(companyId, histYear, histMonth)
        .then(txs => { if (!cancelled) setHistChartData(buildDailyHistData(txs, histYear, histMonth)); })
        .catch(() => {});
    }
    return () => { cancelled = true; };
  }, [companyId, period, histYear, histMonth]);

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

  const physTxs = transactions.filter(tx => tx.paymentType === 'PHYSICAL');
  const digTxs  = transactions.filter(tx => tx.paymentType !== 'PHYSICAL' && tx.paymentType !== 'UNKNOWN');
  const avgPhys = physTxs.length > 0
    ? physTxs.reduce((s, tx) => s + (tx.co2Grams ?? 0), 0) / physTxs.length : 257;
  const avgDig  = digTxs.length > 0
    ? digTxs.reduce((s, tx) => s + (tx.co2Grams ?? 0), 0) / digTxs.length   : 12;
  const maxAvg  = Math.max(avgPhys, avgDig, 1);
  const redPct  = avgPhys > 0 ? Math.round((1 - avgDig / avgPhys) * 100) : 95;
  const benchPct = digitalPct || 72;

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
                        <div className="fg-compare-fill" style={{ width: `${(avgPhys / maxAvg) * 100}%` }} />
                      </div>
                      <span className="fg-compare-val">{fmtCo2(avgPhys)} CO₂</span>

                      <span className="fg-compare-label">100% digital</span>
                      <div className="fg-compare-track">
                        <div className="fg-compare-fill fg-compare-fill--pink" style={{ width: `${(avgDig / maxAvg) * 100}%` }} />
                      </div>
                      <span className="fg-compare-val fg-compare-val--pink">{fmtCo2(avgDig)} CO₂</span>
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
                        Você está acima de {benchPct}% das empresas no setor
                      </p>
                    </div>
                  </div>
                </div>

                <div className="fg-col">
                  <div className="fg-card">
                    {(() => {
                      const today = new Date();
                      const isYearly = period === 'yearly';
                      const isCurrentMonth = histYear === today.getFullYear() && histMonth === today.getMonth();
                      const isCurrentYear  = histYear >= today.getFullYear();
                      const daysInMonth    = new Date(histYear, histMonth + 1, 0).getDate();
                      const maxDay         = isCurrentMonth ? today.getDate() : daysInMonth;

                      function prevNav() {
                        if (isYearly) { setHistYear(y => y - 1); }
                        else if (histMonth === 0) { setHistYear(y => y - 1); setHistMonth(11); }
                        else { setHistMonth(m => m - 1); }
                      }
                      function nextNav() {
                        if (isYearly) { if (!isCurrentYear) setHistYear(y => y + 1); }
                        else if (!isCurrentMonth) {
                          if (histMonth === 11) { setHistYear(y => y + 1); setHistMonth(0); }
                          else { setHistMonth(m => m + 1); }
                        }
                      }
                      const navLabel  = isYearly ? `${histYear}` : `${MONTHS_PT[histMonth]} ${histYear}`;
                      const navMinW   = isYearly ? '36px' : '80px';
                      const prevDis   = isYearly ? histYear <= 2020 : (histYear <= 2020 && histMonth === 0);
                      const nextDis   = isYearly ? isCurrentYear : isCurrentMonth;
                      const subtitle  = isYearly
                        ? `Janeiro a ${isCurrentYear ? MONTHS_PT[today.getMonth()] : 'Dezembro'} ${histYear}`
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
                        <div className="fg-card-sub">Desde o início da plataforma</div>
                      </div>
                    </div>
                    <div className="fg-impact-list">
                      <div className="fg-impact-item">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4F8C5A" strokeWidth="1.5">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                        <span className="fg-impact-label">CO₂ evitado</span>
                        <span className="fg-impact-val">{fmtCo2(co2Grams)}</span>
                      </div>
                      <div className="fg-impact-item">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4F8C5A" strokeWidth="1.5">
                          <rect x="2" y="3" width="20" height="14" rx="2"/>
                          <path d="M8 21h8"/><path d="M12 17v4"/>
                        </svg>
                        <span className="fg-impact-label">Cartões não emitidos</span>
                        <span className="fg-impact-val">{digitalTx.toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="fg-impact-item">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4F8C5A" strokeWidth="1.5">
                          <path d="M12 22V12"/><path d="M12 12C12 12 7 8 7 4a5 5 0 0 1 10 0c0 4-5 8-5 8z"/>
                        </svg>
                        <span className="fg-impact-label">Árvores equivalentes</span>
                        <span className="fg-impact-val">{treesEq.toFixed(0)}</span>
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
