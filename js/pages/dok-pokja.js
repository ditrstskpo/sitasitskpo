// Dokumen Pokja — Repositori (PRD 5.4): dokumen diatur dengan SATU pilihan "Kategori" (tanpa folder). Tambah dokumen lewat
// unggah berkas, unggah folder, atau tempel tautan; ubah; dan ajukan publikasi ke Dokumen Bersama.
import { html, raw, angka } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { judulHalaman, kosong, kotakGalat, pesanGalat, chipPokja } from '../core/ui.js';
import { opsi, pokjaCepat } from '../core/komp.js';
import { pasangUnggah, muatGambarMini } from '../core/unggah.js';
import { pasangEfek, segarkanEfek } from '../core/efek.js';
import { aksiKonfirmasi, segmen, KAT_DOK, IKON_KAT } from './_t34.js';
import { kartuDok, ajukanDok, ubahDok, bukaTambahDokumen } from './_dok.js';
import { hapusBerkas } from '../core/berkas.js';
import * as P from '../core/peran.js';

export async function render(el, { sesi: s, query }) {
  const semua = await pokjaCepat();
  const milik = P.isSuperAdmin(s) && !P.pokjaEfektif(s).length ? semua : P.pokjaEfektif(s).map((p) => semua.find((x) => x.id === p.id) || p);
  let pokjaId = milik.find((p) => p.id === query?.get('pokja'))?.id || milik[0]?.id, kat = query?.get('kategori') || '', fStatus = '';
  let dok = [];
  el.innerHTML = String(html`
    ${judulHalaman({ pill: 'Workspace · Repositori', sorot: 'Dokumen Pokja', sisa: '— Repositori',
      sub: 'Simpan Produk Hukum, SOP, KAK, dan berkas kegiatan Pokja, diatur dengan satu pilihan Kategori. Berkas hanya terlihat anggota Pokja sampai diajukan dan diterbitkan di Dokumen Bersama (Pokja TU; khusus Produk Hukum & SOP oleh Pokja Hukum).',
      aksi: String(html`${milik.length > 1 ? html`<select class="select" data-pokja aria-label="Pilih Pokja" style="min-width:220px">${opsi(milik.map((p) => [p.id, 'Pokja ' + p.nama_pendek]), pokjaId)}</select>` : ''}
        <button class="btn btn-primary" data-tambah>${raw(ikon('plus', 18))} Tambah Dokumen</button>
        <a class="btn btn-secondary" href="#/dokumen-bersama">${raw(ikon('folder', 18))} Dokumen Bersama</a>`) })}
    <div class="repo">
      <aside class="card rv kiri" style="padding:14px"><div style="display:flex;align-items:center;gap:8px;padding:4px 6px 10px"><b style="color:var(--judul);flex:1" data-nama-pokja></b></div>
        <nav class="folder-daftar" data-kat aria-label="Kategori"></nav></aside>
      <section style="display:grid;gap:16px;min-width:0">
        <div data-segwadah></div>
        <div data-dok></div>
      </section>
    </div>`);
  pasangEfek(el);
  const $ = (q) => el.querySelector(q);
  
  const gKat = () => {
    const pk = semua.find((p) => p.id === pokjaId) || milik[0];
    $('[data-nama-pokja]').innerHTML = String(chipPokja(pk, 'Pokja ' + (pk?.nama_pendek || '')));
    const n = (k) => dok.filter((x) => !k || x.kategori === k).length, tanpa = dok.filter((x) => !x.kategori).length;
    $('[data-kat]').innerHTML = String(html`
      <button type="button" class="folder-item" data-kat-id="" aria-current="${kat === ''}"><span class="ik-folder">${raw(ikon('layers', 20))}</span><span class="nm">Semua kategori</span><span class="n">${angka(n(''))}</span></button>
      ${KAT_DOK.map((k) => html`<button type="button" class="folder-item" data-kat-id="${k}" aria-current="${kat === k}"><span class="ik-folder">${raw(ikon(IKON_KAT[k] || 'folder', 20))}</span><span class="nm">${k}</span><span class="n">${angka(n(k))}</span></button>`)}
      ${tanpa ? html`<button type="button" class="folder-item" data-kat-id="-" aria-current="${kat === '-'}"><span class="ik-folder">${raw(ikon('help', 20))}</span><span class="nm">Belum dikategorikan</span><span class="n">${angka(tanpa)}</span></button>` : ''}`);
  };
  const gDok = () => {
    const dalam = dok.filter((x) => kat === '' || (kat === '-' ? !x.kategori : x.kategori === kat));
    const n = (st) => dalam.filter((x) => x.status === st).length;
    $('[data-segwadah]').innerHTML = String(segmen([['', 'Semua', dalam.length], ['privat', 'Privat', n('privat')], ['diajukan', 'Diajukan', n('diajukan'), n('diajukan') ? 'menunggu' : ''],
      ['terbit', 'Terbit', n('terbit'), 'terverifikasi'], ['ditolak', 'Ditolak', n('ditolak'), n('ditolak') ? 'perlu_perbaikan' : '']], fStatus));
    const b = dok.filter((x) => (!fStatus || x.status === fStatus) && (kat === '' || (kat === '-' ? !x.kategori : x.kategori === kat)));
    $('[data-dok]').innerHTML = String(b.length ? html`<div class="dok-grid">${b.map((x) => kartuDok(x, { aksi: String(html`
        ${x.boleh_ubah ? html`<button class="btn btn-ghost btn-sm" data-ubah-dok="${x.id}" title="Ubah">${raw(ikon('pencil', 16))}</button>` : ''}
        ${x.boleh_ubah ? html`<button class="btn btn-primary btn-sm" data-ajukan-dok="${x.id}">${raw(ikon('send', 16))} Ajukan</button>` : ''}
        ${x.boleh_batal ? html`<button class="btn btn-ghost btn-sm" data-batal-dok="${x.id}">Batalkan pengajuan</button>` : ''}
        ${['privat', 'ditolak'].includes(x.status) ? html`<button class="btn btn-ghost btn-sm" data-hapus-dok="${x.id}" title="Hapus" aria-label="Hapus ${x.judul}" style="color:var(--merah)">${raw(ikon('trash', 16))}</button>` : ''}`) }))}</div>`
      : html`<section class="card">${kosong({ ikonNama: 'folder', judul: fStatus ? 'Tidak ada dokumen dengan status ini' : kat ? `Belum ada dokumen kategori ${kat}` : 'Belum ada dokumen', teks: 'Klik “Tambah Dokumen”, pilih Kategori, lalu unggah berkas, unggah folder, atau tempel tautan. Bensel.' })}</section>`);
    muatGambarMini($('[data-dok]'));
    segarkanEfek(el);
  };
  async function muatDok() {
    if (!pokjaId) { el.querySelector('.repo').innerHTML = String(html`<section class="card">${kosong({ ikonNama: 'folder', judul: 'Anda belum tergabung di Pokja', teks: 'Repositori tersedia untuk anggota Pokja.' })}</section>`); return; }
    try { dok = (await api.daftarDokumen({ mode: 'repo', pokja: pokjaId, per: 500 })).baris; gKat(); gDok(); }
    catch (e) { $('[data-dok]').innerHTML = String(kotakGalat(pesanGalat(e))); }
  }
  const segar = async () => { await muatDok(); };

  pasangUnggah(el, { muatUlang: segar });
  el.addEventListener('click', async (e) => {
    const kb = e.target.closest('[data-kat-id]'); if (kb) { kat = kb.dataset.katId; fStatus = ''; gKat(); return gDok(); }
    const sg = e.target.closest('[data-seg]'); if (sg && 'seg' in sg.dataset) { fStatus = sg.dataset.seg; return gDok(); }
    const cari = (k) => dok.find((x) => x.id === e.target.closest(`[data-${k}]`)?.dataset[k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())]);
    if (e.target.closest('[data-tambah]') || e.target.closest('[data-tambah-kosong]')) {
      return bukaTambahDokumen({ pokja: milik, pokjaId, kategori: KAT_DOK.includes(kat) ? kat : '', onSelesai: (pid, k) => { if (KAT_DOK.includes(k)) kat = k; return segar(); } });
    }
    if (e.target.closest('[data-ubah-dok]')) return ubahDok(cari('ubah-dok'), null, { onSelesai: segar });
    if (e.target.closest('[data-ajukan-dok]')) return ajukanDok(cari('ajukan-dok'), { onSelesai: segar });
    if (e.target.closest('[data-batal-dok]')) { const x = cari('batal-dok'); return aksiKonfirmasi({ judul: 'Batalkan pengajuan?', pesan: `"${x.judul}" kembali menjadi privat Pokja.`, label: 'Batalkan pengajuan', jalan: () => api.batalPublikasi(x.id), sukses: 'Pengajuan dibatalkan.' }).then((ok) => ok && segar()); }
    if (e.target.closest('[data-hapus-dok]')) { const x = cari('hapus-dok'); return aksiKonfirmasi({ judul: 'Hapus dokumen?', pesan: `"${x.judul}" dihapus dari repositori dan berkasnya dipindahkan ke sampah Google Drive Super Admin.`, label: 'Hapus', bahaya: true, jalan: () => hapusBerkas(x.berkas_id), sukses: 'Dokumen dihapus.' }).then((ok) => ok && segar()); }
    if (e.target.closest('[data-ulang]')) return segar();
  });
  el.querySelector('[data-pokja]')?.addEventListener('change', (e) => { pokjaId = e.target.value; kat = ''; segar(); });
  muatDok();
}
