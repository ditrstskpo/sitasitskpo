// Pencarian global (poin 1 perbaikan 24 Nov 2026): kotak cari di bilah atas menampilkan saran saat mengetik —
// nama & NIK PM, usulan/SK, dokumen, NAMA BERKAS yang dikirim, produk hukum, dan menu —
// lalu menyempit satu per satu sesuai huruf yang diketik. Pencocokan = kata sebagian (awalan/bagian kata), bukan tebakan.
import { html, raw } from './util.js';
import { ikon } from './icons.js';
import { api } from './api.js';
import { state } from './store.js';
import { grupMenu } from './menu.js';

const LABEL_USULAN = { draft: 'Draf', menunggu: 'Menunggu verifikasi', perlu_perbaikan: 'Perlu perbaikan', proses: 'Diproses', selesai: 'Selesai', ditolak: 'Ditolak' };

// Satu tempat untuk urutan grup, ikon, tujuan klik, dan teks baris.
export const GRUP = [
  { k: 'pm', judul: 'Penerima Manfaat (PM)', ik: 'users', tujuan: (x) => `#/pm/${x.nik}`, utama: (x) => x.nama, ket: (x) => `NIK ${x.nik}${x.klaster_ppks ? ' · ' + x.klaster_ppks : ''}${x.ktp_kabkota ? ' · ' + x.ktp_kabkota : ''}` },
  { k: 'usulan', judul: 'Usulan & SK', ik: 'clipboard-list', tujuan: (x) => `#/usulan/${x.id}`, utama: (x) => x.judul, ket: (x) => `${x.no_register}${x.no_sk ? ' · SK ' + x.no_sk : ''} · ${LABEL_USULAN[x.status] || x.status}` },
  { k: 'berkas', judul: 'Berkas yang dikirim', ik: 'paperclip', tujuan: (x) => `#/usulan/${x.usulan_id}`, utama: (x) => x.nama, ket: (x) => `Pada usulan ${x.no_register || ''}` },
  { k: 'dokumen', judul: 'Dokumen', ik: 'file-text', tujuan: (x) => `#/dokumen-bersama?q=${encodeURIComponent(x.judul)}`, utama: (x) => x.judul, ket: (x) => x.kategori || 'Dokumen' },
  { k: 'hukum', judul: 'Produk Hukum & SOP', ik: 'scale', tujuan: (x) => `#/produk-hukum?q=${encodeURIComponent(x.nomor || x.judul)}`, utama: (x) => x.judul, ket: (x) => [x.jenis, x.nomor ? 'No. ' + x.nomor : '', x.tahun].filter(Boolean).join(' · ') },
];

export function cariMenu(q, maks = 4) {
  const kata = String(q || '').toLowerCase().split(/\s+/).filter(Boolean);
  if (!kata.length) return [];
  return grupMenu(state.sesi).flatMap((g) => g.item.map((m) => ({ ...m, grup: g.judul })))
    .filter((m) => { const t = (m.label + ' ' + (m.ket || []).join(' ')).toLowerCase(); return kata.every((k) => t.includes(k)); }).slice(0, maks);
}

/** Susun daftar datar {href, utama, ket, ik, grup} dari hasil server + menu. */
export function susunHasil(hasil, menu) {
  const baris = [];
  GRUP.forEach((g) => (hasil?.[g.k] || []).forEach((x) => baris.push({ grup: g.judul, ik: g.ik, href: g.tujuan(x), utama: g.utama(x), ket: g.ket(x) })));
  menu.forEach((m) => baris.push({ grup: 'Menu', ik: m.ikon || 'grid', href: '#' + m.rute, utama: m.label, ket: m.grup }));
  return baris;
}

