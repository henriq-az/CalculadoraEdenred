import { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchImpact, fetchScore, fetchHistory, exportImpactReport } from '../../services/api';
import { LEVELS, getLevel } from '../../lib/sustainability';
import './Relatorios.css';

const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const PERIOD_LABEL = {
  weekly:  'Última semana',
  monthly: 'Último mês',
  yearly:  'Último ano',
};

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
  if (!grams) return '0g';
  if (grams >= 1_000_000) return `${(grams / 1_000_000).toFixed(1)}t`;
  if (grams >= 1_000)     return `${(grams / 1_000).toFixed(1)}kg`;
  return `${Math.round(grams)}g`;
}

function previewTitle(period) {
  const now = new Date();
  if (period === 'yearly')  return `Relatório ESG — ${now.getFullYear()}`;
  if (period === 'weekly') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return `Relatório ESG — Semana de ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
  }
  return `Relatório ESG — ${MONTHS_PT[now.getMonth()]} ${now.getFullYear()}`;
}

const MOCK_HISTORY = [
  { nome: 'Relatório ESG - Abril 2026',     periodo: 'Abril 2026',     data: '01/05/2026', tipo: 'Mensal',      status: 'Disponível' },
  { nome: 'Relatório ESG - Q1 2026',         periodo: 'Jan–Mar 2026',   data: '01/04/2026', tipo: 'Trimestral',  status: 'Disponível' },
  { nome: 'Relatório ESG - Março 2026',      periodo: 'Março 2026',     data: '01/04/2026', tipo: 'Mensal',      status: 'Disponível' },
  { nome: 'Relatório ESG - Fevereiro 2026',  periodo: 'Fevereiro 2026', data: '01/03/2026', tipo: 'Mensal',      status: 'Disponível' },
  { nome: 'Relatório ESG - Dezembro 2025',   periodo: 'Dezembro 2025',  data: '15/12/2025', tipo: 'Mensal',      status: 'Disponível' },
];

function DocIcon() {
  return (
    <div className="rl-doc-icon">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
    </div>
  );
}

export default function Relatorios() {
  const { empresa }   = useAuth();
  const companyId     = empresa?.id ?? '1';
  const { period, setHeaderSlot } = useOutletContext();

  const [impact,       setImpact]       = useState(null);
  const [score,        setScore]        = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [exporting,    setExporting]    = useState(false);
  const [exportError,  setExportError]  = useState(null);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    const { start, end } = deriveDates(period);

    async function load() {
      setLoading(true);
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
      } catch {
        // silently leave previous data visible
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [companyId, period]);

  const co2ByType = useMemo(() => transactions.reduce((acc, tx) => {
    const t = tx.paymentType || 'UNKNOWN';
    if (!acc[t]) acc[t] = { count: 0 };
    acc[t].count += 1;
    return acc;
  }, {}), [transactions]);

  const totalTx    = score?.totalTransactions  ?? 0;
  const digitalTx  = score?.digitalTransactions ?? 0;
  const digitalPct = totalTx > 0 ? Math.round((digitalTx / totalTx) * 100) : 0;
  const rawScore   = Number((score?.score ?? 0).toFixed(2));
  const lvlData    = LEVELS[getLevel(rawScore)];

  const handleExport = useCallback(async () => {
    setExportError(null);
    const itens = Object.entries(co2ByType)
      .filter(([pt]) => pt !== 'UNKNOWN')
      .map(([paymentType, d]) => ({ paymentType, quantidade: d.count }));

    if (itens.length === 0) {
      setExportError('Nenhuma transação encontrada para o período selecionado. Escolha outro período ou aguarde os dados serem carregados.');
      return;
    }

    setExporting(true);
    const { start, end } = deriveDates(period);
    const label = PERIOD_LABEL[period] ?? period;

    try {
      const { blob, filename } = await exportImpactReport({
        empresaId:             Number(companyId),
        periodoReferencia:     `${label} (${start} a ${end})`,
        nomeEmpresa:           empresa?.nome ?? null,
        co2Evitado:            impact?.co2Grams        ?? null,
        arvoresEquivalentes:   impact?.treesEquivalent ?? null,
        scoreSustentabilidade: rawScore > 0 ? rawScore : null,
        percentualDigital:     totalTx > 0 ? digitalPct : null,
        itens,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err.message);
    } finally {
      setExporting(false);
    }
  }, [co2ByType, period, companyId, empresa, impact, rawScore, totalTx, digitalPct]);

  const canExport = !exporting;

  useEffect(() => {
    setHeaderSlot(
      <button
        className="rl-generate-btn"
        onClick={handleExport}
        disabled={!canExport || loading}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        {exporting ? 'Gerando PDF…' : 'Gerar Novo Relatório'}
      </button>
    );
    return () => setHeaderSlot(null);
  }, [handleExport, canExport, exporting, loading, setHeaderSlot]);

  return (
    <div className="rl-page">

      {/* Seção 1 — Prévia */}
      <div className="rl-card">
        <div className="rl-card-head">
          <p className="rl-section-title">Prévia do Último Relatório</p>
          <p className="rl-section-sub">{previewTitle(period)}</p>
        </div>

        <div className="rl-kpi-row">
          <div className="rl-kpi-card">
            <span className="rl-kpi-label">Emissões Totais</span>
            <span className="rl-kpi-value">{loading ? '…' : fmtCo2(impact?.co2Grams)}</span>
            <span className="rl-kpi-detail">CO₂ equivalente</span>
          </div>
          <div className="rl-kpi-card">
            <span className="rl-kpi-label">Redução vs Anterior</span>
            <span className="rl-kpi-value">-12%</span>
            <span className="rl-kpi-detail">Mês a mês</span>
          </div>
          <div className="rl-kpi-card">
            <span className="rl-kpi-label">Transações Digitais</span>
            <span className="rl-kpi-value">{loading ? '…' : `${digitalPct}%`}</span>
            <span className="rl-kpi-detail">Do total</span>
          </div>
          <div className="rl-kpi-card">
            <span className="rl-kpi-label">Score Sustentabilidade</span>
            <span className="rl-kpi-value">{loading ? '…' : `${rawScore}/100`}</span>
            <span className="rl-kpi-detail">Nível {lvlData?.name ?? '—'}</span>
          </div>
        </div>

        <div className="rl-action-row">
          <button className="rl-action-btn" disabled>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            Visualizar Completo
          </button>
          <button
            className="rl-action-btn rl-action-btn--primary"
            onClick={handleExport}
            disabled={!canExport || loading}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {exporting ? 'Gerando…' : 'Download PDF'}
          </button>
          <button className="rl-action-btn" disabled>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            Compartilhar
          </button>
        </div>

        {exportError && (
          <div className="rl-export-error">{exportError}</div>
        )}
      </div>

      {/* Seção 2 — Histórico */}
      <div className="rl-card">
        <div className="rl-card-head">
          <p className="rl-section-title">Histórico de Relatórios</p>
          <p className="rl-section-sub">Todos os relatórios gerados</p>
        </div>

        <div className="rl-table-wrap">
          <table className="rl-table">
            <thead>
              <tr>
                <th>Nome do Relatório</th>
                <th>Período</th>
                <th>Data de Geração</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_HISTORY.map((row, i) => (
                <tr key={i}>
                  <td>
                    <div className="rl-table-name">
                      <DocIcon />
                      {row.nome}
                    </div>
                  </td>
                  <td>{row.periodo}</td>
                  <td>{row.data}</td>
                  <td>
                    <span className="rl-badge rl-badge--type">{row.tipo}</span>
                  </td>
                  <td>
                    <span className="rl-badge rl-badge--available">
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
                        <circle cx="4" cy="4" r="4"/>
                      </svg>
                      {row.status}
                    </span>
                  </td>
                  <td>
                    <div className="rl-actions-cell">
                      <button className="rl-icon-btn" title="Download" aria-label="Download">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </button>
                      <button className="rl-icon-btn" title="Compartilhar" aria-label="Compartilhar">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
