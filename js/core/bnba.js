// Definisi BNBA (format BNBA PENGAJUAN.xlsx, 40 kolom), status, tahap, dan potongan tampilan bersama
// untuk modul usulan, Master BNBA, Detail PM, Rekonsiliasi, dan Rekap.
import { html, raw, angka } from './util.js';
import { ikon } from './icons.js';
import { TAHAP_PENCAIRAN } from './tahap.js';
import * as P from './peran.js';

export const KLASTER = ['BWBLP Umum', 'BWBLP Eks Napiter', 'Gelandangan', 'Pengemis', 'Pemulung', 'KPO', 'PMIB', 'Eks WTS', 'KTK'];
export const JENIS_BANTUAN = { KWU: 'Kewirausahaan (KWU)', PHL: 'Sembako / Kebersihan Diri / Nutrisi (PHL)', PEMULANGAN: 'Pemulangan / Transportasi' };
export const URAIAN = ['BANSOS UANG', 'BANSOS BARANG'];
export const MAK = { '571111': 'Bansos Uang', '571112': 'Bansos Barang', '571113': 'Bansos Lainnya', '521219': 'Belanja Barang Non Operasional' };
export { PROVINSI } from './wilayah.js';
import { PROVINSI } from './wilayah.js';

// k = kolom basis data · x = judul kolom Excel · g = kelompok formulir
export const KOLOM = [
  { k: 'klaster_ppks', x: 'KLASTER PPKS', g: 'umum', tipe: 'pilih', opsi: KLASTER, wajib: true },
  { k: 'prov_penyaluran', x: 'PROVINSI PENYALURAN', g: 'umum', tipe: 'pilih', opsi: PROVINSI, wajib: true },
  { k: 'kota_kab_penyaluran', x: 'KOTA/KAB PENYALURAN', g: 'umum', tipe: 'kabkota', indukProv: 'prov_penyaluran', wajib: true },
  { k: 'ktp_provinsi', x: 'PROVINSI', g: 'ktp', tipe: 'pilih', opsi: PROVINSI, wajib: true },
  { k: 'ktp_kabkota', x: 'KABUPATEN/KOTA', g: 'ktp', tipe: 'kabkota', indukProv: 'ktp_provinsi', wajib: true },
  { k: 'ktp_kecamatan', x: 'KECAMATAN', g: 'ktp', wajib: true },
  { k: 'ktp_kelurahan', x: 'KELURAHAN/DESA', g: 'ktp', wajib: true },
  { k: 'ktp_jalan', x: 'NAMA JALAN/NO/RT/RW', g: 'ktp', sensitif: true, lebar: true, wajib: true },
  { k: 'dom_provinsi', x: 'PROVINSI', g: 'dom', tipe: 'pilih', opsi: PROVINSI },
  { k: 'dom_kabkota', x: 'KABUPATEN/KOTA', g: 'dom', tipe: 'kabkota', indukProv: 'dom_provinsi' },
  { k: 'dom_kecamatan', x: 'KECAMATAN', g: 'dom' },
  { k: 'dom_kelurahan', x: 'KELURAHAN/DESA', g: 'dom' },
  { k: 'dom_jalan', x: 'NAMA JALAN/NO/RT/RW', g: 'dom', sensitif: true, lebar: true },
  { k: 'nama', x: 'NAMA', g: 'profil', wajib: true },
  { k: 'nik', x: 'NIK', g: 'profil', wajib: true, tipe: 'nik' },
  { k: 'no_kk', x: 'NO. KK', g: 'profil', tipe: 'nik', sensitif: true, wajib: true },
  { k: 'no_paspor', x: 'NO. PASPOR', g: 'profil' },
  { k: 'desil', x: 'DESIL', g: 'profil', tipe: 'desil', wajib: true },
  { k: 'nama_ibu', x: 'NAMA IBU KANDUNG', g: 'profil', sensitif: true, wajib: true },
  { k: 'tempat_lahir', x: 'TEMPAT LAHIR', g: 'profil' },
  { k: 'tgl_lahir', x: 'TGL LAHIR', g: 'profil', tipe: 'tanggal', wajib: true },
  { k: 'usia', x: 'USIA', g: 'profil', otomatis: true },
  { k: 'jenis_kelamin', x: 'JENIS KELAMIN', g: 'profil', tipe: 'pilih', opsi: ['Laki-laki', 'Perempuan'] },
  { k: 'pekerjaan_ktp', x: 'PEKERJAAN DI KTP', g: 'profil' },
  { k: 'pekerjaan_kini', x: 'PEKERJAAN SAAT INI', g: 'profil' },
  { k: 'jenis_bantuan', x: 'JENIS BANTUAN', g: 'intervensi', tipe: 'pilih', opsi: Object.keys(JENIS_BANTUAN), wajib: true },
  { k: 'nilai_bantuan', x: 'NILAI BANTUAN', g: 'intervensi', tipe: 'uang', wajib: true },
  { k: 'rincian_barang', x: 'RINCIAN BARANG', g: 'intervensi', tipe: 'teks', lebar: true },
  { k: 'uraian', x: 'URAIAN', g: 'intervensi', tipe: 'pilih', opsi: URAIAN },
  { k: 'mak', x: 'MAK', g: 'intervensi', tipe: 'pilih', opsi: Object.keys(MAK), labelOpsi: MAK, wajib: true },
  { k: 'no_sk', x: 'NO SK', g: 'sk', otomatis: true },
  { k: 'tgl_sk', x: 'TGL SK', g: 'sk', otomatis: true },
  { k: 'link_sk', x: 'LINK SK', g: 'sk', otomatis: true },
  { k: 'akun_bantuan', x: 'AKUN BANTUAN', g: 'keu', otomatis: true },
  { k: 'no_sp2d', x: 'NO SP2D', g: 'keu', otomatis: true },
  { k: 'tgl_sp2d', x: 'TGL SP2D', g: 'keu', otomatis: true },
  { k: 'bulan_sp2d', x: 'BULAN (SP2D)', g: 'keu', otomatis: true },
  { k: 'rek_giro_bni', x: 'NOMOR REK GIRO BANSOS BNI', g: 'keu', otomatis: true },
  { k: 'nama_bank', x: 'NAMA BANK', g: 'keu', otomatis: true },
  { k: 'nomor_rekening', x: 'NOMOR REKENING', g: 'keu', otomatis: true, sensitif: true },
  { k: 'nama_pemilik_rek', x: 'NAMA DAN NOMOR REKENING', g: 'keu', otomatis: true },
];
export const GRUP = {
  umum: 'Umum', ktp: 'Alamat KTP', dom: 'Alamat Domisili (opsional — isi bila berbeda dengan KTP)', profil: 'Profil PPKS',
  intervensi: 'Rencana Intervensi', ekonomi: 'Data Dasar Ekonomi (Sebelum Bantuan)', sk: 'Keterangan SK (otomatis dari Tahap 6)',
  keu: 'Keuangan (akun bantuan: Tahap 5 · nama bank & rekening: Tahap 8 SP2D)',
};
export const KOLOM_EKONOMI = [
  { k: 'pendapatan_kotor_awal', x: 'PENDAPATAN KOTOR AWAL (BLN)', g: 'ekonomi', tipe: 'uang' },
  { k: 'biaya_awal', x: 'BIAYA OPERASIONAL AWAL (BLN)', g: 'ekonomi', tipe: 'uang' },
];

