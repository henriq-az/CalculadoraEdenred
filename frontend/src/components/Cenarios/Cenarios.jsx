import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { listCenarios, fetchScenario } from '../../services/api';
import './Cenarios.css';

function formatDate(isoString) {
  if (!isoString) return '';
  const parts = isoString.toString().split('T')[0].split('-');
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function CalendarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="3" width="14" height="12" rx="2" stroke="#9CA3AF" strokeWidth="1.4"/>
      <path d="M5 1v4M11 1v4" stroke="#9CA3AF" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M1 7h14" stroke="#9CA3AF" strokeWidth="1.4"/>
    </svg>
  );
}

function CompareCard({ c }) {
  const atualKg       = (c.emissoesAtuaisGramas ?? 0) / 1000;
  const projetadoKg   = (c.emissoesSimuladasGramas ?? 0) / 1000;
  const economiaKgMes = (c.economiaGramas ?? 0) / 1000;
  const economiaKgAno = economiaKgMes * 12;
  const pct           = Math.round(c.percentualReducao ?? 0);
  const progressPct   = atualKg > 0 ? Math.min((projetadoKg / atualKg) * 100, 100) : 0;

  const rows = [
    { label: 'CO₂ atual',        value: `${atualKg.toFixed(1)}kg/mês` },
    { label: 'CO₂ projetada',    value: `${projetadoKg.toFixed(1)}kg/mês` },
    { label: 'Redução do CO₂',   value: `-${economiaKgMes.toFixed(1)}kg/mês`, red: true },
    { label: 'Impacto anual',    value: `${economiaKgAno.toFixed(1)}Kg/mês` },
    { label: 'Migração digital', value: `${pct}%` },
    { label: 'Tipo de pagamento', value: c.tipoMeio  ?? '—' },
    { label: 'Categoria',        value: c.categoria  ?? '—' },
  ];

  return (
    <div className="cn-cmp-card">
      <div className="cn-cmp-title">{c.nome}</div>
      <div className="cn-cmp-rows">
        {rows.map(r => (
          <div key={r.label} className="cn-cmp-row">
            <span className="cn-cmp-row-label">{r.label}</span>
            <span className={`cn-cmp-row-value${r.red ? ' cn-cmp-row-value--red' : ''}`}>{r.value}</span>
          </div>
        ))}
      </div>
      <div className="cn-cmp-bar-wrap">
        <div className="cn-cmp-bar">
          <div className="cn-cmp-bar-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="cn-cmp-bar-labels">
          <span>0 kg</span>
          <span>{atualKg.toFixed(1)}kg atual</span>
        </div>
      </div>
    </div>
  );
}

