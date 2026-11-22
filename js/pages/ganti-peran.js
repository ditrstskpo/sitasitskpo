// W-01B Laci "Ganti Peran" (Super Admin) + fungsi bersama untuk menerapkan peran.
import { html, raw } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { state, simpanSesi, hapusCache, ambil } from '../core/store.js';
import { bukaModal, toast, pesanGalat, tombolMuat, gayaPokja } from '../core/ui.js';
import { halamanAwal } from '../core/peran.js';
import { pergi } from '../core/nav.js';

export const daftarPokja = () => ambil('pokja:daftar', () => api.daftarPokja(), { ttl: 300_000 });

export async function terapkanPeran(peran, pokjaId, tombol) {
  const pulih = tombolMuat(tombol, 'Menerapkan…');
  try {
    const s = await api.pilihPeran(peran, pokjaId);
    hapusCache();
    simpanSesi(s);
    toast(`Anda sekarang bekerja sebagai ${s.efektif.label}.`, 'sukses', 'Peran diterapkan');
    pergi(halamanAwal(s));
    return true;
  } catch (e) {
    pulih();
    toast(pesanGalat(e), 'galat');
    return false;
  }
}

/** Status pilihan awal dari sesi: { peran, pokja } */
export function pilihanSekarang(s) {
  const sim = s?.pengguna?.simulasi;
  return sim ? { peran: sim.peran, pokja: sim.pokja_id || null } : { peran: 'super_admin', pokja: null };
}

export async function bukaGantiPeran() {
  const s = state.sesi;
  let pilih = pilihanSekarang(s);
  const m = bukaModal({
    judul: 'Ganti Peran Pengguna', laci: true, ukuran: 'lebar',
    isi: String(html`<div class="skel" style="height:120px;border-radius:16px"></div><div class="skel" style="height:300px;border-radius:16px;margin-top:16px"></div>`),
    kaki: String(html`<button type="button" class="btn btn-secondary" data-asli>${raw(ikon('shield', 18))} Kembalikan ke Super Admin Asli</button>
      <button type="button" class="btn btn-primary" data-terapkan>Terapkan Peran Terpilih ${raw(ikon('arrow-right', 18, 'arah'))}</button>`),
  });

  let pokja = [];
  try { pokja = await daftarPokja(); } catch (e) { m.body.innerHTML = String(html`<div class="galat">${pesanGalat(e)}</div>`); return; }

  const tombolPeran = (peran, p, label) =>
    html`<button type="button" class="peran-btn ${peran}" data-peran="${peran}" data-pokja="${p?.id || ''}" aria-pressed="${pilih.peran === peran && (pilih.pokja || '') === (p?.id || '')}">${label}</button>`;
  const kartuInti = (peran, judul, sub) => html`<button type="button" class="peran-utama" data-peran="${peran}" data-pokja="" aria-pressed="${pilih.peran === peran}">
      <span class="ubin">${raw(ikon(peran === 'super_admin' ? 'shield' : peran === 'direktur' ? 'landmark' : 'clipboard-list', 20))}</span>
      <span class="teks"><b>${judul}</b><small>${sub}</small></span>${pilih.peran === peran ? html`<span class="badge b-ok">Dipilih</span>` : ''}</button>`;

  const render = () => {
    const tautan = state.sesi?.simulasi_tautan || [];
    m.body.innerHTML = String(html`
      <span class="pill">Super Admin Mode</span>
      <p style="margin:12px 0 18px">Beralih tampilan dan wewenang untuk menguji alur kerja dari sudut pandang peran lain. Tindakan pengujian tetap tercatat di log audit atas nama Super Admin.</p>
      <div class="info-card" style="display:block;margin-bottom:22px;border:1px solid var(--hijau-garis)">
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><b style="font-size:.8125rem;letter-spacing:.06em;color:var(--hijau-tekan)">PERAN TERPILIH SEKARANG</b><span class="badge b-ok">Sedang Aktif</span></div>
        <b style="display:block;font-size:1.0625rem;margin-top:6px">${state.sesi.efektif.label.replace(' (simulasi Super Admin)', '')}</b>
        ${tautan.length ? html`<small class="redup">Akun tautan: ${tautan.map((t) => t.email).join(', ')}</small>` : ''}
      </div>
      <h3 style="font-size:.875rem;letter-spacing:.06em;color:var(--teks);margin-bottom:10px">A. PERAN INTI SISTEM</h3>
      <div style="display:grid;gap:10px">${kartuInti('super_admin', 'Super Admin', 'Pusat kendali & konfigurasi sistem')}${kartuInti('direktur', 'Direktur RSTSKPO', 'Monitoring eksekutif · dashboard & rekap')}</div>
      <h3 style="font-size:.875rem;letter-spacing:.06em;color:var(--teks);margin:24px 0 10px;display:flex;justify-content:space-between">B. 11 KELOMPOK KERJA (POKJA) <span class="redup" style="letter-spacing:0;font-weight:600">${pokja.length} Pokja</span></h3>
      <div class="peran-grid">${pokja.map((p) => html`<div class="peran-pokja"><div class="nama"><i style="${gayaPokja(p)}"></i>${p.nama}</div>
        <div class="tombol">${tombolPeran('kapokja', p, 'Kapokja (Ketua)')}${tombolPeran('anggota', p, 'Anggota (Staf)')}</div></div>`)}</div>
      <h3 style="font-size:.875rem;letter-spacing:.06em;color:var(--teks);margin:24px 0 10px">C. PERAN LAPANGAN & EKSTERNAL</h3>
      ${kartuInti('petugas_supermonev', 'Petugas Supermonev Lapangan', 'Hanya formulir Supermonev dan riwayat isian sendiri')}`);
  };
  render();

  m.body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-peran]');
    if (!b) return;
    pilih = { peran: b.dataset.peran, pokja: b.dataset.pokja || null };
    const atas = m.body.scrollTop;
    render();
    m.body.scrollTop = atas;
  });
  m.foot.querySelector('[data-terapkan]').addEventListener('click', async (e) => {
    if (await terapkanPeran(pilih.peran, pilih.pokja, e.currentTarget)) m.tutup();
  });
  m.foot.querySelector('[data-asli]').addEventListener('click', async (e) => {
    if (await terapkanPeran('super_admin', null, e.currentTarget)) m.tutup();
  });
}
