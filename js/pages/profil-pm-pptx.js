// v2.9.0 — Profil PM lengkap (1 orang = 1 profil) sebagai PPTX: dari BNBA, 11 tahap SK, pencairan, dokumentasi, sampai Supermonev.
// Untuk keperluan internal instansi: NIK tampil lengkap (bisa disamarkan bila dipilih). No. KK & rekening tetap disamarkan.
import { angka, tanggal } from '../core/util.js';
import { KOLOM, KOLOM_EKONOMI, GRUP, JENIS_BANTUAN, STATUS_BNBA, STATUS_USULAN, infoTahap, URUT_TAHAP, rupiah, usia } from '../core/bnba.js';
import { namaUnduhan } from '../core/komp.js';
import { CONFIG } from '../config.js';

const F = 'Calibri', GELAP = '0B3B2A', HIJAU = '17824A', EMAS = 'E7B416', JUDUL = '142033', REDUP = '66717E', GARIS = 'E3E8EE';
const hx = (c) => String(c || '#17824A').replace('#', '').toUpperCase();
const samarNik = (n) => (n && n.length >= 8 ? n.slice(0, 4) + '••••••••' + n.slice(-4) : n || '—');
const potong = (t, n) => { t = String(t ?? '—'); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t; };
const label = (m, k) => (m && m[k] && (m[k].l || m[k].label)) || k;

