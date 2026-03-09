import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { tools } from '../tools';
import { useTheme } from '../useTheme';
import { ChevronDown, Info } from 'lucide-react';
import './Layout.css';

const APP_VERSION = __APP_VERSION__;
const CHANGELOG_URL = `https://github.com/bocan/ultraformat/blob/main/CHANGELOG.md`;

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
  const [aboutOpen, setAboutOpen] = useState(false);
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

          <button
            className="theme-toggle"
            onClick={() => setAboutOpen(true)}
            aria-label="About UltraFormat"
            title="About UltraFormat"
          >
            <Info size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </header>

      {aboutOpen && (
        <div className="about-overlay" role="dialog" aria-modal="true" aria-label="About UltraFormat" onClick={() => setAboutOpen(false)}>
          <div className="about-modal" onClick={(e) => e.stopPropagation()}>
            <button className="about-modal__close" onClick={() => setAboutOpen(false)} aria-label="Close about">&times;</button>
            <div className="about-modal__logo" aria-hidden="true">U</div>
            <h2 className="about-modal__title">UltraFormat</h2>
            <a
              className="about-modal__version"
              href={CHANGELOG_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              v{APP_VERSION}
            </a>
            <p className="about-modal__tagline">A self-hosted, privacy-first developer toolkit that runs entirely in your browser.</p>
            <ul className="about-modal__features">
              <li><span className="about-modal__check" aria-hidden="true">✓</span> 100% client-side — no data ever leaves your browser</li>
              <li><span className="about-modal__check" aria-hidden="true">✓</span> 12 built-in developer tools</li>
              <li><span className="about-modal__check" aria-hidden="true">✓</span> Zero cookies, zero analytics, zero tracking</li>
              <li><span className="about-modal__check" aria-hidden="true">✓</span> Self-hostable — runs on any static host, Docker, or Raspberry Pi</li>
              <li><span className="about-modal__check" aria-hidden="true">✓</span> Dark &amp; light themes with OS preference detection</li>
              <li><span className="about-modal__check" aria-hidden="true">✓</span> No third-party scripts or CDN calls at runtime</li>
              <li><span className="about-modal__check" aria-hidden="true">✓</span> Open source — MIT licensed</li>
            </ul>
            <a
              className="about-modal__github"
              href="https://github.com/bocan/ultraformat"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
            </a>
          </div>
        </div>
      )}

      <main className={`main ${isHome ? 'main--home' : ''}`} id="main-content">
        <Outlet />
      </main>
    </div>
  );
}
