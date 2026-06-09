import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchScore } from '../../services/api';
import { LEVELS, getLevel } from '../../lib/sustainability';
import edenredLogo from '../../assets/Edenred_Logo.svg';
import notificacaoIcon from '../../assets/notificacao.svg';
import perfilIcon from '../../assets/Perfil.svg';
import folhaIcon from '../../assets/FolhaIcon.svg';
import homeIcon from '../../assets/HomeIcon.svg';
import simuladorIcon from '../../assets/SimuladorIcon.svg';
import cenariosIcon from '../../assets/CenariosIcon.svg';
import relatorioIcon from '../../assets/RelatorioIcon.svg';

import configuracoesIcon from '../../assets/ConfihuraçõesIcon.svg';
import '../Dashboard/Dashboard.css';

const NAV_ITEMS = [
  { label: 'Dashboard',     to: '/dashboard', icon: homeIcon },
  { label: 'Simulador',     to: '/simulador', icon: simuladorIcon },
  { label: 'Cenários',      to: '/cenarios',  icon: cenariosIcon },
  { label: 'Relatórios',    to: '/relatorios', icon: relatorioIcon },
  { label: 'Configurações', to: null,         icon: configuracoesIcon },
];

const CRUMBS = {
  '/dashboard':  'Dashboard',
  '/simulador':  'Simulador',
  '/cenarios':   'Cenários',
  '/relatorios': 'Relatórios',
};

const PERIODS = [
  { value: 'weekly',  label: 'Semana' },
  { value: 'monthly', label: 'Mês'    },
  { value: 'yearly',  label: 'Ano'    },
];

function yearRange() {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  const start = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  return { start, end };
}

export default function Layout() {
  const { empresa, logout } = useAuth();
  const companyId = empresa?.id ?? '1';
  const location = useLocation();
  const showPeriodToggle = location.pathname === '/dashboard' || location.pathname === '/relatorios';

  const [score, setScore]               = useState(null);
  const [period, setPeriod]             = useState('monthly');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef                     = useRef(null);

  // Score anual para o badge de nível da sidebar.
  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    const { start, end } = yearRange();
    fetchScore(companyId, start, end, 'yearly')
      .then(s => { if (!cancelled) setScore(s); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [companyId]);

  // Fecha o dropdown do perfil ao clicar fora ou apertar Esc.
  useEffect(() => {
    if (!userMenuOpen) return;
    function onPointer(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    }
    function onKey(e) { if (e.key === 'Escape') setUserMenuOpen(false); }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [userMenuOpen]);

  const rawScore = Number((score?.score ?? 0).toFixed(2));
  const lvlData  = LEVELS[getLevel(rawScore)];
  const crumb    = CRUMBS[location.pathname] ?? '';

  return (
    <div className="fg-layout">

      {/* SIDEBAR */}
      <aside className="fg-sidebar">
        <div className="fg-logo">
          <img src={edenredLogo} alt="Edenred" height="40" />
        </div>

        <nav className="fg-nav">
          {NAV_ITEMS.map(item => item.to ? (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) => `fg-nav-link${isActive ? ' fg-nav-link--active' : ''}`}
            >
              <span className="fg-nav-icon"><img src={item.icon} alt="" width="18" height="18" /></span>
              <span className="fg-nav-label">{item.label}</span>
            </NavLink>
          ) : (
            <span key={item.label} className="fg-nav-link fg-nav-link--disabled" aria-disabled="true" title="Em breve">
              <span className="fg-nav-icon"><img src={item.icon} alt="" width="18" height="18" /></span>
              <span className="fg-nav-label">{item.label}</span>
            </span>
          ))}
        </nav>

        <div className="fg-sidebar-level-card">
          <div className="fg-sidebar-level-title">
            <img src={folhaIcon} alt="" width="16" height="16" />
            <span className="fg-sidebar-level-title-text">Nível de Sustentabilidade</span>
          </div>
          <div className="fg-sidebar-level-badge">
            <span className="fg-sidebar-level-badge-text">{lvlData.name}</span>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="fg-main">

        {/* TOPBAR */}
        <header className="fg-topbar">
          <div className="fg-topbar-left">
            <span className="fg-topbar-title">Painel de Sustentabilidade</span>
            <span className="fg-topbar-crumb">{crumb}</span>
          </div>
          <div className="fg-topbar-right">
            {/* Seletor de período — Dashboard e Relatórios */}
            {showPeriodToggle && (
              <div className="fg-tabs" role="group" aria-label="Período">
                {PERIODS.map(p => (
                  <button
                    key={p.value}
                    className={`fg-tab${period === p.value ? ' fg-tab--active' : ''}`}
                    onClick={() => setPeriod(p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            <button className="fg-bell" aria-label="Notificações">
              <img src={notificacaoIcon} width="36" height="36" alt="Notificações" />
            </button>

            <div className="fg-user-menu" ref={userMenuRef}>
              <button
                type="button"
                className="fg-topbar-user"
                onClick={() => setUserMenuOpen(o => !o)}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                <div className="fg-topbar-user-info">
                  <span className="fg-user-name">{empresa?.nome ?? 'Empresa'}</span>
                  <span className="fg-user-role">{empresa?.email ?? 'Gestor'}</span>
                </div>
                <div className="fg-avatar">
                  <img src={perfilIcon} alt="" width="18" height="18" />
                </div>
                <svg className={`fg-user-caret${userMenuOpen ? ' fg-user-caret--open' : ''}`} width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {userMenuOpen && (
                <div className="fg-user-dropdown" role="menu">
                  <div className="fg-user-dropdown-head">
                    <span className="fg-user-dropdown-name">{empresa?.nome ?? 'Empresa'}</span>
                    <span className="fg-user-dropdown-email">{empresa?.email ?? ''}</span>
                  </div>
                  <button
                    type="button"
                    className="fg-user-dropdown-item"
                    role="menuitem"
                    onClick={() => { setUserMenuOpen(false); logout(); }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <path d="m16 17 5-5-5-5" />
                      <path d="M21 12H9" />
                    </svg>
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* CONTENT — cada página entra aqui; período compartilhado via context */}
        <main className="fg-content">
          <Outlet context={{ period, setPeriod }} />
        </main>
      </div>
    </div>
  );
}