/** d = api.bnbaPerNik · smv = api.smvRiwayatPm · dok = api.statusDokPm (boleh null) · opsi { foto, nikPenuh } */
export async function unduhProfilPptx({ d, smv, dok, foto = true, nikPenuh = true, progres }) {
  const { muatPptx, blobKeData, fotoData } = await import('./smv-ekspor.js');
  const Pptx = await muatPptx(); const p = new Pptx();
  const b = d.bnba, u = d.usulan || {};
  p.layout = 'LAYOUT_WIDE'; p.author = 'SITASI TSKPO'; p.company = 'Direktorat RSTSKPO, Kementerian Sosial RI'; p.title = 'Profil PM — ' + b.nama;
  let logo = null;
  try { if (CONFIG.LOGO) { const r = await fetch(CONFIG.LOGO); if (r.ok) logo = await blobKeData(await r.blob()); } } catch {}
  const nik = nikPenuh ? b.nik : samarNik(b.nik);
  const lokasi = [b.kota_kab_penyaluran, b.prov_penyaluran].filter(Boolean).join(', ') || [b.dom_kabkota || b.ktp_kabkota, b.dom_provinsi || b.ktp_provinsi].filter(Boolean).join(', ');

  const kepala = (sl, judul, sub) => {
    sl.background = { color: 'F7F9FB' };
    sl.addShape(p.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 1.05, fill: { color: GELAP } });
    sl.addShape(p.ShapeType.rect, { x: 0, y: 1.05, w: 13.33, h: 0.05, fill: { color: EMAS } });
    sl.addText('PROFIL PENERIMA MANFAAT', { x: 0.5, y: 0.12, w: 6, h: 0.28, fontFace: F, fontSize: 11, bold: true, color: 'F2C94C', charSpacing: 2 });
    sl.addText(judul, { x: 0.5, y: 0.4, w: 8.3, h: 0.55, fontFace: F, fontSize: 24, bold: true, color: 'FFFFFF', fit: 'shrink' });
    sl.addText(potong(b.nama, 40) + '\n' + nik, { x: 8.7, y: 0.18, w: 4.2, h: 0.7, fontFace: F, fontSize: 12, color: 'B9CFC3', align: 'right', fit: 'shrink' });
  };
  const kaki = (sl, teks = '') => {
    sl.addText(teks, { x: 0.5, y: 7.05, w: 8.5, h: 0.3, fontFace: F, fontSize: 10, color: REDUP });
    sl.addText('SITASI TSKPO · Dit. RSTSKPO Kemensos RI', { x: 8.8, y: 7.05, w: 4.0, h: 0.3, fontFace: F, fontSize: 10, color: REDUP, align: 'right' });
  };
  const kotak = (sl, x, y, w, h, jd) => {
    sl.addShape(p.ShapeType.roundRect, { x, y, w, h, fill: { color: 'FFFFFF' }, line: { color: GARIS, width: 1 }, rectRadius: 0.1 });
    sl.addText(String(jd).toUpperCase(), { x: x + 0.2, y: y + 0.12, w: w - 0.4, h: 0.3, fontFace: F, fontSize: 11, bold: true, color: REDUP, charSpacing: 1 });
  };
  // tabel dua kolom label/nilai (nilai dibungkus; tinggi baris menyesuaikan panjang teks)
  const tabelKv = (sl, baris, x, y, w, { ukuran = 11, maks = 12 } = {}) => {
    const lw = w * 0.42;
    sl.addTable(baris.slice(0, maks).map(([k, v]) => [{ text: potong(k, 34), options: { bold: true, color: REDUP } }, { text: potong(v, 70), options: { color: JUDUL } }]),
      { x, y, w, colW: [lw, w - lw], fontFace: F, fontSize: ukuran, border: { type: 'solid', color: 'EEF1F4', pt: 1 }, valign: 'middle', margin: [3, 6, 3, 6], autoPage: false });
  };
  const nilaiKolom = (c) => {
    if (c.k === 'usia') return usia(b.tgl_lahir) !== '' ? usia(b.tgl_lahir) + ' tahun' : '—';
    if (['no_sk', 'tgl_sk'].includes(c.k)) return c.k === 'tgl_sk' ? tanggal(u.tgl_sk) : u.no_sk || '—';
    if (c.k === 'link_sk') return u.link_sk ? 'Tersedia' : '—';
    if (c.k === 'nik') return nik;
    if (c.sensitif) return b[c.k + '_samar'] ?? '—';
    if (c.k === 'jenis_bantuan') return JENIS_BANTUAN[b.jenis_bantuan] || '—';
    if (['nilai_bantuan', 'pendapatan_kotor_awal', 'biaya_awal'].includes(c.k)) return rupiah(b[c.k]);
    if (['tgl_lahir', 'tgl_sp2d'].includes(c.k)) return tanggal(b[c.k]);
    return b[c.k] ?? '—';
  };
  const semuaKolom = [...KOLOM, ...KOLOM_EKONOMI];
  const barisGrup = (g) => semuaKolom.filter((c) => c.g === g).map((c) => [c.x, nilaiKolom(c)]);
  const jmlSlide = 7;

  // ---- 1. sampul identitas
  progres?.(1, jmlSlide, 'Menyusun sampul…');
  let s = p.addSlide(); s.background = { color: GELAP };
  s.addShape(p.ShapeType.ellipse, { x: 9.2, y: -1.6, w: 6, h: 6, fill: { color: HIJAU, transparency: 70 } });
  s.addShape(p.ShapeType.ellipse, { x: -1.5, y: 4.8, w: 5, h: 5, fill: { color: EMAS, transparency: 82 } });
  if (logo) s.addImage({ data: logo.replace(/^data:/, ''), x: 0.7, y: 0.55, w: 0.9, h: 0.9, sizing: { type: 'contain', w: 0.9, h: 0.9 } });
  s.addText('PROFIL PENERIMA MANFAAT · 1 ORANG 1 PROFIL', { x: 0.7, y: 1.75, w: 11.5, h: 0.4, fontFace: F, fontSize: 14, bold: true, color: 'F2C94C', charSpacing: 3 });
  s.addText(b.nama, { x: 0.7, y: 2.2, w: 11.8, h: 1.0, fontFace: F, fontSize: 40, bold: true, color: 'FFFFFF', fit: 'shrink' });
  s.addText([{ text: `NIK ${nik}`, options: { breakLine: true } }, { text: [b.jenis_kelamin, usia(b.tgl_lahir) !== '' ? usia(b.tgl_lahir) + ' tahun' : null, b.klaster_ppks ? 'Klaster ' + b.klaster_ppks : null].filter(Boolean).join(' · ') }],
    { x: 0.7, y: 3.25, w: 11.8, h: 0.9, fontFace: F, fontSize: 16, color: 'B9CFC3', valign: 'top' });
  const kartu = [['1 · Status BNBA', STATUS_BNBA[b.status_verifikasi]?.l || STATUS_BNBA[b.status_verifikasi]?.label || b.status_verifikasi || '—'],
    ['2 · Posisi usulan', u.status === 'proses' ? `Tahap ${u.tahap_aktif} · ${infoTahap(u.tahap_aktif).nama}` : (STATUS_USULAN[u.status]?.l || STATUS_USULAN[u.status]?.label || u.status || '—')],
    ['3 · Bantuan', `${JENIS_BANTUAN[b.jenis_bantuan] || '—'}\n${rupiah(b.nilai_bantuan)}`]];
  kartu.forEach(([k, v], i) => {
    s.addShape(p.ShapeType.roundRect, { x: 0.7 + i * 4.1, y: 4.55, w: 3.9, h: 1.6, fill: { color: 'FFFFFF', transparency: 90 }, line: { color: 'FFFFFF', transparency: 80, width: 1 }, rectRadius: 0.15 });
    s.addText(k, { x: 0.9 + i * 4.1, y: 4.65, w: 3.5, h: 0.35, fontFace: F, fontSize: 12, color: 'B9CFC3' });
    s.addText(String(v), { x: 0.9 + i * 4.1, y: 5.0, w: 3.5, h: 1.05, fontFace: F, fontSize: 17, bold: true, color: 'FFFFFF', valign: 'top', fit: 'shrink' });
  });
  s.addText(`Pokja ${b.pokja?.nama_pendek || '—'} · ${lokasi || '—'}`, { x: 0.7, y: 6.45, w: 11.8, h: 0.35, fontFace: F, fontSize: 13, color: 'B9CFC3' });
  s.addText(`Dibuat ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} · SITASI TSKPO · Dit. RSTSKPO Kemensos RI`, { x: 0.7, y: 6.9, w: 11.8, h: 0.3, fontFace: F, fontSize: 11, italic: true, color: '8FB5A2' });

  // ---- 2. profil & alamat
  progres?.(2, jmlSlide, 'Profil BNBA…');
  s = p.addSlide(); kepala(s, '1 · Profil & Alamat (BNBA)', '');
  kotak(s, 0.4, 1.3, 4.1, 5.6, GRUP.profil.replace(/ \(.*\)$/, '')); tabelKv(s, barisGrup('profil'), 0.55, 1.75, 3.8, { maks: 14, ukuran: 10 });
  kotak(s, 4.65, 1.3, 4.1, 5.6, 'Alamat KTP'); tabelKv(s, barisGrup('ktp'), 4.8, 1.75, 3.8, { maks: 14, ukuran: 10 });
  kotak(s, 8.9, 1.3, 4.03, 5.6, 'Alamat domisili & umum'); tabelKv(s, [...barisGrup('dom'), ...barisGrup('umum')], 9.05, 1.75, 3.73, { maks: 14, ukuran: 10 });
  kaki(s, nikPenuh ? 'Dokumen internal instansi — tidak untuk disebarluaskan. No. KK dan rekening disamarkan.' : 'NIK, No. KK, dan rekening disamarkan.');

  // ---- 3. intervensi & ekonomi
  s = p.addSlide(); kepala(s, '2 · Rencana Intervensi & Ekonomi Awal', '');
  kotak(s, 0.4, 1.3, 6.1, 5.6, 'Rencana intervensi'); tabelKv(s, barisGrup('intervensi'), 0.55, 1.75, 5.8, { maks: 12, ukuran: 11 });
  kotak(s, 6.7, 1.3, 6.23, 5.6, 'Data dasar ekonomi (sebelum bantuan)');
  tabelKv(s, [...barisGrup('ekonomi'), ['Laba bersih awal', rupiah(b.laba_awal)]], 6.85, 1.75, 5.93, { maks: 12, ukuran: 11 });
  kaki(s);

  // ---- 4. usulan & 11 tahap
  progres?.(3, jmlSlide, '11 tahap SK…');
  s = p.addSlide(); kepala(s, '3 · Usulan & SK — 11 Tahap Pencairan', '');
  s.addText(`${potong(u.judul, 90)}  ·  ${u.no_register || ''}`, { x: 0.5, y: 1.2, w: 12.3, h: 0.35, fontFace: F, fontSize: 13, bold: true, color: JUDUL, fit: 'shrink' });
  const stt = Object.fromEntries((d.tahap || []).map((x) => [x.tahap, x]));
  const kepTab = ['Tahap', 'Nama tahap', 'Status', 'Petugas (PIC)', 'Selesai'].map((t) => ({ text: t, options: { bold: true, color: 'FFFFFF', fill: { color: GELAP } } }));
  s.addTable([kepTab, ...URUT_TAHAP.map((no) => { const x = stt[no] || {}, t = infoTahap(no); const st = x.status === 'selesai' ? 'Selesai' : x.status === 'aktif' || u.tahap_aktif === no ? 'Sedang berjalan' : x.status === 'ditolak' ? 'Dikembalikan' : 'Belum';
    return [{ text: no, options: { bold: true, color: hx(t.warna) } }, potong(t.nama, 38), { text: st, options: { bold: true, color: st === 'Selesai' ? '0E5530' : st === 'Sedang berjalan' ? '6B4E08' : REDUP } }, potong(x.pic_nama || t.oleh, 30), x.selesai_pada ? tanggal(String(x.selesai_pada).slice(0, 10)) : '—']; })],
  { x: 0.5, y: 1.65, w: 12.3, colW: [0.9, 4.2, 2.0, 3.4, 1.8], fontFace: F, fontSize: 11, color: JUDUL, border: { type: 'solid', color: 'EEF1F4', pt: 1 }, rowH: 0.4, valign: 'middle' });
  kaki(s, `No. SK ${u.no_sk || '—'} · ${tanggal(u.tgl_sk)}`);

  // ---- 5. pencairan & penyalur
  s = p.addSlide(); kepala(s, '4 · Pencairan, Rekening & Penyalur', '');
  kotak(s, 0.4, 1.3, 6.3, 5.6, 'Pencairan & rekening');
  tabelKv(s, [['Status pencairan', u.status === 'selesai' ? 'Sudah cair ' + tanggal(u.tgl_cair) : 'Belum cair'], ['Nama bank', b.nama_bank || '—'], ['Nomor rekening', b.nomor_rekening_samar || '—'], ['Pemilik rekening', b.nama_pemilik_rek || '—'],
    ['Akun bantuan (MAK)', b.akun_bantuan || '—'], ['No SP2D', b.no_sp2d || '—'], ['Tgl / bulan SP2D', `${tanggal(b.tgl_sp2d)} ${b.bulan_sp2d || ''}`.trim()], ['Nilai bantuan', rupiah(b.nilai_bantuan)]], 0.55, 1.75, 6.0, { ukuran: 12 });
  kotak(s, 6.9, 1.3, 6.03, 5.6, 'Petugas penyalur');
  const peny = (d.penyaluran || []).filter((x) => x.semua_pm || (x.nik_pm || []).includes(b.nik));
  if (peny.length) s.addTable(peny.slice(0, 6).map((x) => [{ text: potong(x.nama_petugas, 28), options: { bold: true } }, potong([x.instansi, x.kabkota].filter(Boolean).join(' · ') || '—', 42), x.tanggal ? tanggal(String(x.tanggal).slice(0, 10)) : '']),
    { x: 7.05, y: 1.75, w: 5.73, colW: [2.0, 2.6, 1.13], fontFace: F, fontSize: 11, color: JUDUL, border: { type: 'solid', color: 'EEF1F4', pt: 1 }, valign: 'middle', margin: [3, 6, 3, 6] });
  else s.addText('Belum ada petugas penyalur tercatat.', { x: 7.05, y: 1.8, w: 5.7, h: 0.4, fontFace: F, fontSize: 12, italic: true, color: REDUP });
  kaki(s);

  // ---- 6. dokumentasi foto
  progres?.(4, jmlSlide, 'Dokumentasi…');
  s = p.addSlide(); kepala(s, '5 · Dokumentasi Foto', '');
  const fotoList = [];
  for (const k of dok?.kategori || []) for (const f of (k.berkas || [])) if (/^image\//.test(f.mime || '') || !f.mime) fotoList.push({ id: f.id, kat: k.label });
  if (!foto) s.addText('Foto tidak disertakan pada berkas ini.', { x: 0.6, y: 1.5, w: 12, h: 0.4, fontFace: F, fontSize: 13, italic: true, color: REDUP });
  else if (!fotoList.length) s.addText('Belum ada foto dokumentasi.', { x: 0.6, y: 1.5, w: 12, h: 0.4, fontFace: F, fontSize: 13, italic: true, color: REDUP });
  else {
    let i = 0;
    for (const f of fotoList.slice(0, 6)) {
      const col = i % 3, bar = Math.floor(i / 3), x = 0.5 + col * 4.15, y = 1.35 + bar * 2.8; i++;
      s.addShape(p.ShapeType.roundRect, { x, y, w: 3.95, h: 2.65, fill: { color: 'FFFFFF' }, line: { color: GARIS, width: 1 }, rectRadius: 0.08 });
      try { const dt = await fotoData(f.id); if (dt) s.addImage({ data: dt.replace(/^data:/, ''), x: x + 0.1, y: y + 0.1, w: 3.75, h: 2.1, sizing: { type: 'cover', w: 3.75, h: 2.1 } }); } catch {}
      s.addText(potong(f.kat, 44), { x: x + 0.1, y: y + 2.25, w: 3.75, h: 0.3, fontFace: F, fontSize: 10, bold: true, color: REDUP });
    }
  }
  kaki(s, fotoList.length > 6 && foto ? `Menampilkan 6 dari ${fotoList.length} foto.` : '');

  // ---- 7+. Supermonev
  progres?.(5, jmlSlide, 'Supermonev…');
  s = p.addSlide(); kepala(s, '6 · Supermonev — Pemantauan Pascapenyaluran', '');
  s.addText(smv?.dimonitor === false ? 'Jenis bantuan ini tidak dimonitor Supermonev.' : `Pendapatan bersih sebelum bantuan: ${smv?.dasar == null ? '—' : rupiah(smv.dasar)}`, { x: 0.5, y: 1.2, w: 12.3, h: 0.4, fontFace: F, fontSize: 14, bold: true, color: JUDUL });
  const put = smv?.putaran || [];
  if (put.length) {
    const kt = ['Putaran', 'Jatuh tempo', 'Petugas', 'Status', 'Hasil', 'Pendapatan bersih', 'Perubahan'].map((t) => ({ text: t, options: { bold: true, color: 'FFFFFF', fill: { color: GELAP } } }));
    s.addTable([kt, ...put.slice(0, 10).map((x) => { const i = x.isian || {};
      return [{ text: 'Putaran ' + x.putaran, options: { bold: true } }, tanggal(x.jatuh_tempo), potong(i.petugas_nama || x.petugas_nama || '—', 24), i.status === 'terverifikasi' ? 'Terverifikasi' : i.status ? 'Terisi' : 'Belum diisi',
        i.hasil || '—', i.pendapatan_bersih == null ? '—' : rupiah(i.pendapatan_bersih), i.kenaikan == null ? '—' : (i.kenaikan > 0 ? '+' : '') + angka(i.kenaikan) + '%']; })],
    { x: 0.5, y: 1.75, w: 12.3, colW: [1.4, 1.7, 2.4, 1.7, 1.8, 2.0, 1.3], fontFace: F, fontSize: 11, color: JUDUL, border: { type: 'solid', color: 'EEF1F4', pt: 1 }, rowH: 0.42, valign: 'middle' });
  } else s.addText('Belum ada jadwal monitoring. Jadwal muncul otomatis 3 bulan setelah bantuan cair.', { x: 0.5, y: 1.8, w: 12.3, h: 0.5, fontFace: F, fontSize: 13, italic: true, color: REDUP });
  kaki(s, 'Monitoring setiap 3 bulan setelah pencairan.');
  for (const x of put.filter((q) => q.isian).slice(0, 4)) {
    const i = x.isian, sl = p.addSlide(); kepala(sl, `Supermonev · Putaran ${x.putaran}`, '');
    kotak(sl, 0.4, 1.3, 4.1, 5.6, 'Keberhasilan & keuangan');
    tabelKv(sl, [['Tanggal kunjungan', tanggal(i.tgl_kunjungan)], ['Hasil', i.hasil || '—'], ['Pendapatan kotor', rupiah(i.pendapatan_kotor)], ['Pengeluaran', rupiah(i.pengeluaran)],
      ['Pendapatan bersih', rupiah(i.pendapatan_bersih)], ['Perubahan', i.kenaikan == null ? '—' : (i.kenaikan > 0 ? '+' : '') + angka(i.kenaikan) + '%'], ['Tambahan pekerja', angka(i.tambah_pekerja || 0) + ' orang']], 0.55, 1.75, 3.8, { ukuran: 11 });
    kotak(sl, 4.65, 1.3, 4.1, 5.6, 'Situasi barang & modal');
    tabelKv(sl, [['Kondisi barang', i.kondisi_barang || '—'], ['Modal usaha', rupiah(i.modal_usaha)], ['Sumber modal', i.sumber_modal || '—'], ['Usaha berjalan', i.usaha_berjalan == null ? '—' : i.usaha_berjalan ? 'Ya' : 'Tidak'], ['Catatan barang', i.catatan_barang || '—']], 4.8, 1.75, 3.8, { ukuran: 11 });
    kotak(sl, 8.9, 1.3, 4.03, 5.6, 'Kendala');
    sl.addText(i.ringkasan_kendala || i.kendala || 'Tidak ada kendala tercatat.', { x: 9.1, y: 1.8, w: 3.65, h: 3.0, fontFace: F, fontSize: 13, italic: true, color: JUDUL, valign: 'top', fit: 'shrink' });
    if ((i.kategori_kendala || []).length) sl.addText(i.kategori_kendala.join(' · '), { x: 9.1, y: 4.9, w: 3.65, h: 0.8, fontFace: F, fontSize: 11, bold: true, color: '8E3422', valign: 'top', fit: 'shrink' });
    kaki(sl, `Petugas ${i.petugas_nama || '—'} · Diverifikasi ${i.diverifikasi_nama || '—'}`);
  }
  progres?.(jmlSlide, jmlSlide, 'Menyimpan berkas…');
  await p.writeFile({ fileName: namaUnduhan('Profil-PM-' + String(b.nama || 'PM').replace(/[^\w]+/g, '-').slice(0, 30)) + '.pptx' });
}
