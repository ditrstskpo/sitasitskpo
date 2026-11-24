// Data LKS TSKPO (menu bersama, PRD 5.4): peta sebaran 3D per provinsi, grafik klaster/akreditasi/bentuk layanan,
// daftar LKS terverifikasi, detail beserta foto, dan unduhan Excel sesuai saringan.
import { html, raw, angka, debounce } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { swr, bus, hapusCache } from '../core/store.js';
import { judulHalaman, kosong, kotakGalat, pager, skelTabel, pesanGalat, toast, tombolMuat } from '../core/ui.js';
import { opsi, namaUnduhan } from '../core/komp.js';
import { batang, donat, kolom3d, tabelGrafik, PALET } from '../core/grafik.js';
import { gambarPeta } from '../core/peta.js';
import { pasangEfek, segarkanEfek } from '../core/efek.js';
import { unduhExcel } from '../core/xlsx.js';
import { KLASTER, PROVINSI, LKS_OPSI, tabel, kepalaPita, kartuGrafik, ambilSemua, chipKlaster, tagAkr, n0 } from './_t34.js';
import { lihatLks, barisUnduhLks } from './_lks.js';
import * as P from '../core/peran.js';

export async function render(el, { sesi: s, query }) {
  const f = { q: '', provinsi: '', klaster: '', akreditasi: '', bentuk: '', jenis: '' };
  let hal = 1;
  const bolehInput = P.isSuperAdmin(s) || P.pokjaEfektif(s).length > 0;
  el.innerHTML = String(html`
    <div class="latar-hidup">
    ${judulHalaman({ pill: 'Lembaga Kesejahteraan Sosial', sorot: 'Data LKS', sisa: 'TSKPO',
      sub: 'Rekap resmi LKS yang sudah diverifikasi Kapokja Data atau Kapokja TU: sebaran 38 provinsi, klaster yang dilayani, akreditasi, dan kapasitas layanan.',
      aksi: String(html`<button class="btn btn-secondary" data-unduh>${raw(ikon('sheet', 18))} Unduh Excel</button>
        ${bolehInput ? html`<a class="btn btn-primary" href="#/input-lks">${raw(ikon('plus', 18))} Input LKS</a>` : ''}`) })}
    <section class="card filter-card rv" style="margin-bottom:24px">
      <div class="filter-head">${raw(ikon('sliders', 20))}<b>Saring data LKS</b></div>
      <div class="dash-filter">
        <label class="input-ikon lebar">${raw(ikon("search", 18))}<input class="input" data-q placeholder="Nama, kode, atau kab/kota" aria-label="Cari LKS"></label>
        <select class="select" data-f="provinsi" aria-label="Provinsi">${opsi(PROVINSI, '', 'Semua provinsi')}</select>
        <select class="select" data-f="klaster" aria-label="Klaster">${opsi(KLASTER, '', 'Semua klaster')}</select>
        <select class="select" data-f="akreditasi" aria-label="Akreditasi">${opsi(LKS_OPSI.akreditasi, '', 'Semua akreditasi')}</select>
        <select class="select" data-f="bentuk" aria-label="Bentuk layanan">${opsi(LKS_OPSI.bentuk_layanan, '', 'Semua bentuk layanan')}</select>
        <select class="select" data-f="jenis" aria-label="Jenis LKS">${opsi(['Murni TSKPO', 'Multi layanan'], '', 'Murni & multi layanan')}</select>
        <button class="btn btn-ghost" data-reset>${raw(ikon('refresh', 16))} Reset</button>
      </div></section>
    <div data-kpi><div class="kpi-row kpi-5">${[1, 2, 3, 4, 5].map(() => html`<div class="skel" style="height:138px;border-radius:20px"></div>`)}</div></div>
    </div>
    <section class="band berkisi rv angkat3d" style="margin-bottom:24px">
      <div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div>
      ${kepalaPita({ pill: 'Peta Sebaran LKS', sorot: 'LKS per Provinsi', judul: '(38 provinsi)', sub: 'Warna provinsi = jumlah LKS terverifikasi. Arahkan kursor atau ketuk provinsi untuk melihat angkanya.' })}
      <div class="dash-sorotan"><div class="peta-wadah" data-peta><div class="skel" style="height:320px;opacity:.2;border-radius:20px"></div></div>
        <div style="display:grid;gap:16px;align-content:start"><div class="kaca-gelap"><h3 style="font-size:1rem;margin-bottom:12px">Kab/Kota dengan LKS terbanyak</h3><div data-kab></div></div>
          <div class="kaca-gelap"><h3 style="font-size:1rem;margin-bottom:12px">Bentuk layanan</h3><div data-bentuk></div></div></div></div>
      <div data-tbl-prov style="position:relative;z-index:1"></div>
    </section>
    <div class="grid grid-2" style="margin-bottom:24px"><div data-g="klaster"></div><div data-g="akr"></div></div>
    <section class="card table-card rv" data-tabel>${skelTabel(8, 7)}</section>`);
  pasangEfek(el);
  const $ = (q) => el.querySelector(q);
  const fr = () => Object.fromEntries(Object.entries(f).filter(([k, v]) => v && k !== 'q' && k !== 'jenis'));

  const gRingkas = (r) => {
    $('[data-kpi]').innerHTML = String(html`<div class="kpi-row kpi-5">
      <div class="kpi" data-tilt><span class="kpi-badge">${raw(ikon('lks', 22))}</span><span class="kpi-label">LKS Terverifikasi</span><span class="kpi-num"><span data-hitung="${r.total}">0</span><small>LKS</small></span>
        <span class="kpi-note">${r.menunggu ? `${angka(r.menunggu)} menunggu verifikasi` : 'rekap resmi'}</span></div>
      <div class="kpi teal" data-tilt><span class="kpi-badge">${raw(ikon('award', 22))}</span><span class="kpi-label">Murni TSKPO</span><span class="kpi-num"><span data-hitung="${r.murni}">0</span><small>LKS</small></span><span class="kpi-note">hanya melayani klaster TSKPO</span></div>
      <div class="kpi violet" data-tilt><span class="kpi-badge">${raw(ikon('layers', 22))}</span><span class="kpi-label">Multi Layanan</span><span class="kpi-num"><span data-hitung="${r.multi}">0</span><small>LKS</small></span><span class="kpi-note">TSKPO + layanan lain</span></div>
      <div class="kpi gold" data-tilt><span class="kpi-badge">${raw(ikon('building', 22))}</span><span class="kpi-label">Daya Tampung</span><span class="kpi-num"><span data-hitung="${r.daya_tampung}">0</span><small>orang</small></span><span class="kpi-note">kapasitas dalam lembaga</span></div>
      <div class="kpi sky" data-tilt><span class="kpi-badge">${raw(ikon('users', 22))}</span><span class="kpi-label">PM Dilayani</span><span class="kpi-num"><span data-hitung="${r.pm}">0</span><small>PM</small></span><span class="kpi-note">dalam & luar lembaga</span></div></div>`);
    gambarPeta($('[data-peta]'), { data: r.per_provinsi, label: 'LKS', gelap: true }).then(() => segarkanEfek($('[data-peta]')));
    $('[data-kab]').innerHTML = String(batang(r.per_kabkota.map((x) => ({ label: x.kabkota, n: x.n })), { maks: 6, warna: '#5FD39B', tipLabel: 'LKS' }));
    $('[data-bentuk]').innerHTML = String(donat(r.per_bentuk, { tengah: 'LKS', ukuran: 130 }));
    $('[data-tbl-prov]').innerHTML = String(tabelGrafik(r.per_provinsi, [['provinsi', 'Provinsi'], ['n', 'LKS', angka]], { ringkas: 'Lihat sebaran sebagai tabel' }));
    el.querySelector('[data-g="klaster"]').innerHTML = String(kartuGrafik('LKS per Klaster yang Dilayani', 'Satu LKS dapat melayani lebih dari satu klaster',
      html`${kolom3d(r.per_klaster, { warna: PALET[0], satuan: 'LKS' })}${tabelGrafik(r.per_klaster, [['label', 'Klaster'], ['n', 'LKS', angka]])}`));
    el.querySelector('[data-g="akr"]').innerHTML = String(kartuGrafik('Akreditasi LKS', 'A, B, C, D-TTA, atau belum mengajukan', donat(r.per_akreditasi, { tengah: 'LKS' }), { tunda: 60 }));
    segarkanEfek(el);
  };
  const gTabel = (d) => {
    if (!d.baris.length) { $('[data-tabel]').innerHTML = String(kosong({ ikonNama: 'lks', judul: 'Belum ada LKS terverifikasi', teks: 'Ubah saringan, atau input LKS dari menu Input LKS.' })); return; }
    $('[data-tabel]').innerHTML = String(html`<div class="card-head" style="padding:20px 20px 8px"><h2 class="card-title">Daftar LKS Terverifikasi</h2><span class="badge b-proc">${angka(d.total)} LKS</span>
      <span class="spacer"></span><small class="redup">Klik baris untuk melihat detail & foto</small></div>
      ${tabel(d.baris, [
        ['Kode', (l) => html`<span class="mono">${l.kode}</span>`],
        ['Nama LKS', (l) => html`<div class="sel-utama"><b>${l.nama}</b><small>${l.ketua ? 'Ketua: ' + l.ketua : ''}${l.jumlah_foto ? ` · ${l.jumlah_foto} foto` : ''}</small></div>`],
        ['Wilayah', (l) => html`<div class="sel-utama">${l.kabkota || '—'}<small>${l.provinsi || ''}</small></div>`],
        ['Klaster', (l) => html`${chipKlaster(l.klaster)}${l.non_tskpo ? html`<span class="chip-klaster" style="background:#ECE9F7;color:#4F3A8C">+ non-TSKPO</span>` : ''}`],
        ['Akreditasi', (l) => tagAkr(l.akreditasi)], ['Bentuk layanan', (l) => l.bentuk_layanan || '—'],
        ['Daya tampung', (l) => n0(l.daya_tampung), 'kanan angka'], ['PM', (l) => n0((l.pm_laki || 0) + (l.pm_perempuan || 0)), 'kanan angka'],
      ], { atr: (l) => `class="baris-klik" tabindex="0" data-lks="${l.id}"` })}${pager({ hal, total: d.total, per: 25 })}`);
  };
  async function muat() {
    swr('lks:ringkas:' + JSON.stringify(fr()), () => api.ringkasanLks(fr()), gRingkas, { ttl: 30_000 }).catch(() => {});
    try { await swr('lks:resmi:' + JSON.stringify({ f, hal }), () => api.daftarLks({ ...f, mode: 'resmi', hal, per: 25 }), gTabel, { ttl: 30_000 }); }
    catch (e) { $('[data-tabel]').innerHTML = String(kotakGalat(pesanGalat(e))); }
  }
  const ubahF = () => { hal = 1; muat(); };
  el.querySelectorAll('[data-f]').forEach((x) => x.addEventListener('change', () => { f[x.dataset.f] = x.value; ubahF(); }));
  $('[data-q]').addEventListener('input', debounce((e) => { f.q = e.target.value.trim(); ubahF(); }, 300));
  el.addEventListener('click', async (e) => {
    const r = e.target.closest('[data-lks]'); if (r) return lihatLks(r.dataset.lks, { onUbah: () => { hapusCache('lks:'); muat(); } });
    const pg = e.target.closest('[data-hal]'); if (pg && !pg.disabled) { hal = Number(pg.dataset.hal); return muat(); }
    if (e.target.closest('[data-reset]')) { Object.keys(f).forEach((k) => { f[k] = ''; }); el.querySelectorAll('[data-f]').forEach((x) => { x.value = ''; }); $('[data-q]').value = ''; return ubahF(); }
    if (e.target.closest('[data-ulang]')) { hapusCache('lks:'); return muat(); }
    const u = e.target.closest('[data-unduh]');
    if (u) {
      const pulih = tombolMuat(u, 'Menyiapkan…');
      try {
        const rows = await ambilSemua(api.daftarLks, { ...f, mode: 'resmi' });
        if (!rows.length) toast('Tidak ada LKS terverifikasi yang cocok dengan saringan.', 'info');
        else { await unduhExcel(namaUnduhan('Data-LKS'), [{ nama: 'Data LKS', baris: rows.map(barisUnduhLks) }]); toast(`${angka(rows.length)} LKS diunduh.`); }
      } catch (err) { toast(pesanGalat(err), 'galat'); }
      pulih();
    }
  });
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-lks]')) e.target.click(); });
  muat();
  if (query?.get('id')) lihatLks(query.get('id'));
  return bus.on('notif-baru', (n) => { if (/LKS/.test(n?.judul || '')) { hapusCache('lks:'); muat(); } });
}
