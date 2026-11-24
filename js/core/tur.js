// Tur singkat (coach-mark): lampu sorot pada bagian layar + kartu penjelasan berbahasa sederhana.
// Dipakai Pusat Bantuan & Pelatihan. Tombol besar (≥ 44 px), dapat dikendalikan papan ketik (← → Esc).
import { html, raw } from './util.js';
import { ikon } from './icons.js';
import { gerakDikurangi } from './ui.js';

const terlihat = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';

/** langkah: [{ sel, judul, isi }] — langkah dengan elemen tak terlihat dilewati otomatis. */
export function mulaiTur(langkah, { onSelesai } = {}) {
  const daftar = langkah.filter((l) => !l.sel || terlihat(document.querySelector(l.sel)));
  if (!daftar.length) return;
  let i = 0;
  const lap = document.createElement('div'); lap.className = 'tur-lapis';
  const sorot = document.createElement('div'); sorot.className = 'tur-sorot';
  const kartu = document.createElement('div'); kartu.className = 'tur-kartu'; kartu.setAttribute('role', 'dialog'); kartu.setAttribute('aria-modal', 'true'); kartu.setAttribute('aria-live', 'polite');
  document.body.append(lap, sorot, kartu);
  const asal = document.activeElement;
  function tempatkan() {
    const l = daftar[i], el = l.sel && document.querySelector(l.sel);
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: gerakDikurangi() ? 'auto' : 'smooth' });
      const r = el.getBoundingClientRect(), p = 8;
      Object.assign(sorot.style, { display: 'block', left: r.left - p + 'px', top: r.top - p + 'px', width: r.width + p * 2 + 'px', height: r.height + p * 2 + 'px' });
      // cari tempat kartu yang tidak menutupi bagian yang disorot: bawah → atas → kanan → kiri → tengah bawah
      const k = kartu.getBoundingClientRect(), jarak = 18, batasX = (x) => Math.max(12, Math.min(innerWidth - k.width - 12, x)), batasY = (y) => Math.max(12, Math.min(innerHeight - k.height - 12, y));
      let x, y;
      if (r.bottom + jarak + k.height < innerHeight) { x = batasX(r.left + r.width / 2 - k.width / 2); y = r.bottom + jarak; }
      else if (r.top - jarak - k.height > 0) { x = batasX(r.left + r.width / 2 - k.width / 2); y = r.top - k.height - jarak; }
      else if (r.right + jarak + k.width < innerWidth) { x = r.right + jarak; y = batasY(r.top + 40); }
      else if (r.left - jarak - k.width > 0) { x = r.left - k.width - jarak; y = batasY(r.top + 40); }
      else { x = batasX((innerWidth - k.width) / 2); y = innerHeight - k.height - 16; }
      kartu.style.left = x + 'px'; kartu.style.top = y + 'px';
    } else {
      sorot.style.display = 'none';
      const k = kartu.getBoundingClientRect();
      kartu.style.left = (innerWidth - k.width) / 2 + 'px'; kartu.style.top = (innerHeight - k.height) / 2 + 'px';
    }
  }
  function gambar() {
    const l = daftar[i];
    kartu.innerHTML = String(html`<div class="tur-no">Langkah ${i + 1} dari ${daftar.length}</div><h2 id="tur-j">${l.judul}</h2><p>${l.isi}</p>
      <div class="tur-titik" aria-hidden="true">${daftar.map((_, n) => html`<i class="${n === i ? 'on' : ''}"></i>`)}</div>
      <div class="tur-aksi"><button type="button" class="btn btn-ghost" data-tur="tutup">Lewati</button><span class="spacer"></span>
        ${i ? html`<button type="button" class="btn btn-secondary" data-tur="mundur">${raw(ikon('arrow-left', 18))} Kembali</button>` : ''}
        <button type="button" class="btn btn-primary" data-tur="maju">${i === daftar.length - 1 ? html`${raw(ikon('check', 18))} Selesai` : html`Lanjut ${raw(ikon('arrow-right', 18))}`}</button></div>`);
    kartu.setAttribute('aria-labelledby', 'tur-j');
    requestAnimationFrame(() => { tempatkan(); kartu.querySelector('[data-tur="maju"]').focus(); });
  }
  const selesai = (tamat) => {
    removeEventListener('resize', tempatkan); removeEventListener('scroll', tempatkan, true); document.removeEventListener('keydown', tombol, true);
    lap.remove(); sorot.remove(); kartu.remove(); asal?.focus?.();
    if (tamat) onSelesai?.();
  };
  const tombol = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); selesai(false); }
    if (e.key === 'ArrowRight') { e.preventDefault(); i < daftar.length - 1 ? (i++, gambar()) : selesai(true); }
    if (e.key === 'ArrowLeft' && i) { e.preventDefault(); i--; gambar(); }
  };
  kartu.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tur]'); if (!t) return;
    if (t.dataset.tur === 'tutup') return selesai(false);
    if (t.dataset.tur === 'mundur') { i--; return gambar(); }
    if (i < daftar.length - 1) { i++; return gambar(); }
    selesai(true);
  });
  lap.addEventListener('click', () => selesai(false));
  addEventListener('resize', tempatkan); addEventListener('scroll', tempatkan, true); document.addEventListener('keydown', tombol, true);
  gambar();
}

/** Langkah tur kerangka aplikasi (berlaku untuk semua peran). */
export function langkahShell(petugas = false) {
  return [
    { judul: 'Selamat datang di SITASI TSKPO', isi: 'Tur singkat ini menunjukkan bagian-bagian penting layar. Tekan "Lanjut" atau tombol panah kanan di papan ketik. Tekan "Lewati" kapan saja.' },
    { sel: '#sidebar .sb-nav', judul: 'Menu utama', isi: 'Semua menu ada di sini. "Menu Bersama" dapat dibuka semua pegawai; "Workspace Saya" berisi pekerjaan Pokja Anda.' },
    { sel: '.tb-menu', judul: 'Buka menu (ponsel)', isi: 'Di layar kecil, menu disembunyikan. Ketuk tombol ini untuk membukanya.' },
    ...(petugas ? [] : [{ sel: '.tb-cari', judul: 'Cari cepat', isi: 'Ketik NIK, nama PM, nomor SK, atau nama dokumen, lalu tekan Enter.' }]),
    { sel: '.tb-teks', judul: 'Perbesar tulisan', isi: 'Tekan "A+" bila tulisan terlalu kecil. Tekan "A" untuk kembali ke ukuran normal.' },
    { sel: '[data-rt]', judul: 'Status pembaruan langsung', isi: 'Titik hijau berarti data di layar diperbarui otomatis. Bila merah, periksa internet; aplikasi menyambung ulang sendiri.' },
    { sel: '[data-lonceng]', judul: 'Notifikasi', isi: 'Pemberitahuan tugas baru, verifikasi, dan pengumuman muncul di lonceng ini.' },
    { sel: '[data-profil]', judul: 'Profil & kenyamanan', isi: 'Di sini Anda dapat menyalakan "Kontras tinggi", "Kurangi gerakan", membuka Pusat Bantuan, dan keluar dari aplikasi.' },
    { sel: '.nav-bawah', judul: 'Menu cepat (ponsel)', isi: 'Di ponsel, menu yang paling sering dipakai ada di bagian bawah layar.' },
    { judul: 'Selesai!', isi: 'Anda dapat mengulang tur ini kapan saja dari menu "Pusat Bantuan & Pelatihan".' },
  ];
}
