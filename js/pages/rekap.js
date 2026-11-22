// W-05 Rekap Data Pencairan (format 2026-DATA ATENSI RSTSKPO.xlsx) dan mode Koreksi oleh Pokja Keuangan.
import { html, raw, angka, tanggal, tanggalJam, debounce } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { swr, hapusCache, bus } from '../core/store.js';
import { judulHalaman, kosong, kotakGalat, skelTabel, hitungNaik, pasangReveal, pesanGalat, toast, tombolMuat, bukaModal } from '../core/ui.js';
import { kpi, opsi, tabs, namaUnduhan, pokjaCepat } from '../core/komp.js';
import { MAK, KLASTER, rupiah } from '../core/bnba.js';
import { unduhExcel } from '../core/xlsx.js';
import * as P from '../core/peran.js';

const KOREKSI = [['mak', 'Mata Anggaran (MAK)'], ['nama', 'Nama Pengusul'], ['uraian', 'Uraian Bantuan'], ['kota_kab', 'Kota / Kab'], ['nilai_bantuan', 'Nilai Bantuan'], ['sp2d', 'Nomor SP2D'], ['petugas_penyalur', 'Petugas Penyalur']];
const KOL_ASAL = { mak: null, nama: null, uraian: null, kota_kab: null, nilai_bantuan: 'nilai_bantuan_hitung', sp2d: null, petugas_penyalur: null };
const tanda = (r, k) => (r.koreksi?.[k] != null ? html` <span class="badge b-gold kecil" title="Dikoreksi Pokja Keuangan">Dikoreksi</span>` : '');

