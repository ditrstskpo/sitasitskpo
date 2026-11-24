// Impor Excel/CSV serbaguna (LKS, Aster, Pegawai): pilih berkas → kolom dikenali otomatis dari judulnya →
// Pindai (uji coba, tidak menulis apa pun) → Impor sekarang. Hasil per baris yang gagal ditampilkan agar bisa diperbaiki.
import { html, raw, angka } from './util.js';
import { ikon } from './icons.js';
import { bukaModal, toast, pesanGalat, tombolMuat } from './ui.js';
import { tabelObjek } from './komp.js';
import { bacaBerkasTabel, unduhExcel } from './xlsx.js';

const norm = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Petakan judul kolom berkas ke kunci data. kolom: [{ k, x, alias: [] }] */
export function petakanKolom(judul, kolom) {
  const peta = new Map();
  kolom.forEach((c) => [c.x, ...(c.alias || [])].forEach((a) => peta.set(norm(a), c.k)));
  const dipakai = new Set();
  return judul.map((j) => {
    const k = peta.get(norm(j));
    if (!k || dipakai.has(k)) return null;
    dipakai.add(k); return k;
  });
}

/** Cari baris judul: baris (dari 15 teratas) yang paling banyak cocok dengan judul kolom. */
function barisJudul(baris, kolom) {
  let terbaik = 0, skor = -1;
  baris.slice(0, 15).forEach((r, i) => {
    const s = petakanKolom(r, kolom).filter(Boolean).length;
    if (s > skor) { skor = s; terbaik = i; }
  });
  return terbaik;
}

/**
 * Buka modal impor.
 * opsi: { judul, ket, kolom, wajib: (o) => boolean, ubah: (o) => o, kirim: (rows, uji, opsiForm) => hasil,
 *         per: 500, opsiHtml, bacaOpsi: (el) => ({}), pratinjauKolom: [...], template: { nama, data }, onSelesai, kunciGagal }
 */
