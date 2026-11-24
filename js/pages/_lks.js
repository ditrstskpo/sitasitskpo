// Bagian bersama Data LKS & Input LKS: definisi formulir (berdasarkan FORMAT LKS.xlsx), detail + unggah foto/berkas,
// pemetaan kolom impor, dan kolom unduhan.
import { html, raw, angka, tanggalJam } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { bukaModal, toast, pesanGalat, tombolMuat, konfirmasi, chipPokja } from '../core/ui.js';
import { galeriFoto, daftarBerkas, pasangUnggah, muatGambarMini } from '../core/unggah.js';
import { pastikanTip } from '../core/efek.js';
import { LKS_OPSI, KLASTER, PROVINSI, bukaFormulir, status, chipKlaster, tagAkr, n0, ya } from './_t34.js';

export const FOTO_LKS = [['foto_depan', 'Foto gedung tampak depan'], ['foto_papan', 'Foto papan nama LKS'], ['foto_pm', 'Foto kondisi PM di dalam lembaga']];
export const DOK_LKS = [['administrasi', 'Dokumen administrasi & legalitas', 'Izin operasional, tanda daftar, akta, SK AHU'], ['bnba_lks', 'Data BNBA PM LKS', 'Daftar PM dalam/luar lembaga'],
  ['sdm_lks', 'Data SDM LKS', 'Daftar pengurus & pekerja sosial'], ['lainnya', 'Berkas lainnya', '']];

export function defsLks({ pokjaPilihan = null } = {}) {
  return [
    ...(pokjaPilihan ? [{ judul: 'Pokja Penginput', kolom: [{ k: 'pokja_id', l: 'Diinput atas nama Pokja', tipe: 'pilih', opsi: pokjaPilihan, wajib: true, lebar: true, kosong: null }] }] : []),
    { judul: 'Identitas LKS', kolom: [
      { k: 'nama', l: 'Nama LKS', wajib: true, lebar: true, ph: 'mis. Yayasan Pelita Harapan' },
      { k: 'alamat', l: 'Alamat lengkap', tipe: 'area', lebar: true, baris: 2 },
      { k: 'provinsi', l: 'Provinsi', tipe: 'pilih', opsi: PROVINSI, help: 'Wajib sebelum diajukan' },
      { k: 'kabkota', l: 'Kabupaten/Kota', ph: 'mis. Kota Bogor', help: 'Wajib sebelum diajukan' },
      { k: 'ketua', l: 'Nama ketua LKS' }, { k: 'telepon', l: 'Nomor telepon / HP LKS', tipe: 'tel' },
      { k: 'tahun_berdiri', l: 'Tahun berdiri', tipe: 'angka', ph: 'mis. 2007' }, { k: 'no_induk', l: 'Nomor induk LKS' },
    ] },
    { judul: 'Legalitas & Akreditasi', kolom: [
      { k: 'status_hukum', l: 'Status badan hukum', tipe: 'pilih', opsi: LKS_OPSI.status_hukum },
      { k: 'status_operasional', l: 'Status operasional', tipe: 'pilih', opsi: LKS_OPSI.status_operasional },
      { k: 'akreditasi', l: 'Akreditasi', tipe: 'pilih', opsi: LKS_OPSI.akreditasi },
      { k: 'akreditasi_tahun', l: 'Tahun akreditasi', tipe: 'angka' },
    ] },
    { judul: 'Layanan', ket: 'Pilih klaster TSKPO yang benar-benar dilayani LKS ini.', kolom: [
      { k: 'klaster', l: 'Klaster TSKPO yang dilayani', tipe: 'multi', opsi: KLASTER, lebar: true },
      { k: 'non_tskpo', l: 'LKS juga melayani di luar TSKPO (anak, lansia, disabilitas, dll.) — multi layanan', tipe: 'sakelar', lebar: true },
      { k: 'jenis_layanan', l: 'Jenis layanan', tipe: 'multi', opsi: LKS_OPSI.jenis_layanan, lebar: true },
      { k: 'bentuk_layanan', l: 'Bentuk layanan', tipe: 'pilih', opsi: LKS_OPSI.bentuk_layanan },
      { k: 'wilayah_jangkauan', l: 'Wilayah jangkauan', tipe: 'pilih', opsi: LKS_OPSI.wilayah_jangkauan },
    ] },
    { judul: 'Kapasitas & Penerima Manfaat', kolom: [
      { k: 'daya_tampung', l: 'Daya tampung dalam lembaga', tipe: 'angka' }, { k: 'jumlah_pengurus', l: 'Jumlah pengurus', tipe: 'angka' },
      { k: 'pm_laki', l: 'PM laki-laki saat ini', tipe: 'angka' }, { k: 'pm_perempuan', l: 'PM perempuan saat ini', tipe: 'angka' },
      { k: 'pm_dalam', l: 'PM di dalam lembaga', tipe: 'angka' }, { k: 'pm_luar', l: 'PM di luar lembaga', tipe: 'angka' },
    ] },
    { judul: 'Asesmen & Keterangan', kolom: [
      { k: 'status_asesmen', l: 'Status asesmen', tipe: 'pilih', opsi: [['sudah', 'Sudah diasesmen'], ['belum', 'Belum diasesmen']], kosong: null },
      { k: 'as_tgl', l: 'Tanggal asesmen', tipe: 'tanggal' },
      { k: 'as_petugas_nama', l: 'Nama petugas asesmen' }, { k: 'as_petugas_hp', l: 'HP petugas asesmen', tipe: 'tel' },
      { k: 'as_satker', l: 'Satuan kerja petugas', lebar: true },
      { k: 'dt_kepemilikan', l: 'Status kepemilikan tanah & bangunan' }, { k: 'dt_sumber_dana', l: 'Sumber dana LKS' },
      { k: 'dt_program', l: 'Program / kegiatan yang tersedia', tipe: 'area', lebar: true, baris: 2 },
      { k: 'dt_permasalahan', l: 'Permasalahan & kebutuhan dukungan', tipe: 'area', lebar: true, baris: 2 },
    ] },
  ];
}

