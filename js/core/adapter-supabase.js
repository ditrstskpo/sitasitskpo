// Adapter data ASLI: Supabase (Auth Google + PostgREST + Realtime).
// Membaca langsung (dibatasi RLS); menulis lewat fungsi RPC yang memeriksa peran.
import { bersihCari } from './util.js';
import { fetchTahan } from './jaringan.js';

const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
let sb;

export async function init(cfg) {
  const { createClient } = await import(CDN);
  sb = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'sitasi-auth' },
    realtime: { params: { eventsPerSecond: 5 } },
    global: { fetch: fetchTahan },
  });
  await sb.auth.getSession(); // menunggu penukaran kode OAuth (bila baru kembali dari Google)
}

function cek({ data, error, count }) {
  if (error) throw Object.assign(new Error(error.message), { code: error.code, hint: error.hint, details: error.details });
  return count === undefined || count === null ? data : { data, count };
}
const rpc = async (fn, args) => cek(await sb.rpc(fn, args));

// ---------------------------------------------------------------- autentikasi
export async function adaSesiAuth() {
  const { data } = await sb.auth.getSession();
  return !!data.session;
}
export async function masukGoogle() {
  sessionStorage.setItem('sitasi:baru-login', '1');
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: location.origin + location.pathname, queryParams: { prompt: 'select_account' } },
  });
  if (error) throw error;
}
export async function keluar({ catatLog = true } = {}) {
  if (catatLog) { try { await rpc('catat_aktivitas', { p_aksi: 'LOGOUT', p_ringkasan: 'Keluar dari SITASI TSKPO' }); } catch {} }
  await sb.auth.signOut({ scope: 'local' });
}
export function onAuthBerubah(cb) {
  const { data } = sb.auth.onAuthStateChange((ev, s) => cb(ev, s));
  return () => data.subscription.unsubscribe();
}

// ---------------------------------------------------------------- sesi & peran
export const sesiSaya = (login = false) => rpc('sesi_saya', { p_login: !!login });
export const pilihPeran = (peran, pokjaId = null) => rpc('pilih_peran', { p_peran: peran, p_pokja_id: pokjaId });
export const catat = (aksi, ringkasan = null, detail = null) =>
  rpc('catat_aktivitas', { p_aksi: aksi, p_ringkasan: ringkasan, p_detail: detail });

// ---------------------------------------------------------------- pokja
const KOLOM_POKJA = 'id,kode,nama,nama_pendek,kelompok,urutan,warna,warna_tint,warna_teks,aktif';
export async function daftarPokja() {
  return cek(await sb.from('pokja').select(KOLOM_POKJA).order('urutan'));
}
export async function pokjaDenganAnggota() {
  return cek(await sb.from('pokja')
    .select(`${KOLOM_POKJA},pengguna_pokja(jabatan,pengguna(id,nama,email,aktif))`)
    .order('urutan'));
}

// ---------------------------------------------------------------- pengguna
const KOLOM_PENGGUNA = 'id,email,nama,nip,no_hp,jenis_akses,peran_sistem,super_admin_slot,aktif,auth_id,login_terakhir,catatan,dibuat_pada,' +
  'pengguna_pokja(jabatan,pokja(id,kode,nama_pendek,warna,warna_tint,warna_teks,urutan))';

export async function daftarPengguna({ q = '', pokja = '', peran = '', status = 'aktif', hal = 1, per = 50 } = {}) {
  const pakaiFp = !!pokja || peran === 'kapokja' || peran === 'anggota';
  let sel = KOLOM_PENGGUNA + (pakaiFp ? ',fp:pengguna_pokja!inner(pokja_id,jabatan)' : '');
  let qr = sb.from('pengguna').select(sel, { count: 'exact' });
  if (pokja) qr = qr.eq('fp.pokja_id', pokja);
  if (peran === 'kapokja' || peran === 'anggota') qr = qr.eq('fp.jabatan', peran);
  if (peran === 'super_admin' || peran === 'direktur') qr = qr.eq('peran_sistem', peran);
  if (peran === 'petugas_supermonev') qr = qr.eq('jenis_akses', 'petugas_supermonev');
  if (status === 'aktif') qr = qr.eq('aktif', true);
  if (status === 'nonaktif') qr = qr.eq('aktif', false);
  const s = bersihCari(q);
  if (s) qr = qr.or(`nama.ilike.*${s}*,email.ilike.*${s}*,nip.ilike.*${s}*`);
  const dari = (hal - 1) * per;
  const { data, count } = cek(await qr.order('aktif', { ascending: false }).order('nama').range(dari, dari + per - 1));
  return { baris: data, total: count ?? data.length };
}
export const ringkasanPengguna = () => rpc('ringkasan_pengguna');
export const simpanPengguna = (data) => rpc('simpan_pengguna', { p_data: data });
export const aturStatusPengguna = (id, aktif, alasan = null) => rpc('atur_status_pengguna', { p_id: id, p_aktif: aktif, p_alasan: alasan });

