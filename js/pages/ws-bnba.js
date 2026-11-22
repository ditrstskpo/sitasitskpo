// W-04 Workspace BNBA Pokja — "Pengajuan BNBA — Pokja X": daftar usulan berjudul milik Pokja (draft s.d. terverifikasi).
import { html, raw, angka, debounce, tanggal } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { swr, bus, hapusCache } from '../core/store.js';
import { judulHalaman, kosong, pager, kotakGalat, skelTabel, hitungNaik, pesanGalat } from '../core/ui.js';
import { kpi, opsi, tautanAman, pokjaCepat } from '../core/komp.js';
import { STATUS_USULAN, badge, rupiah, chipTahap } from '../core/bnba.js';
import { bukaBuatUsulan, bukaImporBnba, unduhTemplateBnba } from './_usulan-modal.js';
import { pergi } from '../core/nav.js';
import * as P from '../core/peran.js';

const TAB = [['', 'Semua Berkas'], ['draft', 'Draft'], ['menunggu', 'Menunggu Verifikasi Kapokja'], ['perlu_perbaikan', 'Perlu Perbaikan'], ['terverifikasi', 'Terverifikasi'], ['ditolak', 'Ditolak']];
const statusDari = (t) => (t === 'terverifikasi' ? ['proses', 'selesai'] : t ? [t] : []);

