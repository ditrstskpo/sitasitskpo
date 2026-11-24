// Aturan peran di sisi tampilan (menu & tombol). Penjaga sesungguhnya tetap
// Row Level Security di basis data; ini hanya agar tampilan sesuai peran.

export const peranEfektif = (s) => s?.efektif?.peran || null;
export const isSuperAdmin = (s) => peranEfektif(s) === 'super_admin';
export const isSuperAdminAsli = (s) => s?.pengguna?.peran_sistem === 'super_admin';
export const isDirektur = (s) => peranEfektif(s) === 'direktur';
export const isPetugas = (s) => peranEfektif(s) === 'petugas_supermonev';   // petugas lapangan murni: menu terbatas
export const isBank = (s) => peranEfektif(s) === 'petugas_bank';
export const jugaSupermonev = (s) => !!s?.efektif?.juga_supermonev;            // pegawai Direktorat yang juga Supermonev
export const bisaSupermonev = (s) => isPetugas(s) || jugaSupermonev(s);
export const isPegawai = (s) => ['super_admin', 'direktur', 'pegawai'].includes(peranEfektif(s));
export const pokjaEfektif = (s) => s?.efektif?.pokja || [];
export const diPokja = (s, kode, jabatan) => pokjaEfektif(s).some((p) => p.kode === kode && (!jabatan || p.jabatan === jabatan));
export const isKapokja = (s) => pokjaEfektif(s).some((p) => p.jabatan === 'kapokja');
/** Petugas Verif: anggota Pokja yang ditunjuk Kapokja untuk memverifikasi BNBA dan SK/Nota Dinas pokjanya. */
export const isVerifikator = (s) => pokjaEfektif(s).some((p) => p.verifikator);
export const bisaVerifikasi = (s) => isKapokja(s) || isVerifikator(s);
export const bolehKelolaPengumuman = (s) => isSuperAdmin(s) || diPokja(s, 'TU');
export const halamanAwal = (s) => (isBank(s) ? '/burekol-bank' : isPetugas(s) ? '/supermonev' : '/beranda');

export function labelPokjaSaya(s) {
  const p = pokjaEfektif(s);
  if (!p.length) return '';
  return 'Pokja ' + p.map((x) => x.nama_pendek).join(', ');
}
