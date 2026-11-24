// Baca & tulis Excel. Pustaka SheetJS dimuat hanya saat dibutuhkan (tidak memperlambat halaman lain).
// Berkas .csv dibaca tanpa pustaka. Bila pustaka gagal dimuat, ekspor jatuh ke CSV.


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

// ---- Pembaca .xlsx mini (tanpa pustaka, memakai DecompressionStream bawaan browser): cadangan bila pustaka Excel gagal dimuat
async function inflasi(u8) { const ds = new DecompressionStream('deflate-raw'); const w = ds.writable.getWriter(); w.write(u8); w.close(); return new Uint8Array(await new Response(ds.readable).arrayBuffer()); }
async function bacaXlsxMini(file) {
  const b = new Uint8Array(await file.arrayBuffer()), dv = new DataView(b.buffer), dec = new TextDecoder();
  let e = b.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('Berkas bukan .xlsx yang valid.');
  const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const ent = {};
  for (let i = 0; i < n; i++) { const nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true);
    ent[dec.decode(b.subarray(p + 46, p + 46 + nl))] = { m: dv.getUint16(p + 10, true), c: dv.getUint32(p + 20, true), o: dv.getUint32(p + 42, true) }; p += 46 + nl + xl + cl; }
  const ambil = async (nama) => { const z = ent[nama]; if (!z) return null; const q = z.o, nl = dv.getUint16(q + 26, true), xl = dv.getUint16(q + 28, true), d = b.subarray(q + 30 + nl + xl, q + 30 + nl + xl + z.c);
    return dec.decode(z.m === 0 ? d : await inflasi(d)); };
  const xml = (t) => new DOMParser().parseFromString(t, 'application/xml');
  const wb = xml(await ambil('xl/workbook.xml')), rel = xml(await ambil('xl/_rels/workbook.xml.rels'));
  const relMap = {}; rel.querySelectorAll('Relationship').forEach((r) => { relMap[r.getAttribute('Id')] = r.getAttribute('Target'); });
  const ss = []; const sst = await ambil('xl/sharedStrings.xml');
  if (sst) xml(sst).querySelectorAll('si').forEach((si) => { ss.push([...si.querySelectorAll('t')].map((t) => t.textContent).join('')); });
  // gaya tanggal
  const tglXf = new Set(); const st = await ambil('xl/styles.xml');
  if (st) { const sx = xml(st), kus = {}; sx.querySelectorAll('numFmts > numFmt').forEach((f) => { kus[f.getAttribute('numFmtId')] = f.getAttribute('formatCode'); });
    [...sx.querySelectorAll('cellXfs > xf')].forEach((xf, i) => { const id = xf.getAttribute('numFmtId'); if ((+id >= 14 && +id <= 22) || (+id >= 45 && +id <= 47) || (kus[id] && /[dmy]/i.test(kus[id].replace(/"[^"]*"|\[[^\]]*\]/g, '')) && !/[hs]/i.test(kus[id].replace(/"[^"]*"/g, '')) )) tglXf.add(i); }); }
  const iso = (v) => { const d = new Date(Math.round((v - 25569) * 86400000)); return d.toISOString().slice(0, 10); };
  const huruf = (r) => { let k = 0; for (const c of r.replace(/\d/g, '')) k = k * 26 + c.charCodeAt(0) - 64; return k - 1; };
  const sheets = [];
  for (const s of wb.querySelectorAll('sheets > sheet')) {
    const tgt = relMap[s.getAttribute('r:id')] || relMap[s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')];
    const sx = xml(await ambil('xl/' + String(tgt).replace(/^\/?(xl\/)?/, ''))); const baris = [];
    sx.querySelectorAll('sheetData > row').forEach((rw) => { const r = []; rw.querySelectorAll('c').forEach((c) => {
      const t = c.getAttribute('t'), v = c.querySelector('v')?.textContent; let val = '';
      if (t === 's') val = ss[+v] ?? ''; else if (t === 'inlineStr') val = [...c.querySelectorAll('t')].map((x) => x.textContent).join(''); else if (v != null) {
        val = t === 'str' || t === 'e' ? v : t === 'b' ? v === '1' : (tglXf.has(+c.getAttribute('s')) ? iso(+v) : +v); }
      r[huruf(c.getAttribute('r'))] = val; });
      for (let i = 0; i < r.length; i++) if (r[i] === undefined) r[i] = '';
      baris.push(r.map(sel)); });
    sheets.push({ nama: s.getAttribute('name'), baris: baris.filter((r) => r.join('') !== '') });
  }
  return { sheets };
}

