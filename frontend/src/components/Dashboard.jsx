import { useState, useEffect } from 'react';
import { fetchHistory, fetchHistoryForMonth, fetchHistoryForYear, fetchScore, fetchImpact, fetchScenario, exportImpactReport } from '../services/api';
import edenredLogo from '../assets/Edenred_Logo.svg';
import notificacaoIcon from '../assets/notificacao.svg';
import arvoreIcon from '../assets/Arvore.svg';
import maoIcon from '../assets/Mao.svg';
import icFolha from '../assets/ic-folha.svg';
import icFolha1 from '../assets/ic-folha-1.svg';
import pixIcon from '../assets/Pix.svg';
import nfcIcon from '../assets/NFC.svg';
import transacoesIcon from '../assets/transacoes.svg';
import homeIcon from '../assets/HomeIcon.svg';
import folhaIcon from '../assets/FolhaIcon.svg';
import simuladorIcon from '../assets/SimuladorIcon.svg';
import cenariosIcon from '../assets/CenariosIcon.svg';
import relatorioIcon from '../assets/RelatorioIcon.svg';
import metasIcon from '../assets/MetasIcon.svg';
import configuracoesIcon from '../assets/ConfihuraçõesIcon.svg';
import comparativoIcon from '../assets/ComparativoIcon.svg';
import Cenarios from './Cenarios';
import Simulador from './Simulador';
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

