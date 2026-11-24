// Petugas Verif (v2.9.0): Kapokja menunjuk anggota Pokja-nya sebagai Petugas Verif. Selama ia anggota Pokja pengusul dan ditunjuk,
// ia memverifikasi BNBA (tahap 2) dan SK/Nota Dinas (tahap 3b) usulan Pokja tersebut, sama seperti Kapokja.
import { html, raw } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { hapusCache } from '../core/store.js';
import { judulHalaman, kosong, kotakGalat, pesanGalat, toast } from '../core/ui.js';
import { pasangEfek } from '../core/efek.js';

export async function render(el) {
  el.innerHTML = String(html`${judulHalaman({ pill: 'Pokja · Hak Verifikasi', sorot: 'Petugas Verif', sisa: 'Pokja',
    sub: 'Kapokja dapat menunjuk anggota Pokja sebagai Petugas Verif. Selama masih anggota Pokja pengusul dan ditunjuk, ia ikut memverifikasi BNBA dan SK/Nota Dinas usulan Pokja tersebut. Penunjukan bisa dicabut kapan saja.' })}
    <div class="info-card biru rv" style="margin-bottom:16px">${raw(ikon('info', 20, 'ik'))}<span>Petugas Verif hanya berlaku untuk <b>Pokja tempat ia menjadi anggota</b> dan hanya untuk tahap verifikasi BNBA dan SK/Nota Dinas. Hak lain (TU, Keuangan, Direktur) tidak berubah.</span></div>
    <div data-isi class="rv"><div class="skel" style="height:220px;border-radius:20px"></div></div>`);
  pasangEfek(el);
  const isi = el.querySelector('[data-isi]');
  async function muat() {
    try {
      const daftar = await api.daftarVerifikator();
      const per = new Map(); daftar.forEach((x) => (per.get(x.pokja_id) || per.set(x.pokja_id, { nama: x.pokja, baris: [] }).get(x.pokja_id)).baris.push(x));
      if (!per.size) { isi.innerHTML = String(html`<section class="card">${kosong({ ikonNama: 'users', judul: 'Belum ada anggota Pokja', teks: 'Tambahkan anggota Pokja di Pengaturan → Pengguna & Hak Akses.' })}</section>`); return; }
      isi.innerHTML = String([...per].map(([pid, g]) => html`<section class="card" style="margin-bottom:16px">
        <div class="card-head"><span class="ubin">${raw(ikon('users', 20))}</span><div><h2 class="card-title">Pokja ${g.nama}</h2><p class="card-sub">${g.baris.filter((x) => x.verifikator).length} Petugas Verif ditunjuk</p></div></div>
        <div class="verif-daftar">${g.baris.map((x) => html`<div class="verif-baris">
          <span class="verif-nm"><b>${x.nama}</b><small>${x.jabatan === 'kapokja' ? 'Kapokja (otomatis memverifikasi)' : 'Anggota Pokja'} · ${x.email}</small></span>
          ${x.jabatan === 'kapokja' ? html`<span class="badge b-proc">Kapokja</span>`
            : x.boleh_atur ? html`<label class="saklar"><input type="checkbox" data-verif="${pid}|${x.pengguna_id}" ${x.verifikator ? raw('checked') : ''} aria-label="Petugas Verif ${x.nama}"><span>${x.verifikator ? 'Petugas Verif' : 'Bukan'}</span></label>`
            : x.verifikator ? html`<span class="badge b-ok">Petugas Verif</span>` : html`<span class="badge b-draft">Anggota</span>`}</div>`)}</div></section>`).join(''));
    } catch (e) { isi.innerHTML = String(kotakGalat(pesanGalat(e))); isi.querySelector('[data-ulang]')?.addEventListener('click', muat); }
  }
  el.addEventListener('change', async (e) => {
    const c = e.target.closest('[data-verif]'); if (!c) return;
    const [pokja, orang] = c.dataset.verif.split('|'); c.disabled = true;
    try { await api.aturVerifikator(pokja, orang, c.checked); hapusCache('usulan'); toast(c.checked ? 'Petugas Verif ditunjuk. Yang bersangkutan diberi tahu.' : 'Penunjukan dicabut.', 'sukses'); await muat(); }
    catch (err) { c.checked = !c.checked; c.disabled = false; toast(pesanGalat(err), 'galat'); }
  });
  await muat();
}
