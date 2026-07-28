// A node's real latency depends on the visitor's own location and can only
// be measured by actually connecting to it. Since node endpoints are stored
// as privacy-preserving hashes on-chain (never plaintext IPs), we cannot
// probe them from the browser. This table gives a rough, clearly-labeled
// regional estimate so the marketplace is still useful for comparison,
// without pretending it's a live measurement.
const REGIONAL_ESTIMATE_MS = {
  Germany: 42,
  Netherlands: 38,
  France: 45,
  'United Kingdom': 40,
  Singapore: 95,
  Japan: 110,
  India: 65,
  Brazil: 130,
  Canada: 85,
  'United States': 70,
  Australia: 150,
  'South Africa': 160,
};

export function estimateLatencyMs(country) {
  return REGIONAL_ESTIMATE_MS[country] ?? 100;
}
