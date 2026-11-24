// Grafik SVG/HTML ringan tanpa pustaka luar: batang mendatar, donat, kolom 3D, meter progres.
// Aturan (skill dataviz): warna kategori urutan tetap (bukan diputar), maks 6 kategori lalu "Lainnya",
// batang tipis (≤ 24px) berujung bulat 4px, legenda untuk ≥ 2 seri, teks memakai warna teks (bukan warna data),
// setiap tanda punya tooltip (data-tip) dan setiap grafik utama punya tampilan tabel.
import { html, raw, angka, esc } from './util.js';

// Palet kategori yang lolos validator (terang): hijau, biru, emas, ungu, koral, toska
export const PALET = ['#17824A', '#3E66B3', '#C99A0E', '#7B5EC2', '#D9644A', '#0E9F97'];
export const ABU = '#8A96A3';
// Skala berurutan satu warna (hijau) untuk besaran: muda → tua
export const RAMPA = ['#D6EFE1', '#9FD6B8', '#5FB98A', '#2A9661', '#0E6B3B'];
// Versi untuk latar gelap: redup → terang
export const RAMPA_GELAP = ['#2B6B4C', '#3E9468', '#5CBF88', '#93DDB2', '#D2F5E1'];

export const warnaKe = (i) => (i < PALET.length ? PALET[i] : ABU);

/** Ringkas angka rupiah: 1,2 M (miliar), 350 jt, 950 rb. */
export function rupiahSingkat(n) {
  const v = Number(n) || 0, a = Math.abs(v);
  const f = (x, s) => x.toLocaleString('id-ID', { maximumFractionDigits: x < 10 ? 1 : 0 }) + ' ' + s;
  if (a >= 1e12) return 'Rp ' + f(v / 1e12, 'T');
  if (a >= 1e9) return 'Rp ' + f(v / 1e9, 'M');
  if (a >= 1e6) return 'Rp ' + f(v / 1e6, 'jt');
  if (a >= 1e3) return 'Rp ' + f(v / 1e3, 'rb');
  return 'Rp ' + angka(v);
}

/** Lipat kategori ke-6 dan seterusnya menjadi "Lainnya" (warna tidak pernah dibuat baru). */
export function lipat(data, maks = 6, nilai = 'n', label = 'label') {
  const urut = [...data].sort((a, b) => (Number(b[nilai]) || 0) - (Number(a[nilai]) || 0));
  if (urut.length <= maks) return urut;
  const sisa = urut.slice(maks - 1).reduce((s, x) => s + (Number(x[nilai]) || 0), 0);
  return [...urut.slice(0, maks - 1), { [label]: 'Lainnya', [nilai]: sisa, _lain: true }];
}

const kosongGrafik = (teks = 'Belum ada data terverifikasi untuk filter ini.') =>
  html`<div class="grafik-kosong"><span>${teks}</span></div>`;

/** Batang mendatar (HTML). Satu seri → tanpa kotak legenda; nilai di ujung batang. */
export function batang(data, { label = 'label', nilai = 'n', format = angka, warna = PALET[0], maks = 10, tipLabel = '' } = {}) {
  const d = (data || []).filter((x) => Number(x[nilai]) > 0).slice(0, maks);
  if (!d.length) return kosongGrafik();
  const top = Math.max(...d.map((x) => Number(x[nilai]) || 0), 1);
  return html`<div class="g-batang" role="list">${d.map((x, i) => {
    const v = Number(x[nilai]) || 0, w = Math.max(1.5, (v / top) * 100);
    return html`<div class="g-baris" role="listitem" tabindex="0" data-tip="${x[label]}: ${format(v)}${tipLabel ? ' ' + tipLabel : ''}" style="--w:${w}%;--c:${x._warna || warna};--i:${i}">
      <span class="g-label">${x[label]}</span><span class="g-trek"><span class="g-isi"></span></span><span class="g-nilai">${format(v)}</span></div>`;
  })}</div>`;
}

