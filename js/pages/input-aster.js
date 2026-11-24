// Input Aster (workspace Pokja Data): formulir 26 kolom, impor FORMAT ASTER.xlsx, pilih banyak → ajukan / hapus,
// dan antrean verifikasi Kapokja Data (setujui / kembalikan sekaligus).
import { html, raw, angka, debounce, relatif } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { swr, hapusCache } from '../core/store.js';
import { judulHalaman, kosong, kotakGalat, pager, skelTabel, pesanGalat, toast, konfirmasi, tombolMuat } from '../core/ui.js';
import { bukaImpor } from '../core/impor.js';
import { opsi } from '../core/komp.js';
import { pasangEfek } from '../core/efek.js';
import { tabel, segmen, status } from './_t34.js';
import { KOLOM_ASTER, bukaFormAster, waktuSurvei } from './_aster.js';
import * as P from '../core/peran.js';

export async function render(el, { sesi: s, query }) {
  const verifikator = P.isSuperAdmin(s) || P.diPokja(s, 'DATA', 'kapokja');
  let tab = ['kerja', 'antrean', 'resmi'].includes(query?.get('tab')) ? query.get('tab') : 'kerja';
  const f = { q: '', batch: '' };
  let hal = 1, baris = [], terakhir = { baris: [], total: 0 };
  const pilih = new Set();
  el.innerHTML = String(html`
    ${judulHalaman({ pill: 'Workspace Pokja Data', sorot: 'Input Aster', sisa: 'Baru',
      sub: 'Masukkan data asesmen lapangan satu per satu atau impor FORMAT ASTER.xlsx (26 kolom). Data diajukan ke Kapokja Data; setelah terverifikasi tampil di menu Data Aster.',
      aksi: String(html`<button class="btn btn-secondary" data-impor>${raw(ikon('upload', 18))} Impor Excel (FORMAT ASTER)</button>
        <button class="btn btn-primary" data-tambah>${raw(ikon('plus', 18))} Tambah Data</button>`) })}
    <div data-seg class="rv"></div>
    <section class="card filter-card rv" style="margin-bottom:16px"><div class="filter-baris">
      <label class="input-ikon" style="flex:2 1 260px">${raw(ikon('search', 18))}<input class="input" data-q placeholder="NIK target, nama target, atau pensurvei" aria-label="Cari"></label>
      <select class="select" data-batch aria-label="Batch"><option value="">Semua batch</option></select></div></section>
    <section class="card table-card rv" data-tabel>${skelTabel(6, 7)}</section>
    <div data-massal></div>`);
  pasangEfek(el);
  const $ = (q) => el.querySelector(q);

  const gSeg = async () => {
    const n = {};
    await Promise.all(['kerja', 'antrean'].map((m) => api.daftarAster({ mode: m, per: 1 }).then((r) => { n[m] = r.total; }).catch(() => {})));
    $('[data-seg]').innerHTML = String(segmen([['kerja', 'Draft & Perbaikan', n.kerja], ['antrean', verifikator ? 'Antrean Verifikasi' : 'Menunggu Verifikasi', n.antrean, n.antrean ? 'menunggu' : ''],
      ['resmi', 'Terverifikasi', null, 'terverifikasi']], tab));
  };
  const gMassal = () => {
    const n = pilih.size;
    if (!n || tab === 'resmi') { $('[data-massal]').innerHTML = ''; return; }
    $('[data-massal]').innerHTML = String(html`<div class="aksi-massal" role="region" aria-label="Aksi untuk data terpilih"><b>${angka(n)} data dipilih</b><span class="spacer" style="flex:1"></span>
      <button class="btn btn-sm btn-outline-white" data-batal-pilih>Batal pilih</button>
      ${tab === 'kerja' ? html`<button class="btn btn-sm btn-outline-white" data-hapus-pilih>${raw(ikon('trash', 16))} Hapus</button>
        <button class="btn btn-sm btn-white" data-ajukan-pilih>${raw(ikon('send', 16))} Ajukan ke Kapokja Data</button>` : ''}
      ${tab === 'antrean' && verifikator ? html`<button class="btn btn-sm btn-outline-white" data-kembali-pilih>${raw(ikon('undo', 16))} Kembalikan</button>
        <button class="btn btn-sm btn-white" data-setuju-pilih>${raw(ikon('check', 16))} Setujui</button>` : ''}</div>`);
  };
  const bisaPilih = () => tab === 'kerja' || (tab === 'antrean' && verifikator);
  const gTabel = (d) => {
    terakhir = d; baris = d.baris;
    const sb = $('[data-batch]');
    if (sb.options.length <= 1 && d.batch?.length) sb.innerHTML = String(opsi(d.batch, f.batch, 'Semua batch'));
    if (!d.baris.length) {
      $('[data-tabel]').innerHTML = String(kosong({ ikonNama: 'aster', judul: tab === 'kerja' ? 'Belum ada draft' : tab === 'antrean' ? 'Tidak ada yang menunggu verifikasi' : 'Belum ada data terverifikasi',
        teks: tab === 'kerja' ? 'Tambah data atau impor dari FORMAT ASTER.xlsx.' : '' }));
      gMassal(); return;
    }
    const kol = [];
    if (bisaPilih()) kol.push([`<input type="checkbox" class="cek-semua" data-cek-semua aria-label="Pilih semua di halaman ini" ${d.baris.every((a) => pilih.has(a.id)) ? 'checked' : ''}>`,
      (a) => html`<input type="checkbox" data-cek="${a.id}" aria-label="Pilih ${a.nama_target}" ${pilih.has(a.id) ? raw('checked') : ''}>`, 'pilih-sel']);
    kol.push(['Batch', (a) => html`<div class="sel-utama"><b>${a.batch}</b><small>${a.sumber === 'impor' ? 'impor' : 'web'}</small></div>`],
      ['NIK target', (a) => html`<span class="mono">${a.nik_target}</span>`],
      ['Nama target', (a) => html`<div class="sel-utama"><b>${a.nama_target}</b><small>${a.jenis_ppks || ''}</small></div>`],
      ['Wilayah', (a) => html`<div class="sel-utama">${a.kabkota || '—'}<small>${a.provinsi || ''}</small></div>`],
      ['Pensurvei', (a) => html`<div class="sel-utama">${a.nama_pensurvei || '—'}<small>${waktuSurvei(a.tgl_survei)}</small></div>`],
      ['Status', (a) => html`${status(a.status_verifikasi)}${a.catatan_verifikasi ? html`<small class="redup" style="display:block;max-width:220px">${a.catatan_verifikasi}</small>` : html`<small class="redup" style="display:block">${relatif(a.diubah_pada)}</small>`}`],
      ['', (a) => (a.boleh_ubah ? html`<button class="btn btn-sm btn-secondary" data-ubah="${a.id}">${raw(ikon('pencil', 16))} Ubah</button>` : ''), 'kanan']);
    $('[data-tabel]').innerHTML = String(html`${tabel(d.baris, kol, { atr: (a) => `class="${a.status_verifikasi === 'perlu_perbaikan' ? 'baris-merah' : ''} ${pilih.has(a.id) ? 'terpilih' : ''}"` })}${pager({ hal, total: d.total, per: 50 })}`);
    gMassal();
  };
  async function muat() {
    gSeg();
    try { await swr('aster:ws:' + JSON.stringify({ tab, f, hal }), () => api.daftarAster({ ...f, mode: tab, hal, per: 50 }), gTabel, { ttl: 10_000 }); }
    catch (e) { $('[data-tabel]').innerHTML = String(kotakGalat(pesanGalat(e))); }
  }
  const segar = () => { hapusCache('aster:'); muat(); };

  el.addEventListener('change', (e) => {
    const c = e.target.closest('[data-cek]'); if (c) { c.checked ? pilih.add(c.dataset.cek) : pilih.delete(c.dataset.cek); c.closest('tr').classList.toggle('terpilih', c.checked); return gMassal(); }
    if (e.target.closest('[data-cek-semua]')) { const on = e.target.checked; baris.forEach((a) => (on ? pilih.add(a.id) : pilih.delete(a.id))); return gTabel(terakhir); }
    if (e.target.closest('[data-batch]')) { f.batch = e.target.value; hal = 1; pilih.clear(); muat(); }
  });
  el.addEventListener('click', async (e) => {
    const sg = e.target.closest('[data-seg]'); if (sg && sg.dataset.seg) { tab = sg.dataset.seg; hal = 1; pilih.clear(); return muat(); }
    const pg = e.target.closest('[data-hal]'); if (pg && !pg.disabled) { hal = Number(pg.dataset.hal); return muat(); }
    const u = e.target.closest('[data-ubah]'); if (u) return bukaFormAster({ lama: baris.find((a) => a.id === u.dataset.ubah), onSimpan: segar });
    if (e.target.closest('[data-tambah]')) return bukaFormAster({ onSimpan: segar });
    if (e.target.closest('[data-ulang]')) return segar();
    if (e.target.closest('[data-batal-pilih]')) { pilih.clear(); return gTabel(terakhir); }
    const ids = [...pilih];
    const jalan = async (btn, fn, pesan) => { const pulih = tombolMuat(btn, 'Memproses…'); try { const n = await fn(); toast(pesan(n)); pilih.clear(); segar(); } catch (err) { toast(pesanGalat(err), 'galat'); pulih(); } };
    const t = e.target.closest('[data-ajukan-pilih],[data-hapus-pilih],[data-setuju-pilih],[data-kembali-pilih]');
    if (!t) {
      if (e.target.closest('[data-impor]')) {
        bukaImpor({
          judul: 'Impor Data Aster', kolom: KOLOM_ASTER, per: 500,
          ket: 'Gunakan FORMAT ASTER.xlsx (26 kolom). NIK target + BATCH yang sudah ada dilewati. Tanggal boleh "15/11/2026 07:45" atau "2026-11-15 07:45".',
          opsiHtml: verifikator ? String(html`<label class="sakelar"><input type="checkbox" id="im-verif"> Langsung terverifikasi (data resmi yang sudah diperiksa)</label>`) : '',
          bacaOpsi: (m) => ({ terverifikasi: !!m.querySelector('#im-verif')?.checked }),
          wajib: (o) => !!String(o.nik_target || '').trim(), pratinjauKolom: ['_baris', 'batch', 'nik_target', 'nama_target', 'provinsi', 'jenis_ppks'], kunciGagal: ['baris', 'nik', 'pesan'],
          kirim: (rows, uji, o) => api.imporAster(rows, uji, o),
          template: { nama: 'FORMAT-ASTER', data: [['ASTER TSKPO 2026 (REGISTER)', 'asesmen tskpo', '3604010101010001', '3604010101010099', 'NAMA TARGET', 'Ya', '3171010101010001', 'NAMA PENSURVEI',
            'Direktorat Jenderal Rehabilitasi Sosial', 'RSPD', '0818149199', '15/11/2026 07:45', 'Lanjut Survey', 'Banten', 'Kota Serang', 'Serang', 'Cipare', 'Lingk. Sempu', '', '3', '15', '-6.1954816', '106.1485285', 'Gelandangan, Pengemis, Pemulung', 'Pemulung']] },
          onSelesai: segar,
        });
      }
      return;
    }
    if (t.matches('[data-ajukan-pilih]')) return jalan(t, () => api.ajukanAster(ids), (n) => `${angka(n)} data diajukan ke Kapokja Data.`);
    if (t.matches('[data-setuju-pilih]')) return jalan(t, () => api.verifikasiAster(ids, true), (n) => `${angka(n)} data terverifikasi dan tampil di Data Aster.`);
    if (t.matches('[data-hapus-pilih]')) {
      const k = await konfirmasi({ judul: 'Hapus data terpilih?', pesan: `${angka(ids.length)} data Aster (draft/perbaikan) dihapus permanen.`, label: 'Hapus', bahaya: true });
      if (k.ok) jalan(t, () => api.hapusAster(ids), (n) => `${angka(n)} data dihapus.`);
      return;
    }
    if (t.matches('[data-kembali-pilih]')) {
      const k = await konfirmasi({ judul: 'Kembalikan data terpilih', pesan: `${angka(ids.length)} data dikembalikan ke Pokja Data untuk diperbaiki.`, label: 'Kembalikan', alasan: { label: 'Catatan perbaikan', wajib: true } });
      if (k.ok) jalan(t, () => api.verifikasiAster(ids, false, k.alasan), (n) => `${angka(n)} data dikembalikan.`);
    }
  });
  $('[data-q]').addEventListener('input', debounce((e) => { f.q = e.target.value.trim(); hal = 1; muat(); }, 300));
  muat();
}
