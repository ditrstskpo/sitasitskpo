// Semua notifikasi in-app milik pengguna
import { html, raw, relatif, tanggalJam } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { state, bus } from '../core/store.js';
import { judulHalaman, kosong, kotakGalat, pager, pesanGalat, skelTabel, toast, tombolMuat } from '../core/ui.js';

const PER = 30;

export async function render(el) {
  let hal = 1;
  el.innerHTML = String(html`
    ${judulHalaman({ pill: 'Pemberitahuan In-App', sorot: 'Notifikasi', sisa: 'Saya', sub: 'Usulan menunggu verifikasi, keputusan, tugas, jadwal, dan pengumuman penting. Tidak ada notifikasi lewat WhatsApp atau email.',
      aksi: String(html`<button type="button" class="btn btn-secondary" data-semua>${raw(ikon('check-circle', 18))} Tandai semua dibaca</button>`) })}
    <section class="card table-card"><div data-isi>${skelTabel(6, 3)}</div></section>`);
  const isi = el.querySelector('[data-isi]');

  async function muat() {
    try {
      const { baris, total } = await api.notifikasi({ hal, per: PER });
      isi.innerHTML = String(baris.length ? html`<div>${baris.map((n) => html`<button type="button" class="notif-item ${n.dibaca_pada ? '' : 'baru'}" data-id="${n.id}" data-tautan="${n.tautan || ''}" style="padding:16px 24px">
          <span class="ubin ${n.jenis === 'pengumuman' ? 'emas' : n.jenis === 'sukses' ? '' : 'biru'}">${raw(ikon(n.jenis === 'pengumuman' ? 'megaphone' : n.jenis === 'sukses' ? 'check-circle' : 'bell', 20))}</span>
          <span style="flex:1"><span class="judul">${n.judul}</span>${n.isi ? html`<span class="isi">${n.isi}</span>` : ''}
          <span class="waktu" title="${tanggalJam(n.dibuat_pada)}">${relatif(n.dibuat_pada)}${n.dibaca_pada ? '' : ' · belum dibaca'}</span></span></button>`)}</div>
        ${total > PER ? pager({ hal, total, per: PER }) : ''}`
        : kosong({ ikonNama: 'bell', judul: 'Belum ada notifikasi', teks: 'Pemberitahuan akan muncul di sini dan pada ikon lonceng.' }));
    } catch (e) { isi.innerHTML = String(kotakGalat(pesanGalat(e))); }
  }

  el.addEventListener('click', async (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.matches('[data-ulang]')) return muat();
    if (t.matches('[data-hal]')) { hal = Number(t.dataset.hal); return muat(); }
    if (t.matches('[data-semua]')) {
      const pulih = tombolMuat(t, 'Menandai…');
      try { const n = await api.tandaiDibaca(null); state.notifBelum = 0; bus.emit('notif-baru'); toast(n ? `${n} notifikasi ditandai dibaca.` : 'Semua notifikasi sudah dibaca.', 'sukses'); await muat(); }
      catch (err) { toast(pesanGalat(err), 'galat'); }
      return pulih();
    }
    if (t.matches('[data-id]')) {
      if (t.classList.contains('baru')) {
        api.tandaiDibaca(t.dataset.id).catch(() => {});
        state.notifBelum = Math.max(0, (state.notifBelum || 0) - 1); bus.emit('notif-baru');
        t.classList.remove('baru');
      }
      if (t.dataset.tautan?.startsWith('#/')) location.hash = t.dataset.tautan;
    }
  });
  await muat();
  return bus.on('notif-baru', (n) => { if (n && hal === 1) muat(); });
}
