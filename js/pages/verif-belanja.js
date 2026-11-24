// Verifikasi Belanja, BAST & Inventaris (W-24B): hanya untuk bantuan barang / aset usaha yang tidak habis pakai.
// Petugas Supermonev yang ditugaskan (atau Pokja Supermonev) mengunggah bukti belanja, BAST, foto barang, dan daftar
// inventaris; Kapokja Supermonev memverifikasi. Super Admin dan Pokja TU melihat semua; Pokja pengusul melihat PM-nya.
import { html, raw, angka, tanggal, debounce } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { bus } from '../core/store.js';
import { judulHalaman, kosong, kotakGalat, pesanGalat, skelKartu, pager } from '../core/ui.js';
import { pasangEfek, segarkanEfek } from '../core/efek.js';
import { rupiah, chipPokjaU } from '../core/bnba.js';
import { segmen } from './_t34.js';
import { STATUS_BELANJA, lencanaStatus, bukaBelanja, catatanPratinjau } from './_smv.js';
import * as P from '../core/peran.js';

export async function render(el, { sesi: s, query }) {
  const verif = P.isSuperAdmin(s) || P.diPokja(s, 'SUPERMONEV', 'kapokja');
  const f = { status: query?.get('status') || (verif ? 'menunggu' : ''), q: '', hal: 1, per: 24 };
  el.innerHTML = String(html`
    <div class="latar-hidup">
    ${judulHalaman({ pill: 'Supermonev · W-24B', sorot: 'Verifikasi Belanja', sisa: '& BAST',
      sub: 'Untuk bantuan barang / aset usaha: unggah nota atau kuitansi, Berita Acara Serah Terima (BAST), foto barang, dan daftar inventaris. Foto otomatis dikecilkan ≤ 1 MB; dokumen PDF maks 10 MB. Diverifikasi Kapokja Supermonev.' })}
    ${catatanPratinjau()}
    </div>
    <div class="alur-belanja rv">${[['upload', 'Unggah bukti', 'Nota, BAST, foto barang'], ['list-ordered', 'Isi inventaris', 'Nama, jumlah, nilai barang'], ['send', 'Ajukan', 'Ke Kapokja Supermonev'], ['badge-check', 'Terverifikasi', 'Tampil di Detail PM']]
      .map(([ik, j, k], i) => html`<div class="ab-langkah" style="--i:${i}"><span class="ab-ikon">${raw(ikon(ik, 22))}</span><b>${j}</b><small>${k}</small></div>`)}</div>
    <p class="help rv" style="margin:10px 0 0"><b>Gunanya:</b> memastikan bantuan barang/aset usaha yang sudah cair benar-benar diterima PM (nota, BAST, foto, daftar barang). Empat kotak di atas hanyalah penjelasan alur, bukan tombol; yang bisa diklik ada pada tombol di <b>kartu setiap PM</b> di bawah. Mengisi dilakukan petugas Supermonev yang ditugaskan; verifikasi oleh Kapokja Supermonev; peran lain hanya melihat.</p>
    <div class="filter-baris rv" style="margin:16px 0"><div data-segwadah style="flex:1"></div>
      <label class="input-ikon" style="min-width:260px">${raw(ikon('search', 18))}<input class="input" data-q placeholder="Cari nama PM atau NIK" aria-label="Cari PM"></label></div>
    <div data-isi class="rv">${skelKartu(3)}</div>`);
  pasangEfek(el);
  const $ = (q) => el.querySelector(q);

  const kartu = (r) => {
    const lengkap = [['bukti_belanja', 'Nota'], ['bast', 'BAST'], ['inventaris', 'Foto barang']];
    return html`<article class="kartu-belanja st-${r.status}" data-tilt="3">
      <div class="ts-atas">${chipPokjaU(r)}<span class="spacer"></span>${lencanaStatus(STATUS_BELANJA, r.status)}</div>
      <h3>${r.nama}</h3><p class="redup">${[r.kabkota, r.provinsi].filter(Boolean).join(', ')} · cair ${tanggal(r.tgl_cair)}</p>
      <p class="kb-bantuan">${raw(ikon('package', 16))} ${r.rincian_barang || 'Barang bantuan'} · ${rupiah(r.nilai_bantuan)}</p>
      <div class="kb-cek">${lengkap.map(([k, l]) => html`<span class="${r.berkas_jumlah?.[k] ? 'ada' : ''}">${raw(ikon(r.berkas_jumlah?.[k] ? 'check-circle' : 'circle-dot', 15))} ${l}</span>`)}
        <span class="${r.inventaris?.length ? 'ada' : ''}">${raw(ikon(r.inventaris?.length ? 'check-circle' : 'circle-dot', 15))} Inventaris ${r.inventaris?.length ? `(${r.inventaris.length} · ${rupiah(r.total_nilai)})` : ''}</span></div>
      ${r.catatan_verifikasi && r.status === 'perlu_perbaikan' ? html`<div class="info-card emas">${raw(ikon('msg', 18, 'ik'))}<span>${r.catatan_verifikasi}</span></div>` : ''}
      <div class="ts-aksi"><button type="button" class="btn ${r.boleh_isi || r.boleh_verifikasi ? 'btn-primary btn-sinar' : 'btn-secondary'}" data-buka="${r.bnba_id}">
        ${raw(ikon(r.boleh_verifikasi ? 'shield' : r.boleh_isi ? 'upload' : 'eye', 18))} ${r.boleh_verifikasi ? 'Periksa & Verifikasi' : r.boleh_isi ? (r.status === 'belum' ? 'Unggah Bukti' : 'Lengkapi / Ubah') : 'Lihat'}</button>
        ${r.diverifikasi_nama && r.status === 'terverifikasi' ? html`<small class="redup">Diverifikasi ${r.diverifikasi_nama}</small>` : r.diisi_nama ? html`<small class="redup">Diisi ${r.diisi_nama}</small>` : ''}</div></article>`;
  };
  async function muat() {
    try {
      const d = await api.belanjaDaftar(Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '')));
      const r = d.ringkas;
      $('[data-segwadah]').innerHTML = String(segmen([['', 'Semua', r.semua], ['belum', 'Belum diunggah', r.belum], ['menunggu', 'Menunggu verifikasi', r.menunggu, r.menunggu ? 'menunggu' : ''],
        ['perlu_perbaikan', 'Perlu perbaikan', r.perlu_perbaikan, r.perlu_perbaikan ? 'perlu_perbaikan' : ''], ['terverifikasi', 'Terverifikasi', r.terverifikasi, 'terverifikasi']], f.status));
      $('[data-isi]').innerHTML = String(d.baris.length ? html`<div class="grid-tugas rv-anak on">${d.baris.map(kartu)}</div>${d.total > f.per ? pager({ hal: f.hal, total: d.total, per: f.per }) : ''}`
        : html`<section class="card">${kosong({ ikonNama: 'receipt', judul: f.status === 'menunggu' ? 'Tidak ada yang menunggu verifikasi' : 'Tidak ada data', teks: 'Hanya PM dengan bantuan barang/aset usaha yang sudah cair yang tampil di sini.' })}</section>`);
      segarkanEfek(el);
    } catch (e) { $('[data-isi]').innerHTML = String(kotakGalat(pesanGalat(e))); }
  }
  el.addEventListener('click', (e) => {
    const sg = e.target.closest('button[data-seg]'); if (sg) { f.status = sg.dataset.seg; f.hal = 1; return muat(); }
    const b = e.target.closest('[data-buka]'); if (b) return bukaBelanja({ bnba_id: b.dataset.buka, onSelesai: muat });
    const hl = e.target.closest('[data-hal]'); if (hl && !hl.disabled) { f.hal = Number(hl.dataset.hal); muat(); }
  });
  el.addEventListener('input', debounce((e) => { if (e.target.matches('[data-q]')) { f.q = e.target.value.trim(); f.hal = 1; muat(); } }, 350));
  const lepas = [];
  try { lepas.push(await api.langgananTabel('belanja', debounce(muat, 600))); } catch {}
  lepas.push(bus.on('realtime-pulih', muat));
  await muat();
  return () => lepas.forEach((x) => { try { x?.(); } catch {} });
}