// ---------------------------------------------------------------- pengumuman
const KOLOM_PENGUMUMAN = 'id,judul,isi,tingkat,sasaran,aktif,mulai,selesai,dibuat_pada,diubah_pada';
export async function pengumumanAktif(hariIni) {
  return cek(await sb.from('pengumuman').select(KOLOM_PENGUMUMAN)
    .eq('aktif', true)
    .or(`mulai.is.null,mulai.lte.${hariIni}`)
    .or(`selesai.is.null,selesai.gte.${hariIni}`)
    .order('tingkat', { ascending: false }).order('dibuat_pada', { ascending: false }).limit(10));
}
export async function daftarPengumuman() {
  return cek(await sb.from('pengumuman').select(KOLOM_PENGUMUMAN).order('aktif', { ascending: false }).order('dibuat_pada', { ascending: false }).limit(200));
}
export const simpanPengumuman = (data) => rpc('simpan_pengumuman', { p_data: data });
export const hapusPengumuman = (id) => rpc('hapus_pengumuman', { p_id: id });

// ---------------------------------------------------------------- notifikasi
export async function notifikasi({ hal = 1, per = 30 } = {}) {
  const dari = (hal - 1) * per;
  const { data, count } = cek(await sb.from('notifikasi').select('*', { count: 'exact' })
    .order('dibuat_pada', { ascending: false }).range(dari, dari + per - 1));
  return { baris: data, total: count ?? data.length };
}
export const tandaiDibaca = (id = null) => rpc('tandai_notifikasi_dibaca', { p_id: id });

// ---------------------------------------------------------------- audit log
function filterAudit(qr, { dari, sampai, aksi, tabel, q }) {
  if (dari) qr = qr.gte('waktu', `${dari}T00:00:00+07:00`);
  if (sampai) qr = qr.lte('waktu', `${sampai}T23:59:59.999+07:00`);
  if (aksi) qr = qr.eq('aksi', aksi);
  if (tabel) qr = qr.eq('tabel', tabel);
  const s = bersihCari(q);
  if (s) qr = qr.or(`pengguna_email.ilike.*${s}*,pengguna_nama.ilike.*${s}*,ringkasan.ilike.*${s}*,record_id.ilike.*${s}*`);
  return qr;
}
export async function auditLog(f = {}) {
  const { hal = 1, per = 50 } = f;
  const dari = (hal - 1) * per;
  const { data, count } = cek(await filterAudit(sb.from('audit_log').select('*', { count: 'exact' }), f)
    .order('waktu', { ascending: false }).order('id', { ascending: false }).range(dari, dari + per - 1));
  return { baris: data, total: count ?? data.length };
}
export async function auditLogSemua(f = {}, batas = 5000) {
  let semua = [];
  for (let dari = 0; dari < batas; dari += 1000) {
    const data = cek(await filterAudit(sb.from('audit_log').select('*'), f)
      .order('waktu', { ascending: false }).order('id', { ascending: false }).range(dari, Math.min(dari + 999, batas - 1)));
    semua = semua.concat(data);
    if (data.length < 1000) break;
  }
  return semua;
}

