// Unggah langsung dari setiap menu (Tahap 3 & 4): galeri foto dan daftar berkas untuk data LKS, dokumen Pokja,
// dokumentasi PM, rencana kerja, produk hukum, dan OJT. Berkas tetap disimpan di Google Drive Super Admin lewat
// Edge Function "berkas"; konteks dikirim dengan awalan "konteks:" sehingga Edge Function tidak perlu diubah.
import { html, raw, tanggalJam } from './util.js';
import { ikon } from './icons.js';
import { api, modePratinjau } from './api.js';
import { unggahBerkas, ambilBerkas, hapusBerkas, simpanBlob } from './berkas.js';
import { kecilkanFoto } from './foto.js';
import { toast, konfirmasi, pesanGalat, tombolMuat, bukaModal } from './ui.js';
import { ukuranTeks } from './komp.js';

export const MIME_DOK = ['application/pdf', 'application/msword', 'image/jpeg', 'image/png', 'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
export const TERIMA_DOK = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png';

/** Unggah ke konteks (lks | dokumen | dok_pm | renja | hukum | ojt | smv | belanja). ref = ID data (atau ID folder untuk dokumen). */
export async function unggahKonteks({ konteks, ref, jenis, file, foto = false }) {
  let f = file;
  if (foto) f = await kecilkanFoto(file);
  else if (konteks === 'belanja' && /^image\/(jpeg|png|webp|heic|heif)/i.test(file.type || '')) f = await kecilkanFoto(file);   // foto nota/barang ≤ 1 MB
  else {
    if (f.size > 10 * 1024 * 1024) throw new Error('Ukuran dokumen maksimal 10 MB.');
    if (f.type && !MIME_DOK.includes(f.type)) throw new Error('Jenis berkas tidak diizinkan. Gunakan PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX, JPG, atau PNG.');
  }
  return unggahBerkas({ usulanId: ref, tahap: 'konteks:' + konteks, jenis, file: f });
}

// ---------------------------------------------------------------- pratinjau gambar (blob dari Drive, disimpan sementara)
const thumb = new Map();
async function urlGambar(id) {
  if (thumb.has(id)) return thumb.get(id);
  const p = ambilBerkas(id).then((r) => (r.blob ? URL.createObjectURL(r.blob) : r.tautan));
  thumb.set(id, p);
  p.catch(() => thumb.delete(id));
  return p;
}
let antre = 0; const tunggu = [];
const jatah = async (fn) => { if (antre >= 3) await new Promise((r) => tunggu.push(r)); antre++; try { return await fn(); } finally { antre--; tunggu.shift()?.(); } };

/** Muat gambar mini untuk semua img[data-gambar] di dalam root (maks 3 bersamaan). */
export function muatGambarMini(root) {
  root.querySelectorAll('img[data-gambar]:not([data-dimuat])').forEach((img) => {
    img.dataset.dimuat = '1';
    jatah(() => urlGambar(img.dataset.gambar)).then((u) => { img.src = u; img.closest('.foto')?.classList.add('siap'); })
      .catch(() => img.closest('.foto')?.classList.add('gagal'));
  });
}

/**
 * Galeri foto satu kategori. berkas: baris berkas kategori ini. maks: batas foto.
 * boleh: pengguna boleh menambah/menghapus.
 */
export function galeriFoto({ konteks, ref, jenis, judul, ket = '', berkas = [], maks = 2, boleh = false, wajib = false, tanpa = null, aksiTanpa = '' }) {
  const kosong = Math.max(0, maks - berkas.length);
  const merah = wajib && !berkas.length && tanpa?.status !== 'disetujui';
  return html`<div class="galeri ${merah ? 'kurang' : ''}" data-galeri="${jenis}">
    <div class="galeri-kepala"><span class="ubin ${merah ? 'merah' : ''}">${raw(ikon('camera', 20))}</span>
      <div><b>${judul}</b><small>${ket || `Maks ${maks} foto · 1 MB per foto (dikecilkan otomatis)`}</small></div>
      <span class="spacer"></span>
      ${berkas.length ? html`<span class="badge b-ok">${raw(ikon('check-circle', 15))} ${berkas.length}/${maks}</span>`
        : tanpa?.status === 'disetujui' ? html`<span class="badge b-draft">Tidak ada dokumentasi (disetujui)</span>`
          : tanpa?.status === 'menunggu' ? html`<span class="badge b-wait">${raw(ikon('clock', 15))} Pengecualian menunggu</span>`
            : merah ? html`<span class="badge b-fix">${raw(ikon('alert', 15))} Belum ada foto</span>` : html`<span class="badge b-draft">Belum ada</span>`}</div>
    <div class="foto-grid">
      ${berkas.map((b) => html`<figure class="foto">
        <button type="button" class="foto-lihat" data-lihat="${b.id}" aria-label="Lihat ${b.nama}"><img alt="${b.nama}" data-gambar="${b.id}" loading="lazy"><span class="foto-muat"></span></button>
        <figcaption>${b.diunggah_nama || ''}<br><small>${tanggalJam(b.dibuat_pada)}</small></figcaption>
        ${boleh ? html`<button type="button" class="foto-hapus" data-hapus-berkas="${b.id}" aria-label="Hapus foto ${b.nama}">${raw(ikon('trash', 16))}</button>` : ''}</figure>`)}
      ${boleh && kosong ? Array.from({ length: kosong }, () => html`<label class="foto foto-tambah">${raw(ikon('camera', 26))}<span>Tambah foto</span>
        <input type="file" accept="image/*" hidden data-unggah-foto data-konteks="${konteks}" data-ref="${ref}" data-jenis="${jenis}"></label>`)
        : !berkas.length ? html`<div class="foto foto-kosong">${raw(ikon('image-off', 24))}<span>${boleh ? '' : 'Belum ada foto'}</span></div>` : ''}
    </div>
    ${tanpa?.alasan ? html`<p class="galeri-catatan">${raw(ikon('info', 15))} Alasan tidak ada dokumentasi: ${tanpa.alasan}${tanpa.catatan ? ' · Catatan: ' + tanpa.catatan : ''}</p>` : ''}
    ${aksiTanpa ? raw(aksiTanpa) : ''}
  </div>`;
}

/**
 * Daftar berkas dokumen (non-foto) satu jenis. Bisa unggah atau tempel tautan.
 */
export function daftarBerkas({ konteks, ref, jenis, judul, ket = '', berkas = [], boleh = false, tautan = true, satu = false }) {
  const ada = berkas.filter((b) => b.jenis === jenis);
  return html`<div class="slot-berkas" data-slot="${jenis}">
    <div class="slot-head"><span class="ubin biru">${raw(ikon('file-text', 20))}</span><div><b>${judul}</b>${ket ? html`<small>${ket}</small>` : ''}</div>
      ${ada.length ? html`<span class="badge b-ok">${raw(ikon('check-circle', 15))} ${ada.length} berkas</span>` : html`<span class="badge b-draft">Belum ada</span>`}</div>
    ${ada.map((b) => html`<div class="berkas-baris"><span class="ik">${raw(ikon(b.lokasi === 'tautan' ? 'link' : /^image\//.test(b.mime || '') ? 'image' : 'file-text', 18))}</span>
      <span class="nm"><b>${b.nama}</b><small>${[ukuranTeks(b.ukuran), b.lokasi === 'tautan' ? 'Tautan' : 'Google Drive', b.diunggah_nama, tanggalJam(b.dibuat_pada)].filter(Boolean).join(' · ')}</small></span>
      <button type="button" class="btn btn-icon" data-unduh-berkas="${b.id}" title="Unduh / buka" aria-label="Unduh ${b.nama}">${raw(ikon('download', 18))}</button>
      ${boleh ? html`<button type="button" class="btn btn-icon" data-hapus-berkas="${b.id}" title="Hapus" aria-label="Hapus ${b.nama}">${raw(ikon('trash', 18))}</button>` : ''}</div>`)}
    ${boleh && !(satu && ada.length) ? html`<div class="slot-aksi">
      <label class="btn btn-secondary btn-sm">${raw(ikon('upload', 16))} ${ada.length ? 'Tambah berkas' : 'Unggah berkas'}
        <input type="file" hidden accept="${TERIMA_DOK}" data-unggah-dok data-konteks="${konteks}" data-ref="${ref}" data-jenis="${jenis}"></label>
      ${tautan ? html`<button type="button" class="btn btn-ghost btn-sm" data-tautan-konteks data-konteks="${konteks}" data-ref="${ref}" data-jenis="${jenis}" data-judul="${judul}">${raw(ikon('link', 16))} Tempel tautan</button>` : ''}
      <small class="redup">PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX, JPG/PNG · maks 10 MB</small></div>` : ''}
  </div>`;
}

/** Lihat foto dalam modal. */
export async function lihatFoto(id, nama = 'Foto') {
  const m = bukaModal({ judul: nama, ukuran: 'besar', isi: '<div class="foto-penuh"><div class="skel" style="height:320px;border-radius:16px"></div></div>',
    kaki: '<button type="button" class="btn btn-ghost" data-batal>Tutup</button><button type="button" class="btn btn-secondary" data-unduh-penuh>Unduh</button>' });
  try {
    const u = await urlGambar(id);
    m.body.querySelector('.foto-penuh').innerHTML = `<img src="${u}" alt="">`;
  } catch (e) { m.body.innerHTML = String(html`<div class="galat">${raw(ikon('alert', 20))}<span>${pesanGalat(e)}</span></div>`); }
  m.el.querySelector('[data-unduh-penuh]').onclick = (e) => unduhKonteks(id, e.currentTarget);
}

export async function unduhKonteks(id, tombol) {
  const pulih = tombolMuat(tombol, '');
  try {
    const r = await ambilBerkas(id);
    if (r.tautan) window.open(r.tautan, '_blank', 'noopener');
    else simpanBlob(r.nama, r.blob);
  } catch (e) { toast(pesanGalat(e), 'galat', 'Unduh gagal'); }
  finally { pulih(); }
}

/**
 * Pasang perilaku unggah/unduh/hapus/tautan untuk galeri & daftar berkas di dalam root.
 * muatUlang(): dipanggil setelah ada perubahan.
 */
export function pasangUnggah(root, { muatUlang, judulJenis = {} } = {}) {
  const ubah = async (inp, foto) => {
    const files = [...(inp.files || [])];
    if (!files.length) return;
    const { konteks, ref, jenis } = inp.dataset;
    inp.value = '';
    const lbl = inp.closest('label');
    const pulih = tombolMuat(lbl, foto ? 'Mengecilkan…' : 'Mengunggah…');
    try {
      for (const f of files) await unggahKonteks({ konteks, ref, jenis, file: f, foto });
      toast(`${judulJenis[jenis] || (foto ? 'Foto' : 'Berkas')} tersimpan${modePratinjau ? ' (mode pratinjau)' : ' di Google Drive'}.`);
      await muatUlang?.();
    } catch (err) { toast(pesanGalat(err), 'galat', 'Unggah gagal'); pulih(); }
  };
  root.addEventListener('change', (e) => {
    const f = e.target.closest('input[data-unggah-foto]');
    if (f) return ubah(f, true);
    const d = e.target.closest('input[data-unggah-dok]');
    if (d) return ubah(d, false);
  });
  root.addEventListener('click', async (e) => {
    const lihat = e.target.closest('[data-lihat]');
    if (lihat) { e.preventDefault(); return lihatFoto(lihat.dataset.lihat, lihat.querySelector('img')?.alt); }
    const u = e.target.closest('[data-unduh-berkas]');
    if (u) return unduhKonteks(u.dataset.unduhBerkas, u);
    const t = e.target.closest('[data-tautan-konteks]');
    if (t) {
      const { konteks, ref, jenis, judul } = t.dataset;
      const m = bukaModal({
        judul: 'Tempel tautan berkas', ukuran: 'kecil',
        isi: String(html`<div class="field"><label class="label" for="tk-nama">Nama berkas<span class="wajib">*</span></label><input id="tk-nama" class="input" value="${judul || ''}"></div>
          <div class="field" style="margin-top:16px"><label class="label" for="tk-url">Tautan (Google Drive / Docs)<span class="wajib">*</span></label>
          <input id="tk-url" class="input" type="url" placeholder="https://drive.google.com/…"><div class="help">Pastikan berkas dapat dibuka pegawai Direktorat.</div></div>`),
        kaki: String(html`<button class="btn btn-ghost" data-batal>Batal</button><button class="btn btn-primary" data-ok>Simpan tautan</button>`),
      });
      m.el.querySelector('[data-ok]').onclick = async (ev) => {
        const pulih = tombolMuat(ev.currentTarget);
        try {
          await api.tambahTautanKonteks(konteks, ref, jenis, m.el.querySelector('#tk-nama').value.trim(), m.el.querySelector('#tk-url').value.trim());
          m.tutup(); toast('Tautan berkas tersimpan.'); await muatUlang?.();
        } catch (err) { pulih(); toast(pesanGalat(err), 'galat'); }
      };
      return;
    }
    const h = e.target.closest('[data-hapus-berkas]');
    if (h) {
      const k = await konfirmasi({ judul: 'Hapus berkas?', pesan: 'Berkas dihapus dari SITASI dan dipindahkan ke sampah Google Drive Super Admin.', label: 'Hapus', bahaya: true });
      if (!k.ok) return;
      try { await hapusBerkas(h.dataset.hapusBerkas); thumb.delete(h.dataset.hapusBerkas); toast('Berkas dihapus.'); await muatUlang?.(); }
      catch (err) { toast(pesanGalat(err), 'galat'); }
    }
  });
}
