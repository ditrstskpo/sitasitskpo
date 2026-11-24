// Input LKS (workspace semua Pokja): formulir LKS, unggah foto & berkas langsung, impor Excel FORMAT LKS,
// pengajuan verifikasi, dan antrean verifikasi untuk Kapokja Data / Kapokja TU.
import { html, raw, angka, debounce, relatif } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { swr, hapusCache } from '../core/store.js';
import { judulHalaman, kosong, kotakGalat, pager, skelTabel, pesanGalat, toast } from '../core/ui.js';
import { opsi, namaUnduhan, pokjaCepat } from '../core/komp.js';
import { bukaImpor } from '../core/impor.js';
import { unduhExcel } from '../core/xlsx.js';
import { pasangEfek } from '../core/efek.js';
import { tabel, segmen, status, chipKlaster, tagAkr, ambilSemua, STATUS_OPSI } from './_t34.js';
import { lihatLks, bukaFormLks, KOLOM_IMPOR_LKS, ubahBarisLks, barisUnduhLks } from './_lks.js';
import * as P from '../core/peran.js';

export async function render(el, { sesi: s, query }) {
  const verifikator = P.isSuperAdmin(s) || P.diPokja(s, 'DATA', 'kapokja') || P.diPokja(s, 'TU', 'kapokja');
  const bisaLihatAntrean = verifikator || P.diPokja(s, 'DATA') || P.diPokja(s, 'TU');
  const pk = P.pokjaEfektif(s);
  const pokjaPilihan = pk.length > 1 ? pk.map((p) => [p.id, 'Pokja ' + p.nama_pendek])
    : P.isSuperAdmin(s) && !pk.length ? (await pokjaCepat()).map((p) => [p.id, 'Pokja ' + p.nama_pendek]) : null;
  let tab = query?.get('tab') === 'antrean' && bisaLihatAntrean ? 'antrean' : 'saya';
  const f = { q: '', status: '' };
  let hal = 1;

  el.innerHTML = String(html`
    ${judulHalaman({ pill: 'Workspace · Data Pendukung', sorot: 'Input LKS', sisa: 'Baru',
      sub: 'Semua Pokja dapat menginput LKS. Isi formulir atau impor Excel, unggah foto langsung dari web, lalu ajukan verifikasi ke Kapokja Data atau Kapokja TU. LKS terverifikasi tampil di menu Data LKS.',
      aksi: String(html`<button class="btn btn-secondary" data-impor>${raw(ikon('upload', 18))} Impor Excel (FORMAT LKS)</button>
        <button class="btn btn-primary" data-tambah>${raw(ikon('plus', 18))} Tambah LKS</button>`) })}
    <div data-seg class="rv"></div>
    <section class="card filter-card rv" style="margin-bottom:16px"><div class="filter-baris">
      <label class="input-ikon" style="flex:2 1 260px">${raw(ikon('search', 18))}<input class="input" data-q placeholder="Cari nama, kode, kab/kota" aria-label="Cari LKS"></label>
      <select class="select" data-f="status" aria-label="Status">${opsi(STATUS_OPSI, '', 'Semua status')}</select>
      <button class="btn btn-ghost" data-unduh-saya>${raw(ikon('download', 16))} Unduh daftar</button></div></section>
    <section class="card table-card rv" data-tabel>${skelTabel(6, 7)}</section>
    <div class="info-card biru rv" style="margin-top:16px">${raw(ikon('camera', 20, 'ik'))}<span><b>Unggah foto langsung:</b> buka LKS (klik barisnya) → bagian <b>Foto LKS</b> → <b>Tambah foto</b>.
      Di ponsel, kamera bisa langsung dipakai. Foto dikecilkan otomatis menjadi ≤ 1 MB lalu disimpan di Google Drive Super Admin.</span></div>`);
  pasangEfek(el);
  const $ = (q) => el.querySelector(q);

  const gSeg = async () => {
    const tabs = [['saya', 'LKS Pokja Saya', null]];
    if (bisaLihatAntrean) {
      try { const a = await api.daftarLks({ mode: 'antrean', per: 1 }); tabs.push(['antrean', verifikator ? 'Antrean Verifikasi' : 'Menunggu Verifikasi', a.total, a.total ? 'menunggu' : '']); }
      catch { tabs.push(['antrean', 'Antrean Verifikasi', null]); }
    }
    $('[data-seg]').innerHTML = String(segmen(tabs, tab));
  };
  const gTabel = (d) => {
    if (!d.baris.length) {
      $('[data-tabel]').innerHTML = String(tab === 'antrean'
        ? kosong({ ikonNama: 'check-circle', judul: 'Tidak ada LKS yang menunggu', teks: 'LKS yang diajukan Pokja akan muncul di sini.' })
        : kosong({ ikonNama: 'lks', judul: 'Belum ada LKS', teks: 'Tekan "Tambah LKS" atau impor dari FORMAT LKS.xlsx.', aksi: String(html`<button class="btn btn-primary" data-tambah style="margin-top:12px">${raw(ikon('plus', 18))} Tambah LKS</button>`) }));
      return;
    }
    $('[data-tabel]').innerHTML = String(html`<div class="card-head" style="padding:20px 20px 8px"><h2 class="card-title">${tab === 'antrean' ? 'LKS Menunggu Verifikasi' : 'LKS Pokja Saya'}</h2>
      <span class="badge b-proc">${angka(d.total)} LKS</span></div>
      ${tabel(d.baris, [
        ['Kode', (l) => html`<span class="mono">${l.kode}</span>`],
        ['Nama LKS', (l) => html`<div class="sel-utama"><b>${l.nama}</b><small>${[l.kabkota, l.provinsi].filter(Boolean).join(', ') || 'Wilayah belum diisi'}</small></div>`],
        ['Klaster', (l) => (l.klaster?.length ? chipKlaster(l.klaster) : html`<span class="redup">—</span>`)],
        ['Akreditasi', (l) => tagAkr(l.akreditasi)],
        ['Foto / berkas', (l) => html`<span class="badge ${l.jumlah_foto ? 'b-ok' : 'b-draft'} kecil">${raw(ikon('camera', 14))} ${l.jumlah_foto}/3</span> <span class="badge b-draft kecil">${raw(ikon('paperclip', 14))} ${l.jumlah_berkas - l.jumlah_foto}</span>`],
        ['Pokja', (l) => html`<span class="titik-pokja" style="--c:${l.warna}"></span>${l.pokja_nama}`],
        ['Status', (l) => html`${status(l.status_verifikasi)}<small class="redup" style="display:block">${relatif(l.diubah_pada)}</small>`],
        ['', (l) => html`<button class="btn btn-sm ${l.boleh_verifikasi ? 'btn-primary' : 'btn-secondary'}" data-lks="${l.id}">${l.boleh_verifikasi ? 'Periksa' : l.boleh_ubah ? 'Buka & unggah' : 'Lihat'}</button>`, 'kanan'],
      ], { atr: (l) => `class="baris-klik ${l.status_verifikasi === 'perlu_perbaikan' ? 'baris-merah' : ''}" data-lks="${l.id}" tabindex="0"` })}
      ${pager({ hal, total: d.total, per: 25 })}`);
  };
  async function muat() {
    gSeg();
    try { await swr('lks:ws:' + JSON.stringify({ tab, f, hal }), () => api.daftarLks({ ...f, mode: tab, hal, per: 25 }), gTabel, { ttl: 15_000 }); }
    catch (e) { $('[data-tabel]').innerHTML = String(kotakGalat(pesanGalat(e))); }
  }
  const segar = () => { hapusCache('lks:'); muat(); };

  el.addEventListener('click', async (e) => {
    const sg = e.target.closest('[data-seg]'); if (sg && sg.dataset.seg) { tab = sg.dataset.seg; hal = 1; return muat(); }
    const r = e.target.closest('[data-lks]'); if (r) { e.stopPropagation(); return lihatLks(r.dataset.lks, { onUbah: segar }); }
    const pg = e.target.closest('[data-hal]'); if (pg && !pg.disabled) { hal = Number(pg.dataset.hal); return muat(); }
    if (e.target.closest('[data-tambah]')) return bukaFormLks({ pokjaPilihan, onSimpan: async (l) => { segar(); setTimeout(() => lihatLks(l.id, { onUbah: segar }), 250); } });
    if (e.target.closest('[data-ulang]')) return segar();
    if (e.target.closest('[data-unduh-saya]')) {
      try {
        const rows = await ambilSemua(api.daftarLks, { ...f, mode: tab });
        await unduhExcel(namaUnduhan('LKS-' + (tab === 'antrean' ? 'Antrean' : 'Pokja')), [{ nama: 'LKS', baris: rows.map(barisUnduhLks) }]);
      } catch (err) { toast(pesanGalat(err), 'galat'); }
      return;
    }
    if (e.target.closest('[data-impor]')) {
      const opsiHtml = String(html`<div class="form-grid">
        ${pokjaPilihan ? html`<div class="field"><label class="label" for="im-pokja">Diimpor atas nama Pokja</label><select id="im-pokja" class="select">${opsi(pokjaPilihan)}</select></div>` : ''}
        ${P.isSuperAdmin(s) || P.diPokja(s, 'DATA', 'kapokja') ? html`<div class="field"><span class="label">Status hasil impor</span>
          <label class="sakelar"><input type="checkbox" id="im-verif"> Langsung terverifikasi (data resmi lama)</label>
          <div class="help">Baris dengan nilai tidak dikenal otomatis berstatus <b>Perlu Perbaikan</b> dengan catatan.</div></div>` : ''}</div>`);
      bukaImpor({
        judul: 'Impor LKS dari Excel', kolom: KOLOM_IMPOR_LKS, opsiHtml, per: 300,
        ket: 'Gunakan FORMAT LKS.xlsx (ekspor Google Form asesmen) atau template di bawah. Kolom centang klaster (BWBLP UMUM, KPO, PMIB, …) dibaca otomatis. LKS dengan nama dan kab/kota yang sama dilewati.',
        wajib: (o) => !!String(o.nama || '').trim(), ubah: ubahBarisLks, pratinjauKolom: ['_baris', 'nama', 'provinsi', 'kabkota', 'akreditasi', 'bentuk_layanan'],
        bacaOpsi: (m) => ({ pokja_id: m.querySelector('#im-pokja')?.value || null, terverifikasi: !!m.querySelector('#im-verif')?.checked }),
        kirim: (rows, uji, o) => api.imporLks(rows.map(({ _baris, ...x }) => ({ ...x, _baris })), uji, o),
        template: { nama: 'Template-Impor-LKS', data: [['LKS Contoh Sejahtera', 'Jl. Contoh No. 1', 'Jawa Barat', 'Kota Bogor', 'Nama Ketua', '0251-000000', '2010', 'Berbadan hukum', 'Aktif', '', 'B', '2023']] },
        onSelesai: segar,
      });
    }
  });
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('tr[data-lks]')) e.target.click(); });
  $('[data-q]').addEventListener('input', debounce((e) => { f.q = e.target.value.trim(); hal = 1; muat(); }, 300));
  el.querySelector('[data-f="status"]').addEventListener('change', (e) => { f.status = e.target.value; hal = 1; muat(); });
  muat();
  if (query?.get('id')) lihatLks(query.get('id'), { onUbah: segar });
}
