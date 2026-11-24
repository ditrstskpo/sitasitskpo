// =====================================================================
// SITASI TSKPO — titik masuk aplikasi (router SPA berbasis hash).
// Halaman dimuat sesuai kebutuhan (lazy) dan dipra-muat saat menu diarahkan,
// sesi disimpan sementara agar tampilan muncul instan saat dimuat ulang.
// =====================================================================
import { api, siapkanApi, modePratinjau } from './core/api.js';
import { state, bus, simpanSesi, sesiTersimpan, bersihkanSemua, hapusCache } from './core/store.js';
import { bacaHash, html, raw } from './core/util.js';
import { toast, pasangRiak, pesanGalat, kotakGalat } from './core/ui.js';
import { ikon } from './core/icons.js';
import { modulDariRute, ruteBoleh } from './core/menu.js';
import * as P from './core/peran.js';
import { pergi } from './core/nav.js';
import { pantauJaringan, preconnect } from './core/jaringan.js';
import { CONFIG } from './config.js';

const root = document.getElementById('app');

const RUTE = {
  '/': { publik: true, judul: 'Portal Internal', muat: () => import('./pages/landing.js') },
  '/masuk': { publik: true, judul: 'Masuk', muat: () => import('./pages/masuk.js') },
  '/akses-ditolak': { publik: true, judul: 'Akses Ditolak', muat: () => import('./pages/akses-ditolak.js') },
  '/pilih-peran': { tanpaShell: true, judul: 'Pilih Peran', muat: () => import('./pages/pilih-peran.js'), izin: P.isSuperAdminAsli },
  '/beranda': { judul: 'Beranda', muat: () => import('./pages/beranda.js'), izin: P.isPegawai },
  '/notifikasi': { judul: 'Notifikasi', muat: () => import('./pages/notifikasi.js') },
  '/cari': { judul: 'Pencarian', muat: () => import('./pages/cari.js'), izin: P.isPegawai },
  '/pengaturan/pengguna': { judul: 'Pengguna & Hak Akses', muat: () => import('./pages/pengguna.js'), izin: P.isSuperAdmin },
  '/pengaturan/pokja': { judul: 'Pokja', muat: () => import('./pages/pokja.js'), izin: P.isSuperAdmin },
  '/pengaturan/pengumuman': { judul: 'Pengumuman', muat: () => import('./pages/pengumuman.js'), izin: P.bolehKelolaPengumuman },
  '/pengaturan/log-aktivitas': { judul: 'Log Aktivitas', muat: () => import('./pages/log-aktivitas.js'), izin: P.isSuperAdmin },
  '/pengaturan/notifikasi': { judul: 'Notifikasi WA & Email', muat: () => import('./pages/notif-pengaturan.js'), izin: P.isSuperAdmin },
  '/pengaturan/penyimpanan': { judul: 'Penyimpanan Berkas', muat: () => import('./pages/penyimpanan.js'), izin: P.isSuperAdmin },
  '/pengaturan/migrasi': { judul: 'Migrasi Data 2026', muat: () => import('./pages/migrasi.js'), izin: P.isSuperAdmin },
  // Tahap 2 — BNBA & alur pencairan
  '/workspace-bnba': { judul: 'Workspace BNBA Pokja', muat: () => import('./pages/ws-bnba.js'), izin: (s) => P.isSuperAdmin(s) || P.pokjaEfektif(s).length > 0 },
  '/workspace-bnba/usulan': { judul: 'Formulir Usulan BNBA', induk: '/workspace-bnba', muat: () => import('./pages/usulan-edit.js'), izin: (s) => P.isSuperAdmin(s) || P.pokjaEfektif(s).length > 0 },
  '/antrean-verifikasi': { judul: 'Antrean Verifikasi', muat: () => import('./pages/antrean.js'), izin: (s) => P.isSuperAdmin(s) || P.isKapokja(s) || P.diPokja(s, 'TU') },
  '/usulan-sk': { judul: 'Pengusulan SK', muat: () => import('./pages/pengusulan-sk.js'), izin: P.isPegawai },
  '/tata-usaha': { judul: 'Workspace Tata Usaha', muat: () => import('./pages/antrean-tahap.js'), izin: (s) => P.isSuperAdmin(s) || P.diPokja(s, 'TU') },
  '/keuangan': { judul: 'Workspace Keuangan', muat: () => import('./pages/antrean-tahap.js'), izin: (s) => P.isSuperAdmin(s) || P.diPokja(s, 'KEUANGAN') },
  '/keuangan/koreksi-rekap': { judul: 'Rekap SP2D & Koreksi', muat: () => import('./pages/rekap.js'), izin: (s) => P.isSuperAdmin(s) || P.diPokja(s, 'KEUANGAN') },
  '/rekap-pencairan': { judul: 'Rekap Data Pencairan', muat: () => import('./pages/rekap.js'), izin: P.isPegawai },
  '/master-bnba': { judul: 'Master BNBA', muat: () => import('./pages/master-bnba.js'), izin: P.isPegawai },
  '/rekonsiliasi': { judul: 'Rekonsiliasi Pencairan', muat: () => import('./pages/rekonsiliasi.js'), izin: P.isPegawai },
  // Tahap 3 — dashboard & data pendukung
  '/data-lks': { judul: 'Data LKS', muat: () => import('./pages/data-lks.js'), izin: P.isPegawai },
  '/input-lks': { judul: 'Input LKS', muat: () => import('./pages/input-lks.js'), izin: (s) => P.isSuperAdmin(s) || P.pokjaEfektif(s).length > 0 },
  '/data-aster': { judul: 'Data Aster', muat: () => import('./pages/data-aster.js'), izin: P.isPegawai },
  '/input-aster': { judul: 'Input Aster', muat: () => import('./pages/input-aster.js'), izin: (s) => P.isSuperAdmin(s) || P.diPokja(s, 'DATA') },
  '/data-kepegawaian': { judul: 'Data Kepegawaian', muat: () => import('./pages/kepegawaian.js'), izin: P.isPegawai },
  '/kelola-kepegawaian': { judul: 'Kepegawaian & OJT', muat: () => import('./pages/kelola-kepegawaian.js'), izin: (s) => P.isSuperAdmin(s) || P.diPokja(s, 'KEPEGAWAIAN') || P.diPokja(s, 'TU') },
  '/jadwal-pegawai': { judul: 'Jadwal Pegawai', muat: () => import('./pages/jadwal.js'), izin: P.isPegawai },
  '/rencana-kerja': { judul: 'Rencana Kerja Tahunan', muat: () => import('./pages/renja.js'), izin: P.isPegawai },
  // Tahap 4 — dokumen & koordinasi
  '/dokumen-pokja': { judul: 'Dokumen Pokja', muat: () => import('./pages/dok-pokja.js'), izin: (s) => P.isSuperAdmin(s) || P.pokjaEfektif(s).length > 0 },
  '/dokumen-bersama': { judul: 'Dokumen Bersama', muat: () => import('./pages/dok-bersama.js'), izin: P.isPegawai },
  '/produk-hukum': { judul: 'Produk Hukum & SOP', muat: () => import('./pages/hukum.js'), izin: P.isPegawai },
  '/tugas': { judul: 'Tugas & Penugasan', muat: () => import('./pages/tugas.js'), izin: P.isPegawai },
  '/pesan': { judul: 'Pesan & Komunikasi', muat: () => import('./pages/pesan.js'), izin: P.isPegawai },
  // Tahap 5 — Supermonev
  '/supermonev': { judul: 'Supermonev', muat: () => import('./pages/supermonev.js'), izin: (s) => P.isPetugas(s) || P.isPegawai(s) },
  '/penugasan-supermonev': { judul: 'Penugasan Petugas Supermonev', muat: () => import('./pages/penugasan.js'), izin: P.isPegawai },
  '/dashboard-supermonev': { judul: 'Dashboard Supermonev', muat: () => import('./pages/dash-supermonev.js'), izin: P.isPegawai },
  '/ekspor-supermonev': { judul: 'Ekspor PPTX & Laporan Supermonev', induk: '/dashboard-supermonev', muat: () => import('./pages/smv-ekspor.js'), izin: P.isPegawai },
  '/verifikasi-belanja': { judul: 'Verifikasi Belanja & BAST', muat: () => import('./pages/verif-belanja.js'), izin: (s) => P.isPetugas(s) || P.isPegawai(s) },
  // Tahap 6 — integrasi & penyempurnaan
  '/pengaturan/keamanan': { judul: 'Pemeriksaan Keamanan', muat: () => import('./pages/keamanan.js'), izin: P.isSuperAdmin },
  '/pengaturan/cadangan': { judul: 'Cadangan & Pemulihan', muat: () => import('./pages/cadangan.js'), izin: P.isSuperAdmin },
  '/bantuan': { judul: 'Pusat Bantuan & Pelatihan', muat: () => import('./pages/bantuan.js') },
};
// Rute berparameter: #/usulan/<id> dan #/pm/<nik>
const RUTE_PARAM = [
  { awal: '/usulan/', judul: 'Detail Usulan', induk: '/usulan-sk', muat: () => import('./pages/usulan-detail.js'), izin: P.isPegawai },
  { awal: '/pm/', judul: 'Detail PM', induk: '/master-bnba', muat: () => import('./pages/detail-pm.js'), izin: P.isPegawai },
];

