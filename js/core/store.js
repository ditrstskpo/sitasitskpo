// Status aplikasi, bus peristiwa, dan cache "stale-while-revalidate".
// Halaman yang pernah dibuka tampil seketika dari cache, lalu diperbarui diam-diam.

const pendengar = new Map();
export const bus = {
  on(nama, fn) {
    if (!pendengar.has(nama)) pendengar.set(nama, new Set());
    pendengar.get(nama).add(fn);
    return () => pendengar.get(nama)?.delete(fn);
  },
  emit(nama, data) { pendengar.get(nama)?.forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } }); },
};

export const state = { sesi: null, sesiDicek: 0, notifBelum: 0 };

const cache = new Map();   // kunci → { data, t }
const berjalan = new Map(); // kunci → Promise

/** Data dari cache (boleh basi) tanpa memanggil server. */
export const dariCache = (kunci) => cache.get(kunci)?.data;

/**
 * Ambil data: kembalikan cache bila masih segar (< ttl), selain itu panggil server.
 * Permintaan yang sama secara bersamaan digabung menjadi satu.
 */
export async function ambil(kunci, fetcher, { ttl = 60_000, paksa = false } = {}) {
  const c = cache.get(kunci);
  if (!paksa && c && Date.now() - c.t < ttl) return c.data;
  if (berjalan.has(kunci)) return berjalan.get(kunci);
  const p = (async () => {
    try {
      const data = await fetcher();
      cache.set(kunci, { data, t: Date.now() });
      return data;
    } finally { berjalan.delete(kunci); }
  })();
  berjalan.set(kunci, p);
  return p;
}

/**
 * Stale-while-revalidate (gas-instant-ux-pro Prinsip 2): gambar dari cache seketika, ambil ulang di latar
 * bila sudah basi, dan gambar ulang HANYA bila data berubah (dibandingkan isinya).
 */
export async function swr(kunci, fetcher, gambar, { ttl = 30_000 } = {}) {
  const c = cache.get(kunci);
  if (c) gambar(c.data, true);
  if (c && Date.now() - c.t < ttl) return c.data;
  const data = await ambil(kunci, fetcher, { paksa: true });
  if (!c || JSON.stringify(c.data) !== JSON.stringify(data)) gambar(data, false);
  return data;
}

/** Hapus cache yang kuncinya diawali prefix (setelah data diubah). */
export function hapusCache(prefix = '') {
  for (const k of [...cache.keys()]) if (k.startsWith(prefix)) cache.delete(k);
}

// ---------------------------------------------------------------- sesi tersimpan (tampil instan saat dimuat ulang)
const KUNCI_SESI = 'sitasi:sesi';
export function simpanSesi(sesi) {
  state.sesi = sesi; state.sesiDicek = Date.now();
  state.notifBelum = sesi?.notif_belum_dibaca ?? 0;
  try { sesi ? sessionStorage.setItem(KUNCI_SESI, JSON.stringify(sesi)) : sessionStorage.removeItem(KUNCI_SESI); } catch {}
  bus.emit('sesi', sesi);
}
export function sesiTersimpan() {
  try { return JSON.parse(sessionStorage.getItem(KUNCI_SESI) || 'null'); } catch { return null; }
}
export function bersihkanSemua() {
  state.sesi = null; state.sesiDicek = 0; state.notifBelum = 0;
  cache.clear();
  try { sessionStorage.removeItem(KUNCI_SESI); } catch {}
}
