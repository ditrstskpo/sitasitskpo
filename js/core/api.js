// Pintu tunggal ke data. Memilih adapter Supabase (asli) atau Pratinjau (data contoh)
// berdasarkan js/config.js. Halaman cukup memanggil: await api.namaFungsi(...)
import { CONFIG } from '../config.js';

export const modePratinjau = !CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY;

let siap;
export function siapkanApi() {
  siap ||= (async () => {
    const ad = modePratinjau ? await import('./adapter-pratinjau.js') : await import('./adapter-supabase.js');
    await ad.init(CONFIG);
    return ad;
  })();
  return siap;
}

export const api = new Proxy({}, {
  get: (_, nama) => async (...arg) => {
    const ad = await siapkanApi();
    if (typeof ad[nama] !== 'function') throw new Error(`Fungsi API "${String(nama)}" tidak tersedia.`);
    return ad[nama](...arg);
  },
});
