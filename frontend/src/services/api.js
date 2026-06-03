import { getToken } from './auth';

const BASE = '/api/transactions';

// Anexa o token JWT (quando houver). Hoje o token é mock; quando o backend
// Spring Security entrar, este mesmo header já valida a requisição.
function authHeaders(extra = {}) {
  const token = getToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
}

// Formata uma Date como YYYY-MM-DD no fuso LOCAL.
// (toISOString() converte para UTC e desloca o dia em fusos UTC+.)
function toLocalISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function fetchHistory(companyId, startDate, endDate) {
  const params = new URLSearchParams({ companyId, startDate, endDate });
  const res = await fetch(`${BASE}/history?${params}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Erro ao buscar histórico: ${res.status}`);
  return res.json();
}

export async function fetchHistoryForMonth(companyId, year, month) {
  const today = new Date();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const start = new Date(year, month, 1);
  const end   = isCurrentMonth ? today : new Date(year, month + 1, 0);
  const params = new URLSearchParams({
    companyId,
    startDate: toLocalISODate(start),
    endDate:   toLocalISODate(end),
  });
  const res = await fetch(`${BASE}/history?${params}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Erro ao buscar histórico: ${res.status}`);
  return res.json();
}

export async function fetchHistoryForWeek(companyId) {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 6); // 7 dias incluindo hoje
  const params = new URLSearchParams({
    companyId,
    startDate: toLocalISODate(start),
    endDate:   toLocalISODate(today),
  });
  const res = await fetch(`${BASE}/history?${params}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Erro ao buscar histórico: ${res.status}`);
  return res.json();
}

export async function fetchHistoryForYear(companyId, year) {
  const today = new Date();
  const isCurrentYear = year === today.getFullYear();
  const start = new Date(year, 0, 1);
  const end   = isCurrentYear ? today : new Date(year, 11, 31);
  const params = new URLSearchParams({
    companyId,
    startDate: toLocalISODate(start),
    endDate:   toLocalISODate(end),
  });
  const res = await fetch(`${BASE}/history?${params}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Erro ao buscar histórico: ${res.status}`);
  return res.json();
}


export async function fetchScore(companyId, startDate, endDate) {
  const params = new URLSearchParams({ companyId, startDate, endDate });
  const res = await fetch(`${BASE}/score?${params}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Erro ao buscar score: ${res.status}`);
  return res.json();
}

export async function fetchImpact(companyId, period) {
  const params = new URLSearchParams({ companyId, period });
  const res = await fetch(`${BASE}/impact?${params}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Erro ao buscar impacto: ${res.status}`);
  return res.json();
}

export async function fetchScenario(id) {
  const res = await fetch(`/cenarios/${id}`, { headers: authHeaders() });
  if (!res.ok) {
    let message = `Erro ao buscar cenário: ${res.status}`;
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch {
      // keep fallback message
    }
    throw new Error(message);
  }
  return res.json();
}

export async function exportImpactReport(payload) {
  const res = await fetch('/calculos/exportar', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let message = 'Nao foi possivel gerar o relatorio. Tente novamente.';
    try {
      const data = await res.json();
      if (data && data.message) message = data.message;
    } catch {
      // keep fallback message
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const contentDisposition = res.headers.get('content-disposition') || '';
  const match = contentDisposition.match(/filename="(.+?)"/i);
  const filename = match ? match[1] : 'relatorio-impacto.pdf';
  return { blob, filename };
}
