// W-07 Master BNBA (Basis Data Tunggal Penerima Manfaat): lintas Pokja, NIK penuh, data sensitif tersamar,
// paginasi server 50 baris, saringan, dan ekspor sesuai filter.
import { html, raw, angka, debounce } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { swr, bus, hapusCache } from '../core/store.js';
import { judulHalaman, kosong, kotakGalat, pager, skelTabel, hitungNaik, pesanGalat, toast, tombolMuat } from '../core/ui.js';
import { kpi, opsi, namaUnduhan, pokjaCepat } from '../core/komp.js';
import { KLASTER, PROVINSI, JENIS_BANTUAN, STATUS_BNBA, badge, rupiah, urutEkspor } from '../core/bnba.js';
import { unduhExcel } from '../core/xlsx.js';
import { pergi } from '../core/nav.js';
import * as P from '../core/peran.js';

export async function render(el, { sesi: s, query }) {
  const f = { q: (query?.get('q') || '').slice(0, 80), pokja: '', klaster: '', status: '', provinsi: '', kabkota: '', jenis: '' };
  let hal = 1;
  const pokja = await pokjaCepat();
  el.innerHTML = String(html`
    ${judulHalaman({ pill: 'Basis Data Pusat ATENSI TA 2026', sorot: 'Master BNBA', sisa: '(Basis Data Tunggal Penerima Manfaat)',
      sub: 'Data terpadu penerima manfaat lintas Pokja. NIK 16 digit unik menjadi kunci relasi seluruh alur: usulan, pencairan, dokumentasi, dan Supermonev.',
      aksi: String(html`<button class="btn btn-secondary" data-ekspor>${raw(ikon('sheet', 18))} Ekspor Excel (.xlsx)</button>
        <button class="btn btn-secondary" data-cetak>${raw(ikon('printer', 18))} Ekspor PDF</button>
        ${P.isSuperAdmin(s) ? html`<a class="btn btn-primary" href="#/pengaturan/log-aktivitas">${raw(ikon('shield', 18))} Audit Log Akses PM</a>` : ''}`) })}
    <div data-kpi><div class="kpi-row" style="--kolom:5">${[1, 2, 3, 4, 5].map(() => html`<div class="skel" style="height:148px;border-radius:20px"></div>`)}</div></div>
    <div class="info-card" style="margin-bottom:16px">${raw(ikon('shield', 20, 'ik'))}<span><b>Kode etik &amp; perlindungan data pribadi:</b> NIK ditampilkan penuh untuk identifikasi aparatur Dit. RSTSKPO.
      Nomor rekening, nama ibu kandung, No. KK, dan alamat lengkap disamarkan otomatis. Setiap ekspor dan pembukaan data lengkap tercatat di log audit.</span></div>
    <section class="card filter-card" style="margin-bottom:16px">
      <div class="filter-head">${raw(ikon('sliders', 20))}<b>Parameter Penyaringan Data Lintas Pokja</b></div>
      <div class="filter-grid">
        <label class="input-ikon">${raw(ikon('search', 18))}<input class="input" data-q value="${f.q}" placeholder="NIK (awalan) atau nama PM" aria-label="Cari NIK atau nama"></label>
        <select class="select" data-f="pokja" aria-label="Pokja">${opsi(pokja.filter((p) => p.kelompok === 'teknis').map((p) => [p.id, 'Pokja ' + p.nama_pendek]), '', 'Semua Pokja')}</select>
        <select class="select" data-f="klaster" aria-label="Klaster">${opsi(KLASTER, '', 'Semua klaster PPKS')}</select>
        <select class="select" data-f="status" aria-label="Status verifikasi">${opsi(Object.entries(STATUS_BNBA).map(([k, v]) => [k, v.l]), '', 'Semua status')}</select>
        <select class="select" data-f="provinsi" aria-label="Provinsi">${opsi(PROVINSI, '', 'Semua provinsi')}</select>
        <input class="input" data-f="kabkota" placeholder="Kab/Kota (ketik)" aria-label="Kabupaten/Kota">
        <select class="select" data-f="jenis" aria-label="Jenis bantuan">${opsi(Object.entries(JENIS_BANTUAN), '', 'Semua jenis bantuan')}</select>
        <button class="btn btn-ghost" data-reset>${raw(ikon('refresh', 16))} Reset</button>
      </div><div class="chips" data-aktif style="margin-top:12px"></div></section>
    <section class="card table-card" data-tabel>${skelTabel(8, 7)}</section>
    <div class="info-card biru" style="margin-top:16px">${raw(ikon('user-circle', 20, 'ik'))}<span><b>Telusur data PM:</b> klik baris untuk membuka Detail PM — profil 40 kolom, riwayat alur 11 tahap, pencairan &amp; rekening, dokumentasi, dan Supermonev.</span></div>`);
  const $ = (q) => el.querySelector(q);

  const aturBnba = () => ({ pokja_id: f.pokja || null });
  async function gambarKpi() {
    try {
      const r = await api.ringkasanBnba(f.pokja ? aturBnba() : {});
      const pct = (n) => (r.total ? ((n / r.total) * 100).toFixed(1).replace('.', ',') + '%' : '0%');
      $('[data-kpi]').innerHTML = String(html`<div class="kpi-row" style="--kolom:5">
        ${kpi({ ikonNama: 'users', label: 'Total Terdaftar', nilai: r.total, satuan: 'PM', note: '100% NIK unik · kunci integritas' })}
        ${kpi({ warna: 'sky', ikonNama: 'badge-check', label: 'Terverifikasi Kapokja', nilai: r.terverifikasi, satuan: 'PM', note: pct(r.terverifikasi) + ' dari total' })}
        ${kpi({ warna: 'gold', ikonNama: 'clock', label: 'Menunggu Verifikasi', nilai: r.menunggu, satuan: 'PM', note: pct(r.menunggu) + ' · antrean berjalan' })}
        ${kpi({ warna: 'coral', ikonNama: 'alert', label: 'Perlu Perbaikan', nilai: r.perlu_perbaikan, satuan: 'PM', note: pct(r.perlu_perbaikan) + ' · retur revisi' })}
        ${kpi({ warna: 'teal', ikonNama: 'landmark', label: 'Sudah Cair (Tahap 11)', nilai: r.sudah_cair, satuan: 'PM', note: `Belum cair: ${angka(r.terverifikasi - r.sudah_cair)} PM` })}</div>`);
      hitungNaik($('[data-kpi]'));
    } catch {}
  }
  const gambar = (d) => {
    const aktif = Object.entries(f).filter(([, v]) => v);
    $('[data-aktif]').innerHTML = String(aktif.length ? html`<small class="redup">Parameter aktif:</small>${aktif.map(([k, v]) => html`<button class="chip-filter" data-hapus-f="${k}">${k === 'pokja' ? 'Pokja ' + (pokja.find((p) => p.id === v)?.nama_pendek || '') : k === 'status' ? STATUS_BNBA[v]?.l : v} ${raw(ikon('x', 14))}</button>`)}` : '');
    if (!d.baris.length) { $('[data-tabel]').innerHTML = String(kosong({ ikonNama: 'database', judul: 'Tidak ada data PM', teks: 'Ubah saringan, atau tunggu usulan BNBA disetujui Kapokja agar masuk Central Database.' })); return; }
    $('[data-tabel]').innerHTML = String(html`<div class="card-head" style="padding:20px 20px 8px"><h2 class="card-title">Registri Data Penerima Manfaat (PM)</h2><span class="badge b-proc">${angka(d.total)} rekord</span></div>
      <div class="table-wrap"><table class="tbl"><thead><tr><th>No</th><th>NIK (16 digit penuh)</th><th>Nama Penerima Manfaat</th><th>Klaster PPKS</th><th>Kab/Kota &amp; Provinsi</th><th>Jenis Bantuan</th><th class="kanan">Nilai Bantuan</th><th>Pokja Pengusul</th><th>Status</th></tr></thead><tbody>
      ${d.baris.map((b, i) => html`<tr class="baris-klik" data-nik="${b.nik}" tabindex="0"><td class="angka">${(hal - 1) * 50 + i + 1}</td>
        <td class="sel-nik"><span class="mono nik">${b.nik}</span><button class="btn btn-icon kecil" data-salin="${b.nik}" title="Salin NIK" aria-label="Salin NIK ${b.nik}">${raw(ikon('copy', 14))}</button></td>
        <td><b>${b.nama}</b><small class="redup" style="display:block">${b.pekerjaan_kini || '—'} · Desil ${b.desil || '—'}</small></td>
        <td>${b.klaster_ppks ? html`<span class="badge b-lock kecil">${b.klaster_ppks}</span>` : '—'}</td>
        <td>${b.ktp_kabkota || '—'}<small class="redup" style="display:block">${b.ktp_provinsi || ''}</small></td>
        <td>${JENIS_BANTUAN[b.jenis_bantuan] || '—'}</td><td class="kanan angka">${rupiah(b.nilai_bantuan)}</td>
        <td><span class="titik-pokja" style="--c:${b.pokja?.warna}"></span>${b.pokja?.nama_pendek || '—'}<small class="mono redup" style="display:block">${b.usulan?.no_register || ''}</small></td>
        <td>${badge(STATUS_BNBA, b.status_verifikasi)}</td></tr>`)}
      </tbody></table></div>${pager({ hal, total: d.total, per: 50 })}`);
  };
  async function muat() {
    try { await swr('bnba:master:' + JSON.stringify({ f, hal }), () => api.daftarBnba({ ...f, hal, per: 50 }), gambar, { ttl: 30_000 }); }
    catch (e) { $('[data-tabel]').innerHTML = String(kotakGalat(pesanGalat(e))); }
  }
  const ubahF = () => { hal = 1; gambarKpi(); muat(); };
  el.addEventListener('click', async (e) => {
    const sl = e.target.closest('[data-salin]');
    if (sl) { e.stopPropagation(); navigator.clipboard?.writeText(sl.dataset.salin).then(() => toast('NIK disalin.', 'info')); return; }
    const r = e.target.closest('[data-nik]'); if (r) return pergi('/pm/' + r.dataset.nik);
    const pg = e.target.closest('[data-hal]'); if (pg && !pg.disabled) { hal = Number(pg.dataset.hal); return muat(); }
    const hf = e.target.closest('[data-hapus-f]');
    if (hf) { f[hf.dataset.hapusF] = ''; const x = el.querySelector(`[data-f="${hf.dataset.hapusF}"]`); if (x) x.value = ''; if (hf.dataset.hapusF === 'q') $('[data-q]').value = ''; return ubahF(); }
    if (e.target.closest('[data-reset]')) { Object.keys(f).forEach((k) => { f[k] = ''; }); el.querySelectorAll('[data-f]').forEach((x) => { x.value = ''; }); $('[data-q]').value = ''; return ubahF(); }
    if (e.target.closest('[data-cetak]')) return window.print();
    if (e.target.closest('[data-ulang]')) { hapusCache('bnba'); return muat(); }
    const ek = e.target.closest('[data-ekspor]');
    if (ek) {
      const pulih = tombolMuat(ek, 'Menyiapkan…');
      try {
        const rows = urutEkspor(await api.eksporBnba({ q: f.q, pokja_id: f.pokja, klaster: f.klaster, status: f.status, provinsi: f.provinsi, kabkota: f.kabkota, jenis_bantuan: f.jenis }));
        if (!rows.length) toast('Tidak ada data terverifikasi yang cocok dengan saringan.', 'info');
        else { await unduhExcel(namaUnduhan('Master-BNBA'), [{ nama: 'Master BNBA', baris: rows }]); toast(`${angka(rows.length)} baris diekspor. Ekspor tercatat di audit log.`); }
      } catch (err) { toast(pesanGalat(err), 'galat'); }
      pulih();
    }
  });
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-nik]')) e.target.click(); });
  el.querySelectorAll('[data-f]').forEach((x) => x.addEventListener(x.tagName === 'INPUT' ? 'input' : 'change', debounce(() => { f[x.dataset.f] = x.value.trim(); ubahF(); }, x.tagName === 'INPUT' ? 400 : 0)));
  $('[data-q]').addEventListener('input', debounce((e) => { f.q = e.target.value.trim(); ubahF(); }, 300));
  gambarKpi(); muat();
  return bus.on('usulan-berubah', () => { hapusCache('bnba'); muat(); });
}
