const BASE = '/api/transactions';

export async function fetchHistory(companyId, startDate, endDate) {
  const params = new URLSearchParams({ companyId, startDate, endDate });
  const res = await fetch(`${BASE}/history?${params}`);
  if (!res.ok) throw new Error(`Erro ao buscar histórico: ${res.status}`);
  return res.json();
}

export async function fetchScore(companyId, startDate, endDate) {
  const params = new URLSearchParams({ companyId, startDate, endDate });
  const res = await fetch(`${BASE}/score?${params}`);
  if (!res.ok) throw new Error(`Erro ao buscar score: ${res.status}`);
  return res.json();
}

export async function fetchImpact(companyId, period) {
  const params = new URLSearchParams({ companyId, period });
  const res = await fetch(`${BASE}/impact?${params}`);
  if (!res.ok) throw new Error(`Erro ao buscar impacto: ${res.status}`);
  return res.json();
}