/** Data formulir dari baris LKS. */
export const keFormulir = (l = {}) => ({
  ...l, status_asesmen: l.status_asesmen || 'sudah',
  as_tgl: l.asesmen?.tgl, as_petugas_nama: l.asesmen?.petugas_nama, as_petugas_hp: l.asesmen?.petugas_hp, as_satker: l.asesmen?.satker,
  dt_kepemilikan: l.detail?.kepemilikan, dt_sumber_dana: l.detail?.sumber_dana, dt_program: l.detail?.program, dt_permasalahan: l.detail?.permasalahan,
});
/** Objek formulir → data simpan_lks (asesmen & detail digabung, nilai lama tetap). */
export function dariFormulir(o, lama = {}) {
  const d = { ...o };
  d.asesmen = { ...(lama.asesmen || {}), tgl: o.as_tgl, petugas_nama: o.as_petugas_nama, petugas_hp: o.as_petugas_hp, satker: o.as_satker };
  d.detail = { ...(lama.detail || {}), kepemilikan: o.dt_kepemilikan, sumber_dana: o.dt_sumber_dana, program: o.dt_program, permasalahan: o.dt_permasalahan };
  Object.keys(d).filter((k) => /^(as|dt)_/.test(k)).forEach((k) => delete d[k]);
  if (lama.id) d.id = lama.id;
  return d;
}

export function bukaFormLks({ lama = null, pokjaPilihan = null, onSimpan }) {
  return bukaFormulir({
    judul: lama ? `Ubah LKS · ${lama.kode}` : 'Tambah LKS Baru', defs: defsLks({ pokjaPilihan: lama ? null : pokjaPilihan }), data: keFormulir(lama || { status_asesmen: 'sudah' }),
    label: lama ? 'Simpan perubahan' : 'Simpan sebagai draft',
    atas: String(html`<div class="info-card biru" style="margin-bottom:18px">${raw(ikon('info', 20, 'ik'))}<span>LKS tersimpan sebagai <b>Draft</b>. Setelah data dan foto lengkap,
      tekan <b>Ajukan Verifikasi</b>; Kapokja Data atau Kapokja TU akan memeriksanya. Foto & berkas diunggah di jendela detail setelah disimpan.</span></div>`),
    simpan: async (o) => {
      const r = await api.simpanLks(dariFormulir(o, lama || {}));
      toast(lama ? 'Perubahan LKS tersimpan.' : `LKS ${r.kode} tersimpan sebagai draft.`);
      (r.peringatan || []).forEach((p) => toast(p, 'peringatan', 'Periksa data ganda'));
      await onSimpan?.(r);
      return r;
    },
  });
}

