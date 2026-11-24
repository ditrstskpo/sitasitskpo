// CONTOH. Instalasi baru: salin file ini menjadi js/config.js lalu isi nilainya.
// Upgrade: JANGAN timpa js/config.js milik Anda; file contoh ini tidak dipakai aplikasi.
// =====================================================================
// KONFIGURASI SITASI TSKPO
// Isi dua nilai di bawah dari Supabase → Project Settings → Data API / API Keys.
// Hanya kunci PUBLIK (anon / publishable). JANGAN PERNAH menaruh service_role
// atau secret key di sini: file ini terlihat oleh siapa pun di internet.
//
// Bila dua nilai ini dikosongkan, aplikasi berjalan dalam MODE PRATINJAU
// (data contoh di browser, tanpa basis data) untuk mengecek tampilan.
// =====================================================================
export const CONFIG = {
  SUPABASE_URL: '',          // contoh: 'https://abcdefghijkl.supabase.co'
  SUPABASE_ANON_KEY: '',     // contoh: 'eyJhbGciOi...' atau 'sb_publishable_...'

  // Alamat Web App Apps Script (berakhiran /exec) untuk berkas Google Drive, notifikasi WA/email,
  // dan migrasi dari Google Sheets. Boleh dikosongkan dulu; fitur lain tetap berjalan.
  GAS_URL: '',

  NAMA_APLIKASI: 'SITASI TSKPO',
  VERSI: '2.4.0 · Tahap 6',

  // Berkas aset resmi dari Direktorat (letakkan di folder assets/)
  LOGO: 'assets/logo-sitasi.png',
  FOTO_GEDUNG: 'assets/gedung-kemensos.jpg',
};
