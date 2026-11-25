// W-00 Halaman Depan (publik, tanpa data asli) — gerak Tingkat 1
import { html, raw } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { CONFIG } from '../config.js';
import { logo, logoGoogle, pasangReveal, bukaModal, gayaPokja } from '../core/ui.js';
import { TAHAP_PENCAIRAN } from '../core/tahap.js';
import { mulaiMasuk } from './masuk.js';

const POKJA = [
  ['KPO dan PMBS', '#17824A'], ['Gepenglung', '#E7B416'], ['BWBP dan Eks Napiter', '#2A4B8D'], ['KTK dan WTS', '#D9644A'],
  ['Hukum', '#7B5EC2'], ['Tata Usaha (TU)', '#12A5A0'], ['Keuangan', '#E58A2E'], ['Perencanaan', '#4FA8E0'],
  ['Kepegawaian', '#C2477F'], ['Supermonev', '#8C6A3E'], ['Data', '#5B6B7F'],
];

const KLASTER = [
  { judul: 'Tuna Sosial Jalanan', besar: true, poin: [['Gelandangan', 'Tanpa tempat tinggal tetap'], ['Pengemis', 'Mencari nafkah di ruang publik'], ['Pemulung', 'Pengumpul barang bekas']] },
  { judul: 'Perdagangan Orang', poin: [['KPO', 'Korban Perdagangan Orang'], ['PMIB', 'Pekerja Migran Indonesia Bermasalah']] },
  { judul: 'Bekas Warga Binaan', poin: [['BWBLP Umum', 'Bekas Warga Binaan Lembaga Pemasyarakatan'], ['BWBLP Eks Napiter', 'Reintegrasi sosial eks narapidana terorisme']] },
  { judul: 'Pemulihan & Pemberdayaan', poin: [['KTK', 'Korban Tindak Kekerasan'], ['Eks WTS', 'Rehabilitasi dan pemberdayaan']] },
  { judul: 'Satu Data Terpadu', poin: [['NIK sebagai kunci tunggal', ''], ['Asesmen hingga Supermonev', ''], ['Terpantau 11 tahap', '']] },
];

const FITUR = [
  ['fingerprint', 'NIK Kunci Tunggal', 'Satu NIK hanya tercatat sekali dan menghubungkan BNBA, usulan, pencairan, dokumentasi, hingga Supermonev.'],
  ['badge-check', 'Verifikasi Kapokja', 'Usulan diverifikasi sekali oleh Kapokja, lalu otomatis masuk Pengusulan SK tanpa paraf tambahan.'],
  ['rekap', 'Rekap Pencairan Otomatis', 'Rekap Data Pencairan terisi dari BNBA sesuai format DATA ATENSI, dapat dikoreksi Pokja Keuangan.'],
  ['chart', 'Supermonev 3 Bulan', 'Monitoring berkala setelah pencairan dengan penilaian keberhasilan usaha yang terukur.'],
];

const MODUL = [
  ['database', 'Central Database & Master BNBA', 'Pencatatan 40 kolom standar data penerima manfaat sesuai format BNBA, lengkap dengan verifikasi Kapokja dan riwayat perubahan.', 'Satu kunci per NIK · Validasi otomatis'],
  ['file-check', 'Pengusulan SK & Administrasi Pencairan', 'Alur draft SK, verifikasi TU, tanda tangan Direktur, Sekretariat, hingga Burekol, SP2D, dan SI dalam satu tampilan.', 'Status tahap realtime · Penyalur tercatat'],
  ['clipboard-list', 'Supermonev Pascapenyaluran', 'Monitoring setiap 3 bulan setelah pencairan dengan penilaian keberhasilan usaha dan ringkasan kendala.', 'Jadwal otomatis · Penilaian terukur'],
  ['lks', 'Data LKS, Aster & Manajemen Internal', 'Pemetaan LKS TSKPO di 38 provinsi, data Aster, kepegawaian, jadwal pegawai, dokumen, dan komunikasi antar-Pokja.', 'Peta 38 provinsi · Jadwal pegawai'],
];

