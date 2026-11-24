// MODE PRATINJAU — Tahap 3 & 4 (v2.3.0). Meniru fungsi SQL SETUP_SUPABASE_TAHAP34 agar halaman bisa dicoba
// tanpa server. Data contoh FIKTIF, tersimpan di sessionStorage browser bersama data pratinjau lainnya.
import { _dalam as I } from './adapter-pratinjau.js';

const KLASTER = ['BWBLP Umum', 'BWBLP Eks Napiter', 'Gelandangan', 'Pengemis', 'Pemulung', 'KPO', 'PMIB', 'Eks WTS', 'KTK'];
const PROV = { 'Aceh': '11', 'Sumatera Utara': '12', 'Sumatera Barat': '13', 'Riau': '14', 'Jambi': '15', 'Sumatera Selatan': '16', 'Bengkulu': '17',
  'Lampung': '18', 'Kepulauan Bangka Belitung': '19', 'Kepulauan Riau': '21', 'DKI Jakarta': '31', 'Jawa Barat': '32', 'Jawa Tengah': '33',
  'Daerah Istimewa Yogyakarta': '34', 'Jawa Timur': '35', 'Banten': '36', 'Bali': '51', 'Nusa Tenggara Barat': '52', 'Nusa Tenggara Timur': '53',
  'Kalimantan Barat': '61', 'Kalimantan Tengah': '62', 'Kalimantan Selatan': '63', 'Kalimantan Timur': '64', 'Kalimantan Utara': '65',
  'Sulawesi Utara': '71', 'Sulawesi Tengah': '72', 'Sulawesi Selatan': '73', 'Sulawesi Tenggara': '74', 'Gorontalo': '75', 'Sulawesi Barat': '76',
  'Maluku': '81', 'Maluku Utara': '82', 'Papua': '91-A', 'Papua Selatan': '91-C', 'Papua Tengah': '91-D', 'Papua Pegunungan': '91-B',
  'Papua Barat': '92-A', 'Papua Barat Daya': '92-B' };
const KAT_DOK = ['SK ATENSI', 'SK Kegiatan', 'KAK', 'Bahan Paparan', 'Dokumentasi Kegiatan', 'Lainnya'];
const LABEL_PM = { sebelum_usaha: 'Sebelum Usaha', saat_penyaluran: 'Saat Penyaluran', supermonev: 'Supermonev' };

const d = () => I.db;
const g = (pesan, code) => I.galat(pesan, code);
const jeda = (ms = 70) => I.tunggu(ms);
const saya = () => I.sayaAktif();
const sayaId = () => saya()?.id;
const kode = (pid) => I.pokjaById(pid)?.kode;
const kapokjaDi = (pid) => I.pokjaEf().some((e) => e.pokja_id === pid && e.jabatan === 'kapokja');
const kapokjaKode = (k) => I.pokjaEf().some((e) => kode(e.pokja_id) === k && e.jabatan === 'kapokja');
const bolehPokja = (pid) => I.isSA() || I.idsPokja().includes(pid);
const pokjaIdKode = (k) => d().pokja.find((p) => p.kode === k)?.id;
const pengurus = (k, jab) => d().pengguna.filter((u) => u.aktif && d().pengguna_pokja.some((pp) => pp.pengguna_id === u.id && kode(pp.pokja_id) === k && (!jab || pp.jabatan === jab))).map((u) => u.id);
const butuhPeg = () => { if (!I.isPeg()) throw g('Akses ditolak.', '42501'); };
const teks = (v) => (v == null || String(v).trim() === '' ? null : String(v).trim());
const int = (v) => (/^-?\d{1,9}$/.test(String(v ?? '').trim()) ? Number(String(v).trim()) : null);
const num = (v) => { const s = String(v ?? '').trim().replace(/\./g, '').replace(',', '.'); return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null; };
const arr = (v) => (Array.isArray(v) ? v : String(v ?? '').split(/\s*[;,]\s*/)).map((x) => String(x).trim()).filter(Boolean);
const tgl = (v) => { v = teks(v); if (!v) return null; if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10); const m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null; };
const pilih = (v, daftar, label) => { v = teks(v); if (!v) return null; const c = daftar.find((x) => x.toLowerCase() === v.toLowerCase()); if (c) return c; throw g(`Pilihan ${label} tidak dikenal: "${v}". Pilih dari daftar.`); };
const provBaku = (v) => { v = teks(v); if (!v) return null; return Object.keys(PROV).find((p) => p.toLowerCase() === v.toLowerCase()) || null; };
const pokjaInfo = (pid) => { const k = I.pokjaById(pid) || {}; return { pokja_nama: k.nama_pendek, warna: k.warna, warna_tint: k.warna_tint, warna_teks: k.warna_teks }; };
const halaman = (rows, f) => { const per = Math.min(500, Math.max(1, Number(f.per) || 25)), hal = Math.max(1, Number(f.hal) || 1); return rows.slice((hal - 1) * per, hal * per); };
const urutTurun = (k) => (a, b) => String(b[k] || '').localeCompare(String(a[k] || ''));
const hitung = (rows, fn) => { const m = new Map(); rows.forEach((r) => [].concat(fn(r)).forEach((k) => m.set(k, (m.get(k) || 0) + 1))); return [...m].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n); };
const hariIniWib = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
const beriTahu = (ids, ev, judul, isi, tautan) => I.beriTahu(ids, ev, judul, isi, tautan);

