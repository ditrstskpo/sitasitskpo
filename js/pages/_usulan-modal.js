// Modal bersama: buat usulan baru dan impor Excel BNBA (uji coba dulu, lalu simpan).
import { html, raw, angka } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { bukaModal, toast, pesanGalat, tombolMuat } from '../core/ui.js';
import { opsi, tabelObjek } from '../core/komp.js';
import { bacaBerkasTabel, cariBarisJudul, unduhExcel } from '../core/xlsx.js';
import { petakanJudul } from '../core/bnba.js';
import { normalkanWilayah } from '../core/wilayah.js';
import { hapusCache } from '../core/store.js';
import * as P from '../core/peran.js';

export function bukaBuatUsulan(s, { onSelesai, pokjaList = [] } = {}) {
  const pk = P.pokjaEfektif(s);
  const m = bukaModal({
    judul: 'Buat Usulan Baru',
    isi: String(html`<div class="form-grid">
      <div class="field penuh"><label class="label" for="bu-judul">Judul usulan<span class="wajib">*</span></label>
        <input id="bu-judul" class="input" placeholder="Usulan BNBA ATENSI Cianjur November 2026" autofocus><div class="help">Sebut wilayah dan bulan agar mudah dicari.</div></div>
      <div class="field"><label class="label" for="bu-kat">Kategori</label><select id="bu-kat" class="select">${opsi(['Bantuan ATENSI', 'Bantuan ATENSI — Kewirausahaan', 'Bantuan ATENSI — Pemulangan', 'Bantuan ATENSI — Sembako & Nutrisi'])}</select></div>
      <div class="field"><label class="label" for="bu-pokja">Pokja pengusul</label><select id="bu-pokja" class="select" ${pk.length <= 1 && !P.isSuperAdmin(s) ? raw('disabled') : ''}>
        ${opsi((pk.length ? pk : pokjaList.filter((p) => p.kelompok === 'teknis')).map((p) => [p.id, p.nama_pendek || p.nama]), pk[0]?.id)}</select></div>
      <div class="field penuh"><label class="label" for="bu-link">Link profil asesmen</label><input id="bu-link" class="input" type="url" placeholder="https://drive.google.com/drive/folders/…">
        <div class="help">Satu link untuk seluruh PM dalam usulan. Wajib diisi sebelum submit ke Kapokja.</div></div></div>`),
    kaki: String(html`<button class="btn btn-ghost" data-batal>Batal</button><button class="btn btn-primary" data-ok>${raw(ikon('plus', 18))} Buat usulan</button>`),
  });
  m.el.querySelector('[data-ok]').onclick = async (e) => {
    const pulih = tombolMuat(e.currentTarget, 'Membuat…');
    try {
      const u = await api.simpanUsulan({ judul: m.el.querySelector('#bu-judul').value, kategori: m.el.querySelector('#bu-kat').value,
        pokja_id: m.el.querySelector('#bu-pokja').value || null, link_profil: m.el.querySelector('#bu-link').value });
      hapusCache('usulan'); m.tutup(); toast(`Usulan ${u.no_register} dibuat sebagai Draft.`);
      onSelesai?.(u);
    } catch (err) { pulih(); toast(pesanGalat(err), 'galat'); }
  };
}

/** Unduh template statis (berisi dropdown provinsi → kab/kota, MAK, desil, dll). */
export async function unduhTemplateBnba() {
  const a = document.createElement('a');
  a.href = 'assets/Template-BNBA-PENGAJUAN-SITASI.xlsx'; a.download = 'Template-BNBA-PENGAJUAN-SITASI.xlsx';
  document.body.appendChild(a); a.click(); a.remove();
}

