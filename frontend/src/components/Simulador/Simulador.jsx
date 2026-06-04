import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { saveScenario, listCenarios, fetchHistory } from '../../services/api';
import './Simulador.css';

// Janela do mês atual (YYYY-MM-DD) pra buscar as transações da simulação.
function mesAtual() {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  return { start, end };
}

// g CO₂ por transação (espelha DataInitializer do backend)
const FACTORS = { PIX: 0.13, NFC: 0.85, TED: 0.13, WALLET: 0.12, QR: 0.05, PHYSICAL: 0.98, UNKNOWN: 0.98 };

// Tipos de pagamento disponíveis no dropdown e no comparativo
const DIGITAL_TYPES = [
  { key: 'PIX',    label: 'Pix' },
  { key: 'NFC',    label: 'NFC' },
  { key: 'WALLET', label: 'Wallet' },
  { key: 'QR',     label: 'QR Code' },
];

// Cenário base quando não há transações reais disponíveis
const FALLBACK = { physCount: 800, physCo2: 784, digCo2: 340, totalCo2: 1124 };

// Interpola a cor do gradiente da marca (--color-gradient-start #FF007D →
// --color-gradient-end #F72717) na posição t (0–1). Usado no contorno do "dot"
// do slider: rosa à esquerda, vermelho à direita.
const GRAD_START = [0xFF, 0x00, 0x7D];
const GRAD_END   = [0xF7, 0x27, 0x17];
function gradientAt(t) {
  const c = Math.max(0, Math.min(1, t));
  const ch = GRAD_START.map((s, i) => Math.round(s + (GRAD_END[i] - s) * c));
  return `rgb(${ch[0]}, ${ch[1]}, ${ch[2]})`;
}

// Equivalências (fatores brasileiros)
const EQ_TREE_G   = 21000; // g CO₂ absorvidos por árvore/ano
const EQ_CAR_G    = 175;   // g CO₂ por km de carro
const EQ_LIGHT_G  = 8.33;  // g CO₂ por hora de lâmpada (grid BR)

function extractAgg(transactions) {
  if (!transactions || transactions.length === 0) return FALLBACK;
  let physCount = 0, physCo2 = 0, digCo2 = 0;
  transactions.forEach(tx => {
    const isPhys = tx.paymentType === 'PHYSICAL' || tx.paymentType === 'UNKNOWN';
    const co2 = tx.co2Grams ?? FACTORS[tx.paymentType] ?? 0;
    if (isPhys) { physCount += 1; physCo2 += co2; }
    else         { digCo2 += co2; }
  });
  return { physCount, physCo2, digCo2, totalCo2: physCo2 + digCo2 };
}

function computeSim(agg, migPct, payType, volPct) {
  const scale = volPct / 100;
  const totalAtual = agg.totalCo2 * scale;
  const physScaled = agg.physCount * scale;
  const migrated   = physScaled * (migPct / 100);
  const digScaled  = agg.digCo2 * scale;
  const co2Sim     = (physScaled - migrated) * FACTORS.PHYSICAL + migrated * (FACTORS[payType] ?? 0.13) + digScaled;
  const economia   = Math.max(0, totalAtual - co2Sim);
  return {
    co2AtualKg:   totalAtual / 1000,
    co2SimKg:     co2Sim / 1000,
    economiaKg:   economia / 1000,
    economiaG:    economia,
  };
}

function computeComparativo(agg, volPct) {
  return DIGITAL_TYPES.map(({ key, label }) => {
    const r = computeSim(agg, 100, key, volPct);
    return { key, label, co2Kg: r.co2SimKg };
  });
}

function ChevronDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 6l4 4 4-4" stroke="#697282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const PROJ_CATEGORIES = [
  { key: 'frota',       label: 'Frota' },
  { key: 'alimentacao', label: 'Alimentação' },
  { key: 'servico',     label: 'Serviço' },
];

const BEST_TYPE = DIGITAL_TYPES.reduce((best, t) =>
  (FACTORS[t.key] ?? 1) < (FACTORS[best.key] ?? 1) ? t : best
);

