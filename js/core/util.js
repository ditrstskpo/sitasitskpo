// Utilitas umum: templat HTML aman, format tanggal (WIB), angka, dll.

const PETA = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => PETA[c]);

class Mentah { constructor(s) { this.s = s; } toString() { return this.s; } }
/** Tandai string sebagai HTML yang sudah aman (tidak di-escape lagi). */
export const raw = (s) => new Mentah(String(s ?? ''));

function nilai(v) {
  if (v == null || v === false) return '';
  if (v instanceof Mentah) return v.s;
  if (Array.isArray(v)) return v.map(nilai).join('');
  return esc(v);
}
/** Templat HTML: semua nilai otomatis di-escape kecuali dibungkus raw()/html``. */
export function html(str, ...vals) {
  let out = str[0];
  for (let i = 0; i < vals.length; i++) out += nilai(vals[i]) + str[i + 1];
  return new Mentah(out);
}

const ZONA = 'Asia/Jakarta';
const fTgl = new Intl.DateTimeFormat('id-ID', { timeZone: ZONA, day: 'numeric', month: 'short', year: 'numeric' });
const fTglJam = new Intl.DateTimeFormat('id-ID', { timeZone: ZONA, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const fJam = new Intl.DateTimeFormat('id-ID', { timeZone: ZONA, hour: '2-digit', minute: '2-digit' });
const fISO = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' });

export const tanggal = (v) => (v ? fTgl.format(new Date(v)) : '—');
export const tanggalJam = (v) => (v ? fTglJam.format(new Date(v)) + ' WIB' : '—');
export const jam = (v) => (v ? fJam.format(new Date(v)) : '');
/** Tanggal hari ini (WIB) format YYYY-MM-DD, bisa digeser n hari. */
export function hariIni(geser = 0) { return fISO.format(new Date(Date.now() + geser * 864e5)); }

export function relatif(v) {
  if (!v) return 'Belum pernah';
  const d = (Date.now() - new Date(v).getTime()) / 1000;
  if (d < 60) return 'Baru saja';
  if (d < 3600) return `${Math.floor(d / 60)} menit lalu`;
  if (d < 86400) return `${Math.floor(d / 3600)} jam lalu`;
  if (d < 172800) return `Kemarin, ${jam(v)}`;
  if (d < 604800) return `${Math.floor(d / 86400)} hari lalu`;
  return tanggal(v);
}

const fAngka = new Intl.NumberFormat('id-ID');
export const angka = (n) => fAngka.format(Number(n) || 0);

export function inisial(nama = '') {
  const k = String(nama).trim().split(/\s+/).filter((x) => /[A-Za-z]/.test(x[0] || ''));
  return ((k[0]?.[0] || '?') + (k[1]?.[0] || '')).toUpperCase();
}

const PALET = ['#17824A', '#2A4B8D', '#12A5A0', '#7B5EC2', '#E58A2E', '#D9644A', '#C2477F', '#4FA8E0', '#8C6A3E'];
export function warnaDari(teks = '') {
  let h = 0;
  for (const c of String(teks)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALET[h % PALET.length];
}

export function debounce(fn, ms = 300) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

/** Pecah hash "#/pengaturan/pengguna?pokja=x" → { path, query } */
export function bacaHash() {
  const h = location.hash.replace(/^#/, '') || '/';
  const [path, qs = ''] = h.split('?');
  return { path: path.replace(/\/+$/, '') || '/', query: new URLSearchParams(qs) };
}

export function keHash(path, params) {
  const qs = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString() : '';
  return '#' + path + (qs ? '?' + qs : '');
}

/** Bersihkan teks untuk filter PostgREST (hapus karakter khusus). */
export const bersihCari = (s) => String(s || '').replace(/[,()"*%\\:]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);

export const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));

export function emailValid(e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(e || '').trim()); }

/** Unduh teks sebagai berkas (CSV dengan BOM agar terbaca benar di Excel). */
export function unduhCSV(namaBerkas, baris) {
  const sel = (v) => {
    const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const isi = '﻿' + baris.map((r) => r.map(sel).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([isi], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: namaBerkas });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
