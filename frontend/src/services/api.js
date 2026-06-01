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

export async function fetchScenario(id) {
  const res = await fetch(`/cenarios/${id}`);
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
    headers: { 'Content-Type': 'application/json' },
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
