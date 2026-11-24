// v2.9.0 — Tulisan tidak boleh terpotong: angka/teks di kotak tetap (kartu angka, lencana nilai) otomatis mengecil sampai muat.
const SEL = '.kpi-num, [data-paskan]';
function paskan(e) {
  if (!e.offsetParent) return;
  e.style.fontSize = '';
  const dasar = parseFloat(getComputedStyle(e).fontSize);
  let u = dasar, n = 0;
  while ((e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 2) && u > 10 && n++ < 24) { u -= 1; e.style.fontSize = u + 'px'; }
}
let jadwal = 0;
const jalan = () => { jadwal = 0; document.querySelectorAll(SEL).forEach(paskan); };
export function mulaiPaskan() {
  const tunda = () => { if (!jadwal) jadwal = requestAnimationFrame(jalan); };
  new MutationObserver(tunda).observe(document.body, { childList: true, subtree: true, characterData: true });
  window.addEventListener('resize', tunda);
  jalan();
}
