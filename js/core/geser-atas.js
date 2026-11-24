// v2.8.0 — Bilah geser kiri-kanan juga muncul DI ATAS tabel lebar (tidak hanya di bawah).
const SEL = '.table-wrap, .rekap-tabel';
function pasang(wrap) {
  if (wrap.dataset.geser) return;
  wrap.dataset.geser = '1';
  const atas = document.createElement('div');
  atas.className = 'geser-atas'; atas.hidden = true; atas.setAttribute('aria-hidden', 'true');
  const dalam = document.createElement('div'); atas.appendChild(dalam);
  wrap.parentNode.insertBefore(atas, wrap);
  let kunci = false;
  const sinkron = (a, b) => { if (kunci) return; kunci = true; b.scrollLeft = a.scrollLeft; requestAnimationFrame(() => { kunci = false; }); };
  atas.addEventListener('scroll', () => sinkron(atas, wrap));
  wrap.addEventListener('scroll', () => sinkron(wrap, atas));
  const ukur = () => {
    const lebar = wrap.scrollWidth, tampak = wrap.clientWidth;
    dalam.style.width = lebar + 'px';
    atas.hidden = !(lebar > tampak + 4);
  };
  ukur();
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(ukur); ro.observe(wrap); const tb = wrap.firstElementChild; if (tb) ro.observe(tb);
  } else window.addEventListener('resize', ukur);
}
let jadwal = 0;
export function pasangGeserAtas(akar = document) { akar.querySelectorAll(SEL).forEach(pasang); }
export function mulaiGeserAtas() {
  const jalan = () => { jadwal = 0; pasangGeserAtas(); };
  new MutationObserver(() => { if (!jadwal) jadwal = requestAnimationFrame(jalan); }).observe(document.body, { childList: true, subtree: true });
  jalan();
}