function buildExportPayload(companyId, transactions) {
  const counts = transactions.reduce((acc, tx) => {
    const key = tx.paymentType || 'UNKNOWN';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return {
    empresaId: Number(companyId),
    itens: Object.entries(counts).map(([paymentType, quantidade]) => ({ paymentType, quantidade })),
  };
}

function fmtCo2(grams) {
  if (grams >= 1_000_000) return `${(grams / 1_000_000).toFixed(1)}t`;
  if (grams >= 1_000)     return `${(grams / 1_000).toFixed(1)}kg`;
  return `${Math.round(grams)}g`;
}

const LEVELS = [
  { min: 0,  max: 33,  name: 'Semente', badge: 'Iniciante'         },
  { min: 34, max: 66,  name: 'Broto',   badge: 'Em progresso'      },
  { min: 67, max: 100, name: 'Árvore',  badge: 'Amigo da natureza' },
];

function getLevel(s) {
  if (s >= 67) return 2;
  if (s >= 34) return 1;
  return 0;
}

function buildCategoryRanking(transactions) {
  const byCategory = transactions.reduce((acc, tx) => {
    const category = tx.category || 'OUTROS';
    if (!acc[category]) acc[category] = [];
    acc[category].push(tx);
    return acc;
  }, {});

  return Object.entries(byCategory).map(([category, items]) => {
    const currentCo2 = items.reduce((sum, tx) => sum + (tx.co2Grams ?? 0), 0);
    const physicalCount = items.filter(tx => tx.paymentType === 'PHYSICAL').length;
    const digitalCo2 = items
      .filter(tx => tx.paymentType !== 'PHYSICAL' && tx.paymentType !== 'UNKNOWN')
      .reduce((sum, tx) => sum + (tx.co2Grams ?? 0), 0);

    const options = [
      { paymentType: 'PIX', factor: 0.13 },
      { paymentType: 'NFC', factor: 0.85 },
      { paymentType: 'TED', factor: 0.13 },
      { paymentType: 'WALLET', factor: 0.12 },
      { paymentType: 'QR', factor: 0.05 },
    ].map(option => {
      const projectedCo2 = digitalCo2 + (physicalCount * option.factor);
      return {
        paymentType: option.paymentType,
        projectedCo2,
        savedCo2: currentCo2 - projectedCo2,
      };
    }).sort((a, b) => a.projectedCo2 - b.projectedCo2);

    return {
      category,
      currentCo2,
      physicalCount,
      options,
      bestOption: options[0] || null,
    };
  });
}

// ── Tree Icon ────────────────────────────────────────────────────────────────

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

function buildSmoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const t = 0.18;
    const c1x = p1[0] + (p2[0] - p0[0]) * t;
    const c1y = p1[1] + (p2[1] - p0[1]) * t;
    const c2x = p2[0] - (p3[0] - p1[0]) * t;
    const c2y = p2[1] - (p3[1] - p1[1]) * t;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
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

// ── Nav ───────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'Dashboard'     },
  { label: 'Simulador'     },
  { label: 'Cenários'      },
  { label: 'Relatórios'    },
  { label: 'Metas'         },
  { label: 'Configurações' },
];

const NAV_ICONS = {
  Dashboard:   <img src={homeIcon}            alt="Dashboard"     width="18" height="18" />,
  Simulador:   <img src={simuladorIcon}       alt="Simulador"     width="18" height="18" />,
  Cenários:    <img src={cenariosIcon}        alt="Cenários"      width="18" height="18" />,
  Relatórios:  <img src={relatorioIcon}       alt="Relatórios"    width="18" height="18" />,
  Metas:       <img src={metasIcon}           alt="Metas"         width="18" height="18" />,
  'Configurações': <img src={configuracoesIcon} alt="Configurações" width="18" height="18" />,
};

const PAYMENT_TYPES = [
  { key: 'PIX', label: 'PIX', icon: <img src={pixIcon} alt="PIX" width="22" height="22" /> },
  { key: 'NFC', label: 'NFC', icon: <img src={nfcIcon} alt="NFC" width="18" height="22" /> },
  { key: 'TED', label: 'Transferência bancária', icon: <img src={transacoesIcon} alt="Transferência bancária" width="22" height="22" /> },
];

const PERIODS = [
  { value: 'weekly',  label: 'Semana' },
  { value: 'monthly', label: 'Mês'    },
  { value: 'yearly',  label: 'Ano'    },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [companyId, setCompanyId]         = useState('1');
  const [activePage, setActivePage]       = useState('Dashboard');
  const [period, setPeriod]               = useState('monthly');
  const [scenarioId, setScenarioId]       = useState('1');
  const [scenarioData, setScenarioData]   = useState(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [scenarioError, setScenarioError] = useState(null);
  const [impact, setImpact]               = useState(null);
  const [score, setScore]                 = useState(null);
  const [transactions, setTransactions]   = useState([]);
  const [histChartData, setHistChartData] = useState([]);
  const [histYear, setHistYear]           = useState(new Date().getFullYear());
  const [histMonth, setHistMonth]         = useState(new Date().getMonth());
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError]     = useState(null);

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
          fetchScore(companyId, start, end),
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

  async function handleExport() {
    setExportError(null);
    setExportLoading(true);
    try {
      const payload = buildExportPayload(companyId, transactions);
      const { blob, filename } = await exportImpactReport(payload);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'relatorio-impacto.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setExportError('Não foi possível gerar o relatório. Tente novamente.');
    } finally {
      setExportLoading(false);
    }
  }

  async function handleLoadScenario() {
    setScenarioError(null);
    setScenarioLoading(true);
    try {
      const data = await fetchScenario(scenarioId);
      setScenarioData(data);
    } catch (err) {
      setScenarioData(null);
      setScenarioError(err.message);
    } finally {
      setScenarioLoading(false);
    }
  }

  const rawScore   = Number((score?.score ?? 0).toFixed(2));
  const lvlIdx     = getLevel(rawScore);
  const lvlData    = LEVELS[lvlIdx];
  const nextLevel  = lvlIdx < 2 ? LEVELS[lvlIdx + 1] : null;

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

  const categoryRanking = buildCategoryRanking(transactions);

  return (
    <div className="fg-layout">

      {/* SIDEBAR */}
      <aside className="fg-sidebar">
        <div className="fg-logo">
          <img src={edenredLogo} alt="Edenred" height="40" />
        </div>

        <nav className="fg-nav">
          {NAV_ITEMS.map(item => (
            <a
              key={item.label}
              href="#"
              className={`fg-nav-link${activePage === item.label ? ' fg-nav-link--active' : ''}`}
              onClick={e => {
                e.preventDefault();
                setActivePage(item.label);
              }}
            >
              <span className="fg-nav-icon">{NAV_ICONS[item.label]}</span>
              <span className="fg-nav-label">{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="fg-sidebar-level-card">
          <div className="fg-sidebar-level-title">
            <img src={folhaIcon} alt="" width="16" height="16" />
            <span className="fg-sidebar-level-title-text">Nível de Sustentabilidade</span>
          </div>
          <div className="fg-sidebar-level-badge">
            <span className="fg-sidebar-level-badge-text">{lvlData.name}</span>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="fg-main">

        {/* TOPBAR */}
        <header className="fg-topbar">
          <div className="fg-topbar-left">
            <span className="fg-topbar-title">Painel de Sustentabilidade</span>
            <span className="fg-topbar-crumb">{activePage}</span>
          </div>
          <div className="fg-topbar-right">
            <div className="fg-tabs" role="group" aria-label="Período">
              {PERIODS.map(p => (
                <button
                  key={p.value}
                  className={`fg-tab${period === p.value ? ' fg-tab--active' : ''}`}
                  onClick={() => setPeriod(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <button className="fg-bell" aria-label="Notificações">
              <img src={notificacaoIcon} width="36" height="36" alt="Notificações" />
            </button>

            <div className="fg-topbar-user">
              <div className="fg-topbar-user-info">
                <span className="fg-user-name">João Silva</span>
                <span className="fg-user-role">Gestor</span>
              </div>
              <div className="fg-avatar">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8" cy="5.3" r="2.65" fill="white"/>
                  <path d="M3.3 13c0-2.6 2.1-4.7 4.7-4.7s4.7 2.1 4.7 4.7" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
                </svg>
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main className="fg-content">

{loading && <div className="fg-loading">Carregando…</div>}
          {error   && <div className="fg-error">{error}</div>}

          {!loading && !error && activePage === 'Dashboard' && (
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

          {activePage === 'Cenários' && (
            <Cenarios companyId={companyId} />
          )}

          {activePage === 'Simulador' && (
            <Simulador companyId={companyId} transactions={transactions} />
          )}
        </main>
      </div>
    </div>
  );
}
