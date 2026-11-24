// Produk Hukum & SOP (PRD 5.4): daftar peraturan, keputusan, pedoman, dan SOP Direktorat. Semua pegawai dapat
// membaca & mengunduh; Pokja Hukum menambah, mengubah, dan mengunggah berkasnya langsung dari web.
import { html, raw, angka, debounce } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { swr, hapusCache } from '../core/store.js';
import { judulHalaman, kosong, kotakGalat, pesanGalat, toast, bukaModal } from '../core/ui.js';
import { opsi } from '../core/komp.js';
import { daftarBerkas, pasangUnggah } from '../core/unggah.js';
import { pasangEfek } from '../core/efek.js';
import { JENIS_HUKUM, tabel, bukaFormulir, aksiKonfirmasi, tglPendek } from './_t34.js';

export async function render(el) {
  const f = { q: '', jenis: '', status: '' };
  let data = null;
  el.innerHTML = String(html`
    ${judulHalaman({ pill: 'Pokja Hukum', sorot: 'Produk Hukum', sisa: '& SOP',
      sub: 'Peraturan, keputusan, surat edaran, pedoman/juknis, dan SOP yang menjadi dasar pelaksanaan ATENSI TSKPO. Klik ikon unduh untuk membuka berkasnya.',
      aksi: '<div data-aksi></div>' })}
    <section class="card filter-card rv" style="margin-bottom:16px"><div class="filter-baris">
      <label class="input-ikon" style="flex:2 1 260px">${raw(ikon('search', 18))}<input class="input" data-q placeholder="Cari judul, nomor, atau tentang" aria-label="Cari produk hukum"></label>
      <select class="select" data-f="jenis" aria-label="Jenis">${opsi(JENIS_HUKUM, '', 'Semua jenis')}</select>
      <select class="select" data-f="status" aria-label="Status">${opsi(['Berlaku', 'Dicabut', 'Draf/Revisi'], '', 'Semua status')}</select></div></section>
    <section class="card table-card rv" data-isi><div class="skel" style="height:240px"></div></section>`);
  pasangEfek(el);
  const $ = (x) => el.querySelector(x);
  const st = { Berlaku: 'b-ok', Dicabut: 'b-lock', 'Draf/Revisi': 'b-wait' };

  const gambar = (d) => {
    data = d;
    $('[data-aksi]').innerHTML = d.boleh_kelola ? String(html`<button class="btn btn-primary" data-tambah>${raw(ikon('plus', 18))} Tambah Produk Hukum</button>`) : '';
    if (!d.baris.length) { $('[data-isi]').innerHTML = String(kosong({ ikonNama: 'scale', judul: 'Belum ada produk hukum', teks: d.boleh_kelola ? 'Tekan "Tambah Produk Hukum".' : 'Daftar ini dikelola Pokja Hukum.' })); return; }
    $('[data-isi]').innerHTML = String(html`<div class="card-head" style="padding:20px 20px 8px"><h2 class="card-title">Daftar Produk Hukum & SOP</h2><span class="badge b-proc">${angka(d.baris.length)}</span></div>
      ${tabel(d.baris, [
        ['Jenis', (h) => h.jenis], ['Nomor / Tahun', (h) => html`<span class="mono">${[h.nomor, h.tahun].filter(Boolean).join(' / ') || '—'}</span>`],
        ['Judul', (h) => html`<div class="sel-utama"><b>${h.judul}</b><small>${h.tentang || ''}</small></div>`], ['Ditetapkan', (h) => tglPendek(h.tgl_tetap)],
        ['Status', (h) => html`<span class="badge ${st[h.status] || 'b-draft'} kecil">${h.status}</span>`],
        ['Berkas', (h) => html`${(h.berkas || []).map((b) => html`<button class="btn btn-ghost btn-sm" data-unduh-berkas="${b.id}" title="${b.nama}" aria-label="Unduh ${b.nama}">${raw(ikon(b.lokasi === 'tautan' ? 'external' : 'download', 16))}</button>`)}
          ${d.boleh_kelola ? html`<button class="btn btn-ghost btn-sm" data-berkas="${h.id}">${raw(ikon('upload', 16))} ${h.berkas?.length ? 'Kelola' : 'Unggah'}</button>` : !h.berkas?.length ? html`<span class="redup">—</span>` : ''}`],
        ...(d.boleh_kelola ? [['', (h) => html`<button class="btn btn-icon" data-ubah="${h.id}" aria-label="Ubah">${raw(ikon('pencil', 18))}</button>
          <button class="btn btn-icon" data-hapus="${h.id}" aria-label="Hapus">${raw(ikon('trash', 18))}</button>`, 'kanan']] : []),
      ])}`);
  };
  async function muat() {
    try { await swr('hukum:' + JSON.stringify(f), () => api.daftarProdukHukum(f), gambar, { ttl: 10_000 }); }
    catch (e) { $('[data-isi]').innerHTML = String(kotakGalat(pesanGalat(e))); }
  }
  const segar = () => { hapusCache('hukum:'); muat(); };
  const form = (lama = null) => bukaFormulir({
    judul: lama ? 'Ubah Produk Hukum' : 'Tambah Produk Hukum', data: lama || { status: 'Berlaku' },
    defs: [{ kolom: [{ k: 'jenis', l: 'Jenis', tipe: 'pilih', opsi: JENIS_HUKUM, wajib: true }, { k: 'status', l: 'Status', tipe: 'pilih', opsi: ['Berlaku', 'Dicabut', 'Draf/Revisi'], kosong: null },
      { k: 'nomor', l: 'Nomor' }, { k: 'tahun', l: 'Tahun', tipe: 'angka' }, { k: 'judul', l: 'Judul lengkap', wajib: true, lebar: true },
      { k: 'tentang', l: 'Tentang / ringkasan', tipe: 'area', lebar: true, baris: 2 }, { k: 'tgl_tetap', l: 'Tanggal ditetapkan', tipe: 'tanggal' }] }],
    simpan: async (o) => { const r = await api.simpanProdukHukum({ ...o, id: lama?.id }); toast('Produk hukum tersimpan.'); segar(); if (!lama) setTimeout(() => kelolaBerkas(r.id, r.judul), 250); },
  });
  const kelolaBerkas = async (id, judul) => {
    const m = bukaModal({ judul: 'Berkas · ' + judul, ukuran: '', isi: '<div class="skel" style="height:160px"></div>', kaki: '<button class="btn btn-ghost" data-batal>Selesai</button>' });
    const g = async () => { const b = await api.berkasKonteks('hukum', id); m.body.innerHTML = String(daftarBerkas({ konteks: 'hukum', ref: id, jenis: 'dokumen', judul: 'Berkas produk hukum', ket: 'PDF salinan resmi, atau tautan JDIH', berkas: b, boleh: true })); };
    pasangUnggah(m.body, { muatUlang: async () => { await g(); segar(); } });
    try { await g(); } catch (e) { m.body.innerHTML = String(kotakGalat(pesanGalat(e))); }
  };
  pasangUnggah(el, { muatUlang: segar });
  el.addEventListener('click', (e) => {
    const cari = (k) => data?.baris.find((h) => h.id === e.target.closest(`[data-${k}]`)?.dataset[k]);
    if (e.target.closest('[data-tambah]')) return form();
    if (e.target.closest('[data-ubah]')) return form(cari('ubah'));
    if (e.target.closest('[data-berkas]')) { const h = cari('berkas'); return kelolaBerkas(h.id, h.judul); }
    if (e.target.closest('[data-hapus]')) { const h = cari('hapus'); return aksiKonfirmasi({ judul: 'Hapus produk hukum?', pesan: `"${h.judul}" dihapus. Hapus berkasnya lebih dulu bila ada.`, label: 'Hapus', bahaya: true, jalan: () => api.hapusProdukHukum(h.id), sukses: 'Dihapus.' }).then((ok) => ok && segar()); }
    if (e.target.closest('[data-ulang]')) return segar();
  });
  el.querySelectorAll('[data-f]').forEach((x) => x.addEventListener('change', () => { f[x.dataset.f] = x.value; muat(); }));
  $('[data-q]').addEventListener('input', debounce((e) => { f.q = e.target.value.trim(); muat(); }, 300));
  muat();
}
