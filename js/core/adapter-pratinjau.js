// Adapter MODE PRATINJAU: data contoh di browser (sessionStorage), tanpa server.
// Meniru aturan basis data Tahap 1 (peran, simulasi, maks 2 Super Admin, audit)
// agar tampilan dan alur bisa dicoba sebelum Supabase dipasang.
// Semua nama selain akun awal PRD adalah FIKTIF.
import { tunggu } from './util.js';
import { barisEkspor, jenisDariKategori, totalRincian, kolomKurang } from './bnba.js';
/** Ringkasan teks rincian barang (cermin app.hitung_rincian): "Beras (10 kg); Telur (2 kg)". */
const ringkasRincian = (items) => items.map((i) => `${i.nama} (${String(i.jumlah || '') || '1'}${i.satuan ? ' ' + i.satuan : ''})`).join('; ');
import { unggahKonteksP, hapusBerkasKonteksP, berkasTerlihatP, fotoContoh, siapkanT34 } from './pratinjau-t34.js';
import { siapkanT56 } from './pratinjau-t56.js';

const KUNCI_DB = 'sitasi:pratinjau-db';
const KUNCI_AUTH = 'sitasi:pratinjau-auth';
let db;

const POKJA = [
  ['KPO_PMBS', 'KPO dan PMBS', 'KPO dan PMBS', 'teknis', 1, '#17824A', '#DDF1E8', '#0E5530'],
  ['GEPENGLUNG', 'Gepenglung', 'Gepenglung', 'teknis', 2, '#E7B416', '#FBF0CC', '#6B4E08'],
  ['BWBP', 'BWBP dan Eks Napiter', 'BWBP dan Eks Napiter', 'teknis', 3, '#2A4B8D', '#E6ECF7', '#1F3C73'],
  ['KTK_WTS', 'KTK dan WTS', 'KTK dan WTS', 'teknis', 4, '#D9644A', '#FCE4DE', '#8E3422'],
  ['TU', 'Tata Usaha (TU)', 'TU', 'pendukung', 5, '#12A5A0', '#D9F0EF', '#0B6E6B'],
  ['KEUANGAN', 'Keuangan', 'Keuangan', 'pendukung', 6, '#E58A2E', '#FCE9D6', '#8A4A0B'],
  ['PERENCANAAN', 'Perencanaan', 'Perencanaan', 'pendukung', 7, '#4FA8E0', '#E0F1FA', '#1F6A99'],
  ['KEPEGAWAIAN', 'Kepegawaian', 'Kepegawaian', 'pendukung', 8, '#C2477F', '#F8E3EE', '#8A2A58'],
  ['HUKUM', 'Hukum', 'Hukum', 'pendukung', 9, '#7B5EC2', '#ECE9F7', '#4F3A8C'],
  ['SUPERMONEV', 'Supermonev', 'Supermonev', 'pendukung', 10, '#8C6A3E', '#F3E8DA', '#5E4423'],
  ['DATA', 'Data', 'Data', 'pendukung', 11, '#5B6B7F', '#E8ECF1', '#3A4656'],
].map(([kode, nama, nama_pendek, kelompok, urutan, warna, warna_tint, warna_teks]) =>
  ({ id: 'pk-' + kode, kode, nama, nama_pendek, kelompok, urutan, warna, warna_tint, warna_teks, aktif: true }));

// [email, nama, jenis, peran_sistem, aktif, [[kodePokja, jabatan]...]]
const AKUN = [
  ['asterpokjadata@gmail.com', 'Super Admin SITASI', 'pegawai', 'super_admin', true, []],
  ['muhni2806@gmail.com', 'Kapokja TU', 'pegawai', null, true, [['TU', 'kapokja']]],
  ['viniciherla@gmail.com', 'Anggota Pokja TU', 'pegawai', null, true, [['TU', 'anggota']]],
  ['dhenyindahniati@gmail.com', 'Kapokja Supermonev', 'pegawai', null, true, [['SUPERMONEV', 'kapokja']]],
  ['ardevia28@gmail.com', 'Kapokja Kepegawaian', 'pegawai', null, true, [['KEPEGAWAIAN', 'kapokja']]],
  ['direktur@contoh.id', 'Direktur RSTSKPO (contoh)', 'pegawai', 'direktur', true, []],
  ['sari.handayani@contoh.id', 'Sari Handayani', 'pegawai', null, true, [['KPO_PMBS', 'kapokja']]],
  ['bambang.wijaya@contoh.id', 'Bambang Wijaya', 'pegawai', null, true, [['KPO_PMBS', 'anggota']]],
  ['fitri.rahmawati@contoh.id', 'Fitri Rahmawati', 'pegawai', null, true, [['GEPENGLUNG', 'kapokja']]],
  ['yusuf.hidayat@contoh.id', 'Yusuf Hidayat', 'pegawai', null, true, [['KEUANGAN', 'kapokja']]],
  ['nur.aini@contoh.id', 'Nur Aini', 'pegawai', null, true, [['KEUANGAN', 'anggota'], ['DATA', 'anggota']]],
  ['hendra.saputra@contoh.id', 'Hendra Saputra', 'pegawai', null, true, [['DATA', 'kapokja']]],
  ['maya.puspita@contoh.id', 'Maya Puspita', 'pegawai', null, true, [['BWBP', 'anggota']]],
  ['petugas.lapangan@contoh.id', 'Petugas Lapangan (contoh)', 'petugas_supermonev', null, true, []],
  ['pindah.tugas@contoh.id', 'Pegawai Pindah Tugas', 'pegawai', null, false, []],
  ['petugas.bank@contoh.id', 'Petugas Bank (contoh)', 'petugas_bank', null, true, []],
  ['dual.smv@contoh.id', 'Pegawai + Supermonev (contoh)', 'pegawai', null, true, [['DATA', 'anggota']]],
];

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2));
const sekarang = () => new Date().toISOString();
const salin = (x) => JSON.parse(JSON.stringify(x));
const galat = (pesan, code = 'P0001') => Object.assign(new Error(pesan), { code });

function benih() {
  const t = Date.now();
  const pengguna = AKUN.map(([email, nama, jenis_akses, peran_sistem, aktif], i) => ({
    id: 'pg-' + (i + 1), email, nama, nip: null, no_hp: null, jenis_akses, peran_sistem, juga_supermonev: email === 'dual.smv@contoh.id',
    super_admin_slot: peran_sistem === 'super_admin' ? 1 : null, aktif, simulasi: null, catatan: null,
    auth_id: i > 5 && i < 13 ? 'tertaut' : null,
    login_terakhir: i > 5 && i < 13 ? new Date(t - i * 3.6e6 * 7).toISOString() : null,
    dibuat_pada: new Date(t - 864e5 * 3).toISOString(),
  }));
  const pengguna_pokja = [];
  AKUN.forEach(([, , , , , pk], i) => pk.forEach(([kode, jabatan]) =>
    pengguna_pokja.push({ pengguna_id: 'pg-' + (i + 1), pokja_id: 'pk-' + kode, jabatan })));
  return {
    pokja: POKJA, pengguna, pengguna_pokja, notifikasi: [], audit_log: [], urut_log: 0,
    pengumuman: [{
      id: uid(), judul: 'Pengumuman Dit. RSTSKPO', tingkat: 'info', sasaran: 'semua', aktif: true, mulai: null, selesai: null,
      isi: 'Mode pratinjau: data di halaman ini adalah contoh dan hanya tersimpan di browser Anda.',
      dibuat_pada: sekarang(), diubah_pada: sekarang(),
    }],
  };
}

const simpan = () => { try { sessionStorage.setItem(KUNCI_DB, JSON.stringify(db)); } catch {} };
const auth = () => { try { return JSON.parse(sessionStorage.getItem(KUNCI_AUTH) || 'null'); } catch { return null; } };

export async function init() {
  try { db = JSON.parse(sessionStorage.getItem(KUNCI_DB) || 'null'); } catch { db = null; }
  if (!db || !db.pokja) { db = benih(); simpan(); }
  if (!db.usulan) { benihT2(); simpan(); }
  siapkanT34();
  siapkanT56();
}

// ---------------------------------------------------------------- pembantu peran (meniru schema app)
const pokjaById = (id) => db.pokja.find((p) => p.id === id);
const saya = () => { const a = auth(); return a ? db.pengguna.find((p) => p.email === a.email) || null : null; };
const sayaAktif = () => { const p = saya(); return p && p.aktif ? p : null; };
function peran(p = sayaAktif()) {
  if (!p) return null;
  if (p.jenis_akses === 'petugas_supermonev') return 'petugas_supermonev';
  if (p.jenis_akses === 'petugas_bank') return 'petugas_bank';
  if (p.peran_sistem === 'super_admin' && p.simulasi) return ['direktur', 'petugas_supermonev'].includes(p.simulasi.peran) ? p.simulasi.peran : 'pegawai';
  return p.peran_sistem || 'pegawai';
}
function pokjaEf(p = sayaAktif()) {
  if (!p) return [];
  if (p.peran_sistem === 'super_admin' && p.simulasi) {
    return ['kapokja', 'anggota'].includes(p.simulasi.peran) ? [{ pokja_id: p.simulasi.pokja_id, jabatan: p.simulasi.peran }] : [];
  }
  if (p.jenis_akses !== 'pegawai') return [];
  return db.pengguna_pokja.filter((x) => x.pengguna_id === p.id).map((x) => ({ pokja_id: x.pokja_id, jabatan: x.jabatan }));
}
const isSA = () => peran() === 'super_admin';
const diPokja = (kode) => pokjaEf().some((e) => pokjaById(e.pokja_id)?.kode === kode);
const bolehPengumuman = () => isSA() || diPokja('TU');
function label(p = sayaAktif()) {
  if (!p) return 'Sistem';
  if (p.jenis_akses === 'petugas_supermonev') return 'Petugas Supermonev';
  if (p.jenis_akses === 'petugas_bank') return 'Petugas Bank';
  if (p.peran_sistem === 'super_admin' && p.simulasi) {
    const k = pokjaById(p.simulasi.pokja_id);
    const l = { direktur: 'Direktur', petugas_supermonev: 'Petugas Supermonev', kapokja: 'Kapokja ' + (k?.nama_pendek || '?') }[p.simulasi.peran]
      || 'Anggota Pokja ' + (k?.nama_pendek || '?');
    return l + ' (simulasi Super Admin)';
  }
  if (p.peran_sistem === 'super_admin') return 'Super Admin';
  if (p.peran_sistem === 'direktur') return 'Direktur';
  const pk = db.pengguna_pokja.filter((x) => x.pengguna_id === p.id).map((x) => ({ ...x, k: pokjaById(x.pokja_id) })).sort((a, b) => a.k.urutan - b.k.urutan);
  return pk.length ? pk.map((x) => (x.jabatan === 'kapokja' ? 'Kapokja ' : 'Anggota Pokja ') + x.k.nama_pendek).join(', ') : 'Pegawai';
}
function log(aksi, tabel, record_id, ringkasan, perubahan = null, alasan = null) {
  const p = saya();
  db.audit_log.unshift({
    id: ++db.urut_log, waktu: sekarang(), pengguna_id: p?.id || null, pengguna_email: p?.email || null, pengguna_nama: p?.nama || null,
    sebagai: label(), aksi, tabel, record_id, ringkasan, perubahan, alasan,
  });
  if (db.audit_log.length > 2000) db.audit_log.length = 2000;
}
function kirimNotif(penerima_id, jenis, judul, isi, tautan) {
  db.notifikasi.unshift({ id: uid(), penerima_id, jenis, judul, isi, tautan, dibaca_pada: null, dibuat_pada: sekarang() });
}
const pokjaLengkap = (e) => { const k = pokjaById(e.pokja_id); return { ...salin(k), jabatan: e.jabatan }; };
const butuhSesi = () => { if (!sayaAktif()) throw galat('Sesi tidak aktif.', '42501'); };

// ---------------------------------------------------------------- autentikasi
export async function adaSesiAuth() { return !!auth(); }
export async function masukGoogle(email) {
  if (!email) { location.hash = '#/masuk'; return; }
  sessionStorage.setItem(KUNCI_AUTH, JSON.stringify({ email: String(email).toLowerCase() }));
  sessionStorage.setItem('sitasi:baru-login', '1');
  location.replace(location.pathname + '?pratinjau=masuk');
}
// Login email Kemensos (pratinjau): kode contoh selalu 123456
export async function kirimKodeEmail() { await tunggu(300); return { ok: true }; }
export async function masukDenganKode(email, kode) {
  await tunggu(300);
  if (String(kode).trim() !== '123456') throw galat('Kode salah atau sudah kedaluwarsa. Di mode pratinjau kodenya 123456.');
  return masukGoogle(email);
}
export async function keluar({ catatLog = true } = {}) {
  if (catatLog && sayaAktif()) { log('LOGOUT', null, null, 'Keluar dari SITASI TSKPO'); simpan(); }
  sessionStorage.removeItem(KUNCI_AUTH);
}
export function onAuthBerubah() { return () => {}; }
export function akunContoh() {
  return db.pengguna.map((p) => ({ email: p.email, nama: p.nama, aktif: p.aktif, jenis: p.jenis_akses, peran: p.peran_sistem, label: labelUntuk(p) }));
}
function labelUntuk(p) {
  if (p.jenis_akses === 'petugas_supermonev') return 'Petugas Supermonev';
  if (p.jenis_akses === 'petugas_bank') return 'Petugas Bank';
  if (p.peran_sistem === 'super_admin') return 'Super Admin';
  if (p.peran_sistem === 'direktur') return 'Direktur';
  const pk = db.pengguna_pokja.filter((x) => x.pengguna_id === p.id).map((x) => (x.jabatan === 'kapokja' ? 'Kapokja ' : 'Anggota ') + pokjaById(x.pokja_id).nama_pendek);
  return (pk.join(', ') || 'Pegawai') + (p.juga_supermonev ? ' + Supermonev' : '');
}

// ---------------------------------------------------------------- sesi & peran
export async function sesiSaya(login = false) {
  await tunggu(120);
  const a = auth();
  if (!a) return { status: 'tanpa_sesi' };
  const p = saya();
  if (!p) return { status: 'tidak_terdaftar', email: a.email };
  if (!p.aktif) return { status: 'nonaktif', email: p.email };
  if (!p.auth_id) { p.auth_id = 'tertaut'; kirimNotif(p.id, 'sukses', 'Akun Anda sudah aktif', 'Selamat datang di SITASI TSKPO. Menu yang tampil menyesuaikan peran dan Pokja Anda.', '#/beranda'); }
  p.login_terakhir = sekarang();
  if (login) log('LOGIN', 'pengguna', p.id, 'Masuk ke SITASI TSKPO');
  simpan();
  const asli = db.pengguna_pokja.filter((x) => x.pengguna_id === p.id).map(pokjaLengkap).sort((x, y) => x.urutan - y.urutan);
  const ef = pokjaEf(p).map(pokjaLengkap).sort((x, y) => x.urutan - y.urutan);
  const tautan = p.simulasi?.pokja_id
    ? db.pengguna_pokja.filter((x) => x.pokja_id === p.simulasi.pokja_id && x.jabatan === p.simulasi.peran)
      .map((x) => db.pengguna.find((u) => u.id === x.pengguna_id)).filter((u) => u?.aktif).map((u) => ({ nama: u.nama, email: u.email }))
    : [];
  return {
    status: 'aktif',
    pengguna: { id: p.id, email: p.email, nama: p.nama, nip: p.nip, no_hp: p.no_hp, jenis_akses: p.jenis_akses, juga_supermonev: !!p.juga_supermonev, peran_sistem: p.peran_sistem, super_admin_slot: p.super_admin_slot, simulasi: p.simulasi },
    pokja_asli: asli,
    efektif: { peran: peran(p), label: label(p), simulasi: !!p.simulasi, pokja: ef, juga_supermonev: !!p.juga_supermonev && p.jenis_akses === 'pegawai' && !p.simulasi },
    simulasi_tautan: tautan,
    notif_belum_dibaca: db.notifikasi.filter((n) => n.penerima_id === p.id && !n.dibaca_pada).length,
    waktu_server: sekarang(),
  };
}
export async function pilihPeran(peranBaru, pokjaId = null) {
  const p = sayaAktif();
  if (!p || p.peran_sistem !== 'super_admin') throw galat('Fitur ganti peran hanya untuk Super Admin.', '42501');
  if (['kapokja', 'anggota'].includes(peranBaru) && !pokjaById(pokjaId)) throw galat('Pilih Pokja yang valid.');
  p.simulasi = peranBaru === 'super_admin' ? null : ['kapokja', 'anggota'].includes(peranBaru) ? { peran: peranBaru, pokja_id: pokjaId } : { peran: peranBaru };
  log('GANTI_PERAN', 'pengguna', p.id, 'Super Admin beralih ke peran: ' + label(p), p.simulasi || { peran: 'super_admin' });
  simpan();
  return sesiSaya(false);
}
export async function catat(aksi, ringkasan = null, detail = null) {
  butuhSesi();
  log(aksi, null, null, ringkasan, detail); simpan();
}

