// Baca & tulis Excel. Pustaka SheetJS dimuat hanya saat dibutuhkan (tidak memperlambat halaman lain).
// Berkas .csv dibaca tanpa pustaka. Bila pustaka gagal dimuat, ekspor jatuh ke CSV.
import { unduhCSV } from './util.js';

let muat;
export function siapkanXlsx() {
  muat ||= new Promise((ok, no) => {
    if (window.XLSX) return ok(window.XLSX);
    const s = Object.assign(document.createElement('script'), { src: 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js', async: true });
    s.onload = () => ok(window.XLSX);
    s.onerror = () => { muat = null; no(new Error('Pustaka Excel gagal dimuat. Periksa koneksi internet, atau simpan berkas sebagai CSV.')); };
    document.head.appendChild(s);
  });
  return muat;
}

const pad = (n) => String(n).padStart(2, '0');
function sel(v) {
  if (v instanceof Date) return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  if (typeof v === 'number') return Number.isInteger(v) ? v.toLocaleString('fullwide', { useGrouping: false }) : String(v);
  return String(v ?? '').trim();
}

function bacaCSV(teks) {
  const pisah = (teks.split('\n')[0].match(/;/g) || []).length >= (teks.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  const baris = []; let r = [], f = '', kutip = false;
  for (let i = 0; i < teks.length; i++) {
    const c = teks[i];
    if (kutip) { if (c === '"' && teks[i + 1] === '"') { f += '"'; i++; } else if (c === '"') kutip = false; else f += c; continue; }
    if (c === '"') kutip = true; else if (c === pisah) { r.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && teks[i + 1] === '\n') i++; r.push(f); baris.push(r); r = []; f = ''; }
    else f += c;
  }
  if (f || r.length) { r.push(f); baris.push(r); }
  return baris.map((x) => x.map((v) => v.trim())).filter((x) => x.join('') !== '');
}

/** File → { sheets: [{ nama, baris: string[][] }] } */
export async function bacaBerkasTabel(file) {
  if (/\.csv$/i.test(file.name)) return { sheets: [{ nama: file.name.replace(/\.csv$/i, ''), baris: bacaCSV((await file.text()).replace(/^﻿/, '')) }] };
  const X = await siapkanXlsx();
  const wb = X.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  return {
    sheets: wb.SheetNames.map((nama) => ({
      nama, baris: X.utils.sheet_to_json(wb.Sheets[nama], { header: 1, raw: true, defval: '' }).map((r) => r.map(sel)).filter((r) => r.join('') !== ''),
    })),
  };
}

/** Cari baris judul (memuat NIK / NAMA) di 10 baris teratas. */
export function cariBarisJudul(baris) {
  const i = baris.slice(0, 10).findIndex((r) => r.some((v) => /^(NIK|NAMA)\b/i.test(String(v).trim())));
  return i < 0 ? 0 : i;
}

/** lembar: [{ nama, baris: object[] }] atau [{ nama, kolom: string[], data: any[][] }] */
export async function unduhExcel(namaBerkas, lembar) {
  try {
    const X = await siapkanXlsx();
    const wb = X.utils.book_new();
    for (const l of lembar) {
      const ws = l.data ? X.utils.aoa_to_sheet([l.kolom, ...l.data]) : X.utils.json_to_sheet(l.baris);
      const kol = l.kolom || Object.keys(l.baris?.[0] || {});
      ws['!cols'] = kol.map((k) => ({ wch: Math.min(40, Math.max(10, String(k).length + 2)) }));
      X.utils.book_append_sheet(wb, ws, String(l.nama).slice(0, 31));
    }
    X.writeFile(wb, namaBerkas.endsWith('.xlsx') ? namaBerkas : namaBerkas + '.xlsx');
    return 'xlsx';
  } catch {
    const l = lembar[0];
    const kol = l.kolom || Object.keys(l.baris?.[0] || {});
    const data = l.data || (l.baris || []).map((o) => kol.map((k) => o[k]));
    unduhCSV(namaBerkas.replace(/\.xlsx$/, '') + '.csv', [kol, ...data]);
    return 'csv';
  }
}
