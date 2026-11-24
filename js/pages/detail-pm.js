// Detail PM (telusur per NIK): tab BNBA 40 kolom, Usulan & SK (11 tahap), Pencairan & Rekening,
// Dokumentasi (Tahap 4), Supermonev (Tahap 5), dan Riwayat. Data sensitif dibuka dengan ikon mata (tercatat).
import { html, raw, angka, tanggal, tanggalJam, inisial, warnaDari } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { judulHalaman, kosong, kotakGalat, toast, pesanGalat, tombolMuat, konfirmasi } from '../core/ui.js';
import { tabs } from '../core/komp.js';
import { KOLOM, KOLOM_EKONOMI, GRUP, JENIS_BANTUAN, STATUS_BNBA, STATUS_USULAN, badge, chipTahap, stepperMini, infoTahap, URUT_TAHAP, rupiah, usia, bolehPenuh } from '../core/bnba.js';
import { pergi } from '../core/nav.js';
import { galeriFoto, pasangUnggah, muatGambarMini } from '../core/unggah.js';
import { panelDiskusi } from './_pesan.js';

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
          <p class="help" style="margin-top:12px">Verifikasi belanja, BAST, dan inventaris aset usaha hadir pada Tahap 5 (Supermonev).</p></section></div>`;
    }
    if (tab === 'dok') return html`<div data-dok-pm><div class="skel" style="height:260px;border-radius:20px"></div></div>`;
    if (tab === 'diskusi') return html`<div data-diskusi></div>`;
    if (tab === 'smv') return html`<section class="card">${kosong({ ikonNama: 'clipboard-list', judul: 'Supermonev hadir di Tahap 5', teks: `Pembanding penilaian: laba bersih sebelum bantuan ${rupiah(b.laba_awal)} per bulan. Monitoring dijadwalkan setiap 3 bulan setelah pencairan.` })}</section>`;
    return html`<section class="card"><dl class="kv-baris"><div><dt>Diinput oleh</dt><dd>${b.dibuat_oleh_nama || '—'}</dd></div><div><dt>Tanggal input</dt><dd>${tanggalJam(b.dibuat_pada)}</dd></div>
      <div><dt>Perubahan terakhir</dt><dd>${tanggalJam(b.diubah_pada)}</dd></div><div><dt>Status verifikasi</dt><dd>${badge(STATUS_BNBA, b.status_verifikasi)}</dd></div></dl>
      <p class="help" style="margin-top:12px">Riwayat perubahan per kolom (nilai sebelum dan sesudah) tercatat di audit log dan dapat dibuka Super Admin di Log Aktivitas.</p></section>`;
  }
  function gambar() {
    el.innerHTML = String(html`
      ${judulHalaman({ pill: 'Profil Penerima Manfaat · Telusur per NIK', sorot: 'Detail PM', sisa: '— ' + b.nama,
        aksi: String(html`<button class="btn btn-ghost" data-kembali>${raw(ikon('arrow-left', 18))} Kembali</button><button class="btn btn-secondary" data-cetak>${raw(ikon('printer', 18))} Cetak Ringkasan</button>`) })}
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
    if (tab === 'diskusi') panelDiskusi(el.querySelector('[data-diskusi]'), { tabel: 'bnba', ref: b.id }).then((f) => { lepasDiskusi = f; });
  }
  let lepasDiskusi = () => {};
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
      w.innerHTML = String(html`<div class="info-card biru" style="margin-bottom:16px">${raw(ikon('camera', 20, 'ik'))}<span>Unggah foto langsung dari kamera atau galeri (maks 2 foto per kategori, otomatis dikecilkan ≤ 500 KB).
          <b>Sebelum Usaha</b> diisi Pokja pengusul; <b>Saat Penyaluran</b> oleh Pokja pengusul atau Pokja TU; <b>Supermonev</b> oleh Pokja Supermonev (opsional).
          Status saat ini: <b>${st.status_cair === 'cair' ? 'sudah cair' : st.status_cair === 'belum_cair' ? 'SK terbit, belum cair' : 'dalam proses'}</b>.</span></div>
        <div class="galeri-grid">${st.kategori.map((k) => galeriFoto({ konteks: 'dok_pm', ref: b.id, jenis: k.kode, judul: k.label + (k.opsional ? ' (opsional)' : ''), maks: k.maks, berkas: k.berkas, boleh: k.boleh,
          wajib: !k.opsional && (k.kode === 'sebelum_usaha' || st.status_cair === 'cair'), tanpa: k.tanpa, aksiTanpa: tanpaBtn(k),
          ket: k.boleh ? `Maks ${k.maks} foto · 500 KB per foto` : 'Hanya dapat dilihat' }))}</div>`);
      muatGambarMini(w);
    } catch (e) { w.innerHTML = String(kotakGalat(pesanGalat(e))); }
  }
  pasangUnggah(el, { muatUlang: muatDok, judulJenis: { sebelum_usaha: 'Foto Sebelum Usaha', saat_penyaluran: 'Foto Saat Penyaluran', supermonev: 'Foto Supermonev' } });
  el.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; return gambar(); }
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
    if (e.target.closest('[data-cetak]')) return window.print();
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
