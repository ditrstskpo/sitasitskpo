// Klien Apps Script (gas-pro-api + gas-instant-ux-pro): POST text/plain (tanpa preflight CORS),
// redirect: follow, batas waktu, coba ulang dengan reqId yang SAMA (tidak membuat data ganda).
import { CONFIG } from '../config.js';
import { api, modePratinjau } from './api.js';
import { Perf } from './jaringan.js';

export const gasAktif = () => modePratinjau || !!CONFIG.GAS_URL;
const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));
const idBaru = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

export async function gas(action, data = {}, { tulis = false, reqId = idBaru() } = {}) {
  if (modePratinjau) return api.gasTiruan(action, data);
  if (!CONFIG.GAS_URL) throw new Error('Alamat Apps Script belum diisi (GAS_URL di js/config.js). Fitur berkas Drive dan notifikasi WA/email belum aktif.');
  const token = await api.tokenAkses();
  const body = JSON.stringify({ action, token, reqId, data });
  let akhir;
  for (let coba = 0; coba < 3; coba++) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), tulis ? 90_000 : 25_000);
    const t0 = performance.now();
    try {
      const res = await fetch(CONFIG.GAS_URL, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body, signal: ac.signal });
      clearTimeout(t);
      const teks = await res.text();
      let j;
      try { j = JSON.parse(teks); } catch { throw Object.assign(new Error(`Apps Script membalas HTTP ${res.status} (bukan JSON). Periksa deployment Web App.`), { ulang: res.status >= 500 }); }
      Perf.catat('gas:' + action, performance.now() - t0, j.ms ?? null);
      if (!j.success) throw Object.assign(new Error(j.message || 'Permintaan ditolak.'), { code: j.code });
      return j.data;
    } catch (e) {
      clearTimeout(t);
      akhir = e;
      const jaringan = e.name === 'AbortError' || e instanceof TypeError || e.ulang;
      if (!jaringan || coba === 2) break;
      await tunggu(800 * 2 ** coba);
    }
  }
  if (akhir?.name === 'AbortError') throw new Error('Apps Script terlalu lama merespons. Coba lagi beberapa saat.');
  if (akhir instanceof TypeError) throw new Error('Koneksi ke Apps Script terputus. Periksa internet Anda.');
  throw akhir;
}

/** Baca File → base64 (tanpa awalan data:) */
export function keBase64(file) {
  return new Promise((ok, no) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(',')[1] || '');
    r.onerror = () => no(new Error('Berkas tidak dapat dibaca.'));
    r.readAsDataURL(file);
  });
}

export function unduhBase64(nama, mime, b64) {
  const bin = atob(b64), arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([arr], { type: mime || 'application/octet-stream' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nama });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
