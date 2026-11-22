// W-07 Pengusulan SK — Monitoring Proses Penerbitan SK & Pencairan (semua pegawai), serta
// Workspace TU / Keuangan (usulan yang sedang menunggu tahap Pokja tersebut).
import { html, raw, angka, tanggalJam, debounce } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { swr, hapusCache, bus } from '../core/store.js';
import { judulHalaman, kosong, kotakGalat, pager, skelTabel, hitungNaik, pesanGalat } from '../core/ui.js';
import { kpi, opsi, namaUnduhan, pokjaCepat } from '../core/komp.js';
import { STATUS_USULAN, badge, chipTahap, stepperMini, infoTahap, URUT_TAHAP, TAHAP_TU, TAHAP_KEU, chipPokjaU, rupiah } from '../core/bnba.js';
import { unduhExcel } from '../core/xlsx.js';
import { pergi } from '../core/nav.js';

const MODE = {
  '/usulan-sk': { pill: 'Direktorat Rehabilitasi Sosial TSKPO · Alur Penetapan SK', sorot: 'Pengusulan SK', sisa: '— Monitoring Proses Penerbitan SK & Pencairan',
    sub: 'Pelacakan terpadu siklus 11 tahap. Usulan masuk otomatis setelah disetujui Kapokja; klik baris untuk membuka Detail Usulan dan stepper 11 tahap.', tahap: null },
  '/tata-usaha': { pill: 'Workspace Pokja Tata Usaha', sorot: 'Workspace Tata Usaha', sisa: '— Verifikasi SK, Direktur, Sekretariat & SK Final',
    sub: 'Usulan yang sedang menunggu Tata Usaha: Tahap 4a (verifikasi TU), 4b (TTD Direktur), 4c (Sekretariat), dan 6 (SK keluar).', tahap: TAHAP_TU },
  '/keuangan': { pill: 'Modul Keuangan · Alur Pencairan Pasca-SK', sorot: 'Workspace Keuangan', sisa: '— Data Pencairan, Burekol, SP2D, SI & Pencairan',
    sub: 'Usulan dari semua Pokja yang sedang menunggu Pokja Keuangan: Tahap 5 dan Tahap 7 sampai 11.', tahap: TAHAP_KEU },
};

