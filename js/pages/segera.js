// Halaman modul yang dibangun pada tahap berikutnya: menampilkan rencana isinya.
import { html, raw } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { judulHalaman, pasangReveal } from '../core/ui.js';
import { TAHAP } from '../core/menu.js';
import { halamanAwal } from '../core/peran.js';

export async function render(el, { rute, sesi }) {
  const m = rute.modul;
  el.innerHTML = String(html`
    ${judulHalaman({ pill: `Modul Tahap ${m.tahap}`, sorot: m.judul[0], sisa: m.judul[1], sub: `Halaman ini dibangun pada Tahap ${m.tahap} — ${TAHAP[m.tahap]}. Struktur menu dan hak aksesnya sudah disiapkan pada Tahap 1.` })}
    <section class="card rv">
      <div style="display:grid;grid-template-columns:auto 1fr;gap:24px;align-items:start">
        <div class="kosong" style="padding:8px"><div class="lingkar">${raw(ikon(m.ikon, 36))}</div></div>
        <div>
          <span class="badge b-proc">${raw(ikon('clock', 15))} Sedang disiapkan · Tahap ${m.tahap}</span>
          <h2 style="font-size:1.375rem;margin:12px 0 6px">${m.label}</h2>
          <p class="redup" style="margin-bottom:16px">Isi yang direncanakan untuk halaman ini (sesuai PRD Final v2.0):</p>
          <ul style="margin:0;padding:0;list-style:none;display:grid;gap:10px">${(m.ket || []).map((k) => html`<li style="display:flex;gap:10px;align-items:flex-start;color:var(--judul)">${raw(ikon('check-circle', 20, ''))}<span>${k}</span></li>`)}</ul>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:22px">
            <a class="btn btn-primary" href="#${halamanAwal(sesi)}">${raw(ikon('home', 18))} Kembali ke Beranda</a>
          </div>
        </div>
      </div>
    </section>`);
  el.querySelectorAll('li .ik').forEach((i) => { i.style.color = 'var(--hijau)'; i.style.marginTop = '2px'; });
  pasangReveal(el, { segera: true });
}
