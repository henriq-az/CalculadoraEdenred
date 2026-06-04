// Níveis de sustentabilidade derivados do score (0–100). Compartilhado entre
// o Layout (badge da sidebar) e a página Dashboard (card de progresso).
export const LEVELS = [
  { min: 0,  max: 33,  name: 'Semente', badge: 'Iniciante'         },
  { min: 34, max: 66,  name: 'Broto',   badge: 'Em progresso'      },
  { min: 67, max: 100, name: 'Árvore',  badge: 'Amigo da natureza' },
];

export function getLevel(s) {
  if (s >= 67) return 2;
  if (s >= 34) return 1;
  return 0;
}
