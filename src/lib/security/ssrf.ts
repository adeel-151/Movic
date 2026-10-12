import dns from 'dns/promises';
import net from 'net';

export class SecurityError extends Error {
  code: string;
  constructor(message: string, code: string = 'SSRF_BLOCKED') {
    super(message);
    this.name = 'SecurityError';
    this.code = code;
  }
}

/**
 * Checks if an IPv4 address is in a private, loopback, link-local, or cloud metadata range.
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(p => parseInt(p, 10));
  if (parts.length !== 4 || parts.some(isNaN)) {
    return true; // malformed treated as dangerous
  }

  const [a, b] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  // 10.0.0.0/8 (Private)
  if (a === 10) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 169.254.0.0/16 (Link-local & AWS/Azure/GCP metadata 169.254.169.254)
  if (a === 169 && b === 254) return true;

  // 172.16.0.0/12 (Private)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 (Private)
  if (a === 192 && b === 168) return true;

  // 100.64.0.0/10 (Carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 224.0.0.0/4 (Multicast)
  if (a >= 224 && a <= 239) return true;

  // 240.0.0.0/4 (Reserved)
  if (a >= 240) return true;

  return false;
}

/**
 * Checks if an IPv6 address is in a private/local/documentation range.
 */
function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  // ::1 loopback, :: unspecified
  if (normalized === '::1' || normalized === '::') return true;

  // IPv4-mapped IPv6 (::ffff:x.x.x.x)
  if (normalized.startsWith('::ffff:')) {
    const v4Part = normalized.replace('::ffff:', '');
    if (net.isIPv4(v4Part)) {
      return isPrivateIPv4(v4Part);
    }
    return true;
  }

  // fc00::/7 (Unique local)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

  // fe80::/10 (Link-local)
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return true;

  return false;
}

/**
 * Validates a URL against strict SSRF rules, protocol limits, credentials in URL, and resolved IP ranges.
 */
export async function validateSafeUrl(rawUrl: string): Promise<URL> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new SecurityError('The provided string is not a valid URL.', 'INVALID_URL');
  }

  // Scheme check
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new SecurityError(`Unsupported URL protocol '${parsedUrl.protocol}'. Only HTTP and HTTPS are permitted.`, 'INVALID_URL');
  }

  // Reject embedded credentials
  if (parsedUrl.username || parsedUrl.password) {
    throw new SecurityError('URLs containing embedded credentials (username/password) are forbidden.', 'INVALID_URL');
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // Explicit host check for localhost & common metadata hosts
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === 'metadata.google.internal' ||
    hostname === 'instance-data'
  ) {
    throw new SecurityError(`Access to host '${hostname}' is blocked for SSRF prevention.`, 'SSRF_BLOCKED');
  }

  // Resolve hostname via DNS to prevent DNS rebinding or direct IP targeting of private networks
  try {
    // If hostname is directly an IP literal
    if (net.isIPv4(hostname)) {
      if (isPrivateIPv4(hostname)) {
        throw new SecurityError(`Target IP '${hostname}' is within a private, loopback, or cloud-metadata network range.`, 'SSRF_BLOCKED');
      }
      return parsedUrl;
    }

    if (net.isIPv6(hostname)) {
      if (isPrivateIPv6(hostname)) {
        throw new SecurityError(`Target IP '${hostname}' is within a private or local IPv6 range.`, 'SSRF_BLOCKED');
      }
      return parsedUrl;
    }

    // DNS lookup all addresses
    const lookupResults = await dns.lookup(hostname, { all: true });
    if (!lookupResults || lookupResults.length === 0) {
      throw new SecurityError(`Unable to resolve hostname '${hostname}'.`, 'SOURCE_UNAVAILABLE');
    }

    for (const record of lookupResults) {
      if (record.family === 4 && isPrivateIPv4(record.address)) {
        throw new SecurityError(`Hostname '${hostname}' resolves to private or metadata IP '${record.address}'.`, 'SSRF_BLOCKED');
      }
      if (record.family === 6 && isPrivateIPv6(record.address)) {
        throw new SecurityError(`Hostname '${hostname}' resolves to private IPv6 '${record.address}'.`, 'SSRF_BLOCKED');
      }
    }
  } catch (err: unknown) {
    if (err instanceof SecurityError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Unknown DNS error';
    throw new SecurityError(`Failed to verify host '${hostname}': ${message}`, 'SOURCE_UNAVAILABLE');
  }

  return parsedUrl;
}
