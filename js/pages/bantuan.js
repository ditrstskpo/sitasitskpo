// Pusat Bantuan & Pelatihan (Tahap 6): panduan per peran dengan langkah bernomor, daftar latihan yang dapat
// dicentang (tersimpan di perangkat), tur singkat layar, tanya-jawab, dan panduan cetak. Bahasa sederhana.
import { html, raw, angka, debounce } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { judulHalaman, toast } from '../core/ui.js';
import { pasangEfek, segarkanEfek } from '../core/efek.js';
import { mulaiTur, langkahShell } from '../core/tur.js';
import { cincin } from './_smv.js';
import * as P from '../core/peran.js';

const PANDUAN = {
  petugas: { judul: 'Petugas Supermonev (lapangan)', ikon: 'navigation', ringkas: 'Mengunjungi PM yang ditugaskan dan mengisi formulir monitoring.',
    langkah: [['Buka "Supermonev"', 'Kartu PM yang ditugaskan kepada Anda tampil berurutan dari yang paling dekat jatuh temponya.', '/supermonev'],
      ['Kunjungi PM', 'Cocokkan nama, NIK, dan alamat pada kartu dengan KTP PM.'],
      ['Tekan "Isi Formulir"', 'Ikuti 5 langkah: Kunjungan, Usaha, Keuangan, Barang & Kendala, Periksa & Ajukan. Jawaban berupa tombol besar.'],
      ['Simpan Draft bila terputus', 'Tekan "Simpan Draft" kapan saja; lanjutkan nanti dari kartu yang sama.'],
      ['Ambil foto usaha (opsional)', 'Maks 2 foto. Foto dari kamera otomatis dikecilkan ≤ 1 MB.'],
      ['Ajukan', 'Tekan "Ajukan ke Kapokja Supermonev". Bila dikembalikan, kartu berpindah ke kelompok "Perlu diperbaiki" beserta catatannya.'],
      ['Bukti belanja (bila diminta)', 'Untuk bantuan barang: buka "Verifikasi Belanja & BAST", unggah nota, BAST, foto barang, dan isi daftar inventaris.', '/verifikasi-belanja']],
    latihan: [['Buka menu Supermonev', '/supermonev'], ['Buka formulir satu PM dan simpan sebagai draft'], ['Unggah satu foto usaha'], ['Ajukan satu isian'], ['Buka menu Verifikasi Belanja & BAST', '/verifikasi-belanja']] },
  anggota: { judul: 'Anggota Pokja (teknis)', ikon: 'briefcase', ringkas: 'Menyusun usulan BNBA, mengunggah dokumentasi, dan memantau pencairan.',
    langkah: [['Buka "Workspace BNBA Pokja"', 'Tekan "Buat Usulan", isi judul dan link profil asesmen.', '/workspace-bnba'],
      ['Isi BNBA per PM', 'Isi satu per satu atau impor dari Excel sesuai template. Kolom bertanda * wajib.'],
      ['Ajukan ke Kapokja', 'Usulan dikunci saat menunggu verifikasi; bila dikembalikan, perbaiki pada usulan yang sama.'],
      ['Unggah foto Sebelum Usaha', 'Di Detail PM → tab Dokumentasi. Maks 2 foto per kategori.'],
      ['Pantau posisi tahap', 'Menu "Usulan & SK Pokja" dan "Rekonsiliasi Pencairan" menampilkan tahap 1–11.', '/usulan-sk'],
      ['Diskusi & pesan', 'Gunakan tab "Diskusi" pada usulan/PM atau menu "Pesan & Komunikasi".', '/pesan']],
    latihan: [['Buka Workspace BNBA Pokja', '/workspace-bnba'], ['Buka satu Detail PM dari Master BNBA', '/master-bnba'], ['Lihat posisi tahap di Rekonsiliasi Pencairan', '/rekonsiliasi'], ['Kirim satu pesan di ruang Pokja', '/pesan']] },
  kapokja: { judul: 'Kapokja', ikon: 'badge-check', ringkas: 'Memverifikasi usulan BNBA Pokja dan memutuskan pengecualian dokumentasi.',
    langkah: [['Buka "Antrean Verifikasi"', 'Usulan dari anggota Pokja menunggu di sini; notifikasi juga dikirim ke lonceng.', '/antrean-verifikasi'],
      ['Periksa BNBA', 'Buka usulan, cek setiap PM. PM yang belum lengkap ditandai merah.'],
      ['Setujui atau Kembalikan', 'Kembalikan wajib dengan catatan yang jelas agar anggota dapat memperbaiki.'],
      ['Putuskan "tidak ada dokumentasi"', 'Bila anggota mengajukan pengecualian foto, putuskan di Detail PM → tab Dokumentasi.']],
    latihan: [['Buka Antrean Verifikasi', '/antrean-verifikasi'], ['Buka satu usulan dan baca riwayatnya', '/usulan-sk'], ['Buka Dashboard (Beranda)', '/beranda']] },
  tu: { judul: 'Pokja Tata Usaha', ikon: 'clipboard-check', ringkas: 'Verifikasi SK, TTD Direktur, sekretariat, pengumuman, dan publikasi dokumen.',
    langkah: [['Buka "Workspace Tata Usaha"', 'Kerjakan tahap 4a (verifikasi SK), 4b (TTD Direktur), 4c (sekretariat), dan 6.', '/tata-usaha'],
      ['Kelola pengumuman', 'Menu "Kelola Pengumuman": pengumuman tampil di bilah atas semua pengguna.', '/pengaturan/pengumuman'],
      ['Verifikasi publikasi dokumen', 'Dokumen Pokja yang diajukan ke Dokumen Bersama diperiksa TU sebelum terbit.', '/dokumen-bersama'],
      ['Penugasan Supermonev (Kapokja TU)', 'Kapokja TU dapat menugaskan petugas Supermonev per periode.', '/penugasan-supermonev']],
    latihan: [['Buka Workspace Tata Usaha', '/tata-usaha'], ['Buka Kelola Pengumuman', '/pengaturan/pengumuman'], ['Buka Dokumen Bersama', '/dokumen-bersama']] },
  keuangan: { judul: 'Pokja Keuangan', ikon: 'wallet', ringkas: 'Data pencairan, SK final, SP2D, SI, dan konfirmasi cair.',
    langkah: [['Buka "Workspace Keuangan"', 'Kerjakan tahap 5 dan 7–11 untuk usulan semua Pokja.', '/keuangan'],
      ['Isi tanggal cair di tahap 11', 'Tanggal cair memulai jadwal Supermonev (minggu ke-1 = 3 bulan sesudahnya, lalu setiap minggu).'],
      ['Koreksi rekap', 'Menu "Rekap SP2D & Koreksi": nilai asli tetap tersimpan.', '/keuangan/koreksi-rekap']],
    latihan: [['Buka Workspace Keuangan', '/keuangan'], ['Buka Rekap Data Pencairan', '/rekap-pencairan']] },
  smv: { judul: 'Pokja Supermonev', ikon: 'clipboard-list', ringkas: 'Menugaskan petugas, memverifikasi isian & belanja, dan menyusun laporan.',
    langkah: [['Tugaskan petugas', '"Penugasan Petugas": centang PM per kab/kota → "Tugaskan ke Petugas…". Penugasan bisa dipindah sebelum formulir diisi.', '/penugasan-supermonev'],
      ['Verifikasi isian', '"Supermonev" → tab "Antrean Verifikasi" → "Periksa & Verifikasi". Ubah hasil otomatis hanya dengan alasan.', '/supermonev?tab=antrean'],
      ['Koreksi ringkasan kendala', 'Saat menyetujui, perbaiki kalimat ringkasan kendala bila perlu — dipakai di laporan & PPTX.'],
      ['Verifikasi belanja & BAST', 'Cocokkan nota, BAST, dan inventaris di "Verifikasi Belanja & BAST".', '/verifikasi-belanja'],
      ['Laporan', '"Dashboard Supermonev" → "Ekspor PPTX & Laporan": 2 slide per PM, Excel, atau cetak PDF.', '/ekspor-supermonev']],
    latihan: [['Buka Penugasan Petugas', '/penugasan-supermonev'], ['Buka Antrean Verifikasi Supermonev', '/supermonev?tab=antrean'], ['Buka Dashboard Supermonev', '/dashboard-supermonev'], ['Unduh satu PPTX contoh', '/ekspor-supermonev']] },
  data: { judul: 'Pokja Data', ikon: 'database', ringkas: 'Verifikasi LKS dan Aster, serta rekap data.',
    langkah: [['Verifikasi LKS', '"Antrean Verifikasi" berisi LKS yang diajukan Pokja.', '/antrean-verifikasi'], ['Input & verifikasi Aster', '"Input Aster": formulir 26 kolom atau impor Excel.', '/input-aster'], ['Lihat sebaran', '"Data LKS" dan "Data Aster" menampilkan peta 38 provinsi.', '/data-lks']],
    latihan: [['Buka Data LKS', '/data-lks'], ['Buka Input Aster', '/input-aster']] },
  direktur: { judul: 'Direktur', ikon: 'landmark', ringkas: 'Memantau realisasi, pencairan, dan hasil Supermonev.',
    langkah: [['Beranda / Dashboard', 'Realisasi bantuan per Pokja, provinsi, dan bulan.', '/beranda'], ['Rekonsiliasi Pencairan', 'Posisi setiap usulan pada 11 tahap.', '/rekonsiliasi'], ['Dashboard Supermonev', 'Keberhasilan usaha PM setelah bantuan.', '/dashboard-supermonev']],
    latihan: [['Buka Beranda', '/beranda'], ['Buka Dashboard Supermonev', '/dashboard-supermonev']] },
  sa: { judul: 'Super Admin', ikon: 'shield', ringkas: 'Mengelola pengguna, pengaturan, keamanan, dan cadangan.',
    langkah: [['Tambah pengguna', '"Pengguna & Hak Akses": email Google, Pokja & jabatan. Petugas lapangan pilih jenis "Petugas Supermonev".', '/pengaturan/pengguna'],
      ['Periksa keamanan bulanan', '"Pemeriksaan Keamanan" → "Jalankan Pemeriksaan". Perbaiki butir merah.', '/pengaturan/keamanan'],
      ['Buat cadangan mingguan', '"Cadangan & Pemulihan" → "Buat Cadangan Sekarang". Simpan di 2 tempat.', '/pengaturan/cadangan'],
      ['Uji pulih berkala', 'Pilih cadangan → "Uji Pulih (tanpa menulis)" untuk memastikan cadangan dapat dipulihkan.', '/pengaturan/cadangan'],
      ['Atur jadwal Supermonev', '"Supermonev" → tab "Pengaturan Jadwal".', '/supermonev?tab=atur'],
      ['Simulasi peran', 'Tombol "Ganti Peran" di profil untuk melihat aplikasi sebagai peran lain (tercatat di audit log).']],
    latihan: [['Jalankan Pemeriksaan Keamanan', '/pengaturan/keamanan'], ['Buat satu cadangan', '/pengaturan/cadangan'], ['Jalankan Uji Pulih dari cadangan tersebut', '/pengaturan/cadangan'], ['Buka Log Aktivitas', '/pengaturan/log-aktivitas'], ['Coba Ganti Peran lalu kembali']] },
};
const TANYA = [
  ['Saya tidak bisa masuk. Apa yang harus dilakukan?', 'Masuk hanya dengan akun Google yang sudah didaftarkan Super Admin. Bila muncul "Akses Ditolak", hubungi Super Admin agar email Anda didaftarkan atau diaktifkan kembali.'],
  ['Tulisan terlalu kecil.', 'Tekan tombol "A+" di bilah atas (bisa ditekan dua kali). Pengaturan ini tersimpan di perangkat Anda.'],
  ['Layar terasa terlalu banyak gerakan / silau.', 'Buka menu profil (nama Anda di kanan atas) → nyalakan "Kurangi gerakan" atau "Kontras tinggi".'],
  ['Foto saya ditolak karena terlalu besar.', 'Aplikasi mengecilkan foto otomatis sampai ≤ 1 MB. Bila tetap gagal, ambil ulang foto dengan kamera biasa (bukan mode HDR/RAW), lalu pilih lagi.'],
  ['Internet putus saat mengisi formulir.', 'Tekan "Simpan Draft" bila sempat. Bila tidak, isian di layar tetap ada selama halaman tidak ditutup; tekan simpan lagi setelah internet kembali. Titik di bilah atas berubah hijau saat tersambung.'],
  ['Kenapa hasil Supermonev "Belum dapat dinilai"?', 'Penilaian membandingkan pendapatan bersih bulan ini dengan pendapatan bersih SEBELUM bantuan. Bila angka sebelum bantuan belum ada di BNBA, tanyakan ke PM dan isi pada langkah "Kunjungan".'],
  ['Apakah hasil otomatis bisa diubah?', 'Bisa, oleh Kapokja Supermonev saat verifikasi, dengan menuliskan alasan. Perubahan tercatat di audit log.'],
  ['Data saya terlihat orang lain?', 'Tidak sembarangan. Setiap peran hanya melihat data yang menjadi haknya; data sensitif (No. KK, rekening, alamat lengkap) tersamar dan setiap pembukaan tercatat.'],
  ['Notifikasi WhatsApp tidak masuk.', 'Pastikan nomor HP Anda benar di data pengguna. Super Admin dapat memeriksa antrean di "Notifikasi WA & Email".'],
  ['Bagaimana cara mengulang tur aplikasi?', 'Buka "Pusat Bantuan & Pelatihan" lalu tekan "Mulai Tur Singkat".'],
];