function cariRute(path) {
  if (RUTE[path]) return RUTE[path];
  const rp = RUTE_PARAM.find((r) => path.startsWith(r.awal) && path.length > r.awal.length);
  if (rp) return { ...rp, param: decodeURIComponent(path.slice(rp.awal.length)) };
  const m = modulDariRute(path);
  if (m) return { judul: m.label, modul: m, muat: () => import('./pages/segera.js'), izin: (s) => ruteBoleh(s).has(path) };
  return null;
}
const prefetch = (path) => { try { cariRute(path)?.muat(); } catch {} };

// ---------------------------------------------------------------- sesi
async function muatSesi({ login = false } = {}) {
  const s = await api.sesiSaya(login);
  if (s.status === 'aktif') {
    simpanSesi(s);
    mulaiRealtime(s);
    return s;
  }
  if (s.status === 'tanpa_sesi') { bersihkanSemua(); return null; }
  // email belum terdaftar atau akun nonaktif → keluar dan tampilkan Akses Ditolak
  sessionStorage.setItem('sitasi:ditolak', JSON.stringify({ email: s.email || '', status: s.status, waktu: Date.now() }));
  try { await api.keluar({ catatLog: false }); } catch {}
  state.hentikanRealtime?.(); state.hentikanRealtime = null;
  bersihkanSemua();
  pergi('/akses-ditolak');
  return null;
}

