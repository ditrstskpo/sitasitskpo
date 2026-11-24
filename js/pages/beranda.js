// Beranda / Dashboard Realisasi Bantuan (Tahap 3, PRD 5.2 & 7.5): KPI, peta sebaran 38 provinsi (3D),
// grafik kolom 3D per klaster / bulan / Pokja, donat jenis bantuan & jenis kelamin, progres Pokja,
// ringkasan data pendukung, notifikasi, dan peta jalan pembangunan.
import { html, raw, relatif, angka, inisial, warnaDari } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api, modePratinjau } from '../core/api.js';
import { ambil, dariCache, bus, hapusCache } from '../core/store.js';
import { judulHalaman, chipPokja, kosong, pesanGalat, toast, tombolMuat, kotakGalat } from '../core/ui.js';
import { opsi, pokjaCepat, namaUnduhan } from '../core/komp.js';
import { MODUL, TAHAP } from '../core/menu.js';
import { JENIS_BANTUAN, KLASTER, PROVINSI } from '../core/bnba.js';
import { kolom3d, kolomBulan, donat, batang, tabelGrafik, rupiahSingkat, PALET, persen } from '../core/grafik.js';
import { gambarPeta } from '../core/peta.js';
import { pasangEfek, segarkanEfek } from '../core/efek.js';
import { unduhExcel } from '../core/xlsx.js';
import { kepalaPita, kartuGrafik } from './_t34.js';
import * as P from '../core/peran.js';

/** Tahap pembangunan terakhir yang sudah selesai dan siap diuji. */
const TAHAP_SIAP = 4;

function salam() {
  const j = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false }).format(new Date()));
  return j < 11 ? 'Selamat pagi' : j < 15 ? 'Selamat siang' : j < 18 ? 'Selamat sore' : 'Selamat malam';
}
const STATUS_CAIR = [['cair', 'Sudah cair'], ['belum_cair', 'SK terbit, belum cair'], ['proses', 'Dalam proses']];

