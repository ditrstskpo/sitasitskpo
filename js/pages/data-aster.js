// Data Aster (menu bersama, PRD 5.4): Asesmen Lapangan Terintegrasi — peta sebaran target survei / pendamping
// lapangan per provinsi (3D), grafik jenis PPKS, status survei, batch, tabel resmi, dan unduhan 26 kolom.
import { html, raw, angka, debounce } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { swr, hapusCache } from '../core/store.js';
import { judulHalaman, kosong, kotakGalat, pager, skelTabel, pesanGalat, toast, tombolMuat } from '../core/ui.js';
import { opsi, namaUnduhan } from '../core/komp.js';
import { batang, donat, kolom3d, tabelGrafik, PALET } from '../core/grafik.js';
import { gambarPeta } from '../core/peta.js';
import { pasangEfek, segarkanEfek } from '../core/efek.js';
import { unduhExcel } from '../core/xlsx.js';
import { PROVINSI, tabel, kepalaPita, kartuGrafik, ambilSemua } from './_t34.js';
import { barisUnduhAster, waktuSurvei } from './_aster.js';
import * as P from '../core/peran.js';

export async function render(el, { sesi: s }) {
  const f = { q: '', batch: '', provinsi: '', status_survei: '', jenis_ppks: '', dari: '', sampai: '' };
  let hal = 1, modePeta = 'target', ringkas = null;
  const penuh = P.isSuperAdmin(s) || P.diPokja(s, 'DATA');
  el.innerHTML = String(html`
    <div class="latar-hidup">
    ${judulHalaman({ pill: 'Asesmen Lapangan Terintegrasi', sorot: 'Data Aster', sisa: 'TSKPO',
      sub: 'Data target survei hasil asesmen lapangan yang sudah diverifikasi Kapokja Data, lengkap dengan sebaran Pendamping Lapangan per provinsi.',
      aksi: String(html`<button class="btn btn-secondary" data-unduh>${raw(ikon('sheet', 18))} Unduh Excel (26 kolom)</button>
        ${penuh ? html`<a class="btn btn-primary" href="#/input-aster">${raw(ikon('plus', 18))} Input Aster</a>` : ''}`) })}
    ${penuh ? '' : html`<div class="info-card rv" style="margin-bottom:16px">${raw(ikon('shield', 20, 'ik'))}<span>No. KK target, NIK pensurvei, dan alamat rumah ditampilkan tersamar.
      Data lengkap hanya untuk Pokja Data dan Super Admin.</span></div>`}
    <section class="card filter-card rv" style="margin-bottom:24px">
      <div class="filter-head">${raw(ikon('sliders', 20))}<b>Saring data Aster</b></div>
      <div class="dash-filter">
        <label class="input-ikon lebar">${raw(ikon("search", 18))}<input class="input" data-q placeholder="NIK target (awalan), nama target, atau pensurvei" aria-label="Cari"></label>
        <select class="select" data-f="batch" aria-label="Batch"><option value="">Semua batch</option></select>
        <select class="select" data-f="provinsi" aria-label="Provinsi">${opsi(PROVINSI, '', 'Semua provinsi')}</select>
        <input class="input" data-f="status_survei" placeholder="Status survei (ketik)" aria-label="Status survei">
        <input class="input" type="date" data-f="dari" aria-label="Disurvei dari tanggal" title="Disurvei dari">
        <input class="input" type="date" data-f="sampai" aria-label="Disurvei sampai tanggal" title="Disurvei sampai">
        <button class="btn btn-ghost" data-reset>${raw(ikon('refresh', 16))} Reset</button>
      </div></section>
    <div data-kpi><div class="kpi-row">${[1, 2, 3, 4].map(() => html`<div class="skel" style="height:148px;border-radius:20px"></div>`)}</div></div>
    </div>
    <section class="band berkisi rv angkat3d" style="margin-bottom:24px">
      <div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div>
      ${kepalaPita({ pill: 'Peta Sebaran Aster', sorot: 'Sebaran per Provinsi', sub: 'Pilih tampilan: jumlah target survei atau jumlah Pendamping Lapangan (pensurvei unik) per provinsi.',
        aksi: String(html`<div class="peta-alih" role="group" aria-label="Tampilan peta"><button type="button" data-peta-mode="target" aria-pressed="true">Target survei</button>
          <button type="button" data-peta-mode="pendamping" aria-pressed="false">Pendamping lapangan</button></div>`) })}
      <div class="dash-sorotan"><div class="peta-wadah" data-peta><div class="skel" style="height:320px;opacity:.2;border-radius:20px"></div></div>
        <div style="display:grid;gap:16px;align-content:start"><div class="kaca-gelap"><h3 style="font-size:1rem;margin-bottom:12px" data-judul-top>Provinsi teratas</h3><div data-top></div></div>
          <div class="kaca-gelap"><h3 style="font-size:1rem;margin-bottom:12px">Kab/Kota teratas (target)</h3><div data-kab></div></div></div></div>
      <div data-tbl-prov style="position:relative;z-index:1"></div>
    </section>
    <div class="grid grid-3" style="margin-bottom:24px"><div data-g="jenis"></div><div data-g="status"></div><div data-g="batch"></div></div>
    <section class="card table-card rv" data-tabel>${skelTabel(8, 7)}</section>`);
  pasangEfek(el);
  const $ = (q) => el.querySelector(q);
  const fr = () => ({ batch: f.batch || undefined, status_survei: f.status_survei || undefined, dari: f.dari || undefined, sampai: f.sampai || undefined });

  const gPeta = () => {
    if (!ringkas) return;
    const data = ringkas.per_provinsi.map((x) => ({ ...x, n: modePeta === 'target' ? x.n : x.pendamping }));
    gambarPeta($('[data-peta]'), { data, label: modePeta === 'target' ? 'Target survei' : 'Pendamping', gelap: true }).then(() => segarkanEfek($('[data-peta]')));
    $('[data-judul-top]').textContent = modePeta === 'target' ? 'Provinsi dengan target terbanyak' : 'Provinsi dengan pendamping terbanyak';
    $('[data-top]').innerHTML = String(batang([...data].sort((a, b) => b.n - a.n).map((x) => ({ label: x.provinsi, n: x.n })), { maks: 6, warna: modePeta === 'target' ? '#5FD39B' : '#F2C94C' }));
    el.querySelectorAll('[data-peta-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.petaMode === modePeta)));
  };
  const gRingkas = (r) => {
    ringkas = r;
    $('[data-kpi]').innerHTML = String(html`<div class="kpi-row">
      <div class="kpi" data-tilt><span class="kpi-badge">${raw(ikon('aster', 22))}</span><span class="kpi-label">Target Survei Terverifikasi</span><span class="kpi-num"><span data-hitung="${r.total}">0</span><small>orang</small></span>
        <span class="kpi-note">${r.menunggu ? `${angka(r.menunggu)} menunggu verifikasi` : 'rekap resmi'}</span></div>
      <div class="kpi gold" data-tilt><span class="kpi-badge">${raw(ikon('user-check', 22))}</span><span class="kpi-label">Pendamping Lapangan</span><span class="kpi-num"><span data-hitung="${r.pendamping}">0</span><small>orang</small></span><span class="kpi-note">pensurvei unik</span></div>
      <div class="kpi sky" data-tilt><span class="kpi-badge">${raw(ikon('map', 22))}</span><span class="kpi-label">Provinsi Terjangkau</span><span class="kpi-num"><span data-hitung="${r.provinsi_terjangkau}">0</span><small>/ 38</small></span><span class="kpi-note">${angka(r.per_kabkota.length)}+ kab/kota</span></div>
      <div class="kpi violet" data-tilt><span class="kpi-badge">${raw(ikon('layers', 22))}</span><span class="kpi-label">Batch</span><span class="kpi-num"><span data-hitung="${r.per_batch.length}">0</span><small>batch</small></span><span class="kpi-note">${r.per_jenis.length} jenis PPKS</span></div></div>`);
    gPeta();
    $('[data-kab]').innerHTML = String(batang(r.per_kabkota.map((x) => ({ label: x.kabkota, n: x.n })), { maks: 6, warna: '#7CC4F0' }));
    $('[data-tbl-prov]').innerHTML = String(tabelGrafik(r.per_provinsi, [['provinsi', 'Provinsi'], ['n', 'Target survei', angka], ['pendamping', 'Pendamping', angka]], { ringkas: 'Lihat sebaran sebagai tabel' }));
    el.querySelector('[data-g="jenis"]').innerHTML = String(kartuGrafik('Jenis PPKS', 'Target survei per jenis PPKS utama', html`${batang(r.per_jenis, { maks: 9, warna: PALET[0] })}${tabelGrafik(r.per_jenis, [['label', 'Jenis PPKS'], ['n', 'Jumlah', angka]])}`));
    el.querySelector('[data-g="status"]').innerHTML = String(kartuGrafik('Status Survei', 'Hasil kunjungan pensurvei', donat(r.per_status, { tengah: 'target', ukuran: 150 }), { tunda: 60 }));
    el.querySelector('[data-g="batch"]').innerHTML = String(kartuGrafik('Per Batch', 'Jumlah target per batch', kolom3d(r.per_batch, { warna: PALET[1], tinggi: 170, putarLabel: r.per_batch.length > 4 }), { tunda: 120 }));
    segarkanEfek(el);
  };
  const gTabel = (d) => {
    const sb = $('[data-f="batch"]');
    if (sb.options.length <= 1 && d.batch?.length) sb.innerHTML = String(opsi(d.batch, f.batch, 'Semua batch'));
    if (!d.baris.length) { $('[data-tabel]').innerHTML = String(kosong({ ikonNama: 'aster', judul: 'Belum ada data Aster terverifikasi', teks: 'Ubah saringan, atau tunggu Pokja Data memverifikasi data.' })); return; }
    $('[data-tabel]').innerHTML = String(html`<div class="card-head" style="padding:20px 20px 8px"><h2 class="card-title">Data Aster Terverifikasi</h2><span class="badge b-proc">${angka(d.total)} target</span></div>
      ${tabel(d.baris, [
        ['Batch', (a) => html`<div class="sel-utama"><b>${a.batch}</b><small>${a.jenis_batch || ''}</small></div>`],
        ['NIK target', (a) => html`<span class="mono">${a.nik_target}</span>`],
        ['Nama target', (a) => html`<div class="sel-utama"><b>${a.nama_target}</b><small>KK: ${a.no_kk_target || a.no_kk_samar || '—'}</small></div>`],
        ['Wilayah', (a) => html`<div class="sel-utama">${a.kabkota || '—'}<small>${a.provinsi || ''}</small></div>`],
        ['Jenis PPKS', (a) => a.jenis_ppks || '—'],
        ['Pensurvei', (a) => html`<div class="sel-utama">${a.nama_pensurvei || '—'}<small>${a.satker_pensurvei || a.instansi_pensurvei || ''}</small></div>`],
        ['Disurvei', (a) => html`<div class="sel-utama">${waktuSurvei(a.tgl_survei)}<small>${a.status_survei || ''}</small></div>`],
      ])}${pager({ hal, total: d.total, per: 25 })}`);
  };
  async function muat() {
    swr('aster:ringkas:' + JSON.stringify(fr()), () => api.ringkasanAster(fr()), gRingkas, { ttl: 30_000 }).catch(() => {});
    try { await swr('aster:resmi:' + JSON.stringify({ f, hal }), () => api.daftarAster({ ...f, mode: 'resmi', hal, per: 25 }), gTabel, { ttl: 30_000 }); }
    catch (e) { $('[data-tabel]').innerHTML = String(kotakGalat(pesanGalat(e))); }
  }
  const ubahF = () => { hal = 1; muat(); };
  el.querySelectorAll('[data-f]').forEach((x) => x.addEventListener(x.tagName === 'INPUT' && x.type !== 'date' ? 'input' : 'change', debounce(() => { f[x.dataset.f] = x.value.trim(); ubahF(); }, x.type === 'date' || x.tagName === 'SELECT' ? 0 : 400)));
  $('[data-q]').addEventListener('input', debounce((e) => { f.q = e.target.value.trim(); ubahF(); }, 300));
  el.addEventListener('click', async (e) => {
    const pm = e.target.closest('[data-peta-mode]'); if (pm) { modePeta = pm.dataset.petaMode; return gPeta(); }
    const pg = e.target.closest('[data-hal]'); if (pg && !pg.disabled) { hal = Number(pg.dataset.hal); return muat(); }
    if (e.target.closest('[data-reset]')) { Object.keys(f).forEach((k) => { f[k] = ''; }); el.querySelectorAll('[data-f]').forEach((x) => { x.value = ''; }); $('[data-q]').value = ''; return ubahF(); }
    if (e.target.closest('[data-ulang]')) { hapusCache('aster:'); return muat(); }
    const u = e.target.closest('[data-unduh]');
    if (u) {
      const pulih = tombolMuat(u, 'Menyiapkan…');
      try {
        const rows = await ambilSemua(api.daftarAster, { ...f, mode: 'resmi' });
        if (!rows.length) toast('Tidak ada data yang cocok dengan saringan.', 'info');
        else { await unduhExcel(namaUnduhan('Data-Aster'), [{ nama: 'Data Aster', baris: rows.map(barisUnduhAster) }]); toast(`${angka(rows.length)} baris diunduh${penuh ? '' : ' (kolom sensitif tersamar)'}.`); }
      } catch (err) { toast(pesanGalat(err), 'galat'); }
      pulih();
    }
  });
  muat();
}
