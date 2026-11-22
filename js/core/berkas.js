// Klien berkas (v2.2.0): unggah / unduh / hapus berkas Google Drive, serta hubungkan / putuskan Drive Super Admin,
// lewat Edge Function Supabase "berkas".
// Hak akses diperiksa basis data memakai token login pengguna; kunci Google tidak pernah ada di browser.
// Mode Pratinjau (tanpa Supabase) memakai tiruan di browser.
import { CONFIG } from '../config.js';
import { api, modePratinjau } from './api.js';
import { Perf } from './jaringan.js';
import { keBase64 } from './gas.js';

const alamat = () => String(CONFIG.SUPABASE_URL).replace(/\/+$/, '') + '/functions/v1/berkas';

async function kirim(nama, init, ms) {
  const token = await api.tokenAkses();
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  const t0 = performance.now();
  try {
    const res = await fetch(alamat(), {
      method: 'POST', ...init, signal: ac.signal,
      headers: { ...(init.headers || {}), Authorization: 'Bearer ' + token, apikey: CONFIG.SUPABASE_ANON_KEY },
    });
    Perf.catat('berkas:' + nama, performance.now() - t0, null);
    return res;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Penyimpanan berkas terlalu lama merespons. Periksa sinyal internet lalu coba lagi.');
    throw new Error('Tidak dapat menghubungi layanan berkas. Periksa internet Anda, dan pastikan Edge Function "berkas" sudah di-deploy (Panduan Instalasi 2.2.0, bagian Edge Function).');
  } finally { clearTimeout(t); }
}

async function bacaJson(res) {
  let j = null;
  try { j = await res.json(); } catch { /* bukan JSON */ }
  if (!j) throw new Error(res.status === 404 ? 'Edge Function "berkas" belum di-deploy di Supabase (Panduan Instalasi 2.2.0, bagian Edge Function).' : `Layanan berkas membalas HTTP ${res.status} (bukan JSON).`);
  if (!j.success) throw Object.assign(new Error(j.message || 'Permintaan ditolak.'), { code: j.code });
  return j.data;
}

/** Unggah satu berkas ke Drive. Mengembalikan baris berkas yang tercatat. */
export async function unggahBerkas({ usulanId, tahap, jenis, file }) {
  if (modePratinjau) {
    return api.gasTiruan('unggah', { usulan_id: usulanId, tahap, jenis, nama: file.name, mime: file.type || 'application/octet-stream', base64: await keBase64(file) });
  }
  const f = new FormData();
  f.append('usulan_id', usulanId); f.append('tahap', tahap); f.append('jenis', jenis);
  f.append('nama', file.name); f.append('mime', file.type || 'application/octet-stream');
  f.append('berkas', file, file.name);
  return bacaJson(await kirim('unggah', { body: f }, 120_000));   // tanpa coba-ulang otomatis agar tidak ada berkas ganda
}

/** Ambil berkas: { tautan, nama } untuk berkas tautan, atau { nama, mime, blob } untuk berkas Drive. */
export async function ambilBerkas(id) {
  if (modePratinjau) {
    const r = await api.gasTiruan('unduh', { id });
    if (r.tautan) return r;
    const bin = atob(r.base64), arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return { nama: r.nama, mime: r.mime, blob: new Blob([arr], { type: r.mime || 'application/octet-stream' }) };
  }
  const res = await kirim('unduh', { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aksi: 'unduh', id }) }, 120_000);
  if ((res.headers.get('Content-Type') || '').includes('application/json')) return bacaJson(res);
  if (!res.ok) throw new Error(`Unduh gagal (HTTP ${res.status}).`);
  const nama = decodeURIComponent(res.headers.get('X-Berkas-Nama') || 'berkas');
  return { nama, mime: res.headers.get('X-Berkas-Mime') || '', blob: await res.blob() };
}

export async function hapusBerkas(id) {
  if (modePratinjau) return api.gasTiruan('hapus_berkas', { id });
  return bacaJson(await kirim('hapus', { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aksi: 'hapus', id }) }, 30_000));
}

export function simpanBlob(nama, blob) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: nama });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Super Admin menekan "Hubungkan Drive Saya": peramban dialihkan ke login Google, lalu kembali ke halaman Penyimpanan. */
export async function mulaiHubungDrive(slot) {
  if (modePratinjau) { await api.hubungDriveTiruan(slot); return { selesai: true }; }
  const kembali = location.origin + location.pathname;
  const d = bacaJson(await kirim('mulai_hubung', { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aksi: 'mulai_hubung', slot, kembali }) }, 30_000));
  location.assign(d.url);
  return { selesai: false };
}

export async function putuskanDrive(slot) {
  if (modePratinjau) return api.putusDriveTiruan(slot);
  return bacaJson(await kirim('putuskan', { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aksi: 'putuskan', slot }) }, 30_000));
}
