// Bagian bersama Data Aster & Input Aster: 26 kolom sesuai FORMAT ASTER.xlsx.
import { html, raw, tanggalJam } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { toast } from '../core/ui.js';
import { PROVINSI, bukaFormulir } from './_t34.js';

// k = kolom data · x = judul kolom FORMAT ASTER.xlsx
export const KOLOM_ASTER = [
  { k: 'batch', x: 'BATCH', wajib: true }, { k: 'jenis_batch', x: 'JENIS BATCH' },
  { k: 'nik_target', x: 'NIK TARGET SURVEI', wajib: true }, { k: 'no_kk_target', x: 'NO KK TARGET SURVEI' }, { k: 'nama_target', x: 'NAMA TARGET SURVEI', wajib: true },
  { k: 'kepala_keluarga', x: 'KEPALA KELUARGA' }, { k: 'nik_pensurvei', x: 'NIK PENSURVEI' }, { k: 'nama_pensurvei', x: 'NAMA PENSURVEI' },
  { k: 'instansi_pensurvei', x: 'INSTANSI PENSURVEI' }, { k: 'satker_pensurvei', x: 'SATKER PENSURVEI' }, { k: 'hp_pensurvei', x: 'NO HP PENSURVEI' },
  { k: 'tgl_survei', x: 'TANGGAL DISURVEI', alias: ['TANGGAL SURVEI'] }, { k: 'status_survei', x: 'STATUS SURVEI' },
  { k: 'provinsi', x: 'PROVINSI RUMAH', alias: ['PROVINSI'] }, { k: 'kabkota', x: 'KABUPATEN/KOTA RUMAH', alias: ['KABUPATEN/KOTA'] },
  { k: 'kecamatan', x: 'KECAMATAN RUMAH', alias: ['KECAMATAN'] }, { k: 'kelurahan', x: 'KELURAHAN RUMAH', alias: ['KELURAHAN'] },
  { k: 'alamat', x: 'ALAMAT RUMAH', alias: ['ALAMAT'] }, { k: 'dusun', x: 'DUSUN' }, { k: 'rt', x: 'RT' }, { k: 'rw', x: 'RW' },
  { k: 'latitude', x: 'LATITUDE' }, { k: 'longitude', x: 'LONGITUDE' }, { k: 'ragam_ppks', x: 'RAGAM PPKS' }, { k: 'jenis_ppks', x: 'JENIS PPKS' },
];

