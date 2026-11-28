// W-01 Login — masuk dengan Google (gerak Tingkat 1)
import { html, raw } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api, modePratinjau } from '../core/api.js';
import { logo, logoGoogle, pasangReveal, toast, pesanGalat, tombolMuat } from '../core/ui.js';
import { CONFIG } from '../config.js';
const PANJANG_KODE = Math.min(10, Math.max(6, Number(CONFIG.PANJANG_KODE_EMAIL) || 6));   // panjang kode (Supabase: Email OTP Length)
// v2.11.0: kode Akun Kemensos dikirim lewat WhatsApp (Send Email Hook). Isi KODE_MASUK_LEWAT: 'email' di config.js untuk kembali ke email.
const LEWAT_WA = String(CONFIG.KODE_MASUK_LEWAT || 'whatsapp').toLowerCase() !== 'email';
const SALURAN = LEWAT_WA ? 'WhatsApp' : 'email';
const TOMBOL_KIRIM = `Kirim kode ke ${SALURAN}`;

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
        <p>Gunakan akun Google atau email Kemensos yang sudah didaftarkan oleh Super Admin Direktorat RSTSKPO.</p>
        ${modePratinjau ? pilihAkunPratinjau() : html`
          <button type="button" class="btn btn-google btn-lg btn-block" data-masuk style="margin-top:12px">${logoGoogle} Masuk dengan Google</button>`}
        <div class="atau" style="display:flex;align-items:center;gap:12px;width:100%;margin:16px 0 8px;color:var(--teks-2,#66717E);font-size:.875rem"><hr style="flex:1;border:0;border-top:1px solid var(--garis,#D8DEE5)">atau<hr style="flex:1;border:0;border-top:1px solid var(--garis,#D8DEE5)"></div>
        <form data-form-email style="width:100%;text-align:left;display:grid;gap:10px" novalidate>
          <label class="label" for="em-email">${raw(ikon('mail', 18))} Masuk dengan Akun Kemensos${LEWAT_WA ? ' (kode lewat WhatsApp)' : ' (tanpa Google)'}</label>
          <input id="em-email" class="input" type="email" inputmode="email" autocomplete="email" placeholder="nama@kemensos.go.id" data-em-email>
          <div data-em-kode-wadah hidden style="display:grid;gap:10px">
            <label class="label" for="em-kode">Kode dari ${SALURAN}</label>
            <input id="em-kode" class="input" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="${'1234567890'.slice(0, PANJANG_KODE)}" data-em-kode style="font-size:1.375rem;letter-spacing:.3em;font-weight:700;text-align:center">
            <div class="em-aksi"><button type="button" class="btn btn-ghost btn-sm" data-em-ulang disabled>${raw(ikon('refresh', 16))} Kirim ulang kode</button>
              <button type="button" class="btn btn-ghost btn-sm" data-em-ganti>${raw(ikon('pencil', 16))} Ganti email</button></div>
          </div>
          <button type="submit" class="btn btn-primary btn-lg btn-block" data-em-kirim>${TOMBOL_KIRIM}</button>
          <small class="redup em-info" data-em-info>${LEWAT_WA ? 'Tulis email Kemensos Anda (@kemensos.go.id / @kemsos.go.id). Kode masuk dikirim ke nomor WhatsApp yang terdaftar untuk email itu.' : 'Kode dikirim ke email Kemensos Anda (@kemensos.go.id / @kemsos.go.id). Hanya email yang sudah didaftarkan Super Admin yang dapat masuk.'}</small>
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
const KUNCI_EMAIL = 'sitasi:email-kemensos';
/** Login kode email: langkah 1 kirim kode, langkah 2 masukkan kode (otomatis masuk begitu kode lengkap). */
function pasangMasukEmail(el) {
  const f = el.querySelector('[data-form-email]'); if (!f) return;
  const em = f.querySelector('[data-em-email]'), kode = f.querySelector('[data-em-kode]'), wadah = f.querySelector('[data-em-kode-wadah]'), btn = f.querySelector('[data-em-kirim]'),
    info = f.querySelector('[data-em-info]'), ulang = f.querySelector('[data-em-ulang]'), ganti = f.querySelector('[data-em-ganti]');
  let tahap = 1, jam = 0, sibuk = false;
  try { const lama = localStorage.getItem(KUNCI_EMAIL); if (lama && !em.value) em.value = lama; } catch {}
  if (/[?&]cara=kemensos/.test(location.hash)) {
    f.classList.add('sorot'); setTimeout(() => { f.scrollIntoView({ block: 'center', behavior: 'smooth' }); em.focus({ preventScroll: true }); }, 120);
  }
  const hitungMundur = (detik = 60) => {
    clearInterval(jam); ulang.disabled = true;
    const tulis = () => { ulang.innerHTML = String(html`${raw(ikon('refresh', 16))} Kirim ulang kode${detik > 0 ? ` (${detik})` : ''}`); };
    tulis();
    jam = setInterval(() => { detik -= 1; tulis(); if (detik <= 0) { clearInterval(jam); ulang.disabled = false; } }, 1000);
  };
  const keTahap1 = () => { tahap = 1; clearInterval(jam); wadah.hidden = true; em.readOnly = false; kode.value = ''; btn.textContent = TOMBOL_KIRIM; info.textContent = `Tulis email Kemensos Anda, lalu tekan ${TOMBOL_KIRIM}.`; em.focus(); };
  async function kirim(email) {
    await api.kirimKodeEmail(email);
    try { localStorage.setItem(KUNCI_EMAIL, email); } catch {}
    tahap = 2; wadah.hidden = false; em.readOnly = true; kode.value = ''; kode.focus(); btn.textContent = 'Masuk';
    info.innerHTML = LEWAT_WA
      ? String(html`Kode sudah dikirim ke <b>WhatsApp</b> yang terdaftar untuk <b>${email}</b>. Biasanya tiba dalam beberapa detik.
      Tulis kodenya di atas — Anda langsung masuk begitu kode lengkap. Belum datang setelah 1 menit? Tekan <b>Kirim ulang kode</b>.`)
      : String(html`Kode sudah dikirim ke <b>${email}</b>. Biasanya tiba dalam kurang dari 1 menit di <b>Kotak Masuk</b> email Kemensos.
      Tulis kodenya di atas — Anda langsung masuk begitu kode lengkap. Belum datang setelah 1 menit? Tekan <b>Kirim ulang kode</b>.`);
    hitungMundur(60);
  }
  async function jalan() {
    if (sibuk) return;
    const email = em.value.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast('Tulis alamat email dengan benar.', 'peringatan');
    if (!domainOk(email)) return toast('Masuk dengan Akun Kemensos hanya untuk email @kemensos.go.id / @kemsos.go.id. Gunakan tombol Google untuk email lain.', 'peringatan');
    sibuk = true;
    const pulih = tombolMuat(btn, tahap === 1 ? 'Mengirim kode…' : 'Memeriksa kode…');
    try {
      if (tahap === 1) { await kirim(email); pulih(); btn.textContent = 'Masuk'; }
      else {
        const k = kode.value.replace(/\D/g, '');
        if (k.length < 6) { pulih(); btn.textContent = 'Masuk'; sibuk = false; return toast(`Tulis kode dari ${SALURAN} (minimal 6 angka).`, 'peringatan'); }
        await api.masukDenganKode(email, k);
      }
    } catch (err) {
      pulih(); btn.textContent = tahap === 1 ? TOMBOL_KIRIM : 'Masuk';
      if (tahap === 2) { kode.select(); }
      else info.innerHTML = String(html`<b style="color:var(--merah,#B42318)">Kode belum terkirim.</b> ${pesanGalat(err)}${err?.asli && err.asli !== pesanGalat(err) ? html`<br><span style="font-size:.75rem">Detail teknis (untuk dilaporkan): ${err.asli}${err.code ? ` · ${err.code}` : ''}</span>` : ''}`);
      toast(pesanGalat(err), 'galat', tahap === 1 ? 'Kode belum terkirim' : 'Kode tidak cocok');
    }
    sibuk = false;
  }
  f.addEventListener('submit', (e) => { e.preventDefault(); jalan(); });
  // kode ditempel/diketik: buang spasi & huruf; begitu jumlah angkanya pas, langsung masuk
  kode.addEventListener('input', () => {
    const v = kode.value.replace(/\D/g, ''); if (v !== kode.value) kode.value = v;
    if (tahap === 2 && v.length === PANJANG_KODE) jalan();
  });
  ulang.addEventListener('click', async () => {
    const email = em.value.trim().toLowerCase(); const pulih = tombolMuat(ulang, 'Mengirim…');
    try { await kirim(email); ulang.classList.remove('is-loading'); ulang.style.minWidth = ''; toast('Kode baru dikirim. Gunakan kode yang terbaru.', 'sukses'); }
    catch (err) { pulih(); toast(pesanGalat(err), 'galat', 'Kode belum terkirim'); }
  });
  ganti.addEventListener('click', keTahap1);
}