const normH = (h) => String(h || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const KOLOM_IMPOR = () => [...KOLOM, ...KOLOM_EKONOMI].filter((c) => !['usia', 'nama_pemilik_rek'].includes(c.k));
/** Peta judul kolom Excel → kunci basis data. Judul alamat yang muncul dua kali: pertama = KTP, kedua = domisili.
 *  Judul berakhiran "(KTP)" / "(DOMISILI)" (hasil ekspor SITASI) juga dikenali. */
export function petakanJudul(header) {
  const sudah = new Set();
  return header.map((h) => {
    const mentah = String(h || '').toUpperCase();
    const dom = /DOMISILI/.test(mentah), ktp = /\(KTP\)/.test(mentah);
    const inti = normH(mentah.replace(/\((KTP|DOMISILI)\)/g, ''));
    if (!inti || inti === 'NO' || inti === 'NOMOR') return null;
    if (inti === 'POKJA' || inti === 'POKJAKODE') return 'pokja_kode';
    const calon = KOLOM_IMPOR().filter((c) => normH(c.x) === inti);
    const c = calon.find((x) => (dom ? x.g === 'dom' : ktp ? x.g === 'ktp' : !sudah.has(x.k)));
    if (!c) return null;
    sudah.add(c.k);
    return c.k;
  });
}

// ---------------------------------------------------------------- status
export const STATUS_USULAN = {
  draft: { l: 'Draft', c: 'b-draft', i: 'pencil' },
  menunggu: { l: 'Menunggu Verifikasi Kapokja', c: 'b-wait', i: 'clock' },
  perlu_perbaikan: { l: 'Perlu Perbaikan', c: 'b-fix', i: 'alert' },
  proses: { l: 'Dalam Proses', c: 'b-proc', i: 'refresh' },
  selesai: { l: 'Selesai (Cair)', c: 'b-ok', i: 'check-circle' },
  ditolak: { l: 'Ditolak', c: 'b-no', i: 'circle-x' },
};
export const STATUS_BNBA = {
  draft: { l: 'Draft', c: 'b-draft', i: 'pencil' },
  menunggu: { l: 'Menunggu', c: 'b-wait', i: 'clock' },
  perlu_perbaikan: { l: 'Perlu Perbaikan', c: 'b-fix', i: 'alert' },
  terverifikasi: { l: 'Terverifikasi', c: 'b-ok', i: 'check-circle' },
};
export const badge = (peta, k, teks) => {
  const s = peta[k] || { l: k || '—', c: 'b-lock', i: 'info' };
  return html`<span class="badge ${s.c}">${raw(ikon(s.i, 15))} ${teks || s.l}</span>`;
};

// ---------------------------------------------------------------- tahap
export const URUT_TAHAP = TAHAP_PENCAIRAN.map((t) => t.no);
export const infoTahap = (no) => TAHAP_PENCAIRAN.find((t) => t.no === String(no)) || { no, nama: 'Tahap ' + no, warna: '#7A8794' };
export const TAHAP_TU = ['4a', '4b', '4c', '6'];
export const TAHAP_KEU = ['5', '7', '8', '9', '10', '11'];

/** Cermin aturan basis data (app.boleh_tahap) — hanya untuk menampilkan tombol yang relevan. */
export function bolehTahap(s, pokjaId, tahap) {
  if (P.isSuperAdmin(s)) return true;
  const ef = P.pokjaEfektif(s);
  const milik = ef.some((p) => p.id === pokjaId);
  if (['1', '3'].includes(tahap)) return milik;
  if (tahap === '2') return ef.some((p) => p.id === pokjaId && p.jabatan === 'kapokja');
  if (['4a', '4b'].includes(tahap)) return P.diPokja(s, 'TU');
  if (['4c', '6'].includes(tahap)) return P.diPokja(s, 'TU') || milik;
  if (TAHAP_KEU.includes(tahap)) return P.diPokja(s, 'KEUANGAN');
  return false;
}
export const bolehPenuh = (s, pokjaId) => P.isSuperAdmin(s) || P.diPokja(s, 'KEUANGAN') || P.pokjaEfektif(s).some((p) => p.id === pokjaId);

export function chipTahap(no, { label = true, kecil = false } = {}) {
  const t = infoTahap(no);
  return html`<span class="chip-tahap ${kecil ? 'kecil' : ''}" style="--c:${t.warna};--cx:${t.teksGelap ? '#142033' : '#fff'}">
    <b>${t.no}</b>${label ? html`<span>${t.nama}</span>` : ''}</span>`;
}

/** Deret titik 11 tahap (daftar usulan). st = { '1':'selesai', '2':'aktif', ... } */
export function stepperMini(st = {}, ditolak = false) {
  return html`<span class="stepper-mini" role="img" aria-label="Posisi tahap">${URUT_TAHAP.map((no) => {
    const v = st?.[no] || 'terkunci', t = infoTahap(no);
    return html`<i class="${v}" style="--c:${t.warna}" title="Tahap ${no} · ${t.nama}: ${v}">${v === 'selesai' ? raw(ikon('check', 10)) : ''}</i>`;
  })}${ditolak ? html`<i class="tolak" title="Ditolak">${raw(ikon('x', 10))}</i>` : ''}</span>`;
}

/** Stepper besar 11 tahap (kartu pita gelap Detail Usulan). */
export function stepperBesar(st = {}) {
  return html`<ol class="stepper">${URUT_TAHAP.map((no) => {
    const v = st?.[no] || 'terkunci', t = infoTahap(no);
    return html`<li class="${v}" style="--c:${t.warna};--cx:${t.teksGelap ? '#142033' : '#fff'}">
      <span class="lingkar">${v === 'selesai' ? raw(ikon('check', 18)) : v === 'terkunci' ? raw(ikon('lock', 16)) : t.no}</span>
      <b>Tahap ${t.no}</b><small>${t.nama}</small>
      <em>${v === 'selesai' ? 'Selesai' : v === 'aktif' ? 'Aktif' : 'Terkunci'}</em></li>`;
  })}</ol>`;
}

// ---------------------------------------------------------------- format
export const rupiah = (n) => (n == null || n === '' ? '—' : 'Rp ' + angka(Math.round(Number(n))));
export function usia(tgl) {
  if (!tgl) return '';
  const d = new Date(tgl + 'T00:00:00'), n = new Date();
  let u = n.getFullYear() - d.getFullYear();
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) u--;
  return isFinite(u) ? u : '';
}
export const tglID = (v) => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '');
/** Kategori usulan → jenis bantuan yang terkunci ('' = dipilih per PM, yaitu kategori "Bantuan ATENSI" polos). Cermin app.jenis_dari_kategori. */
export function jenisDariKategori(k) {
  const t = String(k || '').toLowerCase();
  return /kewirausahaan/.test(t) ? 'KWU' : /pemulangan/.test(t) ? 'PEMULANGAN' : /sembako|nutrisi/.test(t) ? 'PHL' : '';
}
/** Total rincian barang: [{nama, jumlah, harga}] → angka. */
export const totalRincian = (items) => (items || []).reduce((a, i) => a + (Number(i.jumlah) || 1) * (Number(i.harga) || 0), 0);