/** ISO → "YYYY-MM-DDTHH:mm" waktu Jakarta (untuk input datetime-local). */
export function keWib(v) {
  if (!v) return '';
  const d = new Date(v); if (isNaN(d)) return String(v).slice(0, 16);
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour === '24' ? '00' : p.hour}:${p.minute}`;
}

export const defsAster = () => [
  { judul: 'Batch', kolom: [{ k: 'batch', l: 'BATCH', wajib: true, ph: 'mis. ASTER TSKPO 2026 (REGISTER)' }, { k: 'jenis_batch', l: 'Jenis batch', ph: 'mis. asesmen tskpo' }] },
  { judul: 'Target Survei', kolom: [
    { k: 'nik_target', l: 'NIK target survei', wajib: true, tipe: 'angka', maks: 16, help: '16 digit angka' },
    { k: 'no_kk_target', l: 'No. KK target survei', tipe: 'angka', maks: 16 },
    { k: 'nama_target', l: 'Nama target survei', wajib: true }, { k: 'kepala_keluarga', l: 'Kepala keluarga', tipe: 'pilih', opsi: ['Ya', 'Tidak'] },
    { k: 'ragam_ppks', l: 'Ragam PPKS', lebar: true, help: 'Pisahkan dengan koma, mis. Gelandangan, Pengemis, Pemulung' }, { k: 'jenis_ppks', l: 'Jenis PPKS (utama)', ph: 'mis. Pemulung' },
  ] },
  { judul: 'Pensurvei (Pendamping Lapangan)', kolom: [
    { k: 'nama_pensurvei', l: 'Nama pensurvei' }, { k: 'nik_pensurvei', l: 'NIK pensurvei', tipe: 'angka', maks: 16 },
    { k: 'instansi_pensurvei', l: 'Instansi pensurvei' }, { k: 'satker_pensurvei', l: 'Satker pensurvei' }, { k: 'hp_pensurvei', l: 'No. HP pensurvei', tipe: 'tel' },
  ] },
  { judul: 'Survei & Alamat Rumah', kolom: [
    { k: 'tgl_survei', l: 'Tanggal & jam disurvei (WIB)', tipe: 'waktu' }, { k: 'status_survei', l: 'Status survei', ph: 'mis. Lanjut Survey' },
    { k: 'provinsi', l: 'Provinsi rumah', tipe: 'pilih', opsi: PROVINSI }, { k: 'kabkota', l: 'Kabupaten/Kota rumah', tipe: 'kabkota' },
    { k: 'kecamatan', l: 'Kecamatan' }, { k: 'kelurahan', l: 'Kelurahan/Desa' }, { k: 'alamat', l: 'Alamat rumah', tipe: 'area', lebar: true, baris: 2 },
    { k: 'dusun', l: 'Dusun' }, { k: 'rt', l: 'RT' }, { k: 'rw', l: 'RW' }, { k: 'latitude', l: 'Latitude', ph: '-6.19548' }, { k: 'longitude', l: 'Longitude', ph: '106.14852' },
  ] },
];

export function bukaFormAster({ lama = null, onSimpan }) {
  const data = lama ? { ...lama, tgl_survei: keWib(lama.tgl_survei), ragam_ppks: (lama.ragam_ppks || []).join(', ') } : {};
  return bukaFormulir({
    judul: lama ? `Ubah Data Aster · ${lama.nama_target}` : 'Tambah Data Aster', defs: defsAster(), data, label: lama ? 'Simpan perubahan' : 'Simpan sebagai draft',
    atas: lama?.catatan_verifikasi ? String(html`<div class="info-card emas" style="margin-bottom:16px">${raw(ikon('msg', 20, 'ik'))}<span><b>Catatan Kapokja Data:</b> ${lama.catatan_verifikasi}</span></div>`) : '',
    simpan: async (o) => { const r = await api.simpanAster({ ...o, id: lama?.id }); toast(lama ? 'Data Aster diperbarui.' : 'Data Aster tersimpan sebagai draft.'); await onSimpan?.(r); return r; },
  });
}

/** Baris unduhan (urutan 26 kolom FORMAT ASTER). Data tersamar untuk Pokja selain Data mengikuti server. */
export const barisUnduhAster = (a, i) => ({
  'NO.': i + 1, BATCH: a.batch, 'JENIS BATCH': a.jenis_batch, 'NIK TARGET SURVEI': a.nik_target, 'NO KK TARGET SURVEI': a.no_kk_target, 'NAMA TARGET SURVEI': a.nama_target,
  'KEPALA KELUARGA': a.kepala_keluarga, 'NIK PENSURVEI': a.nik_pensurvei, 'NAMA PENSURVEI': a.nama_pensurvei, 'INSTANSI PENSURVEI': a.instansi_pensurvei,
  'SATKER PENSURVEI': a.satker_pensurvei, 'NO HP PENSURVEI': a.hp_pensurvei, 'TANGGAL DISURVEI': a.tgl_survei ? keWib(a.tgl_survei).replace('T', ' ') : '',
  'STATUS SURVEI': a.status_survei, 'PROVINSI RUMAH': a.provinsi, 'KABUPATEN/KOTA RUMAH': a.kabkota, 'KECAMATAN RUMAH': a.kecamatan, 'KELURAHAN RUMAH': a.kelurahan,
  'ALAMAT RUMAH': a.alamat, DUSUN: a.dusun, RT: a.rt, RW: a.rw, LATITUDE: a.latitude, LONGITUDE: a.longitude, 'RAGAM PPKS': (a.ragam_ppks || []).join(', '), 'JENIS PPKS': a.jenis_ppks,
});

export const waktuSurvei = (v) => (v ? tanggalJam(v) : '—');