export default function Cenarios() {
  const { empresa } = useAuth();
  const companyId = empresa?.id ?? '1';
  const [cenarios, setCenarios]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [selected, setSelected]   = useState(null);

  // Busca por nome do cenário ou ID
  const [searchTerm, setSearchTerm]       = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError]     = useState(null);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    listCenarios(companyId)
      .then(data => {
        if (!cancelled) {
          setCenarios(data);
          if (data.length > 0) setSelected(data[0].id);
        }
      })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [companyId]);

  const handleSearchScenario = async () => {
    const term = searchTerm.trim();

    if (!term) {
      setSearchError('Digite um nome ou ID válido');
      return;
    }

    setSearchError(null);
    setSearchResults([]);

    if (!/^\d+$/.test(term)) {
      const matches = cenarios.filter(c =>
        (c.nome ?? '').toLowerCase().includes(term.toLowerCase())
      );

      if (matches.length === 0) {
        setSearchError('Nenhum cenário encontrado com esse nome.');
      } else {
        setSearchResults(matches);
      }
      return;
    }

    let cancelled = false;
    setSearchLoading(true);
    try {
      const data = await fetchScenario(term);
      if (!cancelled) {
        setSearchResults([data]);
      }
    } catch (err) {
      if (!cancelled) {
        setSearchError(err.message);
      }
    } finally {
      if (!cancelled) setSearchLoading(false);
    }
  };

  if (loading) return <div className="cn-state">Carregando cenários…</div>;
  if (error)   return <div className="cn-state cn-state--error">{error}</div>;

  return (
    <div className="cn-wrapper">
      {/* Seção de busca por nome ou ID */}
      <div className="cn-search-section">
        <div className="cn-search-header">
          <h3>Buscar cenário por nome ou ID</h3>
          <p>Digite o ID ou parte do nome de um cenário salvo para visualizá-lo</p>
        </div>
        <div className="cn-search-form">
          <input
            type="text"
            placeholder="Ex: 1 ou nome do cenário"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSearchError(null);
              setSearchResults([]);
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleSearchScenario();
            }}
            className="cn-search-input"
          />
          <button
            onClick={handleSearchScenario}
            disabled={searchLoading}
            className="cn-search-btn"
          >
            {searchLoading ? 'Buscando…' : 'Buscar'}
          </button>
        </div>
        {searchError && <div className="cn-search-error">{searchError}</div>}
        {searchResults.length > 0 && (
          <div className="cn-search-result">
            <div className="cn-search-result-title">
              {searchResults.length === 1 ? 'Resultado da busca' : `Resultados da busca (${searchResults.length})`}
            </div>
            <div className="cn-search-result-list">
              {searchResults.map(c => (
                <CompareCard key={c.id} c={c} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cenários salvos da empresa */}
      {cenarios.length === 0 ? (
        <div className="cn-empty">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect x="6" y="10" width="36" height="32" rx="4" stroke="#D1D5DB" strokeWidth="2"/>
            <path d="M16 6v8M32 6v8" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round"/>
            <path d="M6 20h36" stroke="#D1D5DB" strokeWidth="2"/>
            <path d="M18 30h12M24 24v12" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <p className="cn-empty-title">Nenhum cenário salvo</p>
          <p className="cn-empty-sub">Use o Simulador para criar e comparar cenários de redução de CO₂.</p>
        </div>
      ) : (
        <>
          <div className="cn-grid">
            {cenarios.map(c => {
              const isSelected     = selected === c.id;
              const economiaKgMes  = (c.economiaGramas ?? 0) / 1000;
              const economiaKgAno  = economiaKgMes * 12;
              const atualKg        = (c.emissoesAtuaisGramas ?? 0) / 1000;
              const projetadoKg    = (c.emissoesSimuladasGramas ?? 0) / 1000;
              const pct            = Math.round(c.percentualReducao ?? 0);

              return (
                <div
                  key={c.id}
                  className={`cn-card${isSelected ? ' cn-card--selected' : ''}`}
                  onClick={() => setSelected(c.id)}
                >
                  <div className="cn-card-title">{c.nome}</div>

                  <div className="cn-card-date">
                    <CalendarIcon />
                    <span>{formatDate(c.criadoEm)}</span>
                  </div>

                  <div className="cn-card-desc">
                    {c.descricao ?? `${pct}% de redução nas emissões de CO₂`}
                  </div>

                  <div className="cn-tags">
                    {c.tipoMeio && (
                      <span className="cn-tag cn-tag--payment">
                        {c.tipoMeio}
                      </span>
                    )}
                    {c.categoria && (
                      <span className="cn-tag cn-tag--outline">{c.categoria}</span>
                    )}
                    <span className="cn-tag cn-tag--outline">{pct}% de redução</span>
                  </div>

                  <hr className="cn-divider" />

                  <div className="cn-co2-row">
                    <div className="cn-co2-left">
                      <div className="cn-co2-line">CO₂ atual: {atualKg.toFixed(1)}Kg/mês</div>
                      <div className="cn-co2-line">Projetado: {projetadoKg.toFixed(1)}Kg/mês</div>
                    </div>
                    <div className="cn-co2-right">
                      <div className="cn-co2-saving">-{economiaKgMes.toFixed(1)}Kg/mês</div>
                      <div className="cn-co2-annual">{economiaKgAno.toFixed(1)}Kg/ano</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="cn-compare">
            <div className="cn-compare-header">
              <div className="cn-compare-title">Comparação de cenários</div>
              <div className="cn-compare-sub">Análise lado a lado dos cenários selecionados</div>
            </div>
            {cenarios.map(c => <CompareCard key={c.id} c={c} />)}
          </div>
        </>
      )}
    </div>
  );
}
