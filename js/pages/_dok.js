// Bagian bersama Dokumen Pokja & Dokumen Bersama: kartu dokumen, unggah banyak berkas (seret & lepas),
// ubah judul/pindah folder, ajukan publikasi, dan verifikasi Pokja TU.
import { html, raw, relatif, tanggal } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api, modePratinjau } from '../core/api.js';
import { toast, pesanGalat, konfirmasi, chipPokja } from '../core/ui.js';
import { ukuranTeks, opsi } from '../core/komp.js';
import { unggahKonteks, TERIMA_DOK } from '../core/unggah.js';
import { bukaFormulir, KAT_DOK, ikonMime } from './_t34.js';

export const STATUS_DOK = {
  privat: ['b-draft', 'lock', 'Privat Pokja'], diajukan: ['b-wait', 'clock', 'Diajukan ke TU'], terbit: ['b-ok', 'check-circle', 'Terbit'], ditolak: ['b-fix', 'alert', 'Ditolak TU'],
};
export const badgeDok = (x) => { const [c, i, l] = STATUS_DOK[x.status] || STATUS_DOK.privat; return html`<span class="badge ${c} kecil">${raw(ikon(i, 14))} ${l}${x.kategori && x.status !== 'privat' ? ' · ' + x.kategori : ''}</span>`; };

/** Kartu satu dokumen. aksi: daftar tombol tambahan (html). */
export function kartuDok(x, { aksi = '', pokja = false } = {}) {
  const [label, warna] = ikonMime(x.mime, x.berkas_nama);
  const foto = /^image\//.test(x.mime || '');
  return html`<article class="dok-kartu rv" data-dok="${x.id}">
    ${foto ? html`<div class="thumb foto"><img alt="${x.judul}" data-gambar="${x.berkas_id}" loading="lazy"><span class="foto-muat"></span></div>` : ''}
    <div class="atas"><span class="jenis" style="--c:${warna}">${label}</span><div style="min-width:0"><h4>${x.judul}</h4>
      <p class="meta">${[x.berkas_nama, ukuranTeks(x.ukuran), x.lokasi === 'tautan' ? 'tautan' : ''].filter(Boolean).join(' · ')}</p></div></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">${badgeDok(x)}${pokja ? chipPokja({ nama_pendek: x.pokja_nama, warna: x.warna, warna_tint: x.warna_tint, warna_teks: x.warna_teks }) : x.folder_nama ? html`<span class="badge b-draft kecil">${raw(ikon('folder', 14))} ${x.folder_nama}</span>` : ''}</div>
    ${x.keterangan ? html`<p class="meta" style="color:var(--teks)">${x.keterangan}</p>` : ''}
    ${x.catatan_verifikasi ? html`<p class="meta" style="color:${x.status === 'ditolak' ? 'var(--merah)' : 'var(--teks)'}">${raw(ikon('msg', 14))} ${x.catatan_verifikasi}</p>` : ''}
    <p class="meta">${x.status === 'terbit' && x.diverifikasi_pada ? `Terbit ${tanggal(x.diverifikasi_pada)} · diverifikasi ${x.diverifikasi_nama || 'TU'}` : `Diunggah ${x.dibuat_nama || ''} · ${relatif(x.dibuat_pada)}`}</p>
    <div class="aksi"><button class="btn btn-secondary btn-sm" data-unduh-berkas="${x.berkas_id}">${raw(ikon(x.lokasi === 'tautan' ? 'external' : 'download', 16))} ${x.lokasi === 'tautan' ? 'Buka' : 'Unduh'}</button>${raw(aksi)}</div>
  </article>`;
}

/** Zona unggah banyak berkas ke folder repositori. */
export const zonaUnggah = (folderId) => html`<label class="unggah-zona" data-zona="${folderId}">${raw(ikon('upload', 28))}
  <b>Seret berkas ke sini, atau klik untuk memilih</b><small>Boleh banyak sekaligus · PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX maks 10 MB · foto JPG/PNG otomatis dikecilkan ≤ 500 KB</small>
  <input type="file" multiple hidden accept="${TERIMA_DOK}" data-zona-input="${folderId}"></label>`;

/** Unggah daftar berkas ke folder. Mengembalikan daftar hasil (berisi dokumen_id). */
export async function unggahKeFolder(folderId, files, { onTiap } = {}) {
  const hasil = [];
  let gagal = 0;
  for (const [i, f] of [...files].entries()) {
    const foto = /^image\/(jpeg|png|webp|heic|heif)$/i.test(f.type) || /\.(jpe?g|png|heic|webp)$/i.test(f.name);
    try {
      onTiap?.(i, files.length, f.name);
      hasil.push(await unggahKonteks({ konteks: 'dokumen', ref: folderId, jenis: foto ? 'foto' : 'dokumen', file: f, foto }));
    } catch (e) { gagal++; toast(`${f.name}: ${pesanGalat(e)}`, 'galat', 'Unggah gagal'); }
  }
  if (hasil.length) toast(`${hasil.length} berkas tersimpan${modePratinjau ? ' (mode pratinjau)' : ' di Google Drive Super Admin'}${gagal ? `, ${gagal} gagal` : ''}.`);
  return hasil;
}

