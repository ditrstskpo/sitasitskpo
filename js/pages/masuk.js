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
          <button type="button" class="btn btn-ghost btn-sm" data-em-punya style="justify-self:center">${raw(ikon('key', 16))} Sudah menerima kode? Ketik kode di sini</button>
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
// v2.12.0: kode yang sudah dikirim diingat (email + jam kirim) agar setelah halaman tidak sengaja dimuat ulang,
// kolom pengetikan kode langsung muncul lagi — tidak perlu (dan tidak memicu) kirim ulang yang dibatasi waktu.
const KUNCI_TUNDA = 'sitasi:kode-tertunda';
const BERLAKU_MS = 60 * 60 * 1000;   // samakan dengan Supabase → Email OTP Expiration (bawaan 3600 detik)
const JEDA_ULANG = 60;               // detik sebelum boleh kirim ulang (Supabase: 60 detik per pengguna)
const bacaTunda = () => { try { const t = JSON.parse(localStorage.getItem(KUNCI_TUNDA) || 'null'); return t && t.email && Date.now() - t.waktu < BERLAKU_MS ? t : null; } catch { return null; } };
const simpanTunda = (email, waktu = Date.now()) => { try { localStorage.setItem(KUNCI_TUNDA, JSON.stringify({ email, waktu })); } catch {} };
const hapusTunda = () => { try { localStorage.removeItem(KUNCI_TUNDA); } catch {} };
const jamKirim = (ms) => new Date(ms).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
/** Login kode email: langkah 1 kirim kode, langkah 2 masukkan kode (otomatis masuk begitu kode lengkap). */
function pasangMasukEmail(el) {
  const f = el.querySelector('[data-form-email]'); if (!f) return;
  const em = f.querySelector('[data-em-email]'), kode = f.querySelector('[data-em-kode]'), wadah = f.querySelector('[data-em-kode-wadah]'), btn = f.querySelector('[data-em-kirim]'),
    info = f.querySelector('[data-em-info]'), ulang = f.querySelector('[data-em-ulang]'), ganti = f.querySelector('[data-em-ganti]'), punya = f.querySelector('[data-em-punya]');
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
  const keTahap1 = () => { tahap = 1; clearInterval(jam); hapusTunda(); wadah.hidden = true; punya.hidden = false; em.readOnly = false; kode.value = ''; btn.textContent = TOMBOL_KIRIM; info.textContent = `Tulis email Kemensos Anda, lalu tekan ${TOMBOL_KIRIM}.`; em.focus(); };
  /** Tampilkan kolom kode. waktu = jam kode dikirim (ms) bila diketahui; null = pengguna menyatakan sudah punya kode. */
  function keTahap2(email, waktu) {
    tahap = 2; em.value = email; wadah.hidden = false; punya.hidden = true; em.readOnly = true; btn.textContent = 'Masuk';
    const kapan = waktu ? html` pada pukul <b>${jamKirim(waktu)}</b>` : '';
    info.innerHTML = waktu == null
      ? String(html`Tulis kode yang sudah Anda terima di ${SALURAN} untuk <b>${email}</b>. Bila kode lama sudah kedaluwarsa, tekan <b>Kirim ulang kode</b>.`)
      : LEWAT_WA
        ? String(html`Kode sudah dikirim ke <b>WhatsApp</b> yang terdaftar untuk <b>${email}</b>${kapan}. Biasanya tiba dalam beberapa detik.
        Tulis kodenya di atas — Anda langsung masuk begitu kode lengkap. Belum datang setelah 1 menit? Tekan <b>Kirim ulang kode</b>.`)
        : String(html`Kode sudah dikirim ke <b>${email}</b>${kapan}. Biasanya tiba dalam kurang dari 1 menit di <b>Kotak Masuk</b> email Kemensos.
        Tulis kodenya di atas — Anda langsung masuk begitu kode lengkap. Belum datang setelah 1 menit? Tekan <b>Kirim ulang kode</b>.`);
    // hitung mundur kirim ulang melanjutkan sisa waktu sejak kode terakhir dikirim (tidak mulai dari awal setelah muat ulang)
    hitungMundur(waktu ? Math.max(0, JEDA_ULANG - Math.floor((Date.now() - waktu) / 1000)) : 0);
    if (waktu ? Date.now() - waktu >= JEDA_ULANG * 1000 : true) { clearInterval(jam); ulang.disabled = false; ulang.innerHTML = String(html`${raw(ikon('refresh', 16))} Kirim ulang kode`); }
    kode.value = ''; setTimeout(() => kode.focus({ preventScroll: true }), 60);
  }
  async function kirim(email) {
    await api.kirimKodeEmail(email);
    try { localStorage.setItem(KUNCI_EMAIL, email); } catch {}
    simpanTunda(email);
    keTahap2(email, Date.now());
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
        hapusTunda();
      }
    } catch (err) {
      pulih(); btn.textContent = tahap === 1 ? TOMBOL_KIRIM : 'Masuk';
      // Supabase menolak karena kode untuk email ini baru saja dikirim (< 60 detik) → kode itu masih berlaku:
      // langsung buka kolom kode, jangan suruh kirim lagi.
      const baru = tahap === 1 && /after (\d+) seconds?|setelah (\d+) detik/i.exec(`${err?.asli || ''} ${err?.message || ''}`);
      if (baru) {
        const sisa = Number(baru[1] || baru[2]) || 0, waktu = Date.now() - Math.max(0, JEDA_ULANG - sisa) * 1000;
        simpanTunda(email, waktu); keTahap2(email, waktu); sibuk = false;
        return toast(`Kode untuk email ini sudah dikirim kurang dari 1 menit lalu. Ketik kode tersebut di kolom kode.`, 'info', 'Kode sudah dikirim');
      }
      if (tahap === 2) { kode.select(); }
      else info.innerHTML = String(html`<b style="color:var(--merah,#B42318)">Kode belum terkirim.</b> ${pesanGalat(err)}${err?.asli && err.asli !== pesanGalat(err) ? html`<br><span style="font-size:.75rem">Detail teknis (untuk dilaporkan): ${err.asli}${err.code ? ` · ${err.code}` : ''}</span>` : ''}
        <br><b>Sudah menerima kode sebelumnya?</b> Tekan <b>Sudah menerima kode? Ketik kode di sini</b> di atas.`);
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
  punya.addEventListener('click', () => {
    const email = em.value.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !domainOk(email)) { em.focus(); return toast('Tulis email Kemensos Anda terlebih dahulu (@kemensos.go.id / @kemsos.go.id).', 'peringatan'); }
    const t = bacaTunda();
    keTahap2(email, t && t.email === email ? t.waktu : null);
  });
  // halaman dimuat ulang setelah kode terkirim → langsung tampilkan kolom kode (tanpa mengirim kode baru)
  const t = bacaTunda();
  if (t && domainOk(t.email)) {
    keTahap2(t.email, t.waktu); f.classList.add('sorot');
    setTimeout(() => { f.scrollIntoView({ block: 'center', behavior: 'smooth' }); kode.focus({ preventScroll: true }); }, 150);
  }
  else hapusTunda();
}