// ---------------------------------------------------------------- realtime terkelola (Tahap 6)
// Satu kanal dipakai bersama oleh semua halaman yang memantau tabel yang sama (hemat koneksi).
// Status sambungan dipantau (chip di bilah atas); saat tab disembunyikan > 5 menit sambungan dijeda,
// lalu disambung ulang otomatis begitu tab dibuka lagi.
const KANAL = new Map();          // kunci → { ch, cbs, pasang, status }
const PEMANTAU = new Set();
let statusRT = 'menyambung', jedaRT = false, timerJeda = null;
function hitungStatus() {
  if (jedaRT) return 'jeda';
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'terputus';
  const st = [...KANAL.values()].map((k) => k.status);
  if (!st.length || st.every((x) => x === 'SUBSCRIBED')) return 'tersambung';
  if (st.some((x) => ['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(x))) return 'terputus';
  return 'menyambung';
}
function segarkanStatus() {
  const s = hitungStatus();
  if (s === statusRT) return;
  statusRT = s;
  PEMANTAU.forEach((f) => { try { f(s); } catch {} });
}
function bukaKanal(kunci, k) {
  k.status = 'menyambung';
  k.ch = k.pasang(sb.channel('sitasi-' + kunci + '-' + Math.random().toString(36).slice(2, 7)), (...a) => k.cbs.forEach((f) => { try { f(...a); } catch {} }));
  k.ch.subscribe((st) => { k.status = st; segarkanStatus(); });
}
function ikut(kunci, pasang, cb) {
  let k = KANAL.get(kunci);
  if (!k) { k = { cbs: new Set(), pasang }; KANAL.set(kunci, k); if (!jedaRT) bukaKanal(kunci, k); }
  k.cbs.add(cb);
  segarkanStatus();
  return () => {
    k.cbs.delete(cb);
    if (!k.cbs.size) { if (k.ch) sb.removeChannel(k.ch); KANAL.delete(kunci); segarkanStatus(); }
  };
}
/** Pantau status realtime: tersambung | menyambung | terputus | jeda. */
export function pantauRealtime(cb) { PEMANTAU.add(cb); try { cb(statusRT); } catch {} return () => PEMANTAU.delete(cb); }
/** Sambung ulang semua kanal (setelah jeda / jaringan kembali). */
export function sambungUlangRealtime() {
  jedaRT = false;
  KANAL.forEach((k, kunci) => { if (k.ch) sb.removeChannel(k.ch); bukaKanal(kunci, k); });
  segarkanStatus();
}
function jedaRealtime() {
  if (jedaRT) return;
  jedaRT = true;
  KANAL.forEach((k) => { if (k.ch) sb.removeChannel(k.ch); k.ch = null; });
  segarkanStatus();
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    clearTimeout(timerJeda);
    if (document.hidden) timerJeda = setTimeout(jedaRealtime, 5 * 60 * 1000);
    else if (jedaRT) sambungUlangRealtime();
  });
  addEventListener('online', () => { if (!jedaRT) sambungUlangRealtime(); });
  addEventListener('offline', segarkanStatus);
}

export function langganan({ penggunaId, onNotif, onPengumuman, onAkun, onUsulan }) {
  return ikut('inti-' + penggunaId, (ch, kirim) => ch
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifikasi', filter: `penerima_id=eq.${penggunaId}` }, (p) => kirim('notif', p.new))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pengumuman' }, () => kirim('pengumuman'))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pengguna', filter: `id=eq.${penggunaId}` }, (p) => kirim('akun', p.new))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'usulan' }, (p) => kirim('usulan', p.new?.id || p.old?.id)),
  (jenis, x) => {
    if (jenis === 'notif') onNotif?.(x);
    else if (jenis === 'pengumuman') onPengumuman?.();
    else if (jenis === 'akun') onAkun?.(x);
    else if (jenis === 'usulan') onUsulan?.(x);
  });
}

// =====================================================================
// TAHAP 2 — Usulan BNBA, alur 11 tahap, Master BNBA, Rekap, Notifikasi, Migrasi
// =====================================================================
export async function tokenAkses() {
  const { data } = await sb.auth.getSession();
  if (!data.session) throw Object.assign(new Error('Sesi berakhir. Silakan masuk kembali.'), { code: 'AUTH' });
  return data.session.access_token;
}

const KOLOM_BNBA = 'id,usulan_id,pokja_id,status_verifikasi,klaster_ppks,kota_kab_penyaluran,ktp_provinsi,ktp_kabkota,ktp_kecamatan,' +
  'ktp_kelurahan,dom_provinsi,dom_kabkota,dom_kecamatan,dom_kelurahan,nama,nik,no_paspor,desil,tempat_lahir,tgl_lahir,jenis_kelamin,' +
  'pekerjaan_ktp,pekerjaan_kini,jenis_bantuan,nilai_bantuan,rincian_barang,uraian,akun_bantuan,no_sp2d,tgl_sp2d,bulan_sp2d,rek_giro_bni,' +
  'nama_bank,nama_pemilik_rek,pendapatan_kotor_awal,biaya_awal,laba_awal,no_kk_samar,nama_ibu_samar,ktp_jalan_samar,dom_jalan_samar,' +
  'nomor_rekening_samar,dibuat_oleh_nama,dibuat_pada,diubah_pada';