const peranSaya = (s) => (P.isPetugas(s) ? 'petugas' : P.isSuperAdmin(s) ? 'sa' : P.isDirektur(s) ? 'direktur' : P.diPokja(s, 'SUPERMONEV') ? 'smv' : P.diPokja(s, 'TU') ? 'tu'
  : P.diPokja(s, 'KEUANGAN') ? 'keuangan' : P.diPokja(s, 'DATA') ? 'data' : P.isKapokja(s) ? 'kapokja' : 'anggota');
const kunciLatihan = (r) => 'sitasi:latihan:' + r;
const bacaLatihan = (r) => { try { return JSON.parse(localStorage.getItem(kunciLatihan(r)) || '[]'); } catch { return []; } };

export async function render(el, { sesi: s }) {
  const saya = peranSaya(s);
  let aktif = saya, cari = '';
  const daftarPeran = P.isPetugas(s) ? ['petugas'] : Object.keys(PANDUAN);
  el.innerHTML = String(html`
    <section class="band bantuan-pita berkisi rv angkat3d" style="margin-bottom:24px">
      <div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div><div class="fajar-sinar" aria-hidden="true"></div>
      <div class="bantuan-hero"><div><span class="pill">Pusat Bantuan &amp; Pelatihan</span>
        <h1>Butuh bantuan? <span class="hl hl-sapu">Mulai dari sini.</span></h1>
        <p>Panduan langkah demi langkah sesuai peran Anda, latihan singkat, dan jawaban pertanyaan yang sering muncul.</p>
        <div class="bantuan-aksi"><button class="btn btn-primary btn-sinar btn-besar" data-tur>${raw(ikon('play-circle', 20))} Mulai Tur Singkat</button>
          <button class="btn btn-secondary btn-besar" data-cetak>${raw(ikon('printer', 20))} Cetak Panduan Saya</button></div></div>
        <label class="input-ikon bantuan-cari">${raw(ikon('search', 20))}<input class="input" data-cari placeholder="Cari bantuan, mis. foto, cadangan, verifikasi" aria-label="Cari bantuan"></label></div>
    </section>
    ${daftarPeran.length > 1 ? html`<div class="pilih-peran-bantuan rv" role="tablist" aria-label="Panduan untuk peran">${daftarPeran.map((k) => html`<button type="button" role="tab" data-peran="${k}" aria-selected="${k === aktif}">
      ${raw(ikon(PANDUAN[k].ikon, 18))} ${PANDUAN[k].judul}${k === saya ? html` <small>(Anda)</small>` : ''}</button>`)}</div>` : ''}
    <div class="bantuan-tata">
      <section data-panduan class="rv"></section>
      <aside data-latihan class="rv skala"></aside>
    </div>
    <section class="card rv" style="margin-top:24px"><div class="card-head"><span class="ubin biru">${raw(ikon('help', 20))}</span><div><h2 class="card-title">Pertanyaan yang Sering Muncul</h2><p class="card-sub">Ketuk pertanyaan untuk melihat jawabannya</p></div></div>
      <div class="faq" data-faq></div></section>
    <section class="card rv" style="margin-top:24px"><div class="kontak-bantuan">${raw(ikon('life-buoy', 28))}<div><b>Masih bingung?</b>
      <p>${P.isPegawai(s) ? 'Kirim pesan ke Pokja Anda atau Super Admin lewat menu Pesan & Komunikasi.' : 'Hubungi Kapokja Supermonev yang menugaskan Anda (nama tercantum di notifikasi tugas).'}</p></div>
      ${P.isPegawai(s) ? html`<a class="btn btn-secondary" href="#/pesan">${raw(ikon('pesan', 18))} Buka Pesan</a>` : ''}</div></section>`);
  pasangEfek(el);
  const $ = (q) => el.querySelector(q);
  const cocok = (t) => !cari || String(t).toLowerCase().includes(cari);

  function gambar() {
    const p = PANDUAN[aktif], dicentang = bacaLatihan(aktif);
    const langkah = p.langkah.filter(([j, isi]) => cocok(j + ' ' + isi));
    $('[data-panduan]').innerHTML = String(html`<section class="card panduan-kartu"><div class="card-head"><span class="ubin">${raw(ikon(p.ikon, 22))}</span><div><h2 class="card-title">Panduan ${p.judul}</h2><p class="card-sub">${p.ringkas}</p></div></div>
      ${langkah.length ? html`<ol class="langkah-besar">${langkah.map(([j, isi, rute], i) => html`<li style="--i:${i}"><span class="lb-angka">${i + 1}</span><div><b>${j}</b><p>${isi}</p>
        ${rute ? html`<a class="btn btn-ghost btn-sm" href="#${rute}">${raw(ikon('arrow-right', 16))} Buka menu</a>` : ''}</div></li>`)}</ol>` : html`<p class="redup">Tidak ada langkah yang cocok dengan pencarian.</p>`}</section>`);
    const n = dicentang.length, t = p.latihan.length, pct = Math.round((n / t) * 100);
    $('[data-latihan]').innerHTML = String(html`<section class="card latihan-kartu"><div class="latihan-kepala">${cincin(pct, { ukuran: 96, tebal: 10, label: `${n}/${t}`, sub: 'latihan', warna: '#17824A' })}
        <div><h2 class="card-title">Latihan Singkat</h2><p class="card-sub">Centang setelah dicoba. Tersimpan di perangkat ini.</p></div></div>
      <ul class="latihan">${p.latihan.map(([j, rute], i) => html`<li class="${dicentang.includes(i) ? 'selesai' : ''}"><label class="cek-besar"><input type="checkbox" data-latih="${i}" ${dicentang.includes(i) ? raw('checked') : ''}><span></span></label>
        <span class="lt-teks">${j}</span>${rute ? html`<a href="#${rute}" class="btn btn-icon" aria-label="Buka: ${j}">${raw(ikon('arrow-up-right', 18))}</a>` : ''}</li>`)}</ul>
      ${n === t ? html`<p class="latihan-selamat">${raw(ikon('award', 20))} Hebat! Semua latihan untuk peran ini sudah dicoba.</p>` : ''}</section>`);
    $('[data-faq]').innerHTML = String(html`${TANYA.filter(([q, a]) => cocok(q + ' ' + a)).map(([q, a]) => html`<details><summary>${raw(ikon('chevron-right', 18, 'faq-panah'))} ${q}</summary><p>${a}</p></details>`)}`);
    segarkanEfek(el);
  }
  el.addEventListener('click', (e) => {
    const pr = e.target.closest('[data-peran]'); if (pr) { aktif = pr.dataset.peran; el.querySelectorAll('[data-peran]').forEach((b) => b.setAttribute('aria-selected', String(b === pr))); return gambar(); }
    if (e.target.closest('[data-tur]')) return mulaiTur(langkahShell(P.isPetugas(s)), { onSelesai: () => { try { localStorage.setItem('sitasi:tur-selesai', '1'); } catch {} toast('Tur selesai. Selamat bekerja!'); } });
    if (e.target.closest('[data-cetak]')) { document.documentElement.classList.add('mencetak-bantuan'); const s2 = () => { document.documentElement.classList.remove('mencetak-bantuan'); removeEventListener('afterprint', s2); }; addEventListener('afterprint', s2); setTimeout(() => print(), 50); }
  });
  el.addEventListener('change', (e) => {
    const c = e.target.closest('[data-latih]'); if (!c) return;
    const d = new Set(bacaLatihan(aktif)); c.checked ? d.add(Number(c.dataset.latih)) : d.delete(Number(c.dataset.latih));
    try { localStorage.setItem(kunciLatihan(aktif), JSON.stringify([...d])); } catch {}
    gambar();
  });
  el.addEventListener('input', debounce((e) => { if (e.target.matches('[data-cari]')) { cari = e.target.value.trim().toLowerCase(); gambar(); if (cari) el.querySelectorAll('.faq details').forEach((x) => { x.open = true; }); } }, 250));
  gambar();
}
export { PANDUAN };
export const jumlahPanduan = () => angka(Object.keys(PANDUAN).length);
