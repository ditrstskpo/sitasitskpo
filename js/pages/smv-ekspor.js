// Ekspor Supermonev (PRD 5.4): PPTX 2 slide per PM (slide 1: keberhasilan, keuangan, kendala; slide 2: situasi
// barang & permodalan) + slide sampul, Excel, dan cetak/PDF. Pratinjau slide tampil di "panggung" gelap dengan
// lampu sorot dan kartu miring 3D. Hanya isian TERVERIFIKASI yang diekspor; NIK disamarkan pada slide.
import { html, raw, angka, tanggal, hariIni, debounce } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api, modePratinjau } from '../core/api.js';
import { judulHalaman, kotakGalat, pesanGalat, toast, tombolMuat, kosong } from '../core/ui.js';
import { opsi, pokjaCepat, namaUnduhan } from '../core/komp.js';
import { pasangEfek, segarkanEfek } from '../core/efek.js';
import { unduhExcel } from '../core/xlsx.js';
import { ambilBerkas } from '../core/berkas.js';
import { rupiah, JENIS_BANTUAN } from '../core/bnba.js';
import { PROVINSI } from './_t34.js';
import { HASIL, URUT_HASIL, lencanaHasil } from './_smv.js';
import { CONFIG } from '../config.js';

const nikSamar = (n) => (n && n.length >= 8 ? n.slice(0, 4) + '••••••••' + n.slice(-4) : n || '—');
const pct = (x) => (x == null ? '—' : (x > 0 ? '+' : '') + angka(x) + '%');

// ---------------------------------------------------------------- pratinjau slide (HTML, juga untuk cetak/PDF)
function slide1(r) {
  const h = HASIL[r.hasil] || {};
  return html`<div class="slide" style="--t:${h.t};--x:${h.x};--c:${h.c}">
    <div class="sl-kepala"><span class="sl-pita">Supermonev · Putaran ${r.putaran}</span><b>${r.nama}</b><small>${nikSamar(r.nik)} · ${r.pokja_nama} · ${[r.kabkota, r.provinsi].filter(Boolean).join(', ')}</small></div>
    <div class="sl-isi tiga">
      <div class="sl-kotak hasil"><small>1 · Keberhasilan</small><span class="sl-lencana">${h.l || '—'}</span><p>${h.k || ''}</p>
        <p class="sl-redup">Usaha ${r.usaha_berjalan ? 'berjalan' : 'tidak berjalan'}${r.usaha_berjalan ? (r.usaha_berubah ? ' · berubah ke: ' + (r.usaha_baru || '—') : ' · jenis usaha sama') : ''}</p></div>
      <div class="sl-kotak"><small>2 · Keuangan per bulan</small>
        <div class="sl-batang"><div><i style="--h:${Math.max(4, Math.min(100, (r.dasar_pendapatan || 0) / Math.max(r.dasar_pendapatan || 0, r.pendapatan_bersih || 0, 1) * 100))}%;--c:#9AA6B2"></i><span>Sebelum</span><b>${rupiah(r.dasar_pendapatan)}</b></div>
          <div><i style="--h:${Math.max(4, Math.min(100, (r.pendapatan_bersih || 0) / Math.max(r.dasar_pendapatan || 0, r.pendapatan_bersih || 0, 1) * 100))}%;--c:${h.c || '#17824A'}"></i><span>Bulan ini</span><b>${rupiah(r.pendapatan_bersih)}</b></div></div>
        <p class="sl-angka">${pct(r.kenaikan)}</p><p class="sl-redup">Kotor ${rupiah(r.pendapatan_kotor)} · keluar ${rupiah(r.pengeluaran)} · +${angka(r.tambah_pekerja || 0)} pekerja</p></div>
      <div class="sl-kotak"><small>3 · Kendala</small><p class="sl-kutip">${r.ringkasan_kendala || r.kendala || 'Tidak ada kendala tercatat.'}</p>
        ${(r.kategori_kendala || []).length ? html`<p class="sl-chip">${r.kategori_kendala.join(' · ')}</p>` : ''}${r.perkembangan ? html`<p class="sl-redup">Perkembangan: ${r.perkembangan}</p>` : ''}</div>
    </div>
    <div class="sl-kaki">Kunjungan ${tanggal(r.tgl_kunjungan)} · Petugas ${r.petugas_nama || '—'} · Diverifikasi ${r.diverifikasi_nama || '—'}<span>SITASI TSKPO · Dit. RSTSKPO</span></div></div>`;
}
function slide2(r) {
  const inv = r.belanja?.inventaris || [];
  return html`<div class="slide">
    <div class="sl-kepala"><span class="sl-pita">Supermonev · Putaran ${r.putaran}</span><b>${r.nama}</b><small>Situasi barang &amp; permodalan</small></div>
    <div class="sl-isi dua">
      <div class="sl-kotak"><small>4 · Situasi barang bantuan</small><span class="sl-lencana netral">${r.kondisi_barang || '—'}</span>
        <p class="sl-redup">${r.catatan_barang || ''}</p><p><b>Bantuan:</b> ${JENIS_BANTUAN[r.jenis_bantuan] || r.jenis_bantuan || '—'} · ${rupiah(r.nilai_bantuan)}</p><p class="sl-redup">${r.rincian_barang || ''}</p>
        ${inv.length ? html`<table class="sl-tabel"><tr><th>Barang</th><th>Jml</th><th>Nilai</th></tr>${inv.slice(0, 4).map((x) => html`<tr><td>${x.nama}</td><td>${x.jumlah} ${x.satuan || ''}</td><td>${rupiah(x.nilai)}</td></tr>`)}</table>
          <p class="sl-redup">Verifikasi belanja: ${r.belanja?.status === 'terverifikasi' ? 'terverifikasi' : r.belanja?.status || 'belum'}</p>` : html`<p class="sl-redup">Daftar inventaris belum diunggah.</p>`}</div>
      <div class="sl-kotak"><small>5 · Permodalan</small><p class="sl-angka">${rupiah(r.modal_usaha)}</p><p class="sl-redup">Modal usaha saat ini · sumber: ${r.sumber_modal || '—'}</p>
        <div class="sl-foto">${(r.foto || []).slice(0, 2).map((id) => html`<img data-gambar-slide="${id}" alt="">`)}${!(r.foto || []).length ? html`<span>Tidak ada foto</span>` : ''}</div></div>
    </div>
    <div class="sl-kaki">Rekap Supermonev · ${hariIni()}<span>SITASI TSKPO · Dit. RSTSKPO</span></div></div>`;
}

