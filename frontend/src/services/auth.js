// ─────────────────────────────────────────────────────────────────────────────
// Serviço de autenticação — MOCK (frontend-only).
//
// O contrato (register/login → { token, empresa }) já é o mesmo que o backend
// Spring Security + JWT vai expor. Quando o backend estiver pronto, basta trocar
// o corpo destas funções por chamadas fetch reais — o resto do app não muda.
//
// Modelo adotado: 1 conta = 1 empresa (email + senha pertencem à própria empresa).
// ⚠️ Aqui as senhas ficam em texto puro só porque é um mock de front. No backend
//    elas serão hasheadas com BCrypt e NUNCA trafegam/voltam pro cliente.
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN_KEY    = 'edenred.token';
const EMPRESA_KEY  = 'edenred.empresa';
const STORE_KEY    = 'edenred.empresas'; // "tabela" de empresas simulada

// Conta única pré-cadastrada (protótipo). Bate com o company_id 1 do data.sql
// do backend, então já mostra dados reais quando o backend está ligado.
const SEED_EMPRESAS = [
  { id: 1, nome: 'Tech Solutions', email: 'tech@edenred.com', senha: '123456' },
];

function loadStore() {
  const raw = localStorage.getItem(STORE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch { /* recria do seed abaixo */ }
  }
  localStorage.setItem(STORE_KEY, JSON.stringify(SEED_EMPRESAS));
  return [...SEED_EMPRESAS];
}

// Simula latência de rede pra UI de loading aparecer.
const delay = (ms = 450) => new Promise(r => setTimeout(r, ms));

// Token fake só pra ter "algo" no header. O backend devolverá um JWT real.
function fakeToken(empresaId) {
  return `mock.${btoa(String(empresaId))}.${Date.now()}`;
}

// Devolve só os campos públicos da empresa (sem a senha) pro app.
function sanitize(empresa) {
  return { id: empresa.id, nome: empresa.nome, email: empresa.email };
}

function persistSession(token, empresa) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EMPRESA_KEY, JSON.stringify(empresa));
}

// ── API pública ────────────────────────────────────────────────────────────
// Sem auto-cadastro: as contas das empresas são provisionadas pela Edenred
// (serviço contratado). O front só faz login.

export async function login({ email, senha }) {
  await delay();
  const emailT = (email ?? '').trim().toLowerCase();

  const empresas = loadStore();
  const found = empresas.find(e => e.email.toLowerCase() === emailT);
  if (!found || found.senha !== senha) {
    throw new Error('Email ou senha inválidos.');
  }

  const empresa = sanitize(found);
  const token   = fakeToken(empresa.id);
  persistSession(token, empresa);
  return { token, empresa };
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMPRESA_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredEmpresa() {
  const raw = localStorage.getItem(EMPRESA_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