const KOLOM_USULAN = 'id,no_register,judul,kategori,pokja_id,link_profil,status,tahap_aktif,catatan_terakhir,no_sk,tgl_sk,link_sk,tgl_cair,' +
  'usulan_asal_id,usulan_baru_id,sumber,dibuat_pada,tgl_submit,diubah_pada,pokja_kode,pokja_nama,warna,warna_tint,warna_teks,pembuat_nama,' +
  'jumlah_pm,nilai_total,klaster,kabkota,pm_belum_lengkap,tahap_status,tahap_aktif_list,pic_nama,tahap_mulai';

function saringUsulan(qr, { q, pokja, status, tahap, tahapList, sumber } = {}) {
  const s = bersihCari(q);
  if (s) qr = qr.or(`judul.ilike.*${s}*,no_register.ilike.*${s}*,no_sk.ilike.*${s}*,kabkota.ilike.*${s}*`);
  if (Array.isArray(pokja) ? pokja.length : pokja) qr = Array.isArray(pokja) ? qr.in('pokja_id', pokja) : qr.eq('pokja_id', pokja);
  if (Array.isArray(status) ? status.length : status) qr = Array.isArray(status) ? qr.in('status', status) : qr.eq('status', status);
  if (tahap) qr = qr.eq('tahap_aktif', tahap);
  if (tahapList?.length) qr = qr.overlaps('tahap_aktif_list', tahapList);
  if (sumber) qr = qr.eq('sumber', sumber);
  return qr;
}
export async function daftarUsulan(f = {}) {
  const { hal = 1, per = 10, urut = 'diubah_pada' } = f;
  const dari = (hal - 1) * per;
  const { data, count } = cek(await saringUsulan(sb.from('usulan_v').select(KOLOM_USULAN, { count: 'exact' }), f)
    .order(urut, { ascending: urut === 'judul' }).order('id').range(dari, dari + per - 1));
  return { baris: data, total: count ?? data.length };
}
export async function statusUsulan(f = {}) {
  return cek(await saringUsulan(sb.from('usulan_v').select('status,tahap_aktif,tahap_aktif_list,jumlah_pm,nilai_total,link_profil'), f).limit(5000));
}
export async function usulanDetail(id) {
  const [u, t, r, b, p] = await Promise.all([
    sb.from('usulan_v').select(KOLOM_USULAN).eq('id', id).maybeSingle(),
    sb.from('usulan_tahap').select('*').eq('usulan_id', id),
    sb.from('usulan_riwayat').select('*').eq('usulan_id', id).order('waktu', { ascending: false }).limit(200),
    sb.from('berkas').select('id,usulan_id,tahap,jenis,nama,ukuran,mime,lokasi,tautan,diunggah_nama,dibuat_pada').eq('usulan_id', id).eq('dihapus', false).order('dibuat_pada'),
    sb.from('penyaluran_log').select('*').eq('usulan_id', id).order('tanggal', { nullsFirst: false }),
  ]);
  const usulan = cek(u);
  if (!usulan) throw new Error('Usulan tidak ditemukan atau Anda tidak memiliki akses.');
  return { usulan, tahap: cek(t), riwayat: cek(r), berkas: cek(b), penyaluran: cek(p) };
}
export async function bnbaUsulan(usulanId) {
  return cek(await sb.from('bnba').select(KOLOM_BNBA).eq('usulan_id', usulanId).order('dibuat_pada').limit(2000));
}
export const bnbaDraft = (usulanId) => rpc('bnba_draft', { p_usulan: usulanId });
export const simpanUsulan = (d) => rpc('simpan_usulan', { p_data: d });
export const simpanBnba = (usulanId, d) => rpc('simpan_bnba', { p_usulan: usulanId, p_data: d });
export const hapusBnba = (id) => rpc('hapus_bnba', { p_id: id });
export const imporBnba = (usulanId, rows, uji = true) => rpc('impor_bnba', { p_usulan: usulanId, p_rows: rows, p_uji: uji });
export const ajukanUsulan = (id) => rpc('ajukan_usulan', { p_id: id });
export const verifikasiKapokja = (id, setuju, catatan = null) => rpc('verifikasi_kapokja', { p_id: id, p_setuju: setuju, p_catatan: catatan });
export const prosesTahap = (id, tahap, aksi, data = {}, catatan = null) =>
  rpc('proses_tahap', { p_id: id, p_tahap: tahap, p_aksi: aksi, p_data: data, p_catatan: catatan });
