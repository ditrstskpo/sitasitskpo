// Efek gerak (PRD 7.4 & 7.7): kartu 3D yang miring mengikuti kursor, cahaya berpendar mengikuti kursor di pita gelap,
// teks/kartu muncul saat digulir, dan tooltip grafik. Semua efek mati bila perangkat memilih "kurangi gerakan",
// tidak aktif pada layar sentuh (kecuali muncul-saat-digulir), dan berhenti saat tab tidak terlihat.
import { gerakDikurangi, pasangReveal, hitungNaik } from './ui.js';

const sentuh = () => matchMedia('(hover: none), (pointer: coarse)').matches;

// ---------------------------------------------------------------- tooltip tunggal untuk semua grafik
let tip, tipAktif = null;
function pastikanTip() {
  if (tip) return tip;
  tip = document.createElement('div');
  tip.className = 'g-tooltip';
  tip.setAttribute('role', 'tooltip');
  document.body.appendChild(tip);
  const tampil = (el, x, y) => {
    tipAktif = el;
    tip.textContent = el.dataset.tip;
    tip.classList.add('tampil');
    const r = tip.getBoundingClientRect();
    const kiri = Math.min(window.innerWidth - r.width - 8, Math.max(8, x - r.width / 2));
    const atas = y - r.height - 14 < 8 ? y + 18 : y - r.height - 14;
    tip.style.transform = `translate(${Math.round(kiri)}px, ${Math.round(atas)}px)`;
  };
  const sembunyi = () => { tipAktif = null; tip.classList.remove('tampil'); };
  document.addEventListener('pointerover', (e) => { const el = e.target.closest?.('[data-tip]'); if (el) tampil(el, e.clientX, e.clientY); });
  document.addEventListener('pointermove', (e) => { if (tipAktif && tipAktif.contains(e.target)) tampil(tipAktif, e.clientX, e.clientY); }, { passive: true });
  document.addEventListener('pointerout', (e) => { if (tipAktif && !tipAktif.contains(e.relatedTarget)) sembunyi(); });
  document.addEventListener('focusin', (e) => { const el = e.target.closest?.('[data-tip]'); if (el) { const r = el.getBoundingClientRect(); tampil(el, r.left + r.width / 2, r.top); } });
  document.addEventListener('focusout', sembunyi);
  window.addEventListener('scroll', sembunyi, { passive: true, capture: true });
  return tip;
}

// ---------------------------------------------------------------- kartu 3D miring
function pasangTilt(root) {
  if (gerakDikurangi() || sentuh()) return;
  root.querySelectorAll('[data-tilt]:not([data-tilt-on]), [data-tilt-peta]:not([data-tilt-on])').forEach((el) => {
    el.dataset.tiltOn = '1';
    const maks = el.hasAttribute('data-tilt-peta') ? 7 : Number(el.dataset.tilt) || 8;
    let raf = 0;
    el.addEventListener('pointermove', (e) => {
      if (document.hidden) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.setProperty('--ry', ((px - 0.5) * maks * 2).toFixed(2) + 'deg');
        el.style.setProperty('--rx', ((0.5 - py) * maks * 2).toFixed(2) + 'deg');
        el.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
        el.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
        el.classList.add('miring');
      });
    });
    el.addEventListener('pointerleave', () => {
      cancelAnimationFrame(raf);
      el.classList.remove('miring');
      el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg');
    });
  });
}

// ---------------------------------------------------------------- cahaya mengikuti kursor di pita gelap
function pasangSorot(root) {
  if (gerakDikurangi() || sentuh()) return;
  root.querySelectorAll('.band:not([data-sorot-on])').forEach((el) => {
    el.dataset.sorotOn = '1';
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  });
}

/**
 * Pasang semua efek pada halaman (Tingkat 2: dashboard/peta). Elemen .rv muncul saat digulir masuk layar;
 * elemen yang sudah terlihat saat halaman dibuka langsung muncul bertahap.
 */
// Cadangan untuk gulir cepat: elemen .rv yang sudah terlewati / masuk layar tetap dimunculkan
let jagaGulir = false;
function pasangJagaGulir() {
  if (jagaGulir) return;
  jagaGulir = true;
  let raf = 0, sisa = null;
  window.addEventListener('scroll', () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      // v2.12.0: hanya membaca posisi elemen yang belum muncul; bila semuanya sudah muncul, tidak ada kerja sama sekali
      if (sisa === null || sisa.some((x) => !x.isConnected)) sisa = [...document.querySelectorAll('.rv:not(.on)')];
      if (!sisa.length) return;
      const batas = window.innerHeight * 0.92;
      sisa = sisa.filter((x) => {
        if (x.classList.contains('on')) return false;
        if (x.getBoundingClientRect().top < batas) { x.classList.add('on'); hitungNaik(x); return false; }
        return true;
      });
    });
  }, { passive: true });
  new MutationObserver(() => { sisa = null; }).observe(document.body, { childList: true, subtree: true });
}

// v2.12.0: animasi tanpa henti (aurora, kartu melayang, kepanjangan, dll.) dijeda saat bagiannya tidak terlihat di layar,
// sehingga peramban hanya menggambar yang tampak — gulir tetap halus.
let pengamatJeda;
const PILIH_JEDA = '.aurora, .tumpuk, .lp-kp, .lp-foto, .lp-kolase, .latar-hidup, .orb3d, .fajar-sinar, .panggung-lampu';
export function pasangJeda(root) {
  if (!('IntersectionObserver' in window)) return;
  pengamatJeda ||= new IntersectionObserver((daftar) => daftar.forEach((e) => e.target.classList.toggle('jeda', !e.isIntersecting)), { rootMargin: '120px 0px' });
  root.querySelectorAll(PILIH_JEDA).forEach((el) => { if (!el.dataset.jedaOn) { el.dataset.jedaOn = '1'; pengamatJeda.observe(el); } });
}

export function pasangEfek(root) {
  pastikanTip();
  pasangJagaGulir();
  pasangReveal(root);
  // yang sudah di layar saat dibuka: munculkan segera agar halaman tidak tampak kosong
  requestAnimationFrame(() => {
    const tinggi = window.innerHeight;
    root.querySelectorAll('.rv:not(.on)').forEach((x, i) => {
      const r = x.getBoundingClientRect();
      if (r.top < tinggi * 0.92) { x.style.setProperty('--tunda', Math.min(i, 8) * 50 + 'ms'); x.classList.add('on'); hitungNaik(x); }
    });
  });
  pasangTilt(root);
  pasangSorot(root);
  pasangJeda(root);
  hitungTerlihat(root);
}

/** Angka KPI di luar elemen .rv (atau di .rv yang sudah tampil) langsung dihitung naik. */
function hitungTerlihat(root) {
  root.querySelectorAll('[data-hitung]:not([data-dihitung])').forEach((x) => {
    const r = x.closest('.rv');
    if (!r || r.classList.contains('on')) hitungNaik(x);
  });
}

/** Untuk isi yang digambar ulang (mis. setelah filter berubah). */
export function segarkanEfek(root) {
  pastikanTip();
  pasangReveal(root);            // elemen .rv baru tetap muncul saat digulir (yang sudah di layar langsung muncul)
  pasangTilt(root);
  hitungTerlihat(root);
}

export { pastikanTip };