/** Kolom wajib (cermin aturan submit di basis data). Kembali: daftar judul kolom yang masih kosong. */
export function kolomKurang(b) {
  const kurang = [];
  KOLOM.filter((c) => c.wajib).forEach((c) => {
    const v = b[c.k];
    let ok = v != null && String(v).trim() !== '';
    if (c.k === 'nik') ok = /^\d{16}$/.test(v || '');
    if (c.k === 'no_kk') ok = ok || !!b.no_kk_samar;     // tersamar = sudah terisi
    if (c.k === 'nama_ibu') ok = ok || !!b.nama_ibu_samar;
    if (c.k === 'ktp_jalan') ok = ok || !!b.ktp_jalan_samar;
    if (c.k === 'nilai_bantuan') ok = v != null && Number(v) > 0;
    if (c.k === 'desil') ok = /^(10|[1-9])$/.test(String(v ?? ''));
    if (!ok) kurang.push(c.g === 'ktp' ? c.x + ' (KTP)' : c.x);
  });
  return kurang;
}
export const lengkapPM = (b) => kolomKurang(b).length === 0;

export function chipPokjaU(u) {
  return html`<span class="chip-pokja" style="--c:${u.warna || '#5B6B7F'};--ct:${u.warna_tint || '#E8ECF1'};--cx:${u.warna_teks || '#3A4656'}">${u.pokja_nama || ''}</span>`;
}