// ---------------------------------------------------------------- kepanjangan SITASI TSKPO (v2.10.0)
// Baris 1 huruf latin bersambung bergradasi hijau → emas; baris 2 biru tebal. Setiap kata maju–mundur bergantian (gelombang).
const KP1 = 'Sistem Integrasi Data dan Informasi';
const KP2 = 'Direktorat Rehabilitasi Sosial Tuna Sosial dan Korban Perdagangan Orang';
const AWAL = [10, 168, 26], AKHIR = [201, 166, 62];   // #0AA81A → #C9A63E (sedikit lebih pekat dari contoh agar tetap terbaca di latar putih)
const campur = (t) => '#' + AWAL.map((a, k) => Math.round(a + (AKHIR[k] - a) * t).toString(16).padStart(2, '0')).join('');
function kepanjangan() {
  const kata1 = KP1.split(' '); let pos = 0;
  const b1 = kata1.map((k, i) => {
    const t0 = pos / KP1.length, t1 = (pos + k.length) / KP1.length; pos += k.length + 1;
    return `<span class="kp-kata" style="--i:${i};--c0:${campur(t0)};--c1:${campur(t1)}">${k}</span>`;
  }).join(' ');
  const b2 = KP2.split(' ').map((k, i) => `<span class="kp-kata" style="--i:${kata1.length + i}">${k}</span>`).join(' ');
  return raw(`<div class="lp-kp" role="group" aria-label="SITASI TSKPO: ${KP1} ${KP2}">
          <p class="lp-kp-1">${b1}</p>
          <p class="lp-kp-2">${b2}</p>
        </div>`);
}

