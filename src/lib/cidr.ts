// Pure IPv4 CIDR / subnet calculation utilities — no React, no side effects.

export interface NetworkInfo {
  inputIp: string;
  prefix: number;
  networkAddress: string;
  broadcastAddress: string;
  firstHost: string;
  lastHost: string;
  subnetMask: string;
  wildcardMask: string;
  totalHosts: number;
  usableHosts: number;
  awsUsableHosts: number;
  azureUsableHosts: number;
  inputIpBin: string;
  networkAddressBin: string;
  subnetMaskBin: string;
  wildcardMaskBin: string;
  ipClass: string;
  ipType: string;
  cidr: string;
  networkAddressHex: string;
  broadcastAddressHex: string;
  inputIpHex: string;
}

export interface SubnetEntry {
  index: number;
  cidr: string;
  networkAddress: string;
  broadcastAddress: string;
  firstHost: string;
  lastHost: string;
  usableHosts: number;
  awsUsableHosts: number;
}

export interface SplitOption {
  count: number;
  newPrefix: number;
  label: string;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function ipToNum(ip: string): number {
  const p = ip.split('.').map(Number);
  return ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0;
}

function numToIp(num: number): string {
  return [
    (num >>> 24) & 0xff,
    (num >>> 16) & 0xff,
    (num >>> 8) & 0xff,
    num & 0xff,
  ].join('.');
}

/** Returns binary string formatted as four dot-separated octets, e.g.
 *  "11000000.10101000.00000001.00110010" */
function numToBinOctets(num: number): string {
  const b = (num >>> 0).toString(2).padStart(32, '0');
  return `${b.slice(0, 8)}.${b.slice(8, 16)}.${b.slice(16, 24)}.${b.slice(24)}`;
}

function numToHex(num: number): string {
  return '0x' + (num >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

function ipClass(firstOctet: number): string {
  if (firstOctet === 0 || firstOctet === 127) return '—';
  if (firstOctet < 128) return 'A';
  if (firstOctet < 192) return 'B';
  if (firstOctet < 224) return 'C';
  if (firstOctet < 240) return 'D (Multicast)';
  return 'E (Reserved)';
}

function ipType(num: number): string {
  // Use >>> to ensure unsigned comparisons throughout
  const b1 = num >>> 24;      // first octet
  const b12 = num >>> 16;     // first two octets
  const top12 = num >>> 20;   // top 12 bits  → /12 checks
  const top10 = num >>> 22;   // top 10 bits  → /10 checks
  const top4 = num >>> 28;    // top 4 bits   → /4 checks

  if (b1 === 10) return 'Private (RFC 1918)';           // 10.0.0.0/8
  if (top12 === 0xac1) return 'Private (RFC 1918)';     // 172.16.0.0/12
  if (b12 === 0xc0a8) return 'Private (RFC 1918)';      // 192.168.0.0/16
  if (b1 === 127) return 'Loopback';                    // 127.0.0.0/8
  if (b12 === 0xa9fe) return 'Link-Local (APIPA)';      // 169.254.0.0/16
  if (top10 === 0x191) return 'Shared (RFC 6598)';      // 100.64.0.0/10
  if (top4 === 0xe) return 'Multicast (RFC 5771)';      // 224.0.0.0/4
  if (top4 === 0xf) return 'Reserved (RFC 1112)';       // 240.0.0.0/4
  if (b1 === 0) return 'This Network (RFC 1122)';       // 0.0.0.0/8
  return 'Public';
}

// ── Public API ────────────────────────────────────────────────────────────────

export function isValidIp(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  return parts.every(p => /^\d+$/.test(p) && +p >= 0 && +p <= 255);
}

export function calculateNetwork(ip: string, prefix: number): NetworkInfo {
  const ipNum = ipToNum(ip);
  // Build mask: prefix=0 → 0x00000000, prefix=32 → 0xFFFFFFFF
  const maskNum = prefix === 0 ? 0 : ((-1) << (32 - prefix)) >>> 0;
  const networkNum = (ipNum & maskNum) >>> 0;
  const broadcastNum =
    prefix === 32 ? networkNum : ((networkNum | ~maskNum) >>> 0);
  const wildcardNum = (~maskNum) >>> 0;

  const totalHosts =
    prefix === 32 ? 1 : prefix === 0 ? 4_294_967_296 : Math.pow(2, 32 - prefix);
  // /31 uses RFC 3021 — both addresses are usable on point-to-point links
  const usableHosts = prefix >= 31 ? totalHosts : Math.max(0, totalHosts - 2);
  // AWS & Azure both reserve 5 addresses per subnet
  const awsUsable = Math.max(0, totalHosts - 5);
  const azureUsable = Math.max(0, totalHosts - 5);

  const firstHostNum =
    prefix >= 31 ? networkNum : (networkNum + 1) >>> 0;
  const lastHostNum =
    prefix >= 31 ? broadcastNum : (broadcastNum - 1) >>> 0;

  return {
    inputIp: ip,
    prefix,
    networkAddress: numToIp(networkNum),
    broadcastAddress: numToIp(broadcastNum),
    firstHost: numToIp(firstHostNum),
    lastHost: numToIp(lastHostNum),
    subnetMask: numToIp(maskNum),
    wildcardMask: numToIp(wildcardNum),
    totalHosts,
    usableHosts,
    awsUsableHosts: awsUsable,
    azureUsableHosts: azureUsable,
    inputIpBin: numToBinOctets(ipNum),
    networkAddressBin: numToBinOctets(networkNum),
    subnetMaskBin: numToBinOctets(maskNum),
    wildcardMaskBin: numToBinOctets(wildcardNum),
    ipClass: ipClass(ip.split('.').map(Number)[0]),
    ipType: ipType(ipNum),
    cidr: `${numToIp(networkNum)}/${prefix}`,
    networkAddressHex: numToHex(networkNum),
    broadcastAddressHex: numToHex(broadcastNum),
    inputIpHex: numToHex(ipNum),
  };
}

/** Returns the list of valid ways to split this network into equal subnets
 *  (up to 8 extra bits, capped at /32). */
export function getSplitOptions(prefix: number): SplitOption[] {
  const options: SplitOption[] = [];
  for (let bits = 1; bits <= 8; bits++) {
    const newPrefix = prefix + bits;
    if (newPrefix > 32) break;
    const count = Math.pow(2, bits);
    const hostsEach =
      newPrefix === 32 ? 1 : Math.pow(2, 32 - newPrefix);
    const usableEach =
      newPrefix >= 31 ? hostsEach : Math.max(0, hostsEach - 2);
    const cloudEach = Math.max(0, hostsEach - 5);
    options.push({
      count,
      newPrefix,
      label: `${count} × /${newPrefix}  (${hostsEach.toLocaleString()} IPs · ${usableEach.toLocaleString()} usable · ${cloudEach.toLocaleString()} cloud-usable each)`,
    });
  }
  return options;
}

/** Splits the given network into subnets of size /newPrefix.
 *  Returns up to 256 entries (safety cap). */
export function splitSubnets(
  network: NetworkInfo,
  newPrefix: number,
): SubnetEntry[] {
  if (newPrefix <= network.prefix || newPrefix > 32) return [];
  const count = Math.pow(2, newPrefix - network.prefix);
  if (count > 256) return [];

  const networkNum = ipToNum(network.networkAddress);
  const subnetSize =
    newPrefix === 32 ? 1 : Math.pow(2, 32 - newPrefix);

  return Array.from({ length: count }, (_, i) => {
    const snNet = (networkNum + i * subnetSize) >>> 0;
    const snBcast =
      newPrefix === 32 ? snNet : (snNet + subnetSize - 1) >>> 0;
    const usable =
      newPrefix >= 31 ? subnetSize : Math.max(0, subnetSize - 2);
    const awsUsable = Math.max(0, subnetSize - 5);

    return {
      index: i + 1,
      cidr: `${numToIp(snNet)}/${newPrefix}`,
      networkAddress: numToIp(snNet),
      broadcastAddress: numToIp(snBcast),
      firstHost: numToIp(
        newPrefix >= 31 ? snNet : (snNet + 1) >>> 0,
      ),
      lastHost: numToIp(
        newPrefix >= 31 ? snBcast : (snBcast - 1) >>> 0,
      ),
      usableHosts: usable,
      awsUsableHosts: awsUsable,
    };
  });
}

/** Returns the parent networks up to 4 levels up. */
export function getParentNetworks(
  ip: string,
  prefix: number,
): Array<{ prefix: number; cidr: string }> {
  const results: Array<{ prefix: number; cidr: string }> = [];
  for (let p = prefix - 1; p >= 0 && p >= prefix - 4; p--) {
    results.push({ prefix: p, cidr: calculateNetwork(ip, p).cidr });
  }
  return results;
}
