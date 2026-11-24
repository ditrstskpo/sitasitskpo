// W-01 Login — masuk dengan Google (gerak Tingkat 1)
import { html, raw } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api, modePratinjau } from '../core/api.js';
import { logo, logoGoogle, pasangReveal, toast, pesanGalat, tombolMuat } from '../core/ui.js';
import { CONFIG } from '../config.js';

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
        <div class="atau" style="display:flex;align-items:center;gap:12px;width:100%;margin:16px 0 8px;color:var(--teks-2,#66717E);font-size:.875rem"><hr style="flex:1;border:0;border-top:1px solid var(--garis,#D8DEE5)">atau<hr style="flex:1;border:0;border-top:1px solid var(--garis,#D8DEE5)"></div>
        <form data-form-email style="width:100%;text-align:left;display:grid;gap:10px" novalidate>
          <label class="label" for="em-email">Masuk dengan email Kemensos (tanpa Google)</label>
          <input id="em-email" class="input" type="email" inputmode="email" autocomplete="email" placeholder="nama@kemensos.go.id" data-em-email>
          <div data-em-kode-wadah hidden style="display:grid;gap:10px">
            <label class="label" for="em-kode">Kode dari email (6–8 angka)</label>
            <input id="em-kode" class="input" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="123456" data-em-kode>
          </div>
          <button type="submit" class="btn btn-primary btn-lg btn-block" data-em-kirim>Kirim kode ke email</button>
          <small class="redup" data-em-info>Kode dikirim ke email Anda. Hanya email yang sudah didaftarkan Super Admin yang dapat masuk.</small>
        </form>
        <div class="info-card biru" style="text-align:left;margin-top:8px;width:100%">${raw(ikon('shield', 20))}
          <span>Hanya email yang terdaftar di daftar izin (allowlist) yang dapat masuk. Setiap login tercatat di log aktivitas.</span></div>
      </div>
    </div>
    <p class="pub-kaki">© ${new Date().getFullYear()} Direktorat Rehabilitasi Sosial Tuna Sosial dan Korban Perdagangan Orang, Kementerian Sosial RI</p>
  </div>`);

  el.querySelector('[data-masuk]')?.addEventListener('click', (e) => mulaiMasuk(e.currentTarget));
  pasangMasukEmail(el);
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

const domainOk = (e) => { const d = String(e).toLowerCase().split('@')[1] || ''; return (CONFIG.DOMAIN_EMAIL || ['kemensos.go.id', 'kemsos.go.id']).includes(d); };
/** Login kode email: langkah 1 kirim kode, langkah 2 masukkan kode. */
function pasangMasukEmail(el) {
  const f = el.querySelector('[data-form-email]'); if (!f) return;
  const em = f.querySelector('[data-em-email]'), kode = f.querySelector('[data-em-kode]'), wadah = f.querySelector('[data-em-kode-wadah]'), btn = f.querySelector('[data-em-kirim]'), info = f.querySelector('[data-em-info]');
  let tahap = 1;
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = em.value.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast('Tulis alamat email dengan benar.', 'peringatan');
    if (!domainOk(email)) return toast('Login kode email hanya untuk email Kemensos (@kemensos.go.id / @kemsos.go.id). Gunakan tombol Google untuk email lain.', 'peringatan');
    const pulih = tombolMuat(btn, tahap === 1 ? 'Mengirim kode…' : 'Memeriksa…');
    try {
      if (tahap === 1) {
        await api.kirimKodeEmail(email);
        tahap = 2; wadah.hidden = false; em.readOnly = true; kode.focus();
        info.textContent = 'Kode sudah dikirim ke ' + email + '. Cek kotak masuk (dan folder spam), lalu tulis kodenya di atas. Anda juga dapat menekan tautan di email itu.';
        pulih(); btn.textContent = 'Masuk';
      } else {
        if (!/^\d{6,8}$/.test(kode.value.trim())) { pulih(); btn.textContent = 'Masuk'; return toast('Kode terdiri dari 6–8 angka.', 'peringatan'); }
        await api.masukDenganKode(email, kode.value.trim());
      }
    } catch (err) { pulih(); btn.textContent = tahap === 1 ? 'Kirim kode ke email' : 'Masuk'; toast(pesanGalat(err), 'galat', 'Login email gagal'); }
  });
}
