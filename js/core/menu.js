// Struktur menu (PRD 5.1). "tahap" = tahap pembangunan modul (PRD 8).
// Modul yang belum dibangun tampil sebagai halaman "segera" berisi rencananya.
import * as P from './peran.js';

export const TAHAP = {
  1: 'Fondasi', 2: 'BNBA dan Alur Pencairan', 3: 'Dashboard dan Data Pendukung',
  4: 'Dokumen dan Koordinasi', 5: 'Supermonev', 6: 'Integrasi dan Penyempurnaan',
};

// id → definisi. "ket" = poin rencana isi modul untuk halaman "segera".
export const MODUL = {
  beranda: { label: 'Beranda / Dashboard', ikon: 'dashboard', rute: '/beranda', judul: ['Beranda / Dashboard', 'Realisasi Bantuan'] },
  rekonsiliasi: { label: 'Rekonsiliasi Pencairan', ikon: 'rekon', rute: '/rekonsiliasi', judul: ['Rekonsiliasi', 'Pencairan Bantuan ATENSI'],
    ket: ['Posisi tahap aktif setiap usulan (1–11) beserta PIC dan tanggal', 'Diagram alur 11 tahap per usulan', 'Tombol "Unduh Excel Semua Bundle" sesuai filter'] },
  rekap: { label: 'Rekap Data Pencairan', ikon: 'rekap', rute: '/rekap-pencairan', judul: ['Rekap Data Pencairan', '(DATA ATENSI)'],
    ket: ['Format sesuai 2026-DATA ATENSI RSTSKPO.xlsx, terisi otomatis dari BNBA', 'Koreksi oleh Pokja Keuangan dengan nilai asli tetap tersimpan', 'Rekap per jenis bantuan, provinsi, kab/kota, dan bulan SP2D'] },
  master: { label: 'Master BNBA', ikon: 'database', rute: '/master-bnba', judul: ['Master BNBA', '(Basis Data Tunggal Penerima Manfaat)'],
    ket: ['BNBA lintas Pokja dengan NIK sebagai kunci tunggal', 'Data sensitif tersamar sesuai hak akses', 'Detail PM per NIK: BNBA, Usulan & SK, Pencairan, Dokumentasi, Supermonev, Riwayat'] },
  dashSupermonev: { label: 'Dashboard Supermonev', ikon: 'chart', rute: '/dashboard-supermonev', judul: ['Dashboard Supermonev', '— Evaluasi Hasil Pascapenyaluran'],
    ket: ['Ringkasan status hasil evaluasi lapangan', 'Ringkasan kendala dan grafik distribusi', 'Ekspor PPTX (2 slide per PM) dan Excel'] },
  lks: { label: 'Data LKS', ikon: 'lks', rute: '/data-lks', judul: ['Data LKS', 'TSKPO'],
    ket: ['Peta Indonesia 38 provinsi dengan jumlah LKS per provinsi', 'Formulir LKS untuk semua Pokja, verifikasi oleh Pokja Data atau TU', 'Unduhan dengan filter wilayah, klaster, akreditasi'] },
  aster: { label: 'Data Aster', ikon: 'aster', rute: '/data-aster', judul: ['Data Aster', '— Asesmen Lapangan Terintegrasi'],
    ket: ['26 kolom sesuai FORMAT ASTER.xlsx', 'Peta sebaran Pendamping Lapangan per provinsi', 'Unduhan dengan filter batch, wilayah, status'] },
  kepegawaian: { label: 'Data Kepegawaian', ikon: 'pegawai', rute: '/data-kepegawaian', judul: ['Data Kepegawaian', '& SDM Pendamping'],
    ket: ['Pegawai Direktorat di kantor pusat', 'SDM pendamping lapangan per provinsi', 'OJT bulan berjalan'] },
  jadwal: { label: 'Jadwal Pegawai', ikon: 'jadwal', rute: '/jadwal-pegawai', judul: ['Jadwal Pegawai', '(Kantor Pusat)'],
    ket: ['Kisi bulanan Perjadin, Fullday, Fullboard (Sabtu–Minggu tetap bisa diisi)', 'Warna sama untuk kegiatan yang sama di hari yang sama', 'Rekap per pegawai otomatis dan realtime'] },
  dokBersama: { label: 'Dokumen Bersama', ikon: 'folder', rute: '/dokumen-bersama', judul: ['Dokumen Bersama', '— Repositori Terpadu'],
    ket: ['Satu pilihan Kategori: SK ATENSI, SK Kegiatan, SK, SOP, Perpres, KAK, Bahan Paparan, Dokumentasi Kegiatan, Lainnya', 'Terbit setelah diverifikasi Pokja TU', 'Berkas tersimpan di Google Drive Super Admin, diunduh lewat web'] },
  burekolBank: { label: 'Burekol — Petugas Bank', pendek: 'Burekol', ikon: 'landmark', rute: '/burekol-bank', judul: ['Burekol', '— Petugas Bank'],
    ket: ['Daftar SK bundle yang menunggu tindak lanjut bank', 'Isi nomor rekening per PM atau kirim koreksi NIK/nama', 'Setelah semua selesai, kirim kembali ke Keuangan untuk SP2D'] },
  pesan: { label: 'Pesan & Komunikasi', ikon: 'pesan', rute: '/pesan', judul: ['Pesan & Komunikasi', 'Internal'],
    ket: ['Chat Pokja, Koordinasi Lintas-Pokja, Pesan Pribadi', 'Diskusi pada record BNBA dan usulan', 'Bukan pengganti pencatatan resmi'] },

  // ---- Workspace
  wsBnba: { label: 'Workspace BNBA Pokja', ikon: 'briefcase', rute: '/workspace-bnba', judul: ['Workspace BNBA', 'Pokja'],
    ket: ['Usulan berjudul berisi BNBA per PM (40 kolom) dan link profil asesmen', 'Draft, submit ke Kapokja, perbaiki pada record yang sama', 'Impor Excel sesuai template BNBA PENGAJUAN'] },
  antrean: { label: 'Antrean Verifikasi', ikon: 'inbox', rute: '/antrean-verifikasi', judul: ['Antrean Verifikasi', 'Kapokja'],
    ket: ['Kapokja memverifikasi usulan BNBA Pokja-nya (Setujui / Kembalikan)', 'Kapokja Data atau Kapokja TU memverifikasi LKS', 'Notifikasi in-app saat ada usulan baru'] },
  usulanSk: { label: 'Usulan & SK Pokja', ikon: 'file-check', rute: '/usulan-sk', judul: ['Pengusulan SK', '— Monitoring Penerbitan SK'],
    ket: ['Daftar usulan beserta posisi tahap 3–11', 'Draft SK dan Nota Dinas, status TU, Direktur, Sekretariat', 'Tombol "Unduh Excel Bundle Ini" di detail usulan'] },
  dokPokja: { label: 'Dokumen Pokja', ikon: 'folder', rute: '/dokumen-pokja', judul: ['Dokumen Pokja', '— Repositori'],
    ket: ['Folder bawaan SK, KAK, File Kegiatan; Pokja dapat menambah folder', 'Ajukan publikasi ke Dokumen Bersama dengan memilih kategori'] },
  inputLks: { label: 'Input LKS', ikon: 'lks', rute: '/input-lks', judul: ['Input LKS', 'Baru'],
    ket: ['Formulir LKS sederhana berdasarkan FORMAT LKS.xlsx', 'Semua Pokja dapat menginput; verifikasi Kapokja Data atau Kapokja TU'] },
  tu: { label: 'Workspace Tata Usaha', ikon: 'clipboard-check', rute: '/tata-usaha', judul: ['Workspace Tata Usaha', '— Tahap 4a–4c & 6'],
    ket: ['Verifikasi SK (4a), pencatatan TTD Direktur (4b) dan Sekretariat (4c)', 'Jadwal, OJT, tugas, dan verifikasi publikasi dokumen'] },
  keuangan: { label: 'Workspace Keuangan', ikon: 'wallet', rute: '/keuangan', judul: ['Workspace Keuangan', '— Tahap 5 & 7–11'],
    ket: ['Data Pencairan, SK Final, Burekol, SP2D, Administrasi SI, SI, Pencairan', 'Mengisi tahap Keuangan untuk usulan semua Pokja', 'Koreksi Rekap Data Pencairan'] },
  keuKoreksi: { label: 'Rekap SP2D & Koreksi', ikon: 'banknote', rute: '/keuangan/koreksi-rekap', judul: ['Rekap SP2D', '& Koreksi Data Rekap Pencairan'] },
  inputAster: { label: 'Input Aster', ikon: 'aster', rute: '/input-aster', judul: ['Input Aster', 'Baru'],
    ket: ['Formulir 26 kolom sesuai FORMAT ASTER.xlsx', 'Diverifikasi Kapokja Data'] },
  sdm: { label: 'Kepegawaian & OJT', ikon: 'users', rute: '/kelola-kepegawaian', judul: ['Kepegawaian', '& OJT'],
    ket: ['Kelola data SDM pendamping dan OJT'] },
  renja: { label: 'Rencana Kerja Tahunan', ikon: 'target', rute: '/rencana-kerja', judul: ['Rencana Kerja', 'Tahunan'],
    ket: ['Pokja mengajukan rencana kerja tahunan', 'Diverifikasi Pokja Perencanaan'] },
  tugas: { label: 'Tugas & Penugasan', ikon: 'tugas', rute: '/tugas', judul: ['Tugas', '& Penugasan'] },
  hukum: { label: 'Produk Hukum & SOP', ikon: 'scale', rute: '/produk-hukum', judul: ['Produk Hukum', '& SOP'],
    ket: ['Kelola produk hukum dan SOP Direktorat'] },
  supermonev: { label: 'Supermonev (Formulir & Verifikasi)', pendek: 'Supermonev', ikon: 'clipboard-list', rute: '/supermonev', judul: ['Supermonev', '— Formulir & Verifikasi'],
    ket: ['Jadwal monitoring otomatis 3 bulan setelah pencairan', 'Penilaian otomatis: Berhasil, Berhasil dengan Catatan, Perlu Pendampingan, Tidak Berhasil', 'Verifikasi oleh Kapokja Supermonev'] },
  penugasan: { label: 'Penugasan Petugas', ikon: 'user-check', rute: '/penugasan-supermonev', judul: ['Penugasan Petugas', 'Supermonev'],
    ket: ['Kapokja Supermonev dan Kapokja TU menugaskan petugas per periode', 'Petugas hanya melihat PM yang ditugaskan kepadanya'] },
  verifBelanja: { label: 'Verifikasi Belanja & BAST', pendek: 'Belanja & BAST', ikon: 'receipt', rute: '/verifikasi-belanja', judul: ['Verifikasi Belanja', '& BAST'],
    ket: ['Unggah bukti belanja, BAST, dan daftar inventaris per PM', 'Diverifikasi Kapokja Supermonev'] },

  // ---- Pengaturan (Super Admin) dan pengumuman (Super Admin + TU)
  pengguna: { label: 'Pengguna & Hak Akses', ikon: 'user-cog', rute: '/pengaturan/pengguna', judul: ['Pengguna', '& Hak Akses'] },
  pokja: { label: 'Pokja & Keanggotaan', ikon: 'network', rute: '/pengaturan/pokja', judul: ['Pokja', '& Keanggotaan'] },
  pengumuman: { label: 'Kelola Pengumuman', ikon: 'megaphone', rute: '/pengaturan/pengumuman', judul: ['Kelola Pengumuman', 'Direktorat'] },
  notif: { label: 'Notifikasi WA & Email', ikon: 'send', rute: '/pengaturan/notifikasi', judul: ['Notifikasi', 'WhatsApp & Email'] },
  migrasi: { label: 'Migrasi Data 2026', ikon: 'upload', rute: '/pengaturan/migrasi', judul: ['Migrasi Data', '2026'] },
  log: { label: 'Log Aktivitas', ikon: 'history', rute: '/pengaturan/log-aktivitas', judul: ['Log Aktivitas', '& Audit'] },
  keamanan: { label: 'Pemeriksaan Keamanan', ikon: 'shield', rute: '/pengaturan/keamanan', judul: ['Pemeriksaan Keamanan', '& Kesehatan Sistem'] },
  cadangan: { label: 'Cadangan & Pemulihan', ikon: 'database-backup', rute: '/pengaturan/cadangan', judul: ['Cadangan', '& Pemulihan Data'] },
  bantuan: { label: 'Pusat Bantuan & Pelatihan', pendek: 'Bantuan', ikon: 'life-buoy', rute: '/bantuan', judul: ['Pusat Bantuan', '& Pelatihan'] },
  penyimpanan: { label: 'Penyimpanan Berkas', ikon: 'hard-drive', rute: '/pengaturan/penyimpanan', judul: ['Penyimpanan Berkas', '(Google Drive)'],
    ket: ['Tujuan penyimpanan aktif: Drive Super Admin 1 atau 2', 'Tombol "Alihkan Penyimpanan" dan "Hubungkan Drive Saya"', 'Struktur folder "SITASI TSKPO" dibuat otomatis'] },
};

