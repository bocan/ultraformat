import { useState, useEffect } from 'react';
import { Copy, Check, ChevronDown } from 'lucide-react';
import {
  isValidIp,
  calculateNetwork,
  getSplitOptions,
  splitSubnets,
  getParentNetworks,
  type NetworkInfo,
  type SubnetEntry,
} from '../lib/cidr';
import './NetworkCalc.css';

// ── Binary visualization helpers ──────────────────────────────────────────────

interface BinRowProps {
  label: string;
  value: string;
  prefix: number;
  copyKey: string;
  onCopy: (key: string, value: string) => void;
  copied: string | null;
}

function BinRow({ label, value, prefix, copyKey, onCopy, copied }: BinRowProps) {
  let bitIndex = 0;
  const chars = value.split('').map((ch, i) => {
    if (ch === '.') {
      return (
        <span key={i} className="nc-bin__dot">
          .
        </span>
      );
    }
    const isNet = bitIndex++ < prefix;
    return (
      <span key={i} className={`nc-bin__bit nc-bin__bit--${isNet ? 'net' : 'host'}`}>
        {ch}
      </span>
    );
  });

  return (
    <div className="nc-bin__row">
      <span className="nc-bin__label">{label}</span>
      <code className="nc-bin__value">{chars}</code>
      <button
        className="nc-icon-btn"
        onClick={() => onCopy(copyKey, value.replace(/\./g, ''))}
        aria-label={`Copy ${label} binary`}
      >
        {copied === copyKey ? <Check size={13} /> : <Copy size={13} />}
      </button>
    </div>
  );
}

// ── Detail row ────────────────────────────────────────────────────────────────

interface DetailRowProps {
  label: string;
  value: string;
  copyKey: string;
  onCopy: (key: string, value: string) => void;
  copied: string | null;
  highlight?: boolean;
  mono?: boolean;
}

function DetailRow({
  label,
  value,
  copyKey,
  onCopy,
  copied,
  highlight = false,
  mono = true,
}: DetailRowProps) {
  return (
    <div className={`nc-detail__row ${highlight ? 'nc-detail__row--highlight' : ''}`}>
      <span className="nc-detail__label">{label}</span>
      <span className="nc-detail__value">
        <span className={mono ? 'nc-detail__mono' : ''}>{value}</span>
        <button
          className="nc-icon-btn"
          onClick={() => onCopy(copyKey, value)}
          aria-label={`Copy ${label}`}
        >
          {copied === copyKey ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </span>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
}

function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="nc-stat">
      <span className="nc-stat__label">{label}</span>
      <span className="nc-stat__value">{value}</span>
      {sub && <span className="nc-stat__sub">{sub}</span>}
    </div>
  );
}

// ── Subnet table ──────────────────────────────────────────────────────────────

interface SubnetTableProps {
  subnets: SubnetEntry[];
  newPrefix: number;
  onCopy: (key: string, value: string) => void;
  copied: string | null;
}

