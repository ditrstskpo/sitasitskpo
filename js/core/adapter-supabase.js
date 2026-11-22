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

// ---------------------------------------------------------------- realtime
export function langganan({ penggunaId, onNotif, onPengumuman, onAkun, onUsulan }) {
  const ch = sb.channel('sitasi-' + penggunaId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifikasi', filter: `penerima_id=eq.${penggunaId}` }, (p) => onNotif?.(p.new))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pengumuman' }, () => onPengumuman?.())
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pengguna', filter: `id=eq.${penggunaId}` }, (p) => onAkun?.(p.new))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'usulan' }, (p) => onUsulan?.(p.new?.id || p.old?.id))
    .subscribe();
  return () => sb.removeChannel(ch);
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
