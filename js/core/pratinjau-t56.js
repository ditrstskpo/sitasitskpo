// MODE PRATINJAU — Tahap 5 & 6 (v2.4.0). Meniru fungsi SQL SETUP_SUPABASE_TAHAP56 (Supermonev, penugasan petugas,
// verifikasi belanja, pemeriksaan keamanan, cadangan & pemulihan) agar halaman bisa dicoba tanpa server.
// Data contoh FIKTIF, tersimpan di sessionStorage browser bersama data pratinjau lainnya.
import { _dalam as I } from './adapter-pratinjau.js';
import { daftarKonteksP, siarkanP } from './pratinjau-t34.js';

const d = () => I.db;
const g = (pesan, code) => I.galat(pesan, code);
const jeda = (ms = 80) => I.tunggu(ms);
const saya = () => I.sayaAktif();
const sayaId = () => saya()?.id;
const kode = (pid) => I.pokjaById(pid)?.kode;
const teks = (v) => (v == null || String(v).trim() === '' ? null : String(v).trim());
const num = (v) => { if (v == null || v === '') return null; const n = Number(String(v).replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? n : null; };
const int = (v) => { const n = num(v); return n == null ? null : Math.round(n); };
const bool = (v) => (v === true || v === 'true' ? true : v === false || v === 'false' ? false : null);
const tgl = (v) => (teks(v) && /^\d{4}-\d{2}-\d{2}/.test(v) ? String(v).slice(0, 10) : null);
const hariIni = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
const tambahHari = (s, n) => { const x = new Date(s + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
function tambahBulan(s, n) {
  const [y, m, dd] = s.split('-').map(Number), t = new Date(Date.UTC(y, m - 1 + n, 1));
  const akhir = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(dd, akhir));
  return t.toISOString().slice(0, 10);
}
const urutkan = (rows, ...k) => rows.sort((a, b) => { for (const x of k) { const c = String(a[x] ?? '').localeCompare(String(b[x] ?? ''), 'id'); if (c) return c; } return 0; });
const hitung = (rows, fn) => { const m = new Map(); rows.forEach((r) => [].concat(fn(r)).filter((x) => x != null).forEach((k) => m.set(k, (m.get(k) || 0) + 1))); return [...m].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n); };
const halaman = (rows, f = {}) => { const per = Math.min(500, Math.max(1, Number(f.per) || 25)), hal = Math.max(1, Number(f.hal) || 1); return rows.slice((hal - 1) * per, hal * per); };
const bulat1 = (x) => Math.round(x * 10) / 10;

// v2.11.0: bawaan mingguan — minggu ke-1 = 3 bulan setelah cair, lalu setiap 7 hari (interval_hari 0 = cara lama per bulan)
const CFG_BAWAAN = { interval_bulan: 3, interval_hari: 7, mulai_bulan: 3, maks_putaran: 52, jenis_bantuan: ['KWU'], jenis_belanja: ['KWU'], tampil_sebelum_hari: 3 };
const cfg = () => ({ ...CFG_BAWAAN, ...(d().smv_cfg || {}) });
const mingguan = () => Number(cfg().interval_hari) > 0;
const labelPut = (n) => (mingguan() ? 'Minggu ke-' : 'Putaran ') + n;
const LABEL_HASIL = { berhasil: 'Berhasil', berhasil_catatan: 'Berhasil dengan Catatan', perlu_pendampingan: 'Perlu Pendampingan', tidak_berhasil: 'Tidak Berhasil' };
const labelHasil = (h) => LABEL_HASIL[h] || 'Belum dinilai';

// ---------------------------------------------------------------- peran
const isPetugas = () => I.peran() === 'petugas_supermonev' || !!(I.sayaAktif()?.juga_supermonev && I.peran() === 'pegawai');
const kapokja = (k) => I.pokjaEf().some((e) => kode(e.pokja_id) === k && e.jabatan === 'kapokja');
const bolehTugaskan = () => I.isSA() || kapokja('SUPERMONEV') || kapokja('TU');
const verifikator = () => I.isSA() || kapokja('SUPERMONEV');
const pengurus = (k, jab) => d().pengguna.filter((u) => u.aktif && d().pengguna_pokja.some((pp) => pp.pengguna_id === u.id && kode(pp.pokja_id) === k && (!jab || pp.jabatan === jab))).map((u) => u.id);
const butuhPeg = () => { if (!I.isPeg()) throw g('Akses ditolak.', '42501'); };
const ditugaskan = (bid, put = null) => d().smv_tugas.some((t) => t.bnba_id === bid && (put == null || t.putaran === put) && t.petugas_id === sayaId());
const smvTerlihat = (bid) => I.isPeg() || ditugaskan(bid);
const anggotaSmv = (uid) => d().pengguna_pokja.some((pp) => pp.pengguna_id === uid && kode(pp.pokja_id) === 'SUPERMONEV');
const statusCair = (uid) => (I.tahapU(uid, '11')?.status === 'selesai' ? 'cair' : 'proses');

// ---------------------------------------------------------------- jadwal, penilaian, kendala (port fungsi SQL)
function jadwal(sampai = null, hanya = null) {
  const c = cfg(), batas = sampai || tambahHari(hariIni(), Number(c.tampil_sebelum_hari) || 0), out = [];
  const ih = Math.max(0, Number(c.interval_hari) || 0), mb = Math.max(0, Number(c.mulai_bulan) || 0), iv = Math.max(1, Number(c.interval_bulan) || 3);
  const maks = Math.max(1, Math.min(ih > 0 ? 9999 : 24, Number(c.maks_putaran) || 4));
  for (const b of d().bnba) {
    if ((hanya && b.id !== hanya) || b.status_verifikasi !== 'terverifikasi' || !c.jenis_bantuan.includes(b.jenis_bantuan)) continue;
    const u = d().usulan.find((x) => x.id === b.usulan_id), cair = u?.tgl_cair || b.tgl_sp2d;   // data impor: TGL SP2D
    if (!u || u.status !== 'selesai' || !cair) continue;
    if (ih > 0) {   // mingguan: minggu ke-k = cair + mulai_bulan + (k − 1) × interval_hari
      const awal = tambahBulan(String(cair).slice(0, 10), mb);
      for (let k = 1; k <= maks; k++) { const jt = tambahHari(awal, ih * (k - 1)); if (jt > batas) break; out.push({ bnba_id: b.id, putaran: k, jatuh_tempo: jt }); }
    } else for (let k = 1; k <= maks; k++) { const jt = tambahBulan(String(cair).slice(0, 10), iv * k); if (jt > batas) break; out.push({ bnba_id: b.id, putaran: k, jatuh_tempo: jt }); }
  }
  return out;
}
export function nilaiSmv(berjalan, berubah, bersih, dasar) {
  if (berjalan == null) return null;
  if (!berjalan) return 'tidak_berhasil';
  if (berubah) return 'berhasil_catatan';
  if (bersih == null || dasar == null) return null;
  return bersih > dasar ? 'berhasil' : 'perlu_pendampingan';
}
const KATEGORI = [
  ['Permodalan', /(modal|dana|uang|pinjam|utang|hutang|kredit|cicil)/],
  ['Pemasaran & pembeli', /(pembeli|pelanggan|pasar|laku|sepi|promosi|pemasaran|persaingan|saingan|pesaing|jualan)/],
  ['Bahan baku & harga', /(bahan|baku|harga|mahal|stok|pasokan)/],
  ['Peralatan & sarana', /(alat|mesin|rusak|gerobak|etalase|sarana|kendaraan|motor|peralatan)/],
  ['Tempat usaha', /(tempat|lokasi|lapak|kios|sewa|gusur|izin)/],
  ['Kesehatan & keluarga', /(sakit|kesehatan|keluarga|anak|melahirkan|meninggal|lansia|disabilitas)/],
  ['Cuaca & bencana', /(hujan|cuaca|banjir|bencana|musim|kemarau)/],
  ['Keterampilan & pengelolaan', /(keterampilan|pelatihan|belum paham|pembukuan|manajemen|tidak bisa)/],
];
export function kategoriKendala(t) {
  const s = String(t || '').toLowerCase().trim();
  if (!s || /^\s*(tidak ada|tdk ada|-|nihil|aman|lancar)(\s+kendala)?(\s+(berarti|apa-apa|yang berarti))?\s*\.?\s*$/.test(s)) return [];
  const r = KATEGORI.filter(([, re]) => re.test(s)).map(([k]) => k);
  return r.length ? r : ['Lainnya'];
}
const KUNCI_KENDALA = /(modal|pembeli|sepi|harga|mahal|rusak|sakit|tempat|sewa|hujan|banjir|pinjam|utang|hutang|stok|bahan|alat|izin|saingan|pesaing|laku)/g;
export function ringkasKendala(t) {
  const s = String(t || '').replace(/\s+/g, ' ').trim();
  if (!s || !kategoriKendala(s).length) return null;   // "tidak ada kendala" → tanpa ringkasan
  let pilih = null, terbaik = -1;
  for (const k of s.split(/(?<=[.!?;])\s+|\n/).map((x) => x.trim()).filter(Boolean)) {
    const skor = (k.toLowerCase().match(KUNCI_KENDALA) || []).length;
    if (skor > terbaik) { terbaik = skor; pilih = k; }
  }
  pilih = (pilih || s).replace(/[;,]+$/, '');
  if (pilih.length > 160) pilih = pilih.slice(0, 157).replace(/[ ,;]+$/, '') + '…';
  return pilih.charAt(0).toUpperCase() + pilih.slice(1);
}
function dasar(bid) {
  const b = d().bnba.find((x) => x.id === bid);
  if (b?.pendapatan_kotor_awal != null) return { nilai: (b.pendapatan_kotor_awal || 0) - (b.biaya_awal || 0), sumber: 'bnba' };
  const s = d().supermonev.filter((x) => x.bnba_id === bid && x.dasar_pendapatan != null).sort((a, c) => a.putaran - c.putaran)[0];
  return s ? { nilai: s.dasar_pendapatan, sumber: 'isian' } : { nilai: null, sumber: null };
}
const belanjaLayak = (bid) => { const b = d().bnba.find((x) => x.id === bid); return !!b && b.status_verifikasi === 'terverifikasi' && statusCair(b.usulan_id) === 'cair' && cfg().jenis_belanja.includes(b.jenis_bantuan); };
const bolehIsiBelanja = (bid) => I.isSA() || I.diPokja('SUPERMONEV') || ditugaskan(bid);

function pmJson(b) {
  const u = d().usulan.find((x) => x.id === b.usulan_id) || {}, k = I.pokjaById(b.pokja_id) || {};
  return { bnba_id: b.id, nama: b.nama, nik: b.nik, jenis_kelamin: b.jenis_kelamin, klaster: b.klaster_ppks, jenis_bantuan: b.jenis_bantuan, nilai_bantuan: b.nilai_bantuan,
    rincian_barang: b.rincian_barang, provinsi: b.dom_provinsi || b.ktp_provinsi, kabkota: b.dom_kabkota || b.ktp_kabkota, kecamatan: b.dom_kecamatan || b.ktp_kecamatan,
    kelurahan: b.dom_kelurahan || b.ktp_kelurahan, pokja_id: b.pokja_id, pokja_nama: k.nama_pendek, warna: k.warna, warna_tint: k.warna_tint, warna_teks: k.warna_teks,
    usulan_id: u.id, no_register: u.no_register, tgl_cair: u.tgl_cair || b.tgl_sp2d || null };
}
const jumlahFoto = (id) => d().berkas.filter((q) => q.konteks === 'smv' && q.ref_id === id && !q.dihapus).length;
function smvJson(s) {
  return { ...I.salin(s), label_hasil: labelHasil(s.hasil), label_hasil_otomatis: labelHasil(s.hasil_otomatis), jumlah_foto: jumlahFoto(s.id),
    kenaikan: s.dasar_pendapatan > 0 && s.pendapatan_bersih != null ? bulat1((s.pendapatan_bersih - s.dasar_pendapatan) / s.dasar_pendapatan * 100) : null };
}
const tanpaDrive = (b) => { const o = I.salin(b); delete o.drive_id; return o; };
const bnba = (id) => d().bnba.find((x) => x.id === id);
const namaPengguna = (id) => d().pengguna.find((u) => u.id === id)?.nama || null;
const siarkan = (t, x) => { try { siarkanP(t, x); } catch {} };

// =====================================================================================
// DATA CONTOH
// =====================================================================================
const KENDALA = [
  'Modal masih kurang untuk menambah stok dagangan.',
  'Pembeli sepi karena banyak pesaing di sekitar lokasi. Perlu promosi lewat tetangga dan media sosial.',
  'Harga bahan baku naik sehingga keuntungan menipis.',
  'Gerobak mulai rusak dan perlu perbaikan roda.',
  'Musim hujan membuat lapak sering tutup lebih awal.',
  'PM sempat sakit sehingga usaha berhenti dua minggu.',
  'Belum ada tempat usaha tetap; masih berpindah-pindah.',
  'Belum bisa membuat pembukuan sederhana.',
  'Tidak ada kendala berarti.',
  'Modal habis untuk kebutuhan sekolah anak. Pembeli mulai berkurang.',
];
const PERKEMBANGAN = ['Menambah varian produk dan mulai menerima pesanan.', 'Pelanggan tetap bertambah dari lingkungan sekitar.', 'Mulai menabung sebagian keuntungan setiap minggu.',
  'Usaha berjalan stabil seperti bulan sebelumnya.', 'Merekrut satu tetangga untuk membantu produksi.'];

// Data pratinjau lama (sebelum 2.11.0, jadwal 3-bulanan): nomor putaran dipindah ke nomor minggu pada tanggal yang sama, seperti SQL Tahap 12
function pindahKeMingguan(D) {
  const ib = Math.max(1, Number(D.smv_cfg?.interval_bulan) || 3);
  const peta = (bid, k) => {
    const b = D.bnba.find((x) => x.id === bid), u = b && D.usulan.find((x) => x.id === b.usulan_id), cair = u?.tgl_cair || b?.tgl_sp2d;
    if (!cair) return k;
    const a = Date.parse(tambahBulan(String(cair).slice(0, 10), ib * k)), m = Date.parse(tambahBulan(String(cair).slice(0, 10), 3));
    return Math.max(1, Math.floor((a - m) / (7 * 864e5)) + 1);
  };
  D.supermonev.forEach((x) => { x.putaran = peta(x.bnba_id, x.putaran); });
  D.smv_tugas.forEach((x) => { x.putaran = peta(x.bnba_id, x.putaran); });
  D.smv_pengingat = D.smv_pengingat.map((k) => { const [bid, n] = k.split(':'); return bid + ':' + peta(bid, Number(n)); });
  D.smv_cfg = { ...D.smv_cfg, interval_hari: 7, mulai_bulan: 3, maks_putaran: 52, tampil_sebelum_hari: 3 };
  I.simpan();
}
function siapkan() {
  const D = d();
  if (D.supermonev) { if (D.smv_cfg && !('interval_hari' in D.smv_cfg)) pindahKeMingguan(D); return; }
  D.smv_cfg = { ...CFG_BAWAAN };
  if (D.notif_atur?.notif_matriks) D.notif_atur.notif_matriks = { SMV_JATUH_TEMPO: { wa: true, email: true }, SMV_DITUGASKAN: { wa: true, email: true }, SMV_MENUNGGU: { wa: false, email: true },
    SMV_DIKEMBALIKAN: { wa: true, email: true }, SMV_TERVERIFIKASI: { wa: false, email: true }, BELANJA_MENUNGGU: { wa: false, email: true }, BELANJA_DIKEMBALIKAN: { wa: true, email: true },
    BELANJA_TERVERIFIKASI: { wa: false, email: true }, ...D.notif_atur.notif_matriks };
  D.smv_tugas = []; D.supermonev = []; D.belanja = []; D.smv_pengingat = [];
  // akun contoh tambahan: satu petugas lapangan dan satu anggota Pokja Supermonev
  const tambahAkun = (email, nama, jenis, pokja) => {
    let u = D.pengguna.find((x) => x.email === email);
    if (!u) {
      u = { id: 'pg-' + email.split('@')[0].replace(/\W/g, ''), email, nama, nip: null, no_hp: '0812-9000-' + String(D.pengguna.length).padStart(4, '0'), jenis_akses: jenis, peran_sistem: null,
        super_admin_slot: null, aktif: true, simulasi: null, catatan: null, auth_id: 'tertaut', login_terakhir: new Date(Date.now() - 864e5).toISOString(), dibuat_pada: new Date(Date.now() - 864e5 * 60).toISOString() };
      D.pengguna.push(u);
      if (pokja) D.pengguna_pokja.push({ pengguna_id: u.id, pokja_id: 'pk-' + pokja, jabatan: 'anggota' });
    }
    return u.id;
  };
  const pLap = D.pengguna.find((x) => x.email === 'petugas.lapangan@contoh.id')?.id;
  const pRudi = tambahAkun('rudi.hartono@contoh.id', 'Rudi Hartono (Petugas Lapangan)', 'petugas_supermonev');
  const pLes = tambahAkun('lestari.smv@contoh.id', 'Lestari Wulandari', 'pegawai', 'SUPERMONEV');
  const kSmv = D.pengguna.find((x) => x.email === 'dhenyindahniati@gmail.com')?.id;
  const petugas = [pLap, pRudi, pLes, pLap, pRudi].filter(Boolean);
  const nama = (id) => namaPengguna(id);
  const lalu = (h) => new Date(Date.now() - h * 864e5).toISOString();
  const hi = hariIni();
  const due = jadwal().sort((a, b) => b.jatuh_tempo.localeCompare(a.jatuh_tempo));
  const lewat = due.filter((j) => j.jatuh_tempo <= hi), datang = due.filter((j) => j.jatuh_tempo > hi);
  const rencana = [];
  datang.forEach((j, i) => rencana.push({ j, pid: i % 3 === 0 ? null : petugas[i % petugas.length], st: null }));
  lewat.forEach((j, k) => {
    const r = k < 3 ? [pLap, null] : k < 5 ? [pLap, 'menunggu'] : k === 5 ? [pLap, 'perlu_perbaikan'] : k === 6 ? [pLap, 'draft'] : k < 10 ? [petugas[1 + (k % 3)] || pRudi, 'menunggu']
      : k === 10 || k === 11 ? [null, null] : [petugas[k % petugas.length], 'terverifikasi'];
    rencana.push({ j, pid: r[0], st: r[1] });
  });
  const urutPm = new Map();   // pola keberhasilan per PM (bukan per minggu) agar grafik mingguan tiap PM wajar
  rencana.forEach(({ j, pid, st }, i) => {
    const b = bnba(j.bnba_id);
    if (!urutPm.has(j.bnba_id)) urutPm.set(j.bnba_id, urutPm.size);
    const pm = urutPm.get(j.bnba_id), w = j.putaran;
    const umur = Math.max(0, Math.round((Date.parse(hi) - Date.parse(j.jatuh_tempo)) / 864e5));
    if (!pid) return;
    D.smv_tugas.push({ id: I.uid(), bnba_id: j.bnba_id, putaran: j.putaran, petugas_id: pid, ditugaskan_oleh: kSmv, ditugaskan_nama: 'Kapokja Supermonev',
      ditugaskan_pada: lalu(Math.max(1, umur + 10)), catatan: null });
    if (!st) return;
    const dz = dasar(j.bnba_id).nilai ?? 400000, pola = (pm * 7) % 20;
    const hasil = pola < 11 ? 'berhasil' : pola < 14 ? 'berhasil_catatan' : pola < 18 ? 'perlu_pendampingan' : 'tidak_berhasil';
    const berjalan = hasil !== 'tidak_berhasil', berubah = hasil === 'berhasil_catatan';
    const goyang = ((w * 7 + pm * 3) % 5) * 0.03;
    const bersih = !berjalan ? null : hasil === 'perlu_pendampingan' ? Math.round(dz * (0.66 + Math.min(0.2, w * 0.006) + goyang) / 1000) * 1000
      : Math.round(dz * (1.1 + Math.min(0.6, w * 0.012) + (pm % 4) * 0.05 + goyang) / 1000) * 1000;
    const kotor = bersih == null ? null : bersih + 350000 + (i % 5) * 50000, kel = kotor == null ? null : kotor - bersih;
    const kd = hasil === 'tidak_berhasil' ? 'Usaha tutup karena PM sakit dan modal habis.' : KENDALA[i % KENDALA.length];
    const kunjungan = tambahHari(j.jatuh_tempo, 2 + (i % 5));
    const s = { id: I.uid(), bnba_id: j.bnba_id, putaran: j.putaran, jatuh_tempo: j.jatuh_tempo, petugas_id: pid, petugas_nama: nama(pid), status: st,
      tgl_kunjungan: kunjungan > hi ? hi : kunjungan, usaha_berjalan: berjalan, usaha_berubah: berjalan ? berubah : null, usaha_baru: berubah ? 'Warung kopi dan gorengan' : null,
      pendapatan_kotor: kotor, pengeluaran: kel, rincian_pengeluaran: kel ? 'Bahan baku, gas, plastik kemasan' : null, pendapatan_bersih: bersih, tambah_pekerja: berjalan && i % 6 === 0 ? 1 : 0,
      kondisi_barang: !berjalan ? 'Dijual/dipindahtangankan' : i % 8 === 3 ? 'Rusak ringan' : 'Baik', catatan_barang: i % 8 === 3 ? 'Roda gerobak perlu diganti.' : null,
      modal_usaha: berjalan ? 2500000 + (i % 6) * 250000 : null, sumber_modal: berjalan ? 'Bantuan ATENSI dan tabungan sendiri' : null, kendala: kd, perkembangan: berjalan ? PERKEMBANGAN[i % PERKEMBANGAN.length] : null,
      dasar_pendapatan: dz, dasar_sumber: dasar(j.bnba_id).sumber || 'isian', hasil_otomatis: nilaiSmv(berjalan, berubah, bersih, dz), hasil: st === 'terverifikasi' ? hasil : null,
      ringkasan_kendala: ringkasKendala(kd), kategori_kendala: kategoriKendala(kd), catatan_verifikasi: st === 'perlu_perbaikan' ? 'Foto usaha belum terlihat jelas. Mohon ambil ulang di siang hari.' : null,
      diverifikasi_oleh: st === 'terverifikasi' ? kSmv : null, diverifikasi_nama: st === 'terverifikasi' || st === 'perlu_perbaikan' ? 'Kapokja Supermonev' : null,
      diverifikasi_pada: st === 'terverifikasi' ? lalu(Math.max(0.5, umur - 6)) : null, diajukan_pada: st === 'draft' ? null : lalu(Math.max(1, umur - 3)),
      dibuat_pada: lalu(Math.max(1, umur - 2)), diubah_pada: lalu(Math.max(0.5, umur - 3)) };
    D.supermonev.push(s);
    if (st !== 'draft' && i % 3 !== 1) {
      for (let f = 0; f < (i % 2 ? 1 : 2); f++) {
        D.berkas.push({ id: I.uid(), usulan_id: null, tahap: null, jenis: 'foto', nama: `supermonev_p${j.putaran}_${f + 1}.jpg`, ukuran: 310000, mime: 'image/jpeg', lokasi: 'drive_sa1',
          tautan: null, diunggah_oleh: pid, diunggah_nama: nama(pid), dibuat_pada: s.diajukan_pada || s.dibuat_pada, dihapus: false, konteks: 'smv', ref_id: s.id, pokja_id: b.pokja_id });
      }
    }
  });
  // pengingat jatuh tempo yang sudah pernah dikirim (agar notifikasi tidak menumpuk saat pratinjau dibuka)
  jadwal(hi).forEach((j) => D.smv_pengingat.push(j.bnba_id + ':' + j.putaran));
  // verifikasi belanja / BAST / inventaris
  const layak = D.bnba.filter((b) => belanjaLayak(b.id));
  layak.forEach((b, i) => {
    const st = i < Math.ceil(layak.length * 0.55) ? 'terverifikasi' : i % 6 === 0 ? 'perlu_perbaikan' : i % 4 === 0 ? 'menunggu' : i % 5 === 0 ? 'draft' : null;
    if (!st) return;
    const t = D.smv_tugas.find((x) => x.bnba_id === b.id), oleh = t?.petugas_id || pLes;
    const inv = [{ nama: 'Etalase kaca', jumlah: 1, satuan: 'unit', nilai: 1750000 }, { nama: 'Kompor gas 2 tungku', jumlah: 1, satuan: 'unit', nilai: 650000 },
      { nama: 'Peralatan masak', jumlah: 1, satuan: 'paket', nilai: 900000 }, { nama: 'Bahan baku awal', jumlah: 1, satuan: 'paket', nilai: 1700000 }].slice(0, 2 + (i % 3));
    D.belanja.push({ id: I.uid(), bnba_id: b.id, status: st, inventaris: inv, total_nilai: inv.reduce((a, x) => a + x.nilai, 0), tgl_belanja: '2026-' + String(3 + (i % 7)).padStart(2, '0') + '-0' + (1 + (i % 8)),
      tgl_bast: '2026-' + String(3 + (i % 7)).padStart(2, '0') + '-1' + (i % 8), catatan: null, diisi_oleh: oleh, diisi_nama: nama(oleh), diajukan_pada: st === 'draft' ? null : lalu(20 - (i % 15)),
      catatan_verifikasi: st === 'perlu_perbaikan' ? 'Nilai pada nota belum sama dengan daftar inventaris. Mohon unggah nota yang lengkap.' : null,
      diverifikasi_oleh: st === 'terverifikasi' ? kSmv : null, diverifikasi_nama: st === 'terverifikasi' ? 'Kapokja Supermonev' : null, diverifikasi_pada: st === 'terverifikasi' ? lalu(15 - (i % 12)) : null,
      dibuat_pada: lalu(30), diubah_pada: lalu(10) });
    if (st !== 'draft') {
      [['bukti_belanja', 'Nota_belanja.pdf', 'application/pdf', 820000], ['bast', 'BAST_penerima.pdf', 'application/pdf', 610000], ['inventaris', 'Foto_barang.jpg', 'image/jpeg', 290000]]
        .forEach(([jenis, nm, mime, uk]) => D.berkas.push({ id: I.uid(), usulan_id: null, tahap: null, jenis, nama: nm, ukuran: uk, mime, lokasi: 'drive_sa1', tautan: null, diunggah_oleh: oleh,
          diunggah_nama: nama(oleh), dibuat_pada: lalu(20), dihapus: false, konteks: 'belanja', ref_id: b.id, pokja_id: b.pokja_id }));
    }
  });
  I.simpan();
}

// ---------------------------------------------------------------- berkas konteks smv & belanja
daftarKonteksP('smv', {
  cek(ref, jenis) {
    siapkan();
    const s = d().supermonev.find((x) => x.id === ref); if (!s) throw g('Isian Supermonev tidak ditemukan. Simpan draft lebih dulu.');
    if (!(I.isSA() || s.petugas_id === sayaId() || ditugaskan(s.bnba_id, s.putaran))) throw g('Foto Supermonev hanya dapat diunggah petugas yang ditugaskan.', '42501');
    if (!['draft', 'perlu_perbaikan'].includes(s.status)) throw g('Isian sudah diajukan; foto tidak dapat diubah.');
    if (jenis !== 'foto') throw g('Jenis berkas Supermonev tidak dikenal.');
    return { pokja: bnba(s.bnba_id)?.pokja_id, foto: true, maks: 2 };
  },
  terlihat(b) { const s = d().supermonev?.find((x) => x.id === b.ref_id); return !!s && smvTerlihat(s.bnba_id); },
  hapus(r) { const s = d().supermonev.find((x) => x.id === r.ref_id); return !!s && ['draft', 'perlu_perbaikan'].includes(s.status) && (I.isSA() || s.petugas_id === sayaId() || ditugaskan(s.bnba_id, s.putaran)); },
});
daftarKonteksP('belanja', {
  cek(ref, jenis) {
    siapkan();
    const b = bnba(ref); if (!b) throw g('Data PM tidak ditemukan.');
    if (!belanjaLayak(b.id)) throw g('PM ini tidak memerlukan verifikasi belanja (bukan bantuan barang/aset usaha, atau belum cair).');
    if (!bolehIsiBelanja(b.id)) throw g('Berkas belanja diunggah petugas Supermonev yang ditugaskan atau Pokja Supermonev.', '42501');
    const x = d().belanja.find((y) => y.bnba_id === b.id);
    if (['menunggu', 'terverifikasi'].includes(x?.status)) throw g('Berkas belanja sedang diverifikasi atau sudah terverifikasi.');
    if (!['bukti_belanja', 'bast', 'inventaris'].includes(jenis)) throw g('Jenis berkas belanja tidak dikenal.');
    return { pokja: b.pokja_id, foto: false, maks: null, gambar500: true };
  },
  terlihat(b) { return smvTerlihat(b.ref_id); },
  hapus(r) { const x = d().belanja.find((y) => y.bnba_id === r.ref_id); return ['draft', 'perlu_perbaikan', undefined].includes(x?.status) && bolehIsiBelanja(r.ref_id); },
});

// =====================================================================================
// PENUGASAN (W-28)
// =====================================================================================
function pengingat() {
  const baru = jadwal(hariIni()).filter((j) => !d().smv_pengingat.includes(j.bnba_id + ':' + j.putaran)
    && !d().supermonev.some((s) => s.bnba_id === j.bnba_id && s.putaran === j.putaran && s.status === 'terverifikasi'));
  if (!baru.length) return 0;
  baru.forEach((j) => d().smv_pengingat.push(j.bnba_id + ':' + j.putaran));
  I.beriTahu(pengurus('SUPERMONEV', 'kapokja').concat(pengurus('TU', 'kapokja')), 'SMV_JATUH_TEMPO', 'Jadwal Supermonev jatuh tempo',
    `${baru.length} jadwal monitoring Supermonev jatuh tempo. Tugaskan petugas di menu Penugasan Petugas.`, '#/penugasan-supermonev');
  return baru.length;
}
const bebanPetugas = (pid) => d().smv_tugas.filter((t) => t.petugas_id === pid && !d().supermonev.some((s) => s.bnba_id === t.bnba_id && s.putaran === t.putaran && s.status === 'terverifikasi')).length;
export async function smvPetugas() {
  await jeda(); siapkan(); butuhPeg();
  const peg = d().pegawai || [];
  return d().pengguna.filter((u) => u.aktif && ['pegawai', 'petugas_supermonev'].includes(u.jenis_akses)).sort((a, b) => a.nama.localeCompare(b.nama))
    .map((u) => { const pg = peg.find((x) => x.status === 'Aktif' && (x.pengguna_id === u.id || (x.email && x.email.toLowerCase() === u.email.toLowerCase())));
      return { id: u.id, nama: u.nama, email: u.email, jenis: u.jenis_akses === 'petugas_supermonev' ? 'Petugas lapangan' : u.peran_sistem === 'super_admin' ? 'Super Admin' : u.peran_sistem === 'direktur' ? 'Direktur' : 'Pegawai',
        peran: d().pengguna_pokja.filter((x) => x.pengguna_id === u.id).map((x) => (x.jabatan === 'kapokja' ? 'Kapokja ' : 'Anggota ') + I.pokjaById(x.pokja_id).nama_pendek).join(', '),
        domisili_provinsi: pg?.provinsi || null, domisili_kabkota: pg?.kabkota || null,
        kab_salur: [...new Set((d().penyaluran || []).filter((l) => l.kabkota && String(l.nama_petugas).trim().toLowerCase() === u.nama.trim().toLowerCase()).map((l) => l.kabkota))],
        beban: bebanPetugas(u.id) }; });
}
function barisPenugasan() {
  return jadwal().map((j) => {
    const b = bnba(j.bnba_id), t = d().smv_tugas.find((x) => x.bnba_id === j.bnba_id && x.putaran === j.putaran), s = d().supermonev.find((x) => x.bnba_id === j.bnba_id && x.putaran === j.putaran);
    const lu = (d().penyaluran || []).filter((l) => l.usulan_id === b.usulan_id && (l.semua_pm || (l.nik_pm || []).includes(b.nik)));
    return { ...pmJson(b), kab_penyaluran: b.kota_kab_penyaluran || null, prov_penyaluran: b.prov_penyaluran || null, penyalur: [...new Set(lu.map((l) => l.nama_petugas))], putaran: j.putaran, jatuh_tempo: j.jatuh_tempo, status: s ? s.status : t ? 'ditugaskan' : 'belum_ditugaskan', petugas_id: t?.petugas_id || null,
      petugas_nama: t ? namaPengguna(t.petugas_id) : null, ditugaskan_pada: t?.ditugaskan_pada || null, isian_id: s?.id || null, hasil: s?.hasil || null };
  });
}
export async function smvPenugasan(f = {}) {
  await jeda(); siapkan(); butuhPeg();
  if (bolehTugaskan()) { if (pengingat()) I.simpan(); }
  const q = String(f.q || '').toLowerCase(), semua = barisPenugasan();
  const fl = semua.filter((r) => (!f.putaran || r.putaran === Number(f.putaran)) && (!f.bulan || r.jatuh_tempo.slice(0, 7) === f.bulan) && (!f.provinsi || r.provinsi === f.provinsi)
    && (!f.kabkota || r.kabkota === f.kabkota) && (!f.pokja || r.pokja_id === f.pokja) && (!f.petugas || r.petugas_id === f.petugas)
    && (!q || r.nama.toLowerCase().includes(q) || String(r.nik).startsWith(q)));
  const hi = hariIni();
  return { boleh_tugaskan: bolehTugaskan(), mingguan: mingguan(),
    ringkas: { total: fl.length, belum: fl.filter((r) => r.status === 'belum_ditugaskan').length, ditugaskan: fl.filter((r) => r.status === 'ditugaskan').length,
      diisi: fl.filter((r) => ['draft', 'menunggu', 'perlu_perbaikan'].includes(r.status)).length, selesai: fl.filter((r) => r.status === 'terverifikasi').length,
      lewat: fl.filter((r) => ['belum_ditugaskan', 'ditugaskan'].includes(r.status) && r.jatuh_tempo < hi).length },
    bulan: [...new Set(semua.map((r) => r.jatuh_tempo.slice(0, 7)))].sort(),
    baris: urutkan(fl.filter((r) => !f.status || r.status === f.status), 'provinsi', 'kabkota', 'jatuh_tempo', 'nama') };
}
export async function smvTugaskan(items, petugasId, catatan = null) {
  await jeda(); siapkan();
  if (!bolehTugaskan()) throw g('Penugasan dilakukan Kapokja Supermonev atau Kapokja TU.', '42501');
  const p = d().pengguna.find((u) => u.id === petugasId && u.aktif && ['pegawai', 'petugas_supermonev'].includes(u.jenis_akses));
  if (!p) throw g('Pilih pegawai atau petugas yang terdaftar dan aktif.');
  if (!Array.isArray(items) || !items.length) throw g('Pilih minimal satu PM.');
  const jw = jadwal(tambahHari(hariIni(), 400));
  let baru = 0, pindah = 0; const lewat = [];
  for (const it of items) {
    const b = bnba(it.bnba_id), put = Number(it.putaran);
    if (!jw.some((j) => j.bnba_id === it.bnba_id && j.putaran === put)) { lewat.push({ nama: b?.nama, alasan: 'tidak ada jadwal monitoring ' + labelPut(put).toLowerCase() }); continue; }
    if (d().supermonev.some((s) => s.bnba_id === it.bnba_id && s.putaran === put)) { lewat.push({ nama: b.nama, alasan: 'formulir sudah mulai diisi' }); continue; }
    const t = d().smv_tugas.find((x) => x.bnba_id === it.bnba_id && x.putaran === put);
    if (!t) { d().smv_tugas.push({ id: I.uid(), bnba_id: it.bnba_id, putaran: put, petugas_id: p.id, ditugaskan_oleh: sayaId(), ditugaskan_nama: I.namaSaya(), ditugaskan_pada: I.sekarang(), catatan: teks(catatan) }); baru++; }
    else if (t.petugas_id !== p.id) {
      I.log('UPDATE', 'smv_tugas', t.id, `Memindahkan penugasan Supermonev ${b.nama} ${labelPut(put).toLowerCase()} ke ${p.nama}`, { dari: t.petugas_id, ke: p.id });
      Object.assign(t, { petugas_id: p.id, ditugaskan_oleh: sayaId(), ditugaskan_nama: I.namaSaya(), ditugaskan_pada: I.sekarang(), catatan: teks(catatan) || t.catatan }); pindah++;
    }
  }
  if (baru + pindah) {
    I.beriTahu([p.id], 'SMV_DITUGASKAN', 'Tugas Supermonev baru', `${baru + pindah} PM ditugaskan kepada Anda untuk monitoring Supermonev oleh ${I.namaSaya()}.`, '#/supermonev');
    if (baru) I.log('INSERT', 'smv_tugas', null, `Menugaskan ${baru} PM Supermonev kepada ${p.nama}`);
  }
  I.simpan(); siarkan('smv_tugas');
  return { ditugaskan: baru, dipindah: pindah, dilewati: lewat };
}
export async function smvBatalTugas(items) {
  await jeda(); siapkan();
  if (!bolehTugaskan()) throw g('Penugasan dilakukan Kapokja Supermonev atau Kapokja TU.', '42501');
  let n = 0;
  for (const it of items || []) {
    const i = d().smv_tugas.findIndex((t) => t.bnba_id === it.bnba_id && t.putaran === Number(it.putaran) && !d().supermonev.some((s) => s.bnba_id === t.bnba_id && s.putaran === t.putaran));
    if (i >= 0) { d().smv_tugas.splice(i, 1); n++; }
  }
  I.simpan(); siarkan('smv_tugas');
  return n;
}

// =====================================================================================
// FORMULIR & VERIFIKASI
// =====================================================================================
export async function smvTugasSaya() {
  await jeda(); siapkan();
  const me = sayaId(); if (!me) throw g('Akses ditolak.', '42501');
  const jw = jadwal(tambahHari(hariIni(), 400));
  const baris = d().smv_tugas.filter((t) => t.petugas_id === me).map((t) => {
    const b = bnba(t.bnba_id), s = d().supermonev.find((x) => x.bnba_id === t.bnba_id && x.putaran === t.putaran), bl = d().belanja.find((x) => x.bnba_id === t.bnba_id);
    return { ...pmJson(b), putaran: t.putaran, jatuh_tempo: jw.find((j) => j.bnba_id === b.id && j.putaran === t.putaran)?.jatuh_tempo, alamat: b.dom_jalan || b.ktp_jalan,
      isian_id: s?.id || null, status: s?.status || 'ditugaskan', hasil: s?.hasil || null, label_hasil: labelHasil(s?.hasil), catatan_verifikasi: s?.catatan_verifikasi || null,
      ditugaskan_nama: t.ditugaskan_nama, belanja_layak: belanjaLayak(b.id), belanja_status: bl?.status || 'belum' };
  });
  baris.sort((a, b) => (a.status === 'terverifikasi') - (b.status === 'terverifikasi') || a.putaran - b.putaran || a.nama.localeCompare(b.nama));
  return { mingguan: mingguan(), baris, ringkas: { total: baris.length, selesai: baris.filter((r) => r.status === 'terverifikasi').length, menunggu: baris.filter((r) => r.status === 'menunggu').length,
    perbaikan: baris.filter((r) => r.status === 'perlu_perbaikan').length, belum: baris.filter((r) => ['ditugaskan', 'draft'].includes(r.status)).length } };
}
export async function smvFormulir(bid, putaran) {
  await jeda(); siapkan();
  const b = bnba(bid), put = Number(putaran);
  if (!b || !(I.isPeg() || ditugaskan(bid, put))) throw g('Data PM tidak ditemukan atau tidak ditugaskan kepada Anda.');
  const jt = jadwal(tambahHari(hariIni(), 400), bid).find((j) => j.putaran === put)?.jatuh_tempo;
  if (!jt) throw g(`PM ini tidak memiliki jadwal monitoring ${labelPut(put).toLowerCase()}.`);
  const s = d().supermonev.find((x) => x.bnba_id === bid && x.putaran === put), t = d().smv_tugas.find((x) => x.bnba_id === bid && x.putaran === put), dz = dasar(bid);
  const lengkap = !I.isPeg() || I.isSA() || I.diPokja('SUPERMONEV');
  return { ...pmJson(b), putaran: put, label_putaran: labelPut(put), mingguan: mingguan(), jatuh_tempo: jt, alamat: lengkap ? b.dom_jalan || b.ktp_jalan : I.samarAlamat(b.dom_jalan || b.ktp_jalan),
    petugas_nama: t ? namaPengguna(t.petugas_id) : null, dasar: dz.nilai, dasar_sumber: dz.sumber, dasar_kotor: b.pendapatan_kotor_awal ?? null, dasar_biaya: b.biaya_awal ?? null,
    boleh_isi: (I.isSA() || t?.petugas_id === sayaId()) && ['draft', 'perlu_perbaikan', undefined].includes(s?.status),
    boleh_verifikasi: verifikator() && s?.status === 'menunggu', isian: s ? smvJson(s) : null,
    foto: s ? d().berkas.filter((q) => q.konteks === 'smv' && q.ref_id === s.id && !q.dihapus).map(tanpaDrive) : [],
    riwayat: d().supermonev.filter((x) => x.bnba_id === bid && x.putaran !== put).sort((a, c) => a.putaran - c.putaran)
      .map((x) => ({ putaran: x.putaran, status: x.status, hasil: x.hasil, label_hasil: labelHasil(x.hasil), pendapatan_bersih: x.pendapatan_bersih, tgl_kunjungan: x.tgl_kunjungan })) };
}
export async function smvSimpan(p, ajukan = false) {
  await jeda(120); siapkan();
  const bid = p.bnba_id, put = Number(p.putaran), b = bnba(bid);
  if (!b) throw g('Data PM tidak ditemukan.');
  const t = d().smv_tugas.find((x) => x.bnba_id === bid && x.putaran === put);
  if (!(I.isSA() || t?.petugas_id === sayaId())) throw g('Formulir hanya dapat diisi petugas yang ditugaskan untuk PM ini.', '42501');
  const jt = jadwal(tambahHari(hariIni(), 400), bid).find((j) => j.putaran === put)?.jatuh_tempo;
  if (!jt) throw g(`PM ini tidak memiliki jadwal monitoring ${labelPut(put).toLowerCase()}.`);
  let s = d().supermonev.find((x) => x.bnba_id === bid && x.putaran === put);
  if (s && !['draft', 'perlu_perbaikan'].includes(s.status)) throw g('Isian sudah diajukan atau terverifikasi; tidak dapat diubah.');
  const berjalan = bool(p.usaha_berjalan), berubah = bool(p.usaha_berubah), kotor = num(p.pendapatan_kotor), kel = num(p.pengeluaran);
  let bersih = num(p.pendapatan_bersih); if (bersih == null && kotor != null) bersih = kotor - (kel || 0);
  let dz = dasar(bid); if (dz.nilai == null && num(p.dasar_pendapatan) != null) dz = { nilai: num(p.dasar_pendapatan), sumber: 'isian' };
  if (!s) { s = { id: I.uid(), bnba_id: bid, putaran: put, jatuh_tempo: jt, status: 'draft', dibuat_pada: I.sekarang(), kategori_kendala: [] }; d().supermonev.push(s); }
  Object.assign(s, { tgl_kunjungan: tgl(p.tgl_kunjungan), usaha_berjalan: berjalan, usaha_berubah: berubah, usaha_baru: berubah ? teks(p.usaha_baru) : null, pendapatan_kotor: kotor, pengeluaran: kel,
    rincian_pengeluaran: teks(p.rincian_pengeluaran), pendapatan_bersih: bersih, tambah_pekerja: int(p.tambah_pekerja), kondisi_barang: teks(p.kondisi_barang), catatan_barang: teks(p.catatan_barang),
    modal_usaha: num(p.modal_usaha), sumber_modal: teks(p.sumber_modal), kendala: teks(p.kendala), perkembangan: teks(p.perkembangan), dasar_pendapatan: dz.nilai, dasar_sumber: dz.sumber,
    petugas_id: sayaId(), petugas_nama: I.namaSaya(), hasil_otomatis: nilaiSmv(berjalan, berubah, bersih, dz.nilai), ringkasan_kendala: ringkasKendala(p.kendala),
    kategori_kendala: kategoriKendala(p.kendala), diubah_pada: I.sekarang() });
  if (ajukan) {
    const err = !s.tgl_kunjungan ? 'Isi tanggal kunjungan.' : s.tgl_kunjungan > hariIni() ? 'Tanggal kunjungan tidak boleh di masa depan.'
      : s.usaha_berjalan == null ? 'Jawab pertanyaan "Apakah usaha masih berjalan?".'
      : s.usaha_berjalan && s.usaha_berubah == null ? 'Jawab pertanyaan "Apakah jenis usaha berubah dari bantuan awal?".'
      : s.usaha_berjalan && s.usaha_berubah && !s.usaha_baru ? 'Tuliskan jenis usaha yang baru.'
      : s.usaha_berjalan && (s.pendapatan_kotor == null || s.pengeluaran == null) ? 'Isi pendapatan kotor dan pengeluaran bulan ini.'
      : !s.kondisi_barang ? 'Pilih kondisi barang bantuan.' : null;
    if (err) { I.simpan(); throw g(err); }
    Object.assign(s, { status: 'menunggu', diajukan_pada: I.sekarang(), catatan_verifikasi: null });
    I.beriTahu(pengurus('SUPERMONEV', 'kapokja'), 'SMV_MENUNGGU', 'Supermonev menunggu verifikasi', `Isian Supermonev ${b.nama} (${labelPut(put).toLowerCase()}) dari ${I.namaSaya()} menunggu verifikasi.`, '#/supermonev?tab=antrean');
  }
  I.log(ajukan ? 'AJUKAN' : 'UPDATE', 'supermonev', s.id, (ajukan ? 'Mengajukan' : 'Menyimpan draft') + ` Supermonev ${b.nama} ${labelPut(put).toLowerCase()}`);
  I.simpan(); siarkan('supermonev', s);
  return smvJson(s);
}
export async function smvVerifikasi(id, setuju, hasil = null, ringkasan = null, catatan = null) {
  await jeda(120); siapkan();
  if (!verifikator()) throw g('Verifikasi Supermonev dilakukan Kapokja Supermonev.', '42501');
  const s = d().supermonev.find((x) => x.id === id); if (!s || s.status !== 'menunggu') throw g('Isian ini tidak sedang menunggu verifikasi.');
  const b = bnba(s.bnba_id);
  if (setuju) {
    const h = teks(hasil) || s.hasil_otomatis;
    if (!h) throw g('Tentukan hasil penilaian (belum ada pembanding pendapatan sebelum bantuan).');
    if (!LABEL_HASIL[h]) throw g('Hasil penilaian tidak dikenal.');
    if (s.hasil_otomatis && h !== s.hasil_otomatis && !teks(catatan)) throw g('Tuliskan alasan bila hasil berbeda dari penilaian otomatis.');
    Object.assign(s, { status: 'terverifikasi', hasil: h, ringkasan_kendala: teks(ringkasan) || s.ringkasan_kendala, catatan_verifikasi: teks(catatan), diverifikasi_oleh: sayaId(),
      diverifikasi_nama: I.namaSaya(), diverifikasi_pada: I.sekarang() });
    I.beriTahu([s.petugas_id], 'SMV_TERVERIFIKASI', 'Isian Supermonev terverifikasi', `Isian ${b.nama} (${labelPut(s.putaran).toLowerCase()}): ${labelHasil(h)}.`, '#/supermonev');
  } else {
    if (!teks(catatan)) throw g('Catatan wajib diisi saat mengembalikan.');
    Object.assign(s, { status: 'perlu_perbaikan', catatan_verifikasi: teks(catatan), diverifikasi_nama: I.namaSaya() });
    I.beriTahu([s.petugas_id], 'SMV_DIKEMBALIKAN', 'Isian Supermonev perlu perbaikan', `Isian ${b.nama} (${labelPut(s.putaran).toLowerCase()}) dikembalikan: ${teks(catatan)}`, '#/supermonev');
  }
  s.diubah_pada = I.sekarang();
  I.log('VERIFIKASI', 'supermonev', s.id, `${setuju ? 'Menyetujui' : 'Mengembalikan'} Supermonev ${b.nama} ${labelPut(s.putaran).toLowerCase()}`);
  I.simpan(); siarkan('supermonev', s);
  return smvJson(s);
}
export async function smvUbahRingkasan(id, ringkasan) {
  await jeda(); siapkan();
  if (!verifikator()) throw g('Hanya Kapokja Supermonev.', '42501');
  const s = d().supermonev.find((x) => x.id === id); if (!s) throw g('Isian tidak ditemukan.');
  s.ringkasan_kendala = teks(ringkasan); I.simpan();
  return smvJson(s);
}
export async function smvDaftar(f = {}) {
  await jeda(); siapkan();
  const me = sayaId(); if (!me) throw g('Akses ditolak.', '42501');
  const mode = I.isPeg() ? f.mode || 'semua' : 'saya', q = String(f.q || '').toLowerCase();
  const rows = d().supermonev.filter((s) => {
    const b = bnba(s.bnba_id);
    return (mode !== 'saya' || s.petugas_id === me) && (mode !== 'antrean' || s.status === 'menunggu') && (mode !== 'semua' || s.status !== 'draft' || s.petugas_id === me)
      && (!f.status || s.status === f.status) && (!f.hasil || s.hasil === f.hasil) && (!f.putaran || s.putaran === Number(f.putaran)) && (!f.pokja || b.pokja_id === f.pokja)
      && (!f.provinsi || (b.dom_provinsi || b.ktp_provinsi) === f.provinsi)
      && (!q || b.nama.toLowerCase().includes(q) || String(b.nik).startsWith(q) || String(s.petugas_nama || '').toLowerCase().includes(q));
  }).sort((a, b) => String(b.diajukan_pada || '').localeCompare(String(a.diajukan_pada || '')) || String(b.diubah_pada).localeCompare(String(a.diubah_pada)));
  return { total: rows.length, boleh_verifikasi: verifikator(), mingguan: mingguan(), baris: halaman(rows, f).map((s) => ({ ...smvJson(s), ...pmJson(bnba(s.bnba_id)) })) };
}
export async function smvRiwayatPm(bid) {
  await jeda(); siapkan();
  const b = bnba(bid); if (!b || !I.bnbaTerlihat(b)) throw g('Data PM tidak ditemukan.');
  const dz = dasar(bid), bl = d().belanja.find((x) => x.bnba_id === bid);
  return { dasar: dz.nilai, dasar_sumber: dz.sumber, dasar_kotor: b.pendapatan_kotor_awal ?? null, dasar_biaya: b.biaya_awal ?? null, dimonitor: cfg().jenis_bantuan.includes(b.jenis_bantuan),
    mingguan: mingguan(),
    putaran: jadwal(tambahHari(hariIni(), 800), bid).map((j) => {
      const t = d().smv_tugas.find((x) => x.bnba_id === bid && x.putaran === j.putaran), s = d().supermonev.find((x) => x.bnba_id === bid && x.putaran === j.putaran);
      return { putaran: j.putaran, label: labelPut(j.putaran), jatuh_tempo: j.jatuh_tempo, petugas_nama: t ? namaPengguna(t.petugas_id) : null, isian: s && (s.status !== 'draft' || I.isSA()) ? smvJson(s) : null };
    }),
    belanja: bl ? { ...I.salin(bl), jumlah_berkas: d().berkas.filter((q) => q.konteks === 'belanja' && q.ref_id === bid && !q.dihapus).length } : null, belanja_layak: belanjaLayak(bid) };
}

// =====================================================================================
// DASHBOARD & EKSPOR
// =====================================================================================
const PROV_KODE = { 'Aceh': '11', 'Sumatera Utara': '12', 'Sumatera Barat': '13', 'Riau': '14', 'Jambi': '15', 'Sumatera Selatan': '16', 'Bengkulu': '17', 'Lampung': '18',
  'Kepulauan Bangka Belitung': '19', 'Kepulauan Riau': '21', 'DKI Jakarta': '31', 'Jawa Barat': '32', 'Jawa Tengah': '33', 'Daerah Istimewa Yogyakarta': '34', 'Jawa Timur': '35',
  'Banten': '36', 'Bali': '51', 'Nusa Tenggara Barat': '52', 'Nusa Tenggara Timur': '53', 'Kalimantan Barat': '61', 'Kalimantan Tengah': '62', 'Kalimantan Selatan': '63',
  'Kalimantan Timur': '64', 'Kalimantan Utara': '65', 'Sulawesi Utara': '71', 'Sulawesi Tengah': '72', 'Sulawesi Selatan': '73', 'Sulawesi Tenggara': '74', 'Gorontalo': '75',
  'Sulawesi Barat': '76', 'Maluku': '81', 'Maluku Utara': '82', 'Papua': '91-A', 'Papua Selatan': '91-C', 'Papua Tengah': '91-D', 'Papua Pegunungan': '91-B', 'Papua Barat': '92-A', 'Papua Barat Daya': '92-B' };
function saringTerverifikasi(f = {}) {
  return d().supermonev.filter((s) => s.status === 'terverifikasi').map((s) => ({ s, b: bnba(s.bnba_id) })).filter(({ s, b }) => b
    && (!f.putaran || s.putaran === Number(f.putaran)) && (!f.pokja || b.pokja_id === f.pokja) && (!f.provinsi || (b.dom_provinsi || b.ktp_provinsi) === f.provinsi)
    && (!f.klaster || b.klaster_ppks === f.klaster) && (!f.hasil || s.hasil === f.hasil)
    && (!f.tahun || String(s.tgl_kunjungan || s.diverifikasi_pada).slice(0, 4) === String(f.tahun))
    && (!f.bulan || String(s.jatuh_tempo || s.tgl_kunjungan).slice(0, 7) === f.bulan) && (!f.bnba || b.id === f.bnba));
}
export async function smvDashboard(f = {}) {
  await jeda(140); siapkan(); butuhPeg();
  if (bolehTugaskan() && pengingat()) I.simpan();
  const v = saringTerverifikasi(f), n = v.length;
  const jt = jadwal(hariIni()).filter((j) => { const b = bnba(j.bnba_id); return (!f.putaran || j.putaran === Number(f.putaran)) && (!f.pokja || b.pokja_id === f.pokja)
    && (!f.provinsi || (b.dom_provinsi || b.ktp_provinsi) === f.provinsi) && (!f.klaster || b.klaster_ppks === f.klaster); });
  const rata = (arr) => (arr.length ? arr.reduce((a, x) => a + x, 0) / arr.length : null);
  const naik = v.filter(({ s }) => s.dasar_pendapatan > 0 && s.pendapatan_bersih != null).map(({ s }) => (s.pendapatan_bersih - s.dasar_pendapatan) / s.dasar_pendapatan * 100);
  const bh = (arr) => arr.filter(({ s }) => ['berhasil', 'berhasil_catatan'].includes(s.hasil)).length;
  const grup = (fn) => { const m = new Map(); v.forEach((x) => { const k = fn(x); if (k == null) return; (m.get(k) || m.set(k, []).get(k)).push(x); }); return m; };
  const verif = new Map();
  d().supermonev.filter((s) => s.status === 'terverifikasi' && s.diverifikasi_nama).forEach((s) => { const x = verif.get(s.diverifikasi_nama) || { n: 0, h: 0 }; x.n++; x.h += (Date.parse(s.diverifikasi_pada) - Date.parse(s.diajukan_pada || s.diverifikasi_pada)) / 864e5; verif.set(s.diverifikasi_nama, x); });
  const pet = new Map();
  d().smv_tugas.forEach((t) => { const nm = namaPengguna(t.petugas_id) || '?', x = pet.get(nm) || { nama: nm, ditugaskan: 0, selesai: 0, menunggu: 0 }; const s = d().supermonev.find((y) => y.bnba_id === t.bnba_id && y.putaran === t.putaran);
    x.ditugaskan++; if (s?.status === 'terverifikasi') x.selesai++; if (s?.status === 'menunggu') x.menunggu++; pet.set(nm, x); });
  const layak = d().bnba.filter((b) => belanjaLayak(b.id));
  return {
    total: n, jatuh_tempo: jt.length,
    cakupan: jt.length ? bulat1(jt.filter((j) => v.some(({ s }) => s.bnba_id === j.bnba_id && s.putaran === j.putaran)).length / jt.length * 100) : null,
    berhasil_persen: n ? bulat1(bh(v) / n * 100) : null, kenaikan_rata: naik.length ? bulat1(rata(naik)) : null,
    bersih_rata: rata(v.filter(({ s }) => s.pendapatan_bersih != null).map(({ s }) => s.pendapatan_bersih)), dasar_rata: rata(v.filter(({ s }) => s.dasar_pendapatan != null).map(({ s }) => s.dasar_pendapatan)),
    pekerja_baru: v.reduce((a, { s }) => a + (s.tambah_pekerja || 0), 0),
    menunggu: d().supermonev.filter((s) => s.status === 'menunggu').length, perbaikan: d().supermonev.filter((s) => s.status === 'perlu_perbaikan').length,
    belum_ditugaskan: jt.filter((j) => !d().smv_tugas.some((t) => t.bnba_id === j.bnba_id && t.putaran === j.putaran)).length,
    hasil: Object.keys(LABEL_HASIL).map((k) => ({ kode: k, label: LABEL_HASIL[k], n: v.filter(({ s }) => s.hasil === k).length })),
    per_pokja: d().pokja.filter((k) => grup(({ b }) => b.pokja_id).has(k.id)).sort((a, b) => a.urutan - b.urutan).map((k) => { const r = grup(({ b }) => b.pokja_id).get(k.id);
      return { label: k.nama_pendek, warna: k.warna, n: r.length, berhasil: r.filter(({ s }) => s.hasil === 'berhasil').length, catatan: r.filter(({ s }) => s.hasil === 'berhasil_catatan').length,
        pendampingan: r.filter(({ s }) => s.hasil === 'perlu_pendampingan').length, tidak: r.filter(({ s }) => s.hasil === 'tidak_berhasil').length }; }),
    per_klaster: [...grup(({ b }) => b.klaster_ppks || 'Belum diisi')].map(([label, r]) => ({ label, n: r.length, berhasil: bh(r) })).sort((a, b) => b.n - a.n),
    per_provinsi: [...grup(({ b }) => b.dom_provinsi || b.ktp_provinsi)].map(([provinsi, r]) => ({ provinsi, kode_peta: PROV_KODE[provinsi] || null, n: r.length, berhasil: bh(r) })).sort((a, b) => b.n - a.n),
    per_putaran: [...grup(({ s }) => s.putaran)].sort((a, b) => a[0] - b[0]).map(([p, r]) => ({ label: labelPut(p), n: r.length, berhasil: bh(r) })),
    per_bulan_hasil: [...grup(({ s }) => String(s.jatuh_tempo || s.tgl_kunjungan || s.diverifikasi_pada).slice(0, 7))].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([bulan, r]) => ({ bulan, n: r.length, berhasil: bh(r), rata_bersih: rata(r.filter(({ s }) => s.pendapatan_bersih != null).map(({ s }) => s.pendapatan_bersih)) })),
    mingguan: mingguan(),
    per_bulan: [...grup(({ s }) => String(s.tgl_kunjungan || s.diverifikasi_pada).slice(0, 7))].sort((a, b) => a[0].localeCompare(b[0])).map(([bulan, r]) => ({ bulan, n: r.length })),
    kendala: hitung(v, ({ s }) => s.kategori_kendala || []),
    kendala_terbaru: v.filter(({ s }) => s.ringkasan_kendala).sort((a, b) => String(b.s.diverifikasi_pada).localeCompare(String(a.s.diverifikasi_pada))).slice(0, 6)
      .map(({ s, b }) => ({ nama: b.nama, kabkota: b.dom_kabkota || b.ktp_kabkota, ringkasan: s.ringkasan_kendala, hasil: s.hasil, label_hasil: labelHasil(s.hasil) })),
    verifikator: [...verif].map(([nama, x]) => ({ nama, n: x.n, rata_hari: bulat1(x.h / x.n) })).sort((a, b) => b.n - a.n),
    petugas: [...pet.values()].sort((a, b) => b.ditugaskan - a.ditugaskan),
    belanja: { layak: layak.length, terverifikasi: d().belanja.filter((x) => x.status === 'terverifikasi').length, menunggu: d().belanja.filter((x) => x.status === 'menunggu').length },
    tahun: [...new Set(d().supermonev.filter((s) => s.status === 'terverifikasi').map((s) => Number(String(s.tgl_kunjungan || s.diverifikasi_pada).slice(0, 4))))].sort(),
    boleh_verifikasi: verifikator(), boleh_tugaskan: bolehTugaskan(), cfg: cfg(),
  };
}
export async function smvEkspor(f = {}) {
  await jeda(160); siapkan(); butuhPeg();
  const urut = (x) => I.pokjaById(x.b.pokja_id)?.urutan || 0;
  const rows = saringTerverifikasi(f).sort((a, b) => urut(a) - urut(b) || String(a.b.dom_kabkota || a.b.ktp_kabkota).localeCompare(String(b.b.dom_kabkota || b.b.ktp_kabkota)) || a.b.nama.localeCompare(b.b.nama) || a.s.putaran - b.s.putaran)
    .map(({ s, b }) => { const bl = d().belanja.find((x) => x.bnba_id === b.id);
      const bln = String(s.jatuh_tempo || s.tgl_kunjungan).slice(0, 7);
      return { ...smvJson(s), ...pmJson(b), foto: d().berkas.filter((q) => q.konteks === 'smv' && q.ref_id === s.id && !q.dihapus).map((q) => q.id),
        belanja: bl ? { status: bl.status, inventaris: I.salin(bl.inventaris), total_nilai: bl.total_nilai } : null, label_putaran: labelPut(s.putaran), bulan: bln,
        // semua minggu PM ini pada bulan yang sama (grafik per minggu di slide ke-3)
        jadwal_bulan: jadwal(tambahHari(hariIni(), 800), b.id).filter((j) => j.jatuh_tempo.slice(0, 7) === bln).map((j) => {
          const z = d().supermonev.find((x) => x.bnba_id === b.id && x.putaran === j.putaran && x.status === 'terverifikasi');
          return { putaran: j.putaran, label: labelPut(j.putaran), jatuh_tempo: j.jatuh_tempo, pendapatan_bersih: z?.pendapatan_bersih ?? null, pendapatan_kotor: z?.pendapatan_kotor ?? null, hasil: z?.hasil || null, status: z?.status || null };
        }) }; });
  I.log('EKSPOR', 'supermonev', null, `Ekspor Supermonev (${rows.length} isian)`, f); I.simpan();
  return rows;
}
export async function aturSupermonev(p) {
  await jeda(); siapkan();
  if (!I.isSA()) throw g('Hanya Super Admin.', '42501');
  const c = { ...cfg() };
  ['interval_bulan', 'interval_hari', 'mulai_bulan', 'maks_putaran', 'tampil_sebelum_hari'].forEach((k) => { if (int(p[k]) != null) c[k] = int(p[k]); });
  ['jenis_bantuan', 'jenis_belanja'].forEach((k) => { if (Array.isArray(p[k])) c[k] = p[k]; });
  if (c.interval_bulan < 1 || c.interval_bulan > 12) throw g('Jarak monitoring 1–12 bulan.');
  if (c.interval_hari < 0 || c.interval_hari > 90) throw g('Jarak monitoring 0–90 hari (7 = setiap minggu, 0 = pakai jarak bulan).');
  if (c.mulai_bulan < 0 || c.mulai_bulan > 24) throw g('Mulai monitoring 0–24 bulan setelah penyaluran.');
  if (c.interval_hari > 0 && (c.maks_putaran < 1 || c.maks_putaran > 520)) throw g('Jumlah minggu monitoring 1–520.');
  if (c.interval_hari === 0 && (c.maks_putaran < 1 || c.maks_putaran > 24)) throw g('Jumlah putaran 1–24.');
  if (c.tampil_sebelum_hari < 0 || c.tampil_sebelum_hari > 60) throw g('Tampil sebelum jatuh tempo 0–60 hari.');
  d().smv_cfg = c; I.log('UPDATE', 'pengaturan', 'supermonev', 'Mengubah pengaturan Supermonev', c); I.simpan();
  return c;
}

