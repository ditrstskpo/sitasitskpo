// W-02 Akses Ditolak — email belum terdaftar atau akun nonaktif (gerak Tingkat 1)
import { html, raw } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { logo, pasangReveal, toast, bukaModal } from '../core/ui.js';

export async function render(el) {
  let info = {};
  try { info = JSON.parse(sessionStorage.getItem('sitasi:ditolak') || '{}'); } catch {}
  const nonaktif = info.status === 'nonaktif';
  const idLaporan = 'AKS-' + new Date(info.waktu || Date.now()).toISOString().replace(/\D/g, '').slice(2, 14) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();

  el.innerHTML = String(html`<div class="pub">
    <div class="aurora terang" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="pub-top">
      ${logo(44)}<span class="merek"><b>SITASI TSKPO</b><span>Kementerian Sosial Republik Indonesia</span></span>
      <span class="spacer"></span>
      <span class="status-chip"><span class="titik" style="background:var(--emas);box-shadow:0 0 0 3px var(--emas-tint)"></span>Sistem Perlindungan Terpadu</span>
    </div>
    <div class="pub-kartu rv" style="width:min(820px,100%)">
      <div class="pub-tengah">
        <div class="kunci-lingkar">${raw(ikon('lock', 44))}</div>
        <span class="pill tanpa-titik">${raw(ikon('lock', 14))} Keamanan Sistem Internal</span>
        <h1><span class="hl hl-sapu">Akses Ditolak</span></h1>
        <p>${nonaktif ? 'Akun Anda sudah dinonaktifkan oleh Super Admin Direktorat RSTSKPO.' : 'Email Google Anda belum terdaftar dalam daftar izin akses resmi (allowlist) Direktorat RSTSKPO.'}</p>
        <div class="kotak-email" style="margin-top:10px">
          <div class="baris"><span>Akun Google yang digunakan</span><code>${info.email || '—'}</code>
            <span class="badge ${nonaktif ? 'b-lock' : 'b-no'}">${nonaktif ? 'Nonaktif' : 'Belum Terdaftar'}</span></div>
          <p style="font-size:.9375rem;color:var(--teks)">${nonaktif
            ? 'Login Google Anda berhasil, tetapi akun ini sedang tidak aktif sehingga seluruh data tertutup.'
            : 'Alamat email Anda berhasil diautentikasi oleh Google, namun tidak ditemukan di daftar izin akses SITASI TSKPO.'}</p>
        </div>
        <div style="width:100%;text-align:left;margin-top:14px">
          <p style="display:flex;gap:8px;align-items:center;font-size:.875rem;font-weight:700;letter-spacing:.06em;color:var(--judul);margin-bottom:14px">
            <span style="width:8px;height:8px;border-radius:50%;background:var(--hijau)"></span>LANGKAH PENYELESAIAN / BANTUAN</p>
          <ol class="langkah" style="list-style:none;margin:0;padding:0">
            <li><span class="n">1</span><span>Pastikan Anda masuk menggunakan <b>akun Google dinas</b> atau email resmi yang telah ditugaskan.</span></li>
            <li><span class="n">2</span><span>Jika Anda anggota Pokja atau Petugas Supermonev baru, hubungi <b>Super Admin</b> untuk mendaftarkan email ke daftar izin.</span></li>
            <li><span class="n">3</span><span>Sertakan Surat Tugas atau Surat Keputusan penugasan dari Ketua Pokja atau TU Direktorat RSTSKPO saat mengajukan pembukaan akses.</span></li>
          </ol>
        </div>
        <div style="width:100%;border-top:1px solid var(--garis);margin-top:22px;padding-top:22px;display:grid;gap:10px">
          <a class="btn btn-primary btn-lg btn-block" href="#/masuk">${raw(ikon('arrow-left', 20))} Kembali ke Halaman Masuk</a>
          <div style="display:flex;gap:6px 18px;justify-content:center;flex-wrap:wrap">
            <button type="button" class="tautan-btn" data-helpdesk>${raw(ikon('phone', 18))} Hubungi Helpdesk TU RSTSKPO</button>
            <button type="button" class="tautan-btn" data-salin="${idLaporan}">${raw(ikon('copy', 18))} Salin ID Laporan Akses</button>
          </div>
        </div>
        <p style="display:flex;gap:10px;align-items:flex-start;text-align:left;font-size:.875rem;color:var(--redup);border-top:1px solid var(--garis);padding-top:18px;margin-top:6px">
          ${raw(ikon('shield', 20))}<span>Portal ini dilindungi sistem keamanan berjenjang Direktorat Rehabilitasi Sosial Tuna Sosial dan Korban Perdagangan Orang. Seluruh upaya akses tercatat demi keamanan data penerima manfaat.</span></p>
      </div>
    </div>
    <p class="pub-kaki">© ${new Date().getFullYear()} Direktorat Rehabilitasi Sosial Tuna Sosial dan Korban Perdagangan Orang, Kementerian Sosial RI</p>
  </div>`);

  el.querySelector('[data-salin]').addEventListener('click', async (e) => {
    const teks = `${e.currentTarget.dataset.salin} · ${info.email || '-'} · ${nonaktif ? 'nonaktif' : 'belum terdaftar'}`;
    try { await navigator.clipboard.writeText(teks); toast('ID laporan akses disalin: ' + e.currentTarget.dataset.salin, 'sukses'); }
    catch { toast('ID laporan: ' + teks, 'info'); }
  });
  el.querySelector('[data-helpdesk]').addEventListener('click', () => bukaModal({
    judul: 'Helpdesk TU RSTSKPO',
    isi: String(html`<p>Sampaikan kendala akses kepada <b>Pokja Tata Usaha</b> atau <b>Super Admin</b> Direktorat RSTSKPO melalui saluran resmi kantor. Sertakan:</p>
      <ul style="margin:12px 0 0;padding-left:20px;display:grid;gap:6px"><li>Email Google yang digunakan: <b>${info.email || '—'}</b></li><li>ID laporan akses: <b>${idLaporan}</b></li><li>Surat tugas atau keputusan penugasan</li></ul>`),
    kaki: '<button type="button" class="btn btn-primary" data-batal>Mengerti</button>',
  }));
  pasangReveal(el);
}
