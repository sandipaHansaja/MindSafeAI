// Run:  node check-gemini.js      (from the server folder)
// Tells you whether this computer can reach the Gemini API, and which models your key can use.
import 'dotenv/config';
import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

const key = process.env.GEMINI_API_KEY;
if (!key) { console.error('GEMINI_API_KEY is missing from server/.env'); process.exit(1); }
console.log('Contacting generativelanguage.googleapis.com ...');
try {
  const t = Date.now();
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', {
    headers: { 'x-goog-api-key': key }, signal: AbortSignal.timeout(15000),
  });
  console.log(`HTTP ${res.status} in ${Date.now() - t} ms`);
  const data = await res.json();
  if (!res.ok) { console.error(data?.error?.message || data); process.exit(1); }
  const names = data.models.filter((m) => m.supportedGenerationMethods?.includes('generateContent')).map((m) => m.name.replace('models/', ''));
  console.log('Models you can use with generateContent:\n  ' + names.filter((n) => n.includes('flash')).join('\n  '));
  console.log(`\nCurrent GEMINI_MODEL in .env: ${process.env.GEMINI_MODEL || '(not set)'}`);
  console.log(names.includes(process.env.GEMINI_MODEL) ? 'That model exists.' : 'That model is NOT in the list above: pick one from it.');
} catch (e) {
  console.error('FAILED:', e.name, e.cause?.code || e.message);
  console.error('This computer cannot reach Google right now (firewall, VPN/proxy, antivirus or DNS). Try another network or turn off VPN.');
  process.exit(1);
}