// =====================================================================================
// VERIFIKASI BELANJA (W-24B)
// =====================================================================================
function belanjaJson(bid) {
  const b = bnba(bid), x = d().belanja.find((y) => y.bnba_id === bid), bk = d().berkas.filter((q) => q.konteks === 'belanja' && q.ref_id === bid && !q.dihapus);
  return { ...pmJson(b), status: x?.status || 'belum', inventaris: I.salin(x?.inventaris || []), total_nilai: x?.total_nilai || 0, tgl_belanja: x?.tgl_belanja || null, tgl_bast: x?.tgl_bast || null,
    catatan: x?.catatan || null, diisi_nama: x?.diisi_nama || null, diajukan_pada: x?.diajukan_pada || null, catatan_verifikasi: x?.catatan_verifikasi || null,
    diverifikasi_nama: x?.diverifikasi_nama || null, diverifikasi_pada: x?.diverifikasi_pada || null,
    berkas_jumlah: { bukti_belanja: bk.filter((q) => q.jenis === 'bukti_belanja').length, bast: bk.filter((q) => q.jenis === 'bast').length, inventaris: bk.filter((q) => q.jenis === 'inventaris').length },
    boleh_isi: bolehIsiBelanja(bid) && ['draft', 'perlu_perbaikan', undefined].includes(x?.status), boleh_verifikasi: verifikator() && x?.status === 'menunggu' };
}
export async function belanjaDaftar(f = {}) {
  await jeda(); siapkan();
  if (!sayaId()) throw g('Akses ditolak.', '42501');
  const semua = I.isSA() || I.diPokja('TU') || I.diPokja('SUPERMONEV'), q = String(f.q || '').toLowerCase();
  const rows = d().bnba.filter((b) => belanjaLayak(b.id) && (semua || ditugaskan(b.id) || (I.isPeg() && I.idsPokja().includes(b.pokja_id)))
    && (!f.pokja || b.pokja_id === f.pokja) && (!f.provinsi || (b.dom_provinsi || b.ktp_provinsi) === f.provinsi) && (!q || b.nama.toLowerCase().includes(q) || String(b.nik).startsWith(q)))
    .map((b) => ({ b, st: d().belanja.find((x) => x.bnba_id === b.id)?.status || 'belum', ad: d().belanja.find((x) => x.bnba_id === b.id)?.diajukan_pada || '' }));
  const pilih = rows.filter((r) => !f.status || r.st === f.status || (f.status === 'belum' && r.st === 'draft'))
    .sort((a, b) => (b.st === 'menunggu') - (a.st === 'menunggu') || String(b.ad).localeCompare(String(a.ad)) || a.b.nama.localeCompare(b.b.nama));
  return { total: pilih.length, boleh_verifikasi: verifikator(),
    ringkas: { semua: rows.length, belum: rows.filter((r) => ['belum', 'draft'].includes(r.st)).length, menunggu: rows.filter((r) => r.st === 'menunggu').length,
      perlu_perbaikan: rows.filter((r) => r.st === 'perlu_perbaikan').length, terverifikasi: rows.filter((r) => r.st === 'terverifikasi').length },
    baris: halaman(pilih, f).map((r) => belanjaJson(r.b.id)) };
}
export async function belanjaDetail(bid) {
  await jeda(); siapkan();
  if (!(smvTerlihat(bid) && (I.isPeg() || ditugaskan(bid)))) throw g('Data PM tidak ditemukan.');
  if (!belanjaLayak(bid)) throw g('PM ini tidak memerlukan verifikasi belanja.');
  return { ...belanjaJson(bid), berkas: d().berkas.filter((q) => q.konteks === 'belanja' && q.ref_id === bid && !q.dihapus).map(tanpaDrive) };
}
export async function belanjaSimpan(bid, p, ajukan = false) {
  await jeda(120); siapkan();
  if (!belanjaLayak(bid)) throw g('PM ini tidak memerlukan verifikasi belanja.');
  if (!bolehIsiBelanja(bid)) throw g('Diisi petugas Supermonev yang ditugaskan atau Pokja Supermonev.', '42501');
  let x = d().belanja.find((y) => y.bnba_id === bid);
  if (['menunggu', 'terverifikasi'].includes(x?.status)) throw g('Data belanja sedang diverifikasi atau sudah terverifikasi.');
  const inv = [];
  for (const i of p.inventaris || []) {
    const nm = teks(i.nama); if (!nm) continue;
    const j = int(i.jumlah), n = num(i.nilai);
    if (!(j > 0)) throw g(`Jumlah barang "${nm}" harus lebih dari 0.`);
    if (n == null || n < 0) throw g(`Nilai barang "${nm}" harus diisi (Rp).`);
    inv.push({ nama: nm, jumlah: j, satuan: teks(i.satuan), nilai: n });
  }
  if (!x) { x = { id: I.uid(), bnba_id: bid, status: 'draft', dibuat_pada: I.sekarang() }; d().belanja.push(x); }
  Object.assign(x, { inventaris: inv, total_nilai: inv.reduce((a, y) => a + y.nilai, 0), tgl_belanja: tgl(p.tgl_belanja), tgl_bast: tgl(p.tgl_bast), catatan: teks(p.catatan),
    diisi_oleh: sayaId(), diisi_nama: I.namaSaya(), diubah_pada: I.sekarang() });
  if (ajukan) {
    const ada = (j) => d().berkas.some((q) => q.konteks === 'belanja' && q.ref_id === bid && q.jenis === j && !q.dihapus);
    const err = !inv.length ? 'Isi daftar inventaris minimal satu barang.' : !ada('bukti_belanja') ? 'Unggah bukti belanja (nota/kuitansi) lebih dulu.' : !ada('bast') ? 'Unggah Berita Acara Serah Terima (BAST) lebih dulu.' : null;
    if (err) { I.simpan(); throw g(err); }
    Object.assign(x, { status: 'menunggu', diajukan_pada: I.sekarang(), catatan_verifikasi: null });
    I.beriTahu(pengurus('SUPERMONEV', 'kapokja'), 'BELANJA_MENUNGGU', 'Verifikasi belanja menunggu', `Bukti belanja, BAST, dan inventaris ${bnba(bid).nama} menunggu verifikasi.`, '#/verifikasi-belanja?status=menunggu');
  }
  I.simpan(); siarkan('belanja', x);
  return belanjaJson(bid);
}
export async function belanjaVerifikasi(bid, setuju, catatan = null) {
  await jeda(120); siapkan();
  if (!verifikator()) throw g('Verifikasi belanja dilakukan Kapokja Supermonev.', '42501');
  const x = d().belanja.find((y) => y.bnba_id === bid); if (!x || x.status !== 'menunggu') throw g('Data belanja ini tidak sedang menunggu verifikasi.');
  if (!setuju && !teks(catatan)) throw g('Catatan wajib diisi saat mengembalikan.');
  Object.assign(x, { status: setuju ? 'terverifikasi' : 'perlu_perbaikan', catatan_verifikasi: teks(catatan), diverifikasi_oleh: sayaId(), diverifikasi_nama: I.namaSaya(), diverifikasi_pada: I.sekarang() });
  if (x.diisi_oleh) I.beriTahu([x.diisi_oleh], setuju ? 'BELANJA_TERVERIFIKASI' : 'BELANJA_DIKEMBALIKAN', setuju ? 'Verifikasi belanja disetujui' : 'Verifikasi belanja perlu perbaikan',
    `Belanja ${bnba(bid).nama}${setuju ? ' terverifikasi.' : ' dikembalikan: ' + teks(catatan)}`, '#/verifikasi-belanja');
  I.log('VERIFIKASI', 'belanja', x.id, `${setuju ? 'Menyetujui' : 'Mengembalikan'} verifikasi belanja ${bnba(bid).nama}`);
  I.simpan(); siarkan('belanja', x);
  return belanjaJson(bid);
}

