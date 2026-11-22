// W-04 Rekonsiliasi Pencairan: posisi tahap aktif setiap usulan (1–11), panel diagram alur per usulan,
// dan "Unduh Excel Semua Bundle" (sheet Ringkasan Bundle + Daftar BNBA).
import { html, raw, angka, tanggal, tanggalJam, debounce } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { swr, hapusCache, bus } from '../core/store.js';
import { judulHalaman, kosong, kotakGalat, pager, skelTabel, hitungNaik, pesanGalat, toast, tombolMuat } from '../core/ui.js';
import { kpi, opsi, namaUnduhan, pokjaCepat } from '../core/komp.js';
import { STATUS_USULAN, badge, chipTahap, infoTahap, URUT_TAHAP, chipPokjaU, rupiah, urutEkspor } from '../core/bnba.js';
import { unduhExcel } from '../core/xlsx.js';
import { pergi } from '../core/nav.js';

export async function render(el) {
  const f = { q: '', pokja: '', tahap: '', status: '' };
  let hal = 1, pilih = null, baris = [];
  const pokja = await pokjaCepat();
  el.innerHTML = String(html`
    ${judulHalaman({ pill: 'Alur & Tahapan Pencairan ATENSI', sorot: 'Rekonsiliasi Data Pencairan', sisa: 'Bantuan ATENSI 2026',
      sub: 'Pemantauan posisi 11 tahap pengusulan SK hingga pencairan dana ATENSI secara transparan dan tervalidasi lintas Pokja.',
      aksi: String(html`<span class="status-chip"><span class="titik"></span>Sinkronisasi aktif · <span data-waktu>${tanggalJam(new Date())}</span></span>
        <button class="btn btn-secondary" data-ekspor>${raw(ikon('download', 18))} Unduh Excel Semua Bundle</button>
        <button class="btn btn-primary" data-segar>${raw(ikon('refresh', 18))} Perbarui Status</button>`) })}
    <div data-kpi><div class="kpi-row">${[1, 2, 3, 4].map(() => html`<div class="skel" style="height:148px;border-radius:20px"></div>`)}</div></div>
    <section class="card filter-card" style="margin-bottom:16px"><div class="filter-head">${raw(ikon('sliders', 20))}<b>Filter Data Rekonsiliasi</b></div><div class="filter-baris">
      <label class="input-ikon" style="flex:2 1 220px">${raw(ikon('search', 18))}<input class="input" data-q placeholder="No SK, register, judul" aria-label="Cari"></label>
      <select class="select" data-f="pokja" aria-label="Pokja">${opsi(pokja.filter((p) => p.kelompok === 'teknis').map((p) => [p.id, 'Pokja ' + p.nama_pendek]), '', 'Semua Pokja')}</select>
      <select class="select" data-f="tahap" aria-label="Tahap saat ini">${opsi(URUT_TAHAP.map((t) => [t, `Tahap ${t}: ${infoTahap(t).nama}`]), '', 'Semua tahap')}</select>
      <select class="select" data-f="status" aria-label="Status alur">${opsi([['proses', 'Dalam proses'], ['selesai', 'Selesai (cair)'], ['perlu_perbaikan', 'Perlu perbaikan'], ['ditolak', 'Ditolak']], '', 'Semua status')}</select>
      <button class="btn btn-ghost" data-reset>${raw(ikon('refresh', 16))} Reset</button></div></section>
    <div class="rekon-grid"><section class="card table-card" data-tabel>${skelTabel(6, 4)}</section><aside data-panel></aside></div>`);
  const $ = (q) => el.querySelector(q);

  async function gambarKpi() {
    try {
      const r = await api.ringkasanUsulan(), p = r.per_tahap || {};
      const top = Object.entries(p).sort((a, b) => b[1] - a[1])[0];
      $('[data-kpi]').innerHTML = String(html`<div class="kpi-row">
        ${kpi({ ikonNama: 'folder', label: 'Total Usulan Aktif', nilai: r.aktif + r.selesai, satuan: 'berkas', note: `${angka(r.aktif)} masih berjalan` })}
        ${kpi({ warna: 'blue', ikonNama: 'rekon', label: 'Dalam Proses Alur', nilai: r.proses, satuan: 'SK', note: top ? `Terbanyak di Tahap ${top[0]} (${infoTahap(top[0]).nama})` : 'Tahap 1–10' })}
        ${kpi({ warna: 'teal', ikonNama: 'check-circle', label: 'Usulan Selesai Cair', nilai: r.selesai, satuan: 'Tahap 11', note: rupiah(r.nilai_selesai) + ' tersalur' })}
        ${kpi({ warna: 'coral', ikonNama: 'alert', label: 'Perlu Perbaikan', nilai: r.perbaikan, satuan: 'revisi', note: 'Dikembalikan Kapokja / Tahap 3–4' })}</div>`);
      hitungNaik($('[data-kpi]'));
    } catch {}
  }
  function gambarPanel() {
    const u = baris.find((x) => x.id === pilih);
    if (!u) { $('[data-panel]').innerHTML = String(html`<section class="card">${kosong({ ikonNama: 'workflow', judul: 'Pilih usulan', teks: 'Klik baris untuk melihat diagram alur 11 tahap.' })}</section>`); return; }
    const st = u.tahap_status || {}, akt = u.tahap_aktif_list?.length ? u.tahap_aktif_list : [u.tahap_aktif], t = infoTahap(akt[0]);
    $('[data-panel]').innerHTML = String(html`<section class="card panel-rekon">
      <div class="card-head"><span class="ubin">${raw(ikon('folder', 20))}</span><div><h3 class="card-title">Detail Usulan SK</h3><p class="card-sub mono">${u.no_sk || u.no_register}</p></div><span class="spacer"></span>${badge(STATUS_USULAN, u.status)}</div>
      <p><b>${u.judul}</b></p><p class="redup">${u.pokja_nama} · ${angka(u.jumlah_pm)} PM · ${rupiah(u.nilai_total)}</p>
      ${u.status === 'proses' ? html`<div class="tahap-sorot" style="--c:${t.warna}">${chipTahap(akt[0])}<p>Pelaksana: <b>${t.oleh}</b> · sejak ${tanggal(u.tahap_mulai)}</p>${u.pic_nama ? html`<small>PIC terakhir: ${u.pic_nama}</small>` : ''}</div>` : ''}
      <h4 style="margin:16px 0 8px">Diagram Alur 11 Tahapan <span class="badge b-ok kecil">${URUT_TAHAP.filter((n) => st[n] === 'selesai').length}/13 selesai</span></h4>
      <ol class="alur-vertikal">${URUT_TAHAP.map((no) => html`<li class="${st[no] || 'terkunci'}" style="--c:${infoTahap(no).warna}"><span class="tt">${st[no] === 'selesai' ? raw(ikon('check', 12)) : st[no] === 'aktif' ? no : raw(ikon('lock', 11))}</span>
        <span><b>Tahap ${no}: ${infoTahap(no).nama}</b><small>${infoTahap(no).oleh}</small></span></li>`)}</ol>
      <div class="form-aksi"><button class="btn btn-secondary" data-cetak>${raw(ikon('printer', 16))} Cetak Lembar Kontrol</button><span class="spacer"></span>
        <a class="btn btn-primary" href="#/usulan/${u.id}">Buka Berkas BNBA ${raw(ikon('arrow-right', 16))}</a></div></section>`);
  }
  const param = () => ({ q: f.q, pokja: f.pokja, tahap: f.tahap, status: f.status ? [f.status] : ['proses', 'selesai', 'perlu_perbaikan', 'ditolak', 'menunggu'] });
  const gambar = (d) => {
    baris = d.baris;
    if (!pilih || !baris.some((x) => x.id === pilih)) pilih = baris[0]?.id || null;
    if (!baris.length) { $('[data-tabel]').innerHTML = String(kosong({ ikonNama: 'rekon', judul: 'Tidak ada usulan', teks: 'Belum ada usulan yang cocok dengan filter.' })); gambarPanel(); return; }
    $('[data-tabel]').innerHTML = String(html`<div class="card-head" style="padding:20px 20px 8px"><h2 class="card-title">Daftar Usulan SK Pencairan</h2><span class="badge b-proc">${angka(d.total)} rekord</span></div>
      <div class="table-wrap"><table class="tbl"><thead><tr><th>#</th><th>No SK / Usulan</th><th>Pengusul (Pokja)</th><th class="kanan">Jumlah PM</th><th>Posisi</th></tr></thead><tbody>
      ${baris.map((u, i) => html`<tr class="baris-klik ${u.id === pilih ? 'terpilih' : ''}" data-pilih="${u.id}" tabindex="0"><td class="angka">${(hal - 1) * 10 + i + 1}</td>
        <td><b class="judul-sel">${u.no_sk || u.judul}</b><small class="mono redup">${u.no_register}${u.no_sk ? html` · ${u.judul}` : ""}</small></td><td>${chipPokjaU(u)}</td>
        <td class="kanan"><b>${angka(u.jumlah_pm)} PM</b><small class="redup" style="display:block">${rupiah(u.nilai_total)}</small></td>
        <td>${u.status === 'proses' ? chipTahap(u.tahap_aktif, { kecil: true }) : badge(STATUS_USULAN, u.status)}</td></tr>`)}
      </tbody></table></div>${pager({ hal, total: d.total, per: 10 })}`);
    gambarPanel();
  };
  async function muat() {
    gambarKpi();
    try { await swr('usulan:rekon:' + JSON.stringify({ f, hal }), () => api.daftarUsulan({ ...param(), hal, per: 10 }), gambar, { ttl: 15_000 }); }
    catch (e) { $('[data-tabel]').innerHTML = String(kotakGalat(pesanGalat(e))); }
    $('[data-waktu]').textContent = tanggalJam(new Date());
  }
  el.addEventListener('click', async (e) => {
    const p = e.target.closest('[data-pilih]'); if (p) { pilih = p.dataset.pilih; el.querySelectorAll('[data-pilih]').forEach((r) => r.classList.toggle('terpilih', r === p)); gambarPanel(); if (innerWidth < 1100) $('[data-panel]').scrollIntoView({ behavior: 'smooth' }); return; }
    const pg = e.target.closest('[data-hal]'); if (pg && !pg.disabled) { hal = Number(pg.dataset.hal); return muat(); }
    if (e.target.closest('[data-reset]')) { Object.keys(f).forEach((k) => { f[k] = ''; }); el.querySelectorAll('[data-f]').forEach((x) => { x.value = ''; }); $('[data-q]').value = ''; hal = 1; return muat(); }
    if (e.target.closest('[data-segar]') || e.target.closest('[data-ulang]')) { hapusCache('usulan'); return muat(); }
    if (e.target.closest('[data-cetak]')) return window.print();
    const ek = e.target.closest('[data-ekspor]');
    if (ek) {
      const pulih = tombolMuat(ek, 'Menyiapkan…');
      try {
        const semua = (await api.daftarUsulan({ ...param(), hal: 1, per: 5000 })).baris;
        const bn = urutEkspor(await api.eksporBnba({ usulan_ids: semua.map((u) => u.id) }));
        await unduhExcel(namaUnduhan('Semua-Bundle'), [
          { nama: 'Ringkasan Bundle', baris: semua.map((u) => ({ 'No. Register': u.no_register, 'Judul Usulan': u.judul, 'Pokja Pengusul': u.pokja_nama, 'Jumlah PM': u.jumlah_pm,
            'Nilai Bantuan': u.nilai_total, 'Tahap Aktif': (u.tahap_aktif_list || []).join(', ') || u.tahap_aktif, Status: STATUS_USULAN[u.status]?.l, 'NO SK': u.no_sk || '' })) },
          { nama: 'Daftar BNBA', baris: bn }]);
        toast(`${semua.length} bundle dan ${bn.length} baris BNBA diunduh.`);
      } catch (err) { toast(pesanGalat(err), 'galat'); }
      pulih();
    }
  });
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-pilih]')) e.target.click(); });
  el.querySelectorAll('[data-f]').forEach((x) => x.addEventListener('change', () => { f[x.dataset.f] = x.value; hal = 1; muat(); }));
  $('[data-q]').addEventListener('input', debounce((e) => { f.q = e.target.value; hal = 1; muat(); }, 300));
  muat();
  return bus.on('usulan-berubah', () => { hapusCache('usulan'); muat(); });
}
