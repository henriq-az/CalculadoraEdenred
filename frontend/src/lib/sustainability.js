// Níveis de sustentabilidade derivados do score (0–100). Compartilhado entre
// o Layout (badge da sidebar) e a página Dashboard (card de progresso).
export const LEVELS = [
  { min: 0,  max: 25,  name: 'Aprendiz verde',       badge: 'Iniciante'          },
  { min: 26, max: 50,  name: 'Amigo da natureza',     badge: 'Em progresso'       },
  { min: 51, max: 75,  name: 'Defensor das florestas',badge: 'Amigo da natureza'  },
  { min: 76, max: 100, name: 'Herói ecológico',        badge: 'Guardião da natureza'},
];

export function getLevel(s) {
  if (s >= 76) return 3;
  if (s >= 51) return 2;
  if (s >= 26) return 1;
  return 0;
}
