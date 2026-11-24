// Dokumen Pokja — Repositori (PRD 5.4): folder bawaan (SK, KAK, File Kegiatan; Keuangan + Burekol ke BNI) dan
// folder buatan Pokja, unggah banyak berkas langsung (seret & lepas), tempel tautan, ubah/pindah, dan ajukan publikasi.
import { html, raw, angka } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { judulHalaman, kosong, kotakGalat, pesanGalat, toast, chipPokja } from '../core/ui.js';
import { opsi, pokjaCepat } from '../core/komp.js';
import { pasangUnggah, muatGambarMini } from '../core/unggah.js';
import { pasangEfek, segarkanEfek } from '../core/efek.js';
import { bukaFormulir, aksiKonfirmasi, segmen } from './_t34.js';
import { kartuDok, zonaUnggah, unggahKeFolder, pasangZona, ajukanDok, ubahDok } from './_dok.js';
import { hapusBerkas } from '../core/berkas.js';
import * as P from '../core/peran.js';

export async function render(el, { sesi: s, query }) {
  const semua = await pokjaCepat();
  const milik = P.isSuperAdmin(s) && !P.pokjaEfektif(s).length ? semua : P.pokjaEfektif(s).map((p) => semua.find((x) => x.id === p.id) || p);
  let pokjaId = milik.find((p) => p.id === query?.get('pokja'))?.id || milik[0]?.id, folderId = null, fStatus = '';
  let folder = [], dok = [];
  el.innerHTML = String(html`
    ${judulHalaman({ pill: 'Workspace · Repositori', sorot: 'Dokumen Pokja', sisa: '— Repositori',
      sub: 'Simpan SK, KAK, dan berkas kegiatan Pokja. Berkas hanya terlihat anggota Pokja sampai diajukan dan diterbitkan Pokja TU di Dokumen Bersama.',
      aksi: String(html`${milik.length > 1 ? html`<select class="select" data-pokja aria-label="Pilih Pokja" style="min-width:220px">${opsi(milik.map((p) => [p.id, 'Pokja ' + p.nama_pendek]), pokjaId)}</select>` : ''}
        <a class="btn btn-secondary" href="#/dokumen-bersama">${raw(ikon('folder', 18))} Dokumen Bersama</a>`) })}
    <div class="repo">
      <aside class="card rv kiri" style="padding:14px"><div style="display:flex;align-items:center;gap:8px;padding:4px 6px 10px"><b style="color:var(--judul);flex:1" data-nama-pokja></b>
        <button class="btn btn-icon kecil" data-folder-baru title="Folder baru" aria-label="Buat folder baru">${raw(ikon('folder-plus', 18))}</button></div>
        <nav class="folder-daftar" data-folder aria-label="Folder"></nav></aside>
      <section style="display:grid;gap:16px;min-width:0">
        <div class="card rv" data-kepala-folder></div>
        <div data-segwadah></div>
        <div data-dok></div>
      </section>
    </div>`);
  pasangEfek(el);
  const $ = (q) => el.querySelector(q);

  const gFolder = () => {
    const pk = semua.find((p) => p.id === pokjaId) || milik[0];
    $('[data-nama-pokja]').innerHTML = String(chipPokja(pk, 'Pokja ' + (pk?.nama_pendek || '')));
    $('[data-folder]').innerHTML = String(html`${folder.map((f) => html`<button type="button" class="folder-item" data-folder-id="${f.id}" aria-current="${f.id === folderId}">
      <span class="ik-folder">${raw(ikon('folder', 20))}</span><span class="nm">${f.nama}</span><span class="n">${angka(f.jumlah)}</span></button>`)}`);
    const f = folder.find((x) => x.id === folderId);
    $('[data-kepala-folder]').innerHTML = String(f ? html`<div class="card-head"><span class="ubin emas">${raw(ikon('folder', 22))}</span><div><h2 class="card-title">${f.nama}</h2>
        <p class="card-sub">${f.bawaan ? 'Folder bawaan' : 'Folder buatan Pokja'} · tersimpan di Google Drive Super Admin / Repositori Pokja</p></div><span class="spacer"></span>
        ${!f.bawaan ? html`<button class="btn btn-ghost btn-sm" data-ganti-folder>${raw(ikon('pencil', 16))} Ganti nama</button><button class="btn btn-ghost btn-sm" data-hapus-folder style="color:var(--merah)">${raw(ikon('trash', 16))} Hapus folder</button>` : ''}
        <button class="btn btn-ghost btn-sm" data-tautan-konteks data-konteks="dokumen" data-ref="${f.id}" data-jenis="tautan" data-judul="">${raw(ikon('link', 16))} Tempel tautan</button></div>
      ${zonaUnggah(f.id)}` : '');
  };
  const gDok = () => {
    const n = (st) => dok.filter((x) => x.status === st).length;
    $('[data-segwadah]').innerHTML = String(segmen([['', 'Semua', dok.length], ['privat', 'Privat', n('privat')], ['diajukan', 'Diajukan', n('diajukan'), n('diajukan') ? 'menunggu' : ''],
      ['terbit', 'Terbit', n('terbit'), 'terverifikasi'], ['ditolak', 'Ditolak', n('ditolak'), n('ditolak') ? 'perlu_perbaikan' : '']], fStatus));
    const b = dok.filter((x) => !fStatus || x.status === fStatus);
    $('[data-dok]').innerHTML = String(b.length ? html`<div class="dok-grid">${b.map((x) => kartuDok(x, { aksi: String(html`
        ${x.boleh_ubah ? html`<button class="btn btn-ghost btn-sm" data-ubah-dok="${x.id}" title="Ubah">${raw(ikon('pencil', 16))}</button>` : ''}
        ${x.boleh_ubah ? html`<button class="btn btn-primary btn-sm" data-ajukan-dok="${x.id}">${raw(ikon('send', 16))} Ajukan</button>` : ''}
        ${x.boleh_batal ? html`<button class="btn btn-ghost btn-sm" data-batal-dok="${x.id}">Batalkan pengajuan</button>` : ''}
        ${['privat', 'ditolak'].includes(x.status) ? html`<button class="btn btn-ghost btn-sm" data-hapus-dok="${x.id}" title="Hapus" aria-label="Hapus ${x.judul}" style="color:var(--merah)">${raw(ikon('trash', 16))}</button>` : ''}`) }))}</div>`
      : html`<section class="card">${kosong({ ikonNama: 'folder', judul: fStatus ? 'Tidak ada dokumen dengan status ini' : 'Folder masih kosong', teks: 'Seret berkas ke kotak unggah di atas, atau klik kotak itu untuk memilih berkas dari komputer / ponsel.' })}</section>`);
    muatGambarMini($('[data-dok]'));
    segarkanEfek(el);
  };
  async function muatFolder() {
    if (!pokjaId) { el.querySelector('.repo').innerHTML = String(html`<section class="card">${kosong({ ikonNama: 'folder', judul: 'Anda belum tergabung di Pokja', teks: 'Repositori tersedia untuk anggota Pokja.' })}</section>`); return; }
    try {
      folder = await api.daftarFolder(pokjaId);
      if (!folder.some((f) => f.id === folderId)) folderId = folder[0]?.id || null;
      gFolder(); await muatDok();
    } catch (e) { $('[data-dok]').innerHTML = String(kotakGalat(pesanGalat(e))); }
  }
  async function muatDok() {
    if (!folderId) { dok = []; return gDok(); }
    try { dok = (await api.daftarDokumen({ mode: 'repo', pokja: pokjaId, folder: folderId, per: 500 })).baris; gDok(); }
    catch (e) { $('[data-dok]').innerHTML = String(kotakGalat(pesanGalat(e))); }
  }
  const segar = async () => { await muatFolder(); };

  pasangUnggah(el, { muatUlang: segar });
  pasangZona(el, { saatUnggah: async (fid, files, onTiap) => { await unggahKeFolder(fid, files, { onTiap }); await segar(); } });
  el.addEventListener('click', async (e) => {
    const fb = e.target.closest('[data-folder-id]'); if (fb) { folderId = fb.dataset.folderId; fStatus = ''; gFolder(); return muatDok(); }
    const sg = e.target.closest('[data-seg]'); if (sg && 'seg' in sg.dataset) { fStatus = sg.dataset.seg; return gDok(); }
    const cari = (k) => dok.find((x) => x.id === e.target.closest(`[data-${k}]`)?.dataset[k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())]);
    if (e.target.closest('[data-folder-baru]')) {
      return bukaFormulir({ judul: 'Folder Baru', ukuran: 'kecil', label: 'Buat folder', defs: [{ kolom: [{ k: 'nama', l: 'Nama folder', wajib: true, lebar: true, ph: 'mis. Laporan Bulanan', maks: 60 }] }],
        simpan: async (o) => { const f = await api.buatFolder(pokjaId, o.nama); folderId = f.id; toast('Folder dibuat.'); await segar(); } });
    }
    if (e.target.closest('[data-ganti-folder]')) {
      const f = folder.find((x) => x.id === folderId);
      return bukaFormulir({ judul: 'Ganti Nama Folder', ukuran: 'kecil', data: f, defs: [{ kolom: [{ k: 'nama', l: 'Nama folder', wajib: true, lebar: true, maks: 60 }] }],
        simpan: async (o) => { await api.ubahFolder(f.id, o.nama); toast('Nama folder diganti.'); await segar(); } });
    }
    if (e.target.closest('[data-hapus-folder]')) {
      const f = folder.find((x) => x.id === folderId);
      return aksiKonfirmasi({ judul: 'Hapus folder?', pesan: `Folder "${f.nama}" dihapus. Folder harus kosong.`, label: 'Hapus', bahaya: true, jalan: () => api.hapusFolder(f.id), sukses: 'Folder dihapus.' }).then((ok) => { if (ok) { folderId = null; segar(); } });
    }
    if (e.target.closest('[data-ubah-dok]')) return ubahDok(cari('ubah-dok'), folder, { onSelesai: segar });
    if (e.target.closest('[data-ajukan-dok]')) return ajukanDok(cari('ajukan-dok'), { onSelesai: segar });
    if (e.target.closest('[data-batal-dok]')) { const x = cari('batal-dok'); return aksiKonfirmasi({ judul: 'Batalkan pengajuan?', pesan: `"${x.judul}" kembali menjadi privat Pokja.`, label: 'Batalkan pengajuan', jalan: () => api.batalPublikasi(x.id), sukses: 'Pengajuan dibatalkan.' }).then((ok) => ok && segar()); }
    if (e.target.closest('[data-hapus-dok]')) { const x = cari('hapus-dok'); return aksiKonfirmasi({ judul: 'Hapus dokumen?', pesan: `"${x.judul}" dihapus dari repositori dan berkasnya dipindahkan ke sampah Google Drive Super Admin.`, label: 'Hapus', bahaya: true, jalan: () => hapusBerkas(x.berkas_id), sukses: 'Dokumen dihapus.' }).then((ok) => ok && segar()); }
    if (e.target.closest('[data-ulang]')) return segar();
  });
  el.querySelector('[data-pokja]')?.addEventListener('change', (e) => { pokjaId = e.target.value; folderId = null; segar(); });
  muatFolder();
}
