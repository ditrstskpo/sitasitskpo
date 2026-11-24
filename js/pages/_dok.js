// Bagian bersama Dokumen Pokja & Dokumen Bersama: kartu dokumen, unggah banyak berkas (seret & lepas),
// ubah judul/pindah folder, ajukan publikasi, dan verifikasi Pokja TU.
import { html, raw, relatif, tanggal } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api, modePratinjau } from '../core/api.js';
import { toast, pesanGalat, konfirmasi, chipPokja, bukaModal, tombolMuat } from '../core/ui.js';
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
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">${badgeDok(x)}${pokja ? chipPokja({ nama_pendek: x.pokja_nama, warna: x.warna, warna_tint: x.warna_tint, warna_teks: x.warna_teks }) : x.kategori && x.status === 'privat' ? html`<span class="badge b-draft kecil">${raw(ikon('hash', 14))} ${x.kategori}</span>` : ''}</div>
    ${x.keterangan ? html`<p class="meta" style="color:var(--teks)">${x.keterangan}</p>` : ''}
    ${x.catatan_verifikasi ? html`<p class="meta" style="color:${x.status === 'ditolak' ? 'var(--merah)' : 'var(--teks)'}">${raw(ikon('msg', 14))} ${x.catatan_verifikasi}</p>` : ''}
    <p class="meta">${x.status === 'terbit' && x.diverifikasi_pada ? `Terbit ${tanggal(x.diverifikasi_pada)} · diverifikasi ${x.diverifikasi_nama || 'TU'}` : `Diunggah ${x.dibuat_nama || ''} · ${relatif(x.dibuat_pada)}`}</p>
    <div class="aksi"><button class="btn btn-secondary btn-sm" data-unduh-berkas="${x.berkas_id}">${raw(ikon(x.lokasi === 'tautan' ? 'external' : 'download', 16))} ${x.lokasi === 'tautan' ? 'Buka' : 'Unduh'}</button>${raw(aksi)}</div>
  </article>`;
}

/** Zona unggah banyak berkas ke folder repositori. */
export const zonaUnggah = (folderId) => html`<label class="unggah-zona" data-zona="${folderId}">${raw(ikon('upload', 28))}
  <b>Seret berkas ke sini, atau klik untuk memilih</b><small>Boleh banyak sekaligus · PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX maks 10 MB · foto JPG/PNG otomatis dikecilkan ≤ 1 MB</small>
  <input type="file" multiple hidden accept="${TERIMA_DOK}" data-zona-input="${folderId}"></label>`;

/** Unggah daftar berkas ke folder. Mengembalikan daftar hasil (berisi dokumen_id). */
export async function unggahKeFolder(folderId, files, { onTiap } = {}) {
  const hasil = [];
  let gagal = 0;
  for (const [i, f] of [...files].entries()) {
    const foto = /^image\/(jpeg|png|webp|heic|heif)$/i.test(f.type) || /\.(jpe?g|png|heic|webp)$/i.test(f.name);
    try {
      onTiap?.(i, files.length, f.name);
      hasil.push(Object.assign(await unggahKonteks({ konteks: 'dokumen', ref: folderId, jenis: foto ? 'foto' : 'dokumen', file: f, foto }), { _file: f }));
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

/** Ajukan ke Dokumen Bersama. Kategori sudah dipilih saat unggah; bila belum (dokumen lama), ditanyakan sekali. */
export function ajukanDok(x, { onSelesai } = {}) {
  const foto = /^image\//.test(x.mime || '');
  if (x.kategori) {
    return konfirmasi({ judul: 'Ajukan ke Dokumen Bersama?', pesan: `"${x.judul}" (kategori ${x.kategori}) dikirim ke Pokja TU untuk diverifikasi. Setelah terbit, semua pegawai dapat melihatnya.`, label: 'Ajukan' })
      .then(async (k) => { if (!k.ok) return; try { await api.ajukanPublikasi(x.id, null); toast('Diajukan. Pokja TU mendapat notifikasi untuk memverifikasi.'); await onSelesai?.(); } catch (e) { toast(pesanGalat(e), 'galat'); } });
  }
  return bukaFormulir({
    judul: 'Ajukan ke Dokumen Bersama', ukuran: 'kecil', label: 'Ajukan ke Pokja TU', data: { kategori: foto ? 'Dokumentasi Kegiatan' : '' },
    atas: String(html`<p style="margin-bottom:14px"><b>${x.judul}</b><br><small class="redup">Dokumen tampil untuk semua pegawai setelah diverifikasi Pokja TU.
      ${foto ? 'Foto hanya dapat diterbitkan pada kategori Dokumentasi Kegiatan.' : 'Kategori Dokumentasi Kegiatan khusus untuk foto.'}</small></p>`),
    defs: [{ kolom: [{ k: 'kategori', l: 'Kategori', tipe: 'pilih', opsi: katUntuk(foto), wajib: true, lebar: true }] }],
    simpan: async (o) => { await api.ajukanPublikasi(x.id, o.kategori); toast('Diajukan. Pokja TU mendapat notifikasi untuk memverifikasi.'); await onSelesai?.(); },
  });
}

/** Pilihan Kategori: foto hanya Dokumentasi Kegiatan; berkas lain tidak boleh Dokumentasi Kegiatan. */
export const katUntuk = (foto) => (foto ? ['Dokumentasi Kegiatan'] : KAT_DOK.filter((k) => k !== 'Dokumentasi Kegiatan'));

/** Modal ubah judul/keterangan/kategori (tanpa folder). */
export function ubahDok(x, _folder, { onSelesai } = {}) {
  const foto = /^image\//.test(x.mime || '');
  return bukaFormulir({
    judul: 'Ubah Dokumen', ukuran: '', data: x, label: 'Simpan',
    defs: [{ kolom: [{ k: 'judul', l: 'Judul dokumen', wajib: true, lebar: true }, { k: 'keterangan', l: 'Keterangan', tipe: 'area', lebar: true, baris: 2 },
      { k: 'kategori', l: 'Kategori', tipe: 'pilih', opsi: katUntuk(foto), kosong: null, lebar: true }] }],
    simpan: async (o) => { await api.ubahDokumen(x.id, { judul: o.judul, keterangan: o.keterangan, ...(o.kategori ? { kategori: o.kategori } : {}) }); toast('Dokumen diperbarui.'); await onSelesai?.(); },
  });
}

// ---------------------------------------------------------------- Tambah dokumen: SATU pilihan "Kategori" + tiga cara (berkas · folder · tautan)
const SISTEM = /^(\.DS_Store|Thumbs\.db|desktop\.ini|~\$.*|\..*)$/i;
const EKSTENSI_OK = /\.(pdf|docx?|xlsx?|pptx?|jpe?g|png)$/i;
const ukuranOk = (f) => (/\.(jpe?g|png)$/i.test(f.name) ? true : f.size <= 10 * 1024 * 1024);

/**
 * Modal "Tambah Dokumen".
 *  pokja: [{id, nama_pendek}] pokja yang boleh dipilih · kategori: pilihan awal · ajukan: true = langsung diajukan ke Pokja TU
 *  (Dokumen Bersama); false = tampil kotak centang "Langsung ajukan". onSelesai: dipanggil setelah ada yang tersimpan.
 */
export function bukaTambahDokumen({ pokja, pokjaId, kategori = '', ajukan = false, onSelesai } = {}) {
  const m = bukaModal({
    judul: ajukan ? 'Unggah & Ajukan ke Dokumen Bersama' : 'Tambah Dokumen', ukuran: 'besar',
    isi: String(html`${ajukan ? html`<div class="info-card biru" style="margin-bottom:16px">${raw(ikon('info', 20, 'ik'))}<span>Berkas disimpan di repositori Pokja Anda lalu langsung diajukan ke Pokja TU. Setelah diverifikasi, dokumen tampil untuk semua pegawai.</span></div>` : ''}
      <div class="form-grid">
        ${pokja.length > 1 ? html`<div class="field"><label class="label" for="td-pokja">Pokja<span class="wajib">*</span></label><select id="td-pokja" class="select">${opsi(pokja.map((p) => [p.id, 'Pokja ' + p.nama_pendek]), pokjaId)}</select></div>` : ''}
        <div class="field"><label class="label" for="td-kat">Kategori<span class="wajib">*</span></label>
          <select id="td-kat" class="select">${opsi(KAT_DOK, kategori || '', '— Pilih kategori —')}</select>
          <div class="help">Dokumentasi Kegiatan khusus foto JPG/PNG (otomatis dikecilkan ≤ 1 MB). Kategori lain menerima PDF, Word, PowerPoint, atau Excel.</div></div>
        <div class="field penuh"><span class="label" id="td-cara-l">Cara menambahkan<span class="wajib">*</span></span>
          <div class="cara-pilih" role="radiogroup" aria-labelledby="td-cara-l">
            <button type="button" role="radio" aria-checked="true" data-cara="berkas">${raw(ikon('upload', 20))}<b>Unggah berkas</b><small>Satu atau banyak file</small></button>
            <button type="button" role="radio" aria-checked="false" data-cara="folder">${raw(ikon('folder-input', 20))}<b>Unggah folder</b><small>Seluruh isi satu folder</small></button>
            <button type="button" role="radio" aria-checked="false" data-cara="tautan">${raw(ikon('link', 20))}<b>Tempel tautan</b><small>Google Drive / Docs</small></button></div></div>
        <div class="field penuh" data-isi-cara></div>
        <p class="help penuh" data-td-prog aria-live="polite" style="margin:0"></p>
        ${ajukan ? '' : html`<label class="cek-baris penuh"><input type="checkbox" id="td-ajukan"><span>Langsung ajukan ke Dokumen Bersama (Pokja TU akan memverifikasi)</span></label>`}
      </div>`),
    kaki: String(html`<button class="btn btn-ghost" data-batal>Batal</button><button class="btn btn-primary" data-td-ok>${raw(ikon(ajukan ? 'send' : 'save', 18))} ${ajukan ? 'Unggah & Ajukan' : 'Simpan'}</button>`),
  });
  const $m = (x) => m.el.querySelector(x);
  let cara = 'berkas';
  const gCara = () => {
    m.el.querySelectorAll('[data-cara]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.cara === cara)));
    $m('[data-isi-cara]').innerHTML = String(cara === 'tautan'
      ? html`<div class="form-grid"><div class="field"><label class="label" for="td-tn">Nama dokumen<span class="wajib">*</span></label><input id="td-tn" class="input" placeholder="mis. SOP Penjangkauan 2026"></div>
          <div class="field"><label class="label" for="td-tu">Tautan<span class="wajib">*</span></label><input id="td-tu" class="input" type="url" placeholder="https://drive.google.com/…"><div class="help">Pastikan berkas dapat dibuka pegawai Direktorat.</div></div></div>`
      : html`<label class="unggah-zona" data-td-zona>${raw(ikon(cara === 'folder' ? 'folder-input' : 'upload', 28))}<b data-td-nama>${cara === 'folder' ? 'Pilih satu folder dari komputer' : 'Pilih satu atau beberapa berkas'}</b>
          <small>PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX maks 10 MB · foto JPG/PNG otomatis dikecilkan ≤ 1 MB${cara === 'folder' ? ' · isi sub-folder ikut diunggah' : ''}</small>
          <input type="file" id="td-file" hidden multiple ${cara === 'folder' ? raw('webkitdirectory directory') : ''}></label>
        ${cara === 'berkas' ? html`<div class="field" style="margin-top:12px"><label class="label" for="td-judul">Judul (opsional)</label><input id="td-judul" class="input" placeholder="Bila kosong, memakai nama berkas"><div class="help">Hanya untuk satu berkas.</div></div>` : ''}`);
    const inp = $m('#td-file');
    if (inp) inp.onchange = () => { const n = inp.files.length; const nm = $m('[data-td-nama]'); nm.textContent = !n ? (cara === 'folder' ? 'Pilih satu folder dari komputer' : 'Pilih satu atau beberapa berkas')
      : cara === 'folder' ? `${n} berkas dalam folder “${(inp.files[0].webkitRelativePath || '').split('/')[0]}”` : n === 1 ? inp.files[0].name : `${n} berkas dipilih`; };
  };
  m.el.addEventListener('click', (e) => { const b = e.target.closest('[data-cara]'); if (b) { cara = b.dataset.cara; gCara(); } });
  gCara();

  $m('[data-td-ok]').onclick = async (ev) => {
    const kat = $m('#td-kat').value, pid = $m('#td-pokja')?.value || pokjaId || pokja[0]?.id, langsung = ajukan || !!$m('#td-ajukan')?.checked;
    if (!kat) return toast('Pilih kategori lebih dulu.', 'peringatan');
    if (!pid) return toast('Anda belum tergabung di Pokja.', 'peringatan');
    const pulih = tombolMuat(ev.currentTarget, 'Menyimpan…');
    try {
      const folder = await api.daftarFolder(pid);
      const fid = (folder.find((f) => f.nama === 'File Kegiatan') || folder[0])?.id;
      if (!fid) throw new Error('Repositori Pokja belum siap. Muat ulang halaman lalu coba lagi.');
      const ids = [];
      if (cara === 'tautan') {
        const nama = $m('#td-tn').value.trim(), url = $m('#td-tu').value.trim();
        if (!nama || !url) throw new Error('Isi nama dokumen dan tautannya.');
        if (kat === 'Dokumentasi Kegiatan') throw new Error('Dokumentasi Kegiatan harus berupa foto yang diunggah, bukan tautan.');
        const r = await api.tambahTautanKonteks('dokumen', fid, 'tautan', nama, url);
        ids.push({ id: r.dokumen_id, nama });
      } else {
        const semua = [...($m('#td-file').files || [])];
        if (!semua.length) throw new Error(cara === 'folder' ? 'Pilih folder lebih dulu.' : 'Pilih berkas lebih dulu.');
        const layak = [], lewati = { jenis: 0, kategori: 0 };
        for (const f of semua) {
          if (SISTEM.test(f.name) || (cara === 'folder' && !EKSTENSI_OK.test(f.name))) { lewati.jenis++; continue; }
          const foto = /\.(jpe?g|png)$/i.test(f.name) || /^image\//.test(f.type);
          if ((kat === 'Dokumentasi Kegiatan') !== foto) { lewati.kategori++; continue; }
          if (!ukuranOk(f)) { lewati.jenis++; toast(`${f.name}: ukuran melebihi 10 MB.`, 'peringatan'); continue; }
          layak.push(f);
        }
        if (lewati.kategori) toast(`${lewati.kategori} berkas dilewati: ${kat === 'Dokumentasi Kegiatan' ? 'kategori ini hanya untuk foto JPG/PNG' : 'foto hanya untuk kategori Dokumentasi Kegiatan'}.`, 'peringatan');
        if (cara === 'folder' && lewati.jenis) toast(`${lewati.jenis} berkas bukan dokumen (atau berkas sistem) dilewati.`, 'info');
        if (!layak.length) throw new Error('Tidak ada berkas yang dapat diunggah.');
        const judulSatu = cara === 'berkas' && layak.length === 1 ? ($m('#td-judul')?.value.trim() || '') : '';
        const hasil = await unggahKeFolder(fid, layak, { onTiap: (i, n) => { $m('[data-td-prog]').textContent = `Mengunggah ${i + 1} dari ${n} berkas…`; } });
        hasil.forEach((r) => ids.push({ id: r.dokumen_id, nama: r.nama, judul: judulSatu, ket: cara === 'folder' ? 'Folder: ' + (r._file.webkitRelativePath || '').split('/').slice(0, -1).join('/') : '' }));
      }
      let ok = 0;
      for (const r of ids) {
        try {
          await api.ubahDokumen(r.id, { kategori: kat, ...(r.judul ? { judul: r.judul } : {}), ...(r.ket ? { keterangan: r.ket } : {}) });
          if (langsung) await api.ajukanPublikasi(r.id, null);
          ok++;
        } catch (err) { toast(`${r.nama}: ${pesanGalat(err)}`, 'galat', 'Belum lengkap'); }
      }
      pulih();
      if (ok) { toast(langsung ? `${ok} dokumen diajukan ke Pokja TU.` : `${ok} dokumen tersimpan pada kategori ${kat}.`); m.tutup(); await onSelesai?.(pid, kat); }
    } catch (err) { pulih(); toast(pesanGalat(err), 'galat'); }
  };
  return m;
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
