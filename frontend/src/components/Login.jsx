import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import edenredLogo from '../assets/Edenred_Logo.svg';
import graficoIcon from '../assets/Grafico.svg';
import calculadoraIcon from '../assets/Calculadora.svg';
import alvoIcon from '../assets/Alvo.svg';
import './Auth.css';

const FEATURES = [
  { icon: graficoIcon,     title: 'Visibilidade Total',       desc: 'Acompanhe suas emissões em tempo real' },
  { icon: calculadoraIcon, title: 'Simulações Inteligentes',  desc: 'Projete cenários de redução' },
  { icon: alvoIcon,        title: 'Metas ESG',                desc: 'Defina e alcance objetivos ambientais' },
];

export default function Login() {
  const { login } = useAuth();

  const [email, setEmail]         = useState('');
  const [senha, setSenha]         = useState('');
  const [manterLogado, setManter] = useState(false);
  const [error, setError]         = useState(null);
  const [loading, setLoading]     = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, senha });
      // O AuthProvider muda isAuthenticated → o App renderiza o Dashboard.
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">

      {/* PAINEL ESQUERDO — marca */}
      <aside className="login-brand">
        <div className="login-brand-content">
          <h1 className="login-brand-headline">
            <span className="login-brand-headline-1">Meça o impacto</span>
            <span className="login-brand-headline-2">Tome decisões melhores.</span>
          </h1>
          <p className="login-brand-sub">
            Gestão inteligente de impacto ambiental para transações corporativas.
          </p>

          <ul className="login-features">
            {FEATURES.map(({ icon, title, desc }) => (
              <li key={title} className="login-feature">
                <span className="login-feature-icon">
                  <img src={icon} alt="" width="22" height="22" />
                </span>
                <div className="login-feature-text">
                  <span className="login-feature-title">{title}</span>
                  <span className="login-feature-desc">{desc}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* PAINEL DIREITO — formulário */}
      <main className="login-panel">
        <form className="login-form" onSubmit={handleSubmit}>
          <img src={edenredLogo} alt="Edenred" className="login-logo" />

          <h2 className="login-title">Bem-vindo de volta</h2>
          <p className="login-sub">entre com suas credenciais corporativas</p>

          {error && <div className="auth-error">{error}</div>}

          <div className="auth-field">
            <label className="auth-label" htmlFor="login-email">E-mail corporativo</label>
            <input
              id="login-email"
              className="auth-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Seu.email@empresa.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="login-senha">Senha</label>
            <input
              id="login-senha"
              className="auth-input"
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="••••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <div className="login-row">
            <label className="login-toggle">
              <input
                type="checkbox"
                checked={manterLogado}
                onChange={e => setManter(e.target.checked)}
              />
              <span className="login-toggle-track"><span className="login-toggle-thumb" /></span>
              <span className="login-toggle-label">Manter logado</span>
            </label>
            <a className="login-forgot" href="#" onClick={e => e.preventDefault()}>
              Esqueci minha senha
            </a>
          </div>

          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>

          <p className="login-hint">
            Demo: <strong>tech@edenred.com</strong> · senha <strong>123456</strong>
          </p>

          <p className="login-copyright">Edenred © 2026 — Plataforma de Sustentabilidade</p>
        </form>
      </main>
    </div>
  );
}