async function pastikanSesi() {
  if (state.sesi) return state.sesi;
  if (!(await api.adaSesiAuth())) return null;
  return muatSesi();
}

async function mulaiRealtime(s) {
  if (state.realtimeUntuk === s.pengguna.id) return;
  state.hentikanRealtime?.();
  state.realtimeUntuk = s.pengguna.id;
  try {
    state.hentikanRealtime = await api.langganan({
      penggunaId: s.pengguna.id,
      onNotif: (n) => {
        state.notifBelum = (state.notifBelum || 0) + 1;
        bus.emit('notif-baru', n);
        toast(n.isi || '', 'info', n.judul);
      },
      onPengumuman: () => { hapusCache('pengumuman'); bus.emit('pengumuman'); },
      onUsulan: (id) => { hapusCache('usulan'); hapusCache('bnba'); hapusCache('rekap'); bus.emit('usulan-berubah', id); },
      onAkun: (baru) => {
        const lama = state.sesi?.pengguna;
        if (!lama) return;
        const berubah = baru.aktif === false || baru.diubah_pada !== lama.diubah_pada
          || JSON.stringify(baru.simulasi ?? null) !== JSON.stringify(lama.simulasi ?? null);
        if (berubah) muatSesi().then((x) => { if (x) { hapusCache(); toast('Peran atau akses akun Anda diperbarui.', 'info'); pergi(P.halamanAwal(x)); } }).catch(() => {});
      },
    });
  } catch { state.realtimeUntuk = null; }
}

// ---------------------------------------------------------------- router
let navKe = 0, shell = null, bersihkan = null;

async function navigasi() {
  const id = ++navKe;
  const { path, query } = bacaHash();
  const r = cariRute(path);
  if (!r) return location.replace('#' + (state.sesi ? P.halamanAwal(state.sesi) : '/'));

  let s = state.sesi;
  if (!r.publik) {
    if (!s) {
      try { s = await pastikanSesi(); } catch (e) { return tampilGalatFatal(e); }
      if (id !== navKe) return;
    }
    if (!s) return location.replace('#/masuk');
    if (r.izin && !r.izin(s)) {
      toast('Halaman ini tidak tersedia untuk peran Anda saat ini.', 'peringatan');
      return location.replace('#' + P.halamanAwal(s));
    }
  } else if ((path === '/' || path === '/masuk') && s) {
    return location.replace('#' + P.halamanAwal(s));
  }

  let mod;
  try { mod = await r.muat(); } catch (e) { return tampilGalatFatal(e); }
  if (id !== navKe) return;

  try { bersihkan?.(); } catch {}
  bersihkan = null;
  const ctx = { path, query, param: r.param, sesi: s, rute: r, segarkanSesi: () => muatSesi() };

  if (r.publik || r.tanpaShell) {
    if (shell) { shell.lepas(); shell = null; }
    const wadah = document.createElement('div');
    root.replaceChildren(wadah);
    document.body.classList.toggle('halaman-publik', true);
    bersihkan = await mod.render(wadah, ctx);
  } else {
    if (!shell) {
      const m = await import('./shell.js');
      if (id !== navKe) return;
      shell = m.pasang(root, { prefetch });
      // muat referensi Pokja di latar agar filter halaman berikutnya tampil seketika
      setTimeout(() => import('./core/komp.js').then((k) => k.pokjaCepat()).catch(() => {}), 300);
    }
    document.body.classList.toggle('halaman-publik', false);
    shell.setAktif(r.induk || path);
    const wadah = shell.kontenBaru();
    window.scrollTo({ top: 0 });
    bersihkan = await mod.render(wadah, ctx);
  }
  document.title = `${r.judul || 'SITASI TSKPO'} · SITASI TSKPO`;
}

