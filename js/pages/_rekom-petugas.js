// Rekomendasi petugas Supermonev untuk sekelompok PM: (1) petugas yang menyalurkan bantuan ke PM/kab-kota itu,
// (2) pegawai yang berdomisili di kab/kota yang sama, (3) berdomisili di provinsi yang sama. Beban kerja jadi pembeda.
const norm = (s) => String(s || '').toLowerCase().replace(/\b(kabupaten|kab\.?|kota|administrasi)\b/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const sama = (a, b) => !!norm(a) && norm(a) === norm(b);
export const lokasiPenyaluran = (r) => [r.kab_penyaluran || r.kabkota, r.prov_penyaluran || r.provinsi].filter(Boolean).join(', ') || '—';

/** @returns {Array<{p, skor:number, alasan:string[]}>} semua petugas, terurut: rekomendasi dulu */
export function rekomendasi(rows, petugas) {
  const kab = [...new Set(rows.map((r) => r.kab_penyaluran || r.kabkota).filter(Boolean))];
  const prov = [...new Set(rows.map((r) => r.prov_penyaluran || r.provinsi).filter(Boolean))];
  const penyalur = new Set(rows.flatMap((r) => r.penyalur || []).map((x) => String(x).trim().toLowerCase()));
  const hasil = petugas.map((p) => {
    const alasan = []; let skor = 0;
    if (penyalur.has(String(p.nama).trim().toLowerCase())) { alasan.push('Petugas penyalur PM ini'); skor += 100; }
    const kabSalur = (p.kab_salur || []).find((k) => kab.some((x) => sama(k, x)));
    if (kabSalur) { alasan.push('Pernah menyalurkan di ' + kabSalur); skor += 80; }
    if (p.domisili_kabkota && kab.some((x) => sama(p.domisili_kabkota, x))) { alasan.push('Berdomisili di ' + p.domisili_kabkota); skor += 60; }
    else if (p.domisili_provinsi && prov.some((x) => sama(p.domisili_provinsi, x))) { alasan.push('Berdomisili di provinsi ' + p.domisili_provinsi); skor += 30; }
    return { p, skor, alasan };
  });
  return hasil.sort((a, b) => b.skor - a.skor || a.p.beban - b.p.beban || a.p.nama.localeCompare(b.p.nama));
}