// ---------------------------------------------------------------- pokja
export async function daftarPokja() { await tunggu(60); butuhSesi(); return salin(db.pokja); }
export async function pokjaDenganAnggota() {
  await tunggu(150); butuhSesi();
  if (!isSA()) return salin(db.pokja).map((k) => ({ ...k, pengguna_pokja: [] }));
  return db.pokja.map((k) => ({
    ...salin(k),
    pengguna_pokja: db.pengguna_pokja.filter((x) => x.pokja_id === k.id).map((x) => {
      const u = db.pengguna.find((v) => v.id === x.pengguna_id);
      return { jabatan: x.jabatan, pengguna: { id: u.id, nama: u.nama, email: u.email, aktif: u.aktif } };
    }),
  }));
}

// ---------------------------------------------------------------- pengguna
function barisPengguna(u) {
  return {
    ...salin(u),
    pengguna_pokja: db.pengguna_pokja.filter((x) => x.pengguna_id === u.id).map((x) => ({ jabatan: x.jabatan, pokja: salin(pokjaById(x.pokja_id)) })),
  };
}
export async function daftarPengguna({ q = '', pokja = '', peran: pf = '', status = 'aktif', hal = 1, per = 50 } = {}) {
  await tunggu(180); butuhSesi();
  let r = isSA() ? db.pengguna.slice() : db.pengguna.filter((u) => u.id === sayaAktif().id);
  const s = q.trim().toLowerCase();
  if (s) r = r.filter((u) => [u.nama, u.email, u.nip].some((x) => String(x || '').toLowerCase().includes(s)));
  if (status === 'aktif') r = r.filter((u) => u.aktif);
  if (status === 'nonaktif') r = r.filter((u) => !u.aktif);
  const anggota = (u, f) => db.pengguna_pokja.some((x) => x.pengguna_id === u.id && f(x));
  if (pokja) r = r.filter((u) => anggota(u, (x) => x.pokja_id === pokja && (!['kapokja', 'anggota'].includes(pf) || x.jabatan === pf)));
  else if (pf === 'kapokja' || pf === 'anggota') r = r.filter((u) => anggota(u, (x) => x.jabatan === pf));
  if (pf === 'super_admin' || pf === 'direktur') r = r.filter((u) => u.peran_sistem === pf);
  if (pf === 'petugas_supermonev') r = r.filter((u) => u.jenis_akses === 'petugas_supermonev' || u.juga_supermonev);
  if (pf === 'petugas_bank') r = r.filter((u) => u.jenis_akses === 'petugas_bank');
  r.sort((a, b) => (b.aktif - a.aktif) || a.nama.localeCompare(b.nama, 'id'));
  return { baris: r.slice((hal - 1) * per, hal * per).map(barisPengguna), total: r.length };
}
export async function ringkasanPengguna() {
  await tunggu(100);
  if (!isSA()) throw galat('Hanya Super Admin.', '42501');
  const u = db.pengguna;
  return {
    aktif: u.filter((x) => x.aktif).length, nonaktif: u.filter((x) => !x.aktif).length,
    pegawai: u.filter((x) => x.aktif && x.jenis_akses === 'pegawai').length,
    petugas_supermonev: u.filter((x) => x.aktif && (x.jenis_akses === 'petugas_supermonev' || x.juga_supermonev)).length,
    petugas_bank: u.filter((x) => x.aktif && x.jenis_akses === 'petugas_bank').length,
    super_admin: u.filter((x) => x.aktif && x.peran_sistem === 'super_admin').length,
    belum_login: u.filter((x) => x.aktif && !x.auth_id).length,
  };
}
export async function simpanPengguna(d) {
  await tunggu(250);
  if (!isSA()) throw galat('Hanya Super Admin yang dapat mengelola pengguna.', '42501');
  const email = String(d.email || '').trim().toLowerCase();
  const nama = String(d.nama || '').trim();
  if (!nama) throw galat('Nama wajib diisi.');
  if (!email) throw galat('Email wajib diisi.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw galat('Format email tidak valid: ' + email);
  const jenis = ['petugas_supermonev', 'petugas_bank'].includes(d.jenis_akses) ? d.jenis_akses : 'pegawai';
  let peranSistem = jenis !== 'pegawai' ? null : (d.peran_sistem || null);
  const jugaSmv = jenis === 'pegawai' && !!d.juga_supermonev;
  const aktif = d.aktif !== false;
  const lama = d.id ? db.pengguna.find((u) => u.id === d.id) : null;
  if (d.id && !lama) throw galat('Pengguna tidak ditemukan.');
  if (lama && lama.id === sayaAktif().id && !aktif) throw galat('Anda tidak dapat menonaktifkan akun Anda sendiri.');
  if (db.pengguna.some((u) => u.email === email && u.id !== d.id)) throw galat(`Email ${email} sudah terdaftar.`);
  const saLain = db.pengguna.filter((u) => u.peran_sistem === 'super_admin' && u.aktif && u.id !== d.id);
  if (peranSistem === 'super_admin' && aktif && saLain.length >= 2) throw galat('Maksimal 2 Super Admin aktif. Nonaktifkan atau turunkan salah satu Super Admin lebih dulu.');
  if (lama?.peran_sistem === 'super_admin' && lama.aktif && !(peranSistem === 'super_admin' && aktif) && saLain.length === 0)
    throw galat('Super Admin terakhir tidak dapat dinonaktifkan atau diturunkan. Tambahkan Super Admin lain lebih dulu.');

  const u = lama || { id: 'pg-' + uid().slice(0, 8), auth_id: null, login_terakhir: null, simulasi: null, dibuat_pada: sekarang() };
  const sebelum = lama ? salin(lama) : null;
  Object.assign(u, { email, nama, nip: d.nip?.trim() || null, no_hp: d.no_hp?.trim() || null, jenis_akses: jenis, juga_supermonev: jugaSmv, peran_sistem: peranSistem, aktif, catatan: d.catatan?.trim() || null });
  if (lama && sebelum.email !== email) { u.auth_id = null; u.simulasi = null; }
  if (u.peran_sistem !== 'super_admin' || !u.aktif) { u.simulasi = null; u.super_admin_slot = null; }
  else if (!u.super_admin_slot || saLain.some((x) => x.super_admin_slot === u.super_admin_slot)) u.super_admin_slot = saLain.some((x) => x.super_admin_slot === 1) ? 2 : 1;
  if (!lama) db.pengguna.push(u);

  if (d.pokja || jenis !== 'pegawai') {
    const baru = jenis !== 'pegawai' ? [] : (d.pokja || []).filter((x) => x.pokja_id);
    db.pengguna_pokja = db.pengguna_pokja.filter((x) => x.pengguna_id !== u.id);
    baru.forEach((x) => db.pengguna_pokja.push({ pengguna_id: u.id, pokja_id: x.pokja_id, jabatan: x.jabatan === 'kapokja' ? 'kapokja' : 'anggota' }));
  }
  const ubah = {};
  if (sebelum) for (const k of ['email', 'nama', 'nip', 'no_hp', 'jenis_akses', 'juga_supermonev', 'peran_sistem', 'aktif', 'catatan', 'super_admin_slot'])
    if (sebelum[k] !== u[k]) ubah[k] = { lama: sebelum[k], baru: u[k] };
  log(lama ? 'UPDATE' : 'INSERT', 'pengguna', u.id, null, lama ? ubah : salin(u), d.alasan || null);
  simpan();
  return salin(u);
}
export async function aturStatusPengguna(id, aktif, alasan = null) {
  await tunggu(200);
  if (!isSA()) throw galat('Hanya Super Admin yang dapat mengubah status pengguna.', '42501');
  if (id === sayaAktif().id && !aktif) throw galat('Anda tidak dapat menonaktifkan akun Anda sendiri.');
  if (!aktif && !String(alasan || '').trim()) throw galat('Alasan wajib diisi saat menonaktifkan akun.');
  const u = db.pengguna.find((x) => x.id === id);
  if (!u) throw galat('Pengguna tidak ditemukan.');
  if (u.peran_sistem === 'super_admin' && u.aktif && !aktif && !db.pengguna.some((x) => x.peran_sistem === 'super_admin' && x.aktif && x.id !== id))
    throw galat('Super Admin terakhir tidak dapat dinonaktifkan atau diturunkan. Tambahkan Super Admin lain lebih dulu.');
  if (aktif && u.peran_sistem === 'super_admin' && db.pengguna.filter((x) => x.peran_sistem === 'super_admin' && x.aktif).length >= 2)
    throw galat('Maksimal 2 Super Admin aktif. Nonaktifkan atau turunkan salah satu Super Admin lebih dulu.');
  const lama = u.aktif;
  u.aktif = aktif;
  if (!aktif) { u.simulasi = null; u.super_admin_slot = null; }
  else if (u.peran_sistem === 'super_admin') u.super_admin_slot = db.pengguna.some((x) => x.super_admin_slot === 1 && x.id !== id) ? 2 : 1;
  log('UPDATE', 'pengguna', id, null, { aktif: { lama, baru: aktif } }, alasan || null);
  simpan();
  return salin(u);
}

// ---------------------------------------------------------------- pengumuman
export async function pengumumanAktif(hariIni) {
  await tunggu(80); butuhSesi();
  const p = sayaAktif();
  return salin(db.pengumuman.filter((x) => x.aktif && (!x.mulai || x.mulai <= hariIni) && (!x.selesai || x.selesai >= hariIni)
    && (x.sasaran === 'semua' || (x.sasaran === 'pegawai' && p.jenis_akses === 'pegawai') || (x.sasaran === 'petugas_supermonev' && peran(p) === 'petugas_supermonev')))
    .sort((a, b) => (a.tingkat === b.tingkat ? b.dibuat_pada.localeCompare(a.dibuat_pada) : a.tingkat === 'penting' ? -1 : 1)));
}
export async function daftarPengumuman() {
  await tunggu(150); butuhSesi();
  if (!bolehPengumuman()) return pengumumanAktif(new Date().toISOString().slice(0, 10));
  return salin(db.pengumuman).sort((a, b) => (b.aktif - a.aktif) || b.dibuat_pada.localeCompare(a.dibuat_pada));
}
export async function simpanPengumuman(d) {
  await tunggu(220);
  if (!bolehPengumuman()) throw galat('Hanya Super Admin dan Pokja TU yang dapat mengelola pengumuman.', '42501');
  if (!String(d.isi || '').trim()) throw galat('Isi pengumuman wajib diisi.');
  if (d.mulai && d.selesai && d.selesai < d.mulai) throw galat('Tanggal selesai tidak boleh sebelum tanggal mulai.');
  const lama = d.id ? db.pengumuman.find((x) => x.id === d.id) : null;
  const x = lama || { id: uid(), dibuat_pada: sekarang() };
  Object.assign(x, {
    judul: d.judul?.trim() || 'Pengumuman Dit. RSTSKPO', isi: d.isi.trim(), tingkat: d.tingkat === 'penting' ? 'penting' : 'info',
    sasaran: ['pegawai', 'petugas_supermonev'].includes(d.sasaran) ? d.sasaran : 'semua', aktif: d.aktif !== false,
    mulai: d.mulai || null, selesai: d.selesai || null, diubah_pada: sekarang(),
  });
  if (!lama) {
    db.pengumuman.push(x);
    if (x.aktif && x.tingkat === 'penting') db.pengguna.filter((u) => u.aktif && u.id !== sayaAktif().id
      && (x.sasaran === 'semua' || (x.sasaran === 'pegawai' && u.jenis_akses === 'pegawai') || (x.sasaran === 'petugas_supermonev' && u.jenis_akses === 'petugas_supermonev')))
      .forEach((u) => kirimNotif(u.id, 'pengumuman', x.judul, x.isi.slice(0, 240), '#/beranda'));
  }
  log(lama ? 'UPDATE' : 'INSERT', 'pengumuman', x.id, null, salin(x));
  simpan();
  return salin(x);
}
export async function hapusPengumuman(id) {
  await tunggu(150);
  if (!bolehPengumuman()) throw galat('Hanya Super Admin dan Pokja TU yang dapat mengelola pengumuman.', '42501');
  const x = db.pengumuman.find((v) => v.id === id);
  db.pengumuman = db.pengumuman.filter((v) => v.id !== id);
  if (x) log('DELETE', 'pengumuman', id, null, x);
  simpan();
}

// ---------------------------------------------------------------- notifikasi
export async function notifikasi({ hal = 1, per = 30 } = {}) {
  await tunggu(100); butuhSesi();
  const r = db.notifikasi.filter((n) => n.penerima_id === sayaAktif().id);
  return { baris: salin(r.slice((hal - 1) * per, hal * per)), total: r.length };
}
export async function tandaiDibaca(id = null) {
  butuhSesi();
  let n = 0;
  db.notifikasi.forEach((x) => { if (x.penerima_id === sayaAktif().id && !x.dibaca_pada && (!id || x.id === id)) { x.dibaca_pada = sekarang(); n++; } });
  simpan();
  return n;
}

// ---------------------------------------------------------------- audit log
function saringAudit({ dari, sampai, aksi, tabel, q }) {
  if (!isSA()) return [];
  const s = String(q || '').toLowerCase();
  return db.audit_log.filter((x) => {
    const tgl = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(x.waktu));
    return (!dari || tgl >= dari) && (!sampai || tgl <= sampai) && (!aksi || x.aksi === aksi) && (!tabel || x.tabel === tabel)
      && (!s || [x.pengguna_email, x.pengguna_nama, x.ringkasan, x.record_id].some((v) => String(v || '').toLowerCase().includes(s)));
  });
}
export async function auditLog(f = {}) {
  await tunggu(160); butuhSesi();
  const { hal = 1, per = 50 } = f;
  const r = saringAudit(f);
  return { baris: salin(r.slice((hal - 1) * per, hal * per)), total: r.length };
}
export async function auditLogSemua(f = {}, batas = 5000) { await tunggu(100); return salin(saringAudit(f).slice(0, batas)); }

// ---------------------------------------------------------------- realtime (tidak ada di pratinjau)
export function langganan() { return () => {}; }

// =====================================================================
// TAHAP 2 (pratinjau) — usulan BNBA, alur 11 tahap, rekap, notifikasi, migrasi.
// Meniru fungsi SQL SETUP_SUPABASE_TAHAP2 agar alur bisa dicoba tanpa server.
// =====================================================================
const URUT = ['1', '2', '3', '3b', '4a', '4b', '4c', '5', '6', '7', '7b', '8', '9', '10', '11'];
const NAMA_T = { 1: 'Pengajuan BNBA & Profil', 2: 'Verifikasi Kapokja', 3: 'Draft SK & Nota Dinas', '3b': 'Verifikasi Ketua Pokja (SK & Nota Dinas)', '7b': 'Pengisian Rekening Bank', '4a': 'Verifikasi Tata Usaha', '4b': 'TTD Direktur',
  '4c': 'Sekretariat', 5: 'Data Pencairan', 6: 'SK Keluar dari Sekretariat', 7: 'Administrasi Burekol', 8: 'SP2D', 9: 'Administrasi SI', 10: 'SI', 11: 'Pencairan' };
const SINGKAT = { KPO_PMBS: 'KPO', GEPENGLUNG: 'GEP', BWBP: 'BWBP', KTK_WTS: 'KTK', TU: 'TU', KEUANGAN: 'KEU', PERENCANAAN: 'REN', KEPEGAWAIAN: 'KEP', HUKUM: 'HUK', SUPERMONEV: 'SMV', DATA: 'DATA' };
const isPeg = () => ['super_admin', 'direktur', 'pegawai'].includes(peran());
const idsPokja = () => pokjaEf().map((e) => e.pokja_id);
const namaSaya = () => sayaAktif()?.nama || 'Sistem';
const pad4 = (n) => String(n).padStart(4, '0');

