// Peta sebaran 38 provinsi (PRD 7.5).
// • Bila berkas peta resmi tersedia di assets/peta/indonesia-38.geojson (atau .topojson), peta Indonesia
//   yang sebenarnya digambar dari berkas itu, dengan kemiringan 3D dan bayangan tebal.
//   Provinsi dikenali dengan "id" berkas (bukan KODE_PROV), cocok dengan kolom provinsi.kode_peta.
// • Bila berkas belum dipasang, tampil KARTOGRAM 3D (ubin per provinsi, tinggi kolom = jumlah) yang diberi
//   label jelas sebagai tampilan sementara — bukan gambar peta buatan.
import { html, raw, angka } from './util.js';
import { RAMPA, RAMPA_GELAP } from './grafik.js';

const SUMBER = 'Indonesia GeoJSON & TopoJSON Maps (38 Provinces), CC BY 4.0';

// [kode_peta, singkatan, kolom, baris] — susunan kira-kira barat→timur, utara→selatan
const UBIN = [
  ['11', 'ACE', 0, 0], ['12', 'SUT', 1, 1], ['21', 'KRI', 3, 1], ['14', 'RIA', 2, 2], ['13', 'SUB', 1, 2], ['15', 'JAM', 2, 3],
  ['17', 'BEN', 1, 3], ['19', 'BBL', 3, 3], ['16', 'SUS', 2, 4], ['18', 'LAM', 2, 5], ['31', 'DKI', 4, 5], ['36', 'BAN', 3, 6],
  ['32', 'JAB', 4, 6], ['33', 'JTG', 5, 6], ['34', 'DIY', 5, 7], ['35', 'JTM', 6, 6], ['51', 'BAL', 7, 6], ['52', 'NTB', 8, 6],
  ['53', 'NTT', 9, 6], ['61', 'KBA', 5, 3], ['62', 'KTE', 6, 3], ['63', 'KSE', 6, 4], ['64', 'KTI', 7, 2], ['65', 'KUT', 7, 1],
  ['71', 'SLU', 10, 1], ['75', 'GOR', 9, 2], ['72', 'SLT', 9, 3], ['76', 'SLB', 8, 4], ['73', 'SLS', 8, 5], ['74', 'SLG', 9, 5],
  ['82', 'MAU', 11, 2], ['81', 'MAL', 11, 4], ['92-B', 'PBD', 12, 3], ['92-A', 'PBA', 13, 3], ['91-D', 'PTE', 14, 4], ['91-A', 'PAP', 15, 3],
  ['91-B', 'PPE', 15, 4], ['91-C', 'PSE', 15, 5],
];

let janjiPeta;
async function muatBerkasPeta() {
  janjiPeta ||= (async () => {
    for (const nama of ['assets/peta/indonesia-38.geojson', 'assets/peta/indonesia-38.topojson', 'assets/peta/indonesia-38.json']) {
      try {
        const r = await fetch(nama, { cache: 'force-cache' });
        if (!r.ok) continue;
        const j = await r.json();
        const g = j.type === 'Topology' ? topoKeGeo(j) : j;
        if (g?.features?.length) return g;
      } catch { /* coba berikutnya */ }
    }
    return null;
  })();
  return janjiPeta;
}

// Pengurai TopoJSON minimal (arc terkuantisasi) → GeoJSON FeatureCollection
function topoKeGeo(t) {
  const obj = Object.values(t.objects)[0];
  const tr = t.transform;
  const arcs = t.arcs.map((a) => {
    let x = 0, y = 0;
    return a.map((p) => (tr ? (x += p[0], y += p[1], [x * tr.scale[0] + tr.translate[0], y * tr.scale[1] + tr.translate[1]]) : p));
  });
  const arc = (i) => (i >= 0 ? arcs[i] : arcs[~i].slice().reverse());
  const cincin = (idx) => idx.flatMap((i, k) => (k ? arc(i).slice(1) : arc(i)));
  const geom = (g) => (g.type === 'Polygon' ? { type: 'Polygon', coordinates: g.arcs.map(cincin) }
    : g.type === 'MultiPolygon' ? { type: 'MultiPolygon', coordinates: g.arcs.map((p) => p.map(cincin)) } : null);
  return { type: 'FeatureCollection', features: obj.geometries.map((g) => ({ type: 'Feature', id: g.id, properties: g.properties || {}, geometry: geom(g) })) };
}

