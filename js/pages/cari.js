// Pencarian global. Tahap 1: mencari menu. Pencarian NIK, PM, SK, dokumen aktif mulai Tahap 2 dan 4.
import { html, raw } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { state } from '../core/store.js';
import { judulHalaman, kosong } from '../core/ui.js';
import { grupMenu } from '../core/menu.js';

export async function render(el, { query }) {
  const q = (query.get('q') || '').trim();
  const kata = q.toLowerCase();
  const semua = grupMenu(state.sesi).flatMap((g) => g.item.map((m) => ({ ...m, grup: g.judul })));
  const cocok = semua.filter((m) => (m.label + ' ' + (m.ket || []).join(' ')).toLowerCase().includes(kata));
  const nik = /^\d{6,16}$/.test(q);

  el.innerHTML = String(html`
    ${judulHalaman({ pill: 'Pencarian', sorot: 'Hasil Pencarian', sisa: q ? `“${q}”` : '', sub: 'Pencarian NIK, nama PM, dan nomor SK aktif setelah Master BNBA dibangun (Tahap 2); pencarian dokumen aktif pada Tahap 4.' })}
    ${nik ? html`<div class="info-card biru" style="margin-bottom:24px">${raw(ikon('info', 20))}<span>Anda mencari angka yang tampak seperti NIK. Penelusuran per NIK (Detail PM) tersedia setelah Master BNBA aktif pada Tahap 2.</span></div>` : ''}
    <section class="card">
      <div class="card-head"><span class="ubin">${raw(ikon('grid', 22))}</span><div><h2 class="card-title">Menu yang cocok</h2><p class="card-sub">${cocok.length} menu ditemukan</p></div></div>
      ${cocok.length ? html`<div class="grid grid-2">${cocok.map((m) => html`<a class="card card-click" href="#${m.rute}" style="margin:0;text-decoration:none;display:flex;gap:14px;align-items:center;padding:16px">
          <span class="ubin">${raw(ikon(m.ikon, 20))}</span><span style="flex:1"><b style="display:block;color:var(--judul)">${m.label}</b><small class="redup">${m.grup}${m.tahap ? ` · Tahap ${m.tahap}` : ''}</small></span>${raw(ikon('chevron-right', 18, 'redup'))}</a>`)}</div>`
        : kosong({ ikonNama: 'search', judul: 'Tidak ada menu yang cocok', teks: 'Coba kata lain, misalnya "BNBA", "SK", "Jadwal", atau "Pengguna".' })}
    </section>`);
}
