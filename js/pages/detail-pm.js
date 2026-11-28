// Detail PM (telusur per NIK): tab BNBA 40 kolom, Usulan & SK (11 tahap), Pencairan & Rekening,
// Dokumentasi (Tahap 4), Supermonev (Tahap 5), dan Riwayat. Data sensitif dibuka dengan ikon mata (tercatat).
import { html, raw, angka, tanggal, tanggalJam, inisial, warnaDari, hariIni } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { judulHalaman, kosong, kotakGalat, toast, pesanGalat, tombolMuat, konfirmasi, bukaModal } from '../core/ui.js';
import { tabs } from '../core/komp.js';
import { KOLOM, KOLOM_EKONOMI, GRUP, JENIS_BANTUAN, STATUS_BNBA, STATUS_USULAN, badge, chipTahap, stepperMini, infoTahap, URUT_TAHAP, rupiah, usia, bolehPenuh } from '../core/bnba.js';
import { pergi } from '../core/nav.js';
import { galeriFoto, pasangUnggah, muatGambarMini } from '../core/unggah.js';
import { panelDiskusi } from './_pesan.js';
import { lencanaHasil, lencanaStatus, STATUS_SMV, STATUS_BELANJA, sisaHari, bukaFormSmv, bukaBelanja, aturMingguan, labelPutaran, grafikMingguan, mingguanAktif } from './_smv.js';

