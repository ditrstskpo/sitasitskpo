// Pencarian global: nama & NIK PM, usulan/SK, NAMA BERKAS yang dikirim, dokumen, produk hukum, dan menu.
// Kata dipotong per spasi dan dicocokkan sebagian ("per" menemukan "Perpres", "Peraturan", dst.).
import { html, raw, angka } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { judulHalaman, kosong, pesanGalat } from '../core/ui.js';
import { GRUP, cariMenu } from '../core/cari-saran.js';

export async function render(el, { query }) {
  const q = (query.get('q') || '').trim();
  el.innerHTML = String(html`
    ${judulHalaman({ pill: 'Pencarian', sorot: 'Hasil Pencarian', sisa: q ? `“${q}”` : '',
      sub: 'Mencari di nama & NIK penerima manfaat, usulan dan nomor SK, nama berkas yang dikirim, dokumen, produk hukum, dan menu. Cukup ketik sebagian kata; makin lengkap kata yang diketik, makin sempit hasilnya.' })}
    <div data-isi><div class="skel" style="height:220px;border-radius:20px"></div></div>`);
  const isi = el.querySelector('[data-isi]');
  if (q.length < 2) { isi.innerHTML = String(kosong({ ikonNama: 'search', judul: 'Ketik minimal 2 huruf', teks: 'Gunakan kotak cari di bagian atas halaman.' })); return; }

  let h = null, galat = '';
  try { h = await api.cariGlobal(q, 20); } catch (e) { galat = pesanGalat(e); }
  const menu = cariMenu(q, 12);
  const bagian = GRUP.map((g) => ({ g, baris: h?.[g.k] || [] })).filter((x) => x.baris.length);
  const total = bagian.reduce((n, x) => n + x.baris.length, 0) + menu.length;

  isi.innerHTML = String(html`
    ${galat ? html`<div class="info-card merah" style="margin-bottom:16px">${raw(ikon('alert', 20))}<span>Data belum bisa dicari: ${galat}. Menu tetap ditampilkan di bawah.</span></div>` : ''}
    ${!total && !galat ? kosong({ ikonNama: 'search', judul: 'Tidak ada yang cocok', teks: 'Coba sebagian katanya saja, misalnya "per" untuk "Perpres", atau sebagian nama PM.' }) : ''}
    ${bagian.map(({ g, baris }) => html`<section class="card" style="margin-bottom:16px">
      <div class="card-head"><span class="ubin">${raw(ikon(g.ik, 22))}</span><div><h2 class="card-title">${g.judul}</h2><p class="card-sub">${angka(baris.length)} hasil${baris.length >= 20 ? ' (ditampilkan 20 teratas; perpanjang kata untuk menyempitkan)' : ''}</p></div></div>
      <div class="grid grid-2">${baris.map((x) => html`<a class="card card-click" href="${g.tujuan(x)}" style="margin:0;text-decoration:none;display:flex;gap:14px;align-items:center;padding:16px">
        <span style="flex:1;min-width:0"><b style="display:block;color:var(--judul)">${g.utama(x)}</b><small class="redup">${g.ket(x)}</small></span>${raw(ikon('chevron-right', 18, 'redup'))}</a>`)}</div></section>`)}
    ${menu.length ? html`<section class="card">
      <div class="card-head"><span class="ubin">${raw(ikon('grid', 22))}</span><div><h2 class="card-title">Menu</h2><p class="card-sub">${menu.length} menu cocok</p></div></div>
      <div class="grid grid-2">${menu.map((m) => html`<a class="card card-click" href="#${m.rute}" style="margin:0;text-decoration:none;display:flex;gap:14px;align-items:center;padding:16px">
        <span class="ubin">${raw(ikon(m.ikon, 20))}</span><span style="flex:1"><b style="display:block;color:var(--judul)">${m.label}</b><small class="redup">${m.grup}</small></span>${raw(ikon('chevron-right', 18, 'redup'))}</a>`)}</div></section>` : ''}`);
}
