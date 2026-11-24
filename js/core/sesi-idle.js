// Keluar otomatis bila aplikasi tidak dipakai lebih dari batas waktu (bawaan 4 jam).
// Waktu aktivitas terakhir disimpan di localStorage agar berlaku lintas tab dan tetap
// terhitung saat komputer tidur / tab ditutup. Diperiksa saat tab kembali aktif dan tiap menit.
import { CONFIG } from '../config.js';
import { toast } from './ui.js';
import { keluarAplikasi } from './nav.js';

const KUNCI = 'sitasi:aktivitas_terakhir';
const JAM = Number(CONFIG.IDLE_JAM) > 0 ? Number(CONFIG.IDLE_JAM) : 4;
const BATAS_MS = JAM * 60 * 60 * 1000;
let pemantau = null, jalan = false;

const sekarang = () => Date.now();
function baca() { try { return Number(localStorage.getItem(KUNCI)) || 0; } catch { return 0; } }
function tulis(t) { try { localStorage.setItem(KUNCI, String(t)); } catch {} }

let terakhirTulis = 0;
function catatAktivitas() {
  const t = sekarang();
  if (t - terakhirTulis < 15000) return;          // jangan menulis tiap gerakan mouse
  terakhirTulis = t; tulis(t);
}

async function periksa() {
  if (!jalan) return;
  const t = baca();
  if (t && sekarang() - t > BATAS_MS) {
    jalan = false;
    clearInterval(pemantau); pemantau = null;
    try { localStorage.removeItem(KUNCI); } catch {}
    await keluarAplikasi();
    toast(`Anda keluar otomatis karena tidak ada aktivitas lebih dari ${JAM} jam. Silakan masuk kembali.`, 'info', 'Sesi berakhir');
  }
}

/** Dipanggil setelah sesi pengguna aktif. Aman dipanggil berulang. */
export function mulaiPantauIdle() {
  if (jalan) return;
  const t = baca();
  // Sesi lama yang sudah melewati batas: keluar segera. Selain itu, mulai hitung dari sekarang.
  if (!(t && sekarang() - t > BATAS_MS)) { terakhirTulis = 0; catatAktivitas(); }
  jalan = true;
  ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach((e) =>
    window.addEventListener(e, catatAktivitas, { passive: true, capture: true }));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') periksa(); });
  window.addEventListener('focus', periksa);
  pemantau = setInterval(periksa, 60000);
  periksa();
}

/** Dipanggil saat keluar manual agar pemantau berhenti. */
export function hentikanPantauIdle() {
  jalan = false;
  if (pemantau) clearInterval(pemantau);
  pemantau = null;
  try { localStorage.removeItem(KUNCI); } catch {}
}