/** Donat + legenda (maks 6 irisan, sisanya "Lainnya"). */
export function donat(data, { label = 'label', nilai = 'n', format = angka, tengah = '', ukuran = 168, warna = null } = {}) {
  const d = lipat((data || []).filter((x) => Number(x[nilai]) > 0), 6, nilai, label);
  const total = d.reduce((s, x) => s + (Number(x[nilai]) || 0), 0);
  if (!total) return kosongGrafik();
  const r = 15.9155, kel = 100;               // keliling 100 → persen langsung
  let jalan = 0;
  const celah = d.length > 1 ? 0.8 : 0;        // celah 2px (permukaan) antar irisan
  const irisan = d.map((x, i) => {
    const p = (Number(x[nilai]) / total) * kel, c = x._lain ? ABU : (warna?.[i] || warnaKe(i));
    const seg = html`<circle class="g-iris" cx="21" cy="21" r="${r}" fill="none" stroke="${c}" stroke-width="5.2"
      stroke-dasharray="${Math.max(p - celah, 0.01)} ${kel - Math.max(p - celah, 0.01)}" stroke-dashoffset="${25 - jalan}"
      tabindex="0" data-tip="${x[label]}: ${format(x[nilai])} (${((Number(x[nilai]) / total) * 100).toFixed(1)}%)"><title>${x[label]}: ${format(x[nilai])}</title></circle>`;
    jalan += p;
    return { seg, c, x };
  });
  return html`<div class="g-donat">
    <svg viewBox="0 0 42 42" width="${ukuran}" height="${ukuran}" role="img" aria-label="Diagram donat">
      <circle cx="21" cy="21" r="${r}" fill="none" stroke="var(--garis-halus)" stroke-width="5.2"></circle>${irisan.map((s) => s.seg)}
      <text x="21" y="20.2" text-anchor="middle" class="g-donat-angka" style="font-size:${Math.min(6, 30 / Math.max(String(format(total)).length, 1)).toFixed(2)}px">${format(total)}</text>
      <text x="21" y="25.4" text-anchor="middle" class="g-donat-ket">${tengah}</text></svg>
    <ul class="g-legenda">${irisan.map(({ c, x }) => html`<li><i style="background:${c}"></i><span>${x[label]}</span>
      <b>${format(x[nilai])}</b><small>${((Number(x[nilai]) / total) * 100).toFixed(0)}%</small></li>`)}</ul></div>`;
}

/**
 * Kolom 3D (SVG): sisi depan, atas, dan samping. data[i]._warna = warna entitas (mis. warna Pokja) bila ada.
 * nilaiTampil: teks di atas kolom (default format(nilai)).
 */
