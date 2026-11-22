// Komponen antarmuka bersama: toast, modal, laci, konfirmasi, riak tombol,
// muncul-saat-digulir, hitung naik, judul halaman, keadaan kosong/galat, paginasi.
import { html, raw, esc, angka } from './util.js';
import { ikon } from './icons.js';
import { CONFIG } from '../config.js';

export const gerakDikurangi = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------- toast
let tumpukan;
export function toast(pesan, jenis = 'sukses', judul = '') {
  if (!tumpukan) {
    tumpukan = document.createElement('div');
    tumpukan.className = 'toast-stack';
    tumpukan.setAttribute('role', 'status');
    tumpukan.setAttribute('aria-live', 'polite');
    document.body.appendChild(tumpukan);
  }
  const ik = { sukses: 'check-circle', galat: 'alert', info: 'info', peringatan: 'alert' }[jenis] || 'info';
  const t = document.createElement('div');
  t.className = `toast ${jenis}`;
  t.innerHTML = String(html`${raw(ikon(ik, 20))}<div class="isi">${judul ? html`<b>${judul}</b>` : ''}${pesan}</div>
    <button class="tutup" aria-label="Tutup">${raw(ikon('x', 16))}</button>`);
  tumpukan.appendChild(t);
  requestAnimationFrame(() => t.classList.add('muncul'));
  const hapus = () => { t.classList.remove('muncul'); setTimeout(() => t.remove(), 200); };
  t.querySelector('.tutup').onclick = hapus;
  setTimeout(hapus, jenis === 'galat' ? 6500 : 4000);
}

// ---------------------------------------------------------------- riak tombol
export function pasangRiak() {
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.btn, .peran-btn');
    if (!b || b.disabled || gerakDikurangi()) return;
    const r = b.getBoundingClientRect();
    const s = Math.max(r.width, r.height);
    const sp = document.createElement('span');
    sp.className = 'ripple';
    sp.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
    b.appendChild(sp);
    setTimeout(() => sp.remove(), 520);
  }, { passive: true });
}

// ---------------------------------------------------------------- modal & laci
let terbuka = 0;
const FOKUS = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function bukaModal({ judul, isi = '', kaki = '', ukuran = '', laci = false, onTutup } = {}) {
  const asal = document.activeElement;
  const id = 'dlg-' + Math.random().toString(36).slice(2, 8);
  const lap = document.createElement('div');
  lap.className = 'lapisan';
  const box = document.createElement('div');
  box.className = `${laci ? 'laci' : 'modal'} ${ukuran}`.trim();
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-labelledby', id);
  box.innerHTML = String(html`<div class="modal-head"><h2 id="${id}">${judul}</h2>
      <button type="button" class="btn btn-icon" data-tutup aria-label="Tutup">${raw(ikon('x'))}</button></div>
    <div class="modal-body">${raw(isi)}</div>${kaki ? html`<div class="modal-foot">${raw(kaki)}</div>` : ''}`);
  document.body.append(lap, box);
  terbuka++;
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => { lap.classList.add('buka'); box.classList.add('buka'); });
  // Fokus awal hanya bila pengguna belum memilih kolom lain (mencegah fokus "direbut" saat mengetik cepat)
  setTimeout(() => { if (box.contains(document.activeElement)) return; (box.querySelector('[autofocus]') || box.querySelector('.modal-body ' + FOKUS) || box.querySelector(FOKUS))?.focus(); }, 60);

  let selesai = false;
  const tutup = () => {
    if (selesai) return;
    selesai = true;
    lap.classList.remove('buka'); box.classList.remove('buka');
    document.removeEventListener('keydown', tombol, true);
    setTimeout(() => {
      lap.remove(); box.remove();
      if (--terbuka <= 0) { terbuka = 0; document.body.style.overflow = ''; }
      asal?.focus?.();
    }, 220);
    onTutup?.();
  };
  const tombol = (e) => {
    if (!box.isConnected) return;
    if (e.key === 'Escape') { e.stopPropagation(); tutup(); }
    if (e.key === 'Tab') {
      const f = [...box.querySelectorAll(FOKUS)].filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      const [a, z] = [f[0], f[f.length - 1]];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  };
  document.addEventListener('keydown', tombol, true);
  lap.addEventListener('click', tutup);
  box.querySelector('[data-tutup]').addEventListener('click', tutup);
  box.querySelectorAll('[data-batal]').forEach((b) => b.addEventListener('click', tutup));
  return { el: box, body: box.querySelector('.modal-body'), foot: box.querySelector('.modal-foot'), tutup };
}