export async function render(el, { sesi: s, param: nik }) {
  let d, tab = 'bnba', penuh = null;
  el.innerHTML = '<div class="skel" style="height:220px;border-radius:20px"></div>';
  try { d = await api.bnbaPerNik(nik); } catch (e) { el.innerHTML = String(kotakGalat(pesanGalat(e))); el.querySelector('[data-ulang]').onclick = () => render(el, { sesi: s, param: nik }); return; }
  const b = d.bnba, u = d.usulan, boleh = bolehPenuh(s, b.pokja_id);
  const nilai = (c) => {
    if (c.k === 'usia') return usia(b.tgl_lahir) !== '' ? usia(b.tgl_lahir) + ' tahun' : '—';
    if (['no_sk', 'tgl_sk', 'link_sk'].includes(c.k)) return c.k === 'tgl_sk' ? tanggal(u?.tgl_sk) : u?.[c.k] || '—';
    if (c.sensitif) return penuh?.[c.k] ?? b[c.k + '_samar'] ?? '—';
    if (c.k === 'jenis_bantuan') return JENIS_BANTUAN[b.jenis_bantuan] || '—';
    if (['nilai_bantuan', 'pendapatan_kotor_awal', 'biaya_awal'].includes(c.k)) return rupiah(b[c.k]);
    if (['tgl_lahir', 'tgl_sp2d'].includes(c.k)) return tanggal(b[c.k]);
    return b[c.k] ?? '—';
  };

  function isiTab() {
    if (tab === 'bnba') {
      return html`<div class="grid grid-2">${['profil', 'ktp', 'dom', 'umum', 'intervensi', 'ekonomi', 'sk', 'keu'].map((g) => html`<section class="card">
        <div class="card-head"><h3 class="card-title">${GRUP[g].replace(/ \(.*\)$/, '')}</h3>${g === 'profil' ? html`<span class="spacer"></span>${boleh ? html`<button class="btn btn-sm btn-secondary" data-buka-penuh>${raw(ikon(penuh ? 'eye-off' : 'eye', 16))} ${penuh ? 'Samarkan' : 'Buka data sensitif'}</button>` : html`<span class="badge b-lock kecil">${raw(ikon('lock', 12))} Sebagian tersamar</span>`}` : ''}</div>
        <dl class="kv-baris">${[...KOLOM, ...KOLOM_EKONOMI].filter((c) => c.g === g).map((c) => html`<div><dt>${c.x}</dt><dd class="${c.k === 'nik' || c.tipe === 'nik' || c.k === 'nomor_rekening' ? 'mono' : ''}">${nilai(c)}${c.sensitif && !penuh ? html` <span class="badge b-lock kecil">Tersamar</span>` : ''}</dd></div>`)}
          ${g === 'ekonomi' ? html`<div><dt>LABA BERSIH AWAL</dt><dd>${rupiah(b.laba_awal)}</dd></div>` : ''}</dl></section>`)}</div>`;
    }
    if (tab === 'usulan') {
      const st = Object.fromEntries(d.tahap.map((x) => [x.tahap, x.status]));
      return html`<section class="card"><div class="card-head"><span class="ubin">${raw(ikon('workflow', 20))}</span><div><h3 class="card-title">${u.judul}</h3><p class="card-sub mono">${u.no_register}</p></div><span class="spacer"></span>
          <a class="btn btn-secondary btn-sm" href="#/usulan/${u.id}">Buka Detail Usulan ${raw(ikon('arrow-right', 16))}</a></div>
        <div style="margin-bottom:16px">${stepperMini(st, u.status === 'ditolak')} ${badge(STATUS_USULAN, u.status)}</div>
        <div class="table-wrap"><table class="tbl"><thead><tr><th>Tahap</th><th>Status</th><th>Petugas (PIC)</th><th>Selesai</th></tr></thead><tbody>
          ${URUT_TAHAP.map((no) => { const x = d.tahap.find((y) => y.tahap === no) || {}; return html`<tr><td>${chipTahap(no)}</td><td>${x.status === 'selesai' ? html`<span class="badge b-ok kecil">${raw(ikon('check', 12))} Selesai</span>` : x.status === 'aktif' ? html`<span class="badge b-proc kecil">Aktif</span>` : html`<span class="badge b-lock kecil">Terkunci</span>`}</td>
            <td>${x.pic_nama || '—'}<small class="redup" style="display:block">${infoTahap(no).oleh}</small></td><td>${tanggalJam(x.selesai_pada)}</td></tr>`; })}
        </tbody></table></div></section>`;
    }
    if (tab === 'cair') {
      return html`<div class="grid grid-2"><section class="card"><div class="card-head"><span class="ubin emas">${raw(ikon('banknote', 20))}</span><h3 class="card-title">Pencairan &amp; Rekening</h3><span class="spacer"></span>
          ${u.status === 'selesai' ? html`<span class="badge b-ok">${raw(ikon('check-circle', 15))} Sudah cair ${tanggal(u.tgl_cair)}</span>` : html`<span class="badge b-wait">${raw(ikon('clock', 15))} Belum cair</span>`}</div>
        <dl class="kv-baris"><div><dt>Nama bank</dt><dd>${b.nama_bank || '—'}</dd></div><div><dt>Nomor rekening</dt><dd class="mono">${penuh?.nomor_rekening || b.nomor_rekening_samar || '—'}</dd></div>
          <div><dt>Nama pemilik rekening</dt><dd>${b.nama_pemilik_rek || '—'}</dd></div><div><dt>Akun bantuan (MAK)</dt><dd>${b.akun_bantuan || '—'}</dd></div>
          <div><dt>Rek giro bansos BNI</dt><dd class="mono">${b.rek_giro_bni || '—'}</dd></div><div><dt>NO SP2D</dt><dd class="mono">${b.no_sp2d || '—'}</dd></div>
          <div><dt>TGL / BULAN SP2D</dt><dd>${tanggal(b.tgl_sp2d)} ${b.bulan_sp2d || ''}</dd></div><div><dt>NO / TGL SK</dt><dd>${u.no_sk || '—'} · ${tanggal(u.tgl_sk)}</dd></div></dl></section>
        <section class="card"><div class="card-head"><span class="ubin">${raw(ikon('user-check', 20))}</span><h3 class="card-title">Petugas Penyalur</h3></div>
          ${d.penyaluran.filter((p) => p.semua_pm || p.nik_pm.includes(b.nik)).map((p) => html`<div class="berkas-baris"><span class="ik">${raw(ikon('user', 18))}</span><span class="nm"><b>${p.nama_petugas}</b><small>${p.instansi || ''} · ${p.kabkota || ''} · ${tanggal(p.tanggal)}</small></span></div>`)}
          ${!d.penyaluran.length ? html`<p class="redup">Belum ada petugas penyalur tercatat.</p>` : ''}
        </section></div><div data-belanja-pm style="margin-top:20px"></div>`;
    }
    if (tab === 'dok') return html`<div data-dok-pm><div class="skel" style="height:260px;border-radius:20px"></div></div>`;
    if (tab === 'diskusi') return html`<div data-diskusi></div>`;
    if (tab === 'smv') return html`<div data-smv-pm><div class="skel" style="height:260px;border-radius:20px"></div></div>`;
    return html`<section class="card"><dl class="kv-baris"><div><dt>Diinput oleh</dt><dd>${b.dibuat_oleh_nama || '—'}</dd></div><div><dt>Tanggal input</dt><dd>${tanggalJam(b.dibuat_pada)}</dd></div>
      <div><dt>Perubahan terakhir</dt><dd>${tanggalJam(b.diubah_pada)}</dd></div><div><dt>Status verifikasi</dt><dd>${badge(STATUS_BNBA, b.status_verifikasi)}</dd></div></dl>
      <p class="help" style="margin-top:12px">Riwayat perubahan per kolom (nilai sebelum dan sesudah) tercatat di audit log dan dapat dibuka Super Admin di Log Aktivitas.</p></section>`;
  }
  function gambar() {
    el.innerHTML = String(html`
      ${judulHalaman({ pill: 'Profil Penerima Manfaat · Telusur per NIK', sorot: 'Detail PM', sisa: '— ' + b.nama,
        aksi: String(html`<button class="btn btn-ghost" data-kembali>${raw(ikon('arrow-left', 18))} Kembali</button><button class="btn btn-secondary" data-cetak>${raw(ikon('printer', 18))} Cetak / PDF</button><button class="btn btn-primary" data-unduh-profil>${raw(ikon('presentation', 18))} Unduh Profil PPTX</button>`) })}
      <section class="card identitas">
        <span class="avatar besar" style="--c:${warnaDari(b.nama)}">${inisial(b.nama)}</span>
        <div class="id-utama"><small class="redup">Nomor Induk Kependudukan</small><div class="mono nik-besar">${b.nik}</div><h2>${b.nama}</h2>
          <p class="redup">No. KK ${penuh?.no_kk || b.no_kk_samar || '—'} · ${b.jenis_kelamin || '—'} · Usia ${usia(b.tgl_lahir) || '—'} tahun</p>
          <div class="chips" style="margin-top:8px">${b.klaster_ppks ? html`<span class="badge b-gold">Klaster: ${b.klaster_ppks}</span>` : ''}${b.desil ? html`<span class="badge b-fix">Desil ${b.desil}</span>` : ''}
            <span class="chip-pokja" style="--c:${b.pokja?.warna};--ct:${b.pokja?.warna_tint};--cx:${b.pokja?.warna_teks}">${b.pokja?.nama_pendek}</span></div></div>
        <div class="id-status"><div><small>1. Status BNBA</small>${badge(STATUS_BNBA, b.status_verifikasi)}</div>
          <div><small>2. Posisi usulan</small>${u.status === 'proses' ? chipTahap(u.tahap_aktif, { kecil: true }) : badge(STATUS_USULAN, u.status)}</div>
          <div><small>3. Bantuan</small><b>${JENIS_BANTUAN[b.jenis_bantuan] || '—'}</b><span class="angka">${rupiah(b.nilai_bantuan)}</span></div></div>
      </section>
      <div style="margin:24px 0 16px">${tabs([['bnba', 'BNBA (40 Kolom Standar)'], ['usulan', 'Usulan & SK (11 Tahap)'], ['cair', 'Pencairan & Rekening'], ['dok', 'Dokumentasi'], ['smv', 'Supermonev'], ['diskusi', 'Diskusi'], ['riwayat', 'Riwayat']], tab)}</div>
      <div>${isiTab()}</div>`);
    lepasDiskusi(); lepasDiskusi = () => {};
    if (tab === 'dok') muatDok();
    if (tab === 'smv' || tab === 'cair') muatSmv();
    if (tab === 'diskusi') panelDiskusi(el.querySelector('[data-diskusi]'), { tabel: 'bnba', ref: b.id }).then((f) => { lepasDiskusi = f; });
  }
  // Ekspor profil lengkap (1 orang 1 profil): PPTX atau cetak/PDF. NIK tampil lengkap (keperluan instansi); bisa disamarkan bila berkas dibagikan keluar.
  async function bukaEkspor(jenis) {
    const m = bukaModal({ judul: jenis === 'pptx' ? 'Unduh Profil PM (PowerPoint)' : 'Cetak / Simpan PDF Profil PM', ukuran: 'kecil',
      isi: String(html`<p class="redup" style="margin-top:0">Berisi data dari awal sampai Supermonev: BNBA, 11 tahap SK, pencairan &amp; penyalur, dokumentasi, dan hasil monitoring. Untuk keperluan internal instansi — NIK ditampilkan lengkap.</p>
        ${jenis === 'pptx' ? html`<label class="cek-pil" style="margin:6px 0"><input type="checkbox" data-ek-foto checked><span>Sertakan foto dokumentasi</span></label>` : ''}
        <label class="cek-pil" style="margin:6px 0"><input type="checkbox" data-ek-samar><span>Samarkan NIK (centang bila berkas akan dibagikan ke luar instansi)</span></label>
        <div class="galat" data-ek-progres hidden style="margin-top:12px"></div>`),
      kaki: String(html`<button type="button" class="btn btn-ghost" data-batal>Batal</button><button type="button" class="btn btn-primary" data-ek-ok>${raw(ikon(jenis === 'pptx' ? 'download' : 'printer', 18))} ${jenis === 'pptx' ? 'Unduh PPTX' : 'Cetak / PDF'}</button>`) });
    m.el.querySelector('[data-ek-ok]').onclick = async (ev) => {
      const pulih = tombolMuat(ev.currentTarget, 'Menyiapkan…');
      const nikPenuh = !m.el.querySelector('[data-ek-samar]').checked, foto = !!m.el.querySelector('[data-ek-foto]')?.checked;
      try {
        const [smv, dok] = await Promise.all([api.smvRiwayatPm(b.id).catch(() => null), (jenis === 'pptx' && foto ? api.statusDokPm(b.id) : Promise.resolve(null)).catch(() => null)]);
        if (nikPenuh) await api.bnbaLengkap(nik).catch(() => null);   // tercatat di audit log
        if (jenis === 'pptx') {
          const { unduhProfilPptx } = await import('./profil-pm-pptx.js');
          const pg = m.el.querySelector('[data-ek-progres]');
          await unduhProfilPptx({ d, smv, dok, foto, nikPenuh, progres: (n, t, ket) => { pg.hidden = false; pg.textContent = `${ket || 'Menyusun'} (${n}/${t})`; } });
          toast('Profil PM (PPTX) terunduh.', 'sukses', 'Ekspor selesai'); m.tutup();
        } else { const { cetakProfil } = await import('./profil-pm-cetak.js'); m.tutup(); cetakProfil({ d, smv, nikPenuh }); toast('Pada jendela cetak, pilih "Simpan sebagai PDF" bila ingin berkas PDF.', 'info'); }
      } catch (err) { pulih(); toast(pesanGalat(err), 'galat', 'Ekspor gagal'); }
    };
  }
  let lepasDiskusi = () => {};
  async function muatSmv() {
    const w = el.querySelector('[data-smv-pm]'), wb = el.querySelector('[data-belanja-pm]');
    let r;
    try { r = await api.smvRiwayatPm(b.id); aturMingguan(r.mingguan); } catch (e) { if (w) w.innerHTML = String(kotakGalat(pesanGalat(e))); return; }
    // v2.11.0: grafik per minggu + linimasa ringkas (6 minggu terakhir & minggu berikutnya; sisanya lewat tombol)
    const hi = hariIni(), jalan = r.putaran.filter((p) => p.jatuh_tempo <= hi || p.isian);
    const iJalan = r.putaran.map((p, k) => (p.jatuh_tempo <= hi || p.isian ? k : -1)).filter((k) => k >= 0), akhir = iJalan.length ? iJalan[iJalan.length - 1] : -1;
    const tampil = new Set(); for (let k = Math.max(0, akhir - 5); k <= Math.min(r.putaran.length - 1, akhir + 1); k++) tampil.add(k);
    if (!tampil.size && r.putaran.length) tampil.add(0);
    const tersembunyi = r.putaran.length - tampil.size;
    const kartuGrafik = jalan.length ? html`<section class="card" style="margin-bottom:20px"><div class="card-head"><span class="ubin">${raw(ikon('chart', 20))}</span>
        <div><h3 class="card-title">Grafik pendapatan bersih per ${mingguanAktif() ? 'minggu' : 'putaran'}</h3><p class="card-sub">Hanya isian terverifikasi · garis putus-putus = pendapatan sebelum bantuan</p></div></div>
        ${grafikMingguan(jalan.map((p) => ({ putaran: p.putaran, jatuh_tempo: p.jatuh_tempo, nilai: p.isian?.status === 'terverifikasi' ? p.isian.pendapatan_bersih : null, hasil: p.isian?.hasil })), { dasar: r.dasar })}
        <details class="tabel-grafik" style="margin-top:8px"><summary>Lihat sebagai tabel</summary><div class="table-wrap"><table class="tbl ringkas"><thead><tr><th>${mingguanAktif() ? 'Minggu' : 'Putaran'}</th><th>Jatuh tempo</th><th class="kanan">Pendapatan bersih</th><th>Hasil</th></tr></thead><tbody>
          ${jalan.map((p) => html`<tr><td>${p.label || labelPutaran(p.putaran)}</td><td>${tanggal(p.jatuh_tempo)}</td><td class="kanan">${p.isian?.status === 'terverifikasi' ? rupiah(p.isian.pendapatan_bersih) : '—'}</td>
            <td>${p.isian?.status === 'terverifikasi' ? lencanaHasil(p.isian.hasil) : html`<small class="redup">${p.isian ? STATUS_SMV[p.isian.status]?.l || p.isian.status : 'Belum diisi'}</small>`}</td></tr>`)}</tbody></table></div></details></section>` : '';
    const bl = r.belanja, kartuBelanja = r.belanja_layak ? html`<section class="card"><div class="card-head"><span class="ubin emas">${raw(ikon('receipt', 20))}</span>
        <div><h3 class="card-title">Verifikasi Belanja, BAST &amp; Inventaris</h3><p class="card-sub">Bantuan barang / aset usaha · diverifikasi Kapokja Supermonev</p></div><span class="spacer"></span>${lencanaStatus(STATUS_BELANJA, bl?.status || 'belum')}</div>
      ${bl?.inventaris?.length ? html`<div class="table-wrap"><table class="tbl ringkas"><thead><tr><th>Barang</th><th>Jumlah</th><th class="kanan">Nilai</th></tr></thead><tbody>${bl.inventaris.map((x) => html`<tr><td>${x.nama}</td><td>${x.jumlah} ${x.satuan || ''}</td><td class="kanan">${rupiah(x.nilai)}</td></tr>`)}
        <tr><td colspan="2"><b>Total</b></td><td class="kanan"><b>${rupiah(bl.total_nilai)}</b></td></tr></tbody></table></div>` : html`<p class="redup">Daftar inventaris belum diisi.</p>`}
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-top:12px"><small class="redup">${bl ? `${angka(bl.jumlah_berkas)} berkas · ${bl.diverifikasi_nama && bl.status === 'terverifikasi' ? 'diverifikasi ' + bl.diverifikasi_nama : bl.diisi_nama ? 'diisi ' + bl.diisi_nama : ''}` : 'Belum ada berkas'}</small>
        <button class="btn btn-secondary btn-sm" data-buka-belanja>${raw(ikon('receipt', 16))} Buka bukti belanja</button></div></section>` : '';
    if (wb) wb.innerHTML = String(kartuBelanja || html`<p class="help">${raw(ikon('info', 15))} PM ini tidak memerlukan verifikasi belanja (bukan bantuan barang/aset usaha, atau belum cair).</p>`);
    if (!w) return;
    w.innerHTML = String(html`<div class="grid grid-2" style="margin-bottom:20px">
        <section class="card"><div class="card-head"><span class="ubin">${raw(ikon('scale', 20))}</span><div><h3 class="card-title">Pendapatan sebelum bantuan</h3><p class="card-sub">Pembanding penilaian Supermonev (laba bersih per bulan)</p></div></div>
          <p class="angka-besar">${r.dasar == null ? '—' : rupiah(r.dasar)}</p><p class="redup">${r.dasar_sumber === 'bnba' ? `Dari BNBA: pendapatan ${rupiah(r.dasar_kotor)} − biaya ${rupiah(r.dasar_biaya)}` : r.dasar_sumber === 'isian' ? 'Dicatat petugas pada monitoring pertama' : 'Belum tercatat — akan ditanyakan petugas saat monitoring pertama.'}</p></section>
        ${kartuBelanja || html`<section class="card"><div class="card-head"><span class="ubin biru">${raw(ikon('calendar-clock', 20))}</span><h3 class="card-title">Jadwal monitoring</h3></div><p class="redup">${r.dimonitor ? (mingguanAktif() ? 'Setiap minggu, mulai 3 bulan setelah bantuan cair.' : 'Setiap 3 bulan setelah bantuan cair.') : 'Jenis bantuan PM ini tidak termasuk yang dimonitor Supermonev (pengaturan Super Admin).'}</p></section>`}</div>
      ${kartuGrafik}
      ${r.putaran.length ? html`<ol class="linimasa-smv" data-linimasa>${r.putaran.map((p, k) => { const i = p.isian, t = sisaHari(p.jatuh_tempo); return html`<li class="${i?.status || (t.n > 0 ? 'nanti' : 'tertunda')} ${tampil.has(k) ? '' : 'lm-sembunyi'}">
          <span class="lm-titik">${raw(ikon(i?.status === 'terverifikasi' ? 'check' : i ? 'pencil' : 'calendar', 16))}</span>
          <div class="lm-isi"><div class="lm-atas"><b>${p.label || labelPutaran(p.putaran)}</b><small>jatuh tempo ${tanggal(p.jatuh_tempo)}${!i && t.n != null ? ' · ' + t.teks : ''}</small><span class="spacer"></span>
            ${i?.hasil ? lencanaHasil(i.hasil) : i ? lencanaStatus(STATUS_SMV, i.status) : p.petugas_nama ? lencanaStatus(STATUS_SMV, 'ditugaskan') : t.n > 0 ? html`<span class="badge b-proc">${raw(ikon('calendar', 15))} Terjadwal</span>` : lencanaStatus(STATUS_SMV, 'belum_ditugaskan')}</div>
            ${i ? html`<p>Kunjungan ${tanggal(i.tgl_kunjungan)} · pendapatan bersih <b>${rupiah(i.pendapatan_bersih)}</b>${i.kenaikan != null ? html` <span class="${i.kenaikan > 0 ? 'naik' : 'turun'}">(${i.kenaikan > 0 ? '+' : ''}${angka(i.kenaikan)}%)</span>` : ''} · kondisi barang ${i.kondisi_barang || '—'}</p>
              ${i.ringkasan_kendala ? html`<p class="ringkas-kendala">${raw(ikon('sparkles', 15))} <span>${i.ringkasan_kendala}</span></p>` : ''}
              <div class="lm-aksi"><small class="redup">Diisi ${i.petugas_nama || '—'}${i.diverifikasi_nama && i.status === 'terverifikasi' ? ' · diverifikasi ' + i.diverifikasi_nama : ''}</small>
                <button class="btn btn-ghost btn-sm" data-buka-smv="${p.putaran}">${raw(ikon('eye', 16))} Lihat isian</button></div>`
              : html`<p class="redup">${p.petugas_nama ? 'Ditugaskan kepada ' + p.petugas_nama : t.n > 0 ? 'Belum jatuh tempo' : 'Belum ditugaskan'}.</p>`}</div></li>`; })}</ol>
        ${tersembunyi > 0 ? html`<div style="text-align:center;margin-top:8px"><button type="button" class="btn btn-ghost btn-sm" data-lm-semua>${raw(ikon('list', 16))} Tampilkan semua ${angka(r.putaran.length)} ${mingguanAktif() ? 'minggu' : 'putaran'}</button></div>` : ''}`
        : html`<section class="card">${kosong({ ikonNama: 'calendar-clock', judul: r.dimonitor ? 'Belum ada jadwal monitoring' : 'Tidak dimonitor Supermonev', teks: r.dimonitor ? 'Jadwal muncul otomatis 3 bulan setelah bantuan cair.' : 'Jenis bantuan PM ini tidak termasuk yang dimonitor (Super Admin dapat mengubahnya di menu Supermonev → Pengaturan Jadwal).' })}</section>`}`);
  }
  async function muatDok() {
    const w = el.querySelector('[data-dok-pm]'); if (!w) return;
    try {
      const st = await api.statusDokPm(b.id);
      const tanpaBtn = (k) => {
        if (k.opsional || k.berkas.length) return '';
        if (k.tanpa?.status === 'menunggu' && st.boleh_putuskan) return String(html`<div class="slot-aksi"><small class="redup">Pengajuan "tidak ada dokumentasi" menunggu keputusan Anda.</small>
          <button class="btn btn-ghost btn-sm" data-tanpa-tolak="${k.tanpa.id}">Tolak</button><button class="btn btn-primary btn-sm" data-tanpa-setuju="${k.tanpa.id}">Setujui</button></div>`);
        if (k.boleh && (!k.tanpa || k.tanpa.status === 'ditolak')) return String(html`<div class="slot-aksi"><button class="btn btn-ghost btn-sm" data-tanpa-ajukan="${k.kode}">${raw(ikon('image-off', 16))} Ajukan "tidak ada dokumentasi"</button>
          ${k.tanpa?.status === 'ditolak' ? html`<small style="color:var(--merah)">Pengajuan sebelumnya ditolak${k.tanpa.catatan ? ': ' + k.tanpa.catatan : ''}.</small>` : ''}</div>`);
        return '';
      };
      w.innerHTML = String(html`<div class="info-card biru" style="margin-bottom:16px">${raw(ikon('camera', 20, 'ik'))}<span>Unggah foto langsung dari kamera atau galeri (maks 2 foto per kategori, otomatis dikecilkan ≤ 1 MB).
          <b>Sebelum Usaha</b> diisi Pokja pengusul; <b>Saat Penyaluran</b> oleh Pokja pengusul atau Pokja TU; <b>Supermonev</b> oleh Pokja Supermonev (opsional).
          Status saat ini: <b>${st.status_cair === 'cair' ? 'sudah cair' : st.status_cair === 'belum_cair' ? 'SK terbit, belum cair' : 'dalam proses'}</b>.</span></div>
        <div class="galeri-grid">${st.kategori.map((k) => galeriFoto({ konteks: 'dok_pm', ref: b.id, jenis: k.kode, judul: k.label + (k.opsional ? ' (opsional)' : ''), maks: k.maks, berkas: k.berkas, boleh: k.boleh,
          wajib: !k.opsional && (k.kode === 'sebelum_usaha' || st.status_cair === 'cair'), tanpa: k.tanpa, aksiTanpa: tanpaBtn(k),
          ket: k.boleh ? `Maks ${k.maks} foto · 1 MB per foto` : 'Hanya dapat dilihat' }))}</div>`);
      muatGambarMini(w);
    } catch (e) { w.innerHTML = String(kotakGalat(pesanGalat(e))); }
  }
  pasangUnggah(el, { muatUlang: muatDok, judulJenis: { sebelum_usaha: 'Foto Sebelum Usaha', saat_penyaluran: 'Foto Saat Penyaluran', supermonev: 'Foto Supermonev' } });
  el.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; return gambar(); }
    const lm = e.target.closest('[data-lm-semua]'); if (lm) { const o = el.querySelector('[data-linimasa]'); const on = o.classList.toggle('semua'); lm.lastChild.textContent = on ? ' Ringkas' : ` Tampilkan semua`; return; }
    const sv = e.target.closest('[data-buka-smv]'); if (sv) return bukaFormSmv({ bnba_id: b.id, putaran: Number(sv.dataset.bukaSmv), onSelesai: muatSmv });
    if (e.target.closest('[data-buka-belanja]')) return bukaBelanja({ bnba_id: b.id, onSelesai: muatSmv });
    const ta = e.target.closest('[data-tanpa-ajukan]');
    if (ta) {
      const k = await konfirmasi({ judul: 'Ajukan "tidak ada dokumentasi"', pesan: 'Kapokja pemilik usulan akan memutuskan pengecualian ini. Jelaskan alasannya (mis. PM pindah domisili, lokasi tidak terjangkau).', label: 'Ajukan', alasan: { label: 'Alasan', wajib: true } });
      if (!k.ok) return;
      try { await api.ajukanTanpaDok(b.id, ta.dataset.tanpaAjukan, k.alasan); toast('Pengajuan dikirim ke Kapokja.'); muatDok(); } catch (err) { toast(pesanGalat(err), 'galat'); }
      return;
    }
    const tp = e.target.closest('[data-tanpa-setuju],[data-tanpa-tolak]');
    if (tp) {
      const setuju = tp.matches('[data-tanpa-setuju]');
      let catatan = null;
      if (!setuju) { const k = await konfirmasi({ judul: 'Tolak pengecualian', pesan: 'Pokja tetap wajib mengunggah foto untuk kategori ini.', label: 'Tolak', bahaya: true, alasan: { label: 'Catatan', wajib: true } }); if (!k.ok) return; catatan = k.alasan; }
      try { await api.putuskanTanpaDok(tp.dataset.tanpaSetuju || tp.dataset.tanpaTolak, setuju, catatan); toast(setuju ? 'Pengecualian disetujui.' : 'Pengecualian ditolak.'); muatDok(); } catch (err) { toast(pesanGalat(err), 'galat'); }
      return;
    }
    if (e.target.closest('[data-kembali]')) return history.length > 1 ? history.back() : pergi('/master-bnba');
    const pr = e.target.closest('[data-cetak], [data-unduh-profil]');
    if (pr) return bukaEkspor(pr.matches('[data-unduh-profil]') ? 'pptx' : 'pdf');
    const bp = e.target.closest('[data-buka-penuh]');
    if (bp) {
      if (penuh) { penuh = null; return gambar(); }
      const pulih = tombolMuat(bp, 'Membuka…');
      try { penuh = await api.bnbaLengkap(nik); toast('Data sensitif dibuka. Pembukaan ini tercatat di audit log.', 'info'); gambar(); }
      catch (err) { pulih(); toast(pesanGalat(err), 'galat'); }
    }
  });
  gambar();
  return () => lepasDiskusi();
}