export function kolom3d(data, { label = 'label', nilai = 'n', format = angka, warna = PALET[0], tinggi = 230, maksNilai = null, satuan = '', putarLabel = null } = {}) {
  const d = (data || []);
  if (!d.length || !d.some((x) => Number(x[nilai]) > 0)) return kosongGrafik();
  const n = d.length, lebarK = Math.min(46, Math.max(18, 560 / n - 14));
  // sedikit kolom → jarak dilebarkan agar label tidak bertumpuk dan grafik tidak tampak membesar
  const jarak = n <= 6 ? Math.max(30, Math.min(110, 560 / n - lebarK)) : Math.max(10, Math.min(30, 600 / n - lebarK));
  const dx = Math.round(lebarK * 0.42), dy = Math.round(lebarK * 0.3);
  const top = maksNilai || Math.max(...d.map((x) => Number(x[nilai]) || 0), 1);
  const putar = putarLabel ?? n > 7;
  const bawah = putar ? 86 : 44, atas = 34, kiri = 12;
  const W = kiri + n * (lebarK + jarak) + dx + 12, H = tinggi + atas + bawah, dasar = atas + tinggi;
  const gelapkan = (hex, f) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return hex;
    const v = parseInt(m[1], 16), r = Math.round(((v >> 16) & 255) * f), g = Math.round(((v >> 8) & 255) * f), b = Math.round((v & 255) * f);
    return `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`;
  };
  const kol = d.map((x, i) => {
    const v = Number(x[nilai]) || 0, h = Math.max(v > 0 ? 3 : 1, (v / top) * tinggi);
    const x0 = kiri + i * (lebarK + jarak), y0 = dasar - h, c = x._warna || warna;
    const teks = x._teks ?? format(v);
    return html`<g class="g-k3" style="--i:${i}" tabindex="0" data-tip="${x[label]}: ${x._tip ?? format(v)}${satuan ? ' ' + satuan : ''}">
      <title>${x[label]}: ${format(v)}</title>
      <g class="g-k3-badan">
        <path d="M${x0 + lebarK},${y0} l${dx},-${dy} v${h} l-${dx},${dy} z" fill="${gelapkan(c, 0.72)}"></path>
        <path d="M${x0},${y0} l${dx},-${dy} h${lebarK} l-${dx},${dy} z" fill="${gelapkan(c, 1.28)}"></path>
        <rect x="${x0}" y="${y0}" width="${lebarK}" height="${h}" fill="${c}"></rect>
      </g>
      <text class="g-k3-nilai" x="${x0 + lebarK / 2 + dx / 2}" y="${y0 - dy - 8}" text-anchor="middle">${teks}</text>
      ${putar
        ? html`<text class="g-k3-label" transform="translate(${x0 + lebarK / 2},${dasar + 14}) rotate(-38)" text-anchor="end">${String(x[label]).slice(0, 22)}</text>`
        : html`<text class="g-k3-label" x="${x0 + lebarK / 2 + dx / 2}" y="${dasar + 20}" text-anchor="middle">${potongLabel(x[label], Math.max(6, Math.floor((lebarK + jarak) / 6.6)))}</text>`}
    </g>`;
  });
  return html`<div class="g-kolom3d"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Diagram kolom tiga dimensi">
    <defs><linearGradient id="lantai" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".10"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>
    <path class="g-lantai" d="M${kiri - 6},${dasar} l${dx},-${dy} h${W - kiri - dx - 6} l-${dx},${dy} z" fill="url(#lantai)"></path>
    ${[0.25, 0.5, 0.75, 1].map((t) => html`<line class="g-grid" x1="${kiri}" x2="${W - 8}" y1="${dasar - t * tinggi}" y2="${dasar - t * tinggi}"></line>`)}
    <line class="g-sumbu" x1="${kiri - 6}" x2="${W - 8}" y1="${dasar}" y2="${dasar}"></line>
    ${kol}</svg></div>`;
}

const potongLabel = (t, n) => { t = String(t ?? ''); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t; };

/** Kolom biasa per bulan (untuk deret waktu pendek). */
export function kolomBulan(data, { nilai = 'n', format = angka, warna = PALET[1] } = {}) {
  const NB = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const d = (data || []).map((x) => ({ ...x, label: NB[Number(String(x.bulan).slice(5, 7)) - 1] + ' ' + String(x.bulan).slice(2, 4) }));
  return kolom3d(d, { nilai, format, warna, tinggi: 180, putarLabel: false });
}

/** Meter progres mendatar dengan persen. */
export function meter(p, { warna = PALET[0], label = '' } = {}) {
  const v = Math.max(0, Math.min(100, Math.round(Number(p) || 0)));
  return html`<span class="g-meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${v}" aria-label="${label || 'Progres'}" style="--w:${v}%;--c:${warna}">
    <span class="g-meter-trek"><span class="g-meter-isi"></span></span><b>${v}%</b></span>`;
}

/** Tabel data pendamping grafik (dalam <details>), agar identitas tidak hanya lewat warna. */
export function tabelGrafik(data, kolom, { ringkas = 'Lihat sebagai tabel' } = {}) {
  if (!data?.length) return '';
  return html`<details class="g-tabel"><summary>${ringkas}</summary><div class="table-wrap"><table class="tbl rapat">
    <thead><tr>${kolom.map(([, j]) => html`<th>${j}</th>`)}</tr></thead>
    <tbody>${data.map((r) => html`<tr>${kolom.map(([k, , f]) => html`<td class="${f ? 'kanan' : ''}">${f ? f(r[k]) : r[k] ?? '—'}</td>`)}</tr>`)}</tbody></table></div></details>`;
}

export const persen = (a, b) => (b ? Math.round((a / b) * 100) : 0);
export { esc };