/** Dialog konfirmasi. Opsi alasan: { label, wajib }. Hasil: { ok, alasan } */
export function konfirmasi({ judul, pesan, label = 'Ya, lanjutkan', bahaya = false, alasan = null, ikonNama } = {}) {
  return new Promise((selesai) => {
    let dijawab = false;
    const jawab = (v) => { if (!dijawab) { dijawab = true; selesai(v); } };
    const m = bukaModal({
      judul, ukuran: 'kecil',
      isi: String(html`<div style="display:flex;gap:14px;align-items:flex-start">
          <span class="ubin ${bahaya ? 'merah' : 'biru'}">${raw(ikon(ikonNama || (bahaya ? 'alert' : 'info'), 22))}</span>
          <p style="color:var(--judul)">${pesan}</p></div>
        ${alasan ? html`<div class="field" style="margin-top:18px"><label class="label" for="kf-alasan">${alasan.label || 'Alasan'}${alasan.wajib ? html`<span class="wajib">*</span>` : ''}</label>
          <textarea id="kf-alasan" class="textarea" rows="3" placeholder="${alasan.placeholder || ''}"></textarea><div class="err" hidden></div></div>` : ''}`),
      kaki: String(html`<button type="button" class="btn btn-ghost" data-batal>Batal</button>
        <button type="button" class="btn ${bahaya ? 'btn-danger' : 'btn-primary'}" data-ok>${label}</button>`),
      onTutup: () => jawab({ ok: false }),
    });
    m.el.querySelector('[data-ok]').addEventListener('click', () => {
      const ta = m.el.querySelector('#kf-alasan');
      const nilai = ta ? ta.value.trim() : '';
      if (alasan?.wajib && !nilai) {
        const err = m.el.querySelector('.err');
        err.hidden = false; err.innerHTML = String(html`${raw(ikon('alert', 16))} ${alasan.label || 'Alasan'} wajib diisi.`);
        ta.closest('.field').classList.add('salah'); ta.focus();
        return;
      }
      jawab({ ok: true, alasan: nilai });
      m.tutup();
    });
  });
}

// ---------------------------------------------------------------- gerak: muncul saat digulir & hitung naik
let pengamat;
export function pasangReveal(root = document, { segera = false } = {}) {
  const el = root.querySelectorAll('.rv:not(.on), .hl-sapu:not(.on)');
  if (segera) {
    // Halaman aplikasi (gerak Tingkat 2/3): muncul sekali saat dibuka, bertahap, tanpa menunggu digulir
    requestAnimationFrame(() => [...el].forEach((x, i) => {
      if (x.classList.contains('rv') && !x.style.getPropertyValue('--tunda')) x.style.setProperty('--tunda', Math.min(i, 8) * 40 + 'ms');
      x.classList.add('on');
    }));
    hitungNaik(root);
    return;
  }
  if (!('IntersectionObserver' in window) || gerakDikurangi()) {
    el.forEach((x) => x.classList.add('on'));
    hitungNaik(root);
    return;
  }
  pengamat ||= new IntersectionObserver((daftar) => {
    for (const x of daftar) {
      if (!x.isIntersecting) continue;
      x.target.classList.add('on');
      pengamat.unobserve(x.target);
      hitungNaik(x.target);
    }
  }, { threshold: 0.2, rootMargin: '0px 0px -40px 0px' });
  el.forEach((x) => pengamat.observe(x));
}

