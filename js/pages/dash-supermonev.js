// Dashboard Supermonev — Evaluasi Hasil Pascapenyaluran (PRD 5.4 & 7.3). Hanya isian TERVERIFIKASI yang dihitung.
// Pita gelap "fajar" berisi grafik distribusi hasil, peta sebaran, dan kinerja verifikator; kartu terang berisi
// hasil per Pokja / putaran / klaster, kendala terbanyak, kendala terbaru, kinerja petugas, dan verifikasi belanja.
import { html, raw, angka, debounce } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { bus, swr, hapusCache } from '../core/store.js';
import { judulHalaman, kotakGalat, pesanGalat, kosong } from '../core/ui.js';
import { opsi, pokjaCepat } from '../core/komp.js';
import { batang, donat, kolom3d, tabelGrafik, meter, rupiahSingkat } from '../core/grafik.js';
import { gambarPeta } from '../core/peta.js';
import { pasangEfek, segarkanEfek } from '../core/efek.js';
import { rupiah } from '../core/bnba.js';
import { KLASTER, PROVINSI, kepalaPita, kartuGrafik } from './_t34.js';
import { HASIL, URUT_HASIL, lencanaHasil, cincin, bandingPendapatan, catatanPratinjau, aturMingguan, mingguanAktif, namaPutaran, daftarPutaran } from './_smv.js';
import * as P from '../core/peran.js';