function samarAngka(v) {
  const d = String(v || '').replace(/\D/g, '');
  if (!d) return null;
  return d.length > 8 ? d.slice(0, 4) + '*'.repeat(d.length - 8) + d.slice(-4) : '****' + d.slice(-2);
}
const samarNama = (v) => (v ? String(v).trim().split(/\s+/).map((w) => (w.length <= 2 ? w[0] + '*' : w[0] + '*'.repeat(Math.min(w.length - 2, 5)) + w.slice(-1))).join(' ') : null);
const samarAlamat = (v) => (v ? String(v).trim().split(' ')[0] + ' ••••••' : null);
const SENSITIF = ['no_kk', 'nama_ibu', 'ktp_jalan', 'dom_jalan', 'nomor_rekening'];
function tampilBnba(b) {
  const o = salin(b);
  o.no_kk_samar = samarAngka(b.no_kk); o.nama_ibu_samar = samarNama(b.nama_ibu); o.ktp_jalan_samar = samarAlamat(b.ktp_jalan);
  o.dom_jalan_samar = samarAlamat(b.dom_jalan); o.nomor_rekening_samar = samarAngka(b.nomor_rekening);
  o.laba_awal = (Number(b.pendapatan_kotor_awal) || 0) - (Number(b.biaya_awal) || 0);
  SENSITIF.forEach((k) => delete o[k]);
  return o;
}
function tglBebas(v) {
  if (!v) return null;
  v = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const m = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : v;
}
function angkaBebas(v) {
  let s = String(v).replace(/[^\d,.]/g, '');
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
  else if (/^\d+,\d+$/.test(s)) s = s.replace(',', '.');
  return s === '' ? null : s;
}
const KOLOM_T = ['klaster_ppks', 'prov_penyaluran', 'mak', 'kota_kab_penyaluran', 'ktp_provinsi', 'ktp_kabkota', 'ktp_kecamatan', 'ktp_kelurahan', 'ktp_jalan', 'dom_provinsi', 'dom_kabkota',
  'dom_kecamatan', 'dom_kelurahan', 'dom_jalan', 'nama', 'nik', 'no_kk', 'no_paspor', 'desil', 'nama_ibu', 'tempat_lahir', 'tgl_lahir', 'jenis_kelamin',
  'pekerjaan_ktp', 'pekerjaan_kini', 'jenis_bantuan', 'nilai_bantuan', 'rincian_barang', 'uraian', 'akun_bantuan', 'no_sp2d', 'tgl_sp2d', 'bulan_sp2d',
  'rek_giro_bni', 'nama_bank', 'nomor_rekening', 'nama_pemilik_rek', 'pendapatan_kotor_awal', 'biaya_awal'];
function normalBnba(p) {
  const r = {};
  for (const k of KOLOM_T) {
    if (!(k in p)) continue;
    let v = p[k] == null ? null : String(p[k]).trim() || null;
    if (v && ['nik', 'no_kk', 'nomor_rekening', 'rek_giro_bni'].includes(k)) v = v.replace(/[\s.-]/g, '');
    if (v && ['jenis_bantuan', 'uraian'].includes(k)) v = v.toUpperCase();
    if (v && ['nilai_bantuan', 'pendapatan_kotor_awal', 'biaya_awal'].includes(k)) v = angkaBebas(v);
    if (v && ['tgl_lahir', 'tgl_sp2d'].includes(k)) v = tglBebas(v);
    if (v && ['desil', 'mak'].includes(k)) v = v.replace(/\D/g, '') || null;
    if (v && k === 'jenis_kelamin') v = /^(L|LK|LAKI|PRIA)/i.test(v) ? 'Laki-laki' : /^(P|PR|PEREMPUAN|WANITA)/i.test(v) ? 'Perempuan' : v;
    r[k] = v;
  }
  if (Array.isArray(p.rincian_item)) r.rincian_item = p.rincian_item.map((i) => { const o = { nama: String(i.nama ?? '').trim(), jumlah: String(i.jumlah ?? '').trim(), satuan: String(i.satuan ?? '').trim() }; if (i.subtotal !== undefined && String(i.subtotal) !== '') o.subtotal = String(i.subtotal).replace(/[^\d.]/g, ''); else o.harga = String(i.harga ?? '').replace(/[^\d.]/g, ''); return o; });
  return r;
}
function cekBnba(r) {
  if (!r.nama) return 'NAMA wajib diisi';
  if (!/^\d{16}$/.test(r.nik || '')) return 'NIK harus 16 digit angka';
  if (r.no_kk && !/^\d{16}$/.test(r.no_kk)) return 'NO. KK harus 16 digit angka';
  if (r.jenis_bantuan && !['PHL', 'KWU', 'PEMULANGAN'].includes(r.jenis_bantuan)) return 'JENIS BANTUAN harus PHL, KWU, atau PEMULANGAN';
  if (r.uraian && !['BANSOS UANG', 'BANSOS BARANG'].includes(r.uraian)) return 'URAIAN harus BANSOS UANG atau BANSOS BARANG';
  if (r.nilai_bantuan && !/^\d+(\.\d+)?$/.test(r.nilai_bantuan)) return 'NILAI BANTUAN harus angka';
  if (r.desil && !/^(10|[1-9])$/.test(r.desil)) return 'DESIL harus angka 1 sampai 10';
  if (r.mak && !['571111', '571112', '571113', '521219'].includes(r.mak)) return 'MAK tidak dikenal';
  if (Array.isArray(r.rincian_item) && r.rincian_item.some((i) => !String(i.nama || '').trim() || !/^\d+(\.\d+)?$/.test(String(i.subtotal ?? i.harga ?? '')) || (String(i.jumlah || '') !== '' && !(Number(i.jumlah) > 0)))) return 'Setiap barang wajib punya nama, jumlah (lebih dari 0), satuan, dan subtotal (angka)';
  if (r.tgl_lahir && !/^\d{4}-\d{2}-\d{2}$/.test(r.tgl_lahir)) return 'Format tanggal tidak dikenali (pakai DD/MM/YYYY)';
  return null;
}
const angkaKe = (r) => { ['nilai_bantuan', 'pendapatan_kotor_awal', 'biaya_awal'].forEach((k) => { if (k in r && r[k] != null) r[k] = Number(r[k]); }); return r; };

function bolehTahapP(pokjaId, t) {
  if (isSA()) return true;
  const ef = pokjaEf(), milik = ef.some((e) => e.pokja_id === pokjaId);
  if (['1', '3'].includes(t)) return milik;
  if (t === '2') return ef.some((e) => e.pokja_id === pokjaId && e.jabatan === 'kapokja');
  if (t === '3b') return ef.some((e) => e.pokja_id === pokjaId && e.jabatan === 'kapokja');
  if (t === '7b') return diPokja('KEUANGAN') || peran() === 'petugas_bank';
  if (['4a', '4b'].includes(t)) return diPokja('TU');
  if (['4c', '6'].includes(t)) return diPokja('TU') || milik;
  return ['5', '7', '8', '9', '10', '11'].includes(t) && diPokja('KEUANGAN');
}
const JENIS_L = ['draft_sk', 'nota_dinas', 'sk_final'];
const bolehLanjutan = (u) => isSA() || diPokja('TU') || idsPokja().includes(u.pokja_id);
const bolehPenuhP = (pokjaId) => isSA() || diPokja('KEUANGAN') || idsPokja().includes(pokjaId);
const usulanTerlihat = (u) => isPeg() && (!['draft', 'menunggu', 'perlu_perbaikan'].includes(u.status) || isSA() || idsPokja().includes(u.pokja_id));
const bnbaTerlihat = (b) => isPeg() && (b.status_verifikasi === 'terverifikasi' || isSA() || idsPokja().includes(b.pokja_id));
const ambilU = (id) => { const u = db.usulan.find((x) => x.id === id); if (!u) throw galat('Usulan tidak ditemukan.'); return u; };
const tahapU = (id, t) => db.tahap.find((x) => x.usulan_id === id && x.tahap === t);

function usulanV(u) {
  const k = pokjaById(u.pokja_id), b = db.bnba.filter((x) => x.usulan_id === u.id), th = db.tahap.filter((x) => x.usulan_id === u.id);
  const st = Object.fromEntries(th.map((x) => [x.tahap, x.status]));
  const aktif = URUT.filter((t) => st[t] === 'aktif');
  const ta = th.find((x) => x.tahap === u.tahap_aktif);
  return {
    ...salin(u), pokja_kode: k.kode, pokja_nama: k.nama_pendek, warna: k.warna, warna_tint: k.warna_tint, warna_teks: k.warna_teks,
    pembuat_nama: db.pengguna.find((p) => p.id === u.dibuat_oleh)?.nama || null,
    jumlah_pm: b.length, nilai_total: b.reduce((a, x) => a + (Number(x.nilai_bantuan) || 0), 0),
    klaster: [...new Set(b.map((x) => x.klaster_ppks).filter(Boolean))].join(', ') || null,
    kabkota: [...new Set(b.map((x) => x.kota_kab_penyaluran).filter(Boolean))].join(', ') || null,
    pm_belum_lengkap: b.filter((x) => kolomKurang(x).length).length,
    tahap_status: st, tahap_aktif_list: aktif, pic_nama: ta?.pic_nama || null, tahap_mulai: ta?.mulai_pada || null,
  };
}
function riwayatP(uid_, t, aksi, lama, baru, cat) {
  db.riwayat.unshift({ id: ++db.seq_r, usulan_id: uid_, waktu: sekarang(), pengguna_id: sayaAktif()?.id, pengguna_nama: namaSaya(), sebagai: label(), tahap: t, aksi, status_lama: lama, status_baru: baru, catatan: cat || null });
}
let penerimaPilih = null;   // diisi sementara oleh prosesTahap (data._penerima)
function penerimaTahap(pokjaId, t) {
  if (t === '7') { const bk = db.pengguna.filter((u) => u.aktif && u.jenis_akses === 'petugas_bank').map((u) => u.id); if (bk.length) return bk; }
  return db.pengguna.filter((u) => !penerimaPilih || penerimaPilih.includes(u.id)).filter((u) => u.aktif && u.jenis_akses === 'pegawai' && db.pengguna_pokja.some((pp) => pp.pengguna_id === u.id && (
    ['1', '3'].includes(t) ? pp.pokja_id === pokjaId
      : ['2', '3b'].includes(t) ? pp.pokja_id === pokjaId && pp.jabatan === 'kapokja'
        : ['4a', '4b', '4c', '6'].includes(t) ? pokjaById(pp.pokja_id)?.kode === 'TU'
          : pokjaById(pp.pokja_id)?.kode === 'KEUANGAN'))).map((u) => u.id);
}
const anggotaPokja = (pokjaId) => db.pengguna.filter((u) => u.aktif && db.pengguna_pokja.some((pp) => pp.pengguna_id === u.id && pp.pokja_id === pokjaId)).map((u) => u.id);
function beriTahu(ids, event, judul, isi, tautan) {
  if (db._tanpaNotif) return;
  const n = db.notif_atur, m = n.notif_matriks[event] || {}, me = sayaAktif()?.id;
  for (const id of new Set(ids)) {
    if (id === me) continue;
    const u = db.pengguna.find((x) => x.id === id);
    kirimNotif(id, /DIKEMBALIKAN|DITOLAK/.test(event) ? 'peringatan' : 'info', judul, isi, tautan);
    const link = n.app_url ? n.app_url.replace(/\/$/, '') + '/' + tautan : '';
    if (n.notif_wa_aktif && m.wa && /\d{8,}/.test(u.no_hp || '')) db.antrian.unshift({ id: ++db.seq_a, kanal: 'WA', tujuan: u.no_hp, nama_penerima: u.nama, subjek: null, pesan: `*SITASI TSKPO*\n${judul}\n${isi}${link ? '\nBuka: ' + link : ''}`, event, status: 'antri', percobaan: 0, respon: null, dibuat_pada: sekarang(), dikirim_pada: null });
    if (n.notif_email_aktif && m.email && u.email) db.antrian.unshift({ id: ++db.seq_a, kanal: 'EMAIL', tujuan: u.email, nama_penerima: u.nama, subjek: '[SITASI TSKPO] ' + judul, pesan: isi, event, status: 'antri', percobaan: 0, respon: null, dibuat_pada: sekarang(), dikirim_pada: null });
  }
}
function segarkanT(id) {
  const u = ambilU(id), a = URUT.find((t) => tahapU(id, t)?.status === 'aktif');
  if (a) u.tahap_aktif = a;
  u.diubah_pada = sekarang();
}
function bukaT(id, t) {
  const x = tahapU(id, t);
  if (!x || x.status !== 'terkunci') return;
  x.status = 'aktif'; x.mulai_pada = sekarang();
  const u = ambilU(id);
  beriTahu(penerimaTahap(u.pokja_id, t), t === '2' ? 'USULAN_MENUNGGU_KAPOKJA' : 'TAHAP_BARU',
    t === '2' ? 'Usulan menunggu verifikasi Kapokja' : `Tahap ${t} menunggu Anda: ${NAMA_T[t]}`,
    `Usulan "${u.judul}" (${u.no_register}) kini berada di Tahap ${t} — ${NAMA_T[t]}.`, '#/usulan/' + u.id);
  if (t === '2') beriTahu(kapokjaTU(), 'USULAN_MENUNGGU_KAPOKJA', 'Usulan BNBA baru diajukan', `Pokja pengusul mengajukan "${u.judul}" (${u.no_register}). Saat ini menunggu verifikasi Kapokja pokja pengusul.`, '#/usulan/' + u.id);
}
const kapokjaTU = () => db.pengguna.filter((u) => u.aktif && db.pengguna_pokja.some((pp) => pp.pengguna_id === u.id && pp.jabatan === 'kapokja' && pokjaById(pp.pokja_id)?.kode === 'TU')).map((u) => u.id);

// ---------------------------------------------------------------- data contoh
const NAMA_PM = ['Ahmad Fauzi', 'Siti Aminah', 'Dedi Kurniawan', 'Ratnasari', 'Ahmad Supriyadi', 'Neneng Hasanah', 'Bambang Irawan', 'Dewi Anggraini',
  'Slamet Riyadi', 'Hendra Gunawan', 'Siti Munawaroh', 'Yayah Rohayati', 'Dodi Saputra', 'Rina Marlina', 'Agus Salim', 'Tuti Alawiyah', 'Joko Susilo',
  'Lilis Suryani', 'Asep Sunandar', 'Euis Komariah', 'Rudi Hartono', 'Wawan Setiawan', 'Nining Kurniasih', 'Ujang Sopandi', 'Iis Sumiati', 'Komarudin',
  'Sri Wahyuni', 'Darmawan', 'Maesaroh', 'Kustini', 'Juhana', 'Popon Rohaeti', 'Edi Sutrisno'];