function SubnetTable({ subnets, newPrefix, onCopy, copied }: SubnetTableProps) {
  if (subnets.length === 0) return null;
  return (
    <div className="nc-subnet-scroll">
      <table className="nc-subnet-table" aria-label="Subnet split results">
        <thead>
          <tr>
            <th>#</th>
            <th>CIDR</th>
            <th>Network</th>
            <th>Broadcast</th>
            <th>First Host</th>
            <th>Last Host</th>
            <th>Usable</th>
            <th>Cloud Usable</th>
          </tr>
        </thead>
        <tbody>
          {subnets.map(s => {
            const cidrKey = `subnet-${s.index}-${newPrefix}`;
            return (
              <tr key={s.index}>
                <td className="nc-subnet-table__num">{s.index}</td>
                <td>
                  <span className="nc-subnet-table__cidr">{s.cidr}</span>
                  <button
                    className="nc-icon-btn nc-icon-btn--sm"
                    onClick={() => onCopy(cidrKey, s.cidr)}
                    aria-label={`Copy CIDR ${s.cidr}`}
                  >
                    {copied === cidrKey ? <Check size={11} /> : <Copy size={11} />}
                  </button>
                </td>
                <td>{s.networkAddress}</td>
                <td>{s.broadcastAddress}</td>
                <td>{s.firstHost}</td>
                <td>{s.lastHost}</td>
                <td>{s.usableHosts.toLocaleString()}</td>
                <td>{s.awsUsableHosts.toLocaleString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function NetworkCalc() {
  const [ip, setIp] = useState('10.0.0.0');
  const [prefix, setPrefix] = useState(16);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [splitNewPrefix, setSplitNewPrefix] = useState<number | null>(null);

  const trimmedIp = ip.trim();
  const result: NetworkInfo | null = isValidIp(trimmedIp)
    ? calculateNetwork(trimmedIp, prefix)
    : null;

  const splitOpts = result ? getSplitOptions(prefix) : [];

  // Default to first split option when prefix changes
  useEffect(() => {
    const opts = getSplitOptions(prefix);
    setSplitNewPrefix(opts.length > 0 ? opts[0].newPrefix : null);
  }, [prefix]);

  const effectiveSplitPrefix =
    splitNewPrefix !== null && splitOpts.some(o => o.newPrefix === splitNewPrefix)
      ? splitNewPrefix
      : (splitOpts[0]?.newPrefix ?? null);

  const subnets: SubnetEntry[] =
    result && effectiveSplitPrefix !== null
      ? splitSubnets(result, effectiveSplitPrefix)
      : [];

  const parents = result ? getParentNetworks(trimmedIp, prefix) : [];

  const copy = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const showError = trimmedIp.length > 0 && !result;

  // ── AWS reserved IPs label (for current /prefix) ──────────────────────────
  function awsReservedLabel(info: NetworkInfo): string {
    if (info.prefix === 32) return 'Single host — cannot be an AWS subnet';
    if (info.prefix === 31) return 'Point-to-point — cannot be an AWS subnet';
    const parts = info.networkAddress.split('.').map(Number);
    const make = (last: number) =>
      `${parts[0]}.${parts[1]}.${parts[2]}.${last}`;
    return [
      `${make(parts[3])} (network)`,
      `${make(parts[3] + 1)} (VPC router)`,
      `${make(parts[3] + 2)} (DNS)`,
      `${make(parts[3] + 3)} (reserved)`,
      info.broadcastAddress + ' (broadcast)',
    ].join('  ·  ');
  }

  function awsValidity(info: NetworkInfo): { ok: boolean; msg: string } {
    if (info.prefix < 16) return { ok: false, msg: 'Too large: AWS VPC max is /16' };
    if (info.prefix > 28) return { ok: false, msg: 'Too small: AWS subnet min is /28' };
    if (info.prefix > 16)
      return { ok: true, msg: 'Valid AWS VPC subnet (/16–/28)' };
    return { ok: true, msg: 'Valid AWS VPC CIDR (/16 max)' };
  }

  function azureValidity(info: NetworkInfo): { ok: boolean; msg: string } {
    if (info.prefix < 8) return { ok: false, msg: 'Too large: Azure VNet max is /8' };
    if (info.prefix > 29) return { ok: false, msg: 'Too small: Azure subnet min is /29' };
    return { ok: true, msg: 'Valid Azure VNet/subnet (/8–/29)' };
  }

  return (
    <div className="nc-tool" role="region" aria-label="Network Calculator">
      {/* ── Input row ── */}
      <div className="nc-input-row">
        <div className="nc-input-field">
          <label htmlFor="nc-ip" className="nc-input-field__label">
            IP Address
          </label>
          <input
            id="nc-ip"
            className={`nc-input-field__input ${showError ? 'nc-input-field__input--error' : ''}`}
            type="text"
            value={ip}
            onChange={e => setIp(e.target.value)}
            placeholder="e.g. 10.0.1.0"
            spellCheck={false}
            autoComplete="off"
            aria-label="IP address"
            aria-invalid={showError}
          />
        </div>

        <div className="nc-prefix-wrap">
          <label htmlFor="nc-prefix" className="nc-input-field__label">
            Prefix
          </label>
          <div className="nc-prefix-select-wrap">
            <select
              id="nc-prefix"
              className="nc-prefix-select"
              value={prefix}
              onChange={e => setPrefix(Number(e.target.value))}
              aria-label="CIDR prefix length"
            >
              {Array.from({ length: 33 }, (_, i) => (
                <option key={i} value={i}>
                  /{i}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="nc-prefix-chevron" />
          </div>
        </div>

        <button
          className="nc-clear-btn"
          onClick={() => setIp('')}
          aria-label="Clear input"
        >
          Clear
        </button>

        {result && (
          <button
            className="nc-copy-cidr-btn"
            onClick={() => copy('cidr-top', result.cidr)}
            aria-label="Copy CIDR"
          >
            {copiedKey === 'cidr-top' ? (
              <>
                <Check size={14} /> Copied
              </>
            ) : (
              <>
                <Copy size={14} /> {result.cidr}
              </>
            )}
          </button>
        )}
      </div>

      {showError && (
        <p className="nc-error" role="alert">
          Invalid IP address — enter four octets 0–255, e.g. 192.168.1.0
        </p>
      )}

      {result && (
        <>
          {/* ── Stat cards ── */}
          <div className="nc-stats-row">
            <StatCard
              label="Total Addresses"
              value={result.totalHosts.toLocaleString()}
            />
            <StatCard
              label="Usable Hosts"
              value={result.usableHosts.toLocaleString()}
              sub={prefix >= 31 ? (prefix === 31 ? 'RFC 3021 p2p' : 'Host route') : '−2 (net + bcast)'}
            />
            <StatCard
              label="AWS Usable"
              value={result.awsUsableHosts.toLocaleString()}
              sub="−5 reserved"
            />
            <StatCard
              label="Azure Usable"
              value={result.azureUsableHosts.toLocaleString()}
              sub="−5 reserved"
            />
            <StatCard
              label="IP Type"
              value={result.ipType}
            />
            <StatCard
              label="IP Class"
              value={result.ipClass}
            />
          </div>

          {/* ── Main grid: details + binary ── */}
          <div className="nc-main-grid">
            {/* Details table */}
            <section className="nc-details" aria-label="Network details">
              <h2 className="nc-section-title">Network Details</h2>
              <div className="nc-detail__rows">
                <DetailRow
                  label="CIDR"
                  value={result.cidr}
                  copyKey="det-cidr"
                  onCopy={copy}
                  copied={copiedKey}
                  highlight
                />
                <DetailRow
                  label="Network Address"
                  value={result.networkAddress}
                  copyKey="det-net"
                  onCopy={copy}
                  copied={copiedKey}
                />
                <DetailRow
                  label="Broadcast Address"
                  value={result.broadcastAddress}
                  copyKey="det-bcast"
                  onCopy={copy}
                  copied={copiedKey}
                />
                <DetailRow
                  label="Subnet Mask"
                  value={result.subnetMask}
                  copyKey="det-mask"
                  onCopy={copy}
                  copied={copiedKey}
                />
                <DetailRow
                  label="Wildcard Mask"
                  value={result.wildcardMask}
                  copyKey="det-wild"
                  onCopy={copy}
                  copied={copiedKey}
                />
                <DetailRow
                  label="First Usable Host"
                  value={result.firstHost}
                  copyKey="det-first"
                  onCopy={copy}
                  copied={copiedKey}
                  highlight
                />
                <DetailRow
                  label="Last Usable Host"
                  value={result.lastHost}
                  copyKey="det-last"
                  onCopy={copy}
                  copied={copiedKey}
                  highlight
                />
                <DetailRow
                  label="Network (Hex)"
                  value={result.networkAddressHex}
                  copyKey="det-nethex"
                  onCopy={copy}
                  copied={copiedKey}
                />
                <DetailRow
                  label="Broadcast (Hex)"
                  value={result.broadcastAddressHex}
                  copyKey="det-bcasthex"
                  onCopy={copy}
                  copied={copiedKey}
                />
                <DetailRow
                  label="Input IP (Hex)"
                  value={result.inputIpHex}
                  copyKey="det-iphex"
                  onCopy={copy}
                  copied={copiedKey}
                />
                <DetailRow
                  label="IP Type"
                  value={result.ipType}
                  copyKey="det-type"
                  onCopy={copy}
                  copied={copiedKey}
                  mono={false}
                />
                <DetailRow
                  label="IP Class"
                  value={result.ipClass}
                  copyKey="det-class"
                  onCopy={copy}
                  copied={copiedKey}
                  mono={false}
                />
              </div>

              {parents.length > 0 && (
                <div className="nc-parents">
                  <span className="nc-parents__title">Parent Networks</span>
                  <div className="nc-parents__list">
                    {parents.map(p => (
                      <button
                        key={p.prefix}
                        className="nc-parents__chip"
                        onClick={() => copy(`parent-${p.prefix}`, p.cidr)}
                        title={`Copy ${p.cidr}`}
                      >
                        {copiedKey === `parent-${p.prefix}` ? (
                          <Check size={11} />
                        ) : null}
                        /{p.prefix} — {p.cidr}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Binary visualization */}
            <section className="nc-binary" aria-label="Binary breakdown">
              <h2 className="nc-section-title">Binary Breakdown</h2>
              <div className="nc-bin__legend">
                <span className="nc-bin__legend-net">■ Network bits ({prefix})</span>
                <span className="nc-bin__legend-host">■ Host bits ({32 - prefix})</span>
              </div>
              <div className="nc-bin__rows">
                <BinRow
                  label="Input IP"
                  value={result.inputIpBin}
                  prefix={prefix}
                  copyKey="bin-ip"
                  onCopy={copy}
                  copied={copiedKey}
                />
                <BinRow
                  label="Network"
                  value={result.networkAddressBin}
                  prefix={prefix}
                  copyKey="bin-net"
                  onCopy={copy}
                  copied={copiedKey}
                />
                <BinRow
                  label="Subnet Mask"
                  value={result.subnetMaskBin}
                  prefix={prefix}
                  copyKey="bin-mask"
                  onCopy={copy}
                  copied={copiedKey}
                />
                <BinRow
                  label="Wildcard"
                  value={result.wildcardMaskBin}
                  prefix={prefix}
                  copyKey="bin-wild"
                  onCopy={copy}
                  copied={copiedKey}
                />
              </div>

              {/* Bit ruler */}
              <div className="nc-bin__ruler">
                {Array.from({ length: 32 }, (_, i) => (
                  <span
                    key={i}
                    className={`nc-bin__ruler-mark ${i < prefix ? 'nc-bin__ruler-mark--net' : 'nc-bin__ruler-mark--host'}`}
                    style={{ left: `${(i / 32) * 100}%` }}
                    aria-hidden="true"
                  >
                    {i === prefix - 1 || i === 31 || i === 0 ? i + 1 : ''}
                  </span>
                ))}
                <div
                  className="nc-bin__ruler-boundary"
                  style={{ left: `${(prefix / 32) * 100}%` }}
                  aria-label={`Network/host boundary at bit ${prefix}`}
                />
              </div>
            </section>
          </div>

          {/* ── Cloud section ── */}
          <div className="nc-cloud-row">
            {/* AWS */}
            <section className="nc-cloud-card nc-cloud-card--aws" aria-label="AWS details">
              <div className="nc-cloud-card__header">
                <span className="nc-cloud-card__provider">AWS</span>
                {(() => {
                  const v = awsValidity(result);
                  return (
                    <span className={`nc-cloud-card__badge ${v.ok ? 'nc-cloud-card__badge--ok' : 'nc-cloud-card__badge--warn'}`}>
                      {v.ok ? '✓' : '✗'} {v.msg}
                    </span>
                  );
                })()}
              </div>
              <div className="nc-cloud-card__body">
                <div className="nc-cloud-card__stat">
                  <span>Usable IPs</span>
                  <strong>{result.awsUsableHosts.toLocaleString()}</strong>
                </div>
                <div className="nc-cloud-card__reserved">
                  <span className="nc-cloud-card__reserved-title">Reserved per subnet (5 IPs)</span>
                  <ul>
                    <li><code>{result.networkAddress}</code> — Network address</li>
                    <li>
                      <code>
                        {result.networkAddress
                          .split('.')
                          .map((o, i) => (i === 3 ? +o + 1 : o))
                          .join('.')}
                      </code>{' '}
                      — VPC router
                    </li>
                    <li>
                      <code>
                        {result.networkAddress
                          .split('.')
                          .map((o, i) => (i === 3 ? +o + 2 : o))
                          .join('.')}
                      </code>{' '}
                      — DNS server
                    </li>
                    <li>
                      <code>
                        {result.networkAddress
                          .split('.')
                          .map((o, i) => (i === 3 ? +o + 3 : o))
                          .join('.')}
                      </code>{' '}
                      — Future use
                    </li>
                    <li><code>{result.broadcastAddress}</code> — Broadcast</li>
                  </ul>
                  <p className="nc-cloud-card__note">{awsReservedLabel(result)}</p>
                </div>
                <div className="nc-cloud-card__limits">
                  <span>VPC range: /16 – /28 &nbsp;·&nbsp; Min subnet: /28 (11 usable)</span>
                </div>
              </div>
            </section>

            {/* Azure */}
            <section className="nc-cloud-card nc-cloud-card--azure" aria-label="Azure details">
              <div className="nc-cloud-card__header">
                <span className="nc-cloud-card__provider">Azure</span>
                {(() => {
                  const v = azureValidity(result);
                  return (
                    <span className={`nc-cloud-card__badge ${v.ok ? 'nc-cloud-card__badge--ok' : 'nc-cloud-card__badge--warn'}`}>
                      {v.ok ? '✓' : '✗'} {v.msg}
                    </span>
                  );
                })()}
              </div>
              <div className="nc-cloud-card__body">
                <div className="nc-cloud-card__stat">
                  <span>Usable IPs</span>
                  <strong>{result.azureUsableHosts.toLocaleString()}</strong>
                </div>
                <div className="nc-cloud-card__reserved">
                  <span className="nc-cloud-card__reserved-title">Reserved per subnet (5 IPs)</span>
                  <ul>
                    <li><code>{result.networkAddress}</code> — Network address</li>
                    <li>
                      <code>
                        {result.networkAddress
                          .split('.')
                          .map((o, i) => (i === 3 ? +o + 1 : o))
                          .join('.')}
                      </code>{' '}
                      — Default gateway
                    </li>
                    <li>
                      <code>
                        {result.networkAddress
                          .split('.')
                          .map((o, i) => (i === 3 ? +o + 2 : o))
                          .join('.')}
                      </code>
                      {' & '}
                      <code>
                        {result.networkAddress
                          .split('.')
                          .map((o, i) => (i === 3 ? +o + 3 : o))
                          .join('.')}
                      </code>{' '}
                      — Azure DNS
                    </li>
                    <li><code>{result.broadcastAddress}</code> — Broadcast</li>
                  </ul>
                </div>
                <div className="nc-cloud-card__limits">
                  <span>VNet range: /8 – /29 &nbsp;·&nbsp; Min subnet: /29 (3 usable)</span>
                </div>
              </div>
            </section>
          </div>

          {/* ── Subnet splitter ── */}
          {splitOpts.length > 0 && (
            <section className="nc-splitter" aria-label="Subnet splitter">
              <div className="nc-splitter__header">
                <h2 className="nc-section-title">Subnet Splitter</h2>
                <div className="nc-splitter__controls">
                  <label htmlFor="nc-split" className="nc-splitter__label">
                    Split into:
                  </label>
                  <div className="nc-prefix-select-wrap">
                    <select
                      id="nc-split"
                      className="nc-prefix-select"
                      value={effectiveSplitPrefix ?? ''}
                      onChange={e => setSplitNewPrefix(Number(e.target.value))}
                      aria-label="Subnet split option"
                    >
                      {splitOpts.map(o => (
                        <option key={o.newPrefix} value={o.newPrefix}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="nc-prefix-chevron" />
                  </div>
                </div>
              </div>

              {subnets.length > 0 && (
                <SubnetTable
                  subnets={subnets}
                  newPrefix={effectiveSplitPrefix ?? 0}
                  onCopy={copy}
                  copied={copiedKey}
                />
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
