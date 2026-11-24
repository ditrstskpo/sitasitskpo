// Supermonev — Formulir & Verifikasi (PRD 5.4, Tahap 5).
// • Petugas (lapangan maupun Pokja Supermonev): kartu tugas besar dengan hitung mundur jatuh tempo, isi formulir bertahap.
// • Kapokja Supermonev: antrean verifikasi (Setujui / Kembalikan beralasan), koreksi ringkasan kendala.
// • Semua pegawai: daftar isian (data resmi hanya yang terverifikasi), unduh Excel.
// • Super Admin: pengaturan jadwal (jarak bulan, jumlah putaran, jenis bantuan yang dimonitor).
import { html, raw, angka, tanggal, tanggalJam, debounce } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { bus, hapusCache } from '../core/store.js';
import { judulHalaman, kosong, kotakGalat, pesanGalat, toast, tombolMuat, skelKartu, skelTabel, pager } from '../core/ui.js';
import { opsi, namaUnduhan } from '../core/komp.js';
import { pasangEfek, segarkanEfek } from '../core/efek.js';
import { unduhExcel } from '../core/xlsx.js';
import { rupiah, chipPokjaU, JENIS_BANTUAN } from '../core/bnba.js';
import { segmen, ambilSemua } from './_t34.js';
import { HASIL, URUT_HASIL, STATUS_SMV, STATUS_BELANJA, lencanaHasil, lencanaStatus, chipJatuhTempo, sisaHari, cincin, bandingPendapatan, bukaFormSmv, bukaBelanja, catatanPratinjau } from './_smv.js';
import * as P from '../core/peran.js';