/** Baris BNBA → objek ekspor 40 kolom (sesuai format Excel). */
export function barisEkspor(b, u = {}) {
  const o = { BUNDLE: u.no_register || b.no_register || '' };
  KOLOM.forEach((c) => {
    let v = b[c.k];
    if (c.k === 'usia') v = usia(b.tgl_lahir);
    if (['no_sk', 'tgl_sk', 'link_sk'].includes(c.k)) v = u[c.k] ?? b[c.k];
    if (c.sensitif) v = b[c.k] ?? b[c.k + '_samar'];
    if (c.k === 'nama_pemilik_rek') v = b.nomor_rekening || b.nomor_rekening_samar ? `${b.nama_pemilik_rek || b.nama} - ${b.nomor_rekening || b.nomor_rekening_samar}` : '';
    if (['tgl_lahir', 'tgl_sk', 'tgl_sp2d'].includes(c.k)) v = tglID(v);
    const judul = c.g === 'dom' ? c.x + ' (DOMISILI)' : c.g === 'ktp' ? c.x + ' (KTP)' : c.x;
    o[judul] = v ?? '';
  });
  return o;
}

/** Urutan kolom ekspor BNBA (jsonb dari basis data tidak menjaga urutan kunci). */
export const KOLOM_EKSPOR = ['BUNDLE', 'JUDUL USULAN', 'POKJA', ...KOLOM.map((c) => (c.g === 'dom' ? c.x + ' (DOMISILI)' : c.g === 'ktp' ? c.x + ' (KTP)' : c.x)), 'STATUS VERIFIKASI', 'TAHAP AKTIF'];
export const urutEkspor = (rows) => rows.map((r) => Object.fromEntries(KOLOM_EKSPOR.map((k) => [k, r[k] ?? ''])));

