import { useEffect, useRef, useState } from 'react';
import './ScoreCard.css';

const LEVELS = [
  { min: 0,  max: 25,  name: 'Aprendiz verde',        subtitle: 'Primeiros passos na jornada digital'  },
  { min: 26, max: 50,  name: 'Amigo da natureza',      subtitle: 'Crescendo em práticas sustentáveis'   },
  { min: 51, max: 75,  name: 'Defensor das florestas', subtitle: 'Referência em sustentabilidade digital'},
  { min: 76, max: 100, name: 'Herói ecológico',         subtitle: 'Guardião da natureza digital'         },
];

function getLevel(score) {
  if (score >= 76) return 3;
  if (score >= 51) return 2;
  if (score >= 26) return 1;
  return 0;
}

function getLevelProgress(score) {
  const lvl = getLevel(score);
  const { min, max } = LEVELS[lvl];
  return (score - min) / (max - min);
}

function useAnimatedValue(target, duration = 700) {
  const [value, setValue] = useState(target);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    const to = target;
    if (from === to) return;
    cancelAnimationFrame(rafRef.current);
    startRef.current = null;

    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (to - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
      else { fromRef.current = to; setValue(to); }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

function SeedSVG({ progress }) {
  const rise = 8 + progress * 18;
  return (
    <svg viewBox="0 0 300 300" overflow="visible" className="plant-svg">
      <defs>
        <radialGradient id="bowlGrad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#8B6914" />
          <stop offset="100%" stopColor="#4A2E18" />
        </radialGradient>
      </defs>
      {/* Bowl */}
      <ellipse cx="150" cy="248" rx="68" ry="18" fill="url(#bowlGrad)" />
      <ellipse cx="150" cy="248" rx="68" ry="18" fill="none" stroke="#3A2010" strokeWidth="1.5" />
      {/* Dirt dots */}
      {[130,150,170,140,160].map((x,i) => (
        <circle key={i} cx={x} cy={244 + (i%2)*6} r="2" fill="#3A2010" opacity="0.5" />
      ))}
      {/* Seed shell */}
      <ellipse cx="150" cy={252 - rise * 0.4} rx="10" ry="7" fill="#8B6423" />
      {/* Sprout crack */}
      <path
        d={`M150,${252 - rise * 0.4 - 5} Q148,${252 - rise * 0.4 - 5 - rise * 0.4} 150,${252 - rise * 0.4 - 5 - rise * 0.8}`}
        stroke="#5A9A4A" strokeWidth="2.5" fill="none" strokeLinecap="round"
      />
      {/* Bud */}
      <circle cx="150" cy={252 - rise * 0.4 - 5 - rise * 0.8} r={3 + progress * 3} fill="#7BB97D" />
    </svg>
  );
}

function SproutSVG({ progress }) {
  const height = 55 + progress * 40;
  const cx = 150;
  const baseY = 235;
  const tipY = baseY - height;

  const stemPath = `
    M${cx},${baseY}
    C${cx - 8},${baseY - height * 0.3}
     ${cx + 10},${baseY - height * 0.6}
     ${cx},${tipY}
  `;

  const leafSize1 = 10 + progress * 6;
  const leafSize2 = 14 + progress * 8;
  const mid1Y = baseY - height * 0.45;
  const mid2Y = baseY - height * 0.72;

  return (
    <svg viewBox="0 0 300 300" overflow="visible" className="plant-svg">
      <defs>
        <radialGradient id="bowlGrad2" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#8B6914" />
          <stop offset="100%" stopColor="#4A2E18" />
        </radialGradient>
      </defs>
      {/* Bowl */}
      <ellipse cx="150" cy="248" rx="68" ry="18" fill="url(#bowlGrad2)" />
      <ellipse cx="150" cy="248" rx="68" ry="18" fill="none" stroke="#3A2010" strokeWidth="1.5" />
      {[130,150,170,140,160].map((x,i) => (
        <circle key={i} cx={x} cy={244 + (i%2)*6} r="2" fill="#3A2010" opacity="0.5" />
      ))}
      {/* Stem */}
      <path d={stemPath} stroke="#5A9A4A" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Lower leaves */}
      <ellipse cx={cx - leafSize1 - 2} cy={mid1Y} rx={leafSize1} ry={leafSize1 * 0.55}
        fill="#4F8C5A" transform={`rotate(-30,${cx - leafSize1 - 2},${mid1Y})`} />
      <ellipse cx={cx + leafSize1 + 2} cy={mid1Y} rx={leafSize1} ry={leafSize1 * 0.55}
        fill="#4F8C5A" transform={`rotate(30,${cx + leafSize1 + 2},${mid1Y})`} />
      {/* Upper leaves */}
      <ellipse cx={cx - leafSize2 - 2} cy={mid2Y} rx={leafSize2} ry={leafSize2 * 0.55}
        fill="#A5D6A7" transform={`rotate(-25,${cx - leafSize2 - 2},${mid2Y})`} />
      <ellipse cx={cx + leafSize2 + 2} cy={mid2Y} rx={leafSize2} ry={leafSize2 * 0.55}
        fill="#A5D6A7" transform={`rotate(25,${cx + leafSize2 + 2},${mid2Y})`} />
      {/* Tip bud */}
      <circle cx={cx} cy={tipY} r="4" fill="#7BB97D" />
    </svg>
  );
}

function TreeSVG({ progress }) {
  const scale = 0.82 + progress * 0.18;
  const cx = 150;
  const trunkY = 235;
  const trunkH = 28 * scale;
  const trunkW = 14 * scale;

  const layer = (yBase, halfW, h, color) => (
    <polygon
      points={`${cx},${yBase - h} ${cx - halfW},${yBase} ${cx + halfW},${yBase}`}
      fill={color}
    />
  );

  const b3Y = trunkY - trunkH;
  const b2Y = b3Y - 42 * scale;
  const b1Y = b2Y - 36 * scale;

  return (
    <svg viewBox="0 0 300 300" overflow="visible" className="plant-svg">
      <defs>
        <radialGradient id="bowlGrad3" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#8B6914" />
          <stop offset="100%" stopColor="#4A2E18" />
        </radialGradient>
        <linearGradient id="trunkGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8B5A2B" />
          <stop offset="100%" stopColor="#6B4423" />
        </linearGradient>
      </defs>
      {/* Bowl */}
      <ellipse cx="150" cy="248" rx="68" ry="18" fill="url(#bowlGrad3)" />
      <ellipse cx="150" cy="248" rx="68" ry="18" fill="none" stroke="#3A2010" strokeWidth="1.5" />
      {[130,150,170,140,160].map((x,i) => (
        <circle key={i} cx={x} cy={244 + (i%2)*6} r="2" fill="#3A2010" opacity="0.5" />
      ))}
      {/* Trunk */}
      <rect
        x={cx - trunkW / 2} y={trunkY - trunkH}
        width={trunkW} height={trunkH}
        fill="url(#trunkGrad)" rx="2"
      />
      {/* Bottom layer — dark */}
      {layer(b3Y, 58 * scale, 52 * scale, '#4F8C5A')}
      {/* Mid layer */}
      {layer(b2Y, 46 * scale, 44 * scale, '#7BB97D')}
      {/* Top layer — light */}
      {layer(b1Y, 32 * scale, 38 * scale, '#A5D6A7')}
    </svg>
  );
}

function PlantVisual({ score }) {
  const level = getLevel(score);
  const progress = getLevelProgress(score);
  if (level === 2) return <TreeSVG progress={progress} />;
  if (level === 1) return <SproutSVG progress={progress} />;
  return <SeedSVG progress={progress} />;
}

export default function ScoreCard({ score, unknownCount = 0 }) {
  if (!score) return <div className="score-empty">Sem dados para o período selecionado.</div>;

  const rawScore = score.score;
  const co2Kg = score.co2Saved / 1000;
  const digitalPct = score.totalTransactions > 0
    ? (score.digitalTransactions / score.totalTransactions) * 100
    : 0;

  const animScore = useAnimatedValue(rawScore);
  const animCo2 = useAnimatedValue(co2Kg);
  const animPct = useAnimatedValue(digitalPct);

  const level = getLevel(rawScore);
  const { name, subtitle } = LEVELS[level];
  const progressBar = rawScore / 100;

  const TICKS = [0, 34, 67, 100];

  return (
    <div className="sc-card">
      {/* Left: plant */}
      <div className="sc-plant-col">
        <PlantVisual score={rawScore} />
        <div className="sc-badge">
          <span className="sc-badge-dot" />
          {name}
          <span className="sc-badge-count">{level + 1}/3</span>
        </div>
      </div>

      {/* Right: data */}
      <div className="sc-data-col">
        <div className="sc-title-group">
          <span className="sc-title">Score de Sustentabilidade</span>
          <span className="sc-subtitle">{subtitle}</span>
        </div>

        <div className="sc-score-big">
          <span className="sc-score-num">{animScore.toFixed(1)}</span>
          <span className="sc-score-denom">/ 100</span>
        </div>

        <div className="sc-stats">
          <div className="sc-stat">
            <span className="sc-stat-val">{animCo2.toFixed(2)} kg</span>
            <span className="sc-stat-lbl">CO₂ economizado</span>
          </div>
          <div className="sc-stat">
            <span className="sc-stat-val">{score.totalTransactions}</span>
            <span className="sc-stat-lbl">transações</span>
          </div>
          <div className="sc-stat">
            <span className="sc-stat-val">{animPct.toFixed(1)}%</span>
            <span className="sc-stat-lbl">digitais</span>
          </div>
        </div>

        {/* Unknown warning */}
        {unknownCount > 0 && (
          <div className="sc-unknown-warning" role="alert">
            <span className="sc-unknown-icon" aria-hidden="true">⚠️</span>
            <span>
              <strong>{unknownCount} {unknownCount === 1 ? 'transação' : 'transações'} com tipo não identificado</strong>
              {' '}foram contabilizadas como cartão físico e impactam negativamente o score.
            </span>
          </div>
        )}

        {/* Progress bar */}
        <div className="sc-progress-wrap">
          <div className="sc-progress-track">
            <div className="sc-progress-fill" style={{ width: `${progressBar * 100}%` }} />
            {TICKS.map((t) => (
              <div
                key={t}
                className={`sc-tick ${rawScore >= t ? 'sc-tick--active' : ''}`}
                style={{ left: `${t}%` }}
              />
            ))}
          </div>
          <div className="sc-progress-labels">
            {LEVELS.map((l, i) => (
              <span key={i} className={`sc-lvl-label ${i === level ? 'sc-lvl-label--active' : ''}`}>
                {l.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