for (const [id, m] of Object.entries(MODUL)) m.id = id;
export const modulDariRute = (path) => Object.values(MODUL).find((m) => m.rute === path);

const BERSAMA = ['beranda', 'rekonsiliasi', 'rekap', 'master', 'dashSupermonev', 'lks', 'aster', 'kepegawaian', 'jadwal', 'dokBersama', 'pesan'];

/** Daftar grup menu sesuai peran efektif. */
export function grupMenu(s) {
  if (P.isBank(s)) return [{ judul: 'Petugas Bank', item: ['burekolBank', 'bantuan'].map((k) => MODUL[k]) }];
  if (P.isPetugas(s)) return [{ judul: 'Supermonev Lapangan', item: ['supermonev', 'verifBelanja', 'bantuan'].map((k) => MODUL[k]) }];
  const grup = [{ judul: 'Menu Bersama', item: BERSAMA.map((k) => MODUL[k]) }];

  const ws = [];
  const tambah = (...k) => k.forEach((x) => { if (!ws.includes(x)) ws.push(x); });
  if (P.pokjaEfektif(s).length) {
    tambah('wsBnba');
    if (P.isKapokja(s) || P.diPokja(s, 'TU')) tambah('antrean');
    tambah('usulanSk', 'dokPokja', 'inputLks', 'renja');
  }
  if (P.diPokja(s, 'TU')) tambah('tu', 'pengumuman', 'sdm', 'verifBelanja');
  if (P.diPokja(s, 'KEUANGAN')) tambah('keuangan', 'keuKoreksi');
  if (P.diPokja(s, 'DATA')) tambah('inputAster');
  if (P.diPokja(s, 'KEPEGAWAIAN')) tambah('sdm');
  if (P.diPokja(s, 'HUKUM')) tambah('hukum');
  if (P.diPokja(s, 'SUPERMONEV') || P.jugaSupermonev(s)) tambah('supermonev', 'verifBelanja');
  if (P.diPokja(s, 'SUPERMONEV', 'kapokja') || P.diPokja(s, 'TU', 'kapokja')) tambah('penugasan');
  if (P.isPegawai(s) && !P.isSuperAdmin(s)) tambah('tugas');
  if (ws.length) grup.push({ judul: 'Workspace Saya' + (P.labelPokjaSaya(s) ? ` (${P.labelPokjaSaya(s)})` : ''), item: ws.map((k) => MODUL[k]) });

  // Super Admin (tanpa simulasi) menjalankan semua tahap: tampilkan menu kerja agar tidak perlu simulasi peran
  if (P.isSuperAdmin(s) && !P.pokjaEfektif(s).length) {
    grup.push({ judul: 'Alur Usulan & Pencairan', item: ['wsBnba', 'antrean', 'usulanSk', 'tu', 'keuangan', 'keuKoreksi'].map((k) => MODUL[k]) });
    grup.push({ judul: 'Data, Dokumen & Koordinasi', item: ['inputLks', 'inputAster', 'sdm', 'renja', 'dokPokja', 'hukum', 'tugas'].map((k) => MODUL[k]) });
    grup.push({ judul: 'Supermonev', item: ['supermonev', 'penugasan', 'verifBelanja'].map((k) => MODUL[k]) });
  }
  if (P.isSuperAdmin(s)) grup.push({ judul: 'Pengaturan', item: ['pengguna', 'pokja', 'pengumuman', 'notif', 'migrasi', 'log', 'penyimpanan', 'keamanan', 'cadangan'].map((k) => MODUL[k]) });
  grup.push({ judul: 'Bantuan', item: [MODUL.bantuan] });
  return grup;
}

/** Semua rute modul yang boleh dibuka peran ini (untuk penjaga rute). */
export const ruteBoleh = (s) => new Set(grupMenu(s).flatMap((g) => g.item.map((m) => m.rute)));

/** Menu navigasi bawah (ponsel): 4 menu utama + "Lainnya". */
export function menuBawah(s) {
  if (P.isBank(s)) return [MODUL.burekolBank, MODUL.bantuan];
  if (P.isPetugas(s)) return [MODUL.supermonev, MODUL.verifBelanja, MODUL.bantuan];
  const pilihan = [MODUL.beranda, MODUL.rekonsiliasi, MODUL.master];
  pilihan.push(P.isSuperAdmin(s) ? MODUL.pengguna : MODUL.pesan);
  return pilihan;
}