export const ajukanUlang = (id) => rpc('ajukan_ulang_usulan', { p_id: id });
export const hapusUsulan = (id) => rpc('hapus_usulan', { p_id: id });
export const dataPencairan = (usulanId) => rpc('data_pencairan', { p_usulan: usulanId });
export const simpanDataPencairan = (usulanId, rows) => rpc('simpan_data_pencairan', { p_usulan: usulanId, p_rows: rows });
export const simpanPenyaluran = (usulanId, d) => rpc('simpan_penyaluran', { p_usulan: usulanId, p_data: d });
export const hapusPenyaluran = (id) => rpc('hapus_penyaluran', { p_id: id });
export const tambahTautanBerkas = (usulanId, tahap, jenis, nama, url) =>
  rpc('tambah_tautan_berkas', { p_usulan: usulanId, p_tahap: tahap, p_jenis: jenis, p_nama: nama, p_url: url });
export const ringkasanUsulan = () => rpc('ringkasan_usulan');

// ---------------------------------------------------------------- Master BNBA & Detail PM
function saringBnba(qr, { q, pokja, klaster, status, provinsi, kabkota, jenis } = {}) {
  const s = bersihCari(q);
  if (s) qr = /^\d+$/.test(s) ? qr.like('nik', `${s}%`) : qr.ilike('nama', `%${s}%`);
  if (pokja) qr = qr.eq('pokja_id', pokja);
  if (klaster) qr = qr.eq('klaster_ppks', klaster);
  if (status) qr = qr.eq('status_verifikasi', status);
  if (provinsi) qr = qr.eq('ktp_provinsi', provinsi);
  if (kabkota) qr = qr.ilike('ktp_kabkota', `%${bersihCari(kabkota)}%`);
  if (jenis) qr = qr.eq('jenis_bantuan', jenis);
  return qr;
}
export async function daftarBnba(f = {}) {
  const { hal = 1, per = 50 } = f;
  const dari = (hal - 1) * per;
  const { data, count } = cek(await saringBnba(sb.from('bnba')
    .select(KOLOM_BNBA + ',usulan(no_register,judul,status,tahap_aktif,no_sk),pokja(nama_pendek,warna,warna_tint,warna_teks)', { count: 'estimated' }), f)
    .order('dibuat_pada', { ascending: false }).order('id').range(dari, dari + per - 1));
  return { baris: data, total: count ?? data.length };
}
export const ringkasanBnba = (f = {}) => rpc('ringkasan_bnba', { p_filter: f });
export async function bnbaPerNik(nik) {
  const b = cek(await sb.from('bnba').select(KOLOM_BNBA + ',pokja(nama_pendek,warna,warna_tint,warna_teks)').eq('nik', nik).maybeSingle());
  if (!b) throw new Error('PM dengan NIK ' + nik + ' tidak ditemukan atau belum terverifikasi.');
  const [u, t, p] = await Promise.all([
    sb.from('usulan_v').select(KOLOM_USULAN).eq('id', b.usulan_id).maybeSingle(),
    sb.from('usulan_tahap').select('*').eq('usulan_id', b.usulan_id),
    sb.from('penyaluran_log').select('*').eq('usulan_id', b.usulan_id),
  ]);
  return { bnba: b, usulan: cek(u), tahap: cek(t), penyaluran: cek(p) };
}
export const bnbaLengkap = (nik) => rpc('bnba_lengkap', { p_nik: nik });
export const eksporBnba = (f = {}) => rpc('ekspor_bnba', { p_filter: f });
export const catatEkspor = (modul, jumlah, filter = {}) => rpc('catat_ekspor', { p_modul: modul, p_jumlah: jumlah, p_filter: filter });

// ---------------------------------------------------------------- Rekap Data Pencairan
export async function rekapPencairan({ q, pokja, mak, bulan } = {}) {
  let qr = sb.from('rekap_pencairan_v').select('*');
  const s = bersihCari(q);
  if (s) qr = qr.or(`judul.ilike.*${s}*,no_register.ilike.*${s}*,no_sk.ilike.*${s}*,uraian.ilike.*${s}*`);
  if (pokja) qr = qr.eq('pokja_id', pokja);
  if (mak) qr = qr.eq('mak', mak);
  if (bulan) qr = qr.ilike('bulan_sp2d', `%${bersihCari(bulan)}%`);
  return cek(await qr.order('tgl_sk', { ascending: false, nullsFirst: false }).limit(5000));
}
export const koreksiRekap = (usulanId, kolom, nilai, alasan) =>
  rpc('koreksi_rekap', { p_usulan: usulanId, p_kolom: kolom, p_nilai: nilai, p_alasan: alasan });