export async function render(el, { sesi: s }) {
  const f = { tahun: '', pokja: '', klaster: '', jenis: '', provinsi: '', status: '' };
  const pokja = await pokjaCepat();
  const teknis = pokja.filter((p) => p.kelompok === 'teknis');
  const kpiKosong = html`<div class="kpi-row kpi-5">${[1, 2, 3, 4, 5].map(() => html`<div class="skel" style="height:138px;border-radius:20px"></div>`)}</div>`;

  el.innerHTML = String(html`
    <div class="latar-hidup">
    ${judulHalaman({
      pill: 'Monitoring Nasional & Realisasi Bantuan',
      sorot: 'Beranda / Dashboard', sisa: 'Realisasi Bantuan',
      sub: `${salam()}, ${s.pengguna.nama}. Angka di halaman ini dihitung langsung dari BNBA terverifikasi; status cair mengikuti Tahap 11 (Pencairan).`,
      aksi: String(html`<span class="status-chip"><span class="titik"></span>${modePratinjau ? 'Mode Pratinjau' : 'Tersambung · realtime'}</span>
        <button class="btn btn-secondary" data-unduh>${raw(ikon('sheet', 18))} Unduh Rekap Dashboard</button>`),
    })}
    <section class="card filter-card rv" style="margin-bottom:24px">
      <div class="filter-head">${raw(ikon('sliders', 20))}<b>Saring dashboard</b><span class="spacer"></span><small class="redup" data-info-filter></small></div>
      <div class="dash-filter">
        <select class="select" data-f="tahun" aria-label="Tahun"><option value="">Semua tahun</option></select>
        <select class="select" data-f="pokja" aria-label="Pokja">${opsi(teknis.map((p) => [p.id, 'Pokja ' + p.nama_pendek]), '', 'Semua Pokja')}</select>
        <select class="select" data-f="klaster" aria-label="Klaster">${opsi(KLASTER, '', 'Semua klaster')}</select>
        <select class="select" data-f="jenis" aria-label="Jenis bantuan">${opsi(Object.entries(JENIS_BANTUAN).map(([k, v]) => [k, v.replace(/ \(.*\)/, '')]), '', 'Semua jenis bantuan')}</select>
        <select class="select" data-f="provinsi" aria-label="Provinsi">${opsi(PROVINSI, '', 'Semua provinsi')}</select>
        <select class="select" data-f="status" aria-label="Status pencairan">${opsi(STATUS_CAIR, '', 'Semua status')}</select>
        <button class="btn btn-ghost" data-reset>${raw(ikon('refresh', 16))} Reset</button>
      </div></section>
    <div data-kpi>${kpiKosong}</div>
    </div>

    <section class="band berkisi rv angkat3d" style="margin-bottom:24px">
      <div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="orb3d" aria-hidden="true"><i></i><i></i><i></i><b></b></div>
      ${kepalaPita({ pill: 'Peta Sebaran 38 Provinsi', sorot: 'Sebaran Penerima Manfaat', judul: 'ATENSI', sub: 'Warna provinsi menunjukkan jumlah PM terverifikasi. Arahkan kursor (atau ketuk) provinsi untuk melihat angkanya; peta miring mengikuti kursor.' })}
      <div class="dash-sorotan">
        <div class="peta-wadah" data-peta><div class="skel" style="height:340px;border-radius:20px;opacity:.2"></div></div>
        <div style="display:grid;gap:16px;align-content:start">
          <div class="kaca-gelap"><h3 style="font-size:1rem;margin-bottom:12px">Provinsi teratas</h3><div data-top-prov></div></div>
          <div class="kaca-gelap"><h3 style="font-size:1rem;margin-bottom:12px">Kab/Kota teratas</h3><div data-top-kab></div></div>
        </div>
      </div>
      <div data-tabel-prov style="position:relative;z-index:1"></div>
    </section>

    <div class="grid grid-2" style="margin-bottom:24px">
      <div data-g="klaster"></div><div data-g="bulan"></div>
    </div>
    <div class="grid grid-3" style="margin-bottom:24px">
      <div data-g="jenis"></div><div data-g="jk"></div><div data-g="umur"></div>
    </div>

    <section class="card rv angkat3d" style="margin-bottom:24px">
      <div class="card-head"><span class="ubin">${raw(ikon('gauge', 22))}</span><div><h2 class="card-title">Progres Pokja</h2>
        <p class="card-sub" data-bobot>Gabungan pencairan dan kelengkapan foto dokumentasi PM.</p></div>
        <span class="spacer"></span><span class="legenda-mini" data-leg-prog></span></div>
      <div data-progres><div class="skel skel-baris"></div><div class="skel skel-baris"></div><div class="skel skel-baris"></div></div>
    </section>

    <div class="grid grid-2" style="margin-bottom:24px">
      <div data-g="pokja"></div>
      <section class="card rv" style="--tunda:60ms"><div class="card-head"><span class="ubin biru">${raw(ikon('layers', 22))}</span><div><h2 class="card-title">Data Pendukung</h2>
        <p class="card-sub">Ringkasan dari modul Data LKS, Data Aster, dan Kepegawaian.</p></div></div>
        <div class="mini-statistik rv-anak" data-pendukung>${[1, 2, 3, 4, 5, 6].map(() => html`<div class="skel" style="height:76px"></div>`)}</div></section>
    </div>

    <div class="grid grid-2">
      <section class="card rv">
        <div class="card-head"><span class="ubin biru">${raw(ikon('bell', 22))}</span><div><h2 class="card-title">Notifikasi Terbaru</h2><p class="card-sub">Diperbarui otomatis tanpa memuat ulang halaman.</p></div>
          <span class="spacer"></span><a class="btn btn-ghost btn-sm" href="#/notifikasi">Lihat semua ${raw(ikon('arrow-right', 16, 'arah'))}</a></div>
        <div data-notif><div class="skel skel-baris"></div><div class="skel skel-baris" style="width:80%"></div></div>
      </section>
      <section class="card rv" style="--tunda:60ms">
        <div class="card-head"><span class="ubin">${raw(ikon('user-circle', 22))}</span><div><h2 class="card-title">Sesi Anda</h2><p class="card-sub">Menu dan hak akses mengikuti peran berikut.</p></div></div>
        <div style="display:flex;gap:14px;align-items:center;margin-bottom:16px">
          <span class="avatar" style="--c:${warnaDari(s.pengguna.nama)};width:48px;height:48px">${inisial(s.pengguna.nama)}</span>
          <div style="min-width:0"><b style="display:block;color:var(--judul)">${s.pengguna.nama}</b><span class="redup" style="overflow-wrap:anywhere">${s.efektif.label}</span></div></div>
        <div class="chips">${P.pokjaEfektif(s).length ? P.pokjaEfektif(s).map((p) => chipPokja(p, (p.jabatan === 'kapokja' ? 'Kapokja · ' : 'Anggota · ') + p.nama_pendek))
          : html`<span class="redup">${P.isSuperAdmin(s) ? 'Super Admin melihat seluruh Pokja' : P.isDirektur(s) ? 'Direktur melihat seluruh Pokja' : 'Belum ada keanggotaan Pokja'}</span>`}</div>
        ${s.efektif.simulasi ? html`<div class="info-card emas" style="margin-top:16px">${raw(ikon('shield-alert', 20))}<span>Anda sedang menyimulasikan peran ini sebagai Super Admin.</span></div>` : ''}
      </section>
    </div>

    <section class="band rv" style="margin-top:24px">
      <div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div>
      <span class="pill">Peta Jalan Pembangunan</span>
      <h2 style="font-size:1.5rem;font-weight:800;margin-top:12px"><span class="hl hl-sapu">Progres Pembangunan</span> SITASI TSKPO</h2>
      <p style="max-width:72ch;margin-top:8px">Tahap 1–4 siap diuji. Tahap 5 (Supermonev) dan 6 (integrasi & penyempurnaan) menyusul; menu bertanda T5 akan aktif sesuai tahapnya.</p>
      <div class="tahapan">${Object.entries(TAHAP).map(([n, nama]) => html`<div class="tahap-item kaca-gelap ${Number(n) <= TAHAP_SIAP ? '' : 'nanti'}">
        <span class="no">${Number(n) <= TAHAP_SIAP ? raw(ikon('check', 20)) : n}</span><b>Tahap ${n}</b><small>${nama}</small>
        <span class="status">${Number(n) <= TAHAP_SIAP ? 'Siap diuji' : Number(n) === TAHAP_SIAP + 1 ? 'Berikutnya' : 'Direncanakan'}</span></div>`)}</div>
    </section>`);
  pasangEfek(el);
  const $ = (q) => el.querySelector(q);
  let data = null, pertama = true;

  const gambarKpi = (d) => {
    const pctCair = persen(d.pm_cair, d.total_pm);
    $('[data-kpi]').innerHTML = String(html`<div class="kpi-row kpi-5">
      <div class="kpi" data-tilt><span class="kpi-badge">${raw(ikon('users', 22))}</span><span class="kpi-label">Total PM Terverifikasi</span>
        <span class="kpi-num"><span data-hitung="${d.total_pm}">0</span><small>PM</small></span><span class="kpi-note">${angka(d.total_usulan)} usulan</span></div>
      <div class="kpi gold" data-tilt><span class="kpi-badge">${raw(ikon('banknote', 22))}</span><span class="kpi-label">Nilai Bantuan</span>
        <span class="kpi-num" style="font-size:clamp(1.25rem,1.7vw,1.9rem)">${rupiahSingkat(d.nilai_total)}</span><span class="kpi-note">seluruh PM terverifikasi</span></div>
      <div class="kpi teal" data-tilt><span class="kpi-badge">${raw(ikon('check-circle', 22))}</span><span class="kpi-label">Sudah Cair</span>
        <span class="kpi-num"><span data-hitung="${d.pm_cair}">0</span><small>PM</small></span><span class="kpi-note">${pctCair}% · ${rupiahSingkat(d.nilai_cair)}</span></div>
      <div class="kpi coral" data-tilt><span class="kpi-badge">${raw(ikon('clock', 22))}</span><span class="kpi-label">SK Terbit, Belum Cair</span>
        <span class="kpi-num"><span data-hitung="${d.pm_belum_cair}">0</span><small>PM</small></span><span class="kpi-note">${rupiahSingkat(d.nilai_belum_cair)} · proses ${angka(d.pm_proses)} PM</span></div>
      <div class="kpi sky" data-tilt><span class="kpi-badge">${raw(ikon('map', 22))}</span><span class="kpi-label">Provinsi Terjangkau</span>
        <span class="kpi-num"><span data-hitung="${d.provinsi_terjangkau}">0</span><small>/ 38</small></span><span class="kpi-note">${angka(d.per_kabkota.length)}+ kab/kota</span></div>
    </div>`);
  };

  const gambar = async (d) => {
    data = d;
    // pilihan tahun dari data
    const st = $('[data-f="tahun"]');
    if (st.options.length <= 1 && d.tahun?.length) st.innerHTML = String(opsi(d.tahun.map(String), f.tahun, 'Semua tahun'));
    const aktif = Object.values(f).filter(Boolean).length;
    $('[data-info-filter]').textContent = aktif ? `${aktif} saringan aktif` : 'Menampilkan seluruh data terverifikasi';
    gambarKpi(d);
    // peta + daftar teratas
    gambarPeta($('[data-peta]'), { data: d.per_provinsi, label: 'PM', gelap: true }).then(() => segarkanEfek($('[data-peta]')));
    $('[data-top-prov]').innerHTML = String(batang(d.per_provinsi.map((x) => ({ label: x.provinsi, n: x.n })), { maks: 6, warna: '#5FD39B', tipLabel: 'PM' }));
    $('[data-top-kab]').innerHTML = String(batang(d.per_kabkota.map((x) => ({ label: x.kabkota, n: x.n })), { maks: 6, warna: '#7CC4F0', tipLabel: 'PM' }));
    $('[data-tabel-prov]').innerHTML = String(tabelGrafik(d.per_provinsi, [['provinsi', 'Provinsi'], ['n', 'PM', angka], ['nilai', 'Nilai bantuan', rupiahSingkat]], { ringkas: 'Lihat sebaran sebagai tabel' }));
    // grafik
    const g = (k, isi) => { el.querySelector(`[data-g="${k}"]`).innerHTML = String(isi); };
    g('klaster', kartuGrafik('PM per Klaster PPKS', 'Kolom 3D · tinggi kolom = jumlah PM terverifikasi', html`${kolom3d(d.per_klaster, { warna: PALET[0], satuan: 'PM' })}
      ${tabelGrafik(d.per_klaster, [['label', 'Klaster'], ['n', 'PM', angka], ['nilai', 'Nilai', rupiahSingkat]])}`));
    g('bulan', kartuGrafik('Pencairan per Bulan (SP2D)', 'Jumlah PM menurut bulan SP2D', html`${kolomBulan(d.per_bulan, { warna: PALET[1] })}
      ${tabelGrafik(d.per_bulan, [['bulan', 'Bulan'], ['n', 'PM', angka], ['nilai', 'Nilai', rupiahSingkat]])}`, { tunda: 60 }));
    g('jenis', kartuGrafik('Jenis Bantuan', 'Berdasarkan nilai bantuan', donat(d.per_jenis.map((x) => ({ ...x, label: (JENIS_BANTUAN[x.label] || x.label).replace(/ \(.*\)/, '') })), { nilai: 'nilai', format: rupiahSingkat, tengah: 'nilai' })));
    g('jk', kartuGrafik('Jenis Kelamin', 'Jumlah PM', donat(d.jenis_kelamin, { tengah: 'PM', warna: [PALET[1], PALET[4], PALET[2]] }), { tunda: 60 }));
    g('umur', kartuGrafik('Kelompok Umur', 'Dihitung dari tanggal lahir', kolom3d(d.umur, { warna: PALET[3], tinggi: 170, putarLabel: false, satuan: 'PM' }), { tunda: 120 }));
    g('pokja', kartuGrafik('PM per Pokja Pengusul', 'Warna mengikuti identitas Pokja', html`${kolom3d(d.per_pokja.map((x) => ({ ...x, _warna: x.warna, _tip: `${angka(x.n)} PM · cair ${angka(x.cair)}` })), { putarLabel: false, satuan: '' })}
      ${tabelGrafik(d.per_pokja, [['label', 'Pokja'], ['n', 'PM', angka], ['cair', 'Sudah cair', angka], ['nilai', 'Nilai', rupiahSingkat]])}`));
    // progres Pokja
    const pr = d.progres || { baris: [], bobot: {} };
    $('[data-bobot]').textContent = `Bobot: pencairan ${pr.bobot.cair ?? 50}% · foto Sebelum Usaha ${pr.bobot.foto_sebelum ?? 25}% · foto Saat Penyaluran ${pr.bobot.foto_penyaluran ?? 25}% (diatur Super Admin).`;
    $('[data-progres]').innerHTML = String(pr.baris.length ? html`<div class="prog-pokja">${pr.baris.map((b) => html`<div class="prog-baris" data-tip="${b.nama}: ${b.progres}% · ${angka(b.pm)} PM terverifikasi, ${angka(b.cair)} cair">
        <span class="nm"><span class="titik-pokja" style="--c:${b.warna}"></span><span>${b.nama}</span></span>
        <span class="prog-batang3d" style="--c:${b.warna};--w:${b.progres}%"><i></i></span><b class="pct">${b.progres}%</b>
        <small>${angka(b.pm)} PM · ${angka(b.cair)} cair · foto Sebelum Usaha kurang ${angka(b.foto_sebelum_kurang)} · foto Penyaluran kurang ${angka(b.foto_penyaluran_kurang)} · ${angka(b.usulan_aktif)} usulan aktif</small></div>`)}</div>`
      : kosong({ ikonNama: 'gauge', judul: 'Belum ada data progres', teks: 'Progres tampil setelah ada BNBA terverifikasi.' }));
    // data pendukung
    $('[data-pendukung]').innerHTML = String(html`
      <a href="#/data-lks" class="mini-stat"><b>${angka(d.lks.total)}</b><span>LKS terverifikasi · ${angka(d.lks.murni)} murni TSKPO</span></a>
      <a href="#/data-lks" class="mini-stat"><b>${angka(d.lks.multi)}</b><span>LKS multi layanan</span></a>
      <a href="#/data-aster" class="mini-stat"><b>${angka(d.aster.total)}</b><span>Target survei Aster</span></a>
      <a href="#/data-aster" class="mini-stat"><b>${angka(d.aster.pendamping)}</b><span>Pendamping lapangan (Aster)</span></a>
      <a href="#/data-kepegawaian" class="mini-stat"><b>${angka(d.pegawai.pusat)}</b><span>Pegawai kantor pusat · ${angka(d.pegawai.pendamping)} SDM pendamping</span></a>
      <a href="#/data-kepegawaian?tab=ojt" class="mini-stat"><b>${angka(d.ojt_bulan_ini)}</b><span>OJT bulan ini</span></a>`);
    if (pertama) { pertama = false; pasangEfek(el); } else segarkanEfek(el);
  };

  async function muat({ paksa = false } = {}) {
    const kunci = 'dash:' + JSON.stringify(f);
    const c = dariCache(kunci);
    if (c && !paksa) gambar(c);
    try { const d = await ambil(kunci, () => api.dashboardRealisasi(Object.fromEntries(Object.entries(f).filter(([, v]) => v))), { ttl: 30_000, paksa: paksa || !!c }); gambar(d); }
    catch (e) { if (!c) $('[data-kpi]').innerHTML = String(kotakGalat(pesanGalat(e))); }
  }

  el.querySelectorAll('[data-f]').forEach((x) => x.addEventListener('change', () => { f[x.dataset.f] = x.value; muat(); }));
  el.addEventListener('click', async (e) => {
    if (e.target.closest('[data-reset]')) { Object.keys(f).forEach((k) => { f[k] = ''; }); el.querySelectorAll('[data-f]').forEach((x) => { x.value = ''; }); return muat(); }
    if (e.target.closest('[data-ulang]')) return muat({ paksa: true });
    const u = e.target.closest('[data-unduh]');
    if (u && data) {
      const pulih = tombolMuat(u, 'Menyiapkan…');
      try {
        await unduhExcel(namaUnduhan('Dashboard-Realisasi'), [
          { nama: 'Ringkasan', baris: [{ 'Total PM terverifikasi': data.total_pm, 'Jumlah usulan': data.total_usulan, 'Nilai bantuan (Rp)': data.nilai_total, 'PM sudah cair': data.pm_cair,
            'Nilai cair (Rp)': data.nilai_cair, 'PM belum cair (SK terbit)': data.pm_belum_cair, 'PM dalam proses': data.pm_proses, 'Provinsi terjangkau': data.provinsi_terjangkau,
            Saringan: Object.entries(f).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join('; ') || 'Semua' }] },
          { nama: 'Per Provinsi', baris: data.per_provinsi.map((x) => ({ Provinsi: x.provinsi, 'Jumlah PM': x.n, 'Nilai (Rp)': x.nilai })) },
          { nama: 'Per Kab-Kota', baris: data.per_kabkota.map((x) => ({ 'Kab/Kota': x.kabkota, Provinsi: x.provinsi, 'Jumlah PM': x.n })) },
          { nama: 'Per Klaster', baris: data.per_klaster.map((x) => ({ Klaster: x.label, 'Jumlah PM': x.n, 'Nilai (Rp)': x.nilai })) },
          { nama: 'Per Jenis Bantuan', baris: data.per_jenis.map((x) => ({ Jenis: JENIS_BANTUAN[x.label] || x.label, 'Jumlah PM': x.n, 'Nilai (Rp)': x.nilai })) },
          { nama: 'Per Bulan SP2D', baris: data.per_bulan.map((x) => ({ Bulan: x.bulan, 'Jumlah PM': x.n, 'Nilai (Rp)': x.nilai })) },
          { nama: 'Per Pokja', baris: data.per_pokja.map((x) => ({ Pokja: x.label, 'Jumlah PM': x.n, 'Sudah cair': x.cair, 'Nilai (Rp)': x.nilai })) },
          { nama: 'Progres Pokja', baris: (data.progres?.baris || []).map((x) => ({ Pokja: x.nama, 'Progres (%)': x.progres, 'PM terverifikasi': x.pm, 'PM cair': x.cair,
            'Foto Sebelum Usaha ada': x.foto_sebelum, 'Foto Penyaluran ada': x.foto_penyaluran, 'Usulan aktif': x.usulan_aktif })) },
        ]);
        toast('Rekap dashboard diunduh.');
      } catch (err) { toast(pesanGalat(err), 'galat'); }
      pulih();
    }
  });
  muat();

  // notifikasi
  const wadah = $('[data-notif]');
  const gNotif = (d) => {
    const b = d?.baris || [];
    wadah.innerHTML = String(b.length
      ? html`<div style="display:grid">${b.map((n) => html`<a href="${n.tautan || '#/notifikasi'}" class="notif-item ${n.dibaca_pada ? '' : 'baru'}" style="border-radius:12px;text-decoration:none">
          <span class="ubin ${n.jenis === 'pengumuman' ? 'emas' : 'biru'}" style="width:36px;height:36px;border-radius:12px">${raw(ikon(n.jenis === 'pengumuman' ? 'megaphone' : 'bell', 18))}</span>
          <span><span class="judul">${n.judul}</span>${n.isi ? html`<span class="isi">${n.isi}</span>` : ''}<span class="waktu">${relatif(n.dibuat_pada)}</span></span></a>`)}</div>`
      : kosong({ ikonNama: 'bell', judul: 'Belum ada notifikasi', teks: 'Pemberitahuan usulan, verifikasi, tugas, dan pesan akan muncul di sini.' }));
  };
  const cn = dariCache('notif:beranda');
  if (cn) gNotif(cn);
  ambil('notif:beranda', () => api.notifikasi({ hal: 1, per: 5 }), { ttl: 20_000, paksa: !!cn }).then(gNotif).catch((e) => { if (!cn) wadah.innerHTML = String(html`<p class="redup">${pesanGalat(e)}</p>`); });

  const lepas1 = bus.on('notif-baru', () => ambil('notif:beranda', () => api.notifikasi({ hal: 1, per: 5 }), { paksa: true }).then(gNotif).catch(() => {}));
  const lepas2 = bus.on('usulan-berubah', () => { hapusCache('dash:'); muat({ paksa: true }); });
  return () => { lepas1(); lepas2(); };
}