const kv = (l, v) => html`<div><dt>${l}</dt><dd>${v == null || v === '' ? '—' : v}</dd></div>`;

/** Jendela detail LKS: profil, foto & berkas (unggah langsung), dan tombol alur. */
export async function lihatLks(id, { onUbah } = {}) {
  const m = bukaModal({ judul: 'Detail LKS', ukuran: 'besar', isi: '<div class="skel" style="height:320px;border-radius:16px"></div>' });
  pastikanTip();
  let l;
  const gambar = async () => {
    l = await api.detailLks(id);
    m.el.querySelector('h2').textContent = `${l.kode} · ${l.nama}`;
    const b = l.berkas || [], boleh = l.boleh_ubah;
    m.body.innerHTML = String(html`
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:16px">${status(l.status_verifikasi)}${chipPokja({ nama_pendek: l.pokja_nama, warna: l.warna, warna_tint: l.warna_tint, warna_teks: l.warna_teks }, 'Pokja ' + l.pokja_nama)}
        <span class="badge b-proc">${l.jenis_lks || '—'}</span>${l.status_asesmen === 'belum' ? html`<span class="badge b-wait">Belum diasesmen</span>` : ''}</div>
      ${l.catatan_verifikasi ? html`<div class="info-card ${l.status_verifikasi === 'perlu_perbaikan' ? 'emas' : ''}" style="margin-bottom:16px">${raw(ikon('msg', 20, 'ik'))}<span><b>Catatan verifikasi:</b> ${l.catatan_verifikasi}</span></div>` : ''}
      <dl class="kv">
        ${kv('Alamat', l.alamat)}${kv('Kab/Kota · Provinsi', [l.kabkota, l.provinsi].filter(Boolean).join(' · '))}${kv('Ketua', l.ketua)}${kv('Telepon', l.telepon)}
        ${kv('Tahun berdiri', l.tahun_berdiri)}${kv('Nomor induk', l.no_induk)}${kv('Status badan hukum', l.status_hukum)}${kv('Status operasional', l.status_operasional)}
        ${kv('Akreditasi', html`${tagAkr(l.akreditasi)} ${l.akreditasi_tahun || ''}`)}${kv('Bentuk layanan', l.bentuk_layanan)}${kv('Wilayah jangkauan', l.wilayah_jangkauan)}
        ${kv('Jenis layanan', (l.jenis_layanan || []).join(', '))}
        <div style="grid-column:1/-1"><dt>Klaster TSKPO dilayani</dt><dd>${l.klaster?.length ? chipKlaster(l.klaster) : '—'} ${l.non_tskpo ? html`<span class="badge b-proc kecil">+ layanan non-TSKPO</span>` : ''}</dd></div>
        ${kv('Daya tampung', n0(l.daya_tampung))}${kv('Jumlah pengurus', n0(l.jumlah_pengurus))}
        ${kv('PM laki-laki / perempuan', `${n0(l.pm_laki)} / ${n0(l.pm_perempuan)}`)}${kv('PM dalam / luar lembaga', `${n0(l.pm_dalam)} / ${n0(l.pm_luar)}`)}
        ${kv('Petugas asesmen', [l.asesmen?.petugas_nama, l.asesmen?.satker].filter(Boolean).join(' · '))}${kv('Tanggal asesmen', l.asesmen?.tgl)}
        ${kv('Diinput oleh', `${l.dibuat_oleh_nama || '—'} · ${l.sumber === 'impor' ? 'impor Excel' : 'formulir web'}`)}
        ${kv('Diverifikasi', l.diverifikasi_nama ? `${l.diverifikasi_nama} (${l.diverifikasi_pokja || ''}) · ${tanggalJam(l.diverifikasi_pada)}` : '—')}
      </dl>
      <h3 style="font-size:1.0625rem;margin:24px 0 12px;display:flex;gap:8px;align-items:center">${raw(ikon('camera', 20))} Foto LKS
        <small class="redup" style="font-weight:500">${boleh ? '· unggah langsung dari kamera/galeri, otomatis dikecilkan ≤ 500 KB' : ''}</small></h3>
      <div class="galeri-grid">${FOTO_LKS.map(([j, judul]) => galeriFoto({ konteks: 'lks', ref: l.id, jenis: j, judul, maks: 1, berkas: b.filter((x) => x.jenis === j), boleh, ket: 'Maks 1 foto · JPG/PNG' }))}</div>
      <h3 style="font-size:1.0625rem;margin:24px 0 12px;display:flex;gap:8px;align-items:center">${raw(ikon('paperclip', 20))} Berkas pendukung</h3>
      <div class="grid grid-2" style="gap:12px">${DOK_LKS.map(([j, judul, ket]) => daftarBerkas({ konteks: 'lks', ref: l.id, jenis: j, judul, ket, berkas: b, boleh }))}</div>`);
    const kaki = [];
    kaki.push(html`<button class="btn btn-ghost" data-batal>Tutup</button>`);
    if (l.boleh_ubah) {
      if (['draft', 'perlu_perbaikan'].includes(l.status_verifikasi) && !l.jumlah_berkas) kaki.push(html`<button class="btn btn-ghost" data-hapus-lks style="color:var(--merah)">${raw(ikon('trash', 18))} Hapus</button>`);
      kaki.push(html`<button class="btn btn-secondary" data-ubah-lks>${raw(ikon('pencil', 18))} Ubah data</button>`);
      if (['draft', 'perlu_perbaikan'].includes(l.status_verifikasi)) kaki.push(html`<button class="btn btn-primary" data-ajukan-lks>${raw(ikon('send', 18))} Ajukan Verifikasi</button>`);
    }
    if (l.boleh_verifikasi) kaki.push(html`<button class="btn btn-secondary" data-kembali-lks>${raw(ikon('undo', 18))} Kembalikan</button><button class="btn btn-primary" data-setuju-lks>${raw(ikon('check', 18))} Setujui & Terbitkan</button>`);
    let foot = m.el.querySelector('.modal-foot');
    if (!foot) { foot = document.createElement('div'); foot.className = 'modal-foot'; m.el.appendChild(foot); }
    foot.innerHTML = String(html`${kaki}`);
    foot.querySelector('[data-batal]').onclick = m.tutup;
    muatGambarMini(m.body);
  };
  const ulang = async () => { try { await gambar(); onUbah?.(); } catch (e) { toast(pesanGalat(e), 'galat'); } };
  pasangUnggah(m.body, { muatUlang: ulang, judulJenis: Object.fromEntries([...FOTO_LKS, ...DOK_LKS]) });
  m.el.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-ubah-lks],[data-ajukan-lks],[data-setuju-lks],[data-kembali-lks],[data-hapus-lks]'); if (!t) return;
    if (t.matches('[data-ubah-lks]')) return bukaFormLks({ lama: l, onSimpan: ulang });
    if (t.matches('[data-hapus-lks]')) {
      const k = await konfirmasi({ judul: 'Hapus LKS?', pesan: `Draft "${l.nama}" dihapus permanen.`, label: 'Hapus', bahaya: true }); if (!k.ok) return;
      try { await api.hapusLks(l.id); toast('LKS dihapus.'); m.tutup(); onUbah?.(); } catch (err) { toast(pesanGalat(err), 'galat'); }
      return;
    }
    const pulih = tombolMuat(t, 'Memproses…');
    try {
      if (t.matches('[data-ajukan-lks]')) {
        if (!(l.berkas || []).some((x) => x.jenis.startsWith('foto_'))) {
          const k = await konfirmasi({ judul: 'Belum ada foto', pesan: 'LKS ini belum memiliki foto. Tetap ajukan verifikasi?', label: 'Tetap ajukan' });
          if (!k.ok) return pulih();
        }
        await api.ajukanLks(l.id); toast('LKS diajukan. Kapokja Data dan Kapokja TU mendapat notifikasi.');
      } else if (t.matches('[data-setuju-lks]')) { await api.verifikasiLks(l.id, true); toast('LKS terverifikasi dan masuk rekap resmi Data LKS.'); }
      else {
        pulih();
        const k = await konfirmasi({ judul: 'Kembalikan LKS', pesan: 'LKS dikembalikan ke Pokja penginput untuk diperbaiki.', label: 'Kembalikan', alasan: { label: 'Catatan perbaikan', wajib: true } });
        if (!k.ok) return;
        await api.verifikasiLks(l.id, false, k.alasan); toast('LKS dikembalikan dengan catatan.');
      }
      await ulang();
    } catch (err) { toast(pesanGalat(err), 'galat'); pulih(); }
  });
  try { await gambar(); } catch (e) { m.body.innerHTML = String(html`<div class="galat">${raw(ikon('alert', 20))}<span>${pesanGalat(e)}</span></div>`); }
  return m;
}