// ---------------------------------------------------------------- Notifikasi WA / email (pengaturan & antrean)
export async function pengaturanNotif() {
  const rows = cek(await sb.from('pengaturan').select('kunci,nilai').in('kunci', ['notif_wa_aktif', 'notif_email_aktif', 'notif_matriks', 'app_url', 'wa_batch', 'wa_jeda', 'wa_acak']));
  return Object.fromEntries(rows.map((r) => [r.kunci, r.nilai]));
}
export const aturNotifikasi = (d) => rpc('atur_notifikasi', { p_data: d });
export const ujiNotifikasi = (kanal, tujuan) => rpc('uji_notifikasi', { p_kanal: kanal, p_tujuan: tujuan });
export const ringkasanAntrian = () => rpc('ringkasan_antrian');
export async function daftarAntrian({ status = '', hal = 1, per = 30 } = {}) {
  let qr = sb.from('antrian_notif').select('id,kanal,tujuan,nama_penerima,subjek,event,status,percobaan,respon,dibuat_pada,dikirim_pada', { count: 'exact' });
  if (status) qr = qr.eq('status', status);
  const dari = (hal - 1) * per;
  const { data, count } = cek(await qr.order('id', { ascending: false }).range(dari, dari + per - 1));
  return { baris: data, total: count ?? data.length };
}
export const kirimUlangAntrian = (id = null) => rpc('kirim_ulang_antrian', { p_id: id });

// ---------------------------------------------------------------- Migrasi data 2026
export const imporBnbaHistoris = (rows, uji = true, opsi = {}) => rpc('impor_bnba_historis', { p_rows: rows, p_uji: uji, p_opsi: opsi });

// ---------------------------------------------------------------- Penyimpanan berkas (v2.2.0)
export const statusPenyimpanan = () => rpc('status_penyimpanan');
export const aturPenyimpanan = (lokasi) => rpc('atur_penyimpanan', { p_lokasi: lokasi });

// =====================================================================
// TAHAP 3 & 4 (v2.3.0) — semua lewat fungsi RPC yang memeriksa peran di basis data
// =====================================================================
// berkas konteks baru (LKS, dokumen, dokumentasi PM, rencana kerja, produk hukum, OJT)
export const berkasKonteks = (konteks, ref) => rpc('berkas_konteks', { p_konteks: konteks, p_ref: ref });
export const tambahTautanKonteks = (konteks, ref, jenis, nama, url) =>
  rpc('tambah_tautan_konteks', { p_konteks: konteks, p_ref: ref, p_jenis: jenis, p_nama: nama, p_url: url });