export function bukaImpor(o) {
  let data = null;
  const m = bukaModal({
    judul: o.judul, ukuran: 'besar',
    isi: String(html`<div class="info-card biru">${raw(ikon('info', 20, 'ik'))}<span>${raw(o.ket || '')}
        Kolom dikenali dari <b>judul kolom</b>, urutan bebas. Tekan <b>Pindai</b> dulu: tidak ada yang tersimpan sampai Anda menekan <b>Impor sekarang</b>.</span></div>
      ${o.template ? html`<p style="margin-top:12px"><button type="button" class="tautan-btn" data-template>${raw(ikon('sheet', 16))} Unduh template Excel</button></p>` : ''}
      ${o.opsiHtml ? html`<div style="margin-top:14px">${raw(o.opsiHtml)}</div>` : ''}
      <label class="dropzone" style="margin-top:16px">${raw(ikon('upload', 28))}<b>Pilih berkas .xlsx atau .csv</b><small>Baris judul dicari otomatis</small>
        <input type="file" hidden accept=".xlsx,.xls,.csv" data-berkas></label>
      <div data-hasil style="margin-top:16px"></div>`),
    kaki: String(html`<button class="btn btn-ghost" data-batal>Tutup</button><button class="btn btn-secondary" data-uji disabled>${raw(ikon('search', 18))} Pindai (uji coba)</button>
      <button class="btn btn-primary" data-impor disabled>${raw(ikon('upload', 18))} Impor sekarang</button>`),
  });
  const $ = (q) => m.el.querySelector(q), hasil = $('[data-hasil]');
  $('[data-template]')?.addEventListener('click', () => unduhExcel(o.template.nama, [{ nama: 'Data', kolom: o.kolom.map((c) => c.x), data: o.template.data || [] }]));
  $('[data-berkas]').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    hasil.innerHTML = '<div class="skel skel-baris"></div>';
    try {
      const { sheets } = await bacaBerkasTabel(f);
      const sh = sheets.map((s) => ({ s, hb: barisJudul(s.baris, o.kolom) }))
        .sort((a, b) => petakanKolom(b.s.baris[b.hb] || [], o.kolom).filter(Boolean).length - petakanKolom(a.s.baris[a.hb] || [], o.kolom).filter(Boolean).length)[0];
      const peta = petakanKolom(sh.s.baris[sh.hb] || [], o.kolom);
      data = sh.s.baris.slice(sh.hb + 1).map((r, i) => {
        let x = { _baris: sh.hb + i + 2 };
        peta.forEach((k, j) => { if (k && r[j] !== '' && r[j] != null) x[k] = r[j]; });
        if (o.ubah) x = o.ubah(x);
        return x;
      }).filter((x) => (o.wajib ? o.wajib(x) : Object.keys(x).length > 1));
      const dikenal = peta.filter(Boolean);
      const tak = o.kolom.filter((c) => c.wajib && !dikenal.includes(c.k)).map((c) => c.x);
      hasil.innerHTML = String(html`<div class="info-card">${raw(ikon('check-circle', 20, 'ik'))}<span>Lembar <b>${sh.s.nama}</b>: ${angka(data.length)} baris, ${dikenal.length} kolom dikenali.
        ${tak.length ? html`<b> Kolom wajib tidak ditemukan: ${tak.join(', ')}.</b>` : ''}</span></div>
        ${tabelObjek(data.slice(0, 5), o.pratinjauKolom || ['_baris', ...dikenal.slice(0, 5)])}`);
      $('[data-uji]').disabled = !data.length; $('[data-impor]').disabled = !data.length;
    } catch (err) { hasil.innerHTML = String(html`<div class="galat">${raw(ikon('alert', 20))}<span>${pesanGalat(err)}</span></div>`); }
  };
  const jalan = async (uji, btn) => {
    const pulih = tombolMuat(btn, uji ? 'Memindai…' : 'Mengimpor…');
    const total = {};
    try {
      const opsi = o.bacaOpsi ? o.bacaOpsi(m.el) : {};
      const per = o.per || 500;
      for (let i = 0; i < data.length; i += per) {
        const r = await o.kirim(data.slice(i, i + per), uji, opsi);
        for (const [k, v] of Object.entries(r || {})) {
          if (typeof v === 'number') total[k] = (total[k] || 0) + v;
          else if (Array.isArray(v)) total[k] = [...(total[k] || []), ...v];
          else total[k] = v;
        }
      }
      const gagal = total.gagal || [], ganda = total.ganda || [];
      hasil.innerHTML = String(html`<div class="ringkas-impor">
        <div><b>${angka(total.ditambah || 0)}</b><span>${uji ? 'akan ditambah' : 'ditambah'}</span></div>
        ${total.perlu_perbaikan != null ? html`<div class="${total.perlu_perbaikan ? 'emas' : ''}"><b>${angka(total.perlu_perbaikan)}</b><span>perlu diperbaiki</span></div>` : ''}
        <div><b>${angka(total.dilewati || 0)}</b><span>dilewati (sudah ada)</span></div>
        <div class="${gagal.length ? 'merah' : ''}"><b>${angka(gagal.length)}</b><span>gagal</span></div></div>
        ${total.status ? html`<p class="redup" style="margin-top:8px">Status data yang diimpor: <b>${total.status === 'terverifikasi' ? 'Terverifikasi' : 'Draft'}</b>.</p>` : ''}
        ${gagal.length ? html`<h4 style="margin:16px 0 8px">Baris yang gagal</h4>${tabelObjek(gagal.slice(0, 100), o.kunciGagal || ['baris', 'nama', 'pesan'])}` : ''}
        ${ganda.length ? html`<details style="margin-top:12px"><summary>${angka(ganda.length)} baris dilewati karena sudah ada</summary>${tabelObjek(ganda.slice(0, 100), Object.keys(ganda[0]))}</details>` : ''}`);
      if (!uji) { toast(`Impor selesai: ${angka(total.ditambah || 0)} data ditambah.`); o.onSelesai?.(total); }
    } catch (err) { toast(pesanGalat(err), 'galat'); }
    pulih();
  };
  $('[data-uji]').onclick = (e) => jalan(true, e.currentTarget);
  $('[data-impor]').onclick = (e) => jalan(false, e.currentTarget);
  return m;
}