export async function render(el, { sesi: s }) {
  const f = { tahun: '', putaran: '', pokja: '', provinsi: '', klaster: '' };
  const pokja = await pokjaCepat().catch(() => []);
  const verif = P.isSuperAdmin(s) || P.diPokja(s, 'SUPERMONEV', 'kapokja');
  const tugaskan = P.isSuperAdmin(s) || P.diPokja(s, 'SUPERMONEV', 'kapokja') || P.diPokja(s, 'TU', 'kapokja');
  el.innerHTML = String(html`
    <div class="latar-hidup smv-latar">
    ${judulHalaman({ pill: 'Evaluasi Hasil Pascapenyaluran', sorot: 'Dashboard Supermonev', sisa: '',
      sub: 'Apakah bantuan ATENSI benar-benar membantu PM? Dashboard ini merangkum hasil monitoring lapangan yang sudah diverifikasi Kapokja Supermonev: keberhasilan usaha, perubahan pendapatan, dan kendala.',
      aksi: String(html`<a class="btn btn-secondary" href="#/ekspor-supermonev">${raw(ikon('presentation', 18))} Ekspor PPTX &amp; Laporan</a>
        ${tugaskan ? html`<a class="btn btn-secondary" href="#/penugasan-supermonev">${raw(ikon('user-check', 18))} Penugasan</a>` : ''}
        ${verif ? html`<a class="btn btn-primary" href="#/supermonev?tab=antrean" data-tombol-antre>${raw(ikon('shield', 18))} Antrean Verifikasi</a>` : ''}`) })}
    ${catatanPratinjau()}
    <section class="card filter-card rv" style="margin-bottom:24px">
      <div class="filter-head">${raw(ikon('sliders', 20))}<b>Saring dashboard</b><span class="spacer"></span><button class="btn btn-ghost btn-sm" data-reset>${raw(ikon('refresh', 16))} Reset</button></div>
      <div class="dash-filter">
        <select class="select" data-f="tahun" aria-label="Tahun"><option value="">Semua tahun</option></select>
        <select class="select" data-f="putaran" aria-label="${namaPutaran()}">${opsi(daftarPutaran(), '', mingguanAktif() ? 'Semua minggu' : 'Semua putaran')}</select>
        <select class="select" data-f="pokja" aria-label="Pokja">${opsi(pokja.filter((p) => p.kelompok === 'teknis').map((p) => [p.id, 'Pokja ' + p.nama_pendek]), '', 'Semua Pokja')}</select>
        <select class="select" data-f="provinsi" aria-label="Provinsi">${opsi(PROVINSI, '', 'Semua provinsi')}</select>
        <select class="select" data-f="klaster" aria-label="Klaster">${opsi(KLASTER, '', 'Semua klaster')}</select>
      </div></section>
    <div data-kpi><div class="kpi-row kpi-5">${[1, 2, 3, 4, 5].map(() => html`<div class="skel" style="height:138px;border-radius:20px"></div>`)}</div></div>
    </div>
    <section class="band smv-fajar berkisi rv angkat3d" style="margin:24px 0">
      <div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div><div class="fajar-sinar" aria-hidden="true"></div>
      ${kepalaPita({ pill: 'Distribusi & Kinerja', sorot: 'Hasil Monitoring', judul: 'dan Kinerja Verifikator', sub: 'Lingkaran = persentase PM yang usahanya berhasil (termasuk berhasil dengan catatan). Arahkan kursor ke grafik untuk melihat angka.' })}
      <div class="smv-panggung" data-pita><div class="skel" style="height:300px;opacity:.15;border-radius:20px"></div></div>
    </section>
    <section class="band smv-peta rv" style="margin-bottom:24px">
      ${kepalaPita({ pill: 'Sebaran', sorot: 'Peta Monitoring', judul: 'per Provinsi', sub: 'Warna provinsi = jumlah isian terverifikasi.' })}
      <div class="dash-sorotan"><div class="peta-wadah" data-peta><div class="skel" style="height:300px;opacity:.15;border-radius:20px"></div></div></div>
      <div data-tbl-prov style="position:relative;z-index:1"></div>
    </section>
    <div class="grid grid-2" style="margin-bottom:24px"><div data-g="pokja"></div><div data-g="putaran"></div></div>
    <div class="grid grid-2" style="margin-bottom:24px"><div data-g="kendala"></div><div data-g="terbaru"></div></div>
    <div class="grid grid-2" style="margin-bottom:24px"><div data-g="klaster"></div><div data-g="petugas"></div></div>`);
  pasangEfek(el);
  const $ = (q) => el.querySelector(q);

  const kpi = (kelas, ik, label, nilai, satuan, note, opsiAngka = '') => html`<div class="kpi ${kelas}" data-tilt><span class="kpi-badge">${raw(ikon(ik, 22))}</span><span class="kpi-label">${label}</span>
    <span class="kpi-num">${nilai == null ? '—' : html`<span data-hitung="${nilai}" ${raw(opsiAngka)}>0</span>`}<small>${satuan}</small></span><span class="kpi-note">${note}</span></div>`;
  function gambar(d) {
    aturMingguan(d.mingguan);
    const satuan = mingguanAktif() ? 'isian' : 'PM';
    const sb = $('[data-f="tahun"]');
    if (sb.options.length <= 1 && d.tahun?.length) sb.innerHTML = String(html`<option value="">Semua tahun</option>${d.tahun.map((t) => html`<option value="${t}">${t}</option>`)}`);
    const ant = el.querySelector('[data-tombol-antre]');
    if (ant) ant.innerHTML = String(html`${raw(ikon('shield', 18))} Antrean Verifikasi${d.menunggu ? html` <span class="hitung">${angka(d.menunggu)}</span>` : ''}`);
    $('[data-kpi]').innerHTML = String(html`<div class="kpi-row kpi-5">
      ${kpi('', 'clipboard-check', 'Isian Terverifikasi', d.total, satuan, mingguanAktif() ? `${angka(d.jatuh_tempo)} jadwal mingguan sudah jatuh tempo` : `${angka(d.jatuh_tempo)} PM sudah jatuh tempo`)}
      ${kpi('teal', 'trending-up', 'Tingkat Keberhasilan', d.berhasil_persen, '%', 'berhasil + berhasil dengan catatan', 'data-desimal="1"')}
      ${kpi('gold', 'banknote', 'Rata-rata Kenaikan Pendapatan', d.kenaikan_rata, '%', d.bersih_rata != null ? `rata-rata ${rupiahSingkat(d.dasar_rata)} → ${rupiahSingkat(d.bersih_rata)}/bulan` : 'dibanding sebelum bantuan', 'data-desimal="1"')}
      ${kpi('sky', 'gauge', 'Cakupan Monitoring', d.cakupan, '%', mingguanAktif() ? 'jadwal jatuh tempo yang sudah terverifikasi' : 'PM jatuh tempo yang sudah terverifikasi', 'data-desimal="1"')}
      ${kpi('coral', 'users', 'Tambahan Tenaga Kerja', d.pekerja_baru, 'orang', 'direkrut PM sejak bantuan')}</div>`);

    const hasil = d.hasil.filter((x) => x.n > 0).sort((a, b) => b.n - a.n);   // urut sama dengan grafik donat agar warna cocok
    const totalAntre = (d.menunggu || 0) + (d.perbaikan || 0) + (d.belum_ditugaskan || 0);
    $('[data-pita]').innerHTML = String(html`
      <div class="sp-kiri kaca-gelap">${cincin(d.berhasil_persen || 0, { ukuran: 190, tebal: 12, label: d.berhasil_persen == null ? '—' : angka(d.berhasil_persen) + '%', sub: 'usaha berhasil', warna: '#5FD39B' })}
        <div class="sp-legenda">${URUT_HASIL.map((k) => { const x = d.hasil.find((h) => h.kode === k); return html`<div>${lencanaHasil(k)}<b>${angka(x?.n || 0)}</b></div>`; })}</div></div>
      <div class="sp-tengah kaca-gelap"><h3>Distribusi hasil penilaian</h3>
        ${donat(hasil, { tengah: satuan, ukuran: 150, warna: hasil.map((x) => HASIL[x.kode].c) })}
        <h3 style="margin-top:18px">Pendapatan bersih rata-rata per bulan</h3>${bandingPendapatan(d.dasar_rata, d.bersih_rata, { gelap: true })}</div>
      <div class="sp-kanan kaca-gelap"><h3>${raw(ikon('shield', 18))} Kinerja verifikator</h3>
        ${d.verifikator.length ? html`<div class="verifikator-daftar">${d.verifikator.map((v, i) => html`<div class="vf" style="--i:${i}"><span class="vf-av">${raw(ikon('badge-check', 18))}</span>
          <span><b>${v.nama}</b><small>rata-rata ${angka(v.rata_hari)} hari sejak diajukan</small></span><b class="vf-n">${angka(v.n)}</b></div>`)}</div>` : html`<p class="redup">Belum ada verifikasi.</p>`}
        <h3 style="margin-top:18px">Pekerjaan tertunda</h3>
        <div class="mini-statistik">
          <a class="mini-stat" href="#/supermonev?tab=antrean"><b>${angka(d.menunggu)}</b><span>Menunggu verifikasi</span></a>
          <div><b>${angka(d.perbaikan)}</b><span>Dikembalikan ke petugas</span></div>
          <a class="mini-stat" href="#/penugasan-supermonev"><b>${angka(d.belum_ditugaskan)}</b><span>Belum ditugaskan</span></a></div>
        ${!totalAntre ? html`<p class="redup" style="margin-top:8px">${raw(ikon('check-circle', 16))} Tidak ada pekerjaan tertunda.</p>` : ''}</div>`);

    gambarPeta($('[data-peta]'), { data: d.per_provinsi, label: 'isian', gelap: true }).then(() => segarkanEfek($('[data-peta]')));
    $('[data-tbl-prov]').innerHTML = String(tabelGrafik(d.per_provinsi, [['provinsi', 'Provinsi'], ['n', 'Isian', angka], ['berhasil', 'Berhasil', angka]], { ringkas: 'Lihat sebaran sebagai tabel' }));

    // hasil per Pokja: batang bertumpuk 4 warna
    const susun = d.per_pokja.length ? html`<div class="tumpuk">${d.per_pokja.map((p, i) => html`<div class="tumpuk-baris" style="--i:${i}"><span class="tb-nm"><i style="background:${p.warna}"></i>${p.label}</span>
      <span class="tb-trek">${[['berhasil', p.berhasil], ['berhasil_catatan', p.catatan], ['perlu_pendampingan', p.pendampingan], ['tidak_berhasil', p.tidak]].filter(([, n]) => n > 0)
        .map(([k, n]) => html`<i style="--w:${(n / p.n) * 100}%;--c:${HASIL[k].c}" data-tip="${HASIL[k].l}: ${angka(n)} PM" tabindex="0"></i>`)}</span><b>${angka(p.n)}</b></div>`)}
      <div class="legenda-mini">${URUT_HASIL.map((k) => html`<span><i style="background:${HASIL[k].c}"></i>${HASIL[k].l}</span>`)}</div></div>` : kosong({ ikonNama: 'chart', judul: 'Belum ada data' });
    el.querySelector('[data-g="pokja"]').innerHTML = String(kartuGrafik('Hasil per Pokja', 'Susunan hasil penilaian PM setiap Pokja pengusul', susun));
    // v2.11.0: monitoring mingguan → grafik per bulan (12 bulan terakhir); cara lama tetap per putaran
    const perBulan = (d.per_bulan_hasil || []).slice(-12).map((x) => ({ label: new Date(x.bulan + '-01T00:00:00').toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }), n: x.n, berhasil: x.berhasil }));
    el.querySelector('[data-g="putaran"]').innerHTML = String(mingguanAktif()
      ? kartuGrafik('Isian Mingguan per Bulan', 'Jumlah isian mingguan terverifikasi setiap bulan (12 bulan terakhir); minggu ke-1 = 3 bulan setelah cair',
        html`${kolom3d(perBulan, { warna: '#8C6A3E', satuan: 'isian' })}${tabelGrafik(perBulan, [['label', 'Bulan'], ['n', 'Isian', angka], ['berhasil', 'Berhasil', angka]])}`, { tunda: 60 })
      : kartuGrafik('Isian per Putaran Monitoring', 'Putaran 1 = 3 bulan setelah cair, putaran 2 = 6 bulan, dst.',
        html`${kolom3d(d.per_putaran, { warna: '#8C6A3E', satuan: 'isian' })}${tabelGrafik(d.per_putaran, [['label', 'Putaran'], ['n', 'Isian', angka], ['berhasil', 'Berhasil', angka]])}`, { tunda: 60 }));
    el.querySelector('[data-g="kendala"]').innerHTML = String(kartuGrafik('Kendala Terbanyak', 'Dikelompokkan otomatis dari isian kendala petugas (satu isian bisa lebih dari satu kendala)',
      html`${batang(d.kendala, { warna: '#D9644A', tipLabel: 'PM', maks: 9 })}${tabelGrafik(d.kendala, [['label', 'Kendala'], ['n', 'PM', angka]])}`));
    el.querySelector('[data-g="terbaru"]').innerHTML = String(kartuGrafik('Ringkasan Kendala Terbaru', 'Ringkasan otomatis yang sudah diperiksa Kapokja Supermonev',
      d.kendala_terbaru.length ? html`<div class="kutipan-daftar">${d.kendala_terbaru.map((k) => html`<blockquote class="kutipan" style="--c:${HASIL[k.hasil]?.c || '#8A96A3'}">
        <p>${k.ringkasan}</p><footer><b>${k.nama}</b> · ${k.kabkota || ''} ${lencanaHasil(k.hasil)}</footer></blockquote>`)}</div>` : kosong({ ikonNama: 'msg', judul: 'Belum ada kendala tercatat' }), { tunda: 60 }));
    el.querySelector('[data-g="klaster"]').innerHTML = String(kartuGrafik('Isian per Klaster PPKS', 'Jumlah isian terverifikasi (dan yang berhasil) per klaster',
      html`${batang(d.per_klaster.map((x) => ({ ...x, label: x.label + ` (${angka(x.berhasil)} berhasil)` })), { warna: '#3E66B3', tipLabel: 'isian' })}${tabelGrafik(d.per_klaster, [['label', 'Klaster'], ['n', 'Isian', angka], ['berhasil', 'Berhasil', angka]])}`));
    const bl = d.belanja || {};
    el.querySelector('[data-g="petugas"]').innerHTML = String(kartuGrafik('Kinerja Petugas & Verifikasi Belanja', 'Penugasan per petugas dan kelengkapan bukti belanja / BAST',
      html`<div class="table-wrap"><table class="tbl ringkas"><thead><tr><th>Petugas</th><th class="kanan">Ditugaskan</th><th class="kanan">Selesai</th><th>Progres</th></tr></thead><tbody>
        ${d.petugas.map((p) => html`<tr><td>${p.nama}</td><td class="kanan">${angka(p.ditugaskan)}</td><td class="kanan">${angka(p.selesai)}</td><td style="min-width:140px">${meter(p.ditugaskan ? (p.selesai / p.ditugaskan) * 100 : 0, { warna: '#17824A', label: 'Progres ' + p.nama })}</td></tr>`)}
        ${!d.petugas.length ? html`<tr><td colspan="4" class="redup">Belum ada penugasan.</td></tr>` : ''}</tbody></table></div>
      <div class="belanja-ringkas"><span class="ubin emas">${raw(ikon('receipt', 20))}</span><div><b>Verifikasi belanja, BAST & inventaris</b>
        <small>${angka(bl.terverifikasi)} dari ${angka(bl.layak)} PM wajib · ${angka(bl.menunggu)} menunggu verifikasi</small>${meter(bl.layak ? (bl.terverifikasi / bl.layak) * 100 : 0, { warna: '#C99A06', label: 'Belanja terverifikasi' })}</div>
        <a class="btn btn-ghost btn-sm" href="#/verifikasi-belanja">Buka ${raw(ikon('arrow-right', 16))}</a></div>`, { tunda: 60 }));
    segarkanEfek(el);
  }
  async function muat() {
    const ff = Object.fromEntries(Object.entries(f).filter(([, v]) => v));
    try { await swr('smv:dash:' + JSON.stringify(ff), () => api.smvDashboard(ff), gambar, { ttl: 20_000 }); }
    catch (e) { $('[data-pita]').innerHTML = String(kotakGalat(pesanGalat(e))); }
  }
  el.addEventListener('change', (e) => { const x = e.target.closest('[data-f]'); if (x) { f[x.dataset.f] = x.value; muat(); } });
  el.addEventListener('click', (e) => { if (e.target.closest('[data-reset]')) { Object.keys(f).forEach((k) => { f[k] = ''; }); el.querySelectorAll('[data-f]').forEach((x) => { x.value = ''; }); muat(); } });
  const lepas = [];
  const segar = debounce(() => { hapusCache('smv:dash'); muat(); }, 600);
  try { lepas.push(await api.langgananTabel('supermonev', segar)); } catch {}
  lepas.push(bus.on('realtime-pulih', segar));
  await muat();
  return () => lepas.forEach((x) => { try { x?.(); } catch {} });
}