// dashboard
export const dashboardRealisasi = (f = {}) => rpc('dashboard_realisasi', { p_filter: f });
export const progresPokja = () => rpc('progres_pokja');
// LKS
export const daftarLks = (f = {}) => rpc('daftar_lks', { p_filter: f });
export const ringkasanLks = (f = {}) => rpc('ringkasan_lks', { p_filter: f });
export const detailLks = (id) => rpc('detail_lks', { p_id: id });
export const simpanLks = (d) => rpc('simpan_lks', { p_data: d });
export const ajukanLks = (id) => rpc('ajukan_lks', { p_id: id });
export const verifikasiLks = (id, setuju, catatan = null) => rpc('verifikasi_lks', { p_id: id, p_setuju: setuju, p_catatan: catatan });
export const hapusLks = (id) => rpc('hapus_lks', { p_id: id });
export const imporLks = (rows, uji = true, opsi = {}) => rpc('impor_lks', { p_rows: rows, p_uji: uji, p_opsi: opsi });
// Aster
export const daftarAster = (f = {}) => rpc('daftar_aster', { p_filter: f });
export const ringkasanAster = (f = {}) => rpc('ringkasan_aster', { p_filter: f });
export const simpanAster = (d) => rpc('simpan_aster', { p_data: d });
export const ajukanAster = (ids) => rpc('ajukan_aster', { p_ids: ids });
export const verifikasiAster = (ids, setuju, catatan = null) => rpc('verifikasi_aster', { p_ids: ids, p_setuju: setuju, p_catatan: catatan });
export const hapusAster = (ids) => rpc('hapus_aster', { p_ids: ids });
export const imporAster = (rows, uji = true, opsi = {}) => rpc('impor_aster', { p_rows: rows, p_uji: uji, p_opsi: opsi });
// Kepegawaian & OJT
export const daftarPegawai = (f = {}) => rpc('daftar_pegawai', { p_filter: f });
export const simpanPegawai = (d) => rpc('simpan_pegawai', { p_data: d });
export const hapusPegawai = (id) => rpc('hapus_pegawai', { p_id: id });
export const sinkronPegawai = () => rpc('sinkron_pegawai');
export const imporPegawai = (rows, uji = true) => rpc('impor_pegawai', { p_rows: rows, p_uji: uji });
export const ringkasanPegawai = () => rpc('ringkasan_pegawai');
export const daftarOjt = (f = {}) => rpc('daftar_ojt', { p_filter: f });
export const simpanOjt = (d) => rpc('simpan_ojt', { p_data: d });
export const hapusOjt = (id) => rpc('hapus_ojt', { p_id: id });
// Jadwal
export const jadwalBulan = (tahun, bulan) => rpc('jadwal_bulan', { p_tahun: tahun, p_bulan: bulan });
export const simpanJadwal = (d) => rpc('simpan_jadwal', { p_data: d });
export const ubahJadwal = (id, d, grup = true) => rpc('ubah_jadwal', { p_id: id, p_data: d, p_semua_grup: grup });
export const hapusJadwal = (id, grup = false) => rpc('hapus_jadwal', { p_id: id, p_semua_grup: grup });
export const aturHariLibur = (daftar) => rpc('atur_hari_libur', { p_daftar: daftar });
// Rencana kerja
export const daftarRenja = (f = {}) => rpc('daftar_renja', { p_filter: f });
export const simpanRenja = (d) => rpc('simpan_renja', { p_data: d });
export const ajukanRenja = (id) => rpc('ajukan_renja', { p_id: id });
export const verifikasiRenja = (id, setuju, catatan = null) => rpc('verifikasi_renja', { p_id: id, p_setuju: setuju, p_catatan: catatan });
export const hapusRenja = (id) => rpc('hapus_renja', { p_id: id });
// Dokumen Pokja & Bersama
export const daftarFolder = (pokja) => rpc('daftar_folder', { p_pokja: pokja });
export const buatFolder = (pokja, nama) => rpc('buat_folder', { p_pokja: pokja, p_nama: nama });
export const ubahFolder = (id, nama) => rpc('ubah_folder', { p_id: id, p_nama: nama });
export const hapusFolder = (id) => rpc('hapus_folder', { p_id: id });
export const daftarDokumen = (f = {}) => rpc('daftar_dokumen', { p_filter: f });
export const ubahDokumen = (id, d) => rpc('ubah_dokumen', { p_id: id, p_data: d });
export const ajukanPublikasi = (id, kategori) => rpc('ajukan_publikasi', { p_id: id, p_kategori: kategori });
export const batalPublikasi = (id) => rpc('batal_publikasi', { p_id: id });
export const verifikasiPublikasi = (id, setuju, kategori = null, catatan = null) =>
  rpc('verifikasi_publikasi', { p_id: id, p_setuju: setuju, p_kategori: kategori, p_catatan: catatan });
export const tarikPublikasi = (id, alasan) => rpc('tarik_publikasi', { p_id: id, p_alasan: alasan });
// Produk hukum
export const daftarProdukHukum = (f = {}) => rpc('daftar_produk_hukum', { p_filter: f });
export const simpanProdukHukum = (d) => rpc('simpan_produk_hukum', { p_data: d });
export const hapusProdukHukum = (id) => rpc('hapus_produk_hukum', { p_id: id });
// Tugas
export const daftarTugas = (f = {}) => rpc('daftar_tugas', { p_filter: f });
export const penerimaTugas = () => rpc('penerima_tugas');
export const simpanTugas = (d) => rpc('simpan_tugas', { p_data: d });
export const ubahStatusTugas = (id, status, catatan = null) => rpc('ubah_status_tugas', { p_id: id, p_status: status, p_catatan: catatan });
export const hapusTugas = (id) => rpc('hapus_tugas', { p_id: id });
// Pesan
export const daftarPercakapan = () => rpc('daftar_percakapan');
export const jumlahPesanBelum = () => rpc('jumlah_pesan_belum');
export const bukaPribadi = (penggunaId) => rpc('buka_pribadi', { p_pengguna: penggunaId });
export const bukaDiskusi = (tabel, ref) => rpc('buka_diskusi', { p_tabel: tabel, p_ref: String(ref) });
export const buatTopikLintas = (judul) => rpc('buat_topik_lintas', { p_judul: judul });
export const pesanPercakapan = (id, sebelum = null, batas = 50) => rpc('pesan_percakapan', { p_id: id, p_sebelum: sebelum, p_batas: batas });
export const kirimPesan = (id, isi) => rpc('kirim_pesan', { p_id: id, p_isi: isi });
export const tandaiBacaPercakapan = (id) => rpc('tandai_baca_percakapan', { p_id: id });
export const hapusPesan = (id) => rpc('hapus_pesan', { p_id: id });
export const kontakPesan = (q = '') => rpc('kontak_pesan', { p_q: q });
// Dokumentasi PM
export const statusDokPm = (bnbaId) => rpc('status_dok_pm', { p_bnba: bnbaId });
export const dokPmUsulan = (usulanId) => rpc('dok_pm_usulan', { p_usulan: usulanId });
export const ajukanTanpaDok = (bnbaId, kategori, alasan) => rpc('ajukan_tanpa_dok', { p_bnba: bnbaId, p_kategori: kategori, p_alasan: alasan });
export const putuskanTanpaDok = (id, setuju, catatan = null) => rpc('putuskan_tanpa_dok', { p_id: id, p_setuju: setuju, p_catatan: catatan });