const idFitur = (f) => String(f.id ?? f.properties?.id ?? f.properties?.ID ?? '');
const namaFitur = (f) => f.properties?.name || f.properties?.Propinsi || f.properties?.PROVINSI || f.properties?.provinsi || idFitur(f);

function tingkat(n, maks) {
  if (!n) return -1;
  return Math.min(4, Math.floor((n / Math.max(maks, 1)) * 5 - 1e-9));
}

/**
 * Gambar peta ke dalam elemen. data: [{ kode_peta, provinsi, n }]. label: "LKS" / "Pendamping Lapangan".
 * gelap: true bila berada di pita gelap.
 */
export async function gambarPeta(el, { data = [], label = 'Jumlah', gelap = true } = {}) {
  const peta = Object.fromEntries((data || []).filter((x) => x.kode_peta).map((x) => [String(x.kode_peta), x]));
  const maks = Math.max(1, ...Object.values(peta).map((x) => Number(x.n) || 0));
  const rampa = gelap ? RAMPA_GELAP : RAMPA;
  const geo = await muatBerkasPeta();
  el.innerHTML = String(geo ? petaAsli(geo, peta, maks, rampa, label, gelap) : kartogram(peta, maks, rampa, label, gelap));
}

function legenda(maks, rampa, label, gelap) {
  const batas = [0, 1, 2, 3, 4].map((i) => Math.ceil(((i + 1) / 5) * maks));
  return html`<div class="peta-legenda"><span>${label}:</span>
    <i style="background:${gelap ? 'rgba(255,255,255,.12)' : '#EEF1F4'}"></i><small>0</small>
    ${rampa.map((c, i) => html`<i style="background:${c}"></i><small>${i === 4 ? '≤ ' + angka(batas[i]) : '≤ ' + angka(batas[i])}</small>`)}</div>`;
}