/** Modal impor berkas Excel/CSV ke usulan Draft. */
export function bukaImporBnba(usulan, { onSelesai } = {}) {
  let data = null;
  const m = bukaModal({
    judul: 'Impor Excel BNBA', ukuran: 'besar',
    isi: String(html`<div class="info-card biru">${raw(ikon('info', 20, 'ik'))}<span>Gunakan format <b>BNBA PENGAJUAN.xlsx</b> (unduh template di halaman Workspace; berisi dropdown provinsi dan kab/kota). Usulan tujuan: <b>${usulan.judul}</b> (${usulan.no_register}).
      NIK yang sudah ada di usulan ini diperbarui, bukan digandakan. Maksimal 500 baris per kiriman, diproses bertahap.</span></div>
      <label class="dropzone" style="margin-top:16px">${raw(ikon('upload', 28))}<b>Pilih berkas .xlsx, .xls, atau .csv</b><small>Baris judul dicari otomatis (memuat NIK / NAMA)</small>
        <input type="file" hidden accept=".xlsx,.xls,.csv" data-berkas></label>
      <div data-hasil style="margin-top:16px"></div>`),
    kaki: String(html`<button class="btn btn-ghost" data-batal>Tutup</button><button class="btn btn-secondary" data-uji disabled>${raw(ikon('search', 18))} Pindai (uji coba)</button>
      <button class="btn btn-primary" data-impor disabled>${raw(ikon('upload', 18))} Impor sekarang</button>`),
  });
  const $ = (q) => m.el.querySelector(q), hasil = $('[data-hasil]');
  $('[data-berkas]').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    hasil.innerHTML = '<div class="skel skel-baris"></div>';
    try {
      const { sheets } = await bacaBerkasTabel(f);
      // Pilih lembar yang benar: bernama BNBA, atau yang judul kolomnya paling banyak dikenali (abaikan PETUNJUK/Daftar)
      const nilai = (x) => { if (x.baris.length < 2) return -1; const hb0 = cariBarisJudul(x.baris); return petakanJudul(x.baris[hb0]).filter(Boolean).length + (/^bnba$/i.test(x.nama.trim()) ? 100 : 0); };
      const sh = [...sheets].sort((a, b) => nilai(b) - nilai(a))[0];
      const hb = cariBarisJudul(sh.baris), peta = petakanJudul(sh.baris[hb]);
      const baris = sh.baris.slice(hb + 1).map((r, i) => {
        const o = { _baris: hb + i + 2 };
        peta.forEach((k, j) => { if (k && r[j] !== '') o[k] = r[j]; });
        return o;
      }).filter((o) => o.nik || o.nama);
      let diperbaiki = 0;
      for (const o of baris) for (const [pk, kk] of [['prov_penyaluran', 'kota_kab_penyaluran'], ['ktp_provinsi', 'ktp_kabkota'], ['dom_provinsi', 'dom_kabkota']]) {
        if (!o[pk] && !o[kk]) continue;
        const w = normalkanWilayah(o[pk], o[kk]);
        if (w.provinsi !== o[pk] || w.kabkota !== o[kk]) diperbaiki++;
        o[pk] = w.provinsi || undefined; o[kk] = w.kabkota || undefined;
      }
      data = baris;
      const dikenal = peta.filter(Boolean).length;
      hasil.innerHTML = String(html`<div class="info-card">${raw(ikon('check-circle', 20, 'ik'))}<span>Lembar <b>${sh.nama}</b>: ${angka(baris.length)} baris PM, ${dikenal} kolom dikenali.
        ${diperbaiki ? html` Nama wilayah disesuaikan otomatis (pencocokan kemiripan) pada ${diperbaiki} isian — mohon periksa.` : ''}
        ${dikenal < 5 ? html`<b> Periksa judul kolom — sebagian besar tidak dikenali.</b>` : ''}</span></div>
        ${tabelObjek(baris.slice(0, 5), ['_baris', 'nama', 'nik', 'klaster_ppks', 'jenis_bantuan', 'nilai_bantuan'])}`);
      $('[data-uji]').disabled = false; $('[data-impor]').disabled = false;
    } catch (err) { hasil.innerHTML = String(html`<div class="galat">${raw(ikon('alert', 20))}<span>${pesanGalat(err)}</span></div>`); }
  };
  const jalan = async (uji, btn) => {
    const pulih = tombolMuat(btn, uji ? 'Memindai…' : 'Mengimpor…');
    const total = { ditambah: 0, diperbarui: 0, gagal: [] };
    try {
      for (let i = 0; i < data.length; i += 500) {
        const r = await api.imporBnba(usulan.id, data.slice(i, i + 500), uji);
        total.ditambah += r.ditambah; total.diperbarui += r.diperbarui; total.gagal.push(...r.gagal);
        btn.lastChild.textContent = ` ${Math.min(100, Math.round(((i + 500) / data.length) * 100))}%`;
      }
      hasil.innerHTML = String(html`<div class="ringkas-impor">
        <div><b>${angka(total.ditambah)}</b><span>${uji ? 'akan ditambah' : 'ditambah'}</span></div>
        <div><b>${angka(total.diperbarui)}</b><span>${uji ? 'akan diperbarui' : 'diperbarui'}</span></div>
        <div class="${total.gagal.length ? 'merah' : ''}"><b>${angka(total.gagal.length)}</b><span>gagal</span></div></div>
        ${total.gagal.length ? html`<h4 style="margin:16px 0 8px">Baris yang perlu diperbaiki</h4>${tabelObjek(total.gagal.slice(0, 100), ['baris', 'nik', 'nama', 'alasan'])}` : ''}`);
      if (!uji) { hapusCache('usulan'); hapusCache('bnba'); toast(`Impor selesai: ${total.ditambah} PM ditambah, ${total.diperbarui} diperbarui.`); onSelesai?.(); }
    } catch (err) { toast(pesanGalat(err), 'galat'); }
    pulih();
  };
  $('[data-uji]').onclick = (e) => jalan(true, e.currentTarget);
  $('[data-impor]').onclick = (e) => jalan(false, e.currentTarget);
}