export async function render(el, { sesi: s, query }) {
  const petugas = P.isPetugas(s), pegawai = P.isPegawai(s);
  const lapangan = P.bisaSupermonev(s);
  const verif = P.isSuperAdmin(s) || P.diPokja(s, 'SUPERMONEV', 'kapokja');
  const anggotaSmv = P.diPokja(s, 'SUPERMONEV');
  let tab = query?.get('tab') || (lapangan || anggotaSmv ? 'tugas' : verif ? 'antrean' : 'semua');
  let f = { q: '', status: '', hasil: '', putaran: '', hal: 1, per: 20 }, semuaSelesai = false;
  const lepas = [];

  el.innerHTML = String(html`
    <div class="latar-hidup smv-latar">
    ${judulHalaman({ pill: petugas ? 'Monitoring Lapangan' : 'Monitoring & Evaluasi Pascapenyaluran', sorot: 'Supermonev', sisa: petugas ? '— Tugas Saya' : '— Formulir & Verifikasi',
      sub: petugas ? 'Daftar PM yang ditugaskan kepada Anda. Kunjungi PM, lalu isi formulir langkah demi langkah. Hasil dinilai otomatis dan diverifikasi Kapokja Supermonev.'
        : 'Monitoring dijadwalkan otomatis setiap 3 bulan setelah bantuan cair. Petugas mengisi formulir; Kapokja Supermonev memverifikasi. Hanya isian terverifikasi yang masuk dashboard.',
      aksi: pegawai ? String(html`<a class="btn btn-secondary" href="#/dashboard-supermonev">${raw(ikon('chart', 18))} Dashboard</a>
        ${P.isSuperAdmin(s) || P.diPokja(s, 'SUPERMONEV', 'kapokja') || P.diPokja(s, 'TU', 'kapokja') ? html`<a class="btn btn-primary" href="#/penugasan-supermonev">${raw(ikon('user-check', 18))} Penugasan Petugas</a>` : ''}`) : '' })}
    ${catatanPratinjau()}
    </div>
    <div data-segwadah class="rv" style="margin-bottom:16px"></div>
    <div data-isi class="rv">${skelKartu(3)}</div>`);
  pasangEfek(el);
  const $ = (q) => el.querySelector(q);

  // ---------------------------------------------------------------- segmen
  let jml = {};
  const gSeg = () => {
    if (petugas) { $("[data-segwadah]").innerHTML = ''; return; }
    const t = [];
    if (anggotaSmv || jml.tugas) t.push(['tugas', 'Tugas Saya', jml.tugas ?? null]);
    if (verif) t.push(['antrean', 'Antrean Verifikasi', jml.antrean ?? null, jml.antrean ? 'menunggu' : '']);
    t.push(['semua', 'Semua Isian']);
    if (P.isSuperAdmin(s)) t.push(['atur', 'Pengaturan Jadwal']);
    if (!t.some(([id]) => id === tab)) tab = t[0][0];
    $("[data-segwadah]").innerHTML = String(segmen(t, tab));
  };

  // ---------------------------------------------------------------- tugas saya
  const kartuTugas = (r) => {
    const st = r.status, tempo = sisaHari(r.jatuh_tempo);
    const aksi = st === 'ditugaskan' || st === 'draft' ? ['pencil', st === 'draft' ? 'Lanjutkan Mengisi' : 'Isi Formulir', 'btn-primary btn-sinar']
      : st === 'perlu_perbaikan' ? ['undo', 'Perbaiki Isian', 'btn-primary btn-sinar'] : ['eye', 'Lihat Isian', 'btn-secondary'];
    return html`<article class="tugas-smv st-${st} ${['ditugaskan', 'draft'].includes(st) ? 'tempo-' + tempo.kelas : ''}" data-tilt="3">
      <span class="ts-sinar" aria-hidden="true"></span>
      <div class="ts-atas"><span class="ts-putaran">${raw(ikon('repeat', 14))} Putaran ${r.putaran}</span>${['ditugaskan', 'draft', 'perlu_perbaikan'].includes(st) ? chipJatuhTempo(r.jatuh_tempo) : ''}
        <span class="spacer"></span>${r.hasil ? lencanaHasil(r.hasil) : lencanaStatus(STATUS_SMV, st)}</div>
      <h3>${r.nama}</h3>
      <p class="mono ts-nik">NIK ${r.nik}</p>
      <p class="ts-alamat">${raw(ikon('map-pin', 16))} <span>${[r.alamat, r.kelurahan, r.kecamatan, r.kabkota].filter(Boolean).join(', ')}</span></p>
      <div class="ts-info">${chipPokjaU(r)}<span>${JENIS_BANTUAN[r.jenis_bantuan] || r.jenis_bantuan || ''} · ${rupiah(r.nilai_bantuan)}</span></div>
      ${r.catatan_verifikasi && st === 'perlu_perbaikan' ? html`<div class="info-card emas">${raw(ikon('msg', 18, 'ik'))}<span><b>Perlu diperbaiki:</b> ${r.catatan_verifikasi}</span></div>` : ''}
      <div class="ts-aksi">
        <button type="button" class="btn ${aksi[2]}" data-isi-form="${r.bnba_id}" data-putaran="${r.putaran}">${raw(ikon(aksi[0], 18))} ${aksi[1]}</button>
        ${r.belanja_layak ? html`<button type="button" class="btn btn-ghost" data-belanja="${r.bnba_id}" title="Verifikasi belanja, BAST & inventaris">${raw(ikon('receipt', 18))} Belanja: ${STATUS_BELANJA[r.belanja_status]?.l || r.belanja_status}</button>` : ''}
      </div></article>`;
  };
  async function tugas() {
    const w = $('[data-isi]');
    try {
      const d = await api.smvTugasSaya();
      jml.tugas = d.ringkas.belum + d.ringkas.perbaikan || null; gSeg();
      const g = (sts) => d.baris.filter((r) => sts.includes(r.status));
      const kelompok = [['Perlu diperbaiki', 'alert', g(['perlu_perbaikan']), 'emas'], ['Belum diisi', 'pencil', g(['ditugaskan', 'draft']).sort((a, b) => String(a.jatuh_tempo).localeCompare(String(b.jatuh_tempo))), ''],
        ['Menunggu verifikasi', 'clock', g(['menunggu']), 'biru'], ['Selesai (terverifikasi)', 'check-circle', g(['terverifikasi']), 'hijau']];
      const pct = d.ringkas.total ? Math.round((d.ringkas.selesai / d.ringkas.total) * 100) : 0;
      w.innerHTML = String(html`
        <section class="band smv-fajar berkisi rv angkat3d" style="margin-bottom:24px">
          <div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div><div class="fajar-sinar" aria-hidden="true"></div>
          <div class="smv-hero">
            <div class="smv-hero-cincin">${cincin(pct, { ukuran: 150, tebal: 11, label: pct + '%', sub: 'selesai' })}</div>
            <div class="smv-hero-teks"><span class="pill">Halo, ${s.pengguna.nama.split(' ')[0]}</span>
              <h2>${d.ringkas.total ? html`Anda punya <span class="hl hl-sapu">${angka(d.ringkas.belum + d.ringkas.perbaikan)} PM</span> yang perlu dikunjungi` : 'Belum ada PM yang ditugaskan kepada Anda'}</h2>
              <p>${d.ringkas.total ? 'Mulai dari kartu yang paling dekat jatuh temponya. Formulir dapat disimpan sebagai draft dan dilanjutkan nanti.' : 'Kapokja Supermonev atau Kapokja TU akan menugaskan PM per periode. Anda akan mendapat notifikasi.'}</p>
              <div class="mini-statistik rv-anak" style="margin-top:16px">
                <div><b>${angka(d.ringkas.belum)}</b><span>Belum diisi</span></div><div><b>${angka(d.ringkas.perbaikan)}</b><span>Perlu diperbaiki</span></div>
                <div><b>${angka(d.ringkas.menunggu)}</b><span>Menunggu verifikasi</span></div><div><b>${angka(d.ringkas.selesai)}</b><span>Selesai</span></div></div></div>
            <ol class="smv-cara rv-anak" aria-label="Cara mengisi">
              <li><span>1</span><b>Kunjungi PM</b><small>Cek alamat & NIK di kartu</small></li>
              <li><span>2</span><b>Isi formulir</b><small>5 langkah, jawaban besar & jelas</small></li>
              <li><span>3</span><b>Ajukan</b><small>Kapokja Supermonev memverifikasi</small></li></ol>
          </div></section>
        ${d.baris.length ? kelompok.filter(([, , b]) => b.length).map(([judul, ik, b, warna]) => { const lipat = warna === 'hijau' && !semuaSelesai && b.length > 6;
          return html`<section class="kelompok-tugas rv">
            <h2 class="kt-judul ${warna}">${raw(ikon(ik, 22))} ${judul} <span class="hitung">${angka(b.length)}</span></h2>
            <div class="grid-tugas rv-anak">${(lipat ? b.slice(0, 6) : b).map(kartuTugas)}</div>
            ${lipat ? html`<div class="lebih-banyak"><button type="button" class="btn btn-secondary" data-semua-selesai>${raw(ikon('chevron-down', 18))} Tampilkan semua ${angka(b.length)} yang selesai</button></div>` : ''}</section>`; })
          : html`<section class="card">${kosong({ ikonNama: 'clipboard-list', judul: 'Belum ada tugas', teks: 'PM yang ditugaskan kepada Anda akan tampil di sini.' })}</section>`}`);
      segarkanEfek(el);
    } catch (e) { w.innerHTML = String(kotakGalat(pesanGalat(e))); w.querySelector('[data-ulang]')?.addEventListener('click', muat); }
  }

  // ---------------------------------------------------------------- antrean verifikasi
  const kartuAntre = (r) => html`<article class="antre-smv" data-tilt="2">
    <div class="as-kiri"><div class="ts-atas"><span class="ts-putaran">${raw(ikon('repeat', 14))} Putaran ${r.putaran}</span>${chipPokjaU(r)}</div>
      <h3>${r.nama}</h3><p class="redup">${[r.kabkota, r.provinsi].filter(Boolean).join(', ')} · kunjungan ${tanggal(r.tgl_kunjungan)}</p>
      <p class="redup">Diisi <b>${r.petugas_nama || '—'}</b> · diajukan ${tanggalJam(r.diajukan_pada)}</p>
      ${r.ringkasan_kendala ? html`<p class="ringkas-kendala">${raw(ikon('sparkles', 16))} <span>${r.ringkasan_kendala}</span></p>` : ''}</div>
    <div class="as-tengah">${bandingPendapatan(r.dasar_pendapatan, r.pendapatan_bersih)}</div>
    <div class="as-kanan"><small>Penilaian otomatis</small>${lencanaHasil(r.hasil_otomatis, { besar: true })}
      <button type="button" class="btn btn-primary btn-sinar" data-isi-form="${r.bnba_id}" data-putaran="${r.putaran}">${raw(ikon('shield', 18))} Periksa &amp; Verifikasi</button></div></article>`;
  async function antrean() {
    const w = $('[data-isi]');
    try {
      const d = await api.smvDaftar({ mode: 'antrean', per: 100 });
      jml.antrean = d.total || null; gSeg();
      w.innerHTML = String(d.baris.length ? html`<div class="info-card biru rv" style="margin-bottom:16px">${raw(ikon('info', 20, 'ik'))}<span>Periksa isian dan foto. <b>Setujui</b> bila sesuai (hasil otomatis dapat diubah dengan alasan), atau <b>Kembalikan</b> dengan catatan agar petugas memperbaiki.</span></div>
        <div class="daftar-antre rv-anak rv">${d.baris.map(kartuAntre)}</div>`
        : html`<section class="card rv">${kosong({ ikonNama: 'check-circle', judul: 'Antrean kosong', teks: 'Semua isian Supermonev sudah diverifikasi. Terima kasih!' })}</section>`);
      segarkanEfek(el);
    } catch (e) { w.innerHTML = String(kotakGalat(pesanGalat(e))); }
  }

  // ---------------------------------------------------------------- semua isian
  async function semua() {
    const w = $('[data-isi]');
    if (!w.querySelector('[data-tabel-smv]')) {
      w.innerHTML = String(html`<section class="card filter-card" style="margin-bottom:16px"><div class="filter-head">${raw(ikon('sliders', 20))}<b>Saring isian Supermonev</b>
          <span class="spacer"></span><button class="btn btn-secondary btn-sm" data-unduh>${raw(ikon('sheet', 16))} Unduh Excel</button></div>
        <div class="dash-filter"><label class="input-ikon lebar">${raw(ikon('search', 18))}<input class="input" data-q placeholder="Nama PM, NIK, atau nama petugas" aria-label="Cari" value="${f.q}"></label>
          <select class="select" data-f="status" aria-label="Status">${opsi(Object.entries(STATUS_SMV).filter(([k]) => !['ditugaskan', 'belum_ditugaskan'].includes(k)).map(([k, x]) => [k, x.l]), f.status, 'Semua status')}</select>
          <select class="select" data-f="hasil" aria-label="Hasil">${opsi(URUT_HASIL.map((k) => [k, HASIL[k].l]), f.hasil, 'Semua hasil')}</select>
          <select class="select" data-f="putaran" aria-label="Putaran">${opsi([1, 2, 3, 4].map((n) => [String(n), 'Putaran ' + n]), f.putaran, 'Semua putaran')}</select></div></section>
        <section class="card table-card" data-tabel-smv>${skelTabel(8, 7)}</section>`);
    }
    const t = w.querySelector('[data-tabel-smv]');
    try {
      const d = await api.smvDaftar({ ...Object.fromEntries(Object.entries(f).filter(([, x]) => x !== '')), mode: 'semua' });
      t.innerHTML = String(d.baris.length ? html`<div class="table-wrap"><table class="tbl"><thead><tr><th>Penerima Manfaat</th><th>Putaran</th><th>Kunjungan</th><th>Petugas</th>
          <th class="kanan">Sebelum → Bulan ini</th><th>Hasil</th><th>Status</th><th></th></tr></thead><tbody>
        ${d.baris.map((r) => html`<tr><td><b>${r.nama}</b><small class="redup" style="display:block">${chipPokjaU(r)} ${r.kabkota || ''}</small></td><td>${r.putaran}</td>
          <td>${tanggal(r.tgl_kunjungan)}</td><td>${r.petugas_nama || '—'}</td>
          <td class="kanan angka">${rupiah(r.dasar_pendapatan)} → <b>${rupiah(r.pendapatan_bersih)}</b>${r.kenaikan != null ? html`<small class="${r.kenaikan > 0 ? 'naik' : 'turun'}" style="display:block">${r.kenaikan > 0 ? '+' : ''}${angka(r.kenaikan)}%</small>` : ''}</td>
          <td>${r.hasil ? lencanaHasil(r.hasil) : html`<span class="redup">${r.hasil_otomatis ? 'Perkiraan: ' + HASIL[r.hasil_otomatis].l : '—'}</span>`}</td>
          <td>${lencanaStatus(STATUS_SMV, r.status)}</td>
          <td><button class="btn btn-ghost btn-sm" data-isi-form="${r.bnba_id}" data-putaran="${r.putaran}">${raw(ikon(r.boleh_verifikasi || r.status === 'menunggu' && verif ? 'shield' : 'eye', 16))} ${verif && r.status === 'menunggu' ? 'Verifikasi' : 'Lihat'}</button></td></tr>`)}
        </tbody></table></div>${pager({ hal: f.hal, total: d.total, per: f.per })}`
        : kosong({ ikonNama: 'clipboard-list', judul: 'Tidak ada isian sesuai saringan' }));
    } catch (e) { t.innerHTML = String(kotakGalat(pesanGalat(e))); }
  }

  // ---------------------------------------------------------------- pengaturan (Super Admin)
  async function atur() {
    const w = $('[data-isi]');
    try {
      const d = await api.smvDashboard({});
      const c = d.cfg;
      const cek = (k, j) => html`<label class="cek-pil"><input type="checkbox" data-jenis="${k}" value="${j}" ${c[k].includes(j) ? raw('checked') : ''}><span>${JENIS_BANTUAN[j] || j}</span></label>`;
      w.innerHTML = String(html`<section class="card" style="max-width:860px">
        <div class="card-head"><span class="ubin">${raw(ikon('calendar-clock', 22))}</span><div><h2 class="card-title">Pengaturan Jadwal Supermonev</h2><p class="card-sub">Berlaku untuk semua PM. Jadwal dihitung ulang otomatis dari tanggal cair.</p></div></div>
        <div class="form-grid">
          <div class="field"><label class="label" for="at-iv">Jarak monitoring (bulan setelah cair)</label><input id="at-iv" class="input" type="number" min="1" max="12" data-c="interval_bulan" value="${c.interval_bulan}"><div class="help">Bawaan PRD: 3 bulan.</div></div>
          <div class="field"><label class="label" for="at-mp">Jumlah putaran monitoring</label><input id="at-mp" class="input" type="number" min="1" max="24" data-c="maks_putaran" value="${c.maks_putaran}"><div class="help">mis. 4 putaran × 3 bulan = 1 tahun.</div></div>
          <div class="field"><label class="label" for="at-ts">Tampil berapa hari sebelum jatuh tempo</label><input id="at-ts" class="input" type="number" min="0" max="60" data-c="tampil_sebelum_hari" value="${c.tampil_sebelum_hari}"><div class="help">PM muncul di Penugasan lebih awal agar sempat ditugaskan.</div></div>
        </div>
        <div class="field" style="margin-top:16px"><span class="label">Jenis bantuan yang dimonitor Supermonev</span><div class="cek-grup">${['KWU', 'PHL', 'PEMULANGAN'].map((j) => cek('jenis_bantuan', j))}</div>
          <div class="help">Bawaan: Kewirausahaan (KWU) — penilaian membandingkan pendapatan usaha.</div></div>
        <div class="field" style="margin-top:16px"><span class="label">Jenis bantuan yang wajib verifikasi belanja / BAST / inventaris</span><div class="cek-grup">${['KWU', 'PHL', 'PEMULANGAN'].map((j) => cek('jenis_belanja', j))}</div>
          <div class="help">Hanya bantuan berupa barang / aset usaha yang tidak habis pakai.</div></div>
        <div style="display:flex;justify-content:flex-end;margin-top:20px"><button class="btn btn-primary" data-simpan-atur>${raw(ikon('save', 18))} Simpan Pengaturan</button></div></section>`);
    } catch (e) { w.innerHTML = String(kotakGalat(pesanGalat(e))); }
  }

  // ---------------------------------------------------------------- muat & interaksi
  async function muat() {
    gSeg();
    if (tab === 'tugas' || petugas) return tugas();
    if (tab === 'antrean') return antrean();
    if (tab === 'atur') return atur();
    return semua();
  }
  const segar = debounce(() => { hapusCache('smv'); muat(); }, 400);
  el.addEventListener('click', async (e) => {
    if (e.target.closest('[data-semua-selesai]')) { semuaSelesai = true; return tugas(); }
    const sg = e.target.closest('[data-seg]'); if (sg && sg.dataset.seg) { tab = sg.dataset.seg; $('[data-isi]').innerHTML = String(skelKartu(3)); return muat(); }
    const isi = e.target.closest('[data-isi-form]'); if (isi) return bukaFormSmv({ bnba_id: isi.dataset.isiForm, putaran: Number(isi.dataset.putaran), onSelesai: segar });
    const bl = e.target.closest('[data-belanja]'); if (bl) return bukaBelanja({ bnba_id: bl.dataset.belanja, onSelesai: segar });
    const hl = e.target.closest('[data-hal]'); if (hl && !hl.disabled) { f.hal = Number(hl.dataset.hal); return semua(); }
    if (e.target.closest('[data-unduh]')) {
      const b = e.target.closest('[data-unduh]'), pulih = tombolMuat(b, 'Menyiapkan…');
      try {
        const rows = await ambilSemua(api.smvDaftar, { ...Object.fromEntries(Object.entries(f).filter(([k, x]) => x !== '' && !['hal', 'per'].includes(k))), mode: 'semua' }, 200);
        await unduhExcel(namaUnduhan('Supermonev'), [{ nama: 'Supermonev', kolom: ['NAMA PM', 'NIK', 'POKJA', 'KAB/KOTA', 'PROVINSI', 'PUTARAN', 'JATUH TEMPO', 'TGL KUNJUNGAN', 'PETUGAS', 'USAHA BERJALAN', 'JENIS USAHA BERUBAH', 'USAHA BARU',
          'PENDAPATAN KOTOR', 'PENGELUARAN', 'PENDAPATAN BERSIH', 'PENDAPATAN SEBELUM BANTUAN', 'KENAIKAN (%)', 'TAMBAH PEKERJA', 'KONDISI BARANG', 'MODAL USAHA', 'SUMBER MODAL', 'KENDALA', 'RINGKASAN KENDALA',
          'HASIL OTOMATIS', 'HASIL', 'STATUS', 'VERIFIKATOR'],
        data: rows.map((r) => [r.nama, r.nik, r.pokja_nama, r.kabkota, r.provinsi, r.putaran, r.jatuh_tempo, r.tgl_kunjungan, r.petugas_nama, r.usaha_berjalan == null ? '' : r.usaha_berjalan ? 'Ya' : 'Tidak',
          r.usaha_berubah == null ? '' : r.usaha_berubah ? 'Ya' : 'Tidak', r.usaha_baru, r.pendapatan_kotor, r.pengeluaran, r.pendapatan_bersih, r.dasar_pendapatan, r.kenaikan, r.tambah_pekerja, r.kondisi_barang,
          r.modal_usaha, r.sumber_modal, r.kendala, r.ringkasan_kendala, HASIL[r.hasil_otomatis]?.l || '', HASIL[r.hasil]?.l || '', STATUS_SMV[r.status]?.l || r.status, r.diverifikasi_nama]) }]);
        toast(`${angka(rows.length)} isian diunduh.`);
      } catch (err) { toast(pesanGalat(err), 'galat'); }
      pulih(); return;
    }
    const sa = e.target.closest('[data-simpan-atur]');
    if (sa) {
      const pulih = tombolMuat(sa);
      const c = Object.fromEntries([...el.querySelectorAll('[data-c]')].map((x) => [x.dataset.c, Number(x.value)]));
      ['jenis_bantuan', 'jenis_belanja'].forEach((k) => { c[k] = [...el.querySelectorAll(`[data-jenis="${k}"]:checked`)].map((x) => x.value); });
      try { await api.aturSupermonev(c); toast('Pengaturan Supermonev tersimpan. Jadwal dihitung ulang.'); } catch (err) { toast(pesanGalat(err), 'galat'); }
      pulih();
    }
  });
  el.addEventListener('input', debounce((e) => { if (e.target.matches('[data-q]')) { f.q = e.target.value.trim(); f.hal = 1; semua(); } }, 350));
  el.addEventListener('change', (e) => { const x = e.target.closest('[data-f]'); if (x) { f[x.dataset.f] = x.value; f.hal = 1; semua(); } });

  // realtime: isian baru / berubah → segarkan
  try { lepas.push(await api.langgananTabel('supermonev', segar)); } catch {}
  try { lepas.push(await api.langgananTabel('smv_tugas', segar)); } catch {}
  lepas.push(bus.on('realtime-pulih', segar));
  if (pegawai && verif && tab !== 'antrean') api.smvDaftar({ mode: 'antrean', per: 1 }).then((d) => { jml.antrean = d.total || null; gSeg(); }).catch(() => {});
  if (pegawai && !anggotaSmv && !lapangan) {   // pegawai biasa yang ditugaskan turun lapangan
    const dt = await api.smvTugasSaya().catch(() => null); jml.tugas = dt?.ringkas?.total || null;
    if (jml.tugas && !query?.get('tab')) tab = 'tugas';
    gSeg();
  }
  await muat();
  return () => lepas.forEach((x) => { try { x?.(); } catch {} });
}