// ---------------------------------------------------------------- rekap data pencairan untuk bank (Tahap 5 & Lampiran Burekol Tahap 7)
export const KOLOM_BANK = ['NAMA', 'NIK', 'NAMA IBU KANDUNG', 'ALAMAT KTP PROVINSI', 'KABUPATEN_KOTA', 'KECAMATAN', 'KELURAHAN_DESA', 'ALAMAT LENGKAP',
  'JENIS PPKS', 'JENIS ATENSI', 'JENIS BANTUAN', 'NILAI BANTUAN', 'NO SK', 'TGL SK', 'NAMA BANK', 'NOMOR REKENING', 'NAMA DAN NOMOR REKENING', 'AKUN BANTUAN'];
/** Satu baris rekap untuk bank dari baris data_pencairan + info usulan. Nama bank & rekening kosong sampai Tahap 8. */
export function barisBank(b, u = {}) {
  const alamat = [b.ktp_jalan, b.ktp_kelurahan && 'Kel/Desa ' + b.ktp_kelurahan, b.ktp_kecamatan && 'Kec. ' + b.ktp_kecamatan, b.ktp_kabkota, b.ktp_provinsi].filter(Boolean).join(', ');
  return {
    NAMA: b.nama || '', NIK: b.nik || '', 'NAMA IBU KANDUNG': b.nama_ibu || '', 'ALAMAT KTP PROVINSI': b.ktp_provinsi || '', KABUPATEN_KOTA: b.ktp_kabkota || '',
    KECAMATAN: b.ktp_kecamatan || '', KELURAHAN_DESA: b.ktp_kelurahan || '', 'ALAMAT LENGKAP': alamat, 'JENIS PPKS': b.klaster_ppks || '',
    'JENIS ATENSI': u.kategori || '', 'JENIS BANTUAN': b.jenis_bantuan || '', 'NILAI BANTUAN': b.nilai_bantuan != null ? Number(b.nilai_bantuan) : '',
    'NO SK': u.no_sk || '', 'TGL SK': tglID(u.tgl_sk), 'NAMA BANK': b.nama_bank || '', 'NOMOR REKENING': b.nomor_rekening || '',
    'NAMA DAN NOMOR REKENING': b.nomor_rekening ? `${b.nama_pemilik_rek || b.nama} - ${b.nomor_rekening}` : '', 'AKUN BANTUAN': b.akun_bantuan || '',
  };
}
export const BANK_UMUM = ['BNI', 'BRI', 'Mandiri', 'BTN', 'BSI', 'BCA', 'CIMB Niaga', 'Bank DKI', 'Bank Jateng', 'Bank Jabar Banten (BJB)', 'Bank Jatim', 'Bank Kalsel', 'Bank Sumut', 'Bank Nagari', 'Bank Riau Kepri', 'Pos Indonesia'];
