import { useState, useEffect } from 'react';
import { fetchHistory, fetchScore, fetchImpact, exportImpactReport } from '../services/api';
import ScoreCard from './ScoreCard';
import ImpactCard from './ImpactCard';
import TransactionHistory from './TransactionHistory';
import './Dashboard.css';

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

const PERIODS = [
  { value: 'weekly',  label: 'Semana' },
  { value: 'monthly', label: 'Mês'    },
  { value: 'yearly',  label: 'Ano'    },
];

const EXPORT_ERROR_MESSAGE = 'Não foi possível gerar o relatório. Tente novamente.';

function buildExportPayload(companyId, transactions) {
  const counts = transactions.reduce((acc, transaction) => {
    const key = transaction.paymentType || 'UNKNOWN';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const itens = Object.entries(counts).map(([paymentType, quantidade]) => ({
    paymentType,
    quantidade,
  }));

  return { empresaId: Number(companyId), itens };
}

export default function Dashboard() {
  const [companyId, setCompanyId] = useState('1');
  const [period, setPeriod] = useState('monthly');
  const [impact, setImpact] = useState(null);
  const [score, setScore] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState(null);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    const { start, end } = deriveDates(period);

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [impactData, scoreData, historyData] = await Promise.all([
          fetchImpact(companyId, period),
          fetchScore(companyId, start, end),
          fetchHistory(companyId, start, end),
        ]);
        if (!cancelled) {
          setImpact(impactData);
          setScore(scoreData);
          setTransactions(historyData);
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
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || 'relatorio-impacto.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(EXPORT_ERROR_MESSAGE);
    } finally {
      setExportLoading(false);
    }
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Painel de Sustentabilidade</h1>
        <p>Impacto ambiental das transações digitais vs. físicas</p>
      </header>

      <section className="filter-bar">
        <label className="filter-field">
          <span>Empresa (ID)</span>
          <input
            type="number"
            value={companyId}
            min="1"
            onChange={(e) => setCompanyId(e.target.value)}
          />
        </label>
        <div className="filter-field">
          <span>Período</span>
          <div className="period-toggle" role="group" aria-label="Período de análise">
            {PERIODS.map(p => (
              <button
                key={p.value}
                className={`period-btn ${period === p.value ? 'period-btn--active' : ''}`}
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {loading && <div className="dashboard-loading">Carregando...</div>}
      {error && <div className="dashboard-error">{error}</div>}

      {!loading && !error && (
        <>
          <section className="dashboard-section">
            <div className="export-bar">
              <h2>Impacto no período</h2>
              <button
                type="button"
                className="export-btn"
                onClick={handleExport}
                disabled={exportLoading}
              >
                {exportLoading ? 'Exportando...' : 'Exportar PDF'}
              </button>
            </div>
            {exportError && <div className="export-error">{exportError}</div>}
            <ImpactCard impact={impact} />
          </section>

          <section className="dashboard-section">
            <h2>Score de sustentabilidade</h2>
            <ScoreCard
              score={score}
              unknownCount={transactions.filter(tx => tx.paymentType === 'UNKNOWN').length}
            />
          </section>

          <section className="dashboard-section">
            <h2>Histórico de transações</h2>
            <TransactionHistory transactions={transactions} />
          </section>
        </>
      )}
    </div>
  );
}
