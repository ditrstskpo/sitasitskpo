// W-01C Pilih Peran (Super Admin, setelah login)
import { html, raw } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { logo, pasangReveal, pesanGalat, kotakGalat, gayaPokja } from '../core/ui.js';
import { keluarAplikasi } from '../core/nav.js';
import { daftarPokja, terapkanPeran, pilihanSekarang } from './ganti-peran.js';

export async function render(el, { sesi }) {
  let pilih = pilihanSekarang(sesi);
  el.innerHTML = String(html`<div class="pub">
    <div class="aurora terang" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="pub-kartu garis-atas rv" style="width:min(780px,100%)">
      <div class="pub-tengah">
        ${logo(56)}
        <span class="pill">Simulasi Peran Pengguna</span>
        <h1><span class="hl hl-sapu">Pilih Peran</span> untuk Pengujian Sistem</h1>
        <p>Akun Super Admin (<b style="color:var(--judul)">${sesi.pengguna.email}</b>) memiliki hak akses fleksibel untuk menguji alur kerja dari perspektif setiap peran Pokja.</p>
        <span class="status-chip"><span class="titik"></span>Super Admin ${sesi.pengguna.super_admin_slot || ''}: <code class="mono" style="color:var(--judul);font-weight:700">${sesi.pengguna.email}</code></span>
      </div>
      <div data-isi><div class="skel" style="height:72px;border-radius:16px;margin-top:28px"></div><div class="skel" style="height:280px;border-radius:16px;margin-top:16px"></div></div>
      <div class="info-card biru" style="margin-top:24px">${raw(ikon('info', 20))}<span>Setiap perpindahan peran dan tindakan yang dilakukan dalam sesi pengujian tercatat pada log aktivitas resmi Direktorat RSTSKPO.</span></div>
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:24px;padding-top:20px;border-top:1px solid var(--garis)">
        <button type="button" class="btn btn-secondary" data-keluar>Batal / Keluar</button>
        <button type="button" class="btn btn-primary" data-lanjut>Lanjutkan ke Workspace ${raw(ikon('arrow-right', 18, 'arah'))}</button>
      </div>
    </div>
    <p class="pub-kaki">© ${new Date().getFullYear()} Direktorat Rehabilitasi Sosial Tuna Sosial dan Korban Perdagangan Orang, Kementerian Sosial RI</p>
  </div>`);
  pasangReveal(el);

  const isi = el.querySelector('[data-isi]');
  let pokja = [];
  const muat = async () => {
    try { pokja = await daftarPokja(); gambar(); }
    catch (e) { isi.innerHTML = String(html`<div style="margin-top:24px">${kotakGalat(pesanGalat(e))}</div>`); }
  };

  const btn = (peran, p, label) => html`<button type="button" class="peran-btn ${peran}" data-peran="${peran}" data-pokja="${p.id}"
      aria-pressed="${pilih.peran === peran && pilih.pokja === p.id}">${label}</button>`;
  const kartuPokja = (p, lebar = false) => html`<div class="peran-pokja ${lebar ? 'lebar' : ''}">
      <div class="nama"><i style="${gayaPokja(p)}"></i>Pokja ${p.nama}</div>
      <div class="tombol" style="${lebar ? 'min-width:min(100%,320px)' : ''}">${btn('kapokja', p, 'Masuk sbg Kapokja')}${btn('anggota', p, p.kelompok === 'teknis' ? 'Masuk sbg Anggota' : p.kode === 'DATA' ? 'Masuk sbg Staf/Anggota' : 'Masuk sbg Staf')}</div></div>`;
  const utama = (peran, ik, judul, sub, lencana, kelasLencana) => html`<button type="button" class="peran-utama" data-peran="${peran}" data-pokja="" aria-pressed="${pilih.peran === peran}">
      <span class="ubin ${peran === 'petugas_supermonev' ? 'biru' : ''}">${raw(ikon(ik, 22))}</span><span class="teks"><b>${judul}</b><small>${sub}</small></span>
      <span class="badge ${kelasLencana}">${lencana}</span></button>`;

  function gambar() {
    const teknis = pokja.filter((p) => p.kelompok === 'teknis');
    const pendukung = pokja.filter((p) => p.kelompok !== 'teknis');
    isi.innerHTML = String(html`
      <div class="peran-bagian"><h3>Hak Akses Utama</h3>
        ${utama('super_admin', 'shield', 'Super Admin', 'Akses penuh seluruh modul, konfigurasi sistem & log audit', 'Level Tertinggi', 'b-ok')}
        ${utama('direktur', 'landmark', 'Direktur RSTSKPO', 'Monitoring eksekutif: dashboard, rekap, dan dokumen', 'Lihat Saja', 'b-proc')}
      </div>
      <div class="peran-bagian"><h3>Pokja Teknis Pelayanan (Pilih Pokja & Jabatan)</h3>
        <div class="peran-grid">${teknis.map((p) => kartuPokja(p))}</div></div>
      <div class="peran-bagian"><h3>Pokja Pendukung Operasional</h3>
        <div class="peran-grid">${pendukung.map((p, i) => kartuPokja(p, i === pendukung.length - 1 && pendukung.length % 2 === 1))}</div></div>
      <div class="peran-bagian"><h3>Peran Lapangan & Eksternal</h3>
        ${utama('petugas_supermonev', 'clipboard-list', 'Petugas Supermonev Lapangan', 'Akses khusus pengisian & riwayat formulir evaluasi lapangan', 'Akses Formulir', 'b-proc')}</div>`);
  }

  isi.addEventListener('click', (e) => {
    const b = e.target.closest('[data-peran]');
    if (b) { pilih = { peran: b.dataset.peran, pokja: b.dataset.pokja || null }; gambar(); }
    if (e.target.closest('[data-ulang]')) muat();
  });
  el.querySelector('[data-lanjut]').addEventListener('click', (e) => terapkanPeran(pilih.peran, pilih.pokja, e.currentTarget));
  el.querySelector('[data-keluar]').addEventListener('click', () => keluarAplikasi());
  muat();
}