// ---------------------------------------------------------------- PPTX
let janjiPptx;
export function muatPptx() {
  janjiPptx ||= new Promise((ok, gagal) => {
    if (window.PptxGenJS) return ok(window.PptxGenJS);
    const sc = document.createElement('script');
    sc.src = 'js/vendor/pptxgen.bundle.js';
    sc.onload = () => (window.PptxGenJS ? ok(window.PptxGenJS) : gagal(new Error('Pustaka PowerPoint gagal dimuat.')));
    sc.onerror = () => { janjiPptx = null; gagal(new Error('Pustaka PowerPoint (js/vendor/pptxgen.bundle.js) tidak ditemukan. Pastikan folder js/vendor ikut diunggah ke GitHub.')); };
    document.head.appendChild(sc);
  });
  return janjiPptx;
}
export const blobKeData = (blob) => new Promise((ok, gagal) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = gagal; r.readAsDataURL(blob); });
export async function fotoData(id) {
  const r = await ambilBerkas(id);
  if (!r.blob) return null;
  let url = await blobKeData(r.blob);
  if (/^data:image\/(png|jpe?g)/.test(url)) return url;
  // SVG / format lain → gambar ulang sebagai PNG
  const img = new Image(); img.src = url; await img.decode();
  const c = document.createElement('canvas'); c.width = img.naturalWidth || 640; c.height = img.naturalHeight || 420;
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.85);
}
const hx = (c) => String(c || '#17824A').replace('#', '').toUpperCase();
async function buatPptx(rows, { foto = true, judul = 'Laporan Supermonev', ket = '', ringkas, progres }) {
  const Pptx = await muatPptx();
  const p = new Pptx();
  p.layout = 'LAYOUT_WIDE'; p.author = 'SITASI TSKPO'; p.company = 'Direktorat RSTSKPO, Kementerian Sosial RI'; p.title = judul;
  const F = 'Calibri', GELAP = '0B3B2A', HIJAU = '17824A', EMAS = 'E7B416', JUDUL = '142033', REDUP = '66717E';
  let logo = null;
  try { if (CONFIG.LOGO) { const r = await fetch(CONFIG.LOGO); if (r.ok) logo = await blobKeData(await r.blob()); } } catch {}
  const kepala = (sl, r, sub) => {
    sl.background = { color: 'F7F9FB' };
    sl.addShape(p.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 1.15, fill: { color: GELAP } });
    sl.addShape(p.ShapeType.rect, { x: 0, y: 1.15, w: 13.33, h: 0.05, fill: { color: EMAS } });
    sl.addText(`SUPERMONEV · PUTARAN ${r.putaran}`, { x: 0.5, y: 0.14, w: 6, h: 0.3, fontFace: F, fontSize: 11, bold: true, color: 'F2C94C', charSpacing: 2 });
    sl.addText(r.nama, { x: 0.5, y: 0.42, w: 8.4, h: 0.5, fontFace: F, fontSize: 26, bold: true, color: 'FFFFFF' });
    sl.addText(sub, { x: 8.6, y: 0.3, w: 4.3, h: 0.6, fontFace: F, fontSize: 12, color: 'B9CFC3', align: 'right' });
  };
  const kaki = (sl, teks) => {
    sl.addText(teks, { x: 0.5, y: 7.0, w: 9, h: 0.3, fontFace: F, fontSize: 10, color: REDUP });
    sl.addText('SITASI TSKPO · Dit. RSTSKPO Kemensos RI', { x: 8.8, y: 7.0, w: 4.0, h: 0.3, fontFace: F, fontSize: 10, color: REDUP, align: 'right' });
  };
  const kotak = (sl, x, y, w, h, judulK) => {
    sl.addShape(p.ShapeType.roundRect, { x, y, w, h, fill: { color: 'FFFFFF' }, line: { color: 'E3E8EE', width: 1 }, rectRadius: 0.12 });
    sl.addText(judulK.toUpperCase(), { x: x + 0.25, y: y + 0.15, w: w - 0.5, h: 0.3, fontFace: F, fontSize: 11, bold: true, color: REDUP, charSpacing: 1 });
  };
  // ---- sampul
  const sm = p.addSlide();
  sm.background = { color: GELAP };
  sm.addShape(p.ShapeType.ellipse, { x: 9.2, y: -1.6, w: 6, h: 6, fill: { color: '17824A', transparency: 70 } });
  sm.addShape(p.ShapeType.ellipse, { x: -1.5, y: 4.8, w: 5, h: 5, fill: { color: EMAS, transparency: 82 } });
  if (logo) sm.addImage({ data: logo.replace(/^data:/, ''), x: 0.7, y: 0.6, w: 0.9, h: 0.9, sizing: { type: 'contain', w: 0.9, h: 0.9 } });
  sm.addText('LAPORAN MONITORING & EVALUASI', { x: 0.7, y: 1.8, w: 10, h: 0.4, fontFace: F, fontSize: 14, bold: true, color: 'F2C94C', charSpacing: 3 });
  sm.addText(judul, { x: 0.7, y: 2.2, w: 11, h: 1.0, fontFace: F, fontSize: 44, bold: true, color: 'FFFFFF' });
  sm.addText('Evaluasi hasil pascapenyaluran bantuan ATENSI · Direktorat Rehabilitasi Sosial Tuna Sosial dan Korban Perdagangan Orang', { x: 0.7, y: 3.2, w: 11.5, h: 0.5, fontFace: F, fontSize: 15, color: 'B9CFC3' });
  sm.addText(ket || 'Semua isian terverifikasi', { x: 0.7, y: 3.7, w: 11.5, h: 0.4, fontFace: F, fontSize: 13, color: 'B9CFC3', italic: true });
  const kpi = [[angka(rows.length), 'PM dimonitor (terverifikasi)'], [ringkas.berhasil, 'Usaha berhasil'], [ringkas.naik, 'Rata-rata kenaikan pendapatan']];
  kpi.forEach(([v, l], i) => {
    sm.addShape(p.ShapeType.roundRect, { x: 0.7 + i * 3.2, y: 4.5, w: 3.0, h: 1.5, fill: { color: 'FFFFFF', transparency: 90 }, line: { color: 'FFFFFF', transparency: 80, width: 1 }, rectRadius: 0.15 });
    sm.addText(v, { x: 0.9 + i * 3.2, y: 4.62, w: 2.7, h: 0.75, fontFace: F, fontSize: 32, bold: true, color: 'FFFFFF' });
    sm.addText(l, { x: 0.9 + i * 3.2, y: 5.35, w: 2.7, h: 0.45, fontFace: F, fontSize: 12, color: 'B9CFC3' });
  });
  URUT_HASIL.forEach((k, i) => {
    const n = rows.filter((r) => r.hasil === k).length;
    sm.addShape(p.ShapeType.roundRect, { x: 10.5, y: 4.5 + i * 0.42, w: 2.2, h: 0.36, fill: { color: hx(HASIL[k].t) }, rectRadius: 0.08 });
    sm.addText(`${HASIL[k].l}: ${n}`, { x: 10.55, y: 4.5 + i * 0.42, w: 2.1, h: 0.36, fontFace: F, fontSize: 11, bold: true, color: hx(HASIL[k].x), align: 'center' });
  });
  sm.addText(`Dibuat ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} · SITASI TSKPO`, { x: 0.7, y: 6.7, w: 8, h: 0.35, fontFace: F, fontSize: 11, color: 'B9CFC3' });

  let n = 0;
  for (const r of rows) {
    n++; progres?.(n, rows.length);
    const h = HASIL[r.hasil] || { l: '—', t: '#E8ECF1', x: '#3A4656', c: '#8A96A3', k: '' };
    // ---- slide 1: keberhasilan, keuangan, kendala
    const s1 = p.addSlide();
    kepala(s1, r, `${nikSamar(r.nik)}\n${r.pokja_nama || ''} · ${[r.kabkota, r.provinsi].filter(Boolean).join(', ')}`);
    kotak(s1, 0.5, 1.5, 3.9, 5.3, '1 · Keberhasilan');
    s1.addShape(p.ShapeType.roundRect, { x: 0.75, y: 2.05, w: 3.4, h: 0.9, fill: { color: hx(h.t) }, line: { color: hx(h.c), width: 1.5 }, rectRadius: 0.12 });
    s1.addText(h.l, { x: 0.75, y: 2.05, w: 3.4, h: 0.9, fontFace: F, fontSize: 20, bold: true, color: hx(h.x), align: 'center', valign: 'middle' });
    s1.addText(h.k, { x: 0.75, y: 3.1, w: 3.4, h: 0.7, fontFace: F, fontSize: 13, color: JUDUL });
    s1.addText([{ text: 'Usaha berjalan: ', options: { bold: true } }, { text: r.usaha_berjalan ? 'Ya' : 'Tidak', options: { breakLine: true } },
      ...(r.usaha_berjalan ? [{ text: 'Jenis usaha: ', options: { bold: true } }, { text: r.usaha_berubah ? 'Berubah — ' + (r.usaha_baru || '-') : 'Masih sama', options: { breakLine: true } }] : []),
      { text: 'Tambahan pekerja: ', options: { bold: true } }, { text: angka(r.tambah_pekerja || 0) + ' orang' }],
    { x: 0.75, y: 3.9, w: 3.4, h: 1.6, fontFace: F, fontSize: 13, color: JUDUL, valign: 'top', paraSpaceAfter: 4 });
    kotak(s1, 4.6, 1.5, 4.3, 5.3, '2 · Keuangan per bulan');
    s1.addChart(p.ChartType.bar, [{ name: 'Sebelum bantuan', labels: ['Pendapatan bersih'], values: [Number(r.dasar_pendapatan) || 0] }, { name: 'Bulan ini', labels: ['Pendapatan bersih'], values: [Number(r.pendapatan_bersih) || 0] }],
      { x: 4.8, y: 1.95, w: 3.9, h: 2.6, barDir: 'col', chartColors: ['9AA6B2', hx(h.c)], showValue: true, dataLabelFormatCode: '#,##0', dataLabelFontSize: 11, valAxisHidden: true, valGridLine: { style: 'none' },
        catAxisHidden: true, showLegend: true, legendPos: 'b', legendFontSize: 11, barGapWidthPct: 60 });
    s1.addTable([[{ text: 'Pendapatan kotor', options: { bold: true } }, rupiah(r.pendapatan_kotor)], [{ text: 'Pengeluaran', options: { bold: true } }, rupiah(r.pengeluaran)],
      [{ text: 'Pendapatan bersih', options: { bold: true } }, { text: rupiah(r.pendapatan_bersih), options: { bold: true } }], [{ text: 'Perubahan', options: { bold: true } }, { text: pct(r.kenaikan), options: { bold: true, color: r.kenaikan > 0 ? HIJAU : 'A12D1F' } }]],
    { x: 4.85, y: 4.7, w: 3.8, colW: [1.9, 1.9], fontFace: F, fontSize: 12, color: JUDUL, border: { type: 'solid', color: 'EEF1F4', pt: 1 }, rowH: 0.42 });
    kotak(s1, 9.1, 1.5, 3.73, 5.3, '3 · Kendala');
    s1.addText(r.ringkasan_kendala || r.kendala || 'Tidak ada kendala tercatat.', { x: 9.3, y: 2.0, w: 3.35, h: 2.2, fontFace: F, fontSize: 15, italic: true, color: JUDUL, valign: 'top' });
    if ((r.kategori_kendala || []).length) s1.addText(r.kategori_kendala.join(' · '), { x: 9.3, y: 4.25, w: 3.35, h: 0.7, fontFace: F, fontSize: 11, bold: true, color: '8E3422', valign: 'top' });
    if (r.perkembangan) s1.addText('Perkembangan: ' + r.perkembangan, { x: 9.3, y: 5.0, w: 3.35, h: 1.6, fontFace: F, fontSize: 12, color: REDUP, valign: 'top' });
    kaki(s1, `Kunjungan ${tanggal(r.tgl_kunjungan)} · Petugas ${r.petugas_nama || '-'} · Diverifikasi ${r.diverifikasi_nama || '-'}`);
    // ---- slide 2: situasi barang & permodalan
    const s2 = p.addSlide();
    kepala(s2, r, 'Situasi barang & permodalan');
    kotak(s2, 0.5, 1.5, 6.1, 5.3, '4 · Situasi barang bantuan');
    const baik = r.kondisi_barang === 'Baik';
    s2.addShape(p.ShapeType.roundRect, { x: 0.75, y: 2.0, w: 3.2, h: 0.7, fill: { color: baik ? 'DDF1E8' : 'FBF0CC' }, rectRadius: 0.1 });
    s2.addText(r.kondisi_barang || '-', { x: 0.75, y: 2.0, w: 3.2, h: 0.7, fontFace: F, fontSize: 18, bold: true, color: baik ? '0E5530' : '6B4E08', align: 'center', valign: 'middle' });
    s2.addText([{ text: 'Bantuan: ', options: { bold: true } }, { text: `${JENIS_BANTUAN[r.jenis_bantuan] || r.jenis_bantuan || '-'} · ${rupiah(r.nilai_bantuan)}`, options: { breakLine: true } },
      { text: r.rincian_barang || '', options: { color: REDUP, breakLine: true } }, { text: r.catatan_barang ? 'Catatan: ' + r.catatan_barang : '', options: { color: REDUP } }],
    { x: 0.75, y: 2.85, w: 5.6, h: 1.1, fontFace: F, fontSize: 13, color: JUDUL, valign: 'top' });
    const inv = r.belanja?.inventaris || [];
    if (inv.length) {
      s2.addTable([[{ text: 'Barang', options: { bold: true, fill: { color: 'F2F7F4' } } }, { text: 'Jumlah', options: { bold: true, fill: { color: 'F2F7F4' } } }, { text: 'Nilai', options: { bold: true, fill: { color: 'F2F7F4' } } }],
        ...inv.slice(0, 6).map((x) => [x.nama, `${x.jumlah} ${x.satuan || ''}`, rupiah(x.nilai)])],
      { x: 0.75, y: 4.05, w: 5.6, colW: [2.8, 1.2, 1.6], fontFace: F, fontSize: 11, color: JUDUL, border: { type: 'solid', color: 'E3E8EE', pt: 1 }, rowH: 0.34 });
      s2.addText(`Verifikasi belanja/BAST: ${r.belanja?.status === 'terverifikasi' ? 'terverifikasi' : r.belanja?.status || 'belum'} · total ${rupiah(r.belanja?.total_nilai)}`, { x: 0.75, y: 6.35, w: 5.6, h: 0.3, fontFace: F, fontSize: 11, color: REDUP });
    } else s2.addText('Daftar inventaris belum diunggah.', { x: 0.75, y: 4.1, w: 5.6, h: 0.4, fontFace: F, fontSize: 12, italic: true, color: REDUP });
    kotak(s2, 6.8, 1.5, 6.03, 5.3, '5 · Permodalan');
    s2.addText(rupiah(r.modal_usaha), { x: 7.05, y: 1.95, w: 5.5, h: 0.7, fontFace: F, fontSize: 30, bold: true, color: HIJAU });
    s2.addText(`Modal usaha saat ini · sumber: ${r.sumber_modal || '-'}`, { x: 7.05, y: 2.65, w: 5.5, h: 0.4, fontFace: F, fontSize: 12, color: REDUP });
    const ids = foto ? (r.foto || []).slice(0, 2) : [];
    let fx = 7.05;
    for (const id of ids) {
      try { const dt = await fotoData(id); if (dt) { s2.addImage({ data: dt.replace(/^data:/, ''), x: fx, y: 3.25, w: 2.65, h: 3.3, sizing: { type: 'cover', w: 2.65, h: 3.3 }, rounding: false }); fx += 2.85; } } catch { /* foto dilewati */ }
    }
    if (fx === 7.05) s2.addText(foto ? 'Tidak ada foto monitoring.' : 'Foto tidak disertakan.', { x: 7.05, y: 3.3, w: 5.5, h: 0.4, fontFace: F, fontSize: 12, italic: true, color: REDUP });
    kaki(s2, `Putaran ${r.putaran} · jatuh tempo ${tanggal(r.jatuh_tempo)} · ${r.no_register || ''}`);
  }
  await p.writeFile({ fileName: namaUnduhan('Supermonev') + '.pptx' });
}

