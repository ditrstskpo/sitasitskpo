// Rencana Kerja Tahunan (PRD 5.4): setiap Pokja menyusun rencana kerja (kegiatan, target, anggaran) dan lampiran,
// Kapokja mengajukan, Pokja Perencanaan memverifikasi. Rencana terverifikasi dapat dilihat semua pegawai.
import { html, raw, angka } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { swr, hapusCache } from '../core/store.js';
import { judulHalaman, kosong, kotakGalat, pesanGalat, toast, tombolMuat, konfirmasi, chipPokja } from '../core/ui.js';
import { opsi, namaUnduhan, pokjaCepat } from '../core/komp.js';
import { daftarBerkas, pasangUnggah } from '../core/unggah.js';
import { pasangEfek, segarkanEfek } from '../core/efek.js';
import { unduhExcel } from '../core/xlsx.js';
import { rupiahSingkat } from '../core/grafik.js';
import { bukaFormulir, segmen, status, aksiKonfirmasi } from './_t34.js';
import { rupiah } from '../core/bnba.js';
import * as P from '../core/peran.js';

export async function render(el, { sesi: s }) {
  const anggota = P.pokjaEfektif(s).length > 0;
  const verif = P.isSuperAdmin(s) || P.diPokja(s, 'PERENCANAAN');
  let tab = anggota ? 'saya' : verif ? 'antrean' : 'semua';
  const thIni = new Date().getFullYear();
  let tahun = '', data = null;
  const pokjaPilihan = P.pokjaEfektif(s).length > 1 ? P.pokjaEfektif(s).map((p) => [p.id, 'Pokja ' + p.nama_pendek])
    : P.isSuperAdmin(s) && !anggota ? (await pokjaCepat()).map((p) => [p.id, 'Pokja ' + p.nama_pendek]) : null;
  el.innerHTML = String(html`
    ${judulHalaman({ pill: 'Perencanaan Direktorat', sorot: 'Rencana Kerja', sisa: 'Tahunan',
      sub: 'Setiap Pokja menyusun rencana kerja tahunan: kegiatan, target, waktu, dan anggaran, beserta lampirannya (TOR/KAK, RAB). Kapokja mengajukan; Pokja Perencanaan memverifikasi.',
      aksi: String(html`<button class="btn btn-secondary" data-unduh>${raw(ikon('sheet', 18))} Unduh Excel</button>
        ${anggota || P.isSuperAdmin(s) ? html`<button class="btn btn-primary" data-tambah>${raw(ikon('plus', 18))} Susun Rencana Kerja</button>` : ''}`) })}
    <div class="filter-baris rv" style="margin-bottom:12px"><div data-seg style="flex:1"></div>
      <select class="select" data-tahun style="max-width:200px" aria-label="Tahun">${opsi([thIni + 1, thIni, thIni - 1].map(String), '', 'Semua tahun')}</select></div>
    <div data-isi class="rv"><div class="skel" style="height:260px;border-radius:20px"></div></div>`);
  pasangEfek(el);
  const $ = (q) => el.querySelector(q);

  const gSeg = (antrean) => {
    const t = [];
    if (anggota) t.push(['saya', 'Rencana Pokja Saya']);
    if (verif) t.push(['antrean', 'Antrean Verifikasi', antrean, antrean ? 'menunggu' : '']);
    t.push(['semua', 'Semua Rencana Kerja']);
    $('[data-seg]').innerHTML = String(segmen(t, tab));
  };
  const kartu = (r) => html`<article class="card renja-kartu" data-tilt="3">
    <div class="card-head" style="margin-bottom:0"><span class="ubin" style="background:${r.warna_tint};color:${r.warna_teks}">${raw(ikon('target', 22))}</span>
      <div><h2 class="card-title">${r.judul}</h2><p class="card-sub">Tahun ${r.tahun} · ${chipPokja({ nama_pendek: r.pokja_nama, warna: r.warna, warna_tint: r.warna_tint, warna_teks: r.warna_teks }, 'Pokja ' + r.pokja_nama)}</p></div>
      <span class="spacer"></span>${status(r.status_verifikasi)}</div>
    ${r.tujuan ? html`<p>${r.tujuan}</p>` : ''}
    ${r.catatan_verifikasi ? html`<div class="info-card ${r.status_verifikasi === 'perlu_perbaikan' ? 'emas' : ''}">${raw(ikon('msg', 18, 'ik'))}<span><b>Catatan Perencanaan:</b> ${r.catatan_verifikasi}</span></div>` : ''}
    <div class="renja-kegiatan">${(r.kegiatan || []).map((k) => html`<div><span><b>${k.nama}</b><small>${[k.target ? `Target ${k.target} ${k.satuan || ''}` : '', k.waktu].filter(Boolean).join(' · ')}</small></span><span>${rupiah(k.anggaran)}</span></div>`)}</div>
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><b style="color:var(--judul)">Total anggaran: ${rupiah(r.total_anggaran)}</b>
      <small class="redup">${r.diverifikasi_nama ? 'Diverifikasi ' + r.diverifikasi_nama : r.dibuat_oleh_nama ? 'Disusun ' + r.dibuat_oleh_nama : ''}</small></div>
    ${daftarBerkas({ konteks: 'renja', ref: r.id, jenis: 'lampiran', judul: 'Lampiran (TOR/KAK, RAB, matriks)', berkas: r.berkas || [], boleh: r.boleh_ubah })}
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
      ${r.boleh_ubah && !(r.berkas || []).length ? html`<button class="btn btn-ghost btn-sm" data-hapus="${r.id}" style="color:var(--merah)">${raw(ikon('trash', 16))} Hapus</button>` : ''}
      ${r.boleh_ubah ? html`<button class="btn btn-secondary btn-sm" data-ubah="${r.id}">${raw(ikon('pencil', 16))} Ubah</button>` : ''}
      ${r.boleh_ajukan ? html`<button class="btn btn-primary btn-sm" data-ajukan="${r.id}">${raw(ikon('send', 16))} Ajukan ke Perencanaan</button>` : r.boleh_ubah && ['draft', 'perlu_perbaikan'].includes(r.status_verifikasi) ? html`<small class="redup" style="align-self:center">Pengajuan dilakukan Kapokja</small>` : ''}
      ${r.boleh_verifikasi ? html`<button class="btn btn-secondary btn-sm" data-kembali="${r.id}">${raw(ikon('undo', 16))} Kembalikan</button><button class="btn btn-primary btn-sm" data-setuju="${r.id}">${raw(ikon('check', 16))} Verifikasi</button>` : ''}
    </div></article>`;
  const gambar = (d) => {
    data = d;
    gSeg(d.baris.filter((r) => r.status_verifikasi === 'menunggu').length || null);
    const b = d.baris.filter((r) => (tab === 'saya' ? P.pokjaEfektif(s).some((p) => p.id === r.pokja_id) : tab === 'antrean' ? r.status_verifikasi === 'menunggu' : true));
    $('[data-isi]').innerHTML = String(b.length ? html`<div class="grid grid-2">${b.map(kartu)}</div>`
      : html`<section class="card">${kosong({ ikonNama: 'target', judul: tab === 'antrean' ? 'Tidak ada rencana kerja yang menunggu' : 'Belum ada rencana kerja', teks: tab === 'saya' ? 'Tekan "Susun Rencana Kerja" untuk mulai.' : '' })}</section>`);
    segarkanEfek(el);
  };
  async function muat() {
    try { await swr('renja:' + tahun, () => api.daftarRenja(tahun ? { tahun } : {}), gambar, { ttl: 10_000 }); }
    catch (e) { $('[data-isi]').innerHTML = String(kotakGalat(pesanGalat(e))); }
  }
  const segar = () => { hapusCache('renja:'); muat(); };

  const editor = (keg = []) => html`<div class="form-bagian"><h3><span class="no">${pokjaPilihan ? 3 : 2}</span>Kegiatan</h3>
    <div class="baris-kegiatan kepala"><span>Nama kegiatan</span><span>Target</span><span>Satuan</span><span>Waktu</span><span>Anggaran (Rp)</span><span></span></div>
    <div data-keg>${(keg.length ? keg : [{}]).map(barisKeg)}</div>
    <button type="button" class="btn btn-ghost btn-sm" data-tambah-keg>${raw(ikon('plus', 16))} Tambah kegiatan</button>
    <p class="redup" style="margin-top:10px;font-size:.875rem">Total anggaran dihitung otomatis: <b data-total>Rp 0</b></p></div>`;
  const barisKeg = (k = {}) => html`<div class="baris-kegiatan"><input class="input" data-kk="nama" value="${k.nama || ''}" placeholder="mis. Penjangkauan korban TPPO" aria-label="Nama kegiatan">
    <input class="input" data-kk="target" value="${k.target || ''}" placeholder="400" aria-label="Target"><input class="input" data-kk="satuan" value="${k.satuan || ''}" placeholder="orang" aria-label="Satuan">
    <input class="input" data-kk="waktu" value="${k.waktu || ''}" placeholder="TW I–IV" aria-label="Waktu"><input class="input" data-kk="anggaran" inputmode="numeric" value="${k.anggaran ? angka(k.anggaran) : ''}" placeholder="0" aria-label="Anggaran">
    <button type="button" class="btn btn-icon" data-hapus-keg aria-label="Hapus baris">${raw(ikon('x', 18))}</button></div>`;
  const form = (lama = null) => bukaFormulir({
    judul: lama ? 'Ubah Rencana Kerja' : 'Susun Rencana Kerja', label: lama ? 'Simpan perubahan' : 'Simpan sebagai draft',
    data: lama || { tahun: String(thIni + 1) },
    defs: [...(pokjaPilihan && !lama ? [{ judul: 'Pokja', kolom: [{ k: 'pokja_id', l: 'Rencana kerja Pokja', tipe: 'pilih', opsi: pokjaPilihan, wajib: true, kosong: null, lebar: true }] }] : []),
      { judul: 'Rencana', kolom: [{ k: 'tahun', l: 'Tahun', tipe: 'pilih', opsi: [thIni - 1, thIni, thIni + 1, thIni + 2].map(String), wajib: true, kosong: null },
        { k: 'judul', l: 'Judul rencana kerja', wajib: true, ph: 'Rencana Kerja Pokja … 2027' }, { k: 'tujuan', l: 'Tujuan / sasaran', tipe: 'area', lebar: true, baris: 2 }] }],
    bawah: String(editor(lama?.kegiatan || [])),
    tambahan: (m) => {
      const hitung = () => { const t = [...m.el.querySelectorAll('[data-kk="anggaran"]')].reduce((a, x) => a + (Number(x.value.replace(/\D/g, '')) || 0), 0); m.el.querySelector('[data-total]').textContent = rupiah(t); };
      m.el.addEventListener('click', (e) => {
        if (e.target.closest('[data-tambah-keg]')) { m.el.querySelector('[data-keg]').insertAdjacentHTML('beforeend', String(barisKeg())); m.el.querySelector('[data-keg] .baris-kegiatan:last-child input')?.focus(); }
        const h = e.target.closest('[data-hapus-keg]'); if (h && m.el.querySelectorAll('.baris-kegiatan:not(.kepala)').length > 1) { h.closest('.baris-kegiatan').remove(); hitung(); }
      });
      m.el.addEventListener('input', (e) => { if (e.target.matches('[data-kk="anggaran"]')) { const v = e.target.value.replace(/\D/g, ''); e.target.value = v ? angka(Number(v)) : ''; hitung(); } });
      hitung();
    },
    simpan: async (o, m) => {
      const kegiatan = [...m.el.querySelectorAll('[data-keg] .baris-kegiatan')].map((b) => Object.fromEntries([...b.querySelectorAll('[data-kk]')].map((x) => [x.dataset.kk, x.dataset.kk === 'anggaran' ? x.value.replace(/\D/g, '') : x.value.trim()]))).filter((k) => k.nama);
      if (!kegiatan.length) throw new Error('Isi minimal satu kegiatan.');
      await api.simpanRenja({ ...o, id: lama?.id, kegiatan }); toast('Rencana kerja tersimpan.'); segar();
    },
  });

  pasangUnggah(el, { muatUlang: segar, judulJenis: { lampiran: 'Lampiran' } });
  el.addEventListener('click', async (e) => {
    const sg = e.target.closest('[data-seg]'); if (sg && sg.dataset.seg) { tab = sg.dataset.seg; return data && gambar(data); }
    const cari = (k) => data?.baris.find((r) => r.id === e.target.closest(`[data-${k}]`)?.dataset[k]);
    if (e.target.closest('[data-tambah]')) return form();
    if (e.target.closest('[data-ubah]')) return form(cari('ubah'));
    if (e.target.closest('[data-ulang]')) return segar();
    if (e.target.closest('[data-hapus]')) { const r = cari('hapus'); return aksiKonfirmasi({ judul: 'Hapus rencana kerja?', pesan: `"${r.judul}" dihapus.`, label: 'Hapus', bahaya: true, jalan: () => api.hapusRenja(r.id), sukses: 'Rencana kerja dihapus.' }).then((ok) => ok && segar()); }
    if (e.target.closest('[data-ajukan]')) { const r = cari('ajukan'); return aksiKonfirmasi({ judul: 'Ajukan ke Pokja Perencanaan?', pesan: `"${r.judul}" (${rupiahSingkat(r.total_anggaran)}) dikirim untuk diverifikasi.`, label: 'Ajukan', jalan: () => api.ajukanRenja(r.id), sukses: 'Rencana kerja diajukan.' }).then((ok) => ok && segar()); }
    if (e.target.closest('[data-setuju]')) {
      const b = e.target.closest('[data-setuju]'), r = cari('setuju'), pulih = tombolMuat(b, '');
      try { await api.verifikasiRenja(r.id, true); toast('Rencana kerja terverifikasi.'); segar(); } catch (err) { toast(pesanGalat(err), 'galat'); pulih(); }
      return;
    }
    if (e.target.closest('[data-kembali]')) {
      const r = cari('kembali');
      const k = await konfirmasi({ judul: 'Kembalikan rencana kerja', pesan: `"${r.judul}" dikembalikan ke Pokja ${r.pokja_nama}.`, label: 'Kembalikan', alasan: { label: 'Catatan perbaikan', wajib: true } });
      if (k.ok) { try { await api.verifikasiRenja(r.id, false, k.alasan); toast('Dikembalikan dengan catatan.'); segar(); } catch (err) { toast(pesanGalat(err), 'galat'); } }
      return;
    }
    const u = e.target.closest('[data-unduh]');
    if (u && data) {
      const rows = data.baris.flatMap((r) => (r.kegiatan || []).map((k) => ({ Tahun: r.tahun, Pokja: r.pokja_nama, 'Judul Rencana': r.judul, Status: r.status_verifikasi, Kegiatan: k.nama, Target: k.target, Satuan: k.satuan, Waktu: k.waktu, 'Anggaran (Rp)': Number(k.anggaran) || 0 })));
      await unduhExcel(namaUnduhan('Rencana-Kerja'), [{ nama: 'Rencana Kerja', baris: rows.length ? rows : [{ Keterangan: 'Belum ada data' }] }]);
    }
  });
  $('[data-tahun]').addEventListener('change', (e) => { tahun = e.target.value; muat(); });
  gSeg(null); muat();
}