export async function render(el, { sesi: s, query }) {
  const pk = P.pokjaEfektif(s).filter((p) => p.kelompok === 'teknis').length ? P.pokjaEfektif(s).filter((p) => p.kelompok === 'teknis') : P.pokjaEfektif(s);
  const pokjaIds = P.isSuperAdmin(s) ? [] : pk.map((p) => p.id);
  const namaPokja = P.isSuperAdmin(s) ? 'Semua Pokja' : 'Pokja ' + pk.map((p) => p.nama_pendek).join(', ');
  const f = { tab: query.get('tab') || '', q: '', urut: 'diubah_pada' };
  let hal = 1;
  const pokjaList = P.isSuperAdmin(s) ? await pokjaCepat() : [];

  el.innerHTML = String(html`
    ${judulHalaman({
      pill: 'Workspace Pengusulan ATENSI · Dit. RSTSKPO', sorot: 'Pengajuan BNBA', sisa: '— ' + namaPokja,
      sub: 'Kelola usulan berjudul berisi BNBA per PM (40 kolom) dan link profil asesmen, lalu submit sekali ke Kapokja untuk diverifikasi.',
      aksi: String(html`<button class="btn btn-secondary" data-template>${raw(ikon('sheet', 18))} Unduh Template (.xlsx)</button>
        <button class="btn btn-secondary" data-impor>${raw(ikon('file-up', 18))} Impor Excel</button>
        <button class="btn btn-primary" data-baru>${raw(ikon('plus', 18))} Buat Usulan Baru</button>`),
    })}
    <div class="segmen-tab" data-tabs></div>
    <div class="card filter-card" style="margin-bottom:16px"><div class="filter-baris">
      <label class="input-ikon" style="flex:1 1 280px">${raw(ikon('search', 18))}<input class="input" data-q placeholder="Cari judul, nomor register, atau kab/kota" aria-label="Cari usulan"></label>
      <select class="select" data-urut style="flex:0 1 240px" aria-label="Urutan">${opsi([['diubah_pada', 'Urutan: Terbaru Diperbarui'], ['dibuat_pada', 'Urutan: Terbaru Dibuat'], ['judul', 'Urutan: Judul A–Z']], f.urut)}</select>
      <button class="btn btn-icon" data-segar title="Muat ulang" aria-label="Muat ulang">${raw(ikon('refresh', 18))}</button></div></div>
    <div class="info-card" style="margin-bottom:16px">${raw(ikon('shield', 20, 'ik'))}<span><b>Integritas Alur Berkas:</b> usulan yang sudah disubmit terkunci dari perubahan.
      Setelah disetujui Kapokja, seluruh BNBA masuk Central Database dan usulan otomatis diteruskan ke <a href="#/usulan-sk">Usulan &amp; SK Pokja</a> untuk penyusunan Draft SK.</span></div>
    <section class="card table-card" data-tabel>${skelTabel(5, 6)}</section>
    <div data-kpi style="margin-top:24px"></div>`);
  const $ = (q) => el.querySelector(q);

  const gambarTab = (st) => {
    const n = (t) => st.filter((x) => statusDari(t).length === 0 || statusDari(t).includes(x.status)).length;
    $('[data-tabs]').innerHTML = String(html`${TAB.map(([id, l]) => html`<button type="button" class="seg ${f.tab === id ? 'on' : ''} ${id}" data-tab="${id}">
      ${id === 'perlu_perbaikan' ? raw(ikon('alert', 16)) : id === 'terverifikasi' ? raw(ikon('check-circle', 16)) : ''}${l} <span class="hitung">${angka(n(id))}</span></button>`)}`);
    const totPM = st.reduce((a, x) => a + (x.jumlah_pm || 0), 0), adaLink = st.filter((x) => x.link_profil).length;
    $('[data-kpi]').innerHTML = String(html`<div class="kpi-row" style="--kolom:3">
      ${kpi({ ikonNama: 'users', label: 'Total Pemerlu Pelayanan (PM)', nilai: totPM, satuan: 'PM', note: `Terhimpun dari ${angka(st.length)} usulan` })}
      ${kpi({ warna: 'sky', ikonNama: 'badge-check', label: 'Kesiapan Dokumen Profil Asesmen', nilai: st.length ? Math.round((adaLink / st.length) * 100) + '%' : '—', note: `${adaLink} dari ${st.length} usulan sudah memiliki link profil asesmen` })}
      ${kpi({ warna: 'gold', ikonNama: 'file-check', label: 'Integrasi Pengusulan SK Pokja', nilai: st.filter((x) => ['proses', 'selesai'].includes(x.status)).length, satuan: 'Bundel', note: 'Sudah diteruskan ke proses Draft SK dan tahap berikutnya' })}</div>`);
    hitungNaik($('[data-kpi]'));
  };

  const kunci = () => 'usulan:ws:' + JSON.stringify({ pokjaIds, ...f, hal });
  const gambar = (d) => {
    if (!d.baris.length) {
      $('[data-tabel]').innerHTML = String(kosong({ ikonNama: 'briefcase', judul: f.q || f.tab ? 'Tidak ada usulan yang cocok' : 'Belum ada usulan',
        teks: 'Buat usulan berjudul, lalu isi BNBA per PM secara manual atau impor dari Excel.', aksi: String(html`<button class="btn btn-primary" data-baru>${raw(ikon('plus', 18))} Buat Usulan Baru</button>`) }));
      return;
    }
    $('[data-tabel]').innerHTML = String(html`<div class="table-wrap"><table class="tbl"><thead><tr><th>No</th><th>Judul Usulan &amp; Kode Register</th><th>Klaster &amp; Kategori</th>
      <th class="kanan">Jumlah PM</th><th>Profil Asesmen</th><th>Status</th><th></th></tr></thead><tbody>
      ${d.baris.map((u, i) => html`<tr class="baris-klik" data-buka="${u.id}" data-status="${u.status}" tabindex="0">
        <td class="angka">${(hal - 1) * 10 + i + 1}</td>
        <td><b class="judul-sel">${u.judul}</b><span class="mono redup">${u.no_register}</span>${u.catatan_terakhir && u.status === 'perlu_perbaikan' ? html`<small class="catatan-merah">${raw(ikon('alert', 14))} ${u.catatan_terakhir}</small>` : ''}</td>
        <td><span class="titik-pokja" style="--c:${u.warna}"></span><b>${u.klaster || '—'}</b><small class="redup" style="display:block">${u.kategori}</small></td>
        <td class="kanan"><span class="pil-angka">${angka(u.jumlah_pm)} PM</span><small class="redup" style="display:block">${rupiah(u.nilai_total)}</small></td>
        <td>${u.link_profil ? html`<a class="btn btn-sm btn-tint" href="${tautanAman(u.link_profil)}" target="_blank" rel="noopener" data-henti>${raw(ikon('external', 16))} Buka Link Profil Asesmen</a>`
          : html`<span class="badge b-fix">${raw(ikon('alert', 15))} Belum ada link</span>`}</td>
        <td>${badge(STATUS_USULAN, u.status)}${u.status === 'proses' ? html`<div style="margin-top:6px">${chipTahap(u.tahap_aktif, { kecil: true })}</div>` : ''}<small class="redup" style="display:block;margin-top:4px">${tanggal(u.diubah_pada)}</small></td>
        <td>${raw(ikon('chevron-right', 20, 'redup'))}</td></tr>`)}
      </tbody></table></div>${pager({ hal, total: d.total, per: 10 })}`);
  };
  async function muat() {
    try {
      swr('usulan:ws-status:' + pokjaIds.join(','), () => api.statusUsulan({ pokja: pokjaIds }), gambarTab, { ttl: 20_000 }).catch(() => {});
      await swr(kunci(), () => api.daftarUsulan({ pokja: pokjaIds, status: statusDari(f.tab), q: f.q, urut: f.urut, hal, per: 10 }), gambar, { ttl: 20_000 });
    } catch (e) { $('[data-tabel]').innerHTML = String(kotakGalat(pesanGalat(e))); }
  }
  const segar = () => { hapusCache('usulan'); muat(); };

  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-henti]')) return;
    const t = e.target.closest('[data-tab]');
    if (t) { f.tab = t.dataset.tab; hal = 1; muat(); return; }
    const pg = e.target.closest('[data-hal]');
    if (pg && !pg.disabled) { hal = Number(pg.dataset.hal); muat(); return; }
    const b = e.target.closest('[data-buka]');
    if (b) return pergi(['draft', 'perlu_perbaikan'].includes(b.dataset.status) ? '/workspace-bnba/usulan?id=' + b.dataset.buka : '/usulan/' + b.dataset.buka);
    if (e.target.closest('[data-baru]')) return bukaBuatUsulan(s, { pokjaList, onSelesai: (u) => pergi('/workspace-bnba/usulan?id=' + u.id) });
    if (e.target.closest('[data-template]')) return unduhTemplateBnba();
    if (e.target.closest('[data-impor]')) return bukaBuatUsulan(s, { pokjaList, onSelesai: (u) => { pergi('/workspace-bnba/usulan?id=' + u.id); setTimeout(() => bukaImporBnba(u, {}), 400); } });
    if (e.target.closest('[data-ulang]') || e.target.closest('[data-segar]')) segar();
  });
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-buka]')) e.target.click(); });
  $('[data-q]').addEventListener('input', debounce((e) => { f.q = e.target.value; hal = 1; muat(); }, 300));
  $('[data-urut]').addEventListener('change', (e) => { f.urut = e.target.value; hal = 1; muat(); });
  muat();
  return bus.on('usulan-berubah', segar);
}
