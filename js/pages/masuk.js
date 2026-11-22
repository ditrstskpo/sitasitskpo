// W-01 Login — masuk dengan Google (gerak Tingkat 1)
import { html, raw } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api, modePratinjau } from '../core/api.js';
import { logo, logoGoogle, pasangReveal, toast, pesanGalat, tombolMuat } from '../core/ui.js';

/** Mulai login Google. Di mode pratinjau, arahkan ke pemilih akun contoh. */
export async function mulaiMasuk(tombol) {
  if (modePratinjau) { location.hash = '#/masuk'; return; }
  const pulih = tombolMuat(tombol, 'Membuka Google…');
  try { await api.masukGoogle(); }
  catch (e) { pulih(); toast(pesanGalat(e), 'galat', 'Gagal membuka login Google'); }
}

export async function render(el) {
  el.innerHTML = String(html`<div class="pub">
    <div class="aurora terang" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="pub-top">
      ${logo(44)}<span class="merek"><b>SITASI TSKPO</b><span>Kementerian Sosial Republik Indonesia</span></span>
      <span class="spacer"></span>
      <a class="btn btn-ghost btn-sm" href="#/">${raw(ikon('arrow-left', 18))} Halaman Depan</a>
    </div>
    <div class="pub-kartu sempit garis-atas rv" style="margin:auto 0">
      <div class="pub-tengah">
        <span class="pill">Portal Internal Direktorat</span>
        <h1><span class="hl hl-sapu">Masuk</span> ke SITASI TSKPO</h1>
        <p>Gunakan akun Google yang sudah didaftarkan oleh Super Admin Direktorat RSTSKPO.</p>
        ${modePratinjau ? pilihAkunPratinjau() : html`
          <button type="button" class="btn btn-google btn-lg btn-block" data-masuk style="margin-top:12px">${logoGoogle} Masuk dengan Google</button>`}
        <div class="info-card biru" style="text-align:left;margin-top:8px;width:100%">${raw(ikon('shield', 20))}
          <span>Hanya email yang terdaftar di daftar izin (allowlist) yang dapat masuk. Setiap login tercatat di log aktivitas.</span></div>
      </div>
    </div>
    <p class="pub-kaki">© ${new Date().getFullYear()} Direktorat Rehabilitasi Sosial Tuna Sosial dan Korban Perdagangan Orang, Kementerian Sosial RI</p>
  </div>`);

  el.querySelector('[data-masuk]')?.addEventListener('click', (e) => mulaiMasuk(e.currentTarget));
  if (modePratinjau) {
    const daftar = await api.akunContoh();
    const wadah = el.querySelector('[data-akun]');
    wadah.innerHTML = String(html`${daftar.map((a) => html`<button type="button" class="peran-utama" data-email="${a.email}" style="padding:12px 14px">
        <span class="avatar kecil" style="--c:${a.aktif ? '#17824A' : '#66717E'}">${a.nama[0]}</span>
        <span class="teks"><b style="font-size:.9375rem">${a.nama}</b><small>${a.label}${a.aktif ? '' : ' · nonaktif'}</small></span>${raw(ikon('chevron-right', 18, 'redup'))}</button>`)}
      <button type="button" class="peran-utama" data-email="orang.asing@gmail.com" style="padding:12px 14px">
        <span class="avatar kecil" style="--c:#A12D1F">?</span><span class="teks"><b style="font-size:.9375rem">Email belum terdaftar</b><small>Uji halaman Akses Ditolak</small></span>${raw(ikon('chevron-right', 18, 'redup'))}</button>`);
    wadah.addEventListener('click', (e) => {
      const b = e.target.closest('[data-email]');
      if (b) api.masukGoogle(b.dataset.email);
    });
  }
  pasangReveal(el);
}

function pilihAkunPratinjau() {
  return html`<div class="info-card emas" style="text-align:left;width:100%;margin-top:8px">${raw(ikon('info', 20))}
      <span><b>Mode Pratinjau.</b> Supabase belum disambungkan (js/config.js masih kosong). Pilih akun contoh untuk mencoba tampilan setiap peran. Data hanya tersimpan di browser ini.</span></div>
    <div data-akun style="display:grid;gap:8px;width:100%;max-height:420px;overflow:auto;padding:2px;text-align:left"></div>`;
}
