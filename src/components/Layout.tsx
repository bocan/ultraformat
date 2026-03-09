import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { tools } from '../tools';
import { useTheme } from '../useTheme';
import { ChevronDown } from 'lucide-react';
import './Layout.css';

const BADGE_MESSAGES = [
  '100% Client-Side',
  '100% Open Source',
  '100% Self-Hostable',
  '100% Private',
  '100% Ad-Free'
];
const BADGE_INTERVAL = 8_000; // 8 seconds per message

export default function Layout() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const { theme, toggle } = useTheme();
  const [badgeIndex, setBadgeIndex] = useState(0);
  const [slideState, setSlideState] = useState<'visible' | 'out' | 'in'>('visible');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeTool = tools.find((t) => location.pathname === t.path) ?? null;

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const id = setInterval(() => {
      if (prefersReducedMotion) {
        // Just swap text, no animation
        setBadgeIndex((i) => (i + 1) % BADGE_MESSAGES.length);
        return;
      }
      // Slide out to left
      setSlideState('out');
      setTimeout(() => {
        // Swap text, start off-screen right
        setBadgeIndex((i) => (i + 1) % BADGE_MESSAGES.length);
        setSlideState('in');
        // Trigger reflow then slide to center
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setSlideState('visible');
          });
        });
      }, 500);
    }, BADGE_INTERVAL);
    return () => clearInterval(id);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close dropdown on navigation
  useEffect(() => {
    setDropdownOpen(false);
  }, [location.pathname]);

  return (
    <div className="layout">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header className="topbar" role="banner">
        <NavLink to="/" className="topbar__brand" aria-label="UltraFormat home">
          <span className="topbar__logo" aria-hidden="true">U</span>
          <span className="topbar__name">UltraFormat</span>
        </NavLink>

        <div className="topbar__dropdown" ref={dropdownRef}>
          <button
            className="topbar__dropdown-trigger"
            onClick={() => setDropdownOpen((o) => !o)}
            aria-expanded={dropdownOpen}
            aria-haspopup="listbox"
            style={activeTool ? {
              '--tab-color': activeTool.color,
              '--tab-dim': activeTool.colorDim,
            } as React.CSSProperties : undefined}
          >
            {activeTool ? (
              <>
                <span className="topbar__dropdown-icon" aria-hidden="true">
                  <activeTool.icon size={14} strokeWidth={2.5} />
                </span>
                <span className="topbar__dropdown-label">{activeTool.name}</span>
              </>
            ) : (
              <span className="topbar__dropdown-label">Tools</span>
            )}
            <ChevronDown size={14} className={`topbar__dropdown-chevron ${dropdownOpen ? 'topbar__dropdown-chevron--open' : ''}`} />
          </button>

          {dropdownOpen && (
            <nav className="topbar__dropdown-menu" role="listbox" aria-label="Developer tools">
              {tools.map((tool) => (
                <NavLink
                  key={tool.id}
                  to={tool.path}
                  role="option"
                  aria-selected={location.pathname === tool.path}
                  className={({ isActive }) =>
                    `topbar__dropdown-item ${isActive ? 'topbar__dropdown-item--active' : ''}`
                  }
                  style={{
                    '--tab-color': tool.color,
                    '--tab-dim': tool.colorDim,
                    '--tab-glow': tool.colorGlow,
                  } as React.CSSProperties}
                >
                  <span className="topbar__dropdown-item-icon" aria-hidden="true">
                    <tool.icon size={14} strokeWidth={2.5} />
                  </span>
                  <span>{tool.name}</span>
                </NavLink>
              ))}
            </nav>
          )}
        </div>

        <div className="topbar__spacer" />

        <div className="topbar__right">
          <div className="topbar__badge" role="status" aria-live="polite" aria-label={BADGE_MESSAGES[badgeIndex]}>
            <span className="topbar__badge-dot" aria-hidden="true" />
            <span className={`topbar__badge-text topbar__badge-text--${slideState}`}>
              {BADGE_MESSAGES[badgeIndex]}
            </span>
          </div>

          <button
            className="theme-toggle"
            onClick={toggle}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <span className="theme-toggle__icon" aria-hidden="true">
            {theme === 'dark' ? '☀' : '☾'}
          </span>
          </button>
        </div>
      </header>

      <main className={`main ${isHome ? 'main--home' : ''}`} id="main-content">
        <Outlet />
      </main>
    </div>
  );
}