export async function render(el, { path, sesi: s }) {
  const koreksiMode = path === '/keuangan/koreksi-rekap';
  const bolehKoreksi = P.isSuperAdmin(s) || P.diPokja(s, 'KEUANGAN');
  const f = { q: '', pokja: '', mak: '', bulan: '' };
  let tab = 'daftar', rows = [];
  const pokja = await pokjaCepat();

  el.innerHTML = String(html`
    ${judulHalaman({ ...(koreksiMode
      ? { pill: 'Modul Keuangan · Rekonsiliasi SP2D & Koreksi', sorot: 'Rekap SP2D', sisa: '& Koreksi Data Rekap Pencairan',
        sub: 'Buku besar realisasi SP2D per usulan. Pokja Keuangan dapat mengoreksi MAK, uraian, nilai, nomor SP2D, dan petugas penyalur; nilai hitungan asli tetap tersimpan dan setiap koreksi wajib beralasan.' }
      : { pill: 'Monitoring Anggaran & Realisasi DIPA 2026', sorot: 'Rekap Data Pencairan', sisa: '(DATA ATENSI 2026)',
        sub: 'Rekapitulasi otomatis berbasis usulan SK dari BNBA sesuai format resmi 2026-DATA ATENSI RSTSKPO.xlsx. Satu baris mewakili satu usulan pencairan.' }),
      aksi: String(html`<span class="status-chip"><span class="titik"></span>Sinkron otomatis dari BNBA</span>
        <button class="btn btn-secondary" data-cetak>${raw(ikon('printer', 18))} Cetak Lembar</button>
        <button class="btn btn-primary" data-ekspor>${raw(ikon('download', 18))} Ekspor Rekap (.xlsx)</button>`) })}
    <section class="band band-kpi rv" data-band><div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div><div class="kpi-row" style="margin:0">${[1, 2, 3, 4].map(() => html`<div class="skel gelap" style="height:148px;border-radius:20px"></div>`)}</div></section>
    <div style="margin:24px 0 16px" data-tabs></div>
    <section class="card filter-card" style="margin-bottom:16px"><div class="filter-baris">
      <label class="input-ikon" style="flex:2 1 240px">${raw(ikon('search', 18))}<input class="input" data-q placeholder="Cari uraian, judul, No. SK / register" aria-label="Cari"></label>
      <select class="select" data-f="pokja" aria-label="Pokja">${opsi(pokja.filter((p) => p.kelompok === 'teknis').map((p) => [p.id, 'Pokja ' + p.nama_pendek]), '', 'Semua Pokja')}</select>
      <select class="select" data-f="mak" aria-label="MAK">${opsi(Object.entries(MAK).map(([k, v]) => [k, `${k} — ${v}`]), '', 'Semua MAK')}</select>
      <select class="select" data-f="bulan" aria-label="Bulan SP2D">${opsi(['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'], '', 'Semua bulan SP2D')}</select>
      <button class="btn btn-ghost" data-reset>${raw(ikon('refresh', 16))} Reset</button></div>
      ${koreksiMode ? html`<div class="info-card emas" style="margin-top:12px">${raw(ikon('shield-alert', 20, 'ik'))}<span>Klik baris untuk membuka <b>Formulir Koreksi Data Rekap</b>. Nilai koreksi ditandai "Dikoreksi"; nilai asli hasil hitungan BNBA tetap tersimpan dan dapat dikembalikan.</span></div>` : ''}</section>
    <section class="card table-card" data-tabel>${skelTabel(6, 8)}</section>`);
  const $ = (q) => el.querySelector(q);

  function gambarBand() {
    const tot = rows.reduce((a, r) => a + Number(r.nilai_bantuan || 0), 0), pm = rows.reduce((a, r) => a + r.total_pm, 0);
    const n = (k) => rows.reduce((a, r) => a + (r[k] || 0), 0);
    $('[data-band]').querySelector('.kpi-row').outerHTML = String(html`<div class="kpi-row" style="margin:0">
      ${kpi({ warna: 'gelap', ikonNama: 'banknote', label: 'Total Realisasi Pencairan', nilai: angka(tot), rp: true, note: `Total ${angka(pm)} PM · ${angka(rows.length)} usulan` })}
      ${kpi({ warna: 'gelap', ikonNama: 'briefcase', label: '1. Kewirausahaan (KWU)', nilai: n('kwu'), satuan: 'PM', note: 'MAK 571111 / 571112' })}
      ${kpi({ warna: 'gelap', ikonNama: 'heart-handshake', label: '2. Sembako / Kebersihan / Nutrisi', nilai: n('phl'), satuan: 'PM', note: 'Jenis bantuan PHL' })}
      ${kpi({ warna: 'gelap', ikonNama: 'arrow-up-right', label: '3. Pemulangan / Transportasi', nilai: n('pemulangan'), satuan: 'PM', note: 'Jenis bantuan PEMULANGAN' })}</div>`);
    pasangReveal(el, { segera: true }); hitungNaik($('[data-band]'));
  }
  function gambarTabel() {
    $('[data-tabs]').innerHTML = String(tabs([['daftar', 'Tab 1: Daftar Usulan Pencairan', rows.length], ['wilayah', 'Tab 2: Rekapitulasi per Provinsi / Kab-Kota × Bulan SP2D']], tab));
    if (!rows.length) { $('[data-tabel]').innerHTML = String(kosong({ ikonNama: 'rekap', judul: 'Belum ada data pencairan', teks: 'Baris rekap dibuat otomatis saat usulan melewati Tahap 4c (Sekretariat).' })); return; }
    if (tab === 'wilayah') {
      const g = {};
      rows.forEach((r) => { const k = `${r.provinsi || '—'}|${r.kota_kab || '—'}|${r.bulan_sp2d || 'Belum SP2D'}`; const x = g[k] ||= { pm: 0, nilai: 0, kwu: 0, phl: 0, pul: 0, n: 0 };
        x.pm += r.total_pm; x.nilai += Number(r.nilai_bantuan || 0); x.kwu += r.kwu; x.phl += r.phl; x.pul += r.pemulangan; x.n++; });
      $('[data-tabel]').innerHTML = String(html`<div class="table-wrap"><table class="tbl"><thead><tr><th>Provinsi</th><th>Kab / Kota</th><th>Bulan SP2D</th><th class="kanan">Usulan</th><th class="kanan">KWU</th><th class="kanan">Sembako</th><th class="kanan">Pemulangan</th><th class="kanan">Total PM</th><th class="kanan">Nilai Bantuan</th></tr></thead><tbody>
        ${Object.entries(g).sort().map(([k, x]) => { const [p, kk, b] = k.split('|'); return html`<tr><td><b>${p}</b></td><td>${kk}</td><td>${b}</td><td class="kanan angka">${x.n}</td><td class="kanan angka">${x.kwu}</td><td class="kanan angka">${x.phl}</td><td class="kanan angka">${x.pul}</td><td class="kanan angka"><b>${angka(x.pm)}</b></td><td class="kanan angka">${rupiah(x.nilai)}</td></tr>`; })}
      </tbody></table></div>`);
      return;
    }
    const sum = (k) => rows.reduce((a, r) => a + Number(r[k] || 0), 0);
    $('[data-tabel]').innerHTML = String(html`<div class="card-head" style="padding:20px 20px 8px"><span class="ubin">${raw(ikon('rekap', 20))}</span><div><h2 class="card-title">Matriks Pencairan Anggaran &amp; Petugas Penyalur Lapangan</h2>
        <p class="card-sub">Kolom mengikuti 2026-DATA ATENSI RSTSKPO.xlsx. ${koreksiMode ? 'Klik baris untuk mengoreksi.' : ''}</p></div></div>
      <div class="table-wrap"><table class="tbl rekap"><thead><tr><th>No</th><th>MAK</th><th>Nama Pengusul (Pokja)</th><th>Uraian Bantuan</th><th>Kota / Kab</th><th>Petugas Penyalur</th>
        <th class="kanan">KWU</th><th class="kanan">Sembako</th><th class="kanan">Pemulangan</th><th class="kanan">Nilai Bantuan</th><th>No &amp; Tgl SK</th><th>SP2D &amp; Tgl</th><th class="kanan">Total PM</th><th>Klaster</th></tr></thead><tbody>
      ${rows.map((r, i) => html`<tr class="${koreksiMode && bolehKoreksi ? 'baris-klik' : ''}" data-koreksi="${r.usulan_id}" tabindex="${koreksiMode ? 0 : -1}">
        <td class="angka">${i + 1}</td><td><span class="badge b-proc kecil mono">${r.mak}</span>${tanda(r, 'mak')}</td><td><b>${r.nama_pengusul}</b>${tanda(r, 'nama')}<small class="mono redup" style="display:block">${r.no_register}</small></td>
        <td class="sel-lebar">${r.uraian || '—'}${tanda(r, 'uraian')}</td><td>${r.kota_kab || '—'}${tanda(r, 'kota_kab')}</td><td>${raw(ikon('user-check', 14))} ${r.petugas_penyalur || '—'}${tanda(r, 'petugas_penyalur')}</td>
        <td class="kanan angka">${r.kwu}</td><td class="kanan angka">${r.phl}</td><td class="kanan angka">${r.pemulangan}</td><td class="kanan angka"><b>${rupiah(r.nilai_bantuan)}</b>${tanda(r, 'nilai_bantuan')}</td>
        <td>${r.no_sk || '—'}<small class="redup" style="display:block">${tanggal(r.tgl_sk)}</small></td><td class="mono">${r.sp2d || '—'}${tanda(r, 'sp2d')}<small class="redup" style="display:block">${tanggal(r.tgl_sp2d)} ${r.bulan_sp2d || ''}</small></td>
        <td class="kanan angka"><b>${r.total_pm}</b></td><td class="sel-lebar"><small>${r.klaster || '—'}</small></td></tr>`)}
      <tr class="baris-total"><td colspan="6">Σ TOTAL KUMULATIF (${angka(rows.length)} usulan tercatat)</td><td class="kanan angka">${angka(sum('kwu'))}</td><td class="kanan angka">${angka(sum('phl'))}</td>
        <td class="kanan angka">${angka(sum('pemulangan'))}</td><td class="kanan angka">${rupiah(sum('nilai_bantuan'))}</td><td colspan="2"></td><td class="kanan angka">${angka(sum('total_pm'))}</td><td></td></tr>
      </tbody></table></div>`);
  }
  async function muat() {
    try { await swr('rekap:' + JSON.stringify(f), () => api.rekapPencairan(f), (v) => { rows = v; gambarBand(); gambarTabel(); }, { ttl: 20_000 }); }
    catch (e) { $('[data-tabel]').innerHTML = String(kotakGalat(pesanGalat(e))); }
  }
  function formKoreksi(r) {
    const m = bukaModal({ judul: 'Formulir Koreksi Data Rekap', laci: true,
      isi: String(html`<p class="redup">${r.no_register} · ${r.judul}</p>
        <div class="info-card emas" style="margin:12px 0">${raw(ikon('info', 20, 'ik'))}<span>Kosongkan isian untuk mengembalikan ke nilai asli hasil hitungan BNBA. Setiap koreksi tercatat di audit log beserta alasannya.</span></div>
        ${KOREKSI.map(([k, l]) => html`<div class="field" style="margin-bottom:16px"><label class="label" for="ko-${k}">${l}${r.koreksi?.[k] != null ? html` <span class="badge b-gold kecil">Koreksi aktif</span>` : ''}</label>
          ${k === 'mak' ? html`<select class="select" id="ko-${k}" name="${k}">${opsi(Object.entries(MAK).map(([a, b]) => [a, `${a} — ${b}`]), r.koreksi?.mak ?? '', 'Nilai asli (otomatis)')}</select>`
            : html`<input class="input" id="ko-${k}" name="${k}" value="${r.koreksi?.[k] ?? ''}" placeholder="Nilai asli: ${KOL_ASAL[k] ? r[KOL_ASAL[k]] : r.koreksi?.[k] != null ? '(lihat riwayat)' : (r[k === 'nama' ? 'nama_pengusul' : k] ?? '—')}">`}
          <div class="help">Nilai saat ini: ${k === 'nilai_bantuan' ? rupiah(r.nilai_bantuan) : r[k === 'nama' ? 'nama_pengusul' : k] ?? '—'}</div></div>`)}
        <div class="field"><label class="label" for="ko-alasan">Alasan kedinasan koreksi<span class="wajib">*</span></label><textarea id="ko-alasan" class="textarea" rows="3" placeholder="Contoh: Penyesuaian MAK karena realisasi berupa paket peralatan (bansos barang)."></textarea></div>`),
      kaki: String(html`<button class="btn btn-ghost" data-batal>Batal</button><button class="btn btn-primary" data-ok>${raw(ikon('save', 18))} Simpan Koreksi</button>`) });
    m.el.querySelector('[data-ok]').onclick = async (e) => {
      const alasan = m.el.querySelector('#ko-alasan').value.trim();
      if (!alasan) return toast('Alasan koreksi wajib diisi.', 'galat');
      const ubah = KOREKSI.map(([k]) => [k, m.el.querySelector(`[name=${k}]`).value.trim().replace(k === 'nilai_bantuan' ? /[^\d.]/g : /$^/, '')]).filter(([k, v]) => String(v) !== String(r.koreksi?.[k] ?? ''));
      if (!ubah.length) return toast('Tidak ada perubahan.', 'info');
      const pulih = tombolMuat(e.currentTarget);
      try { for (const [k, v] of ubah) await api.koreksiRekap(r.usulan_id, k, v, alasan); m.tutup(); hapusCache('rekap'); toast(`${ubah.length} kolom dikoreksi.`); muat(); }
      catch (err) { pulih(); toast(pesanGalat(err), 'galat'); }
    };
  }
  el.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; return gambarTabel(); }
    const k = e.target.closest('[data-koreksi]'); if (k && koreksiMode && bolehKoreksi) return formKoreksi(rows.find((r) => r.usulan_id === k.dataset.koreksi));
    if (e.target.closest('[data-reset]')) { Object.assign(f, { q: '', pokja: '', mak: '', bulan: '' }); el.querySelectorAll('[data-f]').forEach((x) => { x.value = ''; }); $('[data-q]').value = ''; return muat(); }
    if (e.target.closest('[data-cetak]')) return window.print();
    if (e.target.closest('[data-ulang]')) return muat();
    if (e.target.closest('[data-ekspor]')) {
      const baris = rows.map((r, i) => {
        const o = { NO: i + 1, MAK: r.mak, NAMA: r.nama_pengusul, URAIAN: r.uraian, 'KOTA/KAB': r.kota_kab, KWU: r.kwu, 'SEMBAKO/KEBERSIHAN DIRI/NUTRISI': r.phl, 'PEMULANGAN/TRANSPORTASI': r.pemulangan,
          'NILAI BANTUAN': Number(r.nilai_bantuan || 0), 'NO SK': r.no_sk || '', 'Tanggal SK': r.tgl_sk || '', SP2D: r.sp2d || '', 'Tanggal SP2D': r.tgl_sp2d || '', 'Petugas Penyalur': r.petugas_penyalur || '',
          POKJA: r.nama_pengusul, 'TOTAL PM': r.total_pm, KLASTER: r.klaster || '' };
        let jml = 0;
        KLASTER.forEach((kl) => ['KWU', 'PHL'].forEach((j) => { const v = r.rincian?.[kl]?.[j] || 0; jml += v; o[`${kl} ${j === 'PHL' ? 'SEMBAKO' : 'KWU'}`] = v; }));
        o.JUMLAH = jml; o['NO. REGISTER'] = r.no_register; o['DIKOREKSI'] = Object.keys(r.koreksi || {}).join(', ');
        return o;
      });
      await unduhExcel(namaUnduhan('Rekap-Data-Pencairan'), [{ nama: 'DATA ATENSI', baris }]);
      api.catatEkspor('rekap_pencairan', baris.length, f).catch(() => {});
    }
  });
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-koreksi]')) e.target.click(); });
  el.querySelectorAll('[data-f]').forEach((x) => x.addEventListener('change', () => { f[x.dataset.f] = x.value; muat(); }));
  $('[data-q]').addEventListener('input', debounce((e) => { f.q = e.target.value; muat(); }, 300));
  muat();
  return bus.on('usulan-berubah', () => { hapusCache('rekap'); muat(); });
}