// ---------------------------------------------------------------- impor dari FORMAT LKS.xlsx (ekspor Google Form)
const KLASTER_KOLOM = [['kl1', 'BWBLP UMUM', 'BWBLP Umum'], ['kl2', 'BWBLP EKS NAPITER', 'BWBLP Eks Napiter', ['BWBLP EKS NAPlTER']], ['kl3', 'GELANDANGAN', 'Gelandangan'],
  ['kl4', 'PENGEMIS', 'Pengemis', ['PENGEMlS']], ['kl5', 'PEMULUNG', 'Pemulung'], ['kl6', 'KPO', 'KPO'], ['kl7', 'PMIB', 'PMIB', ['PMlB']], ['kl8', 'EKS WTS', 'Eks WTS'], ['kl9', 'KTK', 'KTK']];
export const KOLOM_IMPOR_LKS = [
  { k: 'nama', x: 'Nama LKS', wajib: true }, { k: 'alamat', x: 'Alamat Lengkap LKS', alias: ['Alamat'] }, { k: 'provinsi', x: 'Provinsi' }, { k: 'kabkota', x: 'Kab/Kota', alias: ['Kabupaten/Kota'] },
  { k: 'ketua', x: 'Nama Ketua LKS' }, { k: 'telepon', x: 'Nomor Telepon / Hp LKS', alias: ['Telepon'] }, { k: 'tahun_berdiri', x: 'Tahun Berdiri LKS' },
  { k: 'status_hukum', x: 'Status LKS', alias: ['Status Badan Hukum'] }, { k: 'status_operasional', x: 'Status Operasional' }, { k: 'no_induk', x: 'Nomor Induk LKS' },
  { k: 'akreditasi', x: 'Akreditasi' }, { k: 'akreditasi_tahun', x: 'Tahun', alias: ['Tahun Akreditasi'] },
  { k: 'jenis_layanan', x: 'Jenis Layanan' }, { k: 'jenis_layanan2', x: 'KET' }, { k: 'klaster_teks', x: 'Klaster Berdasarkan Hasil Cek Berkas & Browsing', alias: ['Klaster', 'Klaster TSKPO'] },
  { k: 'multi', x: 'LKS RSTSKPO MULTI LAYANAN', alias: ['LKS RSTSKPO MULTl LAYANAN'] }, { k: 'murni', x: 'LKS RSTSKPO MURNI', alias: ['LKS RSTSKPO MURNl'] },
  ...KLASTER_KOLOM.map(([k, x, , alias]) => ({ k, x, alias })),
  { k: 'bentuk_layanan', x: 'Bentuk Layanan' }, { k: 'wilayah_jangkauan', x: 'Wilayah Jangkauan' },
  { k: 'daya_tampung', x: 'Kapasitas Layanan Dalam Lembaga (Daya Tampung LKS)', alias: ['Daya Tampung'] },
  { k: 'pm_laki', x: 'Jumlah Penerima Manfaat Laki-laki saat ini (Dalam dan Luar Lembaga)', alias: ['PM Laki-laki'] },
  { k: 'pm_perempuan', x: 'Jumlah Penerima Manfaat Perempuan saat ini  (Dalam dan Luar Lembaga)', alias: ['Jumlah Penerima Manfaat Perempuan saat ini (Dalam dan Luar Lembaga)', 'PM Perempuan'] },
  { k: 'pm_dalam', x: 'Jumlah Penerima Manfaat di Dalam Lembaga' }, { k: 'pm_luar', x: 'Jumlah Penerima Manfaat di Luar Lembaga' }, { k: 'jumlah_pengurus', x: 'Jumlah Pengurus LKS' },
  { k: 'as_petugas_nama', x: 'Nama Lengkap Petugas Asesmen' }, { k: 'as_petugas_hp', x: 'Nomor Handphone Petugas Asesmen' }, { k: 'as_tgl', x: 'Tanggal Melakukan Asesmen' },
  { k: 'as_satker', x: 'Satuan Kerja Petugas Asesmen' },
  { k: 'dt_kepemilikan', x: 'Status Kepemilikan Tanah dan Bangunan' }, { k: 'dt_program', x: 'Program / Kegiatan yang tersedia di LKS' }, { k: 'dt_sumber_dana', x: 'Sumber Dana LKS' },
  { k: 'dt_kemitraan', x: 'Kemitraan LKS' }, { k: 'dt_permasalahan', x: 'Uraikan Permasalahan dan Kebutuhan Dukungan' }, { k: 'dt_izin', x: 'Nomor Izin Operasional' },
  { k: 'dt_tanda_daftar', x: 'Tanda Daftar LKS' }, { k: 'dt_akta', x: 'Nomor Akta Notaris' }, { k: 'dt_sk_ahu', x: 'Nomor SK AHU' },
  { k: 'dt_tautan_admin', x: 'Dokumentasi Berkas-Berkas Administrasi Identitas LKS' }, { k: 'dt_tautan_bnba_dalam', x: 'Data BNBA PM (Dalam Lembaga)' },
  { k: 'dt_tautan_bnba_luar', x: 'Data BNBA PM (Luar Lembaga)' }, { k: 'dt_tautan_sdm', x: 'Data SDM LKS' }, { k: 'dt_foto_depan', x: 'Foto bangunan / gedung tampak depan' },
  { k: 'dt_foto_papan', x: 'Foto Papan nama LKS' }, { k: 'dt_foto_pm', x: 'Foto Kondisi Penerima Manfaat (PM) di Dalam Lembaga' },
];
const benar = (v) => /^(true|ya|1|v|✓|x)$/i.test(String(v ?? '').trim());
const kosongNol = (v) => (v == null || String(v).trim() === '' || String(v).trim() === '0' || String(v).trim() === '-' ? null : String(v).trim());
/** Normalkan satu baris impor ke bentuk simpan_lks / impor_lks. */
export function ubahBarisLks(o) {
  const r = { _baris: o._baris, nama: String(o.nama || '').trim(), alamat: o.alamat, provinsi: o.provinsi, kabkota: String(o.kabkota || '').trim() || null,
    ketua: kosongNol(o.ketua), telepon: kosongNol(o.telepon), tahun_berdiri: kosongNol(o.tahun_berdiri), no_induk: kosongNol(o.no_induk),
    daya_tampung: o.daya_tampung, pm_laki: o.pm_laki, pm_perempuan: o.pm_perempuan, pm_dalam: o.pm_dalam, pm_luar: o.pm_luar, jumlah_pengurus: o.jumlah_pengurus,
    akreditasi_tahun: kosongNol(o.akreditasi_tahun), status_operasional: o.status_operasional };
  const hk = String(o.status_hukum || '').toLowerCase();
  r.status_hukum = !hk ? null : /tidak|belum|non/.test(hk) ? 'Tidak berbadan hukum' : /badan hukum|berbadan/.test(hk) ? 'Berbadan hukum' : o.status_hukum;
  const ak = String(o.akreditasi || '').replace(/akreditasi/i, '').trim().toUpperCase();
  r.akreditasi = !ak ? null : /^[ABC]$/.test(ak) ? ak : /TTA|^D/.test(ak) ? 'D-TTA' : /BELUM|TIDAK/.test(ak) ? 'Belum mengajukan' : o.akreditasi;
  const bl = String(o.bentuk_layanan || '').toLowerCase();
  r.bentuk_layanan = !bl ? null : /dalam/.test(bl) && /luar/.test(bl) ? 'Dalam dan luar lembaga' : /luar/.test(bl) ? 'Luar lembaga' : /dalam/.test(bl) ? 'Dalam lembaga' : o.bentuk_layanan;
  const wj = String(o.wilayah_jangkauan || '').toLowerCase();
  r.wilayah_jangkauan = !wj.replace(/[^a-z]/g, '') ? null : /nasional/.test(wj) ? 'Nasional' : /prov/.test(wj) ? 'Provinsi' : /kab|kota/.test(wj) ? 'Kab/Kota' : o.wilayah_jangkauan;
  const kl = KLASTER_KOLOM.filter(([k]) => benar(o[k])).map(([, , nama]) => nama);
  if (!kl.length && o.klaster_teks) String(o.klaster_teks).split(/\s*[;,]\s*/).forEach((x) => { const c = KLASTER.find((y) => y.toLowerCase() === x.toLowerCase()); if (c) kl.push(c); });
  r.klaster = kl;
  r.non_tskpo = o.multi ? true : o.murni ? false : false;
  const jl = [o.jenis_layanan, o.jenis_layanan2].filter(Boolean).join(', ');
  r.jenis_layanan = jl.split(/\s*[;,]\s*/).map((x) => LKS_OPSI.jenis_layanan.find((y) => y.toLowerCase() === x.toLowerCase())).filter(Boolean);
  r.status_asesmen = o.as_petugas_nama || o.as_tgl ? 'sudah' : 'belum';
  r.asesmen = { petugas_nama: o.as_petugas_nama, petugas_hp: o.as_petugas_hp, tgl: o.as_tgl, satker: o.as_satker };
  r.detail = Object.fromEntries(Object.entries(o).filter(([k, v]) => k.startsWith('dt_') && kosongNol(v)).map(([k, v]) => [k.slice(3), String(v).trim()]));
  return r;
}

