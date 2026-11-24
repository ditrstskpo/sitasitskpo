// Dokumen Bersama — Repositori Terpadu (PRD 5.4): satu pilihan Kategori (tanpa folder), dokumen terbit setelah diverifikasi Pokja TU,
// antrean publikasi untuk TU, pengajuan Pokja saya, produk hukum & SOP, dan "Unggah & Ajukan" langsung dari halaman ini.
import { html, raw, angka, debounce } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { swr, hapusCache } from '../core/store.js';
import { judulHalaman, kosong, kotakGalat, pesanGalat, toast, tombolMuat, bukaModal } from '../core/ui.js';
import { pokjaCepat, opsi } from '../core/komp.js';
import { pasangUnggah, muatGambarMini, unduhKonteks } from '../core/unggah.js';
import { pasangEfek, segarkanEfek } from '../core/efek.js';
import { KAT_DOK, IKON_KAT, aksiKonfirmasi, tabel, tglPendek } from './_t34.js';
import { kartuDok, ajukanDok, verifikasiDok, bukaTambahDokumen } from './_dok.js';
import { tabs } from '../core/komp.js';
import * as P from '../core/peran.js';

export async function render(el, { sesi: s, query }) {
  const tu = P.isSuperAdmin(s) || P.diPokja(s, 'TU');
  const anggota = P.pokjaEfektif(s).length > 0;
  let tab = ['terbit', 'antrean', 'pengajuan', 'hukum'].includes(query?.get('tab')) ? query.get('tab') : 'terbit', kat = '', q = (query?.get('q') || '').slice(0, 80), antreanN = null;
  let baris = [];
  el.innerHTML = String(html`
    <div class="latar-hidup">
    ${judulHalaman({ pill: 'Repositori Terpadu Direktorat', sorot: 'Dokumen Bersama', sisa: '— Repositori Terpadu',
      sub: 'Dokumen resmi lintas Pokja yang sudah diverifikasi Pokja TU: SK ATENSI, SK Kegiatan, KAK, Bahan Paparan, Dokumentasi Kegiatan, dan lainnya. Berkas tersimpan di Google Drive Super Admin dan diunduh lewat web.',
      aksi: anggota || P.isSuperAdmin(s) ? String(html`<button class="btn btn-primary" data-unggah-ajukan>${raw(ikon('upload', 18))} Unggah & Ajukan</button>`) : '' })}
    <div class="kat-grid rv-anak rv" data-kat style="margin-bottom:24px">${KAT_DOK.map(() => html`<div class="skel" style="height:96px;border-radius:18px"></div>`)}</div>
    </div>
    <div data-tabs class="rv"></div>
    <section class="card filter-card rv" style="margin-bottom:16px" data-cari-kartu><label class="input-ikon">${raw(ikon('search', 18))}<input class="input" data-q value="${q}" placeholder="Cari judul atau keterangan" aria-label="Cari dokumen"></label></section>
    <div data-isi class="rv"><div class="skel" style="height:240px;border-radius:20px"></div></div>`);
  pasangEfek(el);
  const $ = (x) => el.querySelector(x);

  const gTabs = () => {
    const t = [['terbit', 'Dokumen Terbit']];
    if (tu) t.push(['antrean', 'Antrean Publikasi', antreanN]);
    if (anggota) t.push(['pengajuan', 'Pengajuan Pokja Saya']);
    t.push(['hukum', 'Produk Hukum & SOP']);
    $('[data-tabs]').innerHTML = String(tabs(t, tab));
    $('[data-cari-kartu]').hidden = false;
  };
  const gKat = (perKat = {}) => {
    $('[data-kat]').innerHTML = String(html`${KAT_DOK.map((k) => html`<button type="button" class="kat-kartu" data-kat-pilih="${k}" aria-pressed="${kat === k}" data-tilt="6">
      <span class="ubin" style="width:38px;height:38px;border-radius:12px">${raw(ikon(IKON_KAT[k], 18))}</span><b>${angka(perKat[k] || 0)}</b><span>${k}</span></button>`)}`);
    segarkanEfek(el);
  };
  const aksiKartu = (x) => String(html`
    ${x.boleh_verifikasi ? html`<button class="btn btn-ghost btn-sm" data-tolak="${x.id}" style="color:var(--merah)">Tolak</button><button class="btn btn-primary btn-sm" data-terbit="${x.id}">${raw(ikon('check', 16))} Terbitkan</button>` : ''}
    ${x.boleh_tarik ? html`<button class="btn btn-ghost btn-sm" data-tarik="${x.id}" title="Tarik dari Dokumen Bersama">${raw(ikon('undo', 16))} Tarik</button>` : ''}
    ${x.boleh_ubah && x.status === 'ditolak' ? html`<button class="btn btn-primary btn-sm" data-ajukan-dok="${x.id}">${raw(ikon('send', 16))} Ajukan ulang</button>` : ''}
    ${x.boleh_batal ? html`<button class="btn btn-ghost btn-sm" data-batal-dok="${x.id}">Batalkan</button>` : ''}`);
  const gDok = (d) => {
    baris = d.baris;
    if (d.antrean != null && d.antrean !== antreanN) { antreanN = d.antrean; gTabs(); }
    if (tab === 'terbit') gKat(d.per_kategori || {});
    $('[data-isi]').innerHTML = String(d.baris.length ? html`<div class="dok-grid">${d.baris.map((x) => kartuDok(x, { pokja: true, aksi: aksiKartu(x) }))}</div>`
      : html`<section class="card">${kosong({ ikonNama: 'folder', judul: tab === 'antrean' ? 'Tidak ada pengajuan yang menunggu' : tab === 'pengajuan' ? 'Belum ada pengajuan' : 'Belum ada dokumen pada kategori ini',
        teks: tab === 'terbit' ? 'Dokumen tampil di sini setelah Pokja mengajukan dan Pokja TU menerbitkannya.' : '' })}</section>`);
    muatGambarMini($('[data-isi]'));
    segarkanEfek(el);
  };
  const gHukum = (d) => {
    const st = { Berlaku: 'b-ok', Dicabut: 'b-lock', 'Draf/Revisi': 'b-wait' };
    $('[data-isi]').innerHTML = String(html`<section class="card table-card">
      <div class="card-head" style="padding:20px 20px 8px"><h2 class="card-title">Produk Hukum & SOP</h2><span class="badge b-proc">${angka(d.baris.length)}</span><span class="spacer"></span>
        ${d.boleh_kelola ? html`<a class="btn btn-secondary btn-sm" href="#/produk-hukum">${raw(ikon('scale', 16))} Kelola (Pokja Hukum)</a>` : ''}</div>
      ${d.baris.length ? tabel(d.baris, [
        ['Jenis', (h) => h.jenis], ['Nomor / Tahun', (h) => html`<span class="mono">${[h.nomor, h.tahun].filter(Boolean).join(' / ') || '—'}</span>`],
        ['Judul', (h) => html`<div class="sel-utama"><b>${h.judul}</b><small>${h.tentang || ''}</small></div>`], ['Ditetapkan', (h) => tglPendek(h.tgl_tetap)],
        ['Status', (h) => html`<span class="badge ${st[h.status] || 'b-draft'} kecil">${h.status}</span>`],
        ['Berkas', (h) => (h.berkas?.length ? html`${h.berkas.map((b) => html`<button class="btn btn-ghost btn-sm" data-unduh-berkas="${b.id}" title="${b.nama}">${raw(ikon(b.lokasi === 'tautan' ? 'external' : 'download', 16))}</button>`)}` : html`<span class="redup">—</span>`)],
      ]) : kosong({ ikonNama: 'scale', judul: 'Belum ada produk hukum', teks: 'Pokja Hukum mengelola daftar ini.' })}</section>`);
  };
  async function muat() {
    gTabs();
    try {
      if (tab === 'hukum') { $('[data-kat]').hidden = true; return await swr('hukum:' + q, () => api.daftarProdukHukum({ q }), gHukum, { ttl: 20_000 }); }
      $('[data-kat]').hidden = tab !== 'terbit';
      await swr('dokb:' + JSON.stringify({ tab, kat, q }), () => api.daftarDokumen({ mode: tab === 'terbit' ? 'bersama' : tab, kategori: tab === 'terbit' ? kat : '', q, per: 200 }), gDok, { ttl: 10_000 });
    } catch (e) { $('[data-isi]').innerHTML = String(kotakGalat(pesanGalat(e))); }
  }
  const segar = () => { hapusCache('dokb:'); hapusCache('hukum:'); muat(); };

  // ---- Unggah & Ajukan langsung dari Dokumen Bersama: satu pilihan Kategori, tanpa folder
  const unggahAjukan = async () => {
    const semua = await pokjaCepat();
    const milik = P.pokjaEfektif(s).length ? P.pokjaEfektif(s).map((p) => semua.find((x) => x.id === p.id) || p) : semua;
    bukaTambahDokumen({ pokja: milik, pokjaId: milik[0]?.id, kategori: kat || '', ajukan: true, onSelesai: () => { tab = anggota ? 'pengajuan' : tab; segar(); } });
  };

  pasangUnggah(el, { muatUlang: segar });
  el.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; return muat(); }
    const kp = e.target.closest('[data-kat-pilih]'); if (kp) { kat = kat === kp.dataset.katPilih ? '' : kp.dataset.katPilih; return muat(); }
    if (e.target.closest('[data-unggah-ajukan]')) return unggahAjukan();
    const cari = (k) => baris.find((x) => x.id === e.target.closest(`[data-${k}]`)?.dataset[k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())]);
    if (e.target.closest('[data-terbit]')) return verifikasiDok(cari('terbit'), true, { onSelesai: segar });
    if (e.target.closest('[data-tolak]')) return verifikasiDok(cari('tolak'), false, { onSelesai: segar });
    if (e.target.closest('[data-ajukan-dok]')) return ajukanDok(cari('ajukan-dok'), { onSelesai: segar });
    if (e.target.closest('[data-batal-dok]')) { const x = cari('batal-dok'); return aksiKonfirmasi({ judul: 'Batalkan pengajuan?', pesan: `"${x.judul}" kembali menjadi privat Pokja.`, label: 'Batalkan', jalan: () => api.batalPublikasi(x.id), sukses: 'Pengajuan dibatalkan.' }).then((ok) => ok && segar()); }
    if (e.target.closest('[data-tarik]')) {
      const x = cari('tarik');
      return aksiKonfirmasi({ judul: 'Tarik dari Dokumen Bersama?', pesan: `"${x.judul}" tidak lagi tampil untuk semua pegawai dan kembali menjadi privat Pokja ${x.pokja_nama}.`, label: 'Tarik', bahaya: true,
        alasan: { label: 'Alasan', wajib: true }, jalan: (al) => api.tarikPublikasi(x.id, al), sukses: 'Dokumen ditarik.' }).then((ok) => ok && segar());
    }
    if (e.target.closest('[data-ulang]')) return segar();
  });
  $('[data-q]').addEventListener('input', debounce((e) => { q = e.target.value.trim(); muat(); }, 300));
  gKat(); muat();
  // hitung antrean untuk TU
  if (tu && tab !== 'antrean') api.daftarDokumen({ mode: 'antrean', per: 1 }).then((d) => { antreanN = d.total; gTabs(); }).catch(() => {});
  void unduhKonteks;
}
