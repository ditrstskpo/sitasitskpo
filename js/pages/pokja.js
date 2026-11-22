// Pengaturan > Pokja & Keanggotaan (Super Admin)
import { html, raw, angka } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { ambil, dariCache } from '../core/store.js';
import { judulHalaman, kotakGalat, pesanGalat, pasangReveal, gayaPokja } from '../core/ui.js';

export async function render(el) {
  el.innerHTML = String(html`
    ${judulHalaman({ pill: 'Struktur Organisasi', sorot: 'Pokja', sisa: '& Keanggotaan',
      sub: 'Keanggotaan dikelola dari halaman Pengguna & Hak Akses. Satu pegawai dapat menjadi anggota lebih dari satu Pokja.',
      aksi: String(html`<a class="btn btn-secondary" href="#/pengaturan/pengguna">${raw(ikon('user-cog', 18))} Kelola Pengguna</a>`) })}
    <div data-isi><div class="grid grid-3">${Array.from({ length: 6 }, () => html`<div class="skel" style="height:220px;border-radius:20px"></div>`)}</div></div>`);
  const isi = el.querySelector('[data-isi]');

  const kartu = (k, i) => {
    const ang = (k.pengguna_pokja || []).filter((x) => x.pengguna?.aktif);
    const kap = ang.filter((x) => x.jabatan === 'kapokja');
    const anggota = ang.filter((x) => x.jabatan !== 'kapokja');
    return html`<section class="card rv" style="--tunda:${(i % 3) * 60}ms;margin:0;position:relative;overflow:hidden;${gayaPokja(k)}">
      <span style="position:absolute;left:0;right:0;top:0;height:5px;background:var(--c)"></span>
      <div class="card-head" style="margin-bottom:12px"><span class="ubin" style="background:var(--ct);color:var(--cx)">${raw(ikon('users', 22))}</span>
        <div><h3 class="card-title" style="font-size:1.0625rem">Pokja ${k.nama}</h3><p class="card-sub">${k.kelompok === 'teknis' ? 'Pokja Teknis Pelayanan' : 'Pokja Pendukung Operasional'}</p></div></div>
      <dl class="kv" style="grid-template-columns:1fr auto;gap:10px 16px">
        <div><dt>Kapokja</dt><dd>${kap.length ? kap.map((x) => x.pengguna.nama).join(', ') : html`<span style="color:var(--merah);font-weight:600">Belum ditetapkan</span>`}</dd></div>
        <div style="text-align:right"><dt>Anggota aktif</dt><dd class="tnum" style="font-size:1.5rem;font-weight:800">${angka(ang.length)}</dd></div>
      </dl>
      ${anggota.length ? html`<p class="redup" style="font-size:.875rem;margin-top:10px">${anggota.slice(0, 4).map((x) => x.pengguna.nama).join(', ')}${anggota.length > 4 ? ` dan ${anggota.length - 4} lainnya` : ''}</p>` : ''}
      <a class="tautan-btn" href="#/pengaturan/pengguna?pokja=${k.id}" style="margin-top:6px">Kelola anggota ${raw(ikon('arrow-right', 16))}</a>
    </section>`;
  };
  const gambar = (data) => {
    const teknis = data.filter((k) => k.kelompok === 'teknis');
    const pendukung = data.filter((k) => k.kelompok !== 'teknis');
    isi.innerHTML = String(html`
      <h2 style="font-size:1.125rem;margin:0 0 14px">Pokja Teknis Pelayanan</h2><div class="grid grid-3">${teknis.map(kartu)}</div>
      <h2 style="font-size:1.125rem;margin:28px 0 14px">Pokja Pendukung Operasional</h2><div class="grid grid-3">${pendukung.map(kartu)}</div>`);
    pasangReveal(isi, { segera: true });
  };

  const c = dariCache('pokja:anggota');
  if (c) gambar(c);
  const muat = async () => {
    try { gambar(await ambil('pokja:anggota', () => api.pokjaDenganAnggota(), { ttl: 30_000, paksa: true })); }
    catch (e) { if (!c) isi.innerHTML = String(kotakGalat(pesanGalat(e))); }
  };
  el.addEventListener('click', (e) => { if (e.target.closest('[data-ulang]')) muat(); });
  await muat();
}
