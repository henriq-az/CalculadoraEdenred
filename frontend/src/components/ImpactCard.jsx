import './ImpactCard.css';

export default function ImpactCard({ impact }) {
  if (!impact) return <div className="impact-empty">Sem dados para o período selecionado.</div>;

  return (
    <div className="impact-card">
      <span className="impact-period-badge">{impact.periodLabel}</span>
      <div className="impact-stats">
        <div className="impact-stat">
          <span className="impact-stat-val">{(impact.co2Grams / 1000).toFixed(2)} kg</span>
          <span className="impact-stat-lbl">CO₂ economizado</span>
        </div>
        <div className="impact-stat">
          <span className="impact-stat-val">{impact.treesEquivalent.toFixed(1)}</span>
          <span className="impact-stat-lbl">árvores equivalentes</span>
        </div>
        <div className="impact-stat">
          <span className="impact-stat-val">{impact.kmEquivalent.toFixed(0)} km</span>
          <span className="impact-stat-lbl">menos de carro</span>
        </div>
      </div>
    </div>
  );
}