// =====================================================================================
// TAHAP 6 — KEAMANAN, KESEHATAN, CADANGAN & PEMULIHAN
// =====================================================================================
const saAsli = () => { const p = saya(); return !!p && p.aktif && p.peran_sistem === 'super_admin'; };
const butuhSA = () => { if (!saAsli()) throw g('Hanya Super Admin.', '42501'); };
export async function periksaKeamanan() {
  await jeda(900); siapkan(); butuhSA();
  const D = d(), r = [], tambah = (kode, judul, status, detail) => r.push({ kode, judul, status, detail });
  const pratinjau = ' (mode pratinjau: di Supabase diperiksa langsung pada basis data)';
  tambah('rls', 'Row Level Security aktif di semua tabel', 'lulus', 'Setiap tabel hanya bisa dibaca sesuai peran.' + pratinjau);
  tambah('kebijakan_tulis', 'Browser tidak punya kebijakan menulis langsung', 'lulus', 'Semua perubahan data lewat fungsi yang memeriksa peran.' + pratinjau);
  tambah('hak_tulis', 'Tidak ada hak INSERT/UPDATE/DELETE untuk pengguna web', 'lulus', 'Hak tulis tabel hanya dimiliki server.' + pratinjau);
  tambah('anon_baca', 'Pengunjung tanpa login tidak bisa membaca tabel', 'lulus', 'Data hanya terbuka setelah login Google terdaftar.' + pratinjau);
  tambah('kolom_sensitif', 'Kolom sensitif BNBA (No. KK, ibu kandung, alamat, rekening) tidak terbuka ke browser', 'lulus', 'Browser hanya menerima versi tersamar; data lengkap lewat fungsi berizin dan tercatat di audit log.' + pratinjau);
  tambah('search_path', 'Fungsi berhak khusus memakai search_path aman', 'lulus', 'Melindungi dari penyusupan fungsi tiruan.' + pratinjau);
  tambah('fungsi_anon', 'Fungsi yang dapat dipanggil tanpa login', 'lulus', 'Tidak ada fungsi data yang terbuka tanpa login.' + pratinjau);
  const sa = D.pengguna.filter((u) => u.aktif && u.peran_sistem === 'super_admin').length;
  tambah('super_admin', 'Jumlah Super Admin aktif maksimal 2', sa >= 1 && sa <= 2 ? 'lulus' : 'gagal', `${sa} Super Admin aktif.`);
  const lama = D.pengguna.filter((u) => u.aktif && ((!u.login_terakhir && Date.parse(u.dibuat_pada || 0) < Date.now() - 30 * 864e5) || (u.login_terakhir && Date.parse(u.login_terakhir) < Date.now() - 90 * 864e5))).length;
  tambah('akun_lama', 'Akun aktif yang lama tidak dipakai', lama ? 'peringatan' : 'lulus', lama ? `${lama} akun aktif menganggur (belum pernah login sejak dibuat > 30 hari, atau tidak login > 90 hari). Nonaktifkan bila sudah tidak bertugas (Pengaturan → Pengguna & Hak Akses).` : 'Tidak ada akun aktif yang menganggur (belum login 30 hari sejak dibuat / tidak login 90 hari).');
  const tp = D.pengguna.filter((u) => u.aktif && u.jenis_akses === 'pegawai' && !u.peran_sistem && !D.pengguna_pokja.some((pp) => pp.pengguna_id === u.id)).length;
  tambah('tanpa_pokja', 'Pegawai aktif tanpa Pokja', tp ? 'peringatan' : 'lulus', tp ? `${tp} pegawai belum masuk Pokja: menunya terbatas.` : 'Semua pegawai sudah punya Pokja.');
  const pn = D.penyimpanan?.aktif || 'drive_sa1';
  tambah('penyimpanan', 'Penyimpanan berkas aktif', pn === 'tunda' ? 'peringatan' : 'lulus', pn === 'tunda' ? 'Unggahan sedang DITUNDA. Hubungkan Drive di Pengaturan → Penyimpanan Berkas.' : `Tujuan aktif: ${pn}.`);
  const gagal = (D.antrian || []).filter((a) => a.status === 'gagal').length;
  tambah('notif', 'Antrean WhatsApp/email 7 hari', gagal ? 'peringatan' : 'lulus', gagal ? `${gagal} pengiriman gagal. Periksa token Fonnte di Pengaturan → Notifikasi WA & Email.` : 'Tidak ada pengiriman gagal.');
  const au = D.audit_log.filter((a) => Date.parse(a.waktu) > Date.now() - 7 * 864e5).length;
  tambah('audit', 'Audit log mencatat aktivitas', au ? 'lulus' : 'peringatan', `${au} catatan dalam 7 hari terakhir.`);
  const cad = D.audit_log.find((a) => a.aksi === 'CADANGAN');
  tambah('cadangan', 'Cadangan data terbaru', !cad || Date.parse(cad.waktu) < Date.now() - 7 * 864e5 ? 'peringatan' : 'lulus',
    !cad ? 'Belum pernah membuat cadangan. Buka Pengaturan → Cadangan & Pemulihan.' : 'Terakhir: ' + new Date(cad.waktu).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB.');
  I.log('PERIKSA', null, null, 'Menjalankan pemeriksaan keamanan'); I.simpan();
  return { waktu: I.sekarang(), hasil: r, pratinjau: true };
}
// nama tabel basis data → kunci data pratinjau
const TABEL = [['pokja', 'pokja'], ['pengguna', 'pengguna'], ['pengguna_pokja', 'pengguna_pokja'], ['pengumuman', 'pengumuman'], ['usulan', 'usulan'], ['usulan_tahap', 'tahap'],
  ['usulan_riwayat', 'riwayat'], ['bnba', 'bnba'], ['penyaluran_log', 'penyaluran'], ['lks', 'lks'], ['aster', 'aster'], ['pegawai', 'pegawai'], ['ojt', 'ojt'], ['jadwal', 'jadwal'],
  ['renja', 'renja'], ['dok_folder', 'dok_folder'], ['produk_hukum', 'produk_hukum'], ['tugas', 'tugas'], ['percakapan', 'percakapan'], ['pesan', 'pesan'], ['dok_pm_tanpa', 'dok_tanpa'],
  ['smv_tugas', 'smv_tugas'], ['supermonev', 'supermonev'], ['belanja', 'belanja'], ['berkas', 'berkas'], ['dokumen', 'dokumen'], ['notifikasi', 'notifikasi']];
const kunciP = (t) => TABEL.find(([x]) => x === t)?.[1];
const kunciBaris = (t, r) => (t === 'pengguna_pokja' ? r.pengguna_id + ':' + r.pokja_id : t === 'usulan_tahap' ? r.usulan_id + ':' + r.tahap : r.id);
export async function kesehatanSistem() {
  await jeda(300); siapkan(); butuhSA();
  const D = d(), uk = (x) => new Blob([JSON.stringify(x || [])]).size, fmt = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' kB');
  const tabel = TABEL.filter(([, k]) => Array.isArray(D[k])).map(([nama, k]) => ({ nama, baris: D[k].length, ukuran: fmt(uk(D[k])), _b: uk(D[k]) })).sort((a, b) => b._b - a._b).map(({ _b, ...x }) => x);
  const total = uk(D);
  return { versi: '2.4.0', tahap: '6', ukuran_db: fmt(total), ukuran_db_byte: total, tabel,
    pengguna: { aktif: D.pengguna.filter((u) => u.aktif).length, login_7_hari: D.pengguna.filter((u) => u.login_terakhir && Date.parse(u.login_terakhir) > Date.now() - 7 * 864e5).length,
      petugas: D.pengguna.filter((u) => u.aktif && u.jenis_akses === 'petugas_supermonev').length },
    berkas: { jumlah: D.berkas.filter((b) => !b.dihapus).length, byte: D.berkas.filter((b) => !b.dihapus).reduce((a, b) => a + (b.ukuran || 0), 0) },
    antrean: { antri: (D.antrian || []).filter((a) => a.status === 'antri').length, gagal: (D.antrian || []).filter((a) => a.status === 'gagal').length },
    realtime: ['notifikasi', 'pengumuman', 'pengguna', 'usulan', 'pesan', 'jadwal', 'supermonev', 'smv_tugas', 'belanja'],
    aktivitas_24jam: D.audit_log.filter((a) => Date.parse(a.waktu) > Date.now() - 864e5).length, pratinjau: true };
}
export async function cadanganDaftar() {
  await jeda(200); siapkan(); butuhSA();
  return { versi: '2.4.0', waktu: I.sekarang(), proyek: 'pratinjau', tabel: TABEL.filter(([, k]) => Array.isArray(d()[k])).map(([tabel, k]) => ({ tabel, baris: d()[k].length })) };
}
export async function cadanganTabel(t, off = 0, batas = 1000) {
  await jeda(60); siapkan(); butuhSA();
  const k = kunciP(t); if (!k) throw g(`Tabel ${t} tidak termasuk cadangan.`);
  return I.salin((d()[k] || []).slice(off, off + Math.min(5000, batas))).map((r) => { delete r.drive_id; return r; });
}
export async function catatCadangan(ring) {
  await jeda(40); butuhSA();
  I.log('CADANGAN', null, null, `Membuat cadangan data (${ring?.baris ?? '?'} baris, ${ring?.tabel ?? '?'} tabel)`, ring); I.simpan();
}
export async function pulihkanTabel(t, rows, uji = true, peta = {}) {
  await jeda(120); siapkan(); butuhSA();
  const k = kunciP(t); if (!k) throw g(`Tabel ${t} tidak dapat dipulihkan.`);
  if (!Array.isArray(rows)) throw g('Format cadangan tidak dikenali.');
  const arr = (d()[k] ||= []), ada = new Set(arr.map((r) => kunciBaris(t, r)));
  let tambah = 0, sudah = 0;
  for (let r of rows) {
    if (peta && Object.keys(peta).length) { let s = JSON.stringify(r); for (const [a, b] of Object.entries(peta)) if (s.includes(a)) s = s.split(a).join(b); r = JSON.parse(s); }
    if (ada.has(kunciBaris(t, r))) { sudah++; continue; }
    tambah++;
    if (!uji) { arr.push(r); ada.add(kunciBaris(t, r)); }
  }
  if (!uji && tambah) { I.log('PULIHKAN', t, null, `Memulihkan ${tambah} baris tabel ${t} dari cadangan`, { ditambah: tambah, sudah_ada: sudah }); I.simpan(); }
  return { tabel: t, baris: rows.length, ditambah: tambah, sudah_ada: sudah, jumlah_gagal: 0, gagal: [], peta: {}, catatan: [], uji };
}

/** Status sambungan realtime. Di mode pratinjau tidak ada server: selalu "pratinjau". */
export function pantauRealtime(cb) { try { cb('pratinjau'); } catch {} return () => {}; }
export const sambungUlangRealtime = () => {};

/** Dipanggil adapter-pratinjau.init() setelah data Tahap 3–4 siap. */
export function siapkanT56() { try { siapkan(); } catch (e) { console.warn('Data contoh Tahap 5–6 gagal disiapkan:', e); } }
