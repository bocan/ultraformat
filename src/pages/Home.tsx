import { Link } from 'react-router-dom';
import { ShieldOff, Server, HardDrive } from 'lucide-react';
import { tools } from '../tools';
import './Home.css';

export default function Home() {
  return (
    <div className="home">
      {/* ── Hero ── */}
      <section className="hero">
        <h1 className="hero__title">
          Dev tools that
          <br />
          <span className="hero__gradient">respect your data.</span>
        </h1>
        <p className="hero__sub">
          Format, compare, encode, beautify & test — all inside your browser.
          Nothing is ever sent to a server.
        </p>
      </section>

      {/* ── Privacy Promise ── */}
      <section className="privacy-banner" aria-labelledby="privacy-heading">
        <h2 id="privacy-heading" className="sr-only">Privacy Guarantees</h2>
        <div className="privacy-banner__grid" role="list">
          <div className="privacy-banner__item" role="listitem">
            <span className="privacy-banner__icon" aria-hidden="true"><ShieldOff size={20} /></span>
            <div>
              <strong>No Cookies</strong>
              <p>Zero tracking cookies. Zero analytics. Zero fingerprinting.</p>
            </div>
          </div>
          <div className="privacy-banner__item" role="listitem">
            <span className="privacy-banner__icon" aria-hidden="true"><Server size={20} /></span>
            <div>
              <strong>No Server Processing</strong>
              <p>Every operation runs in your browser via JavaScript. No API calls, ever.</p>
            </div>
          </div>
          <div className="privacy-banner__item" role="listitem">
            <span className="privacy-banner__icon" aria-hidden="true"><HardDrive size={20} /></span>
            <div>
              <strong>Data Stays Local</strong>
              <p>Your code & data never leave your machine. Inspect the network tab yourself.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tool Cards ── */}
      <section className="tool-grid" aria-label="Available tools">
        {tools.map((tool, i) => (
          <Link
            key={tool.id}
            to={tool.path}
            className="tool-card"
            aria-label={`${tool.name} — ${tool.description}`}
            style={{
              '--card-color': tool.color,
              '--card-dim': tool.colorDim,
              '--card-glow': tool.colorGlow,
              animationDelay: `${i * 80}ms`,
            } as React.CSSProperties}
          >
            <div className="tool-card__icon-wrap" aria-hidden="true">
              <span className="tool-card__icon"><tool.icon size={22} strokeWidth={2} /></span>
            </div>
            <h2 className="tool-card__name">{tool.name}</h2>
            <p className="tool-card__desc">{tool.description}</p>
            <span className="tool-card__arrow" aria-hidden="true">→</span>
          </Link>
        ))}
      </section>

      <footer className="home-footer">
        <p>
          <a href="https://github.com/bocan/ultraformat" target="_blank" rel="noopener noreferrer">Open Source</a> and can be self-hosted. Built because online tools can't always be trusted with your keys.
        </p>
      </footer>
    </div>
  );
}
