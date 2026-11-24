// Navigasi & keluar aplikasi (dipakai shell dan halaman).
import { api } from './api.js';
import { state, bersihkanSemua } from './store.js';
import { hentikanPantauIdle } from './sesi-idle.js';

/** Pindah ke rute. Bila rute sama, halaman dimuat ulang. */
export function pergi(path) {
  const tujuan = '#' + path;
  if (location.hash === tujuan) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = tujuan;
}

export async function keluarAplikasi() {
  try { await api.keluar(); } catch {}
  state.hentikanRealtime?.();
  state.hentikanRealtime = null;
  hentikanPantauIdle();
  bersihkanSemua();
  pergi('/');
}
