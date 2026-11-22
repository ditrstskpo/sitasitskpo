// Beranda Tahap 1: sesi Anda, notifikasi terbaru, progres pembangunan, pintasan.
// Dashboard Realisasi Bantuan (grafik 3D) dibangun pada Tahap 3.
import { html, raw, relatif, inisial, warnaDari } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api, modePratinjau } from '../core/api.js';
import { ambil, dariCache, bus } from '../core/store.js';
import { judulHalaman, chipPokja, pasangReveal, kosong, pesanGalat } from '../core/ui.js';
import { MODUL, TAHAP } from '../core/menu.js';
/** Tahap pembangunan terakhir yang sudah selesai dan siap diuji. */
const TAHAP_SIAP = 2;
import * as P from '../core/peran.js';

function salam() {
  const j = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false }).format(new Date()));
  return j < 11 ? 'Selamat pagi' : j < 15 ? 'Selamat siang' : j < 18 ? 'Selamat sore' : 'Selamat malam';
}

export async function render(el, { sesi: s }) {
  const pintasan = [];
  if (P.isSuperAdmin(s)) pintasan.push(MODUL.pengguna, MODUL.pokja, MODUL.log);
  if (P.bolehKelolaPengumuman(s)) pintasan.push(MODUL.pengumuman);
  pintasan.push(MODUL.master, MODUL.rekonsiliasi);
  if (P.pokjaEfektif(s).length) pintasan.push(MODUL.wsBnba);

  el.innerHTML = String(html`
    ${judulHalaman({
      pill: 'Monitoring Nasional & Realisasi Bantuan',
      sorot: 'Beranda / Dashboard', sisa: 'Realisasi Bantuan',
      sub: `${salam()}, ${s.pengguna.nama}. Grafik realisasi bantuan, sebaran provinsi, dan progres Pokja hadir pada Tahap 3; data BNBA dan alur pencairan sudah dapat dipakai.`,
      aksi: String(html`<span class="status-chip"><span class="titik"></span>${modePratinjau ? 'Mode Pratinjau' : 'Tersambung ke basis data'}</span>`),
    })}

    <div class="grid grid-2">
      <section class="card rv">
        <div class="card-head"><span class="ubin">${raw(ikon('user-circle', 22))}</span><div><h2 class="card-title">Sesi Anda</h2><p class="card-sub">Menu dan hak akses mengikuti peran berikut.</p></div></div>
        <div style="display:flex;gap:14px;align-items:center;margin-bottom:18px">
          <span class="avatar" style="--c:${warnaDari(s.pengguna.nama)};width:52px;height:52px;font-size:1rem">${inisial(s.pengguna.nama)}</span>
          <div style="min-width:0"><b style="display:block;color:var(--judul);font-size:1.125rem">${s.pengguna.nama}</b><span class="redup" style="overflow-wrap:anywhere">${s.pengguna.email}</span></div>
        </div>
        <dl class="kv">
          <div><dt>Peran aktif</dt><dd>${s.efektif.label}</dd></div>
          <div><dt>Jenis akses</dt><dd>${s.pengguna.jenis_akses === 'petugas_supermonev' ? 'Petugas Supermonev' : 'Pegawai Direktorat'}</dd></div>
          <div style="grid-column:1/-1"><dt>Pokja</dt><dd><div class="chips">${P.pokjaEfektif(s).length
            ? P.pokjaEfektif(s).map((p) => chipPokja(p, (p.jabatan === 'kapokja' ? 'Kapokja · ' : 'Anggota · ') + p.nama_pendek))
            : html`<span class="redup" style="font-weight:500">${P.isSuperAdmin(s) ? 'Super Admin melihat seluruh Pokja' : P.isDirektur(s) ? 'Direktur melihat seluruh Pokja' : 'Belum ada keanggotaan Pokja'}</span>`}</div></dd></div>
        </dl>
        ${s.efektif.simulasi ? html`<div class="info-card emas" style="margin-top:18px">${raw(ikon('shield-alert', 20))}<span>Anda sedang menyimulasikan peran ini sebagai Super Admin. Gunakan tombol "Kembali ke Super Admin" di bagian atas untuk keluar dari simulasi.</span></div>` : ''}
      </section>

      <section class="card rv" style="--tunda:60ms">
        <div class="card-head"><span class="ubin biru">${raw(ikon('bell', 22))}</span><div><h2 class="card-title">Notifikasi Terbaru</h2><p class="card-sub">Diperbarui otomatis tanpa memuat ulang halaman.</p></div>
          <span class="spacer"></span><a class="btn btn-ghost btn-sm" href="#/notifikasi">Lihat semua ${raw(ikon('arrow-right', 16, 'arah'))}</a></div>
        <div data-notif><div class="skel skel-baris"></div><div class="skel skel-baris" style="width:80%"></div><div class="skel skel-baris" style="width:60%"></div></div>
      </section>
    </div>

    <section class="band rv" style="margin-top:24px">
      <div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div>
      <span class="pill">Peta Jalan Pembangunan</span>
      <h2 style="font-size:1.75rem;font-weight:800;margin-top:12px"><span class="hl hl-sapu">Progres Pembangunan</span> SITASI TSKPO</h2>
      <p style="max-width:72ch;margin-top:8px">Aplikasi dibangun dalam 6 tahap dan setiap tahap diuji dengan data 2026 sebelum berlanjut. Menu bertanda T3–T5 di samping akan aktif sesuai tahapnya.</p>
      <div class="tahapan">${Object.entries(TAHAP).map(([n, nama]) => html`<div class="tahap-item kaca-gelap ${Number(n) <= TAHAP_SIAP ? '' : 'nanti'}">
        <span class="no">${Number(n) <= TAHAP_SIAP ? raw(ikon('check', 20)) : n}</span><b>Tahap ${n}</b><small>${nama}</small>
        <span class="status">${Number(n) <= TAHAP_SIAP ? 'Siap diuji' : Number(n) === TAHAP_SIAP + 1 ? 'Berikutnya' : 'Direncanakan'}</span></div>`)}</div>
    </section>

    <section class="rv" style="margin-top:24px">
      <h2 style="font-size:1.25rem;margin-bottom:14px">Pintasan</h2>
      <div class="grid grid-3">${pintasan.map((m) => html`<a class="card card-click" href="#${m.rute}" style="text-decoration:none;display:flex;gap:14px;align-items:center">
        <span class="ubin">${raw(ikon(m.ikon, 22))}</span><span style="flex:1;min-width:0"><b style="display:block;color:var(--judul)">${m.label}</b>
        <small class="redup">${m.tahap ? `Dibangun pada Tahap ${m.tahap}` : 'Tersedia sekarang'}</small></span>${raw(ikon('chevron-right', 20, 'redup'))}</a>`)}</div>
    </section>`);
  pasangReveal(el, { segera: true });

  const wadah = el.querySelector('[data-notif]');
  const gambar = (d) => {
    const b = d?.baris || [];
    wadah.innerHTML = String(b.length
      ? html`<div style="display:grid">${b.map((n) => html`<a href="${n.tautan || '#/notifikasi'}" class="notif-item ${n.dibaca_pada ? '' : 'baru'}" style="border-radius:12px;text-decoration:none">
          <span class="ubin ${n.jenis === 'pengumuman' ? 'emas' : 'biru'}" style="width:36px;height:36px;border-radius:12px">${raw(ikon(n.jenis === 'pengumuman' ? 'megaphone' : 'bell', 18))}</span>
          <span><span class="judul">${n.judul}</span>${n.isi ? html`<span class="isi">${n.isi}</span>` : ''}<span class="waktu">${relatif(n.dibuat_pada)}</span></span></a>`)}</div>`
      : kosong({ ikonNama: 'bell', judul: 'Belum ada notifikasi', teks: 'Pemberitahuan usulan, verifikasi, dan pengumuman penting akan muncul di sini.' }));
  };
  const c = dariCache('notif:beranda');
  if (c) gambar(c);
  try { gambar(await ambil('notif:beranda', () => api.notifikasi({ hal: 1, per: 5 }), { ttl: 20_000, paksa: !!c })); }
  catch (e) { if (!c) wadah.innerHTML = String(html`<p class="redup">${pesanGalat(e)}</p>`); }

  // notifikasi realtime → segarkan daftar
  const lepas = bus.on('notif-baru', async () => { try { gambar(await ambil('notif:beranda', () => api.notifikasi({ hal: 1, per: 5 }), { paksa: true })); } catch {} });
  return lepas;
}