/** Kolom unduhan Excel LKS. */
export const barisUnduhLks = (l) => ({
  'Kode': l.kode, 'Nama LKS': l.nama, 'Alamat': l.alamat, 'Provinsi': l.provinsi, 'Kab/Kota': l.kabkota, 'Ketua': l.ketua, 'Telepon': l.telepon,
  'Tahun Berdiri': l.tahun_berdiri, 'Status Badan Hukum': l.status_hukum, 'Status Operasional': l.status_operasional, 'Nomor Induk': l.no_induk,
  'Akreditasi': l.akreditasi, 'Tahun Akreditasi': l.akreditasi_tahun, 'Klaster TSKPO': (l.klaster || []).join(', '), 'Jenis LKS': l.jenis_lks,
  'Jenis Layanan': (l.jenis_layanan || []).join(', '), 'Bentuk Layanan': l.bentuk_layanan, 'Wilayah Jangkauan': l.wilayah_jangkauan, 'Daya Tampung': l.daya_tampung,
  'PM Laki-laki': l.pm_laki, 'PM Perempuan': l.pm_perempuan, 'PM Dalam Lembaga': l.pm_dalam, 'PM Luar Lembaga': l.pm_luar, 'Jumlah Pengurus': l.jumlah_pengurus,
  'Status Asesmen': l.status_asesmen === 'belum' ? 'Belum diasesmen' : 'Sudah diasesmen', 'Pokja Penginput': l.pokja_nama, 'Status Verifikasi': l.status_verifikasi,
  'Jumlah Foto': l.jumlah_foto, 'Diverifikasi Oleh': l.diverifikasi_nama,
});
export { angka, ya };
