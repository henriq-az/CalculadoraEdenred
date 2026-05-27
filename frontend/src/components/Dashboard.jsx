import { useState, useEffect } from 'react';
import { fetchHistory, fetchScore, fetchImpact, exportImpactReport } from '../services/api';
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

// ── Tree Icon ────────────────────────────────────────────────────────────────

// ── Chart ─────────────────────────────────────────────────────────────────────
const HIST_MOCK = [
  { month: 'Nov', value: 180 },
  { month: 'Dez', value: 220 },
  { month: 'Jan', value: 195 },
  { month: 'Fev', value: 250 },
  { month: 'Mar', value: 210 },
  { month: 'Abr', value: 280 },
  { month: 'Mai', value: 240 },
];

function HistChart({ data }) {
  const max = Math.max(...data.map(d => d.value));
  const W = 420, H = 90;
  const pts = data.map((d, i) => [
    (i / (data.length - 1)) * W,
    H - (d.value / max) * (H - 10),
  ]);
  const line = pts.map(([x, y]) => `${x},${y}`).join(' ');
  const area = `${pts[0][0]},${H} ${line} ${pts[pts.length - 1][0]},${H}`;
  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="fg-histGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF007D" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#FF007D" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#fg-histGrad)" />
      <polyline points={line} fill="none" stroke="#FF007D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="4" fill="#FF007D" />
          <text x={x} y={H + 16} textAnchor="middle" fontSize="11" fill="#697282">{data[i].month}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'Dashboard',     active: true  },
  { label: 'Simulador',     active: false },
  { label: 'Cenários',      active: false },
  { label: 'Relatórios',    active: false },
  { label: 'Metas',         active: false },
  { label: 'Configurações', active: false },
];

const NAV_ICONS = {
  Dashboard:   <img src={homeIcon}         alt="Dashboard"    width="18" height="18" />,
  Simulador:   <img src={simuladorIcon}    alt="Simulador"    width="18" height="18" />,
  Cenários:    <img src={cenariosIcon}     alt="Cenários"     width="18" height="18" />,
  Relatórios:  <img src={relatorioIcon}    alt="Relatórios"   width="18" height="18" />,
  Metas:       <img src={metasIcon}        alt="Metas"        width="18" height="18" />,
  Configurações: <img src={configuracoesIcon} alt="Configurações" width="18" height="18" />,
};

const PAYMENT_TYPES = [
  { key: 'PIX', label: 'PIX',                   icon: <img src={pixIcon}        alt="PIX"                   width="22" height="22" /> },
  { key: 'NFC', label: 'NFC',                   icon: <img src={nfcIcon}        alt="NFC"                   width="18" height="22" /> },
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
  const [period, setPeriod]               = useState('monthly');
  const [impact, setImpact]               = useState(null);
  const [score, setScore]                 = useState(null);
  const [transactions, setTransactions]   = useState([]);
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

  const rawScore   = score?.score ?? 0;
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
              className={`fg-nav-link${item.active ? ' fg-nav-link--active' : ''}`}
              onClick={e => e.preventDefault()}
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
            <span className="fg-topbar-crumb">Dashboard</span>
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

          <div className="fg-toolbar">
            <label className="fg-company-label">
              Empresa ID:
              <input
                type="number"
                value={companyId}
                min="1"
                onChange={e => setCompanyId(e.target.value)}
                className="fg-company-input"
              />
            </label>
            <div className="fg-export-group">
              {exportError && <span className="fg-export-error">{exportError}</span>}
              <button className="fg-export-btn" onClick={handleExport} disabled={exportLoading}>
                {exportLoading ? 'Exportando…' : 'Exportar PDF'}
              </button>
            </div>
          </div>

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
                  <div className="fg-card">
                    <div className="fg-card-head">
                      <div>
                        <div className="fg-card-title">Comparativo: hoje vs 100% digital</div>
                        <div className="fg-card-sub">Impacto de transação média</div>
                      </div>
                      {redPct > 0 && <span className="fg-badge-dark">{redPct}% de redução potencial</span>}
                    </div>
                    <div className="fg-compare-list">
                      <div className="fg-compare-item">
                        <span className="fg-compare-label">Hoje (físico + digital)</span>
                        <div className="fg-compare-row">
                          <div className="fg-compare-track">
                            <div className="fg-compare-fill" style={{ width: `${(avgPhys / maxAvg) * 100}%` }} />
                          </div>
                          <span className="fg-compare-val">{fmtCo2(avgPhys)} CO₂</span>
                        </div>
                      </div>
                      <div className="fg-compare-item">
                        <span className="fg-compare-label">100% digital</span>
                        <div className="fg-compare-row">
                          <div className="fg-compare-track">
                            <div className="fg-compare-fill fg-compare-fill--pink" style={{ width: `${(avgDig / maxAvg) * 100}%` }} />
                          </div>
                          <span className="fg-compare-val fg-compare-val--pink">{fmtCo2(avgDig)} CO₂</span>
                        </div>
                      </div>
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
                    <div className="fg-card-head">
                      <div>
                        <div className="fg-card-title">Histórico de CO₂ evitado</div>
                        <div className="fg-card-sub">Últimos 7 meses</div>
                      </div>
                    </div>
                    <div className="fg-chart-wrap">
                      <HistChart data={HIST_MOCK} />
                    </div>
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
        </main>
      </div>
    </div>
  );
}
