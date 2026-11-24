// Pengaturan > Migrasi Data 2026 (Super Admin): impor BNBA lama dari Excel (.xlsx/.csv) atau Google Sheets.
// Pindai (uji coba) dulu tanpa menyimpan; aman diulang (kunci NIK, tidak ada record ganda); delta sync sebelum cutover.
import { html, raw, angka } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { gas, gasAktif } from '../core/gas.js';
import { hapusCache } from '../core/store.js';
import { judulHalaman, toast, pesanGalat, tombolMuat, konfirmasi } from '../core/ui.js';
import { opsi, tabelObjek, pokjaCepat } from '../core/komp.js';
import { bacaBerkasTabel, cariBarisJudul } from '../core/xlsx.js';
import { petakanJudul } from '../core/bnba.js';

export async function render(el) {
  let data = [], sumberNama = '';
  const pokja = await pokjaCepat();
  el.innerHTML = String(html`${judulHalaman({ pill: 'Pengaturan Super Admin · Migrasi', sorot: 'Migrasi Data', sisa: '2026 ke Central Database BNBA',
    sub: 'Memindahkan data BNBA 2026 yang sudah ada (BNBA PENGAJUAN / 2026-DATA ATENSI) ke SITASI. Sumber hanya dibaca. Data dikelompokkan menjadi usulan per Pokja dan NO SK.' })}
    <div class="langkah-migrasi">
      <section class="card"><div class="form-section-head"><span class="no">1</span><h3>Pilih sumber data</h3></div>
        <div class="pilihan" style="--kol:2"><label><input type="radio" name="sumber" value="file" checked><span><b>Berkas Excel / CSV</b><small>Dibaca di browser Anda, tidak diunggah ke mana pun.</small></span></label>
          <label><input type="radio" name="sumber" value="sheet" ${!gasAktif() ? raw('disabled') : ''}><span><b>Google Sheets</b><small>${gasAktif() ? 'Dibaca oleh Apps Script akun Super Admin.' : 'Aktif setelah GAS_URL diisi.'}</small></span></label></div>
        <div data-sumber-file style="margin-top:16px"><label class="dropzone">${raw(ikon('upload', 28))}<b>Pilih berkas .xlsx, .xls, atau .csv</b><small>Baris judul (memuat NIK / NAMA) dicari otomatis</small><input type="file" hidden accept=".xlsx,.xls,.csv" data-berkas></label></div>
        <div data-sumber-sheet hidden style="margin-top:16px"><div class="baris-input"><input class="input" data-url placeholder="Tempel URL Google Sheets (https://docs.google.com/spreadsheets/d/…)"><button class="btn btn-secondary" data-buka-sheet>Buka</button></div>
          <div data-pilih-sheet style="margin-top:12px"></div></div></section>
      <section class="card"><div class="form-section-head"><span class="no">2</span><h3>Opsi</h3></div><div class="form-grid">
        <div class="field"><label class="label" for="m-tahun">Tahun data</label><input id="m-tahun" class="input" value="2026"></div>
        <div class="field"><label class="label" for="m-pokja">Pokja (bila tidak ada kolom POKJA)</label><select id="m-pokja" class="select">${opsi(pokja.filter((p) => p.kelompok === 'teknis').map((p) => [p.kode, p.nama_pendek]), '', 'Tebak dari KLASTER PPKS')}</select></div></div>
        <div class="info-card biru" style="margin-top:16px">${raw(ikon('info', 20, 'ik'))}<span>NIK yang sudah ada tidak digandakan; hanya kolom kosong (SP2D, rekening) yang dilengkapi. Status usulan impor: Selesai bila ada NO SP2D, Tahap 7 bila ada NO SK, selain itu Tahap 3.</span></div></section>
      <section class="card"><div class="form-section-head"><span class="no">3</span><h3>Pindai &amp; jalankan</h3></div><div data-ringkas class="redup">Pilih sumber data terlebih dahulu.</div>
        <div class="form-aksi"><button class="btn btn-secondary" data-jalan="uji" disabled>${raw(ikon('search', 18))} Pindai (uji coba)</button><span class="spacer"></span>
          <button class="btn btn-primary" data-jalan="nyata" disabled>${raw(ikon('upload', 18))} Jalankan Impor</button></div><div data-hasil style="margin-top:16px"></div></section>
    </div>`);
  const $ = (q) => el.querySelector(q);
  const siap = (baris, header, nama) => {
    const peta = petakanJudul(header);
    data = baris.map((r, i) => { const o = { _baris: i + 2 }; peta.forEach((k, j) => { if (k && r[j] !== '' && r[j] != null) o[k] = r[j]; }); return o; }).filter((o) => o.nik || o.nama);
    sumberNama = nama;
    $('[data-ringkas]').innerHTML = String(html`<div class="info-card">${raw(ikon('check-circle', 20, 'ik'))}<span><b>${nama}</b>: ${angka(data.length)} baris, ${peta.filter(Boolean).length} kolom dikenali
      (${[...new Set(peta.filter(Boolean))].slice(0, 8).join(', ')}${peta.filter(Boolean).length > 8 ? ', …' : ''}).</span></div>${tabelObjek(data.slice(0, 4), ['_baris', 'nama', 'nik', 'klaster_ppks', 'no_sk', 'no_sp2d'])}`);
    el.querySelectorAll('[data-jalan]').forEach((b) => { b.disabled = !data.length; });
    $('[data-hasil]').innerHTML = '';
  };
  el.querySelectorAll('input[name=sumber]').forEach((r) => r.onchange = () => { const s = el.querySelector('input[name=sumber]:checked').value; $('[data-sumber-file]').hidden = s !== 'file'; $('[data-sumber-sheet]').hidden = s !== 'sheet'; });
  $('[data-berkas]').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { const { sheets } = await bacaBerkasTabel(f); const sh = sheets.reduce((a, b) => (b.baris.length > a.baris.length ? b : a)); const h = cariBarisJudul(sh.baris); siap(sh.baris.slice(h + 1), sh.baris[h], `${f.name} · ${sh.nama}`); }
    catch (err) { toast(pesanGalat(err), 'galat'); }
  };
  el.addEventListener('click', async (e) => {
    const bs = e.target.closest('[data-buka-sheet]');
    if (bs) {
      const pulih = tombolMuat(bs, 'Membuka…');
      try { const r = await gas('baca_sheet', { sumber: $('[data-url]').value.trim() });
        $('[data-pilih-sheet]').innerHTML = String(html`<p><b>${r.nama}</b></p><div class="chips">${r.sheets.map((x) => html`<button class="btn btn-secondary btn-sm" data-sheet="${x.nama}">${x.nama} (${angka(x.baris)} baris)</button>`)}</div>`); }
      catch (err) { toast(pesanGalat(err), 'galat'); }
      pulih(); return;
    }
    const sh = e.target.closest('[data-sheet]');
    if (sh) {
      const pulih = tombolMuat(sh, 'Membaca…');
      try {
        let semua = [], header = [], dari = 0, total = 1;
        while (dari < total) { const r = await gas('baca_sheet', { sumber: $('[data-url]').value.trim(), sheet: sh.dataset.sheet, dari, jumlah: 2000 }); header = r.header; semua = semua.concat(r.baris); total = r.total; dari += 2000; if (!r.baris.length) break; }
        siap(semua, header, `Google Sheets · ${sh.dataset.sheet}`);
      } catch (err) { toast(pesanGalat(err), 'galat'); }
      pulih(); return;
    }
    const j = e.target.closest('[data-jalan]');
    if (j) {
      const uji = j.dataset.jalan === 'uji';
      if (!uji && !(await konfirmasi({ judul: 'Jalankan impor?', pesan: `${angka(data.length)} baris dari ${sumberNama} diimpor ke Central Database BNBA. Aman diulang tanpa data ganda.`, label: 'Jalankan impor' })).ok) return;
      const pulih = tombolMuat(j, uji ? 'Memindai…' : 'Mengimpor…');
      const t = { ditambah: 0, diperbarui: 0, dilewati: 0, usulan_baru: 0, gagal: [] };
      try {
        const opsiM = { tahun: $('#m-tahun').value.trim() || '2026', pokja_kode: $('#m-pokja').value || null, sumber: sumberNama };
        for (let i = 0; i < data.length; i += 500) {
          const r = await api.imporBnbaHistoris(data.slice(i, i + 500), uji, opsiM);
          ['ditambah', 'diperbarui', 'dilewati', 'usulan_baru'].forEach((k) => { t[k] += r[k] || 0; }); t.gagal.push(...r.gagal);
          $('[data-hasil]').innerHTML = String(html`<div class="progres"><span style="width:${Math.min(100, ((i + 500) / data.length) * 100)}%"></span></div>`);
        }
        $('[data-hasil]').innerHTML = String(html`<div class="ringkas-impor"><div><b>${angka(t.ditambah)}</b><span>${uji ? 'akan ditambah' : 'ditambah'}</span></div><div><b>${angka(t.diperbarui)}</b><span>dilengkapi</span></div>
          <div><b>${angka(t.dilewati)}</b><span>dilewati (sudah ada)</span></div>${!uji ? html`<div><b>${angka(t.usulan_baru)}</b><span>usulan dibuat</span></div>` : ''}<div class="${t.gagal.length ? 'merah' : ''}"><b>${angka(t.gagal.length)}</b><span>gagal</span></div></div>
          ${t.gagal.length ? html`<h4 style="margin:16px 0 8px">Daftar perlu diperbaiki (maks 200)</h4>${tabelObjek(t.gagal.slice(0, 200), ['baris', 'nik', 'nama', 'alasan'])}` : ''}`);
        if (!uji) { hapusCache(); toast('Migrasi selesai dan tercatat di log aktivitas.'); }
      } catch (err) { toast(pesanGalat(err), 'galat'); }
      pulih();
    }
  });
}