/** Pasang seret & lepas pada zona unggah di dalam root. */
export function pasangZona(root, { saatUnggah }) {
  const jalan = async (zona, files) => {
    if (!files?.length) return;
    const b = zona.querySelector('b'), asli = b.textContent;
    zona.classList.add('is-loading');
    try { await saatUnggah(zona.dataset.zona, files, (i, n, nama) => { b.textContent = `Mengunggah ${i + 1}/${n}: ${nama}…`; }); }
    finally { zona.classList.remove('is-loading', 'seret'); b.textContent = asli; }
  };
  root.addEventListener('change', (e) => { const i = e.target.closest('[data-zona-input]'); if (i) { const z = i.closest('[data-zona]'); const f = [...i.files]; i.value = ''; jalan(z, f); } });
  root.addEventListener('dragover', (e) => { const z = e.target.closest('[data-zona]'); if (z) { e.preventDefault(); z.classList.add('seret'); } });
  root.addEventListener('dragleave', (e) => { const z = e.target.closest('[data-zona]'); if (z && !z.contains(e.relatedTarget)) z.classList.remove('seret'); });
  root.addEventListener('drop', (e) => { const z = e.target.closest('[data-zona]'); if (z) { e.preventDefault(); jalan(z, [...(e.dataTransfer?.files || [])]); } });
}

/** Modal ajukan publikasi (pilih kategori). */
export function ajukanDok(x, { onSelesai } = {}) {
  const foto = /^image\//.test(x.mime || '');
  return bukaFormulir({
    judul: 'Ajukan ke Dokumen Bersama', ukuran: 'kecil', label: 'Ajukan ke Pokja TU', data: { kategori: foto ? 'Dokumentasi Kegiatan' : x.kategori || '' },
    atas: String(html`<p style="margin-bottom:14px"><b>${x.judul}</b><br><small class="redup">Dokumen tampil untuk semua pegawai setelah diverifikasi Pokja TU.
      ${foto ? 'Foto hanya dapat diterbitkan pada kategori Dokumentasi Kegiatan.' : 'Kategori Dokumentasi Kegiatan khusus untuk foto.'}</small></p>`),
    defs: [{ kolom: [{ k: 'kategori', l: 'Kategori Dokumen Bersama', tipe: 'pilih', opsi: foto ? ['Dokumentasi Kegiatan'] : KAT_DOK.filter((k) => k !== 'Dokumentasi Kegiatan'), wajib: true, lebar: true }] }],
    simpan: async (o) => { await api.ajukanPublikasi(x.id, o.kategori); toast('Diajukan. Pokja TU mendapat notifikasi untuk memverifikasi.'); await onSelesai?.(); },
  });
}

/** Modal ubah judul/keterangan/folder. */
export function ubahDok(x, folder, { onSelesai } = {}) {
  return bukaFormulir({
    judul: 'Ubah Dokumen', ukuran: '', data: x, label: 'Simpan',
    defs: [{ kolom: [{ k: 'judul', l: 'Judul dokumen', wajib: true, lebar: true }, { k: 'keterangan', l: 'Keterangan', tipe: 'area', lebar: true, baris: 2 },
      { k: 'folder_id', l: 'Folder', tipe: 'pilih', opsi: folder.map((f) => [f.id, f.nama]), kosong: null, lebar: true }] }],
    simpan: async (o) => { await api.ubahDokumen(x.id, o); toast('Dokumen diperbarui.'); await onSelesai?.(); },
  });
}

/** Verifikasi TU: setujui (boleh ganti kategori) atau tolak dengan catatan. */
export async function verifikasiDok(x, setuju, { onSelesai } = {}) {
  if (setuju) {
    const foto = /^image\//.test(x.mime || '');
    return bukaFormulir({
      judul: 'Terbitkan di Dokumen Bersama', ukuran: 'kecil', label: 'Terbitkan', data: { kategori: x.kategori },
      atas: String(html`<p style="margin-bottom:14px"><b>${x.judul}</b> · Pokja ${x.pokja_nama}<br><small class="redup">Periksa isi berkas (tombol Unduh) sebelum menerbitkan. Kategori dapat dikoreksi.</small></p>`),
      defs: [{ kolom: [{ k: 'kategori', l: 'Kategori', tipe: 'pilih', opsi: foto ? ['Dokumentasi Kegiatan'] : KAT_DOK.filter((k) => k !== 'Dokumentasi Kegiatan'), wajib: true, kosong: null, lebar: true }] }],
      simpan: async (o) => { await api.verifikasiPublikasi(x.id, true, o.kategori); toast('Dokumen terbit di Dokumen Bersama.'); await onSelesai?.(); },
    });
  }
  const k = await konfirmasi({ judul: 'Tolak pengajuan?', pesan: `"${x.judul}" dikembalikan ke Pokja ${x.pokja_nama}.`, label: 'Tolak', bahaya: true, alasan: { label: 'Alasan penolakan', wajib: true } });
  if (!k.ok) return;
  try { await api.verifikasiPublikasi(x.id, false, null, k.alasan); toast('Pengajuan ditolak dengan catatan.'); await onSelesai?.(); } catch (e) { toast(pesanGalat(e), 'galat'); }
}

export { opsi };