export async function render(el) {
  el.innerHTML = String(html`<div class="lp">
    <header class="lp-nav">
      <div class="lp-wadah">
        <a class="lp-merek" href="#/">${logo(40)}<span><b>SITASI TSKPO<em>INTERNAL</em></b><small>Kementerian Sosial Republik Indonesia</small></span></a>
        <nav class="lp-tautan" aria-label="Bagian halaman">
          <button type="button" data-gulir="alur">Alur Pencairan</button>
          <button type="button" data-gulir="profil-pm">Profil PM</button>
          <button type="button" data-gulir="modul">Modul</button>
          <button type="button" data-gulir="keamanan">Keamanan Data</button>
        </nav>
        <div class="lp-nav-aksi">
          <button type="button" class="btn btn-ghost btn-sm" data-bantuan>${raw(ikon('help', 18))} Bantuan</button>
          <a class="btn btn-primary btn-sm" href="#/masuk">Masuk ${raw(ikon('arrow-right', 18, 'arah'))}</a>
        </div>
      </div>
    </header>

    <section class="lp-hero">
      <div class="aurora terang" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="lp-wadah lp-kp-wadah">
        <span class="pill">Portal Kerja Internal RSTSKPO</span>
        ${kepanjangan()}
      </div>
      <div class="lp-wadah">
        <div class="rv">
          <h1><span class="hl hl-sapu">Satu data</span> untuk setiap langkah pelayanan.</h1>
          <p class="lead">Terpadu dari asesmen, usulan BNBA, pengusulan SK, pencairan bantuan ATENSI, hingga Supermonev.</p>
          <div class="lp-hero-aksi">
            <button type="button" class="btn btn-primary btn-lg" data-masuk>${logoGoogle} Masuk dengan Google</button>
            <a class="btn btn-secondary btn-lg btn-kemensos" href="#/masuk?cara=kemensos" data-masuk-kemensos>${raw(ikon('mail', 20))} Masuk dengan Akun Kemensos</a>
          </div>
          <p class="lp-catatan">${raw(ikon('lock', 18))} Akses internal terbatas — hanya untuk pegawai dan petugas yang terdaftar di Direktorat.</p>
        </div>
        <div class="lp-foto rv" style="--tunda:120ms">
          <div class="lp-foto-halo"></div>
          <div class="lp-foto-cincin"></div>
          <div class="lp-foto-bingkai">
            <img src="${CONFIG.FOTO_GEDUNG}" alt="Gedung Kementerian Sosial Republik Indonesia" loading="eager" decoding="async" data-foto>
            <div class="lp-foto-kosong" hidden>${raw(ikon('landmark', 40))}<div><b>Foto Gedung Kementerian Sosial RI</b><small>Letakkan berkas foto resmi di ${CONFIG.FOTO_GEDUNG}</small></div></div>
          </div>
          <div class="lp-apung a1"><span class="ubin" style="width:38px;height:38px;border-radius:12px">${raw(ikon('database', 20))}</span><span><b>Satu Data Terpadu</b><small>Central Database BNBA</small></span></div>
          <div class="lp-apung a2"><span class="ubin biru" style="width:38px;height:38px;border-radius:12px">${raw(ikon('workflow', 20))}</span><span><b>11 Tahap Terpantau</b><small>Asesmen s.d. Pencairan</small></span></div>
        </div>
      </div>
    </section>

    <section class="lp-profil" id="profil-pm" aria-labelledby="judul-profil">
      <div class="lp-wadah">
        <div class="lp-profil-kartu rv">
          <div class="lp-profil-teks">
            <span class="pill">Unggulan</span>
            <h2 id="judul-profil"><span class="hl hl-sapu">1 Orang 1 Profil</span> — dari BNBA sampai Supermonev</h2>
            <p>Setiap penerima manfaat punya satu profil yang menyatukan seluruh perjalanannya: data BNBA, 11 tahap pengusulan SK, pencairan dan petugas penyalur, foto dokumentasi, hingga hasil monitoring pascapenyaluran. Cukup satu tombol di <b>Detail PM</b> untuk mengunduhnya sebagai <b>PowerPoint (PPTX)</b> atau <b>PDF</b>.</p>
            <div class="lp-profil-ekspor"><span class="badge b-gold">${raw(ikon('presentation', 15))} PPTX</span><span class="badge b-ok">${raw(ikon('printer', 15))} PDF</span><span class="badge b-draft">${raw(ikon('eye-off', 15))} NIK disamarkan</span></div>
          </div>
          <ol class="lp-profil-alur" aria-label="Perjalanan satu profil">
            <li><b>BNBA</b><small>Profil, alamat, ekonomi awal</small></li>
            <li><b>11 Tahap SK</b><small>Verifikasi sampai tanda tangan</small></li>
            <li><b>Pencairan</b><small>SP2D, rekening, penyalur</small></li>
            <li><b>Dokumentasi</b><small>Foto sebelum &amp; saat penyaluran</small></li>
            <li><b>Supermonev</b><small>Hasil monitoring tiap 3 bulan</small></li>
          </ol>
        </div>
      </div>
    </section>

    <section class="lp-pokja" aria-label="11 Kelompok Kerja">
      <div class="lp-wadah">
        <p>11 KELOMPOK KERJA (POKJA) TERINTEGRASI</p>
        <div class="chips">${POKJA.map(([n, w]) => html`<span class="chip-pokja" style="${gayaPokja({ warna: w })}">${n}</span>`)}</div>
      </div>
    </section>

    <section class="lp-seksi" id="alur">
      <div class="lp-wadah">
        <div class="lp-judul-seksi rv">
          <span class="pill">Alur Terintegrasi & Terukur</span>
          <h2><span class="hl hl-sapu">Pemantauan Bantuan ATENSI</span> Tanpa Input Ganda</h2>
          <p>Setiap usulan bergerak melalui tahapan yang terstruktur, lengkap dengan penanggung jawab, berkas, dan riwayat perubahan.</p>
        </div>
        <div class="lp-layar rv" aria-hidden="true">
          <div class="lp-layar-atas"><i></i><i></i><i></i><span>SITASI TSKPO · Rekonsiliasi Pencairan</span></div>
          <span class="lp-label-contoh">CONTOH TAMPILAN</span>
          <div class="lp-layar-isi">
            <div class="lp-layar-sb"><i style="width:80%"></i><i class="aktif"></i><i style="width:70%"></i><i style="width:85%"></i><i style="width:60%"></i><i style="width:75%"></i></div>
            <div class="lp-layar-main">
              <div class="lp-tahap-mini">${TAHAP_PENCAIRAN.map((t) => html`<span class="${t.teksGelap ? 'gelap-teks' : ''}" style="background:${t.warna}">${t.no}</span>`)}</div>
              ${[0, 1, 2, 3].map((i) => html`<div class="lp-baris-mini"><i style="width:${[80, 65, 90, 70][i]}%"></i><i style="width:60%"></i><i style="width:45%"></i><b style="background:${TAHAP_PENCAIRAN[[3, 5, 10, 12][i]].warna}"></b></div>`)}
            </div>
          </div>
        </div>
        <div class="lp-fitur">${FITUR.map(([ik, j, p], i) => html`<div class="rv" style="--tunda:${i * 60}ms"><span class="ubin">${raw(ikon(ik, 22))}</span><h3>${j}</h3><p>${p}</p></div>`)}</div>
      </div>
    </section>

    <section class="lp-gelap" aria-labelledby="judul-klaster">
      <div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="lp-wadah lp-gelap-isi">
        <div class="lp-gelap-teks rv">
          <span class="pill">Klaster Sasaran</span>
          <h2 id="judul-klaster"><span class="hl hl-sapu">Klaster Sasaran</span> TSKPO</h2>
          <p>Kelompok penerima manfaat yang dilayani Direktorat dan dicatat dalam SITASI TSKPO. Setiap klaster memiliki asesmen dan intervensi ATENSI yang dipantau berkelanjutan.</p>
          <div class="lp-mini">
            <div>${raw(ikon('clipboard-check', 20))}<span><b>Instrumen Terstandar</b><small>Format asesmen disesuaikan kebutuhan setiap klaster.</small></span></div>
            <div>${raw(ikon('hand-coins', 20))}<span><b>Intervensi ATENSI</b><small>Bantuan tersalur dan terpantau per tahap.</small></span></div>
          </div>
        </div>
        <div class="tumpuk rv" style="--tunda:120ms">
          <div class="tumpuk-cahaya" aria-hidden="true"></div>
          <div class="tumpuk-bidang">
            ${KLASTER.map((k) => html`<div class="kartu-apung ${k.besar ? 'besar' : ''}"><span class="judul">${k.judul}</span>
              <ul>${k.poin.map(([a, b]) => html`<li><span>${a}${b ? html`<small>${b}</small>` : ''}</span></li>`)}</ul></div>`)}
          </div>
        </div>
      </div>
    </section>

    <section class="lp-seksi" id="modul" style="padding-top:128px">
      <div class="lp-wadah">
        <div class="lp-judul-seksi rv">
          <span class="pill">Ekosistem Kerja Lengkap</span>
          <h2><span class="hl hl-sapu">Modul Utama</span> SITASI TSKPO</h2>
          <p>Dirancang untuk kebutuhan operasional 11 Pokja dan pemantauan pimpinan secara terpadu.</p>
        </div>
        <div class="lp-modul">${MODUL.map(([ik, j, p, k], i) => html`<div class="rv" style="--tunda:${i * 60}ms">
          <span class="ubin ${i % 2 ? 'biru' : ''}">${raw(ikon(ik, 22))}</span><h3>${j}</h3><p>${p}</p>
          <span class="kaki-modul">${raw(ikon('check-circle', 16))} ${k}</span></div>`)}</div>
      </div>
    </section>

    <section class="lp-seksi tint" id="waktu" style="padding-bottom:128px">
      <div class="lp-wadah">
        <div class="lp-judul-seksi rv">
          <span class="pill">Alur Pencairan</span>
          <h2><span class="hl hl-sapu">Garis Waktu</span> 11 Tahap Pencairan</h2>
          <p>Setiap tahap memiliki syarat selesai yang jelas dan dikerjakan oleh petugas yang berwenang. Tahap berikutnya terbuka setelah tahap sebelumnya dikonfirmasi.</p>
        </div>
        <ol class="lp-waktu" style="list-style:none;margin:0;padding:0">${TAHAP_PENCAIRAN.map((t, i) => html`<li class="lp-tahap rv ${t.no === '11' ? 'akhir' : ''}" style="--tunda:${(i % 4) * 50}ms">
          ${t.no === '11' ? html`<span class="tanda">TUJUAN AKHIR</span>` : ''}
          <div class="atas"><span class="no ${t.teksGelap ? 'teks-gelap' : ''}" style="background:${t.warna}">${t.no}</span>${t.no === '11' ? '' : html`<span class="oleh">${t.oleh}</span>`}</div>
          <b>${t.no === '11' ? 'Pencairan Dana' : t.nama}</b><p>${t.ket}</p></li>`)}</ol>
      </div>
    </section>

    <section class="lp-gelap navy" id="keamanan" aria-labelledby="judul-aman">
      <div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="lp-wadah lp-gelap-isi">
        <div class="lp-gelap-teks rv">
          <span class="pill">Tata Kelola & Privasi</span>
          <h2 id="judul-aman"><span class="hl hl-sapu">Keamanan Data</span> Pribadi Penerima Manfaat</h2>
          <p>Hak akses berjenjang diterapkan langsung di basis data, sehingga setiap pengguna hanya melihat dan mengubah data sesuai peran dan Pokja-nya.</p>
          <div class="lp-aman-list">
            <div><span class="ubin">${raw(ikon('eye-off', 22))}</span><span><b>Penyamaran Data Sensitif</b><small>Nomor rekening, nama ibu kandung, dan alamat lengkap disamarkan bagi peran yang tidak berwenang.</small></span></div>
            <div><span class="ubin">${raw(ikon('key', 22))}</span><span><b>Akun Terdaftar (Allowlist)</b><small>Login hanya dengan akun Google yang didaftarkan Super Admin.</small></span></div>
            <div><span class="ubin">${raw(ikon('history', 22))}</span><span><b>Jejak Aktivitas (Audit Log)</b><small>Setiap perubahan, ekspor, dan pembukaan data sensitif tercatat.</small></span></div>
          </div>
        </div>
        <div class="lp-contoh rv" style="--tunda:120ms" aria-label="Contoh penyamaran data">
          <div class="atas"><span><small>ILUSTRASI</small><b>Contoh Penyamaran Rekening</b></span><span class="lencana">Tersamar</span></div>
          <dl>
            <div><dt>No. Rekening</dt><dd>1234 •••• •••• 7890</dd></div>
            <div><dt>Nama Ibu Kandung</dt><dd>S•••••• R•••••</dd></div>
            <div><dt>Alamat Lengkap</dt><dd>Jl. M•••• No. •• RT ••/••</dd></div>
          </dl>
          <div class="catatan">${raw(ikon('info', 16))} Contoh ilustrasi, bukan data asli penerima manfaat.</div>
        </div>
      </div>
    </section>

    <section class="lp-cta">
      <div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="lp-wadah rv">
        <h2>Masuk ke Portal Internal SITASI TSKPO</h2>
        <p>Gunakan akun Google yang telah didaftarkan oleh Super Admin Direktorat RSTSKPO untuk memulai kerja Pokja Anda.</p>
        <div class="aksi">
          <button type="button" class="btn btn-white btn-lg" data-masuk>${logoGoogle} Masuk dengan Google</button>
          <button type="button" class="btn btn-outline-white btn-lg" data-bantuan>${raw(ikon('help', 20))} Hubungi Bantuan Administrasi</button>
        </div>
      </div>
    </section>

    <footer class="lp-kaki">
      <div class="lp-wadah">
        <span class="lp-merek">${logo(32)}<span><b style="font-size:.9375rem">SITASI TSKPO</b><small>Kementerian Sosial Republik Indonesia</small></span></span>
        <small>© ${new Date().getFullYear()} Direktorat Rehabilitasi Sosial Tuna Sosial dan Korban Perdagangan Orang, Kementerian Sosial RI · <a class="lp-tautan-kaki" href="privasi.html">Kebijakan Privasi</a> · <a class="lp-tautan-kaki" href="ketentuan.html">Ketentuan Layanan</a></small>
      </div>
    </footer>
  </div>`);

  const foto = el.querySelector('[data-foto]');
  const fotoGagal = () => { foto.hidden = true; el.querySelector('.lp-foto-kosong').hidden = false; };
  foto.addEventListener('error', fotoGagal);
  if (foto.complete && !foto.naturalWidth) fotoGagal();

  el.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.matches('[data-masuk]')) mulaiMasuk(t);
    if (t.matches('[data-gulir]')) document.getElementById(t.dataset.gulir)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (t.matches('[data-bantuan]')) bantuan();
  });
  pasangReveal(el);
}

function bantuan() {
  bukaModal({
    judul: 'Bantuan Administrasi',
    isi: String(html`<div class="stack" style="gap:14px">
      <p>Untuk pendaftaran akun, perubahan peran, atau kendala saat masuk, hubungi <b>Super Admin</b> atau <b>Pokja Tata Usaha</b> Direktorat RSTSKPO.</p>
      <div class="info-card">${raw(ikon('info', 20))}<span>Sertakan email Google yang Anda gunakan dan surat tugas atau keputusan penugasan dari Ketua Pokja atau TU.</span></div>
    </div>`),
    kaki: '<button type="button" class="btn btn-primary" data-batal>Mengerti</button>',
  });
}