// ---------------------------------------------------------------- kotak saran di bilah atas
export function pasangSaran(form) {
  const input = form.querySelector('input[name="q"]');
  const kotak = document.createElement('div');
  kotak.className = 'cari-saran'; kotak.id = 'cari-saran'; kotak.setAttribute('role', 'listbox'); kotak.setAttribute('aria-label', 'Saran pencarian'); kotak.hidden = true;
  form.appendChild(kotak);
  input.setAttribute('role', 'combobox'); input.setAttribute('aria-expanded', 'false'); input.setAttribute('aria-controls', 'cari-saran'); input.setAttribute('aria-autocomplete', 'list');
  let nomor = 0, timer = 0, aktif = -1, daftar = [];

  const tutup = () => { kotak.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); aktif = -1; };
  const sorot = (i) => {
    const el = [...kotak.querySelectorAll('[role="option"]')];
    if (!el.length) return;
    aktif = (i + el.length) % el.length;
    el.forEach((e, n) => e.setAttribute('aria-selected', String(n === aktif)));
    input.setAttribute('aria-activedescendant', el[aktif].id); el[aktif].scrollIntoView({ block: 'nearest' });
  };
  const gambar = (q, galat) => {
    let n = 0, grupSaatIni = '';
    const isi = daftar.map((b) => {
      const kepala = b.grup !== grupSaatIni ? (grupSaatIni = b.grup, `<div class="cs-grup" role="presentation">${html`${b.grup}`}</div>`) : '';
      return kepala + String(html`<a class="cs-baris" role="option" id="cs-${n++}" aria-selected="false" href="${b.href}" data-saran>
        <span class="ubin ubin-kecil">${raw(ikon(b.ik, 18))}</span><span class="cs-teks"><b>${b.utama}</b><small>${b.ket || ''}</small></span></a>`);
    }).join('');
    kotak.innerHTML = (galat ? `<div class="cs-kosong">${String(html`${galat}`)}</div>` : '')
      + (isi || (galat ? '' : String(html`<div class="cs-kosong">Tidak ada yang cocok dengan “${q}”. Coba sebagian katanya saja.</div>`)))
      + String(html`<a class="cs-semua" href="#/cari?q=${encodeURIComponent(q)}" data-saran>${raw(ikon('search', 16))} Lihat semua hasil untuk “${q}”</a>`);
    kotak.hidden = false; input.setAttribute('aria-expanded', 'true'); aktif = -1;
  };
  const cari = async (q) => {
    const saya = ++nomor;
    try {
      const h = await api.cariGlobal(q, 4);
      if (saya !== nomor) return; // jawaban lama diabaikan bila sudah mengetik lagi
      daftar = susunHasil(h, cariMenu(q, 3)); gambar(q);
    } catch (e) {
      if (saya !== nomor) return;
      daftar = susunHasil(null, cariMenu(q, 3)); gambar(q, 'Pencarian data belum bisa dijangkau. Menu tetap bisa dicari.');
    }
  };

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) { nomor++; tutup(); return; }
    timer = setTimeout(() => cari(q), 220);
  });
  input.addEventListener('focus', () => { if (input.value.trim().length >= 2 && daftar.length) { kotak.hidden = false; input.setAttribute('aria-expanded', 'true'); } });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { tutup(); return; }
    if (kotak.hidden) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); sorot(aktif + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sorot(aktif - 1); }
    else if (e.key === 'Enter' && aktif >= 0) { e.preventDefault(); const a = kotak.querySelectorAll('[role="option"]')[aktif]; if (a) { location.hash = a.getAttribute('href'); tutup(); input.blur(); } }
  });
  kotak.addEventListener('mousedown', (e) => e.preventDefault()); // agar klik tidak menutup lebih dulu
  kotak.addEventListener('click', (e) => { if (e.target.closest('[data-saran]')) { setTimeout(tutup, 0); input.blur(); } });
  document.addEventListener('click', (e) => { if (!form.contains(e.target)) tutup(); });
  form.addEventListener('submit', () => { nomor++; clearTimeout(timer); tutup(); });
}