function tampilGalatFatal(e) {
  console.error(e);
  const pesan = pesanGalat(e);
  root.innerHTML = String(html`<div class="pub"><div class="pub-kartu sempit" style="margin:auto"><div class="pub-tengah">
    <span class="ubin merah" style="width:64px;height:64px;border-radius:20px">${raw(ikon('alert', 30))}</span>
    <h1 style="font-size:1.5rem">Aplikasi belum dapat dimuat</h1><p>${pesan}</p>
    <button type="button" class="btn btn-primary" onclick="location.reload()">${raw(ikon('refresh', 18))} Muat ulang</button></div></div></div>`);
}

// ---------------------------------------------------------------- mulai
async function mulai() {
  pasangRiak();
  preconnect([CONFIG.SUPABASE_URL, CONFIG.GAS_URL, CONFIG.GAS_URL && 'https://script.googleusercontent.com']);
  pantauJaringan((online) => toast(online ? 'Koneksi internet kembali tersambung.' : 'Anda sedang offline. Data yang tampil berasal dari cache.', online ? 'sukses' : 'peringatan'));
  document.addEventListener('visibilitychange', () => {
    document.documentElement.classList.toggle('jeda', document.hidden);
    // cek ulang status akun bila tab kembali dibuka setelah lebih dari 2 menit
    if (!document.hidden && state.sesi && Date.now() - state.sesiDicek > 120_000) muatSesi().catch(() => {});
  });

  const prm = new URLSearchParams(location.search);
  const kembali = prm.has('code') || prm.has('error') || prm.has('pratinjau');
  const galatOAuth = prm.get('error_description') || prm.get('error');

  // tampilkan dari sesi tersimpan lebih dulu (instan), lalu validasi ulang
  const tersimpan = !kembali ? sesiTersimpan() : null;
  if (tersimpan) { state.sesi = tersimpan; state.notifBelum = tersimpan.notif_belum_dibaca || 0; }

  try { await siapkanApi(); } catch (e) { return tampilGalatFatal(e); }

  if (kembali) history.replaceState(null, '', location.pathname + location.hash);
  if (galatOAuth) {
    sessionStorage.removeItem('sitasi:baru-login');
    toast(galatOAuth.replace(/\+/g, ' '), 'galat', 'Gagal masuk dengan Google');
    location.hash = '#/masuk';
  }

  if (sessionStorage.getItem('sitasi:baru-login') === '1') {
    sessionStorage.removeItem('sitasi:baru-login');
    try {
      const s = (await api.adaSesiAuth()) ? await muatSesi({ login: true }) : null;
      if (s) {
        location.hash = P.isSuperAdminAsli(s) ? '#/pilih-peran' : '#' + P.halamanAwal(s);
        toast(`Selamat datang, ${s.pengguna.nama}.`, 'sukses');
      }
    } catch (e) { toast(pesanGalat(e), 'galat'); }
  } else if (tersimpan) {
    muatSesi().catch(() => {});
  } else if (!location.hash || location.hash === '#/' || location.hash === '#/masuk') {
    // sudah pernah masuk di tab lain? langsung ke halaman kerja
    api.adaSesiAuth().then((ada) => ada && muatSesi().then((s) => s && pergi(P.halamanAwal(s)))).catch(() => {});
  }

  window.addEventListener('hashchange', navigasi);
  await navigasi();

  // pra-muat halaman yang paling sering dibuka saat browser senggang
  const senggang = window.requestIdleCallback || ((f) => setTimeout(f, 1200));
  senggang(() => ['/beranda', '/notifikasi', '/rekonsiliasi', '/master-bnba', '/usulan-sk'].forEach(prefetch));
  if (modePratinjau) console.info('SITASI TSKPO berjalan dalam MODE PRATINJAU (js/config.js belum diisi).');
}

mulai();