export async function render(el, { path }) {
  const M = MODE[path] || MODE['/usulan-sk'];
  const f = { q: '', pokja: '', tahap: '', status: M.tahap ? 'proses' : '' };
  let hal = 1;
  const pokja = await pokjaCepat();

  el.innerHTML = String(html`
    ${judulHalaman({ pill: M.pill, sorot: M.sorot, sisa: M.sisa, sub: M.sub,
      aksi: String(html`<button class="btn btn-secondary" data-ekspor>${raw(ikon('download', 18))} Ekspor XLS</button>
        <button class="btn btn-primary" data-cetak>${raw(ikon('printer', 18))} Cetak Rekap Posisi</button>`) })}
    <div data-kpi></div>
    <section class="card" style="margin-bottom:16px">
      <div class="card-head"><span class="ubin">${raw(ikon('workflow', 20))}</span><div><h2 class="card-title">Legenda Alur 11 Tahap</h2><p class="card-sub">Warna setiap tahap sama di seluruh aplikasi.</p></div></div>
      <div class="legenda-tahap">${(M.tahap || URUT_TAHAP).map((no) => html`<button type="button" class="leg" data-tahap-cepat="${no}">${chipTahap(no)}<small>${infoTahap(no).oleh}</small></button>`)}</div>
    </section>
    <section class="card filter-card" style="margin-bottom:16px"><div class="filter-baris">
      <label class="input-ikon" style="flex:2 1 260px">${raw(ikon('search', 18))}<input class="input" data-q placeholder="Cari judul, nomor register, nomor SK" aria-label="Cari"></label>
      <select class="select" data-f="pokja" aria-label="Pokja">${opsi(pokja.filter((p) => p.kelompok === 'teknis').map((p) => [p.id, 'Pokja ' + p.nama_pendek]), '', 'Semua Pokja')}</select>
      <select class="select" data-f="tahap" aria-label="Posisi tahap">${opsi((M.tahap || URUT_TAHAP).map((t) => [t, `Tahap ${t} · ${infoTahap(t).nama}`]), '', 'Semua posisi tahap')}</select>
      ${M.tahap ? '' : html`<select class="select" data-f="status" aria-label="Status">${opsi([['proses', 'Dalam proses'], ['selesai', 'Selesai (cair)'], ['ditolak', 'Ditolak']], '', 'Semua status')}</select>`}
      <button class="btn btn-ghost" data-reset>${raw(ikon('refresh', 16))} Reset</button></div></section>
    <div class="info-card" style="margin-bottom:16px">${raw(ikon('info', 20, 'ik'))}<span>Klik baris untuk membuka instrumen verifikasi dan pelacakan detail usulan (stepper 11 tahap).
      ${M.tahap ? 'Tombol aksi tahap hanya muncul bagi peran yang berwenang; perubahan tercatat permanen di riwayat.' : ''}</span></div>
    <section class="card table-card" data-tabel>${skelTabel(6, 5)}</section>`);
  const $ = (q) => el.querySelector(q);

  async function gambarKpi() {
    try {
      if (M.tahap) {
        const st = await api.statusUsulan({ status: 'proses', tahapList: M.tahap });
        const warna = ['violet', 'gold', 'orange', 'teal', 'coral', 'sky', 'blue'];
        $('[data-kpi]').innerHTML = String(html`<div class="kpi-row" style="--kolom:${Math.min(M.tahap.length, 6)}">${M.tahap.map((t, i) => kpi({ warna: warna[i % warna.length],
          ikonNama: 'clock', label: `Tahap ${t} · ${infoTahap(t).nama}`, nilai: st.filter((x) => (x.tahap_aktif_list || [x.tahap_aktif]).includes(t)).length, satuan: 'usulan', note: 'Menunggu tindakan' }))}</div>`);
      } else {
        const r = await api.ringkasanUsulan(), p = r.per_tahap || {}, n = (...t) => t.reduce((a, x) => a + (p[x] || 0), 0);
        $('[data-kpi]').innerHTML = String(html`<div class="kpi-row kpi-6">
          ${kpi({ warna: 'blue', ikonNama: 'file-text', label: 'Tahap 3', nilai: n('3'), note: 'Draft SK & Nota Dinas' })}
          ${kpi({ warna: 'violet', ikonNama: 'user-check', label: 'Tahap 4 Aktif', nilai: n('4a', '4b', '4c'), note: 'Verif TU / Direktur / Sekretariat' })}
          ${kpi({ warna: 'coral', ikonNama: 'banknote', label: 'Tahap 5 & 6', nilai: n('5', '6'), note: 'Data Pencairan & SK Keluar' })}
          ${kpi({ warna: 'teal', ikonNama: 'landmark', label: 'Tahap 7 – 10', nilai: n('7', '8', '9', '10'), note: 'Burekol s.d. SI' })}
          ${kpi({ ikonNama: 'check-circle', label: 'Tahap 11 Final', nilai: r.selesai, note: 'Sudah cair' })}
          ${kpi({ warna: 'gold', ikonNama: 'alert', label: 'Revisi / Ditolak', nilai: (r.perbaikan || 0) + (r.ditolak || 0), note: `${r.perbaikan || 0} revisi · ${r.ditolak || 0} ditolak` })}</div>`);
      }
      hitungNaik($('[data-kpi]'));
    } catch {}
  }
  const param = () => ({ q: f.q, pokja: f.pokja, tahap: M.tahap ? '' : f.tahap, tahapList: M.tahap ? (f.tahap ? [f.tahap] : M.tahap) : null,
    status: f.status ? [f.status] : ['proses', 'selesai', 'ditolak'] });
  const gambar = (d) => {
    if (!d.baris.length) { $('[data-tabel]').innerHTML = String(kosong({ ikonNama: 'file-check', judul: 'Tidak ada usulan', teks: M.tahap ? 'Tidak ada usulan yang menunggu tahap Pokja Anda.' : 'Belum ada usulan yang cocok dengan saringan.' })); return; }
    $('[data-tabel]').innerHTML = String(html`<div class="table-wrap"><table class="tbl"><thead><tr><th>No</th><th>Judul Usulan &amp; Kode</th><th>Pokja Pengusul</th><th class="kanan">Jumlah PM</th>
      <th>Posisi 11 Tahap</th><th>PIC / Pembaruan</th><th></th></tr></thead><tbody>
      ${d.baris.map((u, i) => html`<tr class="baris-klik ${u.status === 'ditolak' ? 'baris-merah' : ''}" data-buka="${u.id}" tabindex="0">
        <td class="angka">${String((hal - 1) * 10 + i + 1).padStart(2, '0')}</td>
        <td><b class="judul-sel">${u.judul}</b><span class="mono redup">${u.no_register}</span>${u.no_sk ? html`<small class="hijau-teks">No SK: ${u.no_sk}</small>` : ''}${u.kabkota ? html`<small class="redup">${raw(ikon('map-pin', 12))} ${u.kabkota}</small>` : ''}</td>
        <td>${chipPokjaU(u)}</td><td class="kanan"><b>${angka(u.jumlah_pm)} PM</b><small class="redup" style="display:block">${rupiah(u.nilai_total)}</small></td>
        <td>${stepperMini(u.tahap_status, u.status === 'ditolak')}<div style="margin-top:6px">${u.status === 'selesai' ? badge(STATUS_USULAN, 'selesai')
          : u.status === 'ditolak' ? badge(STATUS_USULAN, 'ditolak', 'Ditolak · ' + (u.catatan_terakhir || '').slice(0, 40)) : (u.tahap_aktif_list?.length ? u.tahap_aktif_list : [u.tahap_aktif]).map((t) => chipTahap(t, { kecil: true }))}</div></td>
        <td><b>${u.pic_nama || '—'}</b><small class="redup" style="display:block">${tanggalJam(u.diubah_pada)}</small></td>
        <td>${M.tahap ? html`<span class="btn btn-sm btn-primary">Proses ${raw(ikon('arrow-right', 16))}</span>` : raw(ikon('chevron-right', 20, 'redup'))}</td></tr>`)}
      </tbody></table></div>${pager({ hal, total: d.total, per: 10 })}`);
  };
  async function muat() {
    gambarKpi();
    try { await swr('usulan:sk:' + JSON.stringify({ p: path, f, hal }), () => api.daftarUsulan({ ...param(), hal, per: 10 }), gambar, { ttl: 15_000 }); }
    catch (e) { $('[data-tabel]').innerHTML = String(kotakGalat(pesanGalat(e))); }
  }
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-buka]'); if (b) return pergi('/usulan/' + b.dataset.buka);
    const pg = e.target.closest('[data-hal]'); if (pg && !pg.disabled) { hal = Number(pg.dataset.hal); return muat(); }
    const tc = e.target.closest('[data-tahap-cepat]');
    if (tc) { f.tahap = tc.dataset.tahapCepat; el.querySelector('[data-f=tahap]').value = f.tahap; hal = 1; return muat(); }
    if (e.target.closest('[data-reset]')) { Object.assign(f, { q: '', pokja: '', tahap: '', status: M.tahap ? 'proses' : '' }); el.querySelectorAll('[data-f]').forEach((x) => { x.value = ''; }); $('[data-q]').value = ''; hal = 1; return muat(); }
    if (e.target.closest('[data-cetak]')) return window.print();
    if (e.target.closest('[data-ulang]')) { hapusCache('usulan'); return muat(); }
    if (e.target.closest('[data-ekspor]')) {
      const d = await api.daftarUsulan({ ...param(), hal: 1, per: 5000 });
      await unduhExcel(namaUnduhan('Posisi-Usulan'), [{ nama: 'Posisi Usulan', baris: d.baris.map((u) => ({ 'No. Register': u.no_register, 'Judul Usulan': u.judul, Pokja: u.pokja_nama,
        'Jumlah PM': u.jumlah_pm, 'Nilai Bantuan': u.nilai_total, 'Tahap Aktif': (u.tahap_aktif_list || []).join(', ') || u.tahap_aktif, Status: STATUS_USULAN[u.status]?.l, 'NO SK': u.no_sk || '', PIC: u.pic_nama || '', Diperbarui: tanggalJam(u.diubah_pada) })) }]);
      api.catatEkspor('usulan', d.baris.length, param()).catch(() => {});
    }
  });
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-buka]')) e.target.click(); });
  el.querySelectorAll('[data-f]').forEach((x) => x.addEventListener('change', () => { f[x.dataset.f] = x.value; hal = 1; muat(); }));
  $('[data-q]').addEventListener('input', debounce((e) => { f.q = e.target.value; hal = 1; muat(); }, 300));
  muat();
  return bus.on('usulan-berubah', () => { hapusCache('usulan'); muat(); });
}
