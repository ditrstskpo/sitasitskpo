// Lapisan jaringan tahan HP (gas-instant-ux-pro Prinsip 0 & 8):
// batas waktu, coba ulang otomatis untuk BACA, telemetri kecepatan, dan penanda offline.

export const Perf = {
  daftar: [],
  catat(nama, ms, server = null) {
    this.daftar.push({ nama, ms: Math.round(ms), server, waktu: Date.now() });
    if (this.daftar.length > 200) this.daftar.shift();
    if (ms > 3000) console.warn(`[SITASI] lambat: ${nama} ${Math.round(ms)} ms${server != null ? ` (server ${server} ms, jaringan ${Math.round(ms - server)} ms)` : ''}`);
  },
  ringkas() {
    const per = {};
    for (const x of this.daftar) (per[x.nama] ||= []).push(x.ms);
    return Object.fromEntries(Object.entries(per).map(([k, v]) => [k, { n: v.length, rata: Math.round(v.reduce((a, b) => a + b, 0) / v.length), maks: Math.max(...v) }]));
  },
};
if (typeof window !== 'undefined') window.SITASI_PERF = Perf;

const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));
const bolehUlang = (st) => [408, 425, 429, 500, 502, 503, 504].includes(st);

/**
 * fetch dengan batas waktu dan coba ulang. BACA (GET/HEAD) dicoba ulang hingga 2× bila jaringan putus
 * atau server sibuk. TULIS tidak dicoba ulang otomatis di sini (pakai reqId di jalur Apps Script).
 */
export async function fetchTahan(input, init = {}) {
  const metode = String(init.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const baca = metode === 'GET' || metode === 'HEAD';
  const batas = init.batasWaktu || (baca ? 25_000 : 60_000);
  const url = typeof input === 'string' ? input : input.url;
  const nama = (url.match(/\/(rest|auth|realtime)\/v1\/([^?]*)/)?.slice(1).join(':') || url).slice(0, 60);
  for (let coba = 0; ; coba++) {
    const ac = new AbortController();
    const asal = init.signal;
    if (asal) asal.addEventListener('abort', () => ac.abort(), { once: true });
    const t = setTimeout(() => ac.abort(new DOMException('Waktu habis', 'TimeoutError')), batas);
    const t0 = performance.now();
    try {
      const res = await fetch(input, { ...init, signal: ac.signal });
      clearTimeout(t);
      Perf.catat(nama, performance.now() - t0);
      if (baca && bolehUlang(res.status) && coba < 2) { await tunggu(400 * 3 ** coba); continue; }
      return res;
    } catch (e) {
      clearTimeout(t);
      if (asal?.aborted) throw e;
      if (baca && coba < 2) { await tunggu(400 * 3 ** coba); continue; }
      if (e?.name === 'AbortError' || e?.name === 'TimeoutError') throw new Error('Server terlalu lama merespons. Periksa koneksi, lalu coba lagi.');
      throw e;
    }
  }
}

/** Penanda offline / online di seluruh aplikasi. */
export function pantauJaringan(onBerubah) {
  const atur = () => {
    const off = !navigator.onLine;
    document.documentElement.classList.toggle('offline', off);
    onBerubah?.(!off);
  };
  addEventListener('online', atur);
  addEventListener('offline', atur);
  if (!navigator.onLine) atur();
}

/** Tambah preconnect ke domain yang dipakai (mempercepat permintaan pertama). */
export function preconnect(urls) {
  for (const u of urls.filter(Boolean)) {
    try {
      const o = new URL(u).origin;
      if (document.head.querySelector(`link[rel=preconnect][href="${o}"]`)) continue;
      document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'preconnect', href: o, crossOrigin: '' }));
    } catch {}
  }
}
