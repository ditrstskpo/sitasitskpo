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
  SUPABASE_URL: 'https://uitjfvaocyhkqoegxqqo.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_79FUFa2tkCROiV4skA-H7A_CxvaA472',

  // Alamat Web App Apps Script (berakhiran /exec) untuk berkas Google Drive, notifikasi WA/email,
  // dan migrasi dari Google Sheets. Boleh dikosongkan dulu; fitur lain tetap berjalan.
  GAS_URL: 'https://script.google.com/macros/s/AKfycbycK-4p_vFD8n9NQaUUapodZTvC1CdhpYbVwLrJf5-Mu3ITrU9tLmsUg3pP80TFwMq3/exec',

  NAMA_APLIKASI: 'SITASI TSKPO',
  VERSI: '2.1.0 · Tahap 2',

  // Berkas aset resmi dari Direktorat (letakkan di folder assets/)
  LOGO: 'assets/logo-kemensos.png',
  FOTO_GEDUNG: 'assets/gedung-kemensos.jpg',
};