function benihT2() {
  db.usulan = []; db.bnba = []; db.tahap = []; db.riwayat = []; db.berkas = []; db.penyaluran = []; db.koreksi = {}; db.antrian = [];
  db.seq_u = 0; db.seq_r = 0; db.seq_a = 0; db.seq_nik = 0;
  db.notif_atur = { notif_wa_aktif: false, notif_email_aktif: false, app_url: '', notif_matriks: {
    USULAN_MENUNGGU_KAPOKJA: { wa: true, email: true }, TAHAP_BARU: { wa: true, email: true }, PROGRES_USULAN: { wa: false, email: true },
    USULAN_DIKEMBALIKAN: { wa: true, email: true }, USULAN_DITOLAK: { wa: true, email: true }, USULAN_SELESAI: { wa: true, email: true },
    PM_DITOLAK_KEUANGAN: { wa: true, email: true }, PM_DIPERBAIKI: { wa: true, email: false } } };
  db.fonnte = '';
  const hp = { 'sari.handayani@contoh.id': '081234500101', 'bambang.wijaya@contoh.id': '081234500102', 'muhni2806@gmail.com': '081234500103',
    'yusuf.hidayat@contoh.id': '081234500104', 'nur.aini@contoh.id': '081234500105' };
  db.pengguna.forEach((p) => { if (hp[p.email]) p.no_hp = hp[p.email]; });
  const kab = { KPO_PMBS: ['Kabupaten Cianjur', 'Jawa Barat'], GEPENGLUNG: ['Kota Jakarta Timur', 'DKI Jakarta'], BWBP: ['Kota Surakarta', 'Jawa Tengah'],
    KTK_WTS: ['Kabupaten Indramayu', 'Jawa Barat'] };
  const klas = { KPO_PMBS: ['KPO', 'PMIB'], GEPENGLUNG: ['Pemulung', 'Gelandangan', 'Pengemis'], BWBP: ['BWBLP Eks Napiter', 'BWBLP Umum'], KTK_WTS: ['Eks WTS', 'KTK'] };
  const pembuat = { KPO_PMBS: 'pg-8', GEPENGLUNG: 'pg-9', BWBP: 'pg-13', KTK_WTS: 'pg-1' };
  const rencana = [
    ['KPO_PMBS', 'Usulan BNBA ATENSI Cianjur November 2026', 'proses', '3', 6, 2],
    ['GEPENGLUNG', 'Usulan Pemulung & Gepeng DKI Jakarta Batch 3', 'proses', '4c', 5, 6],
    ['BWBP', 'Usulan Resosialisasi Napiter & Eks BWBLP Solo', 'proses', '5', 4, 9],
    ['KTK_WTS', 'Usulan ATENSI Eks WTS Indramayu Tahap I', 'proses', '9', 4, 14],
    ['KPO_PMBS', 'Usulan Penanganan Darurat TPPO Nunukan', 'selesai', '11', 5, 30],
    ['KPO_PMBS', 'Usulan Kewirausahaan Klaster Rentan Subang 2026', 'menunggu', '2', 4, 1],
    ['KPO_PMBS', 'Usulan Sembako & Nutrisi Sukabumi', 'draft', '1', 3, 0],
    ['GEPENGLUNG', 'Usulan Pemulung Kota Bekasi', 'perlu_perbaikan', '1', 2, 3],
  ];
  let ni = 0;
  rencana.forEach(([kode, judul, status, tahap, jml, hariLalu], idx) => {
    const k = db.pokja.find((p) => p.kode === kode), t0 = new Date(Date.now() - hariLalu * 864e5).toISOString();
    const u = { id: 'us-' + (idx + 1), no_register: `USL-${SINGKAT[kode]}-202611-${pad4(++db.seq_u)}`, judul, kategori: 'Bantuan ATENSI', pokja_id: k.id,
      link_profil: status === 'draft' ? null : 'https://drive.google.com/drive/folders/contoh-profil-asesmen', status, tahap_aktif: tahap, catatan_terakhir: null,
      no_sk: null, tgl_sk: null, link_sk: null, tgl_cair: null, usulan_asal_id: null, usulan_baru_id: null, sumber: 'web', dibuat_oleh: pembuat[kode],
      dibuat_pada: t0, tgl_submit: status === 'draft' ? null : t0, diubah_pada: t0 };
    if (/Sembako/.test(judul)) u.kategori = 'Bantuan ATENSI — Sembako & Nutrisi';
    if (/Kewirausahaan/.test(judul)) u.kategori = 'Bantuan ATENSI — Kewirausahaan';
    const posisi = URUT.indexOf(tahap);
    URUT.forEach((t, i) => {
      let st = status === 'selesai' || i < posisi ? 'selesai' : t === tahap ? 'aktif' : 'terkunci';
      if (status === 'proses' && tahap === '5' && t === '6') st = 'aktif';
      if (status === 'perlu_perbaikan' && t === '1') st = 'aktif';
      db.tahap.push({ usulan_id: u.id, tahap: t, status: st, data: {}, catatan: null, pic_nama: st === 'selesai' ? (['1', '3'].includes(t) ? 'Bambang Wijaya' : ['2', '3b'].includes(t) ? 'Sari Handayani' : ['4a', '4b', '4c', '6'].includes(t) ? 'Anggota Pokja TU' : 'Nur Aini') : null,
        mulai_pada: st !== 'terkunci' ? t0 : null, selesai_pada: st === 'selesai' ? t0 : null });
    });
    if (posisi > URUT.indexOf('6') || status === 'selesai') { u.no_sk = `${140 + idx}/RSTSKPO/SK/${10 + (idx % 2)}/2026`; u.tgl_sk = '2026-11-0' + (idx + 1); }
    if (status === 'selesai') u.tgl_cair = '2026-11-15';
    if (status === 'perlu_perbaikan') u.catatan_terakhir = 'Lengkapi NIK PM kedua dan rincian barang.';
    db.usulan.push(u);
    for (let j = 0; j < jml; j++) {
      const nm = NAMA_PM[ni % NAMA_PM.length]; ni++;
      const nik = '32' + String(1000000000 + ni * 7919).padStart(10, '0') + String(1000 + ni).slice(-4);
      const keuLengkap = posisi > URUT.indexOf('5') || status === 'selesai' || (tahap === '5' && j < 2);
      const rekLengkap = posisi > URUT.indexOf('8') || status === 'selesai';
      const jk = jenisDariKategori(u.kategori), jenisPM = status === 'draft' && j === 2 ? null : jk || ['KWU', 'PHL', 'KWU', 'PEMULANGAN'][j % 4];
      const itemPM = jenisPM === 'PHL' ? [{ nama: 'Beras', jumlah: '10', satuan: 'kg', subtotal: '140000' }, { nama: 'Minyak goreng', jumlah: '4', satuan: 'liter', subtotal: '76000' }, { nama: 'Telur', jumlah: '1', satuan: 'kg', subtotal: '30000' }] : null;
      db.bnba.push({
        id: 'bn-' + ni, usulan_id: u.id, pokja_id: k.id, status_verifikasi: ['draft', 'menunggu', 'perlu_perbaikan'].includes(status) ? status : 'terverifikasi',
        klaster_ppks: status === 'draft' && j === 2 ? null : klas[kode][j % klas[kode].length], prov_penyaluran: kab[kode][1], mak: keuLengkap ? '571111' : null, kota_kab_penyaluran: kab[kode][0],
        ktp_provinsi: kab[kode][1], ktp_kabkota: kab[kode][0], ktp_kecamatan: 'Kec. Contoh ' + (j + 1), ktp_kelurahan: 'Desa Contoh', ktp_jalan: `Kp. Contoh RT 0${j + 1}/RW 04`,
        dom_provinsi: null, dom_kabkota: null, dom_kecamatan: null, dom_kelurahan: null, dom_jalan: null,
        nama: nm.toUpperCase(), nik, no_kk: nik.slice(0, 12) + '0004', no_paspor: null, desil: String(1 + (j % 3)), nama_ibu: 'Ibu ' + nm.split(' ')[0],
        tempat_lahir: kab[kode][0].replace(/^(Kabupaten|Kab\.|Kota) /, ''), tgl_lahir: `19${80 + (ni % 15)}-0${1 + (ni % 9)}-1${ni % 9}`, jenis_kelamin: ni % 2 ? 'Laki-laki' : 'Perempuan',
        pekerjaan_ktp: 'Mengurus Rumah Tangga', pekerjaan_kini: 'Pedagang', jenis_bantuan: jenisPM,
        nilai_bantuan: status === 'draft' && j === 2 ? null : itemPM ? totalRincian(itemPM) : [5000000, 2500000, 5000000, 1500000][j % 4],
        rincian_item: itemPM, rincian_barang: itemPM ? ringkasRincian(itemPM) : 'Etalase, kompor gas, modal bahan baku',
        uraian: j % 4 === 1 ? 'BANSOS BARANG' : 'BANSOS UANG', akun_bantuan: keuLengkap ? '571111' : null,
        no_sp2d: posisi > URUT.indexOf('9') || status === 'selesai' ? '26019280' + (idx + 10) : null, tgl_sp2d: status === 'selesai' ? '2026-11-12' : null,
        bulan_sp2d: status === 'selesai' ? 'November' : null, rek_giro_bni: rekLengkap ? '1234567890' : null, nama_bank: rekLengkap ? 'BNI' : null, cek_keu: keuLengkap, tolak_keu_catatan: null,
        nomor_rekening: rekLengkap ? '0092' + nik.slice(-8) : null, nama_pemilik_rek: rekLengkap ? nm.toUpperCase() : null,
        pendapatan_kotor_awal: 900000, biaya_awal: 450000, dibuat_oleh: pembuat[kode], dibuat_oleh_nama: 'Bambang Wijaya', dibuat_pada: t0, diubah_pada: t0,
      });
    }
    if (posisi >= URUT.indexOf('3') || status === 'selesai') {
      riwayatP(u.id, '1', 'SUBMIT', 'draft', 'menunggu', jml + ' PM'); riwayatP(u.id, '2', 'DISETUJUI', 'menunggu', 'proses', 'Lengkap');
    }
    if (posisi > URUT.indexOf('3') || status === 'selesai') {
      ['draft_sk', 'nota_dinas'].forEach((j) => db.berkas.push({ id: uid(), usulan_id: u.id, tahap: '3', jenis: j, nama: (j === 'draft_sk' ? 'Draft_SK_' : 'Nota_Dinas_') + u.no_register + '.docx', ukuran: 240000, mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', lokasi: 'tautan', tautan: 'https://docs.google.com/document/d/contoh', diunggah_nama: 'Bambang Wijaya', dibuat_pada: t0 }));
      db.penyaluran.push({ id: uid(), usulan_id: u.id, nama_petugas: ['Taufik Hidayat', 'Rian Hendrawan', 'Dewi Lestari', 'Yoseph Fernandez'][idx % 4], instansi: k.nama_pendek, no_hp: '0812-3456-78' + idx, tanggal: '2026-11-20', kabkota: kab[kode][0], semua_pm: true, nik_pm: [], dibuat_pada: t0, diubah_pada: t0 });
    }
    if (posisi > URUT.indexOf('4c') || status === 'selesai') tahapU(u.id, '4c').data = { tgl_kirim: '2026-11-10', pengirim: 'Anggota Pokja TU', penerima: 'Bpk. Bambang', hp_penerima: '0812-9876-5432' };
  });
  db.koreksi['us-4'] = { mak: '571112', _oleh: 'Yusuf Hidayat', _pada: sekarang() };
}

// ---------------------------------------------------------------- usulan
export async function tokenAkses() { return 'pratinjau'; }
function saringU(f = {}) {
  const s = String(f.q || '').toLowerCase();
  return db.usulan.filter(usulanTerlihat).map(usulanV).filter((u) =>
    (!s || [u.judul, u.no_register, u.no_sk, u.kabkota].some((v) => String(v || '').toLowerCase().includes(s)))
    && (!(Array.isArray(f.pokja) ? f.pokja.length : f.pokja) || (Array.isArray(f.pokja) ? f.pokja.includes(u.pokja_id) : u.pokja_id === f.pokja))
    && (!(Array.isArray(f.status) ? f.status.length : f.status) || (Array.isArray(f.status) ? f.status.includes(u.status) : u.status === f.status))
    && (!f.tahap || u.tahap_aktif === f.tahap) && (!f.tahapList?.length || u.tahap_aktif_list.some((t) => f.tahapList.includes(t)))
    && (!f.sumber || u.sumber === f.sumber));
}
export async function daftarUsulan(f = {}) {
  await tunggu(120); butuhSesi();
  const { hal = 1, per = 10, urut = 'diubah_pada' } = f;
  const r = saringU(f).sort((a, b) => (urut === 'judul' ? a.judul.localeCompare(b.judul) : String(b[urut] || '').localeCompare(String(a[urut] || ''))));
  return { baris: salin(r.slice((hal - 1) * per, hal * per)), total: r.length };
}
export async function statusUsulan(f = {}) { await tunggu(60); butuhSesi(); return saringU(f).map((u) => ({ status: u.status, tahap_aktif: u.tahap_aktif, tahap_aktif_list: u.tahap_aktif_list, jumlah_pm: u.jumlah_pm, nilai_total: u.nilai_total, link_profil: u.link_profil })); }
export async function usulanDetail(id) {
  await tunggu(140); butuhSesi();
  const u = db.usulan.find((x) => x.id === id);
  if (!u || !usulanTerlihat(u)) throw galat('Usulan tidak ditemukan atau Anda tidak memiliki akses.');
  return salin({ usulan: usulanV(u), tahap: db.tahap.filter((x) => x.usulan_id === id), riwayat: db.riwayat.filter((x) => x.usulan_id === id),
    berkas: db.berkas.filter((x) => x.usulan_id === id && !x.dihapus), penyaluran: db.penyaluran.filter((x) => x.usulan_id === id) });
}
export async function bnbaUsulan(id) { await tunggu(80); butuhSesi(); return db.bnba.filter((b) => b.usulan_id === id && bnbaTerlihat(b)).map(tampilBnba); }
export async function bnbaDraft(id) {
  const u = ambilU(id);
  if (!bolehTahapP(u.pokja_id, '1')) throw galat('Usulan tidak ditemukan.');
  log('LIHAT_DATA_SENSITIF', 'usulan', id, 'Membuka formulir BNBA ' + u.no_register); simpan();
  return salin(db.bnba.filter((b) => b.usulan_id === id)).map((b) => ({ ...b, laba_awal: (b.pendapatan_kotor_awal || 0) - (b.biaya_awal || 0) }));
}
export async function simpanUsulan(d) {
  await tunggu(120); butuhSesi();
  if (!isPeg()) throw galat('Akses ditolak.', '42501');
  const judul = String(d.judul || '').trim(), link = String(d.link_profil || '').trim() || null;
  if (judul.length < 5) throw galat('Judul usulan wajib diisi (minimal 5 huruf).');
  if (link && !/^https?:\/\//i.test(link)) throw galat('Link profil asesmen harus diawali http:// atau https://');
  let u;
  if (!d.id) {
    const pk = d.pokja_id || pokjaEf().map((e) => pokjaById(e.pokja_id)).sort((a, b) => (a.kelompok === 'teknis' ? -1 : 1) - (b.kelompok === 'teknis' ? -1 : 1) || a.urutan - b.urutan)[0]?.id;
    if (!pk || !(idsPokja().includes(pk) || isSA())) throw galat('Usulan hanya dapat dibuat untuk Pokja Anda sendiri.', '42501');
    u = { id: uid(), no_register: `USL-${SINGKAT[pokjaById(pk).kode]}-${new Date().toISOString().slice(0, 7).replace('-', '')}-${pad4(++db.seq_u)}`, judul, kategori: d.kategori || 'Bantuan ATENSI',
      pokja_id: pk, link_profil: link, status: 'draft', tahap_aktif: '1', catatan_terakhir: null, no_sk: null, tgl_sk: null, link_sk: null, tgl_cair: null,
      usulan_asal_id: null, usulan_baru_id: null, sumber: 'web', dibuat_oleh: sayaAktif().id, dibuat_pada: sekarang(), tgl_submit: null, diubah_pada: sekarang() };
    db.usulan.unshift(u);
    URUT.forEach((t) => db.tahap.push({ usulan_id: u.id, tahap: t, status: t === '1' ? 'aktif' : 'terkunci', data: {}, catatan: null, pic_nama: null, mulai_pada: t === '1' ? sekarang() : null, selesai_pada: null }));
    riwayatP(u.id, '1', 'DIBUAT', null, 'draft');
  } else {
    u = ambilU(d.id);
    if (!bolehTahapP(u.pokja_id, '1')) throw galat('Anda tidak berwenang mengubah usulan ini.', '42501');
    if (!['draft', 'perlu_perbaikan'].includes(u.status)) throw galat('Usulan yang sudah diajukan tidak dapat diubah.');
    Object.assign(u, { judul, link_profil: link, kategori: d.kategori || u.kategori, diubah_pada: sekarang() });
  }
  simpan();
  return salin(u);
}
function tulisB(u, r, st) {
  let b = db.bnba.find((x) => x.nik === r.nik);
  if (b && b.usulan_id !== u.id) return 'NIK_ADA';
  const jk = jenisDariKategori(u.kategori); if (jk) r.jenis_bantuan = jk;
  if (Array.isArray(r.rincian_item) && r.rincian_item.length) {
    r.nilai_bantuan = String(totalRincian(r.rincian_item));
    r.rincian_barang = ringkasRincian(r.rincian_item);
  } else if ('rincian_item' in r) r.rincian_item = null;
  angkaKe(r);
  if (!b) {
    b = { id: uid(), usulan_id: u.id, pokja_id: u.pokja_id, status_verifikasi: st, dibuat_oleh: sayaAktif()?.id, dibuat_oleh_nama: namaSaya(), dibuat_pada: sekarang() };
    KOLOM_T.forEach((k) => { b[k] = r[k] ?? null; });
    b.rincian_item = r.rincian_item ?? null; b.cek_keu = false; b.tolak_keu_catatan = null;
    b.nama = String(b.nama).toUpperCase(); b.diubah_pada = sekarang();
    db.bnba.push(b);
    return 'TAMBAH';
  }
  Object.assign(b, r, { nama: r.nama ? String(r.nama).toUpperCase() : b.nama, diubah_pada: sekarang() });
  return 'UBAH';
}
export async function simpanBnba(usulanId, d) {
  await tunggu(90); butuhSesi();
  const u = ambilU(usulanId);
  if (!bolehTahapP(u.pokja_id, '1')) throw galat('Anda tidak berwenang mengubah usulan ini.', '42501');
  if (!['draft', 'perlu_perbaikan'].includes(u.status)) throw galat('Usulan sudah diajukan dan terkunci.');
  const r = normalBnba(d), e = cekBnba(r);
  if (e) throw galat(e);
  if (d.id) {
    const b = db.bnba.find((x) => x.id === d.id && x.usulan_id === u.id);
    if (b && b.nik !== r.nik) {
      if (db.bnba.some((x) => x.nik === r.nik)) throw galat(`NIK ${r.nik} sudah terdaftar di Central Database BNBA.`, 'P0002');
      b.nik = r.nik;
    }
  } else {
    const ada = db.bnba.find((x) => x.nik === r.nik && x.usulan_id === u.id);
    if (ada) throw galat(`NIK ${r.nik} sudah ada di usulan ini (PM atas nama ${ada.nama}). Buka PM tersebut untuk mengubah datanya.`, 'P0002');
  }
  const h = tulisB(u, r, u.status === 'perlu_perbaikan' ? 'perlu_perbaikan' : 'draft');
  if (h === 'NIK_ADA') { const lain = ambilU(db.bnba.find((x) => x.nik === r.nik).usulan_id); throw galat(`NIK ${r.nik} sudah terdaftar di usulan lain (${lain.no_register}). Satu NIK hanya boleh satu kali.`, 'P0002'); }
  u.diubah_pada = sekarang(); simpan();
  return { hasil: h, id: db.bnba.find((x) => x.nik === r.nik).id };
}
export async function hapusBnba(id) {
  const b = db.bnba.find((x) => x.id === id); if (!b) throw galat('Data tidak ditemukan.');
  const u = ambilU(b.usulan_id);
  if (!bolehTahapP(u.pokja_id, '1')) throw galat('Anda tidak berwenang.', '42501');
  if (!['draft', 'perlu_perbaikan'].includes(u.status)) throw galat('Usulan sudah diajukan dan terkunci.');
  db.bnba = db.bnba.filter((x) => x.id !== id); simpan();
}
export async function imporBnba(usulanId, rows, uji = true) {
  await tunggu(300); butuhSesi();
  const u = ambilU(usulanId);
  if (!bolehTahapP(u.pokja_id, '1')) throw galat('Anda tidak berwenang.', '42501');
  if (!['draft', 'perlu_perbaikan'].includes(u.status)) throw galat('Impor hanya untuk usulan Draft atau Perlu Perbaikan.');
  let tambah = 0, ubah = 0; const gagal = [], lihat = new Set();
  rows.forEach((x, i) => {
    const r = normalBnba(x); let e = cekBnba(r);
    if (!e && lihat.has(r.nik)) e = 'NIK ganda di dalam berkas impor';
    const ada = db.bnba.find((b) => b.nik === r.nik);
    if (!e && ada && ada.usulan_id !== u.id) e = `NIK sudah terdaftar di usulan lain (${ambilU(ada.usulan_id).no_register})`;
    if (e) { gagal.push({ baris: x._baris || i + 1, nik: r.nik, nama: r.nama, alasan: e }); return; }
    lihat.add(r.nik);
    if (uji) { ada ? ubah++ : tambah++; return; }
    tulisB(u, r, u.status === 'perlu_perbaikan' ? 'perlu_perbaikan' : 'draft') === 'TAMBAH' ? tambah++ : ubah++;
  });
  if (!uji) { log('IMPOR', 'usulan', u.id, `Impor BNBA ke ${u.no_register}: ${tambah} ditambah, ${ubah} diperbarui, ${gagal.length} gagal`); simpan(); }
  return { uji, ditambah: tambah, diperbarui: ubah, gagal };
}
export async function ajukanUsulan(id) {
  await tunggu(150); butuhSesi();
  const u = ambilU(id), b = db.bnba.filter((x) => x.usulan_id === id);
  if (!bolehTahapP(u.pokja_id, '1')) throw galat('Anda tidak berwenang.', '42501');
  if (!['draft', 'perlu_perbaikan'].includes(u.status)) throw galat('Usulan sudah diajukan.');
  if (!b.length) throw galat('Usulan belum berisi PM. Tambahkan minimal satu PM.');
  if (!u.link_profil) throw galat('Link profil asesmen wajib diisi sebelum submit.');
  const kurangPM = b.filter((x) => kolomKurang(x).length);
  if (kurangPM.length) throw galat(`${kurangPM.length} PM belum lengkap (contoh: ${[...kurangPM].sort((p1, p2) => p1.nama.localeCompare(p2.nama))[0].nama}). Wajib: klaster, jenis & nilai bantuan, MAK, alamat KTP lengkap, provinsi & kab/kota penyaluran, desil (1–10), No. KK, nama ibu kandung, tanggal lahir.`);
  const lama = u.status;
  Object.assign(u, { status: 'menunggu', tgl_submit: sekarang(), catatan_terakhir: null });
  b.forEach((x) => { x.status_verifikasi = 'menunggu'; });
  Object.assign(tahapU(id, '1'), { status: 'selesai', selesai_pada: sekarang(), pic_nama: namaSaya() });
  tahapU(id, '2').status = 'terkunci';
  riwayatP(id, '1', 'SUBMIT', lama, 'menunggu', b.length + ' PM');
  bukaT(id, '2'); segarkanT(id); simpan();
  return { ok: true };
}
export async function verifikasiKapokja(id, setuju, catatan = null) {
  await tunggu(150); butuhSesi();
  const u = ambilU(id);
  if (!bolehTahapP(u.pokja_id, '2')) throw galat('Hanya Kapokja Pokja pemilik usulan yang dapat memverifikasi.', '42501');
  if (u.status !== 'menunggu') throw galat('Usulan tidak sedang menunggu verifikasi.');
  const b = db.bnba.filter((x) => x.usulan_id === id);
  if (setuju) {
    Object.assign(u, { status: 'proses', catatan_terakhir: catatan || null });
    b.forEach((x) => { x.status_verifikasi = 'terverifikasi'; });
    Object.assign(tahapU(id, '2'), { status: 'selesai', selesai_pada: sekarang(), pic_nama: namaSaya(), catatan: catatan || null });
    riwayatP(id, '2', 'DISETUJUI', 'menunggu', 'proses', catatan); bukaT(id, '3');
  } else {
    if (!String(catatan || '').trim()) throw galat('Catatan pengembalian wajib diisi.');
    Object.assign(u, { status: 'perlu_perbaikan', catatan_terakhir: catatan });
    b.forEach((x) => { x.status_verifikasi = 'perlu_perbaikan'; });
    Object.assign(tahapU(id, '2'), { status: 'terkunci', catatan });
    Object.assign(tahapU(id, '1'), { status: 'aktif', selesai_pada: null });
    riwayatP(id, '2', 'DIKEMBALIKAN', 'menunggu', 'perlu_perbaikan', catatan);
    beriTahu(anggotaPokja(u.pokja_id), 'USULAN_DIKEMBALIKAN', 'Usulan dikembalikan Kapokja', `Usulan "${u.judul}" (${u.no_register}) perlu diperbaiki. Catatan: ${catatan}`, '#/usulan/' + id);
  }
  segarkanT(id); simpan();
  return { ok: true };
}
const adaBerkas = (id, j) => db.berkas.some((x) => x.usulan_id === id && x.jenis === j && !x.dihapus);
export async function prosesTahap(id, t, aksi, data = {}, catatan = null) {
  await tunggu(160); butuhSesi();
  const u = ambilU(id), x = tahapU(id, t), cat = String(catatan || '').trim() || null;
  if (!bolehTahapP(u.pokja_id, t)) throw galat(`Peran Anda tidak berwenang mengisi Tahap ${t} (${NAMA_T[t]}).`, '42501');
  if (u.status !== 'proses') throw galat(`Usulan tidak sedang diproses (status: ${u.status}).`);
  if (x.status !== 'aktif' && !(aksi === 'simpan' && t === '5' && x.status === 'terkunci')) throw galat(`Tahap ${t} belum terbuka atau sudah selesai. Tahap tidak dapat dilewati.`);
  const { _penerima, ...dataBersih } = data || {};
  penerimaPilih = Array.isArray(_penerima) && _penerima.length ? _penerima : null;
  try { return await prosesTahapInti(id, t, aksi, dataBersih, cat, u, x); } finally { penerimaPilih = null; }
}
async function prosesTahapInti(id, t, aksi, data, cat, u, x) {
  const d = { ...x.data, ...data };
  if (aksi === 'simpan') { x.data = d; if (cat) x.catatan = cat; simpan(); return { ok: true, data: d }; }
  if (aksi === 'kembalikan' || aksi === 'tolak') {
    if (!['3b', '4a', '4b', '4c'].includes(t)) throw galat('Pengembalian atau penolakan hanya pada tahap 3b, 4a, 4b, dan 4c.');
    if (!cat) throw galat('Alasan wajib diisi.');
    if (aksi === 'kembalikan') {
      ['3b', '4a', '4b', '4c'].forEach((y) => Object.assign(tahapU(id, y), { status: 'terkunci', mulai_pada: null }));
      Object.assign(tahapU(id, '3'), { status: 'aktif', selesai_pada: null, catatan: cat });
      u.catatan_terakhir = cat; riwayatP(id, t, 'DIKEMBALIKAN', t, '3', cat);
      beriTahu(anggotaPokja(u.pokja_id), 'USULAN_DIKEMBALIKAN', 'Usulan SK dikembalikan ke Tahap 3', `Usulan "${u.judul}" (${u.no_register}) dikembalikan pada Tahap ${t}. Alasan: ${cat}`, '#/usulan/' + id);
    } else {
      Object.assign(u, { status: 'ditolak', catatan_terakhir: cat }); x.catatan = cat;
      riwayatP(id, t, 'DITOLAK', 'proses', 'ditolak', cat);
      beriTahu(anggotaPokja(u.pokja_id), 'USULAN_DITOLAK', 'Usulan SK ditolak', `Usulan "${u.judul}" (${u.no_register}) ditolak pada Tahap ${t}. Alasan: ${cat}. Usulan dapat diajukan ulang sebagai usulan baru.`, '#/usulan/' + id);
    }
    segarkanT(id); simpan(); return { ok: true };
  }
  const b = db.bnba.filter((y) => y.usulan_id === id);
  const kurang = {
    3: !adaBerkas(id, 'draft_sk') ? 'Unggah naskah Draft SK.' : !adaBerkas(id, 'nota_dinas') ? 'Unggah Nota Dinas.' : null,
    '4b': !d.tgl_masuk_direktur ? 'Isi tanggal masuk ke Direktur.' : null,
    '4c': !(d.tgl_kirim && d.pengirim && d.penerima && d.hp_penerima) ? 'Lengkapi tanggal kirim, nama pengirim, nama penerima, dan nomor HP penerima di Sekretariat.' : null,
    5: b.some((y) => y.tolak_keu_catatan) ? 'Masih ada PM yang dikembalikan ke Pokja dan belum diperbaiki.' : b.some((y) => !y.akun_bantuan) ? 'Masih ada PM tanpa akun bantuan.' : b.some((y) => !y.cek_keu) ? 'Masih ada PM yang belum dicentang "sudah dicek".' : null,
    6: !d.sk_selesai ? 'Centang "SK sudah selesai".' : !(d.no_sk && d.tgl_sk) ? 'Isi NO SK dan TGL SK.' : !adaBerkas(id, 'sk_final') ? 'Unggah scan SK TTD final.' : null,
    7: !adaBerkas(id, 'surat_burekol') ? 'Unggah Surat Penyampaian Data Bantuan ATENSI.' : null,
    '7b': b.some((y) => y.koreksi_bank_catatan) ? 'Masih ada koreksi data PM dari bank yang belum diperbaiki.' : b.some((y) => !y.nama_bank || !y.nomor_rekening) ? 'Masih ada PM tanpa nama bank atau nomor rekening.' : null,
    8: !d.sp2d_terbit ? 'Centang "SP2D sudah terbit".' : b.some((y) => !y.nama_bank || !y.nomor_rekening) ? 'Masih ada PM tanpa nama bank atau nomor rekening.' : null,
    9: !(d.no_sp2d && d.tgl_sp2d && d.bulan_sp2d) ? 'Isi NO SP2D, TGL SP2D, dan BULAN (SP2D).' : null,
    10: !d.si_selesai ? 'Centang "SI sudah selesai".' : null,
    11: !(d.dikonfirmasi && d.tgl_cair) ? 'Konfirmasi pencairan dan isi tanggal cair.' : null,
  }[t];
  if (kurang) throw galat(`Tahap ${t} belum dapat diselesaikan: ${kurang}`);
  if (t === '4a') { d.tanggal ||= new Date().toISOString().slice(0, 10); d.petugas ||= namaSaya(); }
  Object.assign(x, { status: 'selesai', data: d, catatan: cat || x.catatan, selesai_pada: sekarang(), pic_nama: namaSaya() });
  if (t === '6') Object.assign(u, { no_sk: d.no_sk, tgl_sk: d.tgl_sk, link_sk: db.berkas.find((y) => y.usulan_id === id && y.jenis === 'sk_final' && !y.dihapus && y.tautan)?.tautan || null });
  if (t === '9') b.forEach((y) => Object.assign(y, { no_sp2d: d.no_sp2d, tgl_sp2d: d.tgl_sp2d, bulan_sp2d: d.bulan_sp2d }));
  if (t === '11') Object.assign(u, { status: 'selesai', tgl_cair: d.tgl_cair });
  riwayatP(id, t, 'SELESAI', 'aktif', 'selesai', cat);
  const lanjut = { 3: ['3b'], '3b': ['4a'], '4a': ['4b'], '4b': ['4c'], '4c': ['5', '6'], 7: ['7b'], '7b': ['8'], 8: ['9'], 9: ['10'], 10: ['11'] }[t] || [];
  if (['5', '6'].includes(t) && tahapU(id, '5').status === 'selesai' && tahapU(id, '6').status === 'selesai') lanjut.push('7');
  lanjut.forEach((y) => bukaT(id, y));
  if (t === '11') beriTahu(anggotaPokja(u.pokja_id), 'USULAN_SELESAI', 'Bantuan sudah cair', `Usulan "${u.judul}" (${u.no_register}) sudah dicairkan.`, '#/usulan/' + id);
  else beriTahu(anggotaPokja(u.pokja_id), 'PROGRES_USULAN', `Tahap ${t} selesai`, `Usulan "${u.judul}" (${u.no_register}): Tahap ${t} — ${NAMA_T[t]} selesai.`, '#/usulan/' + id);
  segarkanT(id); simpan();
  return { ok: true };
}
export async function ajukanUlang(id) {
  const u = ambilU(id);
  if (!bolehTahapP(u.pokja_id, '1')) throw galat('Anda tidak berwenang.', '42501');
  if (u.status !== 'ditolak' || u.usulan_baru_id) throw galat('Hanya usulan ditolak yang dapat diajukan ulang (sekali).');
  const baru = await simpanUsulan({ judul: u.judul + ' (ajuan ulang)', kategori: u.kategori, pokja_id: u.pokja_id, link_profil: u.link_profil });
  const nb = ambilU(baru.id); nb.usulan_asal_id = u.id; u.usulan_baru_id = nb.id;
  db.bnba.filter((b) => b.usulan_id === id).forEach((b) => { b.usulan_id = nb.id; b.status_verifikasi = 'draft'; });
  db.berkas.filter((b) => b.usulan_id === id && !b.dihapus).forEach((b) => db.berkas.push({ ...salin(b), id: uid(), usulan_id: nb.id }));
  riwayatP(id, null, 'DIAJUKAN_ULANG', 'ditolak', 'ditolak', 'Menjadi ' + nb.no_register); riwayatP(nb.id, '1', 'AJUAN_ULANG', null, 'draft', 'Dari ' + u.no_register);
  simpan(); return salin(nb);
}
export async function hapusUsulan(id) {
  const u = ambilU(id);
  if (!bolehTahapP(u.pokja_id, '1')) throw galat('Anda tidak berwenang.', '42501');
  if (u.status !== 'draft' || u.tgl_submit) throw galat('Hanya Draft yang belum pernah diajukan yang dapat dihapus.');
  db.bnba = db.bnba.filter((b) => b.usulan_id !== id); db.usulan = db.usulan.filter((x) => x.id !== id); db.tahap = db.tahap.filter((x) => x.usulan_id !== id);
  log('HAPUS', 'usulan', id, 'Menghapus draft usulan ' + u.no_register); simpan();
}
export async function dataPencairan(id) {
  await tunggu(100); const u = ambilU(id); if (!usulanTerlihat(u)) throw galat('Usulan tidak ditemukan.');
  const penuh = bolehPenuhP(u.pokja_id);
  if (penuh) { log('LIHAT_DATA_SENSITIF', 'usulan', id, 'Membuka Data Pencairan ' + u.no_register); simpan(); }
  return { penuh, usulan: { id: u.id, no_register: u.no_register, judul: u.judul, kategori: u.kategori, no_sk: u.no_sk, tgl_sk: u.tgl_sk },
    baris: db.bnba.filter((b) => b.usulan_id === id).sort((a, b) => a.nama.localeCompare(b.nama)).map((b) => ({ id: b.id, nik: b.nik, nama: b.nama,
      nama_ibu: penuh ? b.nama_ibu : samarNama(b.nama_ibu), ktp_provinsi: b.ktp_provinsi, ktp_kabkota: b.ktp_kabkota, ktp_kecamatan: b.ktp_kecamatan, ktp_kelurahan: b.ktp_kelurahan,
      ktp_jalan: penuh ? b.ktp_jalan : samarAlamat(b.ktp_jalan), klaster_ppks: b.klaster_ppks, jenis_bantuan: b.jenis_bantuan, nilai_bantuan: b.nilai_bantuan, mak: b.mak,
      akun_bantuan: b.akun_bantuan, nama_bank: b.nama_bank, nomor_rekening: penuh ? b.nomor_rekening : samarAngka(b.nomor_rekening), nama_pemilik_rek: b.nama_pemilik_rek,
      cek_keu: !!b.cek_keu, tolak_keu_catatan: b.tolak_keu_catatan || null })) };
}
// Tahap 5: Keuangan mencentang "sudah dicek", mengisi akun bantuan, atau memperbaiki data per PM (bank & rekening baru di Tahap 8).
export async function simpanDataPencairan(id, rows) {
  await tunggu(150); const u = ambilU(id);
  if (!bolehTahapP(u.pokja_id, '5')) throw galat('Hanya Pokja Keuangan yang mengisi Data Pencairan.', '42501');
  if (u.status !== 'proses' || tahapU(id, '5').status === 'selesai') throw galat('Data Pencairan usulan ini sudah dikunci.');
  let n = 0;
  for (const x of rows) {
    const b = db.bnba.find((y) => y.id === x.id && y.usulan_id === id); if (!b) continue;
    const { id: _i, nik: _n, cek_keu, nama_bank: _nb, nomor_rekening: _nr, nama_pemilik_rek: _np, rek_giro_bni: _rg, ...sisa } = x;
    const r = normalBnba(sisa); delete r.nik;
    const e = cekBnba({ ...r, nama: r.nama || b.nama, nik: b.nik }); if (e) throw galat(`${e} (PM ${b.nama})`);
    const adaData = Object.keys(r).some((k) => k !== 'akun_bantuan');
    const jk = jenisDariKategori(u.kategori); if (jk && 'jenis_bantuan' in r) r.jenis_bantuan = jk;
    if (Array.isArray(r.rincian_item) && r.rincian_item.length) { r.nilai_bantuan = String(totalRincian(r.rincian_item)); r.rincian_barang = ringkasRincian(r.rincian_item); }
    else if ('rincian_item' in r) r.rincian_item = null;
    angkaKe(r);
    Object.assign(b, r); if (r.nama) b.nama = String(r.nama).toUpperCase();
    if (b.akun_bantuan) b.mak = b.akun_bantuan; // MAK = akun bantuan yang ditetapkan Keuangan
    if (adaData) b.cek_keu = false;
    if ('cek_keu' in x) {
      if (x.cek_keu && b.tolak_keu_catatan) throw galat(`PM ${b.nama} dikembalikan ke Pokja dan belum diperbaiki; tidak dapat dicentang.`);
      b.cek_keu = !!x.cek_keu; b.cek_keu_oleh = x.cek_keu ? namaSaya() : null;
    }
    n++;
  }
  simpan(); return { ok: true, diperbarui: n };
}
export async function tolakPmKeuangan(id, bnbaId, catatan) {
  await tunggu(120); const u = ambilU(id), cat = String(catatan || '').trim();
  if (!bolehTahapP(u.pokja_id, '5')) throw galat('Hanya Pokja Keuangan yang dapat mengembalikan PM.', '42501');
  if (u.status !== 'proses' || tahapU(id, '5').status === 'selesai') throw galat('Data Pencairan usulan ini sudah dikunci.');
  if (!cat) throw galat('Catatan untuk Pokja wajib diisi.');
  const b = db.bnba.find((y) => y.id === bnbaId && y.usulan_id === id); if (!b) throw galat('PM tidak ditemukan.');
  Object.assign(b, { tolak_keu_catatan: cat, tolak_keu_oleh: namaSaya(), cek_keu: false });
  riwayatP(id, '5', 'PM_DIKEMBALIKAN', null, null, `${b.nama}: ${cat}`);
  beriTahu(anggotaPokja(u.pokja_id), 'PM_DITOLAK_KEUANGAN', 'PM dikembalikan Keuangan', `PM ${b.nama} pada usulan "${u.judul}" (${u.no_register}) perlu diperbaiki. Catatan: ${cat}`, '#/usulan/' + id);
  simpan(); return { ok: true };
}
export async function perbaikiPmDitolak(bnbaId, data) {
  await tunggu(120); const b = db.bnba.find((y) => y.id === bnbaId); if (!b) throw galat('PM tidak ditemukan.');
  const u = ambilU(b.usulan_id);
  if (!bolehTahapP(u.pokja_id, '1')) throw galat('Anda tidak berwenang.', '42501');
  if (u.status !== 'proses' || tahapU(u.id, '5').status === 'selesai') throw galat('Data Pencairan usulan ini sudah dikunci.');
  if (!b.tolak_keu_catatan) throw galat('PM ini tidak sedang dikembalikan oleh Keuangan.');
  const { id: _i, nik: _n, nama_bank: _nb, nomor_rekening: _nr, nama_pemilik_rek: _np, rek_giro_bni: _rg, akun_bantuan: _ab, ...sisa } = data || {};
  const r = normalBnba(sisa); delete r.nik;
  const e = cekBnba({ ...r, nama: r.nama || b.nama, nik: b.nik }); if (e) throw galat(e);
  const jk = jenisDariKategori(u.kategori); if (jk && 'jenis_bantuan' in r) r.jenis_bantuan = jk;
  if (Array.isArray(r.rincian_item) && r.rincian_item.length) { r.nilai_bantuan = String(totalRincian(r.rincian_item)); r.rincian_barang = ringkasRincian(r.rincian_item); }
  else if ('rincian_item' in r) r.rincian_item = null;
  angkaKe(r); Object.assign(b, r); if (r.nama) b.nama = String(r.nama).toUpperCase();
  Object.assign(b, { tolak_keu_catatan: null, tolak_keu_oleh: null, cek_keu: false });
  riwayatP(u.id, '5', 'PM_DIPERBAIKI', null, null, b.nama);
  beriTahu(penerimaTahap(u.pokja_id, '5'), 'PM_DIPERBAIKI', 'PM sudah diperbaiki Pokja', `PM ${b.nama} pada usulan "${u.judul}" (${u.no_register}) sudah diperbaiki dan siap dicek ulang.`, '#/usulan/' + u.id);
  simpan(); return { ok: true };
}
// Tahap 8 (SP2D): nama bank & nomor rekening per PM
export async function simpanRekeningSp2d(id, rows) {
  await tunggu(120); const u = ambilU(id);
  const tr = tahapU(id, '7b')?.status === 'aktif' ? '7b' : '8';
  if (!bolehTahapP(u.pokja_id, tr)) throw galat('Hanya Petugas Bank atau Pokja Keuangan yang mengisi rekening.', '42501');
  if (u.status !== 'proses' || tahapU(id, tr).status !== 'aktif') throw galat('Nomor rekening hanya dapat diisi saat tahap Pengisian Rekening Bank atau SP2D aktif.');
  let n = 0;
  for (const x of rows || []) {
    const rek = String(x.nomor_rekening || '').replace(/[\s.-]/g, ''), bank = String(x.nama_bank || '').trim() || null, pem = String(x.nama_pemilik_rek || '').trim() || null;
    if (rek && !/^\d{6,20}$/.test(rek)) throw galat(`Nomor rekening ${rek} tidak valid (6–20 digit angka).`);
    const b = db.bnba.find((y) => y.id === x.id && y.usulan_id === id); if (!b) continue;
    Object.assign(b, { nama_bank: bank, nomor_rekening: rek || null, nama_pemilik_rek: pem || b.nama }); n++;
  }
  simpan(); return { ok: true, diperbarui: n };
}
// Calon penerima notifikasi tahap berikutnya (dipilih pengirim saat menyelesaikan tahap)
export async function calonPenerima(id, t) {
  await tunggu(60); const u = ambilU(id);
  if (!bolehTahapP(u.pokja_id, t)) return [];
  const sel = (x) => tahapU(id, x)?.status === 'selesai';
  if (t === '3') return db.pengguna.filter((p) => p.aktif && db.pengguna_pokja.some((pp) => pp.pengguna_id === p.id && pp.pokja_id === u.pokja_id && pp.jabatan === 'kapokja'))
    .map((p) => ({ id: p.id, nama: p.nama, jabatan: 'kapokja', kelompok: pokjaById(u.pokja_id).kode, kelompok_nama: pokjaById(u.pokja_id).nama_pendek }));
  if (t === '7') return db.pengguna.filter((p) => p.aktif && p.jenis_akses === 'petugas_bank').map((p) => ({ id: p.id, nama: p.nama, jabatan: 'bank', kelompok: 'BANK', kelompok_nama: 'Petugas Bank' }));
  const kode = { '3b': ['TU'], '7b': ['KEUANGAN'], '4a': ['TU'], '4b': ['TU'], '4c': ['TU', 'KEUANGAN'], 5: sel('6') ? ['KEUANGAN'] : [], 6: sel('5') ? ['KEUANGAN'] : [], 7: ['KEUANGAN'], 8: ['KEUANGAN'], 9: ['KEUANGAN'], 10: ['KEUANGAN'] }[t] || [];
  const hasil = [];
  db.pengguna.filter((p) => p.aktif && p.jenis_akses === 'pegawai').forEach((p) => db.pengguna_pokja.filter((pp) => pp.pengguna_id === p.id).forEach((pp) => {
    const k = pokjaById(pp.pokja_id); if (!k || !kode.includes(k.kode) || hasil.some((h) => h.id === p.id && h.kelompok === k.kode)) return;
    hasil.push({ id: p.id, nama: p.nama, jabatan: pp.jabatan, kelompok: k.kode, kelompok_nama: k.nama_pendek });
  }));
  return hasil.sort((a, b) => a.kelompok.localeCompare(b.kelompok) || (b.jabatan === 'kapokja') - (a.jabatan === 'kapokja') || a.nama.localeCompare(b.nama));
}
export async function simpanPenyaluran(id, d) {
  await tunggu(100); const u = ambilU(id);
  if (!(isSA() || diPokja('TU') || idsPokja().includes(u.pokja_id))) throw galat('Log penyalur diisi oleh Pokja terkait, Tata Usaha, atau Super Admin.', '42501');
  if (!String(d.nama_petugas || '').trim()) throw galat('Nama petugas wajib diisi.');
  const v = { nama_petugas: d.nama_petugas.trim(), instansi: d.instansi || null, no_hp: d.no_hp || null, tanggal: d.tanggal || null, kabkota: d.kabkota || null,
    semua_pm: d.semua_pm !== false, nik_pm: d.nik_pm || [], diubah_pada: sekarang() };
  let r = d.id && db.penyaluran.find((x) => x.id === d.id && x.usulan_id === id);
  if (r) Object.assign(r, v); else { r = { id: uid(), usulan_id: id, ...v, dibuat_pada: sekarang() }; db.penyaluran.push(r); }
  log(d.id ? 'UPDATE' : 'INSERT', 'penyaluran_log', r.id, 'Log petugas penyalur ' + u.no_register, v); simpan();
  return salin(r);
}
export async function hapusPenyaluran(pid) {
  const r = db.penyaluran.find((x) => x.id === pid); if (!r) throw galat('Data tidak ditemukan.');
  const u = ambilU(r.usulan_id);
  if (!(isSA() || diPokja('TU') || idsPokja().includes(u.pokja_id))) throw galat('Anda tidak berwenang.', '42501');
  db.penyaluran = db.penyaluran.filter((x) => x.id !== pid); simpan();
}
export async function tambahTautanBerkas(id, t, jenis, nama, url) {
  const u = ambilU(id);
  if (!bolehTahapP(u.pokja_id, t) && !(JENIS_L.includes(jenis) && bolehLanjutan(u))) throw galat('Anda tidak berwenang mengunggah berkas tahap ini.', '42501');
  if (!/^https:\/\//i.test(url || '')) throw galat('Tautan harus diawali https://');
  const r = { id: uid(), usulan_id: id, tahap: t, jenis, nama: nama || jenis, ukuran: null, mime: null, lokasi: 'tautan', tautan: url, diunggah_nama: namaSaya(), dibuat_pada: sekarang() };
  db.berkas.push(r); simpan(); return salin(r);
}
export async function ringkasanUsulan() {
  await tunggu(80);
  const v = db.usulan.filter(usulanTerlihat).filter((u) => u.status !== 'draft').map(usulanV);
  const per = {}; v.filter((u) => u.status === 'proses').forEach((u) => { per[u.tahap_aktif] = (per[u.tahap_aktif] || 0) + 1; });
  return { aktif: v.filter((u) => ['menunggu', 'proses', 'perlu_perbaikan'].includes(u.status)).length, proses: v.filter((u) => u.status === 'proses').length,
    selesai: v.filter((u) => u.status === 'selesai').length, perbaikan: v.filter((u) => u.status === 'perlu_perbaikan' || (u.status === 'proses' && u.tahap_aktif === '3' && tahapU(u.id, '3')?.catatan)).length,
    ditolak: v.filter((u) => u.status === 'ditolak').length, nilai_selesai: v.filter((u) => u.status === 'selesai').reduce((a, u) => a + u.nilai_total, 0),
    nilai_total: db.bnba.filter((b) => b.status_verifikasi === 'terverifikasi').reduce((a, b) => a + (Number(b.nilai_bantuan) || 0), 0), per_tahap: per };
}

// ---------------------------------------------------------------- Master BNBA & Detail PM
function saringB(f = {}) {
  const s = String(f.q || '').trim().toLowerCase();
  return db.bnba.filter(bnbaTerlihat).filter((b) => (!s || (/^\d+$/.test(s) ? b.nik.startsWith(s) : b.nama.toLowerCase().includes(s)))
    && (!f.pokja || b.pokja_id === f.pokja) && (!f.klaster || b.klaster_ppks === f.klaster) && (!f.status || b.status_verifikasi === f.status)
    && (!f.provinsi || b.ktp_provinsi === f.provinsi) && (!f.kabkota || String(b.ktp_kabkota || '').toLowerCase().includes(String(f.kabkota).toLowerCase()))
    && (!f.jenis || b.jenis_bantuan === f.jenis));
}
export async function daftarBnba(f = {}) {
  await tunggu(140); butuhSesi();
  const { hal = 1, per = 50 } = f;
  const r = saringB(f).sort((a, b) => b.dibuat_pada.localeCompare(a.dibuat_pada));
  return { baris: r.slice((hal - 1) * per, hal * per).map((b) => { const u = ambilU(b.usulan_id), k = pokjaById(b.pokja_id);
    return { ...tampilBnba(b), usulan: { no_register: u.no_register, judul: u.judul, status: u.status, tahap_aktif: u.tahap_aktif, no_sk: u.no_sk },
      pokja: { nama_pendek: k.nama_pendek, warna: k.warna, warna_tint: k.warna_tint, warna_teks: k.warna_teks } }; }), total: r.length };
}
export async function ringkasanBnba(f = {}) {
  await tunggu(70);
  const r = db.bnba.filter(bnbaTerlihat).filter((b) => !f.pokja_id || b.pokja_id === f.pokja_id);
  const st = (s) => r.filter((b) => b.status_verifikasi === s).length;
  return { total: r.length, terverifikasi: st('terverifikasi'), menunggu: st('menunggu'), perlu_perbaikan: st('perlu_perbaikan'), draft: st('draft'),
    sudah_cair: r.filter((b) => ambilU(b.usulan_id).status === 'selesai').length,
    nilai_total: r.filter((b) => b.status_verifikasi === 'terverifikasi').reduce((a, b) => a + (Number(b.nilai_bantuan) || 0), 0) };
}
export async function bnbaPerNik(nik) {
  await tunggu(120); butuhSesi();
  const b = db.bnba.find((x) => x.nik === nik);
  if (!b || !bnbaTerlihat(b)) throw galat('PM dengan NIK ' + nik + ' tidak ditemukan atau belum terverifikasi.');
  const u = ambilU(b.usulan_id), k = pokjaById(b.pokja_id);
  return salin({ bnba: { ...tampilBnba(b), pokja: { nama_pendek: k.nama_pendek, warna: k.warna, warna_tint: k.warna_tint, warna_teks: k.warna_teks } },
    usulan: usulanV(u), tahap: db.tahap.filter((x) => x.usulan_id === u.id), penyaluran: db.penyaluran.filter((x) => x.usulan_id === u.id) });
}
export async function bnbaLengkap(nik) {
  const b = db.bnba.find((x) => x.nik === nik);
  if (!b || !bnbaTerlihat(b)) throw galat('Data tidak ditemukan.');
  if (!bolehPenuhP(b.pokja_id)) throw galat('Data ini tersamar untuk peran Anda.', '42501');
  log('LIHAT_DATA_SENSITIF', 'bnba', b.id, 'Membuka data lengkap PM ' + nik); simpan();
  return { no_kk: b.no_kk, nama_ibu: b.nama_ibu, ktp_jalan: b.ktp_jalan, dom_jalan: b.dom_jalan, nomor_rekening: b.nomor_rekening };
}
export async function eksporBnba(f = {}) {
  await tunggu(200); butuhSesi();
  const r = saringB({ q: f.q, pokja: f.pokja_id, klaster: f.klaster, status: f.status, provinsi: f.provinsi, kabkota: f.kabkota, jenis: f.jenis_bantuan })
    .filter((b) => (f.termasuk_draft || b.status_verifikasi === 'terverifikasi') && (!f.usulan_ids || f.usulan_ids.includes(b.usulan_id)));
  log('EKSPOR', 'bnba', null, `Ekspor BNBA (${r.length} baris)`, f); simpan();
  return r.map((b) => { const u = ambilU(b.usulan_id), p = bolehPenuhP(b.pokja_id);
    return { ...barisEkspor(p ? { ...salin(b), ...tampilBnba(b), no_kk: b.no_kk, nama_ibu: b.nama_ibu, ktp_jalan: b.ktp_jalan, dom_jalan: b.dom_jalan, nomor_rekening: b.nomor_rekening } : tampilBnba(b), u),
      'JUDUL USULAN': u.judul, POKJA: pokjaById(b.pokja_id).nama_pendek, 'STATUS VERIFIKASI': b.status_verifikasi, 'TAHAP AKTIF': u.tahap_aktif }; });
}
export async function catatEkspor(modul, jumlah, filter = {}) { log('EKSPOR', modul, null, `Ekspor ${modul} (${jumlah} baris)`, filter); simpan(); }

// ---------------------------------------------------------------- Rekap Data Pencairan
export async function rekapPencairan(f = {}) {
  await tunggu(150); butuhSesi();
  const s = String(f.q || '').toLowerCase();
  return db.usulan.filter((u) => ['proses', 'selesai'].includes(u.status) && tahapU(u.id, '4c')?.status === 'selesai' && usulanTerlihat(u)).map((u) => {
    const b = db.bnba.filter((x) => x.usulan_id === u.id), k = pokjaById(u.pokja_id), kor = db.koreksi[u.id] || {};
    const hit = (j) => b.filter((x) => x.jenis_bantuan === j).length, klas = {};
    b.forEach((x) => { const c = klas[x.klaster_ppks || '-'] ||= { KWU: 0, PHL: 0, PEMULANGAN: 0 }; c[x.jenis_bantuan] = (c[x.jenis_bantuan] || 0) + 1; });
    const nilai = b.reduce((a, x) => a + (Number(x.nilai_bantuan) || 0), 0);
    const koreksi = Object.fromEntries(Object.entries(kor).filter(([kk]) => !kk.startsWith('_')));
    return { usulan_id: u.id, no_register: u.no_register, judul: u.judul, pokja_id: u.pokja_id, status: u.status, tahap_aktif: u.tahap_aktif,
      mak: koreksi.mak || (b.every((x) => x.uraian === 'BANSOS BARANG') ? '571112' : '571111'), nama_pengusul: koreksi.nama || k.nama_pendek,
      uraian: koreksi.uraian || [...new Set(b.map((x) => x.rincian_barang || x.uraian))].join('; '), kota_kab: koreksi.kota_kab || [...new Set(b.map((x) => x.kota_kab_penyaluran))].join(', '),
      kwu: hit('KWU'), phl: hit('PHL'), pemulangan: hit('PEMULANGAN'), nilai_bantuan: koreksi.nilai_bantuan ? Number(koreksi.nilai_bantuan) : nilai, nilai_bantuan_hitung: nilai,
      no_sk: u.no_sk, tgl_sk: u.tgl_sk, sp2d: koreksi.sp2d || [...new Set(b.map((x) => x.no_sp2d).filter(Boolean))].join(', ') || null,
      tgl_sp2d: b.map((x) => x.tgl_sp2d).filter(Boolean).sort()[0] || null, bulan_sp2d: [...new Set(b.map((x) => x.bulan_sp2d).filter(Boolean))].join(', ') || null,
      petugas_penyalur: koreksi.petugas_penyalur || db.penyaluran.filter((p) => p.usulan_id === u.id).map((p) => p.nama_petugas).join(', ') || null,
      total_pm: b.length, klaster: Object.entries(klas).map(([kk, v]) => `${kk} (${Object.values(v).reduce((a, c) => a + c, 0)})`).join(', '), rincian: klas,
      provinsi: [...new Set(b.map((x) => x.ktp_provinsi).filter(Boolean))].join(', '), koreksi, diubah_pada: u.diubah_pada };
  }).filter((r) => (!s || [r.judul, r.no_register, r.no_sk, r.uraian].some((v) => String(v || '').toLowerCase().includes(s)))
    && (!f.pokja || r.pokja_id === f.pokja) && (!f.mak || r.mak === f.mak) && (!f.bulan || String(r.bulan_sp2d || '').toLowerCase().includes(String(f.bulan).toLowerCase())));
}
export async function koreksiRekap(id, kolom, nilai, alasan) {
  await tunggu(120);
  if (!(isSA() || diPokja('KEUANGAN'))) throw galat('Koreksi Rekap hanya oleh Pokja Keuangan.', '42501');
  if (!String(alasan || '').trim()) throw galat('Alasan koreksi wajib diisi.');
  if (!['mak', 'nama', 'uraian', 'kota_kab', 'nilai_bantuan', 'sp2d', 'petugas_penyalur'].includes(kolom)) throw galat(`Kolom ${kolom} tidak dapat dikoreksi.`);
  if (kolom === 'mak' && nilai && !['571111', '571112', '571113', '521219'].includes(nilai)) throw galat('MAK harus 571111, 571112, 571113, atau 521219.');
  const k = db.koreksi[id] ||= {};
  if (!nilai) delete k[kolom]; else k[kolom] = nilai;
  log('UPDATE', 'rekap_koreksi', id, `Koreksi Rekap ${kolom}`, { [kolom]: nilai }, alasan); simpan();
  return salin(k);
}

// ---------------------------------------------------------------- Notifikasi WA / email
export async function pengaturanNotif() { await tunggu(60); return { wa_batch: 10, wa_jeda: 5, wa_acak: 3, ...salin(db.notif_atur) }; }
export async function aturNotifikasi(d) {
  if (!isSA()) throw galat('Hanya Super Admin.', '42501');
  const n = db.notif_atur;
  if ('wa' in d) n.notif_wa_aktif = !!d.wa;
  if ('email' in d) n.notif_email_aktif = !!d.email;
  if (d.matriks) n.notif_matriks = d.matriks;
  if ('wa_batch' in d) { if (!(d.wa_batch >= 1 && d.wa_batch <= 50)) throw galat('Ukuran batch harus 1 sampai 50 pesan.'); n.wa_batch = d.wa_batch; }
  if ('wa_jeda' in d) { if (!(d.wa_jeda >= 3 && d.wa_jeda <= 120)) throw galat('Jeda antar pesan harus 3 sampai 120 detik (di bawah 3 detik berisiko dianggap spam).'); n.wa_jeda = d.wa_jeda; }
  if ('wa_acak' in d) { if (!(d.wa_acak >= 0 && d.wa_acak <= 60)) throw galat('Jeda acak harus 0 sampai 60 detik.'); n.wa_acak = d.wa_acak; }
  if ('app_url' in d) { if (d.app_url && !/^https:\/\//i.test(d.app_url)) throw galat('Alamat web harus diawali https://'); n.app_url = d.app_url || ''; }
  log('PENGATURAN', 'pengaturan', 'notifikasi', 'Mengubah pengaturan notifikasi', d); simpan();
  return { wa_batch: 10, wa_jeda: 5, wa_acak: 3, ...salin(n) };
}
export async function ujiNotifikasi(kanal, tujuan) {
  if (!isSA()) throw galat('Hanya Super Admin.', '42501');
  if (!String(tujuan || '').trim()) throw galat('Isi kanal dan tujuan.');
  db.antrian.unshift({ id: ++db.seq_a, kanal, tujuan: tujuan.trim(), nama_penerima: namaSaya(), subjek: '[SITASI TSKPO] Uji notifikasi', pesan: 'Ini pesan uji dari SITASI TSKPO.', event: 'UJI', status: 'antri', percobaan: 0, respon: null, dibuat_pada: sekarang(), dikirim_pada: null });
  simpan();
}
export async function ringkasanAntrian() {
  const a = isSA() ? db.antrian : [];
  return { antri: a.filter((x) => ['antri', 'proses'].includes(x.status)).length, terkirim: a.filter((x) => x.status === 'terkirim').length,
    gagal: a.filter((x) => x.status === 'gagal').length, terakhir: a.map((x) => x.dikirim_pada).filter(Boolean).sort().pop() || null };
}
export async function daftarAntrian({ status = '', hal = 1, per = 30 } = {}) {
  await tunggu(80);
  const r = (isSA() ? db.antrian : []).filter((x) => !status || x.status === status);
  return { baris: salin(r.slice((hal - 1) * per, hal * per)), total: r.length };
}
export async function kirimUlangAntrian(id = null) {
  if (!isSA()) throw galat('Hanya Super Admin.', '42501');
  let n = 0; db.antrian.forEach((x) => { if (x.status === 'gagal' && (!id || x.id === id)) { x.status = 'antri'; x.percobaan = 0; n++; } });
  simpan(); return n;
}

// ---------------------------------------------------------------- Migrasi data 2026
export async function imporBnbaHistoris(rows, uji = true, opsi = {}) {
  await tunggu(250);
  if (!isSA()) throw galat('Migrasi data hanya oleh Super Admin.', '42501');
  if (rows.length > 500) throw galat('Maksimal 500 baris per kiriman.');
  let tambah = 0, ubah = 0, lewat = 0, baru = 0; const gagal = [], lihat = new Set(), tahun = opsi.tahun || '2026';
  db._tanpaNotif = true;
  const tebak = (k) => /BWB|NAPITER/i.test(k) ? 'BWBP' : /GELANDANG|PENGEMIS|PEMULUNG|GEPENG/i.test(k) ? 'GEPENGLUNG' : /KTK|WTS/i.test(k) ? 'KTK_WTS' : /KPO|PMIB|PMBS|TPPO/i.test(k) ? 'KPO_PMBS' : null;
  rows.forEach((x, i) => {
    const r = normalBnba(x); let e = cekBnba(r);
    const kode = x.pokja_kode || opsi.pokja_kode || tebak(r.klaster_ppks || ''), k = db.pokja.find((p) => p.kode === kode);
    if (!e && !k) e = 'Pokja tidak dapat ditentukan dari KLASTER (isi kolom pokja_kode)';
    if (!e && lihat.has(r.nik)) e = 'NIK ganda di dalam berkas impor';
    if (e) { gagal.push({ baris: x._baris || i + 1, nik: r.nik, nama: r.nama, alasan: e }); return; }
    lihat.add(r.nik);
    const ada = db.bnba.find((b) => b.nik === r.nik);
    if (ada) {
      if ((!ada.no_sp2d && r.no_sp2d) || (!ada.nomor_rekening && r.nomor_rekening)) { ubah++; if (!uji) ['no_sp2d', 'tgl_sp2d', 'bulan_sp2d', 'nama_bank', 'nomor_rekening', 'akun_bantuan', 'rek_giro_bni'].forEach((kk) => { ada[kk] ??= r[kk] ?? null; }); }
      else lewat++;
      return;
    }
    tambah++;
    if (uji) return;
    const nosk = String(x.no_sk || '').trim() || null, judul = `Impor ${tahun} — ${k.nama_pendek} — ${nosk ? 'SK ' + nosk : 'Tanpa SK'}`;
    let u = db.usulan.find((v) => v.judul === judul && v.sumber === 'impor');
    if (!u) {
      baru++;
      const st = r.no_sp2d ? 'selesai' : nosk ? '7' : '3';
      u = { id: uid(), no_register: `USL-${SINGKAT[k.kode]}-${tahun}IMP-${pad4(++db.seq_u)}`, judul, kategori: 'Bantuan ATENSI', pokja_id: k.id, link_profil: null,
        status: st === 'selesai' ? 'selesai' : 'proses', tahap_aktif: st === 'selesai' ? '11' : st, catatan_terakhir: null, no_sk: nosk, tgl_sk: tglBebas(x.tgl_sk), link_sk: x.link_sk || null,
        tgl_cair: null, usulan_asal_id: null, usulan_baru_id: null, sumber: 'impor', dibuat_oleh: sayaAktif().id, dibuat_pada: sekarang(), tgl_submit: sekarang(), diubah_pada: sekarang() };
      db.usulan.push(u);
      URUT.forEach((t, j) => db.tahap.push({ usulan_id: u.id, tahap: t, status: st === 'selesai' || j < URUT.indexOf(st) ? 'selesai' : t === st ? 'aktif' : 'terkunci', data: {}, catatan: null, pic_nama: 'Impor data 2026', mulai_pada: null, selesai_pada: null }));
      riwayatP(u.id, null, 'IMPOR', null, u.status, 'Diimpor dari data ' + tahun);
    }
    tulisB(u, r, 'terverifikasi');
  });
  db._tanpaNotif = false;
  if (!uji) { log('IMPOR', 'bnba', null, `Migrasi BNBA ${tahun}: ${tambah} ditambah, ${ubah} dilengkapi, ${lewat} dilewati, ${gagal.length} gagal`, opsi); simpan(); }
  return { uji, ditambah: tambah, diperbarui: ubah, dilewati: lewat, usulan_baru: baru, gagal };
}

// ---------------------------------------------------------------- Penyimpanan berkas (v2.2.0)
const pen = () => (db.penyimpanan ||= { aktif: 'drive_sa1', sambungan: {} });
const saAktif = (n) => db.pengguna.find((x) => x.peran_sistem === 'super_admin' && x.aktif && x.super_admin_slot === n);
export async function statusPenyimpanan() {
  await tunggu(80); if (!isSA()) throw galat('Hanya Super Admin.', '42501');
  const berkas = {};
  db.berkas.filter((b) => !b.dihapus && b.lokasi !== 'tautan').forEach((b) => { const x = (berkas[b.lokasi] ||= { jumlah: 0, ukuran: 0 }); x.jumlah++; x.ukuran += b.ukuran || 0; });
  return { aktif: pen().aktif, berkas, slot: [1, 2].map((n) => { const a = saAktif(n), s = pen().sambungan[n];
    return { slot: n, ada_akun: !!a, nama: a?.nama || null, email: a?.email || null, email_drive: s?.email || null, status: s?.status || 'belum', terhubung_pada: s?.pada || null }; }) };
}
export async function aturPenyimpanan(lokasi) {
  await tunggu(80); if (!isSA()) throw galat('Hanya Super Admin.', '42501');
  if (!['drive_sa1', 'drive_sa2', 'tunda'].includes(lokasi)) throw galat('Tujuan penyimpanan tidak dikenal.');
  if (lokasi !== 'tunda' && pen().sambungan[lokasi.slice(-1)]?.status !== 'tersambung') throw galat(`Drive Super Admin ${lokasi.slice(-1)} belum tersambung. Pemiliknya perlu menekan "Hubungkan Drive" lebih dulu.`);
  log('PENGATURAN', 'pengaturan', 'penyimpanan_aktif', `Mengalihkan penyimpanan berkas: ${pen().aktif} → ${lokasi}`); pen().aktif = lokasi; simpan();
  return statusPenyimpanan();
}
export async function hubungDriveTiruan(slot) {
  await tunggu(400); const me = sayaAktif();
  if (!isSA() || me?.super_admin_slot !== slot) throw galat(`Akun Anda bukan Super Admin ${slot}. Hanya pemilik akun itu yang dapat mengelola Drive-nya.`, '42501');
  pen().sambungan[slot] = { email: me.email, status: 'tersambung', pada: sekarang() };
  log('PENGATURAN', 'drive_sambungan', String(slot), `Menghubungkan Google Drive Super Admin ${slot} (${me.email})`); simpan();
}
export async function putusDriveTiruan(slot) {
  await tunggu(200); const me = sayaAktif();
  if (!isSA() || me?.super_admin_slot !== slot) throw galat(`Akun Anda bukan Super Admin ${slot}.`, '42501');
  delete pen().sambungan[slot]; if (pen().aktif === 'drive_sa' + slot) pen().aktif = 'tunda';
  log('PENGATURAN', 'drive_sambungan', String(slot), `Memutus Google Drive Super Admin ${slot}`); simpan(); return { ok: true };
}

// ---------------------------------------------------------------- tiruan Apps Script (Fonnte, baca Sheets) dan berkas pratinjau
const BERKAS_MEMORI = new Map();
export async function gasTiruan(action, d = {}) {
  await tunggu(350); butuhSesi();
  if (action === 'unggah' && String(d.tahap || '').startsWith('konteks:')) {
    const r = unggahKonteksP(d, pen().aktif);
    BERKAS_MEMORI.set(r.id, d.base64); simpan(); return salin(r);
  }
  if (action === 'unggah') {
    const u = ambilU(d.usulan_id);
    if (!bolehTahapP(u.pokja_id, d.tahap) && !(JENIS_L.includes(d.jenis) && bolehLanjutan(u))) throw galat('Anda tidak berwenang mengunggah berkas tahap ini.', '42501');
    const ukuran = Math.floor((d.base64 || '').length * 0.75);
    if (ukuran > 10 * 1024 * 1024) throw galat('Ukuran dokumen maksimal 10 MB.');
    const lok = pen().aktif;
    if (lok === 'tunda') throw galat('Unggahan berkas sedang ditunda oleh Super Admin. Hubungi Super Admin.');
    const r = { id: uid(), usulan_id: u.id, tahap: d.tahap, jenis: d.jenis, nama: d.nama, ukuran, mime: d.mime, lokasi: lok, tautan: null, diunggah_nama: namaSaya(), dibuat_pada: sekarang() };
    BERKAS_MEMORI.set(r.id, d.base64); db.berkas.push(r); simpan(); return salin(r);
  }
  if (action === 'unduh') {
    const r = db.berkas.find((x) => x.id === d.id && !x.dihapus); if (!r || !berkasTerlihatP(r)) throw galat('Berkas tidak ditemukan.');
    log('UNDUH', 'berkas', r.id, 'Mengunduh ' + r.nama); simpan();
    if (r.lokasi === 'tautan') return { tautan: r.tautan, nama: r.nama };
    if (!BERKAS_MEMORI.get(r.id) && /^image\//.test(r.mime || '')) return { nama: r.nama, mime: 'image/svg+xml', base64: fotoContoh(r) };
    return { nama: r.nama, mime: r.mime, base64: BERKAS_MEMORI.get(r.id) || btoa('Berkas contoh mode pratinjau: ' + r.nama) };
  }
  if (action === 'hapus_berkas') {
    const r = db.berkas.find((x) => x.id === d.id); if (!r) throw galat('Berkas tidak ditemukan.');
    if (r.konteks && r.konteks !== 'usulan') { hapusBerkasKonteksP(r); simpan(); return { ok: true }; }
    const ul = ambilU(r.usulan_id), lanj = JENIS_L.includes(r.jenis) && bolehLanjutan(ul) && ['menunggu', 'proses', 'selesai'].includes(ul.status);
    if (!bolehTahapP(ul.pokja_id, r.tahap) && !lanj) throw galat('Anda tidak berwenang.', '42501');
    if (!lanj && tahapU(r.usulan_id, r.tahap)?.status === 'selesai') throw galat('Tahap sudah selesai; berkas tidak dapat dihapus.');
    r.dihapus = true; simpan(); return { ok: true };
  }
  if (!isSA()) throw galat('Hanya Super Admin.', '42501');
  const status = () => ({ versi: 'pratinjau', token_fonnte: db.fonnte ? db.fonnte.slice(0, 4) + '••••' + db.fonnte.slice(-3) : '', perangkat: db.fonnte ? { status: 'connect', kuota: 'unlimited', nomor: '6281200000000' } : null,
    kuota_email: 100, pemicu_aktif: true, terakhir: db.antrian.find((x) => x.dikirim_pada)?.dikirim_pada || '', galat_terakhir: '', akun_google: 'asterpokjadata@gmail.com' });
  if (action === 'status_notif') return status();
  if (action === 'simpan_token') { db.fonnte = String(d.token || '').trim(); simpan(); return status(); }
  if (action === 'proses_sekarang') {
    const r = { wa: 0, email: 0, gagal: 0 };
    db.antrian.filter((x) => x.status === 'antri').slice(0, 40).forEach((x) => {
      x.percobaan++;
      if (x.kanal === 'WA' && !db.fonnte) { x.respon = 'Token Fonnte belum diisi'; x.status = x.percobaan >= 3 ? 'gagal' : 'antri'; r.gagal++; return; }
      x.status = 'terkirim'; x.dikirim_pada = sekarang(); x.respon = x.kanal === 'WA' ? 'fonnte: terkirim (simulasi)' : 'email terkirim (simulasi)'; r[x.kanal === 'WA' ? 'wa' : 'email']++;
    });
    simpan(); return r;
  }
  if (action === 'cek_wa') return { terdaftar: (d.nomor || []).filter((n) => String(n).replace(/\D/g, '').length >= 10), tidak: [] };
  if (action === 'baca_sheet') {
    if (!d.sheet) return { nama: 'BNBA PENGAJUAN 2026 (contoh)', sheets: [{ nama: 'BNBA', baris: 3 }] };
    return { header: ['NO', 'KLASTER PPKS', 'KOTA/KAB PENYALURAN', 'PROVINSI', 'KABUPATEN/KOTA', 'NAMA', 'NIK', 'JENIS BANTUAN', 'NILAI BANTUAN', 'NO SK', 'TGL SK'],
      baris: [['1', 'Pemulung', 'Kota Bogor', 'Jawa Barat', 'Kota Bogor', 'Contoh Satu', '3271010101900001', 'KWU', '5.000.000', '77/SK/2026', '12/02/2026'],
        ['2', 'KTK', 'Kab. Garut', 'Jawa Barat', 'Kab. Garut', 'Contoh Dua', '3205010101900002', 'PHL', '2.500.000', '77/SK/2026', '12/02/2026'],
        ['3', 'Pengemis', 'Kota Bandung', 'Jawa Barat', 'Kota Bandung', 'Contoh Tiga', '12345', 'KWU', '5000000', '', '']], total: 3, baris_judul: 1 };
  }
  throw galat('Aksi tidak dikenal: ' + action);
}

// ---------------------------------------------------------------- Tahap 3 & 4 (v2.3.0): fungsi di pratinjau-t34.js memakai isi berikut
// ---------------------------------------------------------------- v2.7.0: Petugas Bank, koreksi, edit lanjutan
const isBankP = () => peran() === 'petugas_bank' || isSA();
const bankAktif = (u) => { const x = tahapU(u.id, '7b'); return x && (x.status === 'aktif' || (x.status === 'selesai' && x.mulai_pada)); };
export async function bankDaftar() {
  await tunggu(100); if (!isBankP()) throw galat('Akses ditolak.', '42501');
  return db.usulan.filter((u) => ['proses', 'selesai'].includes(u.status) && bankAktif(u)).map((u) => {
    const b = db.bnba.filter((x) => x.usulan_id === u.id), d6 = tahapU(u.id, '6')?.data || {};
    return { id: u.id, no_register: u.no_register, judul: u.judul, kategori: u.kategori, pokja: pokjaById(u.pokja_id).nama_pendek, no_sk: u.no_sk, tgl_sk: u.tgl_sk,
      bank_penyaluran: d6.bank_penyaluran_nama || null, status_bank: tahapU(u.id, '7b').status === 'aktif' ? 'menunggu' : 'terkirim', jumlah_pm: b.length,
      terisi: b.filter((x) => x.nomor_rekening && x.nama_bank).length, koreksi: b.filter((x) => x.koreksi_bank_catatan).length };
  }).sort((a, z) => (z.status_bank > a.status_bank ? 1 : z.status_bank < a.status_bank ? -1 : 0) || a.no_register.localeCompare(z.no_register));
}
export async function bankDetail(id) {
  await tunggu(100); if (!isBankP()) throw galat('Akses ditolak.', '42501');
  const u = ambilU(id); if (!bankAktif(u)) throw galat('Usulan ini belum sampai ke Petugas Bank.');
  const d6 = tahapU(id, '6')?.data || {};
  log('LIHAT_DATA_SENSITIF', 'usulan', id, 'Petugas Bank membuka ' + u.no_register); simpan();
  return { usulan: { id: u.id, no_register: u.no_register, judul: u.judul, kategori: u.kategori, pokja: pokjaById(u.pokja_id).nama_pendek, no_sk: u.no_sk, tgl_sk: u.tgl_sk },
    bank_penyaluran: { nama: d6.bank_penyaluran_nama || null, alamat: d6.bank_penyaluran_alamat || null },
    status_bank: tahapU(id, '7b').status === 'aktif' ? 'menunggu' : 'terkirim',
    pm: db.bnba.filter((x) => x.usulan_id === id).sort((a, z) => a.nama.localeCompare(z.nama)).map((b) => ({ id: b.id, nama: b.nama, nik: b.nik, klaster: b.klaster_ppks,
      jenis_bantuan: b.jenis_bantuan, nilai_bantuan: b.nilai_bantuan, nama_bank: b.nama_bank || null, nomor_rekening: b.nomor_rekening || null,
      nama_pemilik_rek: b.nama_pemilik_rek || null, koreksi: b.koreksi_bank_catatan || null, koreksi_pada: b.koreksi_bank_pada || null })) };
}
export async function kirimKoreksiBank(bnbaId, jenis, catatan) {
  await tunggu(120); const b = db.bnba.find((y) => y.id === bnbaId); if (!b) throw galat('PM tidak ditemukan.');
  const u = ambilU(b.usulan_id);
  if (!bolehTahapP(u.pokja_id, '7b')) throw galat('Hanya Petugas Bank atau Keuangan yang dapat mengirim koreksi.', '42501');
  if (u.status !== 'proses' || tahapU(u.id, '7b').status !== 'aktif') throw galat('Koreksi hanya dapat dikirim saat tahap Pengisian Rekening Bank aktif.');
  if (!['nik_keliru', 'nama_tidak_sesuai', 'lainnya'].includes(jenis)) throw galat('Jenis koreksi tidak dikenal.');
  const cat = String(catatan || '').trim();
  if (jenis === 'lainnya' && !cat) throw galat('Tuliskan catatan koreksi.');
  const ket = { nik_keliru: 'NIK keliru', nama_tidak_sesuai: 'Nama tidak sesuai', lainnya: 'Koreksi data' }[jenis] + (cat ? ': ' + cat : '');
  Object.assign(b, { koreksi_bank_catatan: ket, koreksi_bank_oleh: namaSaya(), koreksi_bank_pada: sekarang() });
  riwayatP(u.id, '7b', 'KOREKSI_BANK', null, null, b.nama + ' — ' + ket);
  const kep = db.pengguna.filter((p) => p.aktif && (p.id === b.dibuat_oleh || db.pengguna_pokja.some((pp) => pp.pengguna_id === p.id && ((pp.pokja_id === u.pokja_id && pp.jabatan === 'kapokja') || pokjaById(pp.pokja_id)?.kode === 'KEUANGAN')))).map((p) => p.id);
  beriTahu(kep, 'KOREKSI_BANK', 'Koreksi data PM dari bank', `PM ${b.nama} (NIK ${b.nik}) pada usulan "${u.judul}" (${u.no_register}): ${ket}. Mohon diperbaiki di menu BNBA.`, '#/usulan/' + u.id);
  simpan(); return { ok: true };
}
export async function koreksiBankDaftar(id) {
  await tunggu(60); const u = ambilU(id);
  if (!(peran() === 'petugas_bank' || (isPeg() && usulanTerlihat(u)))) return [];
  return db.bnba.filter((b) => b.usulan_id === id && b.koreksi_bank_catatan).map((b) => ({ id: b.id, nama: b.nama, catatan: b.koreksi_bank_catatan, oleh: b.koreksi_bank_oleh, pada: b.koreksi_bank_pada }));
}
export async function ubahPmLanjutan(bnbaId, data) {
  await tunggu(150); const b = db.bnba.find((y) => y.id === bnbaId); if (!b) throw galat('PM tidak ditemukan.');
  const u = ambilU(b.usulan_id);
  if (!(bolehTahapP(u.pokja_id, '1') || diPokja('TU'))) throw galat('Hanya Pokja pemilik usulan atau TU yang dapat mengedit.', '42501');
  if (!['menunggu', 'proses', 'selesai'].includes(u.status)) throw galat('Usulan masih draft atau dikembalikan: gunakan menu Ubah di Workspace BNBA.');
  const { id: _i, nik, nama_bank: _nb, nomor_rekening: _nr, nama_pemilik_rek: _np, rek_giro_bni: _rg, akun_bantuan: _ab, ...sisa } = data || {};
  const r = normalBnba(sisa);
  let nikBaru = String(nik || '').replace(/[\s.\-]/g, '') || b.nik;
  if (nikBaru !== b.nik) {
    if (!/^\d{16}$/.test(nikBaru)) throw galat('NIK harus 16 digit angka.');
    if (db.bnba.some((x) => x.nik === nikBaru && x.id !== b.id)) throw galat(`NIK ${nikBaru} sudah terdaftar pada PM lain.`);
  }
  const e = cekBnba({ ...r, nama: r.nama || b.nama, nik: nikBaru }); if (e) throw galat(e);
  const jk = jenisDariKategori(u.kategori); if (jk && 'jenis_bantuan' in r) r.jenis_bantuan = jk;
  if (Array.isArray(r.rincian_item) && r.rincian_item.length) { r.nilai_bantuan = String(totalRincian(r.rincian_item)); r.rincian_barang = ringkasRincian(r.rincian_item); }
  else if ('rincian_item' in r) r.rincian_item = null;
  angkaKe(r); const lamaNama = b.nama, lamaNik = b.nik;
  Object.assign(b, r); if (r.nama) b.nama = String(r.nama).toUpperCase(); b.nik = nikBaru;
  riwayatP(u.id, null, 'PM_DIKOREKSI', null, null, lamaNama + (b.nama !== lamaNama ? ' → ' + b.nama : '') + (nikBaru !== lamaNik ? ' (NIK diubah)' : ''));
  if (b.koreksi_bank_catatan && (b.nama !== lamaNama || nikBaru !== lamaNik)) {
    Object.assign(b, { koreksi_bank_catatan: null, koreksi_bank_oleh: null, koreksi_bank_pada: null });
    beriTahu(penerimaTahap(u.pokja_id, '7b'), 'PM_DIKOREKSI', 'Koreksi bank sudah diperbaiki', `PM ${b.nama} pada usulan "${u.judul}" (${u.no_register}) sudah diperbaiki Pokja. Silakan lanjutkan pengisian rekening.`, '#/usulan/' + u.id);
  }
  const kp = db.pengguna.filter((p) => p.aktif && db.pengguna_pokja.some((pp) => pp.pengguna_id === p.id && pp.pokja_id === u.pokja_id && pp.jabatan === 'kapokja')).map((p) => p.id);
  beriTahu([...new Set([...kp, ...kapokjaTU()])], 'PM_DIKOREKSI', 'Data BNBA diedit', `Data PM ${b.nama} pada usulan "${u.judul}" (${u.no_register}) diedit lanjutan.`, '#/usulan/' + u.id);
  simpan(); return { ok: true };
}
export async function ubahUsulanLanjutan(id, d) {
  await tunggu(100); const u = ambilU(id);
  if (!(bolehTahapP(u.pokja_id, '1') || diPokja('TU'))) throw galat('Hanya Pokja pemilik usulan atau TU yang dapat mengedit.', '42501');
  if (!['menunggu', 'proses', 'selesai'].includes(u.status)) throw galat('Usulan masih draft atau dikembalikan: gunakan menu Ubah di Workspace BNBA.');
  const link = String(d?.link_profil || '').trim(), judul = String(d?.judul || '').trim();
  if (link && !/^https?:\/\//i.test(link)) throw galat('Link profil harus diawali https://');
  if (link) u.link_profil = link; if (judul) u.judul = judul;
  riwayatP(id, null, 'USULAN_DIKOREKSI', null, null, 'Judul / link profil diperbarui'); simpan(); return { ok: true };
}
export * from './pratinjau-t34.js';
export * from './pratinjau-t56.js';
export const _dalam = {
  get db() { return db; }, simpan, log, galat, uid, sekarang, salin, tunggu, isSA, diPokja, pokjaEf, peran, isPeg, idsPokja, namaSaya,
  sayaAktif, pokjaById, beriTahu, anggotaPokja, penerimaTahap, usulanTerlihat, bnbaTerlihat, ambilU, tahapU, samarAngka, samarAlamat, pen,
  kirimNotif, label,
};
