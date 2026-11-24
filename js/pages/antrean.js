// W-06 Antrean Verifikasi Kapokja: pemeriksaan bundel usulan BNBA (sekali, Setujui / Kembalikan).
import { html, raw, angka, tanggalJam, debounce } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { swr, hapusCache, bus } from '../core/store.js';
import { judulHalaman, kosong, kotakGalat, toast, pesanGalat, tombolMuat, bukaModal, konfirmasi } from '../core/ui.js';
import { tabelObjek, tautanAman } from '../core/komp.js';
import { rupiah, usia, barisEkspor, chipPokjaU, JENIS_BANTUAN } from '../core/bnba.js';
import * as P from '../core/peran.js';

export async function render(el, { sesi: s, query }) {
  const kapokjaIds = P.isSuperAdmin(s) ? [] : P.pokjaEfektif(s).filter((p) => p.jabatan === 'kapokja' || p.verifikator).map((p) => p.id);
  const bisaBnba = P.isSuperAdmin(s) || kapokjaIds.length > 0;
  let pilihId = query.get('id') || null, cari = '', daftar = [];

  el.innerHTML = String(html`
    ${judulHalaman({ pill: 'Otorisasi Satu Pintu · Tahap 2 Verifikasi Kapokja', sorot: 'Antrean Verifikasi', sisa: 'Kapokja — Pemeriksaan Bundel Usulan BNBA',
      sub: 'Periksa seluruh BNBA (40 kolom) dan link profil asesmen dalam satu usulan, lalu Setujui atau Kembalikan dengan catatan. Verifikasi dilakukan satu kali.',
      aksi: String(html`<button class="btn btn-secondary" data-cetak>${raw(ikon('printer', 18))} Cetak Lembar Verifikasi</button>`) })}
    ${!bisaBnba ? html`<div class="info-card biru">${raw(ikon('info', 20, 'ik'))}<span>Verifikasi usulan BNBA hanya untuk Kapokja atau Petugas Verif Pokja pemilik usulan.
      Antrean verifikasi Data LKS untuk Pokja TU dan Pokja Data aktif pada Tahap 3 pembangunan.</span></div>` : html`
    <div class="antrean-grid">
      <aside>
        <section class="card"><div class="card-head"><span class="ubin">${raw(ikon('inbox', 20))}</span><div><h2 class="card-title">Antrean Masuk</h2></div><span class="spacer"></span><span class="badge b-wait" data-jml>…</span></div>
          <label class="input-ikon" style="margin-bottom:12px">${raw(ikon('search', 18))}<input class="input" data-cari placeholder="Cari nomor usulan, judul, lokasi" aria-label="Cari antrean"></label>
          <div class="antrean-list" data-list><div class="skel" style="height:120px;border-radius:16px"></div></div></section>
        <section class="card" style="margin-top:16px" data-kinerja></section>
      </aside>
      <section data-detail><div class="skel" style="height:420px;border-radius:20px"></div></section>
    </div>`}`);
  if (!bisaBnba) return;
  const $ = (q) => el.querySelector(q);

  function gambarList() {
    const q = cari.toLowerCase(), v = daftar.filter((u) => !q || [u.judul, u.no_register, u.kabkota].some((x) => String(x || '').toLowerCase().includes(q)));
    $('[data-jml]').textContent = `${daftar.length} menunggu`;
    $('[data-list]').innerHTML = String(v.length ? html`${v.map((u) => html`<button type="button" class="antrean-item ${u.id === pilihId ? 'aktif' : ''}" data-pilih="${u.id}">
      <span class="baris-atas">${u.id === pilihId ? html`<span class="badge b-ok kecil">Sedang ditelaah</span>` : html`<span class="badge b-wait kecil">Menunggu</span>`}<b>${angka(u.jumlah_pm)} PM</b></span>
      <span class="mono redup">${u.no_register}</span><b class="judul-sel">${u.judul}</b>
      <small>Pengusul: ${u.pembuat_nama || '—'} · ${u.pokja_nama}</small><small>Submit: ${tanggalJam(u.tgl_submit)}</small>
      <span class="nilai">${rupiah(u.nilai_total)}</span></button>`)}`
      : kosong({ ikonNama: 'check-circle', judul: 'Antrean kosong', teks: 'Tidak ada usulan yang menunggu verifikasi Anda.' }));
  }
  async function gambarKinerja() {
    try {
      const st = await api.statusUsulan({ pokja: kapokjaIds });
      const ok = st.filter((x) => ['proses', 'selesai'].includes(x.status));
      $('[data-kinerja]').innerHTML = String(html`<div class="card-head"><span class="ubin biru">${raw(ikon('chart', 20))}</span><div><h2 class="card-title">Kinerja Otorisasi Pokja</h2></div></div>
        <div class="mini-kpi"><div class="hijau"><small>Selesai Disetujui</small><b>${angka(ok.length)}</b><span>bundel</span></div>
          <div class="merah"><small>Perlu Perbaikan</small><b>${angka(st.filter((x) => x.status === 'perlu_perbaikan').length)}</b><span>bundel</span></div></div>
        <div class="mini-total"><small>Total PM disetujui</small><b>${angka(ok.reduce((a, x) => a + x.jumlah_pm, 0))} jiwa</b></div>`);
    } catch {}
  }
  async function gambarDetail() {
    const box = $('[data-detail]');
    if (!pilihId) { box.innerHTML = String(html`<section class="card">${kosong({ ikonNama: 'inbox', judul: 'Pilih usulan', teks: 'Pilih usulan di antrean untuk mulai memeriksa.' })}</section>`); return; }
    box.innerHTML = '<div class="skel" style="height:420px;border-radius:20px"></div>';
    try {
      const [d, pm] = await Promise.all([api.usulanDetail(pilihId), api.bnbaUsulan(pilihId)]);
      const u = d.usulan;
      box.innerHTML = String(html`
        <section class="card">
          <div class="chips" style="margin-bottom:12px"><span class="badge b-proc mono">${u.no_register}</span>${chipPokjaU(u)}<span class="badge b-lock">${raw(ikon('map-pin', 14))} ${u.kabkota || '—'}</span>
            <span class="spacer"></span><small class="redup">Registrasi: ${tanggalJam(u.tgl_submit)}</small></div>
          <h2 class="judul-detail">${u.judul}</h2><p class="redup">${u.kategori} · Disusun oleh ${u.pembuat_nama || '—'}</p>
          <div class="grid grid-2" style="margin-top:16px">
            <div class="kotak-nilai"><small>Total Pagu Bundel</small><b>${rupiah(u.nilai_total)}</b><span>${angka(pm.length)} penerima manfaat</span></div>
            ${u.link_profil ? html`<a class="kotak-nilai tautan" href="${tautanAman(u.link_profil)}" target="_blank" rel="noopener"><small>Profil Asesmen Kolektif</small><b>Buka link profil ${raw(ikon('external', 16))}</b><span>Repositori berkas asesmen</span></a>`
              : html`<div class="kotak-nilai"><small>Profil Asesmen</small><b class="teks-merah">Belum ada link</b></div>`}
          </div>
          <div class="info-card" style="margin-top:16px">${raw(ikon('shield', 20, 'ik'))}<span><b>Petunjuk teknis:</b> periksa kesesuaian 40 kolom BNBA, kelayakan rencana intervensi, dan profil asesmen.
            Verifikasi dilakukan <b>tepat satu kali</b>. Bila disetujui, usulan terkunci dan otomatis masuk Tahap 3 (Draft SK &amp; Nota Dinas) tanpa persetujuan Kapokja kedua.</span></div>
        </section>
        <section class="card" style="margin-top:16px">
          <div class="card-head"><span class="ubin">${raw(ikon('users', 20))}</span><div><h2 class="card-title">Daftar Penerima Manfaat (${angka(pm.length)} Orang)</h2></div><span class="spacer"></span>
            <button class="btn btn-secondary btn-sm" data-40>${raw(ikon('grid', 16))} Tampilkan 40 Kolom BNBA</button></div>
          <div class="akordeon">${pm.map((b, i) => html`<details ${i === 0 ? raw('open') : ''}>
            <summary><span class="pm-bulat">${i + 1}</span><span class="pm-id"><b>${b.nama}</b><small class="mono">NIK: ${b.nik} · KK: ${b.no_kk_samar || '—'}</small></span>
              <span class="pm-int"><small>Intervensi</small><b>${b.jenis_bantuan || '—'}</b></span><span class="pm-nilai"><small>Nilai usulan</small><b>${rupiah(b.nilai_bantuan)}</b></span>${raw(ikon('chevron-down', 18, 'putar'))}</summary>
            <div class="grid grid-3 isi-pm">
              <div><h4>${raw(ikon('map-pin', 16))} Alamat &amp; Kependudukan</h4><dl class="kv kecil"><div><dt>Tempat/Tgl lahir</dt><dd>${b.tempat_lahir || '—'}, ${b.tgl_lahir || '—'} (${usia(b.tgl_lahir)} th)</dd></div>
                <div><dt>Jenis kelamin</dt><dd>${b.jenis_kelamin || '—'}</dd></div><div><dt>Alamat KTP</dt><dd>${b.ktp_jalan_samar || ''} ${b.ktp_kelurahan || ''}, ${b.ktp_kecamatan || ''}, ${b.ktp_kabkota || ''}</dd></div><div><dt>Desil</dt><dd>${b.desil || '—'}</dd></div></dl></div>
              <div><h4>${raw(ikon('target', 16))} Rencana Intervensi</h4><dl class="kv kecil"><div><dt>Klaster</dt><dd>${b.klaster_ppks || '—'}</dd></div><div><dt>Jenis bantuan</dt><dd>${JENIS_BANTUAN[b.jenis_bantuan] || '—'}</dd></div>
                <div><dt>Uraian</dt><dd>${b.uraian || '—'}</dd></div><div><dt>Rincian barang</dt><dd>${b.rincian_barang || '—'}</dd></div></dl></div>
              <div><h4>${raw(ikon('banknote', 16))} Ekonomi Sebelum Bantuan</h4><dl class="kv kecil"><div><dt>Pendapatan kotor/bln</dt><dd>${rupiah(b.pendapatan_kotor_awal)}</dd></div>
                <div><dt>Biaya/bln</dt><dd>${rupiah(b.biaya_awal)}</dd></div><div><dt>Laba bersih awal</dt><dd>${rupiah(b.laba_awal)}</dd></div><div><dt>Pekerjaan saat ini</dt><dd>${b.pekerjaan_kini || '—'}</dd></div></dl></div>
            </div></details>`)}</div>
          <div class="total-baris">${raw(ikon('clipboard-check', 18))} Total ${angka(pm.length)} orang <span class="spacer"></span> Akumulasi usulan <b>${rupiah(u.nilai_total)}</b></div>
        </section>
        <section class="card" style="margin-top:16px" data-keputusan>
          <div class="card-head"><span class="ubin emas">${raw(ikon('gavel', 20))}</span><div><h2 class="card-title">Lembar Keputusan Otorisasi Kapokja</h2><p class="card-sub">Pilih tindakan akhir untuk keseluruhan usulan bundel ini.</p></div></div>
          <div class="pilihan"><label><input type="radio" name="kep" value="setuju" checked><span><b>Setujui 1 Bundel Usulan</b><small>Usulan otomatis masuk Tahap 3 Draft SK &amp; Nota Dinas.</small></span></label>
            <label><input type="radio" name="kep" value="kembali"><span><b>Kembalikan untuk Perbaikan</b><small>Dikembalikan ke pengusul dengan catatan; diperbaiki pada record yang sama.</small></span></label></div>
          <div class="field" style="margin-top:16px"><label class="label" for="kep-cat">Catatan disposisi / verifikasi<span class="wajib" data-wajib hidden>*</span></label>
            <textarea id="kep-cat" class="textarea" rows="3" placeholder="Contoh: Berkas asesmen dan 40 kolom BNBA lengkap. Disetujui untuk penyusunan Draft SK."></textarea><div class="err" hidden></div></div>
          <div class="form-aksi"><span class="redup">Keputusan tercatat permanen di riwayat usulan dan log aktivitas.</span><span class="spacer"></span>
            <button class="btn btn-primary" data-putus>${raw(ikon('check-circle', 18))} Setujui 1 Bundel Usulan (${angka(pm.length)} PM)</button></div>
        </section>`);
      box.querySelector('[data-40]').onclick = () => bukaModal({ judul: '40 Kolom BNBA — ' + u.no_register, ukuran: 'besar penuh',
        isi: String(tabelObjek(pm.map((b) => barisEkspor(b, u)), Object.keys(barisEkspor({}, u)))) });
      box.querySelectorAll('input[name=kep]').forEach((r) => r.onchange = () => {
        const kembali = box.querySelector('input[name=kep]:checked').value === 'kembali', btn = box.querySelector('[data-putus]');
        box.querySelector('[data-wajib]').hidden = !kembali;
        btn.className = 'btn ' + (kembali ? 'btn-danger' : 'btn-primary');
        btn.innerHTML = String(html`${raw(ikon(kembali ? 'undo' : 'check-circle', 18))} ${kembali ? 'Kembalikan untuk Perbaikan' : `Setujui 1 Bundel Usulan (${angka(pm.length)} PM)`}`);
      });
      box.querySelector('[data-putus]').onclick = async (e) => {
        const setuju = box.querySelector('input[name=kep]:checked').value === 'setuju', cat = box.querySelector('#kep-cat').value.trim();
        if (!setuju && !cat) { const er = box.querySelector('.err'); er.hidden = false; er.textContent = 'Catatan wajib diisi saat mengembalikan.'; box.querySelector('#kep-cat').focus(); return; }
        const k = await konfirmasi({ judul: setuju ? 'Setujui usulan ini?' : 'Kembalikan usulan?', bahaya: !setuju, label: setuju ? 'Ya, setujui' : 'Ya, kembalikan',
          pesan: setuju ? `${pm.length} PM masuk Central Database BNBA dan usulan diteruskan ke Tahap 3.` : 'Pengusul menerima notifikasi berisi catatan Anda.' });
        if (!k.ok) return;
        const pulih = tombolMuat(e.currentTarget, 'Menyimpan…');
        try {
          await api.verifikasiKapokja(u.id, setuju, cat || null);
          toast(setuju ? 'Usulan disetujui dan masuk Tahap 3.' : 'Usulan dikembalikan ke pengusul.');
          hapusCache('usulan'); hapusCache('bnba'); pilihId = null; await muat(true);
        } catch (err) { pulih(); toast(pesanGalat(err), 'galat'); }
      };
    } catch (e) { box.innerHTML = String(kotakGalat(pesanGalat(e))); }
  }
  async function muat(paksa = false) {
    try {
      await swr('usulan:antrean:' + kapokjaIds.join(','), async () => (await api.daftarUsulan({ pokja: kapokjaIds, status: 'menunggu', per: 200, urut: 'tgl_submit' })).baris, (v) => {
        daftar = v.sort((a, b) => String(a.tgl_submit).localeCompare(String(b.tgl_submit)));
        if (!pilihId || !daftar.some((x) => x.id === pilihId)) pilihId = daftar[0]?.id || null;
        gambarList();
      }, { ttl: paksa ? 0 : 15_000 });
    } catch (e) { $('[data-list]').innerHTML = String(kotakGalat(pesanGalat(e))); }
    gambarDetail(); gambarKinerja();
  }
  el.addEventListener('click', (e) => {
    const p = e.target.closest('[data-pilih]');
    if (p) { pilihId = p.dataset.pilih; gambarList(); gambarDetail(); if (innerWidth < 1000) $('[data-detail]').scrollIntoView({ behavior: 'smooth' }); }
    if (e.target.closest('[data-cetak]')) window.print();
    if (e.target.closest('[data-ulang]')) muat(true);
  });
  $('[data-cari]').addEventListener('input', debounce((e) => { cari = e.target.value; gambarList(); }, 200));
  muat();
  return bus.on('usulan-berubah', () => { hapusCache('usulan'); muat(true); });
}