// =====================================================================================
// DATA CONTOH
// =====================================================================================
function siapkan() {
  const D = d();
  if (D.lks) return;
  const t = Date.now(), lalu = (h) => new Date(t - h * 864e5).toISOString();
  const pkTeknis = D.pokja.filter((p) => p.kelompok === 'teknis');
  D.seq_lks = 0; D.seq_pesan = 0;
  // ---- LKS (fiktif)
  const LKS = [
    ['LKS Bina Insani Mandiri', 'Jawa Barat', 'Kota Bogor', ['KPO', 'PMIB'], false, 'A', 'Dalam lembaga'],
    ['Yayasan Pelita Harapan Bangsa', 'DKI Jakarta', 'Kota Jakarta Timur', ['Gelandangan', 'Pengemis', 'Pemulung'], true, 'B', 'Dalam dan luar lembaga'],
    ['LKS Rumah Singgah Cahaya', 'DKI Jakarta', 'Kota Jakarta Utara', ['Gelandangan'], false, 'B', 'Dalam lembaga'],
    ['Panti Sosial Mitra Sejahtera', 'Jawa Tengah', 'Kota Surakarta', ['BWBLP Umum', 'BWBLP Eks Napiter'], false, 'A', 'Luar lembaga'],
    ['LKS Wanita Mulia', 'Jawa Barat', 'Kab. Indramayu', ['Eks WTS', 'KTK'], false, 'C', 'Dalam dan luar lembaga'],
    ['Yayasan Sahabat Migran', 'Kalimantan Utara', 'Kab. Nunukan', ['KPO', 'PMIB'], true, 'B', 'Dalam lembaga'],
    ['LKS Bakti Nusa', 'Jawa Timur', 'Kota Surabaya', ['Pemulung', 'Pengemis'], true, 'Belum mengajukan', 'Luar lembaga'],
    ['LKS Harapan Timur', 'Nusa Tenggara Timur', 'Kota Kupang', ['KPO', 'PMIB'], false, 'C', 'Dalam lembaga'],
    ['Yayasan Pintu Pulang', 'Sumatera Utara', 'Kota Medan', ['BWBLP Umum'], false, 'B', 'Luar lembaga'],
    ['LKS Cahaya Bunda', 'Sulawesi Selatan', 'Kota Makassar', ['Eks WTS', 'KTK'], true, 'D-TTA', 'Dalam lembaga'],
    ['LKS Teratai', 'Bali', 'Kota Denpasar', ['KTK'], false, 'B', 'Luar lembaga'],
    ['Yayasan Harmoni Papua', 'Papua', 'Kota Jayapura', ['Gelandangan', 'KPO'], true, 'Belum mengajukan', 'Dalam dan luar lembaga'],
    ['LKS Mekar Tunas Riau', 'Kepulauan Riau', 'Kota Batam', ['PMIB', 'KPO'], false, 'A', 'Dalam lembaga'],
    ['LKS Sinar Lampung', 'Lampung', 'Kota Bandar Lampung', ['Pemulung'], false, 'C', 'Luar lembaga'],
  ];
  const kpo = pokjaIdKode('KPO_PMBS');
  D.lks = LKS.map(([nama, provinsi, kabkota, klaster, non, akr, bentuk], i) => ({
    id: 'lks-' + (i + 1), kode: 'LKS-' + String(++D.seq_lks).padStart(4, '0'), pokja_id: pkTeknis[i % pkTeknis.length].id,
    status_verifikasi: i < 12 ? 'terverifikasi' : i === 12 ? 'menunggu' : 'draft', status_asesmen: 'sudah', nama, alamat: 'Jl. Contoh No. ' + (i + 3), provinsi, kabkota,
    telepon: '021-55' + (1000 + i), ketua: 'Ketua ' + nama.split(' ').slice(-1)[0], tahun_berdiri: 1998 + i, status_hukum: 'Berbadan hukum', status_operasional: 'Aktif',
    no_induk: 'NI-' + (3200 + i), akreditasi: akr, akreditasi_tahun: akr.length === 1 ? 2023 : null, klaster, non_tskpo: non, jenis_lks: non ? 'Multi layanan' : 'Murni TSKPO',
    jenis_layanan: ['Rehabilitasi Sosial'], bentuk_layanan: bentuk, wilayah_jangkauan: 'Provinsi', daya_tampung: 20 + i * 5, pm_laki: 8 + i, pm_perempuan: 6 + (i % 5),
    pm_dalam: 10 + i, pm_luar: 4 + (i % 3), jumlah_pengurus: 6 + (i % 4), asesmen: { petugas_nama: 'Petugas Asesmen ' + (i + 1), tgl: '2026-0' + (1 + (i % 9)) + '-15' },
    detail: {}, catatan_verifikasi: null, diverifikasi_nama: i < 12 ? 'Hendra Saputra' : null, diverifikasi_pokja: i < 12 ? 'Data' : null, diverifikasi_pada: i < 12 ? lalu(30 - i) : null,
    sumber: i < 10 ? 'impor' : 'web', dibuat_oleh: i >= 12 ? 'pg-8' : 'pg-12', dibuat_oleh_nama: i >= 12 ? 'Bambang Wijaya' : 'Hendra Saputra',
    dibuat_pada: lalu(40 - i), diajukan_pada: i <= 12 ? lalu(35 - i) : null, diubah_pada: lalu(Math.max(1, 20 - i)),
  }));
  D.lks[12].pokja_id = kpo; D.lks[13].pokja_id = kpo;
  // ---- Aster (fiktif)
  const PEN = [['Rina Oktaviani', 'Jawa Barat'], ['Ahmad Faisal', 'Jawa Barat'], ['Dian Puspita', 'DKI Jakarta'], ['Yoga Pratama', 'Jawa Tengah'], ['Maria Lena', 'Nusa Tenggara Timur'], ['Imam Syafii', 'Jawa Timur'], ['Sarah Tanjung', 'Sumatera Utara']];
  const JPPKS = ['Pemulung', 'Gelandangan', 'Pengemis', 'KPO', 'PMIB', 'Eks WTS', 'BWBLP Umum'];
  const KABS = { 'Jawa Barat': ['Kab. Bogor', 'Kab. Cianjur', 'Kab. Garut'], 'DKI Jakarta': ['Kota Jakarta Timur', 'Kota Jakarta Barat'], 'Jawa Tengah': ['Kota Semarang', 'Kab. Brebes'],
    'Nusa Tenggara Timur': ['Kota Kupang'], 'Jawa Timur': ['Kota Surabaya', 'Kab. Malang'], 'Sumatera Utara': ['Kota Medan'] };
  D.aster = Array.from({ length: 46 }, (_, i) => {
    const [pn, prov] = PEN[i % PEN.length], kab = KABS[prov][i % KABS[prov].length];
    const nik = '32' + String(7100000000 + i * 131).padStart(10, '0') + String(2000 + i).slice(-4);
    return { id: 'as-' + (i + 1), pokja_id: pokjaIdKode('DATA'), status_verifikasi: i < 40 ? 'terverifikasi' : i < 43 ? 'menunggu' : 'draft', batch: 'Batch ' + (1 + (i % 3)),
      jenis_batch: i % 3 === 2 ? 'Susulan' : 'Reguler', nik_target: nik, no_kk_target: nik.slice(0, 12) + '0099', nama_target: 'Target Survei ' + (i + 1), kepala_keluarga: i % 2 ? 'Ya' : 'Tidak',
      nik_pensurvei: '317101' + String(1000000000 + (i % PEN.length)).slice(-10), nama_pensurvei: pn, instansi_pensurvei: 'Dinas Sosial', satker_pensurvei: 'Dinsos ' + kab,
      hp_pensurvei: '0812-77' + String(10000 + (i % PEN.length)), tgl_survei: lalu(60 - i), status_survei: i % 5 === 4 ? 'Tidak Ditemukan' : 'Lanjut Survey', provinsi: prov, kabkota: kab,
      kecamatan: 'Kec. Contoh', kelurahan: 'Kel. Contoh', alamat: 'Kp. Contoh RT 0' + (1 + (i % 9)), dusun: null, rt: '0' + (1 + (i % 9)), rw: '04', latitude: null, longitude: null,
      ragam_ppks: [JPPKS[i % JPPKS.length]], jenis_ppks: JPPKS[i % JPPKS.length], catatan_verifikasi: null, diverifikasi_nama: i < 40 ? 'Hendra Saputra' : null,
      diverifikasi_pada: i < 40 ? lalu(20) : null, sumber: 'impor', dibuat_oleh: 'pg-11', dibuat_oleh_nama: 'Nur Aini', dibuat_pada: lalu(50 - i), diajukan_pada: null, diubah_pada: lalu(Math.max(1, 40 - i)) };
  });
  // ---- Pegawai & SDM pendamping
  D.pegawai = [];
  D.pengguna.filter((u) => u.aktif && u.jenis_akses === 'pegawai').forEach((u, i) => {
    const pp = D.pengguna_pokja.find((x) => x.pengguna_id === u.id);
    D.pegawai.push({ id: 'pgw-' + (i + 1), jenis: 'pusat', nama: u.nama, nip: '19' + (80 + i) + '0101200' + (i % 9) + '01' + (1000 + i), jabatan: u.peran_sistem === 'direktur' ? 'Direktur' : pp?.jabatan === 'kapokja' ? 'Ketua Pokja' : 'Penyuluh Sosial',
      golongan: ['III/a', 'III/b', 'III/c', 'IV/a'][i % 4], pokja_id: pp?.pokja_id || null, pengguna_id: u.id, provinsi: null, kabkota: null, no_hp: u.no_hp, email: u.email, status: 'Aktif',
      mulai_tugas: '2019-0' + (1 + (i % 9)) + '-01', urutan: i, catatan: null, dibuat_pada: lalu(90), diubah_pada: lalu(90) });
  });
  [['Rina Oktaviani', 'Jawa Barat', 'Kab. Bogor'], ['Ahmad Faisal', 'Jawa Barat', 'Kab. Cianjur'], ['Dian Puspita', 'DKI Jakarta', 'Kota Jakarta Timur'], ['Yoga Pratama', 'Jawa Tengah', 'Kota Semarang'],
    ['Maria Lena', 'Nusa Tenggara Timur', 'Kota Kupang'], ['Imam Syafii', 'Jawa Timur', 'Kota Surabaya'], ['Sarah Tanjung', 'Sumatera Utara', 'Kota Medan'], ['Bonifasius Wenda', 'Papua', 'Kota Jayapura'],
    ['Nurul Hidayah', 'Kalimantan Utara', 'Kab. Nunukan']].forEach(([nama, provinsi, kabkota], i) => D.pegawai.push({
    id: 'pdm-' + (i + 1), jenis: 'pendamping', nama, nip: null, jabatan: 'Pendamping Rehabilitasi Sosial', golongan: null, pokja_id: null, pengguna_id: null, provinsi, kabkota,
    no_hp: '0813-55' + (20000 + i), email: null, status: 'Aktif', mulai_tugas: '2024-02-01', urutan: 100 + i, catatan: null, dibuat_pada: lalu(80), diubah_pada: lalu(80) }));
  const bulanIni = hariIniWib().slice(0, 7);
  D.ojt = [
    { id: 'ojt-1', judul: 'OJT Pendampingan Korban TPPO', penyelenggara: 'Pokja Kepegawaian', lokasi: 'Jakarta', tanggal_mulai: bulanIni + '-10', tanggal_selesai: bulanIni + '-12',
      peserta: ['pdm-1', 'pdm-2', 'pdm-3'], peserta_luar: 4, status: 'Berlangsung', catatan: null, dibuat_nama: 'Kapokja Kepegawaian', dibuat_pada: lalu(20), diubah_pada: lalu(5) },
    { id: 'ojt-2', judul: 'OJT Asesmen Klaster Gepeng', penyelenggara: 'Pokja Kepegawaian', lokasi: 'Bandung', tanggal_mulai: '2026-08-04', tanggal_selesai: '2026-08-06',
      peserta: ['pdm-4', 'pdm-5'], peserta_luar: 0, status: 'Selesai', catatan: null, dibuat_nama: 'Kapokja Kepegawaian', dibuat_pada: lalu(120), diubah_pada: lalu(100) },
  ];
  // ---- Jadwal bulan ini
  D.jadwal = [];
  const tambahJ = (pegIds, kegiatan, jenis, lokasi, h1, h2) => {
    const grup = I.uid();
    for (let h = h1; h <= h2; h++) pegIds.forEach((p) => D.jadwal.push({ id: I.uid(), pegawai_id: p, tanggal: `${bulanIni}-${String(h).padStart(2, '0')}`, kegiatan, jenis, lokasi, keterangan: null, grup, dibuat_nama: 'Anggota Pokja TU', dibuat_pada: lalu(3) }));
  };
  tambahJ(['pgw-2', 'pgw-3', 'pgw-7'], 'Supermonev Indramayu', 'Perjadin', 'Kab. Indramayu', 3, 5);
  tambahJ(['pgw-10', 'pgw-11'], 'Rekon BNI', 'Fullday', 'Jakarta', 5, 5);
  tambahJ(['pgw-1', 'pgw-4', 'pgw-12'], 'Pembahasan PKS APO', 'Fullboard', 'Bogor', 9, 11);
  tambahJ(['pgw-8', 'pgw-9'], 'Penjangkauan Nunukan', 'Perjadin', 'Kab. Nunukan', 15, 19);
  tambahJ(['pgw-5'], 'Bimtek SDM', 'Fullday', 'Jakarta', 22, 22);
  D.libur34 = [{ tanggal: '2026-01-01', nama: 'Tahun Baru Masehi' }, { tanggal: '2026-05-01', nama: 'Hari Buruh' }, { tanggal: '2026-06-01', nama: 'Hari Lahir Pancasila' },
    { tanggal: '2026-08-17', nama: 'Hari Kemerdekaan RI' }, { tanggal: '2026-12-25', nama: 'Hari Raya Natal' }];
  // ---- Rencana kerja
  D.renja = [
    { id: 'rj-1', pokja_id: kpo, tahun: 2027, judul: 'Rencana Kerja Pokja KPO dan PMBS 2027', tujuan: 'Penanganan korban TPPO dan PMBS terpadu', status_verifikasi: 'terverifikasi',
      kegiatan: [{ nama: 'Penjangkauan korban TPPO', target: '400', satuan: 'orang', waktu: 'TW I–IV', anggaran: 1200000000 }, { nama: 'Pemulangan PMBS', target: '250', satuan: 'orang', waktu: 'TW II–IV', anggaran: 750000000 }],
      total_anggaran: 1950000000, catatan_verifikasi: null, diverifikasi_nama: 'Anggota Perencanaan', diverifikasi_pada: lalu(6), dibuat_oleh: 'pg-7', dibuat_oleh_nama: 'Sari Handayani', dibuat_pada: lalu(14), diajukan_pada: lalu(10), diubah_pada: lalu(6) },
    { id: 'rj-2', pokja_id: pokjaIdKode('GEPENGLUNG'), tahun: 2027, judul: 'Rencana Kerja Gepenglung 2027', tujuan: 'Penanganan gelandangan, pengemis, dan pemulung', status_verifikasi: 'menunggu',
      kegiatan: [{ nama: 'Penjangkauan terpadu 10 kota', target: '600', satuan: 'orang', waktu: 'TW I–IV', anggaran: 900000000 }], total_anggaran: 900000000, catatan_verifikasi: null,
      dibuat_oleh: 'pg-9', dibuat_oleh_nama: 'Fitri Rahmawati', dibuat_pada: lalu(5), diajukan_pada: lalu(2), diubah_pada: lalu(2) },
  ];
  // ---- Folder & dokumen
  D.dok_folder = [];
  D.pokja.forEach((p) => pastikanFolder(p.id));
  D.dokumen = [];
  const dok = (pkKode, folderNama, judul, nama, mime, status, kategori, h) => {
    const pid = pokjaIdKode(pkKode), f = D.dok_folder.find((x) => x.pokja_id === pid && x.nama === folderNama);
    const b = { id: I.uid(), usulan_id: null, tahap: null, jenis: /^image/.test(mime) ? 'foto' : 'dokumen', nama, ukuran: /^image/.test(mime) ? 380000 : 860000, mime, lokasi: 'drive_sa1', tautan: null,
      diunggah_oleh: 'pg-8', diunggah_nama: 'Bambang Wijaya', dibuat_pada: lalu(h), dihapus: false, konteks: 'dokumen', ref_id: null, pokja_id: pid };
    const x = { id: I.uid(), pokja_id: pid, folder_id: f.id, berkas_id: b.id, judul, keterangan: null, status, kategori, diajukan_nama: status !== 'privat' ? 'Bambang Wijaya' : null,
      diajukan_pada: status !== 'privat' ? lalu(h - 1) : null, diverifikasi_nama: status === 'terbit' ? 'Anggota Pokja TU' : null, diverifikasi_pada: status === 'terbit' ? lalu(Math.max(0, h - 2)) : null,
      catatan_verifikasi: null, dibuat_oleh: 'pg-8', dibuat_nama: 'Bambang Wijaya', dibuat_pada: lalu(h), diubah_pada: lalu(h), dihapus: false };
    b.ref_id = x.id; D.berkas.push(b); D.dokumen.push(x);
  };
  dok('TU', 'SK', 'SK Penetapan Penerima ATENSI TW III 2026', 'SK_ATENSI_TW3_2026.pdf', 'application/pdf', 'terbit', 'SK ATENSI', 25);
  dok('TU', 'SK', 'SK Tim Pelaksana Supermonev 2026', 'SK_Tim_Supermonev.pdf', 'application/pdf', 'terbit', 'SK Kegiatan', 40);
  dok('KPO_PMBS', 'KAK', 'KAK Penjangkauan Korban TPPO 2026', 'KAK_Penjangkauan_TPPO.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'terbit', 'KAK', 18);
  dok('KPO_PMBS', 'File Kegiatan', 'Bahan Paparan Rakor Nasional ATENSI', 'Paparan_Rakornas.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'terbit', 'Bahan Paparan', 12);
  dok('GEPENGLUNG', 'File Kegiatan', 'Dokumentasi Penjangkauan Jakarta Timur', 'Penjangkauan_Jaktim.jpg', 'image/jpeg', 'terbit', 'Dokumentasi Kegiatan', 9);
  dok('KPO_PMBS', 'File Kegiatan', 'Laporan Pendampingan Nunukan', 'Laporan_Nunukan.pdf', 'application/pdf', 'diajukan', 'Lainnya', 2);
  dok('KPO_PMBS', 'SK', 'Draft SK Penanganan Darurat', 'Draft_SK_Darurat.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'privat', null, 1);
  // ---- Produk hukum
  D.hukum = [
    { id: 'ph-1', jenis: 'Peraturan Menteri', nomor: '7', tahun: 2021, judul: 'Permensos No. 7 Tahun 2021 tentang Asistensi Rehabilitasi Sosial (ATENSI)', tentang: 'Asistensi Rehabilitasi Sosial', status: 'Berlaku', tgl_tetap: '2021-03-02' },
    { id: 'ph-2', jenis: 'Keputusan Dirjen', nomor: '45/3/HK.01/2026', tahun: 2026, judul: 'Pedoman Teknis Pelaksanaan ATENSI TSKPO', tentang: 'Pedoman teknis', status: 'Berlaku', tgl_tetap: '2026-02-10' },
    { id: 'ph-3', jenis: 'SOP', nomor: 'SOP-RSTSKPO-03', tahun: 2026, judul: 'SOP Pengusulan dan Penerbitan SK Penerima Bantuan', tentang: 'Alur 11 tahap', status: 'Berlaku', tgl_tetap: '2026-04-01' },
    { id: 'ph-4', jenis: 'SOP', nomor: 'SOP-RSTSKPO-01', tahun: 2023, judul: 'SOP Penjangkauan Gelandangan dan Pengemis', tentang: 'Penjangkauan', status: 'Draf/Revisi', tgl_tetap: null },
  ].map((x) => ({ ...x, dibuat_nama: 'Pokja Hukum', dibuat_pada: lalu(30), diubah_pada: lalu(30) }));
  // ---- Tugas
  D.tugas = [
    { id: 'tg-1', judul: 'Lengkapi foto Sebelum Usaha PM Cianjur', deskripsi: 'Unggah 1–2 foto per PM di tab Dokumentasi.', pokja_id: kpo, ditugaskan_ke: 'pg-8', pemberi_id: 'pg-7', pemberi_nama: 'Sari Handayani',
      tenggat: hariIniWib(), prioritas: 'Tinggi', status: 'Dikerjakan', catatan: null, dibuat_pada: lalu(3), diubah_pada: lalu(1), selesai_pada: null },
    { id: 'tg-2', judul: 'Rekap OJT bulan ini', deskripsi: null, pokja_id: pokjaIdKode('TU'), ditugaskan_ke: 'pg-3', pemberi_id: 'pg-2', pemberi_nama: 'Kapokja TU',
      tenggat: '2026-12-05', prioritas: 'Sedang', status: 'Baru', catatan: null, dibuat_pada: lalu(1), diubah_pada: lalu(1), selesai_pada: null },
    { id: 'tg-3', judul: 'Verifikasi publikasi KAK Pokja KPO', deskripsi: null, pokja_id: pokjaIdKode('TU'), ditugaskan_ke: 'pg-3', pemberi_id: 'pg-2', pemberi_nama: 'Kapokja TU',
      tenggat: '2026-11-01', prioritas: 'Rendah', status: 'Selesai', catatan: 'Sudah terbit', dibuat_pada: lalu(25), diubah_pada: lalu(20), selesai_pada: lalu(20) },
  ];
  // ---- Percakapan
  D.percakapan = []; D.pesan = []; D.baca34 = {};
  pastikanKanal();
  const lintas = D.percakapan.find((c) => c.jenis === 'lintas');
  const kanalKpo = D.percakapan.find((c) => c.jenis === 'pokja' && c.pokja_id === kpo);
  [[lintas, 'pg-2', 'Kapokja TU', 'Rapat koordinasi lintas-Pokja hari Kamis pukul 09.00 di Ruang Rapat Direktorat.'],
    [lintas, 'pg-10', 'Yusuf Hidayat', 'Siap. Keuangan akan membawa rekap SP2D November.'],
    [kanalKpo, 'pg-7', 'Sari Handayani', 'Mohon foto Sebelum Usaha untuk usulan Cianjur dilengkapi minggu ini.'],
    [kanalKpo, 'pg-8', 'Bambang Wijaya', 'Baik Bu, tinggal 3 PM lagi.']].forEach(([c, id, nama, isi], i) => {
    D.pesan.push({ id: ++D.seq_pesan, percakapan_id: c.id, pengirim_id: id, pengirim_nama: nama, isi, dihapus: false, dibuat_pada: lalu(2 - i * 0.2) });
    c.terakhir_pada = lalu(2 - i * 0.2);
  });
  D.dok_tanpa = [];
  // ---- riwayat realisasi 2026 (usulan selesai di berbagai provinsi & bulan) agar dashboard bermakna
  const URUT = ['1', '2', '3', '4a', '4b', '4c', '5', '6', '7', '8', '9', '10', '11'];
  const RIW = [
    ['KPO_PMBS', 'Jawa Timur', 'Kota Surabaya', '2026-02', 9, ['KPO', 'PMIB'], true],
    ['GEPENGLUNG', 'Sumatera Utara', 'Kota Medan', '2026-03', 8, ['Gelandangan', 'Pengemis', 'Pemulung'], true],
    ['KPO_PMBS', 'Nusa Tenggara Timur', 'Kota Kupang', '2026-04', 10, ['KPO', 'PMIB'], true],
    ['BWBP', 'Sulawesi Selatan', 'Kota Makassar', '2026-05', 6, ['BWBLP Umum', 'BWBLP Eks Napiter'], true],
    ['KTK_WTS', 'Bali', 'Kota Denpasar', '2026-06', 6, ['KTK', 'Eks WTS'], true],
    ['KPO_PMBS', 'Kalimantan Utara', 'Kab. Nunukan', '2026-07', 12, ['PMIB', 'KPO'], true],
    ['GEPENGLUNG', 'Lampung', 'Kota Bandar Lampung', '2026-08', 7, ['Pemulung', 'Gelandangan'], true],
    ['KPO_PMBS', 'Kepulauan Riau', 'Kota Batam', '2026-09', 8, ['PMIB'], true],
    ['GEPENGLUNG', 'Papua', 'Kota Jayapura', '2026-10', 5, ['Gelandangan', 'Pengemis'], true],
    ['BWBP', 'Jawa Tengah', 'Kota Semarang', '2026-10', 6, ['BWBLP Umum'], false],
    ['KTK_WTS', 'Sumatera Selatan', 'Kota Palembang', '2026-11', 5, ['Eks WTS'], false],
  ];
  const NM = ['Aminah', 'Supardi', 'Yohana', 'La Ode Rahman', 'Marlina', 'Nyoman Sukerti', 'Hasan Basri', 'Ruth Simanjuntak', 'Wayan Arta', 'Sutini', 'Paulus Kogoya',
    'Fransiska', 'Irwan', 'Mariyam', 'Samsul Bahri', 'Ketut Rai', 'Ani Yuliani', 'Yakobus', 'Rohani', 'Darsono'];
  const SK = { KPO_PMBS: 'KPO', GEPENGLUNG: 'GEP', BWBP: 'BWBP', KTK_WTS: 'KTK' };
  let n = 0;
  RIW.forEach(([kd, prov, kab, bln, jml, kl, cair], i) => {
    const k = D.pokja.find((p) => p.kode === kd), t0 = bln + '-05T03:00:00.000Z';
    const u = { id: 'us-h' + (i + 1), no_register: `USL-${SK[kd]}-${bln.replace('-', '')}-${String(201 + i).padStart(4, '0')}`, judul: `Usulan ATENSI ${kab} ${bln.slice(0, 4)}`, kategori: 'Bantuan ATENSI',
      pokja_id: k.id, link_profil: 'https://drive.google.com/drive/folders/contoh-profil-asesmen', status: cair ? 'selesai' : 'proses', tahap_aktif: cair ? '11' : '9', catatan_terakhir: null,
      no_sk: `${60 + i}/RSTSKPO/SK/${bln.slice(5)}/2026`, tgl_sk: bln + '-10', link_sk: null, tgl_cair: cair ? bln + '-25' : null, usulan_asal_id: null, usulan_baru_id: null, sumber: 'web',
      dibuat_oleh: 'pg-8', dibuat_pada: t0, tgl_submit: t0, diubah_pada: t0 };
    D.usulan.push(u);
    URUT.forEach((t) => D.tahap.push({ usulan_id: u.id, tahap: t, status: cair || URUT.indexOf(t) < URUT.indexOf('9') ? 'selesai' : t === '9' ? 'aktif' : 'terkunci', data: {}, catatan: null,
      pic_nama: 'Anggota Pokja TU', mulai_pada: t0, selesai_pada: t0 }));
    for (let j = 0; j < jml; j++) {
      n++;
      const nm = NM[(n * 7) % NM.length] + ' ' + ['', 'Putri', 'Saputra', 'Wati', 'Siregar'][n % 5], nik = '35' + String(5100000000 + n * 7717).padStart(10, '0') + String(3000 + n).slice(-4);
      const jb = ['KWU', 'PHL', 'KWU', 'PEMULANGAN', 'KWU'][n % 5];
      D.bnba.push({ id: 'bn-h' + n, usulan_id: u.id, pokja_id: k.id, status_verifikasi: 'terverifikasi', klaster_ppks: kl[j % kl.length], kota_kab_penyaluran: kab, ktp_provinsi: prov, ktp_kabkota: kab,
        ktp_kecamatan: 'Kec. Contoh', ktp_kelurahan: 'Kel. Contoh', ktp_jalan: 'Jl. Contoh No. ' + (j + 1), dom_provinsi: null, dom_kabkota: null, dom_kecamatan: null, dom_kelurahan: null, dom_jalan: null,
        nama: nm.trim().toUpperCase(), nik, no_kk: nik.slice(0, 12) + '0007', no_paspor: null, desil: String(1 + (n % 3)), nama_ibu: 'Ibu ' + nm.split(' ')[0], tempat_lahir: kab.replace(/^(Kab\.|Kota) /, ''),
        tgl_lahir: `${1958 + (n * 3) % 50}-0${1 + (n % 9)}-1${n % 9}`, jenis_kelamin: n % 3 ? 'Perempuan' : 'Laki-laki', pekerjaan_ktp: 'Wiraswasta', pekerjaan_kini: 'Pedagang', jenis_bantuan: jb,
        nilai_bantuan: { KWU: 5000000, PHL: 2500000, PEMULANGAN: 1500000 }[jb], rincian_barang: 'Paket usaha', uraian: 'BANSOS UANG', akun_bantuan: '571111',
        no_sp2d: '2601' + String(9000 + i), tgl_sp2d: cair ? bln + '-22' : null, bulan_sp2d: null, rek_giro_bni: '1234567890', nama_bank: 'BNI', nomor_rekening: '0092' + nik.slice(-8),
        nama_pemilik_rek: nm.trim().toUpperCase(), pendapatan_kotor_awal: 800000, biaya_awal: 400000, dibuat_oleh: 'pg-8', dibuat_oleh_nama: 'Bambang Wijaya', dibuat_pada: t0, diubah_pada: t0 });
    }
  });
  // ---- contoh foto dokumentasi untuk sebagian PM terverifikasi (progres Pokja)
  D.bnba.filter((b) => b.status_verifikasi === 'terverifikasi').forEach((b, i) => {
    if (i % 3 !== 2) D.berkas.push({ id: I.uid(), usulan_id: null, tahap: null, jenis: 'sebelum_usaha', nama: 'sebelum_' + (i + 1) + '.jpg', ukuran: 320000, mime: 'image/jpeg', lokasi: 'drive_sa1',
      tautan: null, diunggah_oleh: 'pg-8', diunggah_nama: 'Bambang Wijaya', dibuat_pada: lalu(10), dihapus: false, konteks: 'dok_pm', ref_id: b.id, pokja_id: b.pokja_id });
  });
  I.simpan();
}

/** Gambar contoh (SVG) untuk foto data contoh yang tidak punya isi berkas. */
export function fotoContoh(r) {
  const w = (r.nama || '').length % 2 ? '#2A9661' : '#3E66B3';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420"><defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${w}"/><stop offset="1" stop-color="#0B3B2A"/></linearGradient></defs><rect width="640" height="420" fill="url(#a)"/><circle cx="500" cy="110" r="46" fill="#E7B416" opacity=".85"/><path d="M0 330 L170 210 L300 300 L420 220 L640 350 L640 420 L0 420Z" fill="#fff" opacity=".18"/><text x="40" y="380" font-family="sans-serif" font-size="26" fill="#fff">Foto contoh — mode pratinjau</text></svg>`;
  return btoa(unescape(encodeURIComponent(svg)));
}

// =====================================================================================
// BERKAS KONTEKS
// =====================================================================================
function cekKonteks(konteks, ref, jenis) {
  siapkan(); butuhPeg();
  const D = d();
  if (konteks === 'lks') {
    const l = D.lks.find((x) => x.id === ref); if (!l) throw g('Data LKS tidak ditemukan.');
    if (!(I.isSA() || (I.idsPokja().includes(l.pokja_id) && ['draft', 'perlu_perbaikan'].includes(l.status_verifikasi)))) throw g('Berkas LKS hanya dapat diubah oleh Pokja penginput selama berstatus Draft atau Perlu Perbaikan.', '42501');
    if (!['foto_depan', 'foto_papan', 'foto_pm', 'administrasi', 'bnba_lks', 'sdm_lks', 'lainnya'].includes(jenis)) throw g('Jenis berkas LKS tidak dikenal.');
    return { pokja: l.pokja_id, foto: jenis.startsWith('foto_'), maks: jenis.startsWith('foto_') ? 1 : null };
  }
  if (konteks === 'dokumen') {
    const f = D.dok_folder.find((x) => x.id === ref); if (!f) throw g('Folder repositori tidak ditemukan.');
    if (!bolehPokja(f.pokja_id)) throw g('Hanya anggota Pokja pemilik yang dapat mengunggah ke repositori ini.', '42501');
    return { pokja: f.pokja_id, foto: jenis === 'foto', maks: null };
  }
  if (konteks === 'dok_pm') {
    const b = D.bnba.find((x) => x.id === ref); if (!b || !I.bnbaTerlihat(b)) throw g('Data PM tidak ditemukan.');
    if (!LABEL_PM[jenis]) throw g('Kategori dokumentasi tidak dikenal.');
    if (!bolehDokPm(b.pokja_id, jenis)) throw g(`Anda tidak berwenang mengisi foto kategori ${LABEL_PM[jenis]}.`, '42501');
    return { pokja: b.pokja_id, foto: true, maks: 2 };
  }
  if (konteks === 'renja') {
    const r = D.renja.find((x) => x.id === ref); if (!r) throw g('Rencana kerja tidak ditemukan.');
    if (!(I.isSA() || (I.idsPokja().includes(r.pokja_id) && ['draft', 'perlu_perbaikan'].includes(r.status_verifikasi)))) throw g('Lampiran hanya dapat diubah Pokja pemilik selama berstatus Draft atau Perlu Perbaikan.', '42501');
    return { pokja: r.pokja_id, foto: false, maks: null };
  }
  if (konteks === 'hukum') { if (!(I.isSA() || I.diPokja('HUKUM'))) throw g('Hanya Pokja Hukum.', '42501'); return { pokja: pokjaIdKode('HUKUM'), foto: false, maks: null }; }
  if (konteks === 'ojt') { if (!(I.isSA() || I.diPokja('KEPEGAWAIAN') || I.diPokja('TU'))) throw g('Hanya Pokja Kepegawaian dan TU.', '42501'); return { pokja: pokjaIdKode('KEPEGAWAIAN'), foto: false, maks: null }; }
  throw g('Konteks berkas tidak dikenal.');
}
const bolehDokPm = (pid, k) => I.isSA() || (k === 'sebelum_usaha' ? I.idsPokja().includes(pid) : k === 'saat_penyaluran' ? I.idsPokja().includes(pid) || I.diPokja('TU') : k === 'supermonev' ? I.diPokja('SUPERMONEV') : false);

export function unggahKonteksP(x, lokasi) {
  if (lokasi === 'tunda') throw g('Unggahan berkas sedang ditunda oleh Super Admin. Hubungi Super Admin.');
  const konteks = String(x.tahap).slice(8), c = cekKonteks(konteks, x.usulan_id, x.jenis);
  const ukuran = Math.floor((x.base64 || '').length * 0.75);
  if (c.foto) {
    if (!['image/jpeg', 'image/png'].includes(x.mime)) throw g('Bagian ini hanya menerima foto JPG atau PNG.');
    if (ukuran > 512000) throw g('Ukuran foto maksimal 500 KB. Aplikasi mengecilkan foto otomatis; pilih ulang fotonya.');
  } else if (ukuran > 10 * 1024 * 1024) throw g('Ukuran dokumen maksimal 10 MB.');
  if (c.maks && d().berkas.filter((b) => b.konteks === konteks && b.ref_id === x.usulan_id && b.jenis === x.jenis && !b.dihapus).length >= c.maks) {
    throw g(c.maks === 1 ? 'Foto ini sudah ada. Hapus foto lama lebih dulu bila ingin menggantinya.' : `Maksimal ${c.maks} foto untuk kategori ini. Hapus salah satu foto lama bila ingin menggantinya.`);
  }
  const r = { id: I.uid(), usulan_id: null, tahap: null, jenis: x.jenis, nama: x.nama, ukuran, mime: x.mime, lokasi, tautan: null, diunggah_oleh: sayaId(),
    diunggah_nama: I.namaSaya(), dibuat_pada: I.sekarang(), dihapus: false, konteks, ref_id: x.usulan_id, pokja_id: c.pokja };
  d().berkas.push(r);
  r.dokumen_id = setelahBerkas(r);
  return r;
}
function setelahBerkas(b) {
  if (b.konteks !== 'dokumen') return null;
  const f = d().dok_folder.find((x) => x.id === b.ref_id); if (!f) return null;
  const x = { id: I.uid(), pokja_id: f.pokja_id, folder_id: f.id, berkas_id: b.id, judul: b.nama.replace(/\.[A-Za-z0-9]{2,5}$/, '') || b.nama, keterangan: null, status: 'privat', kategori: null,
    dibuat_oleh: sayaId(), dibuat_nama: I.namaSaya(), dibuat_pada: I.sekarang(), diubah_pada: I.sekarang(), dihapus: false };
  d().dokumen.push(x); b.ref_id = x.id;
  return x.id;
}
export function berkasTerlihatP(b) {
  siapkan();
  const D = d();
  if (!b.konteks || b.konteks === 'usulan') { const u = D.usulan.find((x) => x.id === b.usulan_id); return !!u && I.usulanTerlihat(u); }
  if (b.konteks === 'lks') { const l = D.lks.find((x) => x.id === b.ref_id); return !!l && lksTerlihat(l); }
  if (b.konteks === 'dokumen') { const x = D.dokumen.find((y) => y.id === b.ref_id); return !!x && !x.dihapus && dokTerlihat(x); }
  if (b.konteks === 'dok_pm') { const x = D.bnba.find((y) => y.id === b.ref_id); return !!x && I.bnbaTerlihat(x); }
  if (b.konteks === 'renja') { const x = D.renja.find((y) => y.id === b.ref_id); return !!x && renjaTerlihat(x); }
  return I.isPeg();
}
export function hapusBerkasKonteksP(r) {
  const D = d();
  let ok = false;
  if (r.konteks === 'lks') { const l = D.lks.find((x) => x.id === r.ref_id); ok = I.isSA() || (I.idsPokja().includes(l?.pokja_id) && ['draft', 'perlu_perbaikan'].includes(l?.status_verifikasi)); }
  else if (r.konteks === 'dokumen') {
    const x = D.dokumen.find((y) => y.id === r.ref_id);
    if (['diajukan', 'terbit'].includes(x?.status) && !I.isSA()) throw g('Dokumen yang sedang diajukan atau sudah terbit tidak dapat dihapus. Batalkan atau tarik publikasinya lebih dulu.');
    ok = bolehPokja(x?.pokja_id); if (ok && x) x.dihapus = true;
  } else if (r.konteks === 'dok_pm') { const x = D.bnba.find((y) => y.id === r.ref_id); ok = !!x && bolehDokPm(x.pokja_id, r.jenis); }
  else if (r.konteks === 'renja') { const x = D.renja.find((y) => y.id === r.ref_id); ok = I.isSA() || (I.idsPokja().includes(x?.pokja_id) && ['draft', 'perlu_perbaikan'].includes(x?.status_verifikasi)); }
  else if (r.konteks === 'hukum') ok = I.isSA() || I.diPokja('HUKUM');
  else if (r.konteks === 'ojt') ok = I.isSA() || I.diPokja('KEPEGAWAIAN') || I.diPokja('TU');
  if (!ok) throw g('Anda tidak berwenang menghapus berkas ini.', '42501');
  r.dihapus = true;
}
const tanpaDrive = (b) => { const o = I.salin(b); delete o.drive_id; return o; };
const berkasDari = (konteks, ref) => d().berkas.filter((b) => b.konteks === konteks && b.ref_id === ref && !b.dihapus).map(tanpaDrive);

export async function berkasKonteks(konteks, ref) { await jeda(); siapkan(); return berkasDari(konteks, ref).filter(berkasTerlihatP); }
export async function tambahTautanKonteks(konteks, ref, jenis, nama, url) {
  await jeda(); const c = cekKonteks(konteks, ref, jenis);
  if (c.foto) throw g('Foto harus diunggah langsung, bukan berupa tautan.');
  if (!/^https:\/\//i.test(url || '')) throw g('Tautan harus diawali https://');
  const r = { id: I.uid(), usulan_id: null, tahap: null, jenis, nama: teks(nama) || jenis, ukuran: null, mime: null, lokasi: 'tautan', tautan: url, diunggah_oleh: sayaId(),
    diunggah_nama: I.namaSaya(), dibuat_pada: I.sekarang(), dihapus: false, konteks, ref_id: ref, pokja_id: c.pokja };
  d().berkas.push(r); r.dokumen_id = setelahBerkas(r); I.simpan(); return I.salin(r);
}

// =====================================================================================
// LKS
// =====================================================================================
const lksTerlihat = (l) => I.isPeg() && (l.status_verifikasi === 'terverifikasi' || I.isSA() || I.idsPokja().includes(l.pokja_id)
  || (['menunggu', 'perlu_perbaikan'].includes(l.status_verifikasi) && (I.diPokja('DATA') || I.diPokja('TU'))));
const lksJson = (l) => ({ ...I.salin(l), ...pokjaInfo(l.pokja_id), kode_peta: PROV[l.provinsi] || null,
  jumlah_foto: d().berkas.filter((b) => b.konteks === 'lks' && b.ref_id === l.id && !b.dihapus && b.jenis.startsWith('foto_')).length,
  jumlah_berkas: d().berkas.filter((b) => b.konteks === 'lks' && b.ref_id === l.id && !b.dihapus).length,
  boleh_ubah: I.isSA() || (I.idsPokja().includes(l.pokja_id) && ['draft', 'perlu_perbaikan'].includes(l.status_verifikasi)),
  boleh_verifikasi: l.status_verifikasi === 'menunggu' && (I.isSA() || kapokjaKode('DATA') || kapokjaKode('TU')) });
function tulisLks(l, x) {
  if (!teks(x.nama)) throw g('Nama LKS wajib diisi.');
  const prov = teks(x.provinsi) ? provBaku(x.provinsi) : null;
  if (teks(x.provinsi) && !prov) throw g(`Provinsi "${x.provinsi}" tidak dikenal. Pilih dari daftar.`);
  const kl = arr(x.klaster).map((k) => pilih(k, KLASTER, 'klaster'));
  const jl = arr(x.jenis_layanan).map((k) => pilih(k, ['Rehabilitasi Sosial', 'Perlindungan Sosial', 'Pemberdayaan Sosial'], 'jenis layanan'));
  Object.assign(l, {
    status_asesmen: x.status_asesmen === 'belum' ? 'belum' : 'sudah', nama: teks(x.nama), alamat: teks(x.alamat), provinsi: prov, kabkota: teks(x.kabkota), telepon: teks(x.telepon),
    ketua: teks(x.ketua), tahun_berdiri: int(x.tahun_berdiri), status_hukum: pilih(x.status_hukum, ['Berbadan hukum', 'Tidak berbadan hukum'], 'status badan hukum'),
    status_operasional: pilih(x.status_operasional, ['Aktif', 'Vakum sementara', 'Tidak aktif'], 'status operasional'), no_induk: teks(x.no_induk),
    akreditasi: pilih(x.akreditasi, ['A', 'B', 'C', 'D-TTA', 'Belum mengajukan'], 'akreditasi'), akreditasi_tahun: int(x.akreditasi_tahun), klaster: [...new Set(kl)],
    non_tskpo: x.non_tskpo === true || x.non_tskpo === 'true', jenis_layanan: [...new Set(jl)],
    bentuk_layanan: pilih(x.bentuk_layanan, ['Dalam lembaga', 'Luar lembaga', 'Dalam dan luar lembaga'], 'bentuk layanan'),
    wilayah_jangkauan: pilih(x.wilayah_jangkauan, ['Kab/Kota', 'Provinsi', 'Nasional'], 'wilayah jangkauan'), daya_tampung: int(x.daya_tampung), pm_laki: int(x.pm_laki),
    pm_perempuan: int(x.pm_perempuan), pm_dalam: int(x.pm_dalam), pm_luar: int(x.pm_luar), jumlah_pengurus: int(x.jumlah_pengurus),
    asesmen: x.asesmen && typeof x.asesmen === 'object' ? x.asesmen : l.asesmen || {}, detail: x.detail && typeof x.detail === 'object' ? x.detail : l.detail || {}, diubah_pada: I.sekarang(),
  });
  l.jenis_lks = l.non_tskpo ? 'Multi layanan' : 'Murni TSKPO';
  return l;
}
function pokjaPilih(pid, cadangan) {
  if (pid) { if (!I.pokjaById(pid)) throw g('Pokja tidak dikenal.'); if (!bolehPokja(pid)) throw g('Anda bukan anggota Pokja tersebut.', '42501'); return pid; }
  const ef = I.pokjaEf().map((e) => e.pokja_id).sort((a, b) => I.pokjaById(a).urutan - I.pokjaById(b).urutan);
  if (ef[0]) return ef[0];
  if (I.isSA() && cadangan) return pokjaIdKode(cadangan);
  throw g('Pilih Pokja penginput lebih dulu.');
}
export async function daftarLks(f = {}) {
  await jeda(); siapkan(); butuhPeg();
  const q = String(f.q || '').toLowerCase();
  const rows = d().lks.filter((l) => lksTerlihat(l)
    && (f.mode !== 'saya' || I.idsPokja().includes(l.pokja_id) || (I.isSA() && l.dibuat_oleh === sayaId()))
    && (f.mode !== 'antrean' || l.status_verifikasi === 'menunggu') && (f.mode !== 'resmi' || l.status_verifikasi === 'terverifikasi')
    && (!q || l.nama.toLowerCase().includes(q) || l.kode.toLowerCase().includes(q) || String(l.kabkota || '').toLowerCase().includes(q))
    && (!f.provinsi || l.provinsi === f.provinsi) && (!f.klaster || l.klaster.includes(f.klaster)) && (!f.akreditasi || l.akreditasi === f.akreditasi)
    && (!f.bentuk || l.bentuk_layanan === f.bentuk) && (!f.jenis || l.jenis_lks === f.jenis) && (!f.status || l.status_verifikasi === f.status)).sort(urutTurun('diubah_pada'));
  return { total: rows.length, baris: halaman(rows, f).map(lksJson) };
}
export async function ringkasanLks(f = {}) {
  await jeda(); siapkan(); butuhPeg();
  const q = d().lks.filter((l) => l.status_verifikasi === 'terverifikasi' && (!f.klaster || l.klaster.includes(f.klaster)) && (!f.akreditasi || l.akreditasi === f.akreditasi)
    && (!f.bentuk || l.bentuk_layanan === f.bentuk) && (!f.provinsi || l.provinsi === f.provinsi));
  return { total: q.length, murni: q.filter((l) => !l.non_tskpo).length, multi: q.filter((l) => l.non_tskpo).length,
    daya_tampung: q.reduce((s, l) => s + (l.daya_tampung || 0), 0), pm: q.reduce((s, l) => s + (l.pm_laki || 0) + (l.pm_perempuan || 0), 0),
    per_provinsi: hitung(q.filter((l) => l.provinsi), (l) => l.provinsi).map((x) => ({ provinsi: x.label, kode_peta: PROV[x.label], n: x.n })),
    per_kabkota: hitung(q.filter((l) => l.kabkota), (l) => l.kabkota + '|' + l.provinsi).slice(0, 15).map((x) => ({ kabkota: x.label.split('|')[0], provinsi: x.label.split('|')[1], n: x.n })),
    per_klaster: hitung(q, (l) => l.klaster), per_akreditasi: hitung(q, (l) => l.akreditasi || 'Belum diisi'), per_bentuk: hitung(q, (l) => l.bentuk_layanan || 'Belum diisi'),
    menunggu: d().lks.filter((l) => l.status_verifikasi === 'menunggu' && lksTerlihat(l)).length };
}
export async function detailLks(id) {
  await jeda(); siapkan();
  const l = d().lks.find((x) => x.id === id); if (!l || !lksTerlihat(l)) throw g('LKS tidak ditemukan.');
  return { ...lksJson(l), berkas: berkasDari('lks', l.id) };
}
export async function simpanLks(x) {
  await jeda(120); siapkan(); butuhPeg();
  let l;
  if (x.id) {
    l = d().lks.find((y) => y.id === x.id); if (!l) throw g('LKS tidak ditemukan.');
    if (!(I.isSA() || (I.idsPokja().includes(l.pokja_id) && ['draft', 'perlu_perbaikan'].includes(l.status_verifikasi)))) throw g('LKS hanya dapat diubah oleh Pokja penginput selama berstatus Draft atau Perlu Perbaikan.', '42501');
    tulisLks(l, x);
  } else {
    l = tulisLks({ id: I.uid(), kode: 'LKS-' + String(++d().seq_lks).padStart(4, '0'), pokja_id: pokjaPilih(x.pokja_id, 'DATA'), status_verifikasi: 'draft', sumber: 'web',
      dibuat_oleh: sayaId(), dibuat_oleh_nama: I.namaSaya(), dibuat_pada: I.sekarang() }, x);
    d().lks.push(l);
  }
  const peringatan = [];
  if (d().lks.some((y) => y.id !== l.id && y.nama.toLowerCase() === l.nama.toLowerCase() && String(y.kabkota || '').toLowerCase() === String(l.kabkota || '').toLowerCase())) peringatan.push('Ada LKS lain dengan nama dan kab/kota yang sama. Periksa kemungkinan data ganda.');
  if (l.no_induk && d().lks.some((y) => y.id !== l.id && y.no_induk === l.no_induk)) peringatan.push(`Nomor induk LKS ${l.no_induk} sudah dipakai LKS lain.`);
  I.log(x.id ? 'UPDATE' : 'INSERT', 'lks', l.id, (x.id ? 'Mengubah' : 'Menambah') + ' LKS ' + l.nama); I.simpan();
  return { ...lksJson(l), peringatan };
}
export async function ajukanLks(id) {
  await jeda(); siapkan();
  const l = d().lks.find((x) => x.id === id); if (!l) throw g('LKS tidak ditemukan.');
  if (!(I.isSA() || I.idsPokja().includes(l.pokja_id))) throw g('Hanya Pokja penginput.', '42501');
  if (!['draft', 'perlu_perbaikan'].includes(l.status_verifikasi)) throw g('LKS ini sudah diajukan atau terverifikasi.');
  if (!l.provinsi || !l.kabkota) throw g('Lengkapi provinsi dan kab/kota sebelum mengajukan.');
  if (l.status_asesmen === 'sudah' && !l.klaster.length) throw g('Pilih minimal satu klaster TSKPO yang dilayani.');
  Object.assign(l, { status_verifikasi: 'menunggu', diajukan_pada: I.sekarang(), catatan_verifikasi: null, diubah_pada: I.sekarang() });
  beriTahu([...pengurus('DATA', 'kapokja'), ...pengurus('TU', 'kapokja')], 'LKS_MENUNGGU', 'LKS menunggu verifikasi', `LKS "${l.nama}" (${l.kode}) dari Pokja ${I.pokjaById(l.pokja_id).nama_pendek} menunggu verifikasi.`, '#/input-lks?tab=antrean');
  I.simpan(); return lksJson(l);
}
export async function verifikasiLks(id, setuju, catatan = null) {
  await jeda(); siapkan();
  if (!(I.isSA() || kapokjaKode('DATA') || kapokjaKode('TU'))) throw g('Verifikasi LKS dilakukan Kapokja Data atau Kapokja TU.', '42501');
  const l = d().lks.find((x) => x.id === id); if (!l) throw g('LKS tidak ditemukan.');
  if (l.status_verifikasi !== 'menunggu') throw g('LKS ini tidak sedang menunggu verifikasi.');
  if (!setuju && !teks(catatan)) throw g('Catatan wajib diisi saat mengembalikan.');
  Object.assign(l, { status_verifikasi: setuju ? 'terverifikasi' : 'perlu_perbaikan', catatan_verifikasi: teks(catatan), diverifikasi_nama: I.namaSaya(),
    diverifikasi_pokja: I.isSA() ? 'Super Admin' : kapokjaKode('DATA') ? 'Data' : 'TU', diverifikasi_pada: I.sekarang(), diubah_pada: I.sekarang() });
  beriTahu([l.dibuat_oleh], setuju ? 'LKS_TERVERIFIKASI' : 'LKS_DIKEMBALIKAN', setuju ? 'LKS terverifikasi' : 'LKS perlu perbaikan',
    `LKS "${l.nama}" (${l.kode})` + (setuju ? ' sudah terverifikasi dan masuk rekap resmi.' : ' dikembalikan: ' + catatan), '#/input-lks');
  I.simpan(); return lksJson(l);
}
export async function hapusLks(id) {
  await jeda(); siapkan();
  const l = d().lks.find((x) => x.id === id); if (!l) throw g('LKS tidak ditemukan.');
  if (!(I.isSA() || (I.idsPokja().includes(l.pokja_id) && ['draft', 'perlu_perbaikan'].includes(l.status_verifikasi)))) throw g('LKS hanya dapat dihapus Pokja penginput selama berstatus Draft atau Perlu Perbaikan.', '42501');
  if (berkasDari('lks', id).length) throw g('Hapus foto dan berkas LKS ini lebih dulu.');
  d().lks = d().lks.filter((x) => x.id !== id); I.simpan();
}
export async function imporLks(rows, uji = true, opsi = {}) {
  await jeda(200); siapkan(); butuhPeg();
  const pid = pokjaPilih(opsi.pokja_id, 'DATA');
  const status = opsi.terverifikasi && (I.isSA() || kapokjaKode('DATA')) ? 'terverifikasi' : 'draft';
  const hasil = { uji, ditambah: 0, dilewati: 0, perlu_perbaikan: 0, status, gagal: [], ganda: [] }, baru = [];
  rows.forEach((r, i) => {
    const semua = [...d().lks, ...baru];
    if (semua.some((x) => x.nama.toLowerCase() === String(r.nama || '#').trim().toLowerCase() && String(x.kabkota || '').toLowerCase() === String(r.kabkota || '').trim().toLowerCase())) {
      hasil.dilewati++; hasil.ganda.push({ baris: r._baris || i + 1, nama: r.nama }); return;
    }
    try {
      const cat = [], aman = { ...r };
      const longgar = (k, daftar, label) => { if (!teks(r[k])) return; try { pilih(r[k], daftar, label); } catch { cat.push(`${label} "${r[k]}"`); aman[k] = null; } };
      longgar('akreditasi', ['A', 'B', 'C', 'D-TTA', 'Belum mengajukan'], 'akreditasi'); longgar('status_hukum', ['Berbadan hukum', 'Tidak berbadan hukum'], 'status badan hukum');
      longgar('status_operasional', ['Aktif', 'Vakum sementara', 'Tidak aktif'], 'status operasional'); longgar('bentuk_layanan', ['Dalam lembaga', 'Luar lembaga', 'Dalam dan luar lembaga'], 'bentuk layanan');
      if (teks(r.provinsi) && !provBaku(r.provinsi)) { cat.push(`provinsi "${r.provinsi}"`); aman.provinsi = null; }
      aman.klaster = arr(r.klaster).filter((k) => { const ok = KLASTER.some((x) => x.toLowerCase() === k.toLowerCase()); if (!ok) cat.push(`klaster "${k}"`); return ok; });
      const l = tulisLks({ id: I.uid(), kode: 'LKS-' + String(d().seq_lks + baru.length + 1).padStart(4, '0'), pokja_id: pid, sumber: 'impor', dibuat_oleh: sayaId(), dibuat_oleh_nama: I.namaSaya(), dibuat_pada: I.sekarang() }, aman);
      l.status_verifikasi = cat.length && status === 'terverifikasi' ? 'perlu_perbaikan' : status;
      if (cat.length) { l.catatan_verifikasi = 'Perlu diperbaiki (impor): nilai tidak dikenal — ' + cat.join('; '); if (l.status_verifikasi === 'perlu_perbaikan') hasil.perlu_perbaikan++; }
      if (l.status_verifikasi === 'terverifikasi') { l.diverifikasi_nama = I.namaSaya() + ' (impor)'; l.diverifikasi_pada = I.sekarang(); }
      baru.push(l); hasil.ditambah++;
    } catch (e) { hasil.gagal.push({ baris: r._baris || i + 1, nama: r.nama || '', pesan: e.message }); }
  });
  if (!uji) { baru.forEach((l) => { d().seq_lks++; l.kode = 'LKS-' + String(d().seq_lks).padStart(4, '0'); d().lks.push(l); }); I.log('IMPOR', 'lks', null, `Impor LKS: ${hasil.ditambah} ditambah, ${hasil.dilewati} dilewati`); I.simpan(); }
  return hasil;
}

// =====================================================================================
// ASTER
// =====================================================================================
const bolehAster = () => I.isSA() || I.diPokja('DATA');
const asterTerlihat = (a) => I.isPeg() && (a.status_verifikasi === 'terverifikasi' || I.isSA() || I.diPokja('DATA'));
const asterJson = (a) => {
  const o = I.salin(a);
  if (!bolehAster()) { o.no_kk_target = I.samarAngka(a.no_kk_target); o.nik_pensurvei = I.samarAngka(a.nik_pensurvei); o.alamat = I.samarAlamat(a.alamat); }
  return { ...o, boleh_ubah: bolehAster() && (I.isSA() || ['draft', 'perlu_perbaikan'].includes(a.status_verifikasi)),
    boleh_verifikasi: a.status_verifikasi === 'menunggu' && (I.isSA() || kapokjaKode('DATA')) };
};
function tulisAster(a, x, abaikanId = null) {
  const nik = String(x.nik_target || '').replace(/\D/g, ''), kk = String(x.no_kk_target || '').replace(/\D/g, '') || null;
  if (!/^\d{16}$/.test(nik)) throw g('NIK target survei wajib 16 digit angka.');
  if (kk && !/^\d{16}$/.test(kk)) throw g('No. KK target survei harus 16 digit angka.');
  if (!teks(x.batch)) throw g('BATCH wajib diisi.');
  if (!teks(x.nama_target)) throw g('Nama target survei wajib diisi.');
  const prov = teks(x.provinsi) ? provBaku(x.provinsi) : null;
  if (teks(x.provinsi) && !prov) throw g(`Provinsi "${x.provinsi}" tidak dikenal.`);
  if (d().aster.some((y) => y.nik_target === nik && y.batch === teks(x.batch) && y.id !== abaikanId)) throw g(`NIK target survei ${nik} sudah ada pada BATCH ${teks(x.batch)}. Buka data yang sudah ada.`);
  let ts = null; const tv = teks(x.tgl_survei);
  if (tv) { const m = tv.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:\s+(\d{1,2})[:.](\d{2}))?/); ts = m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}T${(m[4] || '0').padStart(2, '0')}:${m[5] || '00'}:00+07:00` : /^\d{4}-\d{2}-\d{2}/.test(tv) ? tv : null; }
  return Object.assign(a, { batch: teks(x.batch), jenis_batch: teks(x.jenis_batch), nik_target: nik, no_kk_target: kk, nama_target: teks(x.nama_target), kepala_keluarga: teks(x.kepala_keluarga),
    nik_pensurvei: String(x.nik_pensurvei || '').replace(/\D/g, '') || null, nama_pensurvei: teks(x.nama_pensurvei), instansi_pensurvei: teks(x.instansi_pensurvei),
    satker_pensurvei: teks(x.satker_pensurvei), hp_pensurvei: teks(x.hp_pensurvei), tgl_survei: ts, status_survei: teks(x.status_survei), provinsi: prov, kabkota: teks(x.kabkota),
    kecamatan: teks(x.kecamatan), kelurahan: teks(x.kelurahan), alamat: teks(x.alamat), dusun: teks(x.dusun), rt: teks(x.rt), rw: teks(x.rw), latitude: num(x.latitude), longitude: num(x.longitude),
    ragam_ppks: [...new Set(arr(x.ragam_ppks))], jenis_ppks: teks(x.jenis_ppks), diubah_pada: I.sekarang() });
}
export async function daftarAster(f = {}) {
  await jeda(); siapkan(); butuhPeg();
  const q = String(f.q || '').toLowerCase();
  const rows = d().aster.filter((a) => asterTerlihat(a) && (f.mode !== 'antrean' || a.status_verifikasi === 'menunggu') && (f.mode !== 'resmi' || a.status_verifikasi === 'terverifikasi')
    && (f.mode !== 'kerja' || ['draft', 'perlu_perbaikan'].includes(a.status_verifikasi))
    && (!q || a.nik_target.startsWith(q) || a.nama_target.toLowerCase().includes(q) || String(a.nama_pensurvei || '').toLowerCase().includes(q))
    && (!f.batch || a.batch === f.batch) && (!f.provinsi || a.provinsi === f.provinsi) && (!f.kabkota || String(a.kabkota || '').toLowerCase().includes(String(f.kabkota).toLowerCase()))
    && (!f.status_survei || a.status_survei === f.status_survei) && (!f.jenis_ppks || a.jenis_ppks === f.jenis_ppks) && (!f.status || a.status_verifikasi === f.status)
    && (!f.dari || String(a.tgl_survei || '') >= f.dari) && (!f.sampai || String(a.tgl_survei || '').slice(0, 10) <= f.sampai)).sort(urutTurun('diubah_pada'));
  return { total: rows.length, baris: halaman(rows, f).map(asterJson), batch: [...new Set(d().aster.filter(asterTerlihat).map((a) => a.batch))].sort() };
}
export async function ringkasanAster(f = {}) {
  await jeda(); siapkan(); butuhPeg();
  const q = d().aster.filter((a) => a.status_verifikasi === 'terverifikasi' && (!f.batch || a.batch === f.batch) && (!f.status_survei || a.status_survei === f.status_survei)
    && (!f.dari || String(a.tgl_survei || '') >= f.dari) && (!f.sampai || String(a.tgl_survei || '').slice(0, 10) <= f.sampai));
  const pdm = (a) => (a.nama_pensurvei || '').toLowerCase() || a.nik_pensurvei;
  const perProv = hitung(q.filter((a) => a.provinsi), (a) => a.provinsi).map((x) => ({ provinsi: x.label, kode_peta: PROV[x.label], n: x.n,
    pendamping: new Set(q.filter((a) => a.provinsi === x.label).map(pdm).filter(Boolean)).size }));
  return { total: q.length, pendamping: new Set(q.map(pdm).filter(Boolean)).size, provinsi_terjangkau: new Set(q.map((a) => a.provinsi)).size, per_provinsi: perProv,
    per_kabkota: hitung(q.filter((a) => a.kabkota), (a) => a.kabkota + '|' + a.provinsi).slice(0, 15).map((x) => ({ kabkota: x.label.split('|')[0], provinsi: x.label.split('|')[1], n: x.n })),
    per_jenis: hitung(q, (a) => a.jenis_ppks || 'Belum diisi'), per_status: hitung(q, (a) => a.status_survei || 'Belum diisi'),
    per_batch: hitung(q, (a) => a.batch).sort((a, b) => a.label.localeCompare(b.label)), menunggu: d().aster.filter((a) => a.status_verifikasi === 'menunggu' && asterTerlihat(a)).length };
}
export async function simpanAster(x) {
  await jeda(120); siapkan();
  if (!bolehAster()) throw g('Data Aster diinput oleh Pokja Data.', '42501');
  let a;
  if (x.id) {
    a = d().aster.find((y) => y.id === x.id); if (!a) throw g('Data Aster tidak ditemukan.');
    if (!(I.isSA() || ['draft', 'perlu_perbaikan'].includes(a.status_verifikasi))) throw g('Data yang sudah diajukan atau terverifikasi tidak dapat diubah.');
    tulisAster(a, x, a.id);
  } else {
    a = tulisAster({ id: I.uid(), pokja_id: pokjaIdKode('DATA'), status_verifikasi: 'draft', sumber: 'web', dibuat_oleh: sayaId(), dibuat_oleh_nama: I.namaSaya(), dibuat_pada: I.sekarang() }, x);
    d().aster.push(a);
  }
  I.simpan(); return asterJson(a);
}
export async function ajukanAster(ids) {
  await jeda(); siapkan(); if (!bolehAster()) throw g('Hanya Pokja Data.', '42501');
  let n = 0; d().aster.forEach((a) => { if (ids.includes(a.id) && ['draft', 'perlu_perbaikan'].includes(a.status_verifikasi)) { a.status_verifikasi = 'menunggu'; a.diajukan_pada = I.sekarang(); a.catatan_verifikasi = null; n++; } });
  if (n) beriTahu(pengurus('DATA', 'kapokja'), 'ASTER_MENUNGGU', 'Data Aster menunggu verifikasi', `${n} data Aster menunggu verifikasi Kapokja Data.`, '#/input-aster?tab=antrean');
  I.simpan(); return n;
}
export async function verifikasiAster(ids, setuju, catatan = null) {
  await jeda(); siapkan();
  if (!(I.isSA() || kapokjaKode('DATA'))) throw g('Verifikasi Aster dilakukan Kapokja Data.', '42501');
  if (!setuju && !teks(catatan)) throw g('Catatan wajib diisi saat mengembalikan.');
  let n = 0; d().aster.forEach((a) => { if (ids.includes(a.id) && a.status_verifikasi === 'menunggu') { Object.assign(a, { status_verifikasi: setuju ? 'terverifikasi' : 'perlu_perbaikan', catatan_verifikasi: teks(catatan), diverifikasi_nama: I.namaSaya(), diverifikasi_pada: I.sekarang() }); n++; } });
  I.simpan(); return n;
}
export async function hapusAster(ids) {
  await jeda(); siapkan(); if (!bolehAster()) throw g('Hanya Pokja Data.', '42501');
  const sebelum = d().aster.length;
  d().aster = d().aster.filter((a) => !(ids.includes(a.id) && (I.isSA() || ['draft', 'perlu_perbaikan'].includes(a.status_verifikasi))));
  I.simpan(); return sebelum - d().aster.length;
}
export async function imporAster(rows, uji = true, opsi = {}) {
  await jeda(200); siapkan(); if (!bolehAster()) throw g('Impor Aster hanya untuk Pokja Data.', '42501');
  const status = opsi.terverifikasi && (I.isSA() || kapokjaKode('DATA')) ? 'terverifikasi' : 'draft';
  const hasil = { uji, ditambah: 0, dilewati: 0, status, gagal: [], ganda: [] }, baru = [];
  rows.forEach((r, i) => {
    const nik = String(r.nik_target || '').replace(/\D/g, '');
    if ([...d().aster, ...baru].some((a) => a.nik_target === nik && a.batch === teks(r.batch))) { hasil.dilewati++; hasil.ganda.push({ baris: r._baris || i + 1, nik, batch: r.batch }); return; }
    try {
      const a = tulisAster({ id: I.uid(), pokja_id: pokjaIdKode('DATA'), status_verifikasi: status, sumber: 'impor', dibuat_oleh: sayaId(), dibuat_oleh_nama: I.namaSaya(), dibuat_pada: I.sekarang() }, r);
      if (status === 'terverifikasi') { a.diverifikasi_nama = I.namaSaya() + ' (impor)'; a.diverifikasi_pada = I.sekarang(); }
      baru.push(a); hasil.ditambah++;
    } catch (e) { hasil.gagal.push({ baris: r._baris || i + 1, nik, pesan: e.message }); }
  });
  if (!uji) { d().aster.push(...baru); I.log('IMPOR', 'aster', null, `Impor Aster: ${hasil.ditambah} ditambah`); I.simpan(); }
  return hasil;
}

// =====================================================================================
// KEPEGAWAIAN & OJT
// =====================================================================================
const bolehKep = () => I.isSA() || I.diPokja('KEPEGAWAIAN');
const pegJson = (p) => ({ ...I.salin(p), ...pokjaInfo(p.pokja_id), akun_email: d().pengguna.find((u) => u.id === p.pengguna_id)?.email || null, milik_saya: !!p.pengguna_id && p.pengguna_id === sayaId() });
function tulisPeg(p, x) {
  if (!teks(x.nama)) throw g('Nama pegawai wajib diisi.');
  const prov = teks(x.provinsi) ? provBaku(x.provinsi) : null;
  if (teks(x.provinsi) && !prov) throw g(`Provinsi "${x.provinsi}" tidak dikenal.`);
  let pk = x.pokja_id || null; if (!pk && teks(x.pokja_kode)) pk = pokjaIdKode(String(x.pokja_kode).toUpperCase()) || null;
  if (x.pengguna_id && d().pegawai.some((y) => y.pengguna_id === x.pengguna_id && y.id !== p.id)) throw g('Akun tersebut sudah tertaut ke data pegawai lain.');
  return Object.assign(p, { jenis: x.jenis === 'pendamping' ? 'pendamping' : 'pusat', nama: teks(x.nama), nip: teks(x.nip), jabatan: teks(x.jabatan), golongan: teks(x.golongan), pokja_id: pk,
    pengguna_id: x.pengguna_id || null, provinsi: prov, kabkota: teks(x.kabkota), no_hp: teks(x.no_hp), email: teks(x.email)?.toLowerCase() || null, status: x.status === 'Nonaktif' ? 'Nonaktif' : 'Aktif',
    mulai_tugas: tgl(x.mulai_tugas), urutan: int(x.urutan) ?? p.urutan ?? 0, catatan: teks(x.catatan), diubah_pada: I.sekarang() });
}
export async function daftarPegawai(f = {}) {
  await jeda(); siapkan(); butuhPeg();
  const q = String(f.q || '').toLowerCase();
  const rows = d().pegawai.filter((p) => (!f.jenis || p.jenis === f.jenis) && (!f.status || p.status === f.status) && (!f.pokja || p.pokja_id === f.pokja) && (!f.provinsi || p.provinsi === f.provinsi)
    && (!q || p.nama.toLowerCase().includes(q) || String(p.nip || '').startsWith(q) || String(p.jabatan || '').toLowerCase().includes(q)))
    .sort((a, b) => a.status.localeCompare(b.status) || a.urutan - b.urutan || a.nama.localeCompare(b.nama));
  return { total: rows.length, baris: halaman(rows, f).map(pegJson), boleh_kelola: bolehKep() };
}
export async function simpanPegawai(x) {
  await jeda(); siapkan(); if (!bolehKep()) throw g('Data kepegawaian dikelola Pokja Kepegawaian.', '42501');
  let p;
  if (x.id) { p = d().pegawai.find((y) => y.id === x.id); if (!p) throw g('Data pegawai tidak ditemukan.'); tulisPeg(p, x); }
  else { p = tulisPeg({ id: I.uid(), dibuat_pada: I.sekarang() }, x); d().pegawai.push(p); }
  I.simpan(); return pegJson(p);
}
export async function hapusPegawai(id) {
  await jeda(); siapkan(); if (!bolehKep()) throw g('Hanya Pokja Kepegawaian.', '42501');
  if (d().jadwal.some((j) => j.pegawai_id === id)) throw g('Pegawai ini sudah memiliki jadwal. Ubah statusnya menjadi Nonaktif saja agar riwayat jadwal tetap tersimpan.');
  d().pegawai = d().pegawai.filter((p) => p.id !== id); I.simpan();
}
export async function sinkronPegawai() {
  await jeda(); siapkan(); if (!bolehKep()) throw g('Hanya Pokja Kepegawaian.', '42501');
  let n = 0;
  d().pengguna.filter((u) => u.aktif && u.jenis_akses === 'pegawai' && !d().pegawai.some((p) => p.pengguna_id === u.id)).forEach((u) => {
    const pp = d().pengguna_pokja.find((x) => x.pengguna_id === u.id);
    d().pegawai.push({ id: I.uid(), jenis: 'pusat', nama: u.nama, nip: u.nip, jabatan: null, golongan: null, pokja_id: pp?.pokja_id || null, pengguna_id: u.id, provinsi: null, kabkota: null,
      no_hp: u.no_hp, email: u.email, status: 'Aktif', mulai_tugas: null, urutan: 50, catatan: null, dibuat_pada: I.sekarang(), diubah_pada: I.sekarang() }); n++;
  });
  I.simpan(); return n;
}
export async function imporPegawai(rows, uji = true) {
  await jeda(200); siapkan(); if (!bolehKep()) throw g('Hanya Pokja Kepegawaian.', '42501');
  const hasil = { uji, ditambah: 0, dilewati: 0, gagal: [] }, baru = [];
  rows.forEach((r, i) => {
    if ([...d().pegawai, ...baru].some((p) => (teks(r.nip) && p.nip === teks(r.nip)) || (p.nama.toLowerCase() === String(r.nama || '#').toLowerCase() && (p.provinsi || '') === (provBaku(r.provinsi) || '')))) { hasil.dilewati++; return; }
    try { baru.push(tulisPeg({ id: I.uid(), dibuat_pada: I.sekarang() }, r)); hasil.ditambah++; } catch (e) { hasil.gagal.push({ baris: r._baris || i + 1, nama: r.nama || '', pesan: e.message }); }
  });
  if (!uji) { d().pegawai.push(...baru); I.simpan(); }
  return hasil;
}
export async function ringkasanPegawai() {
  await jeda(); siapkan(); butuhPeg();
  const akt = d().pegawai.filter((p) => p.status === 'Aktif'), bln = hariIniWib().slice(0, 7);
  const ojtBln = d().ojt.filter((o) => o.status !== 'Batal' && o.tanggal_mulai.slice(0, 7) <= bln && (o.tanggal_selesai || o.tanggal_mulai).slice(0, 7) >= bln);
  return { pusat: akt.filter((p) => p.jenis === 'pusat').length, pendamping: akt.filter((p) => p.jenis === 'pendamping').length,
    pendamping_per_provinsi: hitung(akt.filter((p) => p.jenis === 'pendamping' && p.provinsi), (p) => p.provinsi).map((x) => ({ provinsi: x.label, kode_peta: PROV[x.label], n: x.n })),
    per_pokja: hitung(akt.filter((p) => p.jenis === 'pusat'), (p) => I.pokjaById(p.pokja_id)?.nama_pendek || 'Tanpa Pokja'),
    ojt_bulan_ini: ojtBln.length, ojt_peserta_bulan_ini: ojtBln.reduce((s, o) => s + o.peserta.length + (o.peserta_luar || 0), 0) };
}
export async function daftarOjt(f = {}) {
  await jeda(); siapkan(); butuhPeg();
  return { boleh_kelola: bolehKep() || I.diPokja('TU'), baris: d().ojt.filter((o) => (!f.tahun || o.tanggal_mulai.startsWith(String(f.tahun))) && (!f.status || o.status === f.status))
    .sort(urutTurun('tanggal_mulai')).map((o) => ({ ...I.salin(o), peserta_nama: d().pegawai.filter((p) => o.peserta.includes(p.id)).map((p) => p.nama).sort(), jumlah_berkas: berkasDari('ojt', o.id).length })) };
}
export async function simpanOjt(x) {
  await jeda(); siapkan(); if (!(bolehKep() || I.diPokja('TU'))) throw g('OJT dikelola Pokja Kepegawaian dan TU.', '42501');
  if (!teks(x.judul)) throw g('Judul OJT wajib diisi.'); if (!tgl(x.tanggal_mulai)) throw g('Tanggal mulai wajib diisi.');
  if (tgl(x.tanggal_selesai) && tgl(x.tanggal_selesai) < tgl(x.tanggal_mulai)) throw g('Tanggal selesai tidak boleh sebelum tanggal mulai.');
  const isi = { judul: teks(x.judul), penyelenggara: teks(x.penyelenggara), lokasi: teks(x.lokasi), tanggal_mulai: tgl(x.tanggal_mulai), tanggal_selesai: tgl(x.tanggal_selesai),
    peserta: (x.peserta || []).filter((id) => d().pegawai.some((p) => p.id === id)), peserta_luar: int(x.peserta_luar) || 0,
    status: pilih(x.status, ['Rencana', 'Berlangsung', 'Selesai', 'Batal'], 'status OJT') || 'Rencana', catatan: teks(x.catatan), diubah_pada: I.sekarang() };
  let o;
  if (x.id) { o = d().ojt.find((y) => y.id === x.id); if (!o) throw g('OJT tidak ditemukan.'); Object.assign(o, isi); }
  else { o = { id: I.uid(), ...isi, dibuat_nama: I.namaSaya(), dibuat_pada: I.sekarang() }; d().ojt.push(o); }
  I.simpan(); return I.salin(o);
}
export async function hapusOjt(id) {
  await jeda(); siapkan(); if (!(bolehKep() || I.diPokja('TU'))) throw g('Hanya Pokja Kepegawaian dan TU.', '42501');
  if (berkasDari('ojt', id).length) throw g('Hapus berkas OJT ini lebih dulu.');
  d().ojt = d().ojt.filter((o) => o.id !== id); I.simpan();
}

// =====================================================================================
// JADWAL PEGAWAI
// =====================================================================================
const bolehJadwal = (pid) => I.isSA() || I.diPokja('TU') || d().pegawai.some((p) => p.id === pid && p.pengguna_id === sayaId());
const pendengarJadwal = new Set();
const kabarJadwal = () => pendengarJadwal.forEach((f) => { try { f(); } catch {} });
export async function jadwalBulan(tahun, bulan) {
  await jeda(); siapkan(); butuhPeg();
  const awal = `${tahun}-${String(bulan).padStart(2, '0')}-01`, akhirD = new Date(Date.UTC(tahun, bulan, 0)).getUTCDate(), akhir = `${tahun}-${String(bulan).padStart(2, '0')}-${akhirD}`;
  const jd = d().jadwal.filter((j) => j.tanggal >= awal && j.tanggal <= akhir);
  return { awal, akhir, boleh_semua: I.isSA() || I.diPokja('TU'),
    pegawai: d().pegawai.filter((p) => p.jenis === 'pusat' && (p.status === 'Aktif' || jd.some((j) => j.pegawai_id === p.id))).sort((a, b) => a.urutan - b.urutan || a.nama.localeCompare(b.nama)).map(pegJson),
    jadwal: I.salin(jd), libur: (d().libur34 || []).filter((x) => x.tanggal >= awal && x.tanggal <= akhir),
    libur_semua: I.isSA() || I.diPokja('TU') ? I.salin(d().libur34 || []) : null };
}
export async function simpanJadwal(x) {
  await jeda(150); siapkan(); butuhPeg();
  if (!teks(x.kegiatan)) throw g('Nama kegiatan wajib diisi.');
  const jenis = pilih(x.jenis, ['Perjadin', 'Fullday', 'Fullboard'], 'jenis penugasan'); if (!jenis) throw g('Pilih jenis penugasan: Perjadin, Fullday, atau Fullboard.');
  const m = tgl(x.mulai), s = tgl(x.selesai) || m;
  if (!m) throw g('Tanggal mulai wajib diisi.'); if (s < m) throw g('Tanggal selesai tidak boleh sebelum tanggal mulai.');
  if ((new Date(s) - new Date(m)) / 864e5 > 62) throw g('Rentang kegiatan maksimal 2 bulan per input.');
  if (!(x.pegawai || []).length) throw g('Pilih minimal satu pegawai.');
  const grup = I.uid(), konflik = []; let n = 0;
  for (const pid of x.pegawai) {
    const p = d().pegawai.find((y) => y.id === pid); if (!p) continue;
    if (!bolehJadwal(pid)) throw g(`Anda hanya dapat mengisi jadwal Anda sendiri (${p.nama} bukan akun Anda). Jadwal pegawai lain diisi Pokja TU.`, '42501');
    for (let t = new Date(m + 'T00:00:00Z'); t <= new Date(s + 'T00:00:00Z'); t = new Date(t.getTime() + 864e5)) {
      const tg = t.toISOString().slice(0, 10), ada = d().jadwal.find((j) => j.pegawai_id === pid && j.tanggal === tg);
      if (ada) { konflik.push({ pegawai: p.nama, tanggal: tg, kegiatan: ada.kegiatan }); continue; }
      d().jadwal.push({ id: I.uid(), pegawai_id: pid, tanggal: tg, kegiatan: teks(x.kegiatan), jenis, lokasi: teks(x.lokasi), keterangan: teks(x.keterangan), grup, dibuat_nama: I.namaSaya(), dibuat_pada: I.sekarang() }); n++;
    }
  }
  if (!n && konflik.length) throw g('Semua tanggal yang dipilih sudah terisi kegiatan lain untuk pegawai tersebut.');
  I.simpan(); kabarJadwal(); return { grup, ditambah: n, konflik };
}
export async function ubahJadwal(id, x, grup = true) {
  await jeda(); siapkan();
  const j = d().jadwal.find((y) => y.id === id); if (!j) throw g('Jadwal tidak ditemukan.');
  if (!teks(x.kegiatan)) throw g('Nama kegiatan wajib diisi.');
  const kena = d().jadwal.filter((y) => y.id === id || (grup && y.grup === j.grup));
  if (kena.some((y) => !bolehJadwal(y.pegawai_id))) throw g('Ada jadwal pegawai lain dalam kegiatan ini; hanya Pokja TU yang dapat mengubahnya.', '42501');
  const jenis = pilih(x.jenis, ['Perjadin', 'Fullday', 'Fullboard'], 'jenis penugasan');
  kena.forEach((y) => Object.assign(y, { kegiatan: teks(x.kegiatan), jenis: jenis || y.jenis, lokasi: teks(x.lokasi), keterangan: teks(x.keterangan) }));
  I.simpan(); kabarJadwal(); return kena.length;
}
export async function hapusJadwal(id, grup = false) {
  await jeda(); siapkan();
  const j = d().jadwal.find((y) => y.id === id); if (!j) throw g('Jadwal tidak ditemukan.');
  const kena = d().jadwal.filter((y) => y.id === id || (grup && y.grup === j.grup));
  if (kena.some((y) => !bolehJadwal(y.pegawai_id))) throw g('Anda hanya dapat menghapus jadwal Anda sendiri.', '42501');
  d().jadwal = d().jadwal.filter((y) => !kena.includes(y)); I.simpan(); kabarJadwal(); return kena.length;
}
export async function aturHariLibur(daftar) {
  await jeda(); siapkan(); if (!(I.isSA() || I.diPokja('TU'))) throw g('Hari libur diatur Pokja TU atau Super Admin.', '42501');
  if (daftar.some((x) => !/^\d{4}-\d{2}-\d{2}$/.test(x.tanggal || '') || !teks(x.nama))) throw g('Setiap hari libur wajib berisi tanggal (YYYY-MM-DD) dan nama.');
  d().libur34 = daftar; I.simpan(); kabarJadwal(); return daftar;
}

// =====================================================================================
// RENCANA KERJA
// =====================================================================================
const renjaTerlihat = (r) => I.isPeg() && (r.status_verifikasi === 'terverifikasi' || I.isSA() || I.idsPokja().includes(r.pokja_id) || (r.status_verifikasi !== 'draft' && I.diPokja('PERENCANAAN')));
const renjaJson = (r) => ({ ...I.salin(r), ...pokjaInfo(r.pokja_id), berkas: berkasDari('renja', r.id),
  boleh_ubah: I.isSA() || (I.idsPokja().includes(r.pokja_id) && ['draft', 'perlu_perbaikan'].includes(r.status_verifikasi)),
  boleh_ajukan: ['draft', 'perlu_perbaikan'].includes(r.status_verifikasi) && (I.isSA() || kapokjaDi(r.pokja_id)),
  boleh_verifikasi: r.status_verifikasi === 'menunggu' && (I.isSA() || I.diPokja('PERENCANAAN')) });
export async function daftarRenja(f = {}) {
  await jeda(); siapkan(); butuhPeg();
  return { boleh_verifikasi: I.isSA() || I.diPokja('PERENCANAAN'), baris: d().renja.filter((r) => renjaTerlihat(r) && (!f.tahun || r.tahun === Number(f.tahun)) && (!f.pokja || r.pokja_id === f.pokja)
    && (!f.status || r.status_verifikasi === f.status) && (f.mode !== 'saya' || I.idsPokja().includes(r.pokja_id)) && (f.mode !== 'antrean' || r.status_verifikasi === 'menunggu'))
    .sort((a, b) => b.tahun - a.tahun || I.pokjaById(a.pokja_id).urutan - I.pokjaById(b.pokja_id).urutan).map(renjaJson) };
}
export async function simpanRenja(x) {
  await jeda(); siapkan(); butuhPeg();
  let r;
  if (x.id) {
    r = d().renja.find((y) => y.id === x.id); if (!r) throw g('Rencana kerja tidak ditemukan.');
    if (!(I.isSA() || (I.idsPokja().includes(r.pokja_id) && ['draft', 'perlu_perbaikan'].includes(r.status_verifikasi)))) throw g('Rencana kerja hanya dapat diubah Pokja pemilik selama berstatus Draft atau Perlu Perbaikan.', '42501');
  }
  if (!teks(x.judul)) throw g('Judul rencana kerja wajib diisi.');
  if (!(Number(x.tahun) >= 2020 && Number(x.tahun) <= 2100)) throw g('Tahun tidak valid.');
  const keg = (x.kegiatan || []).filter((k) => teks(k.nama)).map((k) => ({ nama: teks(k.nama), target: teks(k.target), satuan: teks(k.satuan), waktu: teks(k.waktu), anggaran: num(k.anggaran) || 0 }));
  if (!keg.length) throw g('Isi minimal satu kegiatan.');
  const isi = { tahun: Number(x.tahun), judul: teks(x.judul), tujuan: teks(x.tujuan), kegiatan: keg, total_anggaran: keg.reduce((s, k) => s + k.anggaran, 0), diubah_pada: I.sekarang() };
  if (r) Object.assign(r, isi);
  else { r = { id: I.uid(), pokja_id: pokjaPilih(x.pokja_id), status_verifikasi: 'draft', ...isi, dibuat_oleh: sayaId(), dibuat_oleh_nama: I.namaSaya(), dibuat_pada: I.sekarang() }; d().renja.push(r); }
  I.simpan(); return renjaJson(r);
}
export async function ajukanRenja(id) {
  await jeda(); siapkan();
  const r = d().renja.find((y) => y.id === id); if (!r) throw g('Rencana kerja tidak ditemukan.');
  if (!(I.isSA() || kapokjaDi(r.pokja_id))) throw g('Rencana kerja diajukan oleh Kapokja.', '42501');
  if (!['draft', 'perlu_perbaikan'].includes(r.status_verifikasi)) throw g('Rencana kerja ini sudah diajukan.');
  Object.assign(r, { status_verifikasi: 'menunggu', diajukan_pada: I.sekarang(), catatan_verifikasi: null });
  beriTahu(pengurus('PERENCANAAN'), 'RENJA_MENUNGGU', 'Rencana kerja menunggu verifikasi', `Rencana kerja ${r.tahun} Pokja ${I.pokjaById(r.pokja_id).nama_pendek} ("${r.judul}") menunggu verifikasi Pokja Perencanaan.`, '#/rencana-kerja');
  I.simpan(); return renjaJson(r);
}
export async function verifikasiRenja(id, setuju, catatan = null) {
  await jeda(); siapkan();
  if (!(I.isSA() || I.diPokja('PERENCANAAN'))) throw g('Verifikasi dilakukan Pokja Perencanaan.', '42501');
  const r = d().renja.find((y) => y.id === id); if (!r || r.status_verifikasi !== 'menunggu') throw g('Rencana kerja ini tidak sedang menunggu verifikasi.');
  if (!setuju && !teks(catatan)) throw g('Catatan wajib diisi saat mengembalikan.');
  Object.assign(r, { status_verifikasi: setuju ? 'terverifikasi' : 'perlu_perbaikan', catatan_verifikasi: teks(catatan), diverifikasi_nama: I.namaSaya(), diverifikasi_pada: I.sekarang() });
  beriTahu(I.anggotaPokja(r.pokja_id), setuju ? 'RENJA_TERVERIFIKASI' : 'RENJA_DIKEMBALIKAN', setuju ? 'Rencana kerja terverifikasi' : 'Rencana kerja perlu perbaikan',
    `Rencana kerja ${r.tahun} "${r.judul}"` + (setuju ? ' sudah diverifikasi Pokja Perencanaan.' : ' dikembalikan: ' + catatan), '#/rencana-kerja');
  I.simpan(); return renjaJson(r);
}
export async function hapusRenja(id) {
  await jeda(); siapkan();
  const r = d().renja.find((y) => y.id === id); if (!r) throw g('Rencana kerja tidak ditemukan.');
  if (!(I.isSA() || (I.idsPokja().includes(r.pokja_id) && ['draft', 'perlu_perbaikan'].includes(r.status_verifikasi)))) throw g('Hanya Pokja pemilik selama berstatus Draft atau Perlu Perbaikan.', '42501');
  if (berkasDari('renja', id).length) throw g('Hapus lampirannya lebih dulu.');
  d().renja = d().renja.filter((y) => y.id !== id); I.simpan();
}

// =====================================================================================
// DASHBOARD & PROGRES
// =====================================================================================
function statusCair(uid) {
  const st = (t) => I.tahapU(uid, t)?.status;
  if (st('11') === 'selesai') return 'cair';
  if (st('6') === 'selesai' && st('10') !== 'selesai') return 'belum_cair';
  return 'proses';
}
const adaFoto = (bid, k) => d().berkas.some((b) => b.konteks === 'dok_pm' && b.ref_id === bid && b.jenis === k && !b.dihapus)
  || d().dok_tanpa.some((t) => t.bnba_id === bid && t.kategori === k && t.status === 'disetujui');
export async function progresPokja() {
  await jeda(); siapkan(); butuhPeg();
  const bobot = { cair: 50, foto_sebelum: 25, foto_penyaluran: 25 }, W = bobot.cair + bobot.foto_sebelum + bobot.foto_penyaluran;
  const b = d().bnba.filter((x) => x.status_verifikasi === 'terverifikasi').map((x) => ({ ...x, sc: statusCair(x.usulan_id) }));
  return { bobot, baris: d().pokja.filter((k) => k.kelompok === 'teknis').sort((a, c) => a.urutan - c.urutan).map((k) => {
    const pb = b.filter((x) => x.pokja_id === k.id), cair = pb.filter((x) => x.sc === 'cair'), fs = pb.filter((x) => adaFoto(x.id, 'sebelum_usaha')).length, fp = cair.filter((x) => adaFoto(x.id, 'saat_penyaluran')).length;
    const pg = pb.length ? Math.round((bobot.cair * cair.length / pb.length + bobot.foto_sebelum * fs / pb.length + (cair.length ? bobot.foto_penyaluran * fp / cair.length : 0)) / W * 100) : 0;
    return { pokja_id: k.id, kode: k.kode, nama: k.nama_pendek, warna: k.warna, warna_tint: k.warna_tint, warna_teks: k.warna_teks, pm: pb.length, cair: cair.length, foto_sebelum: fs,
      foto_penyaluran: fp, foto_sebelum_kurang: pb.length - fs, foto_penyaluran_kurang: cair.length - fp, progres: pg,
      usulan_aktif: d().usulan.filter((u) => u.pokja_id === k.id && ['draft', 'menunggu', 'perlu_perbaikan', 'proses'].includes(u.status)).length };
  }) };
}
export async function dashboardRealisasi(f = {}) {
  await jeda(160); siapkan(); butuhPeg();
  const UMUR = [[0, 17, '< 18'], [18, 30, '18–30'], [31, 45, '31–45'], [46, 59, '46–59'], [60, 150, '60+']];
  const usia = (t) => { if (!t) return null; const l = new Date(t), n = new Date(); let a = n.getFullYear() - l.getFullYear(); if (n < new Date(n.getFullYear(), l.getMonth(), l.getDate())) a--; return a; };
  const semua = d().bnba.filter((x) => x.status_verifikasi === 'terverifikasi').map((x) => { const u = d().usulan.find((y) => y.id === x.usulan_id); return { ...x, sc: statusCair(x.usulan_id), th: Number(String(u?.tgl_sk || x.tgl_sp2d || x.dibuat_pada).slice(0, 4)), usia: usia(x.tgl_lahir) }; });
  const b = semua.filter((x) => (!f.tahun || x.th === Number(f.tahun)) && (!f.pokja || x.pokja_id === f.pokja) && (!f.klaster || x.klaster_ppks === f.klaster)
    && (!f.jenis || x.jenis_bantuan === f.jenis) && (!f.provinsi || x.ktp_provinsi === f.provinsi) && (!f.status || x.sc === f.status));
  const nil = (r) => r.reduce((s, x) => s + (Number(x.nilai_bantuan) || 0), 0);
  const grup = (fn) => { const m = new Map(); b.forEach((x) => { const k = fn(x); m.set(k, [...(m.get(k) || []), x]); }); return [...m]; };
  const bln = hariIniWib().slice(0, 7);
  return {
    total_pm: b.length, total_usulan: new Set(b.map((x) => x.usulan_id)).size, nilai_total: nil(b), pm_cair: b.filter((x) => x.sc === 'cair').length, nilai_cair: nil(b.filter((x) => x.sc === 'cair')),
    pm_belum_cair: b.filter((x) => x.sc === 'belum_cair').length, nilai_belum_cair: nil(b.filter((x) => x.sc === 'belum_cair')), pm_proses: b.filter((x) => x.sc === 'proses').length,
    provinsi_terjangkau: new Set(b.map((x) => x.ktp_provinsi)).size,
    per_klaster: grup((x) => x.klaster_ppks || 'Belum diisi').map(([label, r]) => ({ label, n: r.length, nilai: nil(r) })).sort((a, c) => c.n - a.n),
    per_provinsi: grup((x) => x.ktp_provinsi).filter(([p]) => p).map(([provinsi, r]) => ({ provinsi, kode_peta: PROV[provinsi], n: r.length, nilai: nil(r) })).sort((a, c) => c.n - a.n),
    per_kabkota: grup((x) => x.ktp_kabkota + '|' + x.ktp_provinsi).map(([k, r]) => ({ kabkota: k.split('|')[0], provinsi: k.split('|')[1], n: r.length })).sort((a, c) => c.n - a.n).slice(0, 12),
    jenis_kelamin: grup((x) => x.jenis_kelamin || 'Belum diisi').map(([label, r]) => ({ label, n: r.length })),
    umur: [...UMUR.map(([a, z, label]) => ({ label, n: b.filter((x) => x.usia != null && x.usia >= a && x.usia <= z).length })), { label: 'Tanpa tgl lahir', n: b.filter((x) => x.usia == null).length }],
    per_jenis: grup((x) => x.jenis_bantuan || 'Belum diisi').map(([label, r]) => ({ label, n: r.length, nilai: nil(r) })).sort((a, c) => c.nilai - a.nilai),
    per_bulan: grup((x) => (x.tgl_sp2d ? x.tgl_sp2d.slice(0, 7) : null)).filter(([k]) => k).map(([bulan, r]) => ({ bulan, n: r.length, nilai: nil(r) })).sort((a, c) => a.bulan.localeCompare(c.bulan)),
    per_pokja: grup((x) => x.pokja_id).map(([pid, r]) => ({ label: I.pokjaById(pid).nama_pendek, warna: I.pokjaById(pid).warna, n: r.length, nilai: nil(r), cair: r.filter((x) => x.sc === 'cair').length })),
    lks: { total: d().lks.filter((l) => l.status_verifikasi === 'terverifikasi').length, murni: d().lks.filter((l) => l.status_verifikasi === 'terverifikasi' && !l.non_tskpo).length, multi: d().lks.filter((l) => l.status_verifikasi === 'terverifikasi' && l.non_tskpo).length },
    aster: { total: d().aster.filter((a) => a.status_verifikasi === 'terverifikasi').length, pendamping: new Set(d().aster.filter((a) => a.status_verifikasi === 'terverifikasi').map((a) => (a.nama_pensurvei || '').toLowerCase())).size },
    ojt_bulan_ini: d().ojt.filter((o) => o.status !== 'Batal' && o.tanggal_mulai.slice(0, 7) <= bln && (o.tanggal_selesai || o.tanggal_mulai).slice(0, 7) >= bln).length,
    pegawai: { pusat: d().pegawai.filter((p) => p.jenis === 'pusat' && p.status === 'Aktif').length, pendamping: d().pegawai.filter((p) => p.jenis === 'pendamping' && p.status === 'Aktif').length },
    tahun: [...new Set(semua.map((x) => x.th))].filter(Boolean).sort((a, c) => c - a),
    progres: await progresPokja(),
  };
}

// =====================================================================================
// DOKUMEN POKJA & BERSAMA, PRODUK HUKUM
// =====================================================================================
function pastikanFolder(pid) {
  const D = d(), k = I.pokjaById(pid); if (!k) return;
  const ada = (n) => D.dok_folder.some((f) => f.pokja_id === pid && f.nama.toLowerCase() === n.toLowerCase());
  [['SK', 1], ['KAK', 2], ['File Kegiatan', 3], ...(k.kode === 'KEUANGAN' ? [['Burekol ke BNI', 4]] : [])].forEach(([nama, urutan]) => {
    if (!ada(nama)) D.dok_folder.push({ id: I.uid(), pokja_id: pid, nama, bawaan: true, urutan, dibuat_pada: I.sekarang() });
  });
}
const dokTerlihat = (x) => I.isPeg() && (x.status === 'terbit' || I.isSA() || I.idsPokja().includes(x.pokja_id) || (x.status === 'diajukan' && I.diPokja('TU')));
const dokJson = (x) => { const b = d().berkas.find((y) => y.id === x.berkas_id) || {}; const f = d().dok_folder.find((y) => y.id === x.folder_id);
  return { ...I.salin(x), ...pokjaInfo(x.pokja_id), folder_nama: f?.nama || null, berkas_nama: b.nama, ukuran: b.ukuran, mime: b.mime, lokasi: b.lokasi, tautan: b.tautan,
    boleh_ubah: bolehPokja(x.pokja_id) && ['privat', 'ditolak'].includes(x.status), boleh_batal: bolehPokja(x.pokja_id) && x.status === 'diajukan',
    boleh_verifikasi: x.status === 'diajukan' && (I.isSA() || I.diPokja('TU')), boleh_tarik: x.status === 'terbit' && (I.isSA() || I.diPokja('TU')) }; };
export async function daftarFolder(pid) {
  await jeda(); siapkan(); if (!bolehPokja(pid)) throw g('Repositori ini hanya untuk anggota Pokja pemiliknya.', '42501');
  pastikanFolder(pid); I.simpan();
  return d().dok_folder.filter((f) => f.pokja_id === pid).sort((a, b) => a.urutan - b.urutan || a.nama.localeCompare(b.nama))
    .map((f) => ({ id: f.id, nama: f.nama, bawaan: f.bawaan, urutan: f.urutan, jumlah: d().dokumen.filter((x) => x.folder_id === f.id && !x.dihapus).length }));
}
const namaFolderOk = (v) => { v = String(v || '').trim(); if (!v || v.length > 60 || /[\\/:*?"<>|]/.test(v)) throw g('Nama folder 1–60 karakter, tanpa tanda / \\ : * ? " < > |'); return v; };
export async function buatFolder(pid, nama) {
  await jeda(); siapkan(); if (!bolehPokja(pid)) throw g('Hanya anggota Pokja pemilik.', '42501');
  const v = namaFolderOk(nama); if (d().dok_folder.some((f) => f.pokja_id === pid && f.nama.toLowerCase() === v.toLowerCase())) throw g(`Folder "${v}" sudah ada.`);
  const f = { id: I.uid(), pokja_id: pid, nama: v, bawaan: false, urutan: 100, dibuat_pada: I.sekarang() }; d().dok_folder.push(f); I.simpan(); return I.salin(f);
}
export async function ubahFolder(id, nama) {
  await jeda(); siapkan(); const f = d().dok_folder.find((x) => x.id === id); if (!f) throw g('Folder tidak ditemukan.');
  if (!bolehPokja(f.pokja_id)) throw g('Hanya anggota Pokja pemilik.', '42501'); if (f.bawaan) throw g('Folder bawaan tidak dapat diganti namanya.');
  const v = namaFolderOk(nama); if (d().dok_folder.some((x) => x.pokja_id === f.pokja_id && x.id !== id && x.nama.toLowerCase() === v.toLowerCase())) throw g(`Folder "${v}" sudah ada.`);
  f.nama = v; I.simpan(); return I.salin(f);
}
export async function hapusFolder(id) {
  await jeda(); siapkan(); const f = d().dok_folder.find((x) => x.id === id); if (!f) throw g('Folder tidak ditemukan.');
  if (!bolehPokja(f.pokja_id)) throw g('Hanya anggota Pokja pemilik.', '42501'); if (f.bawaan) throw g('Folder bawaan tidak dapat dihapus.');
  if (d().dokumen.some((x) => x.folder_id === id && !x.dihapus)) throw g('Folder masih berisi dokumen. Pindahkan atau hapus dokumennya lebih dulu.');
  d().dok_folder = d().dok_folder.filter((x) => x.id !== id); I.simpan();
}
export async function daftarDokumen(f = {}) {
  await jeda(); siapkan(); butuhPeg();
  const mode = f.mode || 'bersama', q = String(f.q || '').toLowerCase();
  if (mode === 'repo' && !bolehPokja(f.pokja)) throw g('Repositori ini hanya untuk anggota Pokja pemiliknya.', '42501');
  if (mode === 'antrean' && !(I.isSA() || I.diPokja('TU'))) throw g('Antrean publikasi hanya untuk Pokja TU.', '42501');
  const rows = d().dokumen.filter((x) => !x.dihapus && dokTerlihat(x)
    && (mode === 'repo' ? x.pokja_id === f.pokja && (!f.folder || x.folder_id === f.folder) : mode === 'antrean' ? x.status === 'diajukan'
      : mode === 'pengajuan' ? I.idsPokja().includes(x.pokja_id) && ['diajukan', 'ditolak'].includes(x.status) : x.status === 'terbit')
    && (!f.kategori || x.kategori === f.kategori) && (!f.pokja || mode === 'repo' || x.pokja_id === f.pokja) && (!f.status || x.status === f.status)
    && (!q || x.judul.toLowerCase().includes(q) || String(x.keterangan || '').toLowerCase().includes(q)))
    .sort((a, b) => String(b.diverifikasi_pada || b.diubah_pada).localeCompare(String(a.diverifikasi_pada || a.diubah_pada)));
  const perKat = {}; d().dokumen.filter((x) => x.status === 'terbit' && !x.dihapus && x.kategori).forEach((x) => { perKat[x.kategori] = (perKat[x.kategori] || 0) + 1; });
  return { total: rows.length, baris: halaman(rows, f).map(dokJson), per_kategori: perKat,
    antrean: I.isSA() || I.diPokja('TU') ? d().dokumen.filter((x) => x.status === 'diajukan' && !x.dihapus).length : null };
}
const dokAmbil = (id) => { const x = d().dokumen.find((y) => y.id === id && !y.dihapus); if (!x) throw g('Dokumen tidak ditemukan.'); return x; };
export async function ubahDokumen(id, v) {
  await jeda(); siapkan(); const x = dokAmbil(id);
  if (!(bolehPokja(x.pokja_id) && ['privat', 'ditolak'].includes(x.status))) throw g('Dokumen hanya dapat diubah Pokja pemilik selama belum diajukan atau setelah ditolak.', '42501');
  if (!teks(v.judul)) throw g('Judul dokumen wajib diisi.');
  if (v.folder_id && !d().dok_folder.some((f) => f.id === v.folder_id && f.pokja_id === x.pokja_id)) throw g('Folder tujuan harus folder Pokja yang sama.');
  Object.assign(x, { judul: teks(v.judul), keterangan: teks(v.keterangan), folder_id: v.folder_id || x.folder_id, diubah_pada: I.sekarang() }); I.simpan(); return dokJson(x);
}
function cekKategori(x, kat) {
  if (!KAT_DOK.includes(kat)) throw g('Pilih salah satu dari 6 kategori Dokumen Bersama.');
  const b = d().berkas.find((y) => y.id === x.berkas_id) || {};
  if (kat === 'Dokumentasi Kegiatan') { if (b.lokasi === 'tautan' || !['image/jpeg', 'image/png'].includes(b.mime) || (b.ukuran || 0) > 512000) throw g('Kategori Dokumentasi Kegiatan hanya menerima foto JPG/PNG maksimal 500 KB.'); }
  else if (/^image\//.test(b.mime || '')) throw g('Foto hanya untuk kategori Dokumentasi Kegiatan. Kategori lain menerima PDF, DOC/DOCX, PPT/PPTX, atau XLS/XLSX.');
}
export async function ajukanPublikasi(id, kat) {
  await jeda(); siapkan(); const x = dokAmbil(id);
  if (!bolehPokja(x.pokja_id)) throw g('Hanya anggota Pokja pemilik.', '42501');
  if (!['privat', 'ditolak'].includes(x.status)) throw g('Dokumen ini sudah diajukan atau sudah terbit.');
  cekKategori(x, kat);
  Object.assign(x, { status: 'diajukan', kategori: kat, diajukan_nama: I.namaSaya(), diajukan_pada: I.sekarang(), catatan_verifikasi: null, diubah_pada: I.sekarang() });
  beriTahu(pengurus('TU'), 'PUBLIKASI_DIAJUKAN', 'Dokumen diajukan ke Dokumen Bersama', `Pokja ${I.pokjaById(x.pokja_id).nama_pendek} mengajukan "${x.judul}" (kategori ${kat}).`, '#/dokumen-bersama?tab=antrean');
  I.simpan(); return dokJson(x);
}
export async function batalPublikasi(id) {
  await jeda(); siapkan(); const x = dokAmbil(id);
  if (x.status !== 'diajukan') throw g('Dokumen ini tidak sedang diajukan.'); if (!bolehPokja(x.pokja_id)) throw g('Hanya anggota Pokja pemilik.', '42501');
  x.status = 'privat'; I.simpan(); return dokJson(x);
}
export async function verifikasiPublikasi(id, setuju, kat = null, catatan = null) {
  await jeda(); siapkan(); if (!(I.isSA() || I.diPokja('TU'))) throw g('Verifikasi publikasi dilakukan Pokja TU.', '42501');
  const x = dokAmbil(id); if (x.status !== 'diajukan') throw g('Dokumen ini tidak sedang menunggu verifikasi.');
  if (!setuju && !teks(catatan)) throw g('Catatan wajib diisi saat menolak.');
  const k = teks(kat) || x.kategori; if (setuju) cekKategori(x, k);
  Object.assign(x, { status: setuju ? 'terbit' : 'ditolak', kategori: k, catatan_verifikasi: teks(catatan), diverifikasi_nama: I.namaSaya(), diverifikasi_pada: I.sekarang(), diubah_pada: I.sekarang() });
  beriTahu([x.dibuat_oleh], setuju ? 'PUBLIKASI_TERBIT' : 'PUBLIKASI_DITOLAK', setuju ? 'Dokumen terbit di Dokumen Bersama' : 'Pengajuan publikasi ditolak',
    `"${x.judul}"` + (setuju ? ` terbit pada kategori ${k}.` : ' ditolak: ' + catatan), setuju ? '#/dokumen-bersama' : '#/dokumen-pokja');
  I.simpan(); return dokJson(x);
}
export async function tarikPublikasi(id, alasan) {
  await jeda(); siapkan(); if (!(I.isSA() || I.diPokja('TU'))) throw g('Hanya Pokja TU atau Super Admin.', '42501');
  if (!teks(alasan)) throw g('Alasan wajib diisi.');
  const x = dokAmbil(id); if (x.status !== 'terbit') throw g('Dokumen ini tidak sedang terbit.');
  Object.assign(x, { status: 'privat', catatan_verifikasi: 'Ditarik dari Dokumen Bersama: ' + alasan, diubah_pada: I.sekarang() });
  beriTahu([x.dibuat_oleh], 'PUBLIKASI_DITARIK', 'Dokumen ditarik dari Dokumen Bersama', `"${x.judul}" ditarik: ${alasan}`, '#/dokumen-pokja');
  I.simpan(); return dokJson(x);
}
export async function daftarProdukHukum(f = {}) {
  await jeda(); siapkan(); butuhPeg();
  const q = String(f.q || '').toLowerCase();
  return { boleh_kelola: I.isSA() || I.diPokja('HUKUM'), baris: d().hukum.filter((h) => (!f.jenis || h.jenis === f.jenis) && (!f.status || h.status === f.status) && (!f.tahun || h.tahun === Number(f.tahun))
    && (!q || h.judul.toLowerCase().includes(q) || String(h.nomor || '').toLowerCase().includes(q) || String(h.tentang || '').toLowerCase().includes(q)))
    .sort((a, b) => (b.tahun || 0) - (a.tahun || 0) || a.judul.localeCompare(b.judul)).map((h) => ({ ...I.salin(h), berkas: berkasDari('hukum', h.id) })) };
}
export async function simpanProdukHukum(x) {
  await jeda(); siapkan(); if (!(I.isSA() || I.diPokja('HUKUM'))) throw g('Produk hukum dikelola Pokja Hukum.', '42501');
  if (!teks(x.judul)) throw g('Judul wajib diisi.');
  const jenis = pilih(x.jenis, ['Peraturan Menteri', 'Keputusan Menteri', 'Keputusan Dirjen', 'Keputusan Direktur', 'Surat Edaran', 'SOP', 'Pedoman/Juknis', 'Lainnya'], 'jenis');
  if (!jenis) throw g('Pilih jenis produk hukum.');
  const isi = { jenis, nomor: teks(x.nomor), tahun: int(x.tahun), judul: teks(x.judul), tentang: teks(x.tentang), status: pilih(x.status, ['Berlaku', 'Dicabut', 'Draf/Revisi'], 'status') || 'Berlaku', tgl_tetap: tgl(x.tgl_tetap), diubah_pada: I.sekarang() };
  let h; if (x.id) { h = d().hukum.find((y) => y.id === x.id); if (!h) throw g('Produk hukum tidak ditemukan.'); Object.assign(h, isi); }
  else { h = { id: I.uid(), ...isi, dibuat_nama: I.namaSaya(), dibuat_pada: I.sekarang() }; d().hukum.push(h); }
  I.simpan(); return I.salin(h);
}
export async function hapusProdukHukum(id) {
  await jeda(); siapkan(); if (!(I.isSA() || I.diPokja('HUKUM'))) throw g('Hanya Pokja Hukum.', '42501');
  if (berkasDari('hukum', id).length) throw g('Hapus berkasnya lebih dulu.');
  d().hukum = d().hukum.filter((h) => h.id !== id); I.simpan();
}

// =====================================================================================
// TUGAS
// =====================================================================================
const tugasTerlihat = (t) => I.isPeg() && (I.isSA() || I.diPokja('TU') || t.ditugaskan_ke === sayaId() || t.pemberi_id === sayaId() || (t.pokja_id && kapokjaDi(t.pokja_id)));
const bolehTugaskan = (uid) => uid === sayaId() || I.isSA() || I.diPokja('TU') || d().pengguna_pokja.some((pp) => pp.pengguna_id === uid && kapokjaDi(pp.pokja_id));
const tugasJson = (t) => ({ ...I.salin(t), ...pokjaInfo(t.pokja_id), penerima_nama: d().pengguna.find((u) => u.id === t.ditugaskan_ke)?.nama,
  terlambat: !!t.tenggat && t.tenggat < hariIniWib() && ['Baru', 'Dikerjakan'].includes(t.status), boleh_ubah: t.pemberi_id === sayaId() || I.isSA() || I.diPokja('TU'),
  boleh_status: t.ditugaskan_ke === sayaId() || t.pemberi_id === sayaId() || I.isSA() || I.diPokja('TU'), boleh_hapus: t.pemberi_id === sayaId() || I.isSA() });
export async function daftarTugas(f = {}) {
  await jeda(); siapkan(); butuhPeg();
  const mode = f.mode || 'saya', me = sayaId();
  const rows = d().tugas.filter((t) => tugasTerlihat(t) && (mode === 'saya' ? t.ditugaskan_ke === me : mode === 'diberikan' ? t.pemberi_id === me : true)
    && (!f.status || (f.status === 'aktif' ? ['Baru', 'Dikerjakan'].includes(t.status) : t.status === f.status)))
    .sort((a, b) => (['Selesai', 'Dibatalkan'].includes(a.status) - ['Selesai', 'Dibatalkan'].includes(b.status)) || String(a.tenggat || '9').localeCompare(String(b.tenggat || '9')));
  return { baris: rows.map(tugasJson), boleh_semua: I.isSA() || I.diPokja('TU'), ringkasan: {
    saya_aktif: d().tugas.filter((t) => t.ditugaskan_ke === me && ['Baru', 'Dikerjakan'].includes(t.status)).length,
    saya_terlambat: d().tugas.filter((t) => t.ditugaskan_ke === me && ['Baru', 'Dikerjakan'].includes(t.status) && t.tenggat && t.tenggat < hariIniWib()).length,
    diberikan_aktif: d().tugas.filter((t) => t.pemberi_id === me && ['Baru', 'Dikerjakan'].includes(t.status)).length } };
}
export async function penerimaTugas() {
  await jeda(); siapkan();
  return d().pengguna.filter((u) => u.aktif && u.jenis_akses === 'pegawai' && bolehTugaskan(u.id)).map((u) => ({ id: u.id, nama: u.nama, email: u.email, diri: u.id === sayaId(),
    pokja: d().pengguna_pokja.filter((pp) => pp.pengguna_id === u.id).map((pp) => I.pokjaById(pp.pokja_id).nama_pendek).join(', ') })).sort((a, b) => b.diri - a.diri || a.nama.localeCompare(b.nama));
}
export async function simpanTugas(x) {
  await jeda(); siapkan(); butuhPeg();
  if (!teks(x.judul)) throw g('Judul tugas wajib diisi.');
  if (!d().pengguna.some((u) => u.id === x.ditugaskan_ke && u.aktif && u.jenis_akses === 'pegawai')) throw g('Pilih penerima tugas.');
  if (!bolehTugaskan(x.ditugaskan_ke)) throw g('Anda hanya dapat memberi tugas kepada anggota Pokja yang Anda pimpin (Kapokja) atau diri sendiri. Pokja TU dapat menugaskan semua pegawai.', '42501');
  const pk = x.pokja_id || d().pengguna_pokja.find((pp) => pp.pengguna_id === x.ditugaskan_ke && I.idsPokja().includes(pp.pokja_id))?.pokja_id || null;
  const isi = { judul: teks(x.judul), deskripsi: teks(x.deskripsi), pokja_id: pk, ditugaskan_ke: x.ditugaskan_ke, tenggat: tgl(x.tenggat), prioritas: pilih(x.prioritas, ['Rendah', 'Sedang', 'Tinggi'], 'prioritas') || 'Sedang', diubah_pada: I.sekarang() };
  let t, baru = false;
  if (x.id) {
    t = d().tugas.find((y) => y.id === x.id); if (!t) throw g('Tugas tidak ditemukan.');
    if (!(t.pemberi_id === sayaId() || I.isSA() || I.diPokja('TU'))) throw g('Hanya pemberi tugas yang dapat mengubahnya.', '42501');
    baru = t.ditugaskan_ke !== x.ditugaskan_ke; Object.assign(t, isi);
  } else { t = { id: I.uid(), ...isi, pemberi_id: sayaId(), pemberi_nama: I.namaSaya(), status: 'Baru', catatan: null, dibuat_pada: I.sekarang(), selesai_pada: null }; d().tugas.push(t); baru = true; }
  if (baru && t.ditugaskan_ke !== sayaId()) beriTahu([t.ditugaskan_ke], 'TUGAS_BARU', 'Tugas baru: ' + t.judul, 'Dari ' + I.namaSaya() + (t.tenggat ? '. Tenggat ' + t.tenggat.split('-').reverse().join('/') : '') + '.', '#/tugas');
  I.simpan(); return tugasJson(t);
}
export async function ubahStatusTugas(id, status, catatan = null) {
  await jeda(); siapkan();
  const t = d().tugas.find((y) => y.id === id); if (!t) throw g('Tugas tidak ditemukan.');
  if (!(t.ditugaskan_ke === sayaId() || t.pemberi_id === sayaId() || I.isSA() || I.diPokja('TU'))) throw g('Anda tidak berwenang mengubah status tugas ini.', '42501');
  const v = pilih(status, ['Baru', 'Dikerjakan', 'Selesai', 'Dibatalkan'], 'status tugas');
  Object.assign(t, { status: v, catatan: teks(catatan) || t.catatan, selesai_pada: v === 'Selesai' ? I.sekarang() : null, diubah_pada: I.sekarang() });
  if (v === 'Selesai' && t.pemberi_id && t.pemberi_id !== sayaId()) beriTahu([t.pemberi_id], 'TUGAS_SELESAI', 'Tugas selesai: ' + t.judul, I.namaSaya() + ' menandai tugas selesai.', '#/tugas');
  I.simpan(); return tugasJson(t);
}
export async function hapusTugas(id) {
  await jeda(); siapkan();
  const t = d().tugas.find((y) => y.id === id); if (!t) throw g('Tugas tidak ditemukan.');
  if (!(t.pemberi_id === sayaId() || I.isSA())) throw g('Hanya pemberi tugas yang dapat menghapusnya.', '42501');
  d().tugas = d().tugas.filter((y) => y.id !== id); I.simpan();
}

// =====================================================================================
// PESAN & KOMUNIKASI
// =====================================================================================
function pastikanKanal() {
  const D = d();
  D.pokja.forEach((k) => { if (!D.percakapan.some((c) => c.jenis === 'pokja' && c.pokja_id === k.id)) D.percakapan.push({ id: 'cp-' + k.kode, jenis: 'pokja', pokja_id: k.id, peserta: [], judul: 'Chat Pokja ' + k.nama_pendek, dibuat_pada: I.sekarang(), terakhir_pada: '2026-01-01T00:00:00Z' }); });
  if (!D.percakapan.some((c) => c.jenis === 'lintas')) D.percakapan.push({ id: 'cp-lintas', jenis: 'lintas', pokja_id: null, peserta: [], judul: 'Koordinasi Lintas-Pokja', dibuat_pada: I.sekarang(), terakhir_pada: '2026-01-01T00:00:00Z' });
}
function cpTerlihat(c) {
  if (!c || !I.isPeg()) return false;
  if (c.jenis === 'pokja') return I.isSA() || I.idsPokja().includes(c.pokja_id);
  if (c.jenis === 'lintas') return true;
  if (c.jenis === 'pribadi') return c.peserta.includes(sayaId());
  if (c.ref_tabel === 'usulan') { const u = d().usulan.find((x) => x.id === c.ref_id); return !!u && I.usulanTerlihat(u); }
  if (c.ref_tabel === 'bnba') { const b = d().bnba.find((x) => x.id === c.ref_id); return !!b && I.bnbaTerlihat(b); }
  return false;
}
const bacaSaya = (cid) => d().baca34[cid + ':' + sayaId()] || 0;
function cpJson(c) {
  const k = I.pokjaById(c.pokja_id), lawan = c.jenis === 'pribadi' ? d().pengguna.find((u) => c.peserta.includes(u.id) && u.id !== sayaId()) : null;
  const ps = d().pesan.filter((p) => p.percakapan_id === c.id), akhir = ps[ps.length - 1];
  return { id: c.id, jenis: c.jenis, pokja_id: c.pokja_id, ref_tabel: c.ref_tabel || null, ref_id: c.ref_id || null, judul: c.jenis === 'pribadi' ? lawan?.nama || 'Pesan pribadi' : c.judul,
    lawan_id: lawan?.id || null, warna: k?.warna || null, warna_tint: k?.warna_tint || null, warna_teks: k?.warna_teks || null, terakhir_pada: c.terakhir_pada,
    terakhir: akhir ? { isi: akhir.dihapus ? null : akhir.isi.slice(0, 120), pengirim: akhir.pengirim_nama, waktu: akhir.dibuat_pada } : null,
    belum: ps.filter((p) => !p.dihapus && p.pengirim_id !== sayaId() && p.id > bacaSaya(c.id)).length };
}
const pendengarPesan = new Set();
const kabarPesan = (p) => pendengarPesan.forEach((f) => { try { f(p); } catch {} });
export async function daftarPercakapan() {
  await jeda(); siapkan(); butuhPeg(); pastikanKanal();
  const urut = { lintas: 1, pokja: 2, pribadi: 3, diskusi: 4 };
  return d().percakapan.filter((c) => cpTerlihat(c) && (c.jenis !== 'pokja' || I.idsPokja().includes(c.pokja_id) || (I.isSA() && !I.idsPokja().length))
    && (c.jenis !== 'diskusi' || d().pesan.some((p) => p.percakapan_id === c.id && p.pengirim_id === sayaId())))
    .sort((a, b) => urut[a.jenis] - urut[b.jenis] || String(b.terakhir_pada).localeCompare(String(a.terakhir_pada))).map(cpJson);
}
export async function jumlahPesanBelum() {
  await jeda(30); siapkan(); if (!I.isPeg()) return 0;
  return d().percakapan.filter((c) => ['pokja', 'lintas', 'pribadi'].includes(c.jenis) && cpTerlihat(c) && (c.jenis !== 'pokja' || I.idsPokja().includes(c.pokja_id))).reduce((s, c) => s + cpJson(c).belum, 0);
}
export async function bukaPribadi(uid) {
  await jeda(); siapkan(); butuhPeg();
  if (uid === sayaId()) throw g('Pilih pegawai lain.');
  if (!d().pengguna.some((u) => u.id === uid && u.aktif && u.jenis_akses === 'pegawai')) throw g('Pegawai tidak ditemukan atau nonaktif.');
  const peserta = [sayaId(), uid].sort();
  let c = d().percakapan.find((x) => x.jenis === 'pribadi' && x.peserta.join() === peserta.join());
  if (!c) { c = { id: I.uid(), jenis: 'pribadi', pokja_id: null, peserta, judul: null, dibuat_pada: I.sekarang(), terakhir_pada: I.sekarang() }; d().percakapan.push(c); I.simpan(); }
  return cpJson(c);
}
export async function bukaDiskusi(tabel, ref) {
  await jeda(); siapkan();
  let judul;
  if (tabel === 'usulan') { const u = d().usulan.find((x) => x.id === ref); if (!u || !I.usulanTerlihat(u)) throw g('Usulan tidak ditemukan.'); judul = `Diskusi ${u.no_register} — ${u.judul.slice(0, 60)}`; }
  else if (tabel === 'bnba') { const b = d().bnba.find((x) => x.id === ref); if (!b || !I.bnbaTerlihat(b)) throw g('Data PM tidak ditemukan.'); judul = 'Diskusi PM ' + b.nama; }
  else throw g('Diskusi hanya untuk usulan atau PM.');
  let c = d().percakapan.find((x) => x.jenis === 'diskusi' && x.ref_tabel === tabel && x.ref_id === String(ref));
  if (!c) { c = { id: I.uid(), jenis: 'diskusi', pokja_id: null, peserta: [], ref_tabel: tabel, ref_id: String(ref), judul, dibuat_pada: I.sekarang(), terakhir_pada: I.sekarang() }; d().percakapan.push(c); I.simpan(); }
  return cpJson(c);
}
export async function buatTopikLintas(judul) {
  await jeda(); siapkan();
  if (!(I.isSA() || I.diPokja('TU') || I.pokjaEf().some((e) => e.jabatan === 'kapokja'))) throw g('Topik koordinasi lintas-Pokja dibuat oleh Kapokja, Pokja TU, atau Super Admin.', '42501');
  if (!teks(judul) || teks(judul).length > 80) throw g('Judul topik 1–80 karakter.');
  const c = { id: I.uid(), jenis: 'lintas', pokja_id: null, peserta: [], judul: teks(judul), dibuat_pada: I.sekarang(), terakhir_pada: I.sekarang() }; d().percakapan.push(c); I.simpan(); return cpJson(c);
}
export async function pesanPercakapan(id, sebelum = null, batas = 50) {
  await jeda(); siapkan();
  const c = d().percakapan.find((x) => x.id === id); if (!cpTerlihat(c)) throw g('Percakapan tidak ditemukan.');
  const semua = d().pesan.filter((p) => p.percakapan_id === id && (!sebelum || p.id < sebelum));
  const ambil = semua.slice(-batas);
  return { percakapan: cpJson(c), pesan: ambil.map((p) => ({ ...I.salin(p), isi: p.dihapus ? null : p.isi, milik_saya: p.pengirim_id === sayaId() })), ada_lagi: semua.length > batas };
}
export async function kirimPesan(id, isi) {
  await jeda(60); siapkan();
  const c = d().percakapan.find((x) => x.id === id); if (!cpTerlihat(c)) throw g('Percakapan tidak ditemukan.');
  const v = String(isi || '').trim();
  if (!v) throw g('Pesan kosong.'); if (v.length > 2000) throw g('Pesan maksimal 2.000 karakter.');
  if (/(^|\D)\d{16}(\D|$)/.test(v)) throw g('Demi keamanan data, jangan kirim NIK atau No. KK lewat pesan. Sebutkan nama PM, atau bagikan tautan Detail PM.');
  let belumLawan = 0, lawan = null;
  if (c.jenis === 'pribadi') { lawan = c.peserta.find((u) => u !== sayaId()); belumLawan = d().pesan.filter((p) => p.percakapan_id === id && p.pengirim_id !== lawan && !p.dihapus && p.id > (d().baca34[id + ':' + lawan] || 0)).length; }
  const p = { id: ++d().seq_pesan, percakapan_id: id, pengirim_id: sayaId(), pengirim_nama: I.namaSaya(), isi: v, dihapus: false, dibuat_pada: I.sekarang() };
  d().pesan.push(p); c.terakhir_pada = p.dibuat_pada; d().baca34[id + ':' + sayaId()] = p.id;
  if (lawan && !belumLawan) beriTahu([lawan], 'PESAN_PRIBADI', 'Pesan baru dari ' + I.namaSaya(), v.slice(0, 140), '#/pesan?c=' + id);
  I.simpan(); setTimeout(() => kabarPesan(p), 0);
  return { ...I.salin(p), milik_saya: true };
}
export async function tandaiBacaPercakapan(id) {
  await jeda(20); siapkan();
  const ps = d().pesan.filter((p) => p.percakapan_id === id); if (!ps.length) return;
  d().baca34[id + ':' + sayaId()] = ps[ps.length - 1].id; I.simpan();
}
export async function hapusPesan(id) {
  await jeda(); siapkan();
  const p = d().pesan.find((x) => x.id === id && x.pengirim_id === sayaId()); if (!p) throw g('Hanya pengirim yang dapat menghapus pesannya.');
  p.dihapus = true; p.isi = '(pesan dihapus)'; I.simpan();
}
export async function kontakPesan(q = '') {
  await jeda(); siapkan(); butuhPeg();
  q = String(q).toLowerCase();
  return d().pengguna.filter((u) => u.aktif && u.jenis_akses === 'pegawai' && u.id !== sayaId() && (!q || u.nama.toLowerCase().includes(q))).slice(0, 40)
    .map((u) => ({ id: u.id, nama: u.nama, pokja: d().pengguna_pokja.filter((pp) => pp.pengguna_id === u.id).map((pp) => I.pokjaById(pp.pokja_id).nama_pendek).join(', ') }));
}

// =====================================================================================
// DOKUMENTASI PM
// =====================================================================================
export async function statusDokPm(bid) {
  await jeda(); siapkan();
  const b = d().bnba.find((x) => x.id === bid); if (!b || !I.bnbaTerlihat(b)) throw g('Data PM tidak ditemukan.');
  const u = d().usulan.find((x) => x.id === b.usulan_id);
  return { bnba_id: b.id, nama: b.nama, usulan_id: u?.id, no_register: u?.no_register, status_cair: statusCair(b.usulan_id), boleh_putuskan: I.isSA() || kapokjaDi(b.pokja_id),
    kategori: ['sebelum_usaha', 'saat_penyaluran', 'supermonev'].map((k) => ({ kode: k, label: LABEL_PM[k], maks: 2, boleh: bolehDokPm(b.pokja_id, k), opsional: k === 'supermonev',
      berkas: berkasDari('dok_pm', b.id).filter((x) => x.jenis === k), tanpa: I.salin(d().dok_tanpa.find((t) => t.bnba_id === b.id && t.kategori === k) || null) })) };
}
export async function dokPmUsulan(uid) {
  await jeda(); siapkan();
  const u = d().usulan.find((x) => x.id === uid); if (!u || !I.usulanTerlihat(u)) throw g('Usulan tidak ditemukan.');
  const n = (bid, k) => d().berkas.filter((x) => x.konteks === 'dok_pm' && x.ref_id === bid && x.jenis === k && !x.dihapus).length;
  return { status_cair: statusCair(uid), boleh: { sebelum_usaha: bolehDokPm(u.pokja_id, 'sebelum_usaha'), saat_penyaluran: bolehDokPm(u.pokja_id, 'saat_penyaluran') },
    boleh_putuskan: I.isSA() || kapokjaDi(u.pokja_id),
    pm: d().bnba.filter((b) => b.usulan_id === uid && I.bnbaTerlihat(b)).sort((a, b) => a.nama.localeCompare(b.nama)).map((b) => ({ bnba_id: b.id, nama: b.nama, nik: b.nik,
      sebelum_usaha: n(b.id, 'sebelum_usaha'), saat_penyaluran: n(b.id, 'saat_penyaluran'), supermonev: n(b.id, 'supermonev'),
      tanpa: Object.fromEntries(d().dok_tanpa.filter((t) => t.bnba_id === b.id).map((t) => [t.kategori, { id: t.id, status: t.status, alasan: t.alasan }])) })) };
}
export async function ajukanTanpaDok(bid, kat, alasan) {
  await jeda(); siapkan();
  const b = d().bnba.find((x) => x.id === bid); if (!b) throw g('Data PM tidak ditemukan.');
  if (!['sebelum_usaha', 'saat_penyaluran'].includes(kat)) throw g('Kategori tidak dikenal.');
  if (!bolehDokPm(b.pokja_id, kat)) throw g('Anda tidak berwenang untuk kategori ini.', '42501');
  if (!teks(alasan)) throw g('Alasan wajib diisi.');
  let t = d().dok_tanpa.find((x) => x.bnba_id === bid && x.kategori === kat);
  if (!t) { t = { id: I.uid(), bnba_id: bid, kategori: kat, dibuat_pada: I.sekarang() }; d().dok_tanpa.push(t); }
  Object.assign(t, { alasan: teks(alasan), status: 'menunggu', diajukan_oleh: sayaId(), diajukan_nama: I.namaSaya(), diputuskan_nama: null, diputuskan_pada: null, catatan: null });
  beriTahu(I.penerimaTahap(b.pokja_id, '2'), 'DOK_TANPA', 'Pengecualian dokumentasi PM menunggu persetujuan', `Pengajuan "Tidak ada dokumentasi" (${LABEL_PM[kat]}) untuk PM ${b.nama}.`, '#/pm/' + b.nik);
  I.simpan(); return I.salin(t);
}
export async function putuskanTanpaDok(id, setuju, catatan = null) {
  await jeda(); siapkan();
  const t = d().dok_tanpa.find((x) => x.id === id); if (!t) throw g('Pengajuan tidak ditemukan.');
  const b = d().bnba.find((x) => x.id === t.bnba_id);
  if (!(I.isSA() || kapokjaDi(b.pokja_id))) throw g('Hanya Kapokja pemilik usulan.', '42501');
  if (t.status !== 'menunggu') throw g('Pengajuan ini sudah diputuskan.');
  if (!setuju && !teks(catatan)) throw g('Catatan wajib diisi saat menolak.');
  Object.assign(t, { status: setuju ? 'disetujui' : 'ditolak', catatan: teks(catatan), diputuskan_nama: I.namaSaya(), diputuskan_pada: I.sekarang() });
  I.simpan(); return I.salin(t);
}

// ---------------------------------------------------------------- realtime tiruan (antar halaman di tab yang sama)
export function langgananTabel(tabel, cb) {
  const set = tabel === 'pesan' ? pendengarPesan : tabel === 'jadwal' ? pendengarJadwal : null;
  if (!set) return () => {};
  const f = (x) => cb(x || {}, 'INSERT');
  set.add(f);
  return () => set.delete(f);
}
/** Dipanggil adapter-pratinjau.init() setelah data dasar siap. */
export function siapkanT34() { try { siapkan(); } catch (e) { console.warn('Data contoh Tahap 3–4 gagal disiapkan:', e); } }
