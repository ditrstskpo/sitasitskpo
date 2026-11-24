// Pemeriksaan Keamanan & Kesehatan Sistem (Tahap 6, Super Admin).
// Memeriksa langsung di basis data: RLS, hak tulis, akses tanpa login, kolom sensitif, fungsi berhak khusus,
// jumlah Super Admin, akun menganggur, penyimpanan, antrean notifikasi, audit log, dan umur cadangan terakhir.
import { html, raw, angka, tanggalJam } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api, modePratinjau } from '../core/api.js';
import { judulHalaman, kotakGalat, pesanGalat, toast, tombolMuat } from '../core/ui.js';
import { ukuranTeks } from '../core/komp.js';
import { pasangEfek, segarkanEfek } from '../core/efek.js';
import { kepalaPita } from './_t34.js';
import { cincin } from './_smv.js';

const IKON_ST = { lulus: ['check-circle', 'Lulus'], peringatan: ['alert', 'Perlu perhatian'], gagal: ['circle-x', 'Gagal'] };

export async function render(el) {
  el.innerHTML = String(html`
    ${judulHalaman({ pill: 'Tahap 6 · Integrasi & Penyempurnaan', sorot: 'Pemeriksaan Keamanan', sisa: '& Kesehatan Sistem',
      sub: 'Satu tombol untuk memeriksa pengaman utama SITASI TSKPO langsung di basis data Supabase. Jalankan setiap bulan, setelah menambah pengguna, atau setelah memasang versi baru.',
      aksi: String(html`<a class="btn btn-secondary" href="#/pengaturan/cadangan">${raw(ikon('database-backup', 18))} Cadangan &amp; Pemulihan</a>`) })}
    <section class="band perisai-pita berkisi rv angkat3d" style="margin-bottom:24px">
      <div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="perisai-tata">
        <div class="perisai" data-perisai aria-hidden="true"><span class="perisai-cincin"></span><span class="perisai-cincin dua"></span><span class="perisai-sapu"></span>
          <span class="perisai-ikon">${raw(ikon('shield', 64))}</span></div>
        <div class="perisai-teks">${kepalaPita({ pill: 'Pemindai Keamanan', sorot: 'Periksa Sekarang', sub: 'Pemeriksaan hanya MEMBACA pengaturan basis data — tidak mengubah apa pun — dan tercatat di Log Aktivitas.' })}
          <div class="perisai-skor" data-skor><p class="redup">Belum dijalankan pada sesi ini.</p></div>
          <button class="btn btn-primary btn-sinar btn-besar" data-pindai>${raw(ikon('scan', 20))} Jalankan Pemeriksaan Keamanan</button></div>
      </div>
      ${modePratinjau ? html`<p class="redup" style="position:relative;z-index:1;margin-top:12px">${raw(ikon('info', 15))} Mode pratinjau: butir basis data hanya contoh. Di Supabase, semua butir diperiksa sungguhan.</p>` : ''}
    </section>
    <section class="card rv" style="margin-bottom:24px"><div class="card-head"><span class="ubin">${raw(ikon('list-checks', 20))}</span><div><h2 class="card-title">Hasil Pemeriksaan</h2><p class="card-sub">Hijau = aman · kuning = perlu perhatian · merah = harus diperbaiki</p></div></div>
      <div data-hasil class="hasil-periksa"><p class="redup">Tekan "Jalankan Pemeriksaan Keamanan".</p></div></section>
    <div data-sehat class="rv"><div class="skel" style="height:200px;border-radius:20px"></div></div>
    <section class="card rv" style="margin-top:24px"><div class="card-head"><span class="ubin emas">${raw(ikon('clipboard-check', 20))}</span><div><h2 class="card-title">Daftar Periksa Manual (di luar aplikasi)</h2>
        <p class="card-sub">Hal yang tidak dapat diperiksa aplikasi — cek sendiri setiap 3 bulan</p></div></div>
      <ol class="daftar-manual">
        <li><b>Supabase → Authentication → Providers:</b> hanya <i>Google</i> yang aktif; Email/Password dimatikan.</li>
        <li><b>Supabase → Authentication → URL Configuration:</b> <i>Site URL</i> dan <i>Redirect URLs</i> hanya alamat resmi (Vercel / GitHub Pages).</li>
        <li><b>Supabase → Project Settings → API:</b> kunci <i>service_role</i> / <i>secret</i> tidak pernah ditempel di file web, chat, atau dokumen.</li>
        <li><b>Google Cloud → OAuth consent screen:</b> nama aplikasi & email kontak benar; Client Secret disimpan hanya di Supabase.</li>
        <li><b>Apps Script → Project Settings → Script Properties:</b> token Fonnte dan kunci rahasia tidak tertulis di kode.</li>
        <li><b>Google Drive Super Admin:</b> folder "SITASI TSKPO" tidak dibagikan "siapa saja yang memiliki link".</li>
        <li><b>Cadangan:</b> unduh cadangan minimal seminggu sekali dan simpan di 2 tempat (Drive kantor + perangkat kantor).</li>
      </ol></section>`);
  pasangEfek(el);
  const $ = (q) => el.querySelector(q);

  async function sehat() {
    try {
      const k = await api.kesehatanSistem();
      const maks = Math.max(1, ...k.tabel.map((t) => Number(t.baris) || 0));
      $('[data-sehat]').innerHTML = String(html`<div class="kpi-row kpi-5" style="margin-bottom:24px">
        <div class="kpi" data-tilt><span class="kpi-badge">${raw(ikon('rocket', 22))}</span><span class="kpi-label">Versi Terpasang</span><span class="kpi-num">${k.versi}</span><span class="kpi-note">Tahap pembangunan ${k.tahap || '—'}</span></div>
        <div class="kpi teal" data-tilt><span class="kpi-badge">${raw(ikon('database', 22))}</span><span class="kpi-label">Ukuran Basis Data</span><span class="kpi-num" style="font-size:1.6rem">${k.ukuran_db}</span><span class="kpi-note">batas paket gratis Supabase 500 MB</span></div>
        <div class="kpi sky" data-tilt><span class="kpi-badge">${raw(ikon('users', 22))}</span><span class="kpi-label">Pengguna Aktif</span><span class="kpi-num"><span data-hitung="${k.pengguna.aktif}">0</span><small>akun</small></span><span class="kpi-note">${angka(k.pengguna.login_7_hari)} login 7 hari · ${angka(k.pengguna.petugas)} petugas</span></div>
        <div class="kpi gold" data-tilt><span class="kpi-badge">${raw(ikon('hard-drive', 22))}</span><span class="kpi-label">Berkas Tersimpan</span><span class="kpi-num"><span data-hitung="${k.berkas.jumlah}">0</span><small>berkas</small></span><span class="kpi-note">${ukuranTeks(k.berkas.byte)} di Google Drive</span></div>
        <div class="kpi coral" data-tilt><span class="kpi-badge">${raw(ikon('activity', 22))}</span><span class="kpi-label">Aktivitas 24 Jam</span><span class="kpi-num"><span data-hitung="${k.aktivitas_24jam}">0</span><small>catatan</small></span><span class="kpi-note">antrean WA/email: ${angka(k.antrean.antri)} antri · ${angka(k.antrean.gagal)} gagal</span></div></div>
        <div class="grid grid-2">
          <section class="card"><div class="card-head"><span class="ubin biru">${raw(ikon('wifi', 20))}</span><div><h2 class="card-title">Pembaruan Langsung (Realtime)</h2><p class="card-sub">Tabel yang mengirim perubahan seketika ke layar pengguna</p></div></div>
            <div class="chips">${k.realtime.map((t) => html`<span class="badge b-ok kecil">${raw(ikon('zap', 12))} ${t}</span>`)}</div>
            <p class="help" style="margin-top:12px">Agar hemat kuota, sambungan dijeda otomatis bila tab tidak dibuka lebih dari 5 menit dan tersambung lagi saat tab dibuka. Status tampil di bilah atas (titik hijau).</p></section>
          <section class="card"><div class="card-head"><span class="ubin">${raw(ikon('bar', 20))}</span><div><h2 class="card-title">Tabel Terbesar</h2><p class="card-sub">Jumlah baris (perkiraan) dan ukuran</p></div></div>
            <div class="g-batang">${k.tabel.slice(0, 8).map((t, i) => html`<div class="g-baris" style="--w:${Math.max(2, (Number(t.baris) / maks) * 100)}%;--c:#3E66B3;--i:${i}" data-tip="${t.nama}: ${angka(t.baris)} baris · ${t.ukuran}" tabindex="0">
              <span class="g-label">${t.nama}</span><span class="g-trek"><span class="g-isi"></span></span><span class="g-nilai">${t.ukuran}</span></div>`)}</div></section></div>`);
      segarkanEfek(el);
    } catch (e) { $('[data-sehat]').innerHTML = String(kotakGalat(pesanGalat(e))); }
  }
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-pindai]'); if (!b) return;
    const pulih = tombolMuat(b, 'Memeriksa…');
    $('[data-perisai]').classList.add('memindai');
    $('[data-hasil]').innerHTML = String(html`${[1, 2, 3, 4].map(() => html`<div class="skel skel-baris" style="height:56px;border-radius:14px;margin-bottom:10px"></div>`)}`);
    try {
      const r = await api.periksaKeamanan();
      const n = { lulus: 0, peringatan: 0, gagal: 0 }; r.hasil.forEach((h) => { n[h.status] = (n[h.status] || 0) + 1; });
      const skor = Math.round((n.lulus / r.hasil.length) * 100);
      $('[data-perisai]').classList.remove('memindai');
      $('[data-perisai]').classList.toggle('aman', !n.gagal);
      $('[data-perisai]').classList.toggle('bahaya', !!n.gagal);
      $('[data-skor]').innerHTML = String(html`<div class="skor-tata">${cincin(skor, { ukuran: 120, label: skor + '%', sub: 'lulus', warna: n.gagal ? '#F08A74' : n.peringatan ? '#F2C94C' : '#5FD39B' })}
        <div><b class="skor-judul">${n.gagal ? 'Ada yang harus diperbaiki' : n.peringatan ? 'Aman, ada yang perlu diperhatikan' : 'Semua pemeriksaan lulus'}</b>
          <p>${angka(n.lulus)} lulus · ${angka(n.peringatan)} perlu perhatian · ${angka(n.gagal)} gagal</p><small class="redup">Diperiksa ${tanggalJam(r.waktu)}</small></div></div>`);
      $('[data-hasil]').innerHTML = String(html`${r.hasil.map((h, i) => html`<div class="butir-periksa ${h.status}" style="--i:${i}">
        <span class="bp-ikon">${raw(ikon(IKON_ST[h.status]?.[0] || 'info', 22))}</span><div><b>${h.judul}</b><p>${h.detail}</p></div><span class="bp-label">${IKON_ST[h.status]?.[1] || h.status}</span></div>`)}`);
      toast(n.gagal ? `${n.gagal} butir gagal. Lihat rincian di bawah.` : 'Pemeriksaan selesai.', n.gagal ? 'peringatan' : 'sukses');
    } catch (err) { $('[data-perisai]').classList.remove('memindai'); $('[data-hasil]').innerHTML = String(kotakGalat(pesanGalat(err))); }
    pulih();
  });
  sehat();
}
