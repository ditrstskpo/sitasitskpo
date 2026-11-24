// Data Kepegawaian & SDM Pendamping (menu bersama, PRD 5.4): pegawai kantor pusat per Pokja, SDM pendamping
// lapangan per provinsi (peta 3D), dan OJT bulan berjalan.
import { html, raw, angka, debounce } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { swr } from '../core/store.js';
import { judulHalaman, kosong, kotakGalat, skelTabel, pesanGalat, chipPokja } from '../core/ui.js';
import { tabs } from '../core/komp.js';
import { kolom3d, batang, tabelGrafik } from '../core/grafik.js';
import { gambarPeta } from '../core/peta.js';
import { pasangEfek, segarkanEfek } from '../core/efek.js';
import { tabel, kepalaPita, kartuGrafik, tglPendek } from './_t34.js';
import * as P from '../core/peran.js';

export async function render(el, { sesi: s, query }) {
  let tab = ['pusat', 'pendamping', 'ojt'].includes(query?.get('tab')) ? query.get('tab') : 'pusat', q = '';
  const kelola = P.isSuperAdmin(s) || P.diPokja(s, 'KEPEGAWAIAN') || P.diPokja(s, 'TU');
  el.innerHTML = String(html`
    <div class="latar-hidup">
    ${judulHalaman({ pill: 'Sumber Daya Manusia', sorot: 'Data Kepegawaian', sisa: '& SDM Pendamping',
      sub: 'Pegawai Direktorat di kantor pusat, SDM pendamping lapangan di daerah, dan On the Job Training (OJT) bulan berjalan. Dikelola Pokja Kepegawaian.',
      aksi: kelola ? String(html`<a class="btn btn-primary" href="#/kelola-kepegawaian">${raw(ikon('user-cog', 18))} Kelola Kepegawaian & OJT</a>`) : '' })}
    <div data-kpi><div class="kpi-row">${[1, 2, 3, 4].map(() => html`<div class="skel" style="height:148px;border-radius:20px"></div>`)}</div></div>
    </div>
    <div class="grid grid-2" style="margin-bottom:24px"><div data-g="pokja"></div>
      <section class="band rv" style="padding:24px"><div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div>
        ${kepalaPita({ pill: 'SDM Pendamping', sorot: 'Sebaran Pendamping', sub: 'Jumlah SDM pendamping lapangan aktif per provinsi.' })}
        <div class="peta-wadah" data-peta><div class="skel" style="height:240px;opacity:.2;border-radius:20px"></div></div></section></div>
    <div data-tabs class="rv"></div>
    <section class="card filter-card rv" style="margin-bottom:16px" data-cari-kartu><label class="input-ikon">${raw(ikon('search', 18))}<input class="input" data-q placeholder="Cari nama, NIP, atau jabatan" aria-label="Cari pegawai"></label></section>
    <section class="card table-card rv" data-isi>${skelTabel(8, 6)}</section>`);
  pasangEfek(el);
  const $ = (x) => el.querySelector(x);
  $('[data-tabs]').innerHTML = String(tabs([['pusat', 'Pegawai Kantor Pusat'], ['pendamping', 'SDM Pendamping Lapangan'], ['ojt', 'OJT']], tab));

  swr('peg:ringkas', () => api.ringkasanPegawai(), (r) => {
    $('[data-kpi]').innerHTML = String(html`<div class="kpi-row">
      <div class="kpi" data-tilt><span class="kpi-badge">${raw(ikon('building', 22))}</span><span class="kpi-label">Pegawai Kantor Pusat</span><span class="kpi-num"><span data-hitung="${r.pusat}">0</span><small>orang</small></span><span class="kpi-note">status aktif</span></div>
      <div class="kpi gold" data-tilt><span class="kpi-badge">${raw(ikon('map-pin', 22))}</span><span class="kpi-label">SDM Pendamping</span><span class="kpi-num"><span data-hitung="${r.pendamping}">0</span><small>orang</small></span><span class="kpi-note">${angka(r.pendamping_per_provinsi.length)} provinsi</span></div>
      <div class="kpi violet" data-tilt><span class="kpi-badge">${raw(ikon('graduation', 22))}</span><span class="kpi-label">OJT Bulan Ini</span><span class="kpi-num"><span data-hitung="${r.ojt_bulan_ini}">0</span><small>kegiatan</small></span><span class="kpi-note">rencana / berlangsung / selesai</span></div>
      <div class="kpi sky" data-tilt><span class="kpi-badge">${raw(ikon('users', 22))}</span><span class="kpi-label">Peserta OJT Bulan Ini</span><span class="kpi-num"><span data-hitung="${r.ojt_peserta_bulan_ini}">0</span><small>orang</small></span><span class="kpi-note">pegawai & peserta luar</span></div></div>`);
    el.querySelector('[data-g="pokja"]').innerHTML = String(kartuGrafik('Pegawai Pusat per Pokja', 'Warna mengikuti identitas Pokja',
      html`${kolom3d(r.per_pokja.map((x) => ({ ...x, _warna: x.warna || '#5B6B7F' })), { tinggi: 200, satuan: 'orang' })}${tabelGrafik(r.per_pokja, [['label', 'Pokja'], ['n', 'Pegawai', angka]])}`));
    gambarPeta($('[data-peta]'), { data: r.pendamping_per_provinsi, label: 'Pendamping', gelap: true }).then(() => segarkanEfek(el));
    segarkanEfek(el);
  }).catch(() => {});

  const gPegawai = (d) => {
    if (!d.baris.length) { $('[data-isi]').innerHTML = String(kosong({ ikonNama: 'pegawai', judul: 'Belum ada data', teks: kelola ? 'Tambahkan dari menu Kelola Kepegawaian & OJT.' : 'Data dikelola Pokja Kepegawaian.' })); return; }
    const pusat = tab === 'pusat';
    $('[data-isi]').innerHTML = String(html`<div class="card-head" style="padding:20px 20px 8px"><h2 class="card-title">${pusat ? 'Pegawai Kantor Pusat' : 'SDM Pendamping Lapangan'}</h2><span class="badge b-proc">${angka(d.total)} orang</span></div>
      ${tabel(d.baris, pusat ? [
        ['Nama', (p) => html`<div class="sel-utama"><b>${p.nama}${p.milik_saya ? html` <span class="badge b-ok kecil">Anda</span>` : ''}</b><small class="mono">${p.nip || ''}</small></div>`],
        ['Jabatan', (p) => html`<div class="sel-utama">${p.jabatan || '—'}<small>${p.golongan || ''}</small></div>`],
        ['Pokja', (p) => (p.pokja_nama ? chipPokja({ nama_pendek: p.pokja_nama, warna: p.warna, warna_tint: p.warna_tint, warna_teks: p.warna_teks }) : '—')],
        ['Kontak', (p) => html`<div class="sel-utama">${p.no_hp || '—'}<small>${p.email || ''}</small></div>`],
        ['Status', (p) => html`<span class="badge ${p.status === 'Aktif' ? 'b-ok' : 'b-lock'} kecil">${p.status}</span>`],
      ] : [
        ['Nama', (p) => html`<b>${p.nama}</b>`], ['Jabatan', (p) => p.jabatan || '—'],
        ['Wilayah tugas', (p) => html`<div class="sel-utama">${p.kabkota || '—'}<small>${p.provinsi || ''}</small></div>`],
        ['Kontak', (p) => p.no_hp || '—'], ['Mulai tugas', (p) => tglPendek(p.mulai_tugas)],
        ['Status', (p) => html`<span class="badge ${p.status === 'Aktif' ? 'b-ok' : 'b-lock'} kecil">${p.status}</span>`],
      ])}`);
  };
  const gOjt = (d) => {
    if (!d.baris.length) { $('[data-isi]').innerHTML = String(kosong({ ikonNama: 'graduation', judul: 'Belum ada OJT', teks: 'OJT dicatat oleh Pokja Kepegawaian atau Pokja TU.' })); return; }
    const warna = { Rencana: 'b-draft', Berlangsung: 'b-wait', Selesai: 'b-ok', Batal: 'b-lock' };
    $('[data-isi]').innerHTML = String(html`<div class="card-head" style="padding:20px 20px 8px"><h2 class="card-title">On the Job Training (OJT)</h2><span class="badge b-proc">${angka(d.baris.length)} kegiatan</span></div>
      ${tabel(d.baris, [
        ['Kegiatan', (o) => html`<div class="sel-utama"><b>${o.judul}</b><small>${[o.penyelenggara, o.lokasi].filter(Boolean).join(' · ')}</small></div>`],
        ['Tanggal', (o) => html`${tglPendek(o.tanggal_mulai)}${o.tanggal_selesai && o.tanggal_selesai !== o.tanggal_mulai ? ' – ' + tglPendek(o.tanggal_selesai) : ''}`],
        ['Peserta', (o) => html`<div class="sel-utama">${angka((o.peserta || []).length + (o.peserta_luar || 0))} orang<small>${(o.peserta_nama || []).slice(0, 3).join(', ')}${(o.peserta_nama || []).length > 3 ? ', …' : ''}</small></div>`],
        ['Berkas', (o) => html`<span class="badge b-draft kecil">${raw(ikon('paperclip', 14))} ${o.jumlah_berkas}</span>`],
        ['Status', (o) => html`<span class="badge ${warna[o.status] || 'b-draft'} kecil">${o.status}</span>`],
      ])}`);
  };
  async function muat() {
    $('[data-cari-kartu]').hidden = tab === 'ojt';
    try {
      if (tab === 'ojt') await swr('peg:ojt', () => api.daftarOjt({}), gOjt, { ttl: 30_000 });
      else await swr('peg:' + tab + ':' + q, () => api.daftarPegawai({ jenis: tab, status: 'Aktif', q, per: 500 }), gPegawai, { ttl: 30_000 });
    } catch (e) { $('[data-isi]').innerHTML = String(kotakGalat(pesanGalat(e))); }
  }
  el.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; $('[data-tabs]').innerHTML = String(tabs([['pusat', 'Pegawai Kantor Pusat'], ['pendamping', 'SDM Pendamping Lapangan'], ['ojt', 'OJT']], tab)); return muat(); }
    if (e.target.closest('[data-ulang]')) return muat();
  });
  $('[data-q]').addEventListener('input', debounce((e) => { q = e.target.value.trim(); muat(); }, 300));
  muat();
}