export async function bacaBerkasTabel(file) {
  if (/\.csv$/i.test(file.name)) return { sheets: [{ nama: file.name.replace(/\.csv$/i, ''), baris: bacaCSV((await file.text()).replace(/^﻿/, '')) }] };
  let X; try { X = await siapkanXlsx(); } catch (e) { if (/\.xlsx$/i.test(file.name)) return bacaXlsxMini(file); throw e; }
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


// ---- Penulis .xlsx mini (tanpa pustaka): dipakai bila pustaka Excel gagal dimuat, supaya unduhan tetap .xlsx
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
const kolHuruf = (i) => { let s = ''; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };
function zipSimpan(files) {
  const enc = new TextEncoder(), bagian = [], pusat = []; let off = 0;
  const u16 = (n) => [n & 255, (n >> 8) & 255], u32 = (n) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
  for (const [nama, teks] of files) {
    const nb = enc.encode(nama), d = enc.encode(teks), c = crc32(d);
    const lh = new Uint8Array([0x50, 0x4b, 3, 4, 20, 0, 0, 8, 0, 0, 0, 0, 0x21, 0, ...u32(c), ...u32(d.length), ...u32(d.length), ...u16(nb.length), 0, 0, ...nb]);
    bagian.push(lh, d);
    pusat.push(new Uint8Array([0x50, 0x4b, 1, 2, 20, 0, 20, 0, 0, 8, 0, 0, 0, 0, 0x21, 0, ...u32(c), ...u32(d.length), ...u32(d.length), ...u16(nb.length), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(off), ...nb]));
    off += lh.length + d.length;
  }
  const ukPusat = pusat.reduce((a, x) => a + x.length, 0);
  const akhir = new Uint8Array([0x50, 0x4b, 5, 6, 0, 0, 0, 0, ...u16(files.length), ...u16(files.length), ...u32(ukPusat), ...u32(off), 0, 0]);
  return new Blob([...bagian, ...pusat, akhir], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
function xlsxMini(lembar) {
  const sh = lembar.map((l) => { const kol = l.kolom || Object.keys(l.baris?.[0] || {}); const data = l.data || (l.baris || []).map((o) => kol.map((k) => o[k]));
    const rows = [kol, ...data].map((r, i) => `<row r="${i + 1}">${r.map((v, j) => (v === '' || v == null) ? '' : typeof v === 'number' && isFinite(v) ? `<c r="${kolHuruf(j)}${i + 1}"><v>${v}</v></c>` : `<c r="${kolHuruf(j)}${i + 1}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`).join('')}</row>`).join('');
    return { nama: esc(String(l.nama).replace(/[\\/?*\[\]:]/g, ' ').slice(0, 31)), xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="${Math.max(1, kol.length)}" width="22" customWidth="1"/></cols><sheetData>${rows}</sheetData></worksheet>` }; });
  const H = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  return zipSimpan([
    ['[Content_Types].xml', `${H}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sh.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],
    ['_rels/.rels', `${H}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', `${H}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sh.map((x, i) => `<sheet name="${x.nama}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', `${H}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sh.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}</Relationships>`],
    ...sh.map((x, i) => [`xl/worksheets/sheet${i + 1}.xml`, x.xml]),
  ]);
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
    const a = document.createElement('a'); a.href = URL.createObjectURL(xlsxMini(lembar));
    a.download = namaBerkas.endsWith('.xlsx') ? namaBerkas : namaBerkas + '.xlsx';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return 'xlsx';
  }
}