export function hitungNaik(root) {
  const el = root.matches?.('[data-hitung]') ? [root] : [...root.querySelectorAll('[data-hitung]')];
  for (const x of el) {
    if (x.dataset.dihitung) continue;
    x.dataset.dihitung = '1';
    const target = Number(x.dataset.hitung) || 0;
    if (gerakDikurangi() || target === 0) { x.textContent = angka(target); continue; }
    const mulai = performance.now();
    const langkah = (t) => {
      const p = Math.min(1, (t - mulai) / 400);
      x.textContent = angka(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(langkah);
    };
    requestAnimationFrame(langkah);
  }
}

// ---------------------------------------------------------------- potongan tampilan
export function judulHalaman({ pill, sorot, sisa = '', sub = '', aksi = '' }) {
  return html`<header class="page-head">
    <div class="page-head-main">
      ${pill ? html`<span class="pill">${pill}</span>` : ''}
      <h1 class="page-title"><span class="hl">${sorot}</span>${sisa ? ' ' + sisa : ''}</h1>
      ${sub ? html`<p class="page-sub">${sub}</p>` : ''}
    </div>
    ${aksi ? html`<div class="page-actions">${raw(aksi)}</div>` : ''}
  </header>`;
}

export function kosong({ ikonNama = 'inbox', judul, teks = '', aksi = '' }) {
  return html`<div class="kosong"><div class="lingkar">${raw(ikon(ikonNama, 32))}</div>
    <h3>${judul}</h3>${teks ? html`<p>${teks}</p>` : ''}${aksi ? raw(aksi) : ''}</div>`;
}

export function kotakGalat(pesan) {
  return html`<div class="galat" role="alert">${raw(ikon('alert', 22))}<span>${pesan}</span><span class="spacer"></span>
    <button type="button" class="btn btn-sm btn-secondary" data-ulang>${raw(ikon('refresh', 16))} Coba lagi</button></div>`;
}

export function skelTabel(baris = 6, kolom = 5) {
  const sel = Array.from({ length: kolom }, (_, i) => html`<td><div class="skel skel-baris" style="width:${[70, 90, 60, 50, 40][i % 5]}%"></div></td>`);
  return html`<div class="table-wrap"><table class="tbl"><tbody>${Array.from({ length: baris }, () => html`<tr>${sel}</tr>`)}</tbody></table></div>`;
}

export function skelKartu(n = 4) {
  return html`<div class="kpi-row" style="--kolom:${n}">${Array.from({ length: n }, () => html`<div class="skel" style="height:148px;border-radius:20px"></div>`)}</div>`;
}

export function pager({ hal, total, per }) {
  const n = Math.max(1, Math.ceil(total / per));
  const dari = total ? (hal - 1) * per + 1 : 0;
  const sampai = Math.min(total, hal * per);
  const nomor = new Set([1, n, hal - 1, hal, hal + 1].filter((x) => x >= 1 && x <= n));
  const urut = [...nomor].sort((a, b) => a - b);
  const tombol = [];
  urut.forEach((x, i) => {
    if (i && x - urut[i - 1] > 1) tombol.push(html`<span class="redup" aria-hidden="true">…</span>`);
    tombol.push(html`<button type="button" data-hal="${x}" ${x === hal ? raw('aria-current="page"') : ''}>${x}</button>`);
  });
  return html`<div class="tbl-foot"><span>Menampilkan ${angka(dari)}–${angka(sampai)} dari ${angka(total)}</span>
    <nav class="pager" aria-label="Halaman">
      <button type="button" data-hal="${hal - 1}" ${hal <= 1 ? raw('disabled') : ''} aria-label="Sebelumnya">${raw(ikon('chevron-left', 16))}</button>
      ${tombol}
      <button type="button" data-hal="${hal + 1}" ${hal >= n ? raw('disabled') : ''} aria-label="Berikutnya">${raw(ikon('chevron-right', 16))}</button>
    </nav></div>`;
}

const HEX = /^#[0-9a-f]{6}$/i;
const amanWarna = (w, cadangan) => (HEX.test(w || '') ? w : cadangan);
export function gayaPokja(p) {
  return `--c:${amanWarna(p?.warna, '#5B6B7F')};--ct:${amanWarna(p?.warna_tint, '#E8ECF1')};--cx:${amanWarna(p?.warna_teks, '#3A4656')}`;
}
export function chipPokja(p, teks) {
  return html`<span class="chip-pokja" style="${gayaPokja(p)}">${teks ?? p?.nama_pendek ?? p?.nama ?? ''}</span>`;
}
export function badgeAktif(aktif) {
  return aktif
    ? html`<span class="badge b-ok">${raw(ikon('check-circle', 15))} Aktif</span>`
    : html`<span class="badge b-lock">${raw(ikon('lock', 15))} Nonaktif</span>`;
}

export function logo(ukuran = 40) {
  return raw(`<img class="logo-img" src="${esc(CONFIG.LOGO)}" width="${ukuran}" height="${ukuran}" alt="Logo SITASI TSKPO"
    onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'logo-mono',textContent:'ST',title:'Letakkan logo resmi di ${esc(CONFIG.LOGO)}'}))">`);
}

export const logoGoogle = raw(`<svg class="g-logo" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`);

/** Ubah tombol ke keadaan memuat (spinner), kembalikan fungsi pemulih. */
export function tombolMuat(btn, label = 'Menyimpan…') {
  if (!btn) return () => {};
  const asli = btn.innerHTML;
  const lebar = btn.offsetWidth;
  btn.disabled = true;
  btn.classList.add('is-loading');
  btn.style.minWidth = lebar + 'px';
  btn.innerHTML = `<span class="spinner" aria-hidden="true"></span>${esc(label)}`;
  return () => { btn.disabled = false; btn.classList.remove('is-loading'); btn.innerHTML = asli; btn.style.minWidth = ''; };
}

/** Pesan galat ramah dalam bahasa Indonesia. */
export function pesanGalat(e) {
  const m = String(e?.message || e || '');
  const kode = e?.code || '';
  if (/Failed to fetch|NetworkError|Load failed|fetch/i.test(m) && !kode) return 'Koneksi terputus. Periksa internet Anda, lalu coba lagi.';
  if (/JWT expired|invalid JWT|refresh_token/i.test(m)) return 'Sesi Anda berakhir. Silakan masuk kembali.';
  if (kode === 'PGRST202' || kode === 'PGRST205' || kode === '42P01' || /Could not find the function|schema cache/i.test(m))
    return 'Struktur basis data belum lengkap. Jalankan file SQL Tahap 1 di Supabase (SQL Editor), lalu muat ulang.';
  if (kode === '42501' && /permission denied/i.test(m)) return 'Anda tidak memiliki akses untuk tindakan ini.';
  return m || 'Terjadi kesalahan. Silakan coba lagi.';
}