function petaAsli(geo, peta, maks, rampa, label, gelap) {
  // proyeksi equirectangular dengan koreksi lintang (Indonesia dekat khatulistiwa)
  let x0 = 180, x1 = -180, y0 = 90, y1 = -90;
  const tiap = (g, fn) => (g.type === 'Polygon' ? g.coordinates.forEach((r) => r.forEach(fn)) : g.coordinates.forEach((p) => p.forEach((r) => r.forEach(fn))));
  geo.features.forEach((f) => f.geometry && tiap(f.geometry, ([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }));
  const W = 1000, sk = W / (x1 - x0), H = Math.round((y1 - y0) * sk) + 20;
  const pt = ([x, y]) => `${((x - x0) * sk).toFixed(1)},${((y1 - y) * sk + 10).toFixed(1)}`;
  const jalur = (g) => {
    const ring = (r) => 'M' + r.map(pt).join('L') + 'Z';
    return g.type === 'Polygon' ? g.coordinates.map(ring).join('') : g.coordinates.map((p) => p.map(ring).join('')).join('');
  };
  const pathAll = geo.features.filter((f) => f.geometry).map((f) => {
    const id = idFitur(f), x = peta[id], n = Number(x?.n) || 0, t = tingkat(n, maks);
    const isi = t < 0 ? (gelap ? 'rgba(255,255,255,.12)' : '#EEF1F4') : rampa[t];
    return { d: jalur(f.geometry), isi, tip: `${x?.provinsi || namaFitur(f)} — ${label}: ${angka(n)}` };
  });
  return html`<div class="peta peta-3d ${gelap ? 'gelap' : ''}" data-tilt-peta>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Peta sebaran ${label} per provinsi">
      <g class="peta-tebal" aria-hidden="true">${pathAll.map((p) => html`<path d="${p.d}"></path>`)}</g>
      <g class="peta-muka">${pathAll.map((p) => html`<path d="${p.d}" fill="${p.isi}" tabindex="0" data-tip="${p.tip}"><title>${p.tip}</title></path>`)}</g>
    </svg></div>
    ${legenda(maks, rampa, label, gelap)}<p class="peta-sumber">Sumber peta: ${SUMBER}</p>`;
}

function kartogram(peta, maks, rampa, label, gelap) {
  // proyeksi miring: kolom → (34, -6), baris → (12, 20), tinggi → (0, -1)
  const ax = [34, -6], ay = [13, 21], s = 0.82, hMaks = 92;
  const P = (c, r) => [40 + c * ax[0] + r * ay[0], 150 + c * ax[1] + r * ay[1]];
  const gel = (hex, f) => { const v = parseInt(hex.slice(1), 16); return `rgb(${Math.min(255, Math.round(((v >> 16) & 255) * f))},${Math.min(255, Math.round(((v >> 8) & 255) * f))},${Math.min(255, Math.round((v & 255) * f))})`; };
  const urut = [...UBIN].sort((a, b) => a[3] - b[3] || a[2] - b[2]);
  const ubin = urut.map(([id, sing, c, r]) => {
    const x = peta[id], n = Number(x?.n) || 0, t = tingkat(n, maks), h = n ? Math.max(6, (n / maks) * hMaks) : 2;
    const warna = t < 0 ? (gelap ? '#3C5E50' : '#D9E0E6') : rampa[t];
    const [ax0, ay0] = P(c, r), [bx, by] = P(c + s, r), [cx, cy] = P(c + s, r + s), [dx, dy] = P(c, r + s);
    const atas = `M${ax0},${ay0 - h} L${bx},${by - h} L${cx},${cy - h} L${dx},${dy - h} Z`;
    const depan = `M${dx},${dy} L${cx},${cy} L${cx},${cy - h} L${dx},${dy - h} Z`;
    const kanan = `M${bx},${by} L${cx},${cy} L${cx},${cy - h} L${bx},${by - h} Z`;
    const tip = `${x?.provinsi || sing} — ${label}: ${angka(n)}`;
    return html`<g class="ubin3d ${n ? 'isi' : ''}" tabindex="0" data-tip="${tip}" style="--i:${c + r}"><title>${tip}</title>
      <path d="${kanan}" fill="${gel(warna.startsWith('#') ? warna : '#3C5E50', 0.66)}"></path>
      <path d="${depan}" fill="${gel(warna.startsWith('#') ? warna : '#3C5E50', 0.82)}"></path>
      <path d="${atas}" fill="${warna}"></path>
      ${n ? html`<text x="${(ax0 + cx) / 2}" y="${(ay0 + cy) / 2 - h + 3}" text-anchor="middle">${sing}</text>` : ''}</g>`;
  });
  const top = Object.values(peta).sort((a, b) => b.n - a.n).slice(0, 5);
  return html`<div class="peta kartogram ${gelap ? 'gelap' : ''}" data-tilt-peta>
      <svg viewBox="0 0 720 360" role="img" aria-label="Kartogram 3D sebaran ${label} per provinsi">${ubin}</svg></div>
    ${legenda(maks, rampa, label, gelap)}
    ${top.length ? html`<ol class="peta-top">${top.map((x) => html`<li><b>${x.provinsi}</b><span>${angka(x.n)}</span></li>`)}</ol>` : ''}
    <p class="peta-sumber">Tampilan sementara berupa kartogram (satu ubin per provinsi, tinggi kolom = jumlah). Peta Indonesia asli tampil otomatis setelah berkas
      <code>assets/peta/indonesia-38.geojson</code> (${SUMBER}) dipasang.</p>`;
}