export default function Simulador() {
  const { empresa } = useAuth();
  const companyId = empresa?.id ?? '1';
  const [transactions, setTransactions]     = useState([]);
  const [migrationPct, setMigrationPct]     = useState(50);
  const [paymentType, setPaymentType]       = useState('PIX');
  const [categoria, setCategoria]           = useState('all');
  const [volumePct, setVolumePct]           = useState(100);
  const [saveName, setSaveName]             = useState('');
  const [showSave, setShowSave]             = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [saveMsg, setSaveMsg]               = useState(null);
  const [savedScenarios, setSavedScenarios] = useState([]);

  // Busca as transações do mês atual (antes vinha como prop do Dashboard).
  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    const { start, end } = mesAtual();
    fetchHistory(companyId, start, end)
      .then(txs => { if (!cancelled) setTransactions(txs); })
      .catch(() => { if (!cancelled) setTransactions([]); });
    return () => { cancelled = true; };
  }, [companyId]);

  const agg         = useMemo(() => extractAgg(transactions), [transactions]);
  const result      = useMemo(() => computeSim(agg, migrationPct, paymentType, volumePct), [agg, migrationPct, paymentType, volumePct]);
  const comparativo = useMemo(() => computeComparativo(agg, volumePct), [agg, volumePct]);

  const maxComp = Math.max(...comparativo.map(c => c.co2Kg), 0.001);

  const treeEq  = result.economiaG / EQ_TREE_G;
  const carKm   = result.economiaG / EQ_CAR_G;
  const lightH  = result.economiaG / EQ_LIGHT_G;

  // annual economy per category (split into 3 equal parts)
  const catEconomy = (result.economiaKg * 12) / 3;

  // Fração (0–1) da posição do slider de volume (min 10, max 200).
  const volFrac = Math.min(1, Math.max(0, (volumePct - 10) / (200 - 10)));

  const fetchSaved = useCallback(() => {
    if (!companyId) return;
    listCenarios(companyId).then(setSavedScenarios).catch(() => {});
  }, [companyId]);

  useEffect(() => { fetchSaved(); }, [fetchSaved]);

  async function handleSave() {
    if (!saveName.trim()) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      // Distribuição atual = contagem real por tipo (fallback se não houver dados).
      const counts = {};
      transactions.forEach(tx => {
        const t = tx.paymentType || 'UNKNOWN';
        counts[t] = (counts[t] || 0) + 1;
      });
      if (Object.keys(counts).length === 0) counts.PHYSICAL = Math.max(1, Math.round(agg.physCount));

      // Simulada = migra migrationPct do físico (PHYSICAL + UNKNOWN) para o tipo escolhido.
      const physical    = (counts.PHYSICAL || 0) + (counts.UNKNOWN || 0);
      const migrated    = Math.round(physical * migrationPct / 100);
      const countsSim   = { ...counts };
      let toRemove = migrated;
      for (const pt of ['PHYSICAL', 'UNKNOWN']) {
        const take = Math.min(countsSim[pt] || 0, toRemove);
        countsSim[pt] = (countsSim[pt] || 0) - take;
        toRemove -= take;
      }
      countsSim[paymentType] = (countsSim[paymentType] || 0) + migrated;

      const toItems = obj => Object.entries(obj)
        .map(([paymentType, quantidade]) => ({ paymentType, quantidade }))
        .filter(i => i.quantidade > 0);
      const distribuicaoAtual    = toItems(counts);
      const distribuicaoSimulada = toItems(countsSim);

      const payLabel  = DIGITAL_TYPES.find(d => d.key === paymentType)?.label ?? paymentType;
      const descricao = `${migrationPct}% migração para ${payLabel} (volume ${volumePct}%)`;

      await saveScenario(
        saveName.trim(),
        { empresaId: Number(companyId), distribuicaoAtual, distribuicaoSimulada },
        { descricao, tipoMeio: paymentType, categoria: categoria === 'all' ? null : categoria }
      );
      setSaveMsg({ ok: true, text: 'Cenário salvo com sucesso!' });
      setSaveName('');
      setShowSave(false);
      fetchSaved();
    } catch (err) {
      setSaveMsg({ ok: false, text: err.message || 'Erro ao salvar cenário.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sim-wrap">
      {/* ── LEFT: Parâmetros ─────────────────────────────────────────── */}
      <div className="sim-panel sim-panel--left">
        <div className="sim-panel-title">Parâmetros de simulação</div>

        {/* Migration % slider */}
        <div className="sim-slider-block sim-slider-block--first">
          <span className="sim-panel-sub">Migração para o digital</span>
          <div className="sim-slider-row">
            <span className="sim-slider-pct">{migrationPct}%</span>
          </div>
          <input
            type="range" min={0} max={100} value={migrationPct}
            onChange={e => setMigrationPct(Number(e.target.value))}
            className="sim-slider"
            style={{ '--val': `${migrationPct}%`, '--thumb': gradientAt(migrationPct / 100) }}
          />
          <div className="sim-slider-label">Percentual de transações migradas do físico para o digital</div>
        </div>

        {/* Payment type dropdown */}
        <div className="sim-section">
          <div className="sim-field-title">Tipo de pagamento digital</div>
          <div className="sim-select-wrap">
            <select
              value={paymentType}
              onChange={e => setPaymentType(e.target.value)}
              className="sim-select"
            >
              {DIGITAL_TYPES.map(d => (
                <option key={d.key} value={d.key}>{d.label}</option>
              ))}
            </select>
            <span className="sim-select-arrow"><ChevronDown /></span>
          </div>
        </div>

        {/* Categoria dropdown */}
        <div className="sim-section">
          <div className="sim-field-title">Categoria</div>
          <div className="sim-select-wrap">
            <select
              className="sim-select"
              value={categoria}
              onChange={e => setCategoria(e.target.value)}
            >
              <option value="all">Todas as categorias</option>
              <option value="Alimentação">Alimentação</option>
              <option value="Frota">Frota</option>
              <option value="Serviços">Serviços</option>
            </select>
            <span className="sim-select-arrow"><ChevronDown /></span>
          </div>
        </div>

        {/* Volume slider */}
        <div className="sim-slider-block">
          <span className="sim-field-title">Volume de transações</span>
          <div className="sim-slider-row">
            <span className="sim-slider-pct">{volumePct}%</span>
          </div>
          <input
            type="range" min={10} max={200} value={volumePct}
            onChange={e => setVolumePct(Number(e.target.value))}
            className="sim-slider"
            style={{ '--val': `${volFrac * 100}%`, '--thumb': gradientAt(volFrac) }}
          />
          <div className="sim-slider-label">Ajuste relativo ao volume atual (100% = volume atual)</div>
        </div>

        {/* Save area */}
        {saveMsg && (
          <div className={`sim-save-msg${saveMsg.ok ? ' sim-save-msg--ok' : ' sim-save-msg--err'}`}>
            {saveMsg.text}
          </div>
        )}

        {showSave ? (
          <div className="sim-save-inline">
            <input
              className="sim-save-input"
              placeholder="Nome do cenário…"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowSave(false); }}
              autoFocus
            />
            <div className="sim-save-actions">
              <button className="sim-btn-cancel" onClick={() => { setShowSave(false); setSaveName(''); }}>Cancelar</button>
              <button className="sim-btn-confirm" onClick={handleSave} disabled={saving || !saveName.trim()}>
                {saving ? 'Salvando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        ) : (
          <button className="sim-btn-save" onClick={() => { setShowSave(true); setSaveMsg(null); }}>
            Salvar simulação
          </button>
        )}
      </div>

      {/* ── RIGHT: Resultados ────────────────────────────────────────── */}
      <div className="sim-panel sim-panel--right">
        <div className="sim-panel-title">Resultado da simulação</div>

        {/* Scenario cards */}
        <div className="sim-scenarios">
          <div className="sim-scenario sim-scenario--atual">
            <div className="sim-scenario-label">Cenário atual</div>
            <div className="sim-scenario-value">{result.co2AtualKg.toFixed(2)}</div>
            <div className="sim-scenario-unit">kg CO₂/mês</div>
          </div>

          <div className="sim-scenario-arrow">›</div>

          <div className="sim-scenario sim-scenario--sim">
            <div className="sim-scenario-label">Cenário {migrationPct}% digital</div>
            <div className="sim-scenario-value">{result.co2SimKg.toFixed(2)}</div>
            <div className="sim-scenario-unit">kg CO₂/mês</div>
          </div>
        </div>

        {/* Economy card */}
        <div className="sim-economy">
          <div className="sim-economy-icon"><span className="sim-mask-icon sim-mask-icon--leaf" /></div>
          <div className="sim-economy-body">
            <div className="sim-economy-val">{result.economiaKg.toFixed(2)} kg CO₂</div>
            <div className="sim-economy-sub">CO₂ evitado com migração selecionada</div>
          </div>
        </div>

        {/* Equivalences */}
        <div className="sim-equiv-row">
          <div className="sim-equiv">
            <span className="sim-mask-icon sim-mask-icon--tree" />
            <div className="sim-equiv-num">{treeEq.toFixed(1)}</div>
            <div className="sim-equiv-label">árvore/ano</div>
          </div>
          <div className="sim-equiv">
            <span className="sim-mask-icon sim-mask-icon--car" />
            <div className="sim-equiv-num">{carKm.toFixed(0)} km</div>
            <div className="sim-equiv-label">De carro</div>
          </div>
          <div className="sim-equiv">
            <span className="sim-mask-icon sim-mask-icon--light" />
            <div className="sim-equiv-num">{Math.round(lightH)} h</div>
            <div className="sim-equiv-label">De luz</div>
          </div>
        </div>

        {/* Comparativo */}
        <div className="sim-comp-title">Comparativo por tipo de pagamento digital</div>
        <div className="sim-comp-list">
          {comparativo.map(({ key, label, co2Kg }) => (
            <div key={key} className="sim-comp-item">
              <span className="sim-comp-name">{label}</span>
              <div className="sim-comp-bar-wrap">
                <div className="sim-comp-bar" style={{ width: `${(co2Kg / maxComp) * 100}%` }} />
              </div>
              <span className="sim-comp-val">{co2Kg.toFixed(2)}kg</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── BOTTOM: Projeção + Cenários salvos ─────────────────────── */}
      <div className="sim-bottom-card">

        {/* Projeção por categoria */}
        <div className="sim-bottom-title">Projeção por categoria</div>
        <div className="sim-cat-row">
          {PROJ_CATEGORIES.map(cat => (
            <div key={cat.key} className="sim-cat-card">
              <div className="sim-cat-name">{cat.label}</div>
              <div className="sim-cat-value">-{catEconomy.toFixed(1)} kg</div>
              <div className="sim-cat-best">
                Melhor: {DIGITAL_TYPES.find(d => d.key === paymentType)?.label ?? paymentType}
              </div>
            </div>
          ))}
        </div>

        {/* Projeção temporal */}
        <div className="sim-bottom-title">Projeção temporal - CO₂ evitado acumulado</div>
        <div className="sim-temporal-row">
          {[3, 6, 9, 12].map(months => (
            <div key={months} className="sim-temporal-card">
              <div className="sim-temporal-period">{months} meses</div>
              <div className="sim-temporal-value">{(result.economiaKg * months).toFixed(1)} kg</div>
            </div>
          ))}
        </div>

        {/* Cenários salvos */}
        <div className="sim-bottom-title">Cenários salvos</div>
        {savedScenarios.length === 0 ? (
          <div className="sim-saved-empty">
            Nenhum cenário salvo ainda. Configure uma simulação e clique em &quot;Salvar&quot;.
          </div>
        ) : (
          <div className="sim-saved-list">
            {savedScenarios.map(c => (
              <div key={c.id} className="sim-saved-item">
                <div className="sim-saved-info">
                  <div className="sim-saved-name">{c.nome}</div>
                  {c.tipoMeio && (
                    <span className="sim-saved-tag">{c.tipoMeio}</span>
                  )}
                </div>
                <div className="sim-saved-economy">-{(c.economiaKg ?? 0).toFixed(2)} kg CO₂</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