// ---------------------------------------------------------------- halaman
export async function render(el) {
  const f = { putaran: '', pokja: '', hasil: '', provinsi: '' };
  const pokja = await pokjaCepat().catch(() => []);
  let rows = [], pilih = 0, cari = '';
  el.innerHTML = String(html`
    ${judulHalaman({ pill: 'Supermonev · Ekspor', sorot: 'Ekspor PPTX', sisa: '& Laporan',
      sub: 'Susun bahan paparan otomatis: 1 slide sampul + 2 slide per PM. Slide 1 berisi keberhasilan, keuangan, dan kendala; slide 2 berisi situasi barang dan permodalan. Hanya isian terverifikasi.',
      aksi: String(html`<a class="btn btn-ghost" href="#/dashboard-supermonev">${raw(ikon('arrow-left', 18))} Dashboard</a>`) })}
    <section class="card filter-card" style="margin-bottom:20px">
      <div class="filter-head">${raw(ikon('sliders', 20))}<b>Pilih data yang diekspor</b></div>
      <div class="dash-filter">
        <select class="select" data-f="putaran" aria-label="Putaran">${opsi([1, 2, 3, 4].map((n) => [String(n), 'Putaran ' + n]), '', 'Semua putaran')}</select>
        <select class="select" data-f="pokja" aria-label="Pokja">${opsi(pokja.filter((p) => p.kelompok === 'teknis').map((p) => [p.id, 'Pokja ' + p.nama_pendek]), '', 'Semua Pokja')}</select>
        <select class="select" data-f="hasil" aria-label="Hasil">${opsi(URUT_HASIL.map((k) => [k, HASIL[k].l]), '', 'Semua hasil')}</select>
        <select class="select" data-f="provinsi" aria-label="Provinsi">${opsi(PROVINSI, '', 'Semua provinsi')}</select>
        <label class="sakelar"><input type="checkbox" data-foto checked> Sertakan foto monitoring</label>
      </div></section>
    <section class="panggung" data-panggung>
      <div class="panggung-lampu" aria-hidden="true"></div><div class="panggung-lantai" aria-hidden="true"></div>
      <div class="panggung-kepala"><div><span class="pill">Panggung Pratinjau Slide</span><h2 data-judul-panggung>Memuat…</h2><p>Arahkan kursor ke slide untuk melihatnya tegak. Gunakan panah untuk berpindah PM.</p></div>
        <div class="panggung-aksi"><button class="btn btn-secondary" data-cetak>${raw(ikon('printer', 18))} Cetak / Simpan PDF</button>
          <button class="btn btn-secondary" data-excel>${raw(ikon('sheet', 18))} Unduh Excel</button>
          <button class="btn btn-primary btn-sinar" data-pptx>${raw(ikon('presentation', 18))} Unduh PPTX</button></div></div>
      <div class="panggung-tata">
        <div class="panggung-daftar"><label class="input-ikon">${raw(ikon('search', 18))}<input class="input" data-cari placeholder="Cari nama PM" aria-label="Cari PM"></label><div data-daftar></div></div>
        <div class="panggung-slide"><button class="btn btn-icon panah kiri" data-geser="-1" aria-label="PM sebelumnya">${raw(ikon('chevron-left', 22))}</button>
          <div class="slide-duo" data-slide></div>
          <button class="btn btn-icon panah kanan" data-geser="1" aria-label="PM berikutnya">${raw(ikon('chevron-right', 22))}</button></div>
      </div>
      <div class="panggung-progres" data-progres hidden><div><b data-progres-teks>Menyusun slide…</b><span class="g-meter-trek"><span class="g-meter-isi" data-progres-isi style="--w:0%"></span></span></div></div>
    </section>`);
  pasangEfek(el);
  const $ = (q) => el.querySelector(q);
  const tampil = () => rows.filter((r) => !cari || r.nama.toLowerCase().includes(cari));
  const ringkas = () => ({ berhasil: rows.length ? angka(Math.round((rows.filter((r) => ['berhasil', 'berhasil_catatan'].includes(r.hasil)).length / rows.length) * 1000) / 10) + '%' : '—',
    naik: (() => { const a = rows.filter((r) => r.kenaikan != null).map((r) => r.kenaikan); return a.length ? pct(Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10) : '—'; })() });
  const ketFilter = () => [f.putaran && 'Putaran ' + f.putaran, f.pokja && 'Pokja ' + (pokja.find((p) => p.id === f.pokja)?.nama_pendek || ''), f.hasil && HASIL[f.hasil].l, f.provinsi].filter(Boolean).join(' · ') || 'Semua isian terverifikasi';

  async function gambarFotoSlide(root) {
    root.querySelectorAll('img[data-gambar-slide]:not([data-dimuat])').forEach(async (img) => {
      img.dataset.dimuat = '1';
      try { const r = await ambilBerkas(img.dataset.gambarSlide); if (r.blob) img.src = URL.createObjectURL(r.blob); } catch { img.remove(); }
    });
  }
  function gambarSlide() {
    const t = tampil();
    $('[data-judul-panggung]').innerHTML = String(html`<span class="hl hl-sapu on">${angka(rows.length)} PM</span> · ${angka(rows.length * 2 + (rows.length ? 1 : 0))} slide`);
    $('[data-daftar]').innerHTML = String(t.length ? html`<ul class="pd-daftar">${t.map((r) => { const i = rows.indexOf(r); return html`<li><button type="button" class="${i === pilih ? 'on' : ''}" data-pilih="${i}">
      <b>${r.nama}</b><small>Putaran ${r.putaran} · ${r.kabkota || ''}</small>${lencanaHasil(r.hasil)}</button></li>`; })}</ul>` : html`<p class="redup">Tidak ada PM.</p>`);
    const r = rows[pilih];
    $('[data-slide]').innerHTML = String(r ? html`<figure class="slide-3d s1" data-tilt="6">${slide1(r)}<figcaption>Slide 1 · Keberhasilan, keuangan &amp; kendala</figcaption></figure>
      <figure class="slide-3d s2" data-tilt="6">${slide2(r)}<figcaption>Slide 2 · Situasi barang &amp; permodalan</figcaption></figure>`
      : kosong({ ikonNama: 'presentation', judul: 'Belum ada isian terverifikasi', teks: 'Slide akan tersusun setelah Kapokja Supermonev memverifikasi isian.' }));
    gambarFotoSlide($('[data-slide]'));
    segarkanEfek(el);
  }
  async function muat() {
    $('[data-slide]').innerHTML = '<div class="skel" style="height:300px;width:100%;opacity:.15;border-radius:20px"></div>';
    try { rows = await api.smvEkspor(Object.fromEntries(Object.entries(f).filter(([, v]) => v))); pilih = 0; gambarSlide(); }
    catch (e) { $('[data-slide]').innerHTML = String(kotakGalat(pesanGalat(e))); }
  }
  const progres = (n, t, teks) => {
    const w = $('[data-progres]'); w.hidden = n >= t && !teks;
    $('[data-progres-teks]').textContent = teks || `Menyusun slide PM ${n} dari ${t}…`;
    $('[data-progres-isi]').style.setProperty('--w', Math.round((n / Math.max(1, t)) * 100) + '%');
  };
  el.addEventListener('change', (e) => { const x = e.target.closest('[data-f]'); if (x) { f[x.dataset.f] = x.value; muat(); } });
  el.addEventListener('input', debounce((e) => { if (e.target.matches('[data-cari]')) { cari = e.target.value.trim().toLowerCase(); gambarSlide(); } }, 250));
  el.addEventListener('click', async (e) => {
    const pl = e.target.closest('[data-pilih]'); if (pl) { pilih = Number(pl.dataset.pilih); return gambarSlide(); }
    const gs = e.target.closest('[data-geser]'); if (gs && rows.length) { pilih = (pilih + Number(gs.dataset.geser) + rows.length) % rows.length; return gambarSlide(); }
    const b = e.target.closest('[data-pptx], [data-excel], [data-cetak]'); if (!b) return;
    if (!rows.length) return toast('Belum ada isian terverifikasi untuk diekspor.', 'peringatan');
    const pulih = tombolMuat(b, 'Menyiapkan…');
    try {
      if (b.matches('[data-pptx]')) {
        progres(0, rows.length, 'Memuat pustaka PowerPoint…');
        await buatPptx(rows, { foto: $('[data-foto]').checked, ket: ketFilter(), ringkas: ringkas(), progres });
        progres(rows.length, rows.length);
        toast(`PPTX ${angka(rows.length * 2 + 1)} slide terunduh.${modePratinjau ? ' (data contoh)' : ''}`, 'sukses', 'Ekspor selesai');
      } else if (b.matches('[data-excel]')) {
        await unduhExcel(namaUnduhan('Supermonev-Laporan'), [
          { nama: 'Ringkasan', kolom: ['URAIAN', 'NILAI'], data: [['Filter', ketFilter()], ['Jumlah PM', rows.length], ['Usaha berhasil', ringkas().berhasil], ['Rata-rata kenaikan pendapatan', ringkas().naik],
            ...URUT_HASIL.map((k) => [HASIL[k].l, rows.filter((r) => r.hasil === k).length])] },
          { nama: 'Per PM', kolom: ['NAMA PM', 'NIK', 'POKJA', 'KAB/KOTA', 'PROVINSI', 'PUTARAN', 'TGL KUNJUNGAN', 'HASIL', 'USAHA BERJALAN', 'JENIS USAHA', 'PENDAPATAN KOTOR', 'PENGELUARAN',
            'PENDAPATAN BERSIH', 'SEBELUM BANTUAN', 'PERUBAHAN (%)', 'TAMBAH PEKERJA', 'KONDISI BARANG', 'MODAL USAHA', 'SUMBER MODAL', 'RINGKASAN KENDALA', 'KATEGORI KENDALA', 'PETUGAS', 'VERIFIKATOR'],
          data: rows.map((r) => [r.nama, r.nik, r.pokja_nama, r.kabkota, r.provinsi, r.putaran, r.tgl_kunjungan, HASIL[r.hasil]?.l, r.usaha_berjalan ? 'Ya' : 'Tidak', r.usaha_berubah ? 'Berubah: ' + (r.usaha_baru || '') : 'Sama',
            r.pendapatan_kotor, r.pengeluaran, r.pendapatan_bersih, r.dasar_pendapatan, r.kenaikan, r.tambah_pekerja, r.kondisi_barang, r.modal_usaha, r.sumber_modal, r.ringkasan_kendala, (r.kategori_kendala || []).join('; '), r.petugas_nama, r.diverifikasi_nama]) }]);
        toast('Excel laporan Supermonev terunduh.');
      } else {
        const w = document.createElement('div'); w.className = 'cetak-slide'; document.body.appendChild(w);
        const gaya = document.createElement('style'); gaya.textContent = '@page { size: A4 landscape; margin: 8mm; }'; document.head.appendChild(gaya);
        w.innerHTML = String(html`${rows.map((r) => html`<div class="halaman-slide">${slide1(r)}</div><div class="halaman-slide">${slide2(r)}</div>`)}`);
        await Promise.all([...w.querySelectorAll('img[data-gambar-slide]')].map(async (img) => { try { const r = await ambilBerkas(img.dataset.gambarSlide); if (r.blob) { img.src = URL.createObjectURL(r.blob); await img.decode().catch(() => {}); } } catch { img.remove(); } }));
        document.documentElement.classList.add('mencetak-slide');
        const selesai = () => { document.documentElement.classList.remove('mencetak-slide'); w.remove(); gaya.remove(); removeEventListener('afterprint', selesai); };
        addEventListener('afterprint', selesai);
        setTimeout(() => window.print(), 60);
        toast('Pada jendela cetak, pilih "Simpan sebagai PDF" bila ingin berkas PDF.', 'info');
      }
    } catch (err) { $('[data-progres]').hidden = true; toast(pesanGalat(err), 'galat', 'Ekspor gagal'); }
    pulih();
  });
  document.addEventListener('keydown', geserPanah);
  function geserPanah(e) { if (!el.isConnected) return document.removeEventListener('keydown', geserPanah); if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName)) return; if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { if (!rows.length) return; pilih = (pilih + (e.key === 'ArrowRight' ? 1 : -1) + rows.length) % rows.length; gambarSlide(); } }
  await muat();
  return () => document.removeEventListener('keydown', geserPanah);
}