// Realtime khusus halaman (pesan baru, jadwal, Supermonev). Kanal dipakai bersama. Mengembalikan fungsi berhenti.
export function langgananTabel(tabel, cb, filter = null) {
  return ikut('t-' + tabel + '|' + (filter || ''), (ch, kirim) => ch.on('postgres_changes', { event: '*', schema: 'public', table: tabel, ...(filter ? { filter } : {}) },
    (p) => kirim(p.new && Object.keys(p.new).length ? p.new : p.old, p.eventType)), cb);
}

// =====================================================================
// TAHAP 5 — Supermonev, penugasan petugas, verifikasi belanja
// =====================================================================
export const smvPetugas = () => rpc('smv_petugas');
export const smvPenugasan = (f = {}) => rpc('smv_penugasan', { p_filter: f });
export const smvTugaskan = (items, petugas, catatan = null) => rpc('smv_tugaskan', { p_item: items, p_petugas: petugas, p_catatan: catatan });
export const smvBatalTugas = (items) => rpc('smv_batal_tugas', { p_item: items });
export const smvTugasSaya = (f = {}) => rpc('smv_tugas_saya', { p_filter: f });
export const smvFormulir = (bnba, putaran) => rpc('smv_formulir', { p_bnba: bnba, p_putaran: Number(putaran) });
export const smvSimpan = (data, ajukan = false) => rpc('smv_simpan', { p_data: data, p_ajukan: !!ajukan });
export const smvVerifikasi = (id, setuju, hasil = null, ringkasan = null, catatan = null) =>
  rpc('smv_verifikasi', { p_id: id, p_setuju: setuju, p_hasil: hasil, p_ringkasan: ringkasan, p_catatan: catatan });
export const smvUbahRingkasan = (id, ringkasan) => rpc('smv_ubah_ringkasan', { p_id: id, p_ringkasan: ringkasan });
export const smvDaftar = (f = {}) => rpc('smv_daftar', { p_filter: f });
export const smvRiwayatPm = (bnba) => rpc('smv_riwayat_pm', { p_bnba: bnba });
export const smvDashboard = (f = {}) => rpc('smv_dashboard', { p_filter: f });
export const smvEkspor = (f = {}) => rpc('smv_ekspor', { p_filter: f });
export const aturSupermonev = (cfg) => rpc('atur_supermonev', { p_cfg: cfg });
export const belanjaDaftar = (f = {}) => rpc('belanja_daftar', { p_filter: f });
export const belanjaDetail = (bnba) => rpc('belanja_detail', { p_bnba: bnba });
export const belanjaSimpan = (bnba, data, ajukan = false) => rpc('belanja_simpan', { p_bnba: bnba, p_data: data, p_ajukan: !!ajukan });
export const belanjaVerifikasi = (bnba, setuju, catatan = null) => rpc('belanja_verifikasi', { p_bnba: bnba, p_setuju: setuju, p_catatan: catatan });

// =====================================================================
// TAHAP 6 — Pemeriksaan keamanan, kesehatan sistem, cadangan & pemulihan (Super Admin)
// =====================================================================
export const periksaKeamanan = () => rpc('periksa_keamanan');
export const kesehatanSistem = () => rpc('kesehatan_sistem');
export const cadanganDaftar = () => rpc('cadangan_daftar');
export const cadanganTabel = (tabel, offset = 0, batas = 1000) => rpc('cadangan_tabel', { p_tabel: tabel, p_offset: offset, p_batas: batas });
export const catatCadangan = (ringkasan) => rpc('catat_cadangan', { p_ringkasan: ringkasan });
export const pulihkanTabel = (tabel, baris, uji = true, peta = {}) => rpc('pulihkan_tabel', { p_tabel: tabel, p_baris: baris, p_uji: !!uji, p_peta: peta || {} });
