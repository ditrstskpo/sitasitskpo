// Tugas & Penugasan (Tahap 4): Kapokja menugaskan anggota Pokja-nya, Pokja TU menugaskan semua pegawai, setiap
// pegawai dapat mencatat tugas untuk dirinya. Penerima mendapat notifikasi; status Baru → Dikerjakan → Selesai.
import { html, raw, angka, relatif, hariIni } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { swr, hapusCache, bus } from '../core/store.js';
import { judulHalaman, kosong, kotakGalat, pesanGalat, toast } from '../core/ui.js';
import { tabs } from '../core/komp.js';
import { pasangEfek, segarkanEfek } from '../core/efek.js';
import { bukaFormulir, aksiKonfirmasi, tglPendek, segmen } from './_t34.js';

const STATUS = ['Baru', 'Dikerjakan', 'Selesai', 'Dibatalkan'];

export async function render(el, { query }) {
  let tab = ['saya', 'diberikan', 'semua'].includes(query?.get('tab')) ? query.get('tab') : 'saya', fStatus = 'aktif', data = null, penerima = null;
  el.innerHTML = String(html`
    ${judulHalaman({ pill: 'Koordinasi Kerja', sorot: 'Tugas', sisa: '& Penugasan',
      sub: 'Catat dan pantau tugas: dari Kapokja ke anggota Pokja, dari Pokja TU ke pegawai, atau tugas pribadi. Penerima mendapat notifikasi, pemberi tugas diberi tahu saat tugas selesai.',
      aksi: String(html`<button class="btn btn-primary" data-tambah>${raw(ikon('plus', 18))} Tugas Baru</button>`) })}
    <div data-kpi></div>
    <div data-tabs class="rv"></div>
    <div data-segwadah class="rv"></div>
    <div data-isi class="rv"><div class="skel" style="height:220px;border-radius:20px"></div></div>`);
  pasangEfek(el);
  const $ = (x) => el.querySelector(x);

  const kartu = (t) => html`<article class="tugas-kartu ${t.prioritas} ${['Selesai', 'Dibatalkan'].includes(t.status) ? 'selesai' : ''}">
    <span class="garis" aria-hidden="true"></span>
    <div style="min-width:0"><h4>${t.judul}</h4>${t.deskripsi ? html`<p style="font-size:.9063rem;margin-top:4px">${t.deskripsi}</p>` : ''}
      <div class="meta"><span>${raw(ikon('user', 14))} ${tab === 'diberikan' ? 'Untuk ' + (t.penerima_nama || '—') : 'Dari ' + (t.pemberi_nama || '—')}${tab === 'semua' ? ' → ' + (t.penerima_nama || '') : ''}</span>
        ${t.tenggat ? html`<span class="${t.terlambat ? 'telat' : ''}">${raw(ikon('calendar', 14))} ${t.terlambat ? 'Terlambat · ' : ''}Tenggat ${tglPendek(t.tenggat)}</span>` : ''}
        <span>${raw(ikon('flag', 14))} Prioritas ${t.prioritas}</span>${t.pokja_nama ? html`<span>Pokja ${t.pokja_nama}</span>` : ''}<span>${relatif(t.diubah_pada)}</span></div>
      ${t.catatan ? html`<p class="meta" style="color:var(--teks)">${raw(ikon('msg', 14))} ${t.catatan}</p>` : ''}</div>
    <div class="kanan">
      ${t.boleh_status ? html`<label class="sr-only" for="st-${t.id}">Status tugas</label><select id="st-${t.id}" class="select" data-status="${t.id}" style="min-height:40px;height:40px;width:150px">
        ${STATUS.map((x) => html`<option ${x === t.status ? raw('selected') : ''}>${x}</option>`)}</select>` : html`<span class="badge b-draft">${t.status}</span>`}
      ${t.boleh_ubah ? html`<button class="btn btn-icon" data-ubah="${t.id}" aria-label="Ubah tugas">${raw(ikon('pencil', 18))}</button>` : ''}
      ${t.boleh_hapus ? html`<button class="btn btn-icon" data-hapus="${t.id}" aria-label="Hapus tugas">${raw(ikon('trash', 18))}</button>` : ''}</div></article>`;
  const gambar = (d) => {
    data = d;
    const r = d.ringkasan || {};
    $('[data-kpi]').innerHTML = String(html`<div class="kpi-row" style="--kolom:3">
      <div class="kpi" data-tilt><span class="kpi-badge">${raw(ikon('tugas', 22))}</span><span class="kpi-label">Tugas Saya Aktif</span><span class="kpi-num">${angka(r.saya_aktif)}<small>tugas</small></span><span class="kpi-note">Baru atau Dikerjakan</span></div>
      <div class="kpi coral" data-tilt><span class="kpi-badge">${raw(ikon('alert', 22))}</span><span class="kpi-label">Terlambat</span><span class="kpi-num">${angka(r.saya_terlambat)}<small>tugas</small></span><span class="kpi-note">melewati tenggat</span></div>
      <div class="kpi sky" data-tilt><span class="kpi-badge">${raw(ikon('send', 22))}</span><span class="kpi-label">Saya Berikan (aktif)</span><span class="kpi-num">${angka(r.diberikan_aktif)}<small>tugas</small></span><span class="kpi-note">menunggu diselesaikan</span></div></div>`);
    const t = [['saya', 'Tugas Saya'], ['diberikan', 'Saya Berikan']];
    if (d.boleh_semua) t.push(['semua', 'Semua Tugas']);
    $('[data-tabs]').innerHTML = String(tabs(t, tab));
    $('[data-segwadah]').innerHTML = String(segmen([['aktif', 'Aktif'], ['Selesai', 'Selesai'], ['', 'Semua']], fStatus));
    const b = d.baris.filter((x) => !fStatus || (fStatus === 'aktif' ? ['Baru', 'Dikerjakan'].includes(x.status) : x.status === fStatus));
    $('[data-isi]').innerHTML = String(b.length ? html`<div class="tugas-daftar rv-anak on">${b.map(kartu)}</div>`
      : html`<section class="card">${kosong({ ikonNama: 'tugas', judul: tab === 'saya' ? 'Tidak ada tugas untuk Anda' : 'Belum ada tugas', teks: 'Tekan "Tugas Baru" untuk mencatat atau memberi tugas.' })}</section>`);
    segarkanEfek(el);
  };
  async function muat() {
    try { await swr('tugas:' + tab, () => api.daftarTugas({ mode: tab }), gambar, { ttl: 8_000 }); }
    catch (e) { $('[data-isi]').innerHTML = String(kotakGalat(pesanGalat(e))); }
  }
  const segar = () => { hapusCache('tugas:'); muat(); };
  const form = async (lama = null) => {
    penerima ||= await api.penerimaTugas().catch(() => []);
    bukaFormulir({
      judul: lama ? 'Ubah Tugas' : 'Tugas Baru', ukuran: '', data: lama || { prioritas: 'Sedang', ditugaskan_ke: penerima.find((p) => p.diri)?.id, tenggat: '' },
      atas: String(html`<p class="redup" style="margin-bottom:12px;font-size:.875rem">Daftar penerima mengikuti kewenangan Anda: diri sendiri, anggota Pokja yang Anda pimpin (Kapokja), atau semua pegawai (Pokja TU).</p>`),
      defs: [{ kolom: [{ k: 'judul', l: 'Judul tugas', wajib: true, lebar: true }, { k: 'deskripsi', l: 'Uraian', tipe: 'area', lebar: true, baris: 3 },
        { k: 'ditugaskan_ke', l: 'Ditugaskan kepada', tipe: 'pilih', wajib: true, lebar: true, opsi: penerima.map((p) => [p.id, p.diri ? `${p.nama} (saya)` : `${p.nama}${p.pokja ? ' · ' + p.pokja : ''}`]) },
        { k: 'tenggat', l: 'Tenggat', tipe: 'tanggal', help: `Hari ini ${tglPendek(hariIni())}` }, { k: 'prioritas', l: 'Prioritas', tipe: 'pilih', opsi: ['Rendah', 'Sedang', 'Tinggi'], kosong: null }] }],
      simpan: async (o) => { await api.simpanTugas({ ...o, id: lama?.id }); toast(lama ? 'Tugas diperbarui.' : 'Tugas tersimpan. Penerima mendapat notifikasi.'); segar(); },
    });
  };
  el.addEventListener('change', async (e) => {
    const s = e.target.closest('[data-status]'); if (!s) return;
    try { await api.ubahStatusTugas(s.dataset.status, s.value); toast(`Status: ${s.value}.`); segar(); } catch (err) { toast(pesanGalat(err), 'galat'); segar(); }
  });
  el.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; return muat(); }
    const sg = e.target.closest('[data-seg]'); if (sg && 'seg' in sg.dataset) { fStatus = sg.dataset.seg; return data && gambar(data); }
    const cari = (k) => data?.baris.find((x) => x.id === e.target.closest(`[data-${k}]`)?.dataset[k]);
    if (e.target.closest('[data-tambah]')) return form();
    if (e.target.closest('[data-ubah]')) return form(cari('ubah'));
    if (e.target.closest('[data-hapus]')) { const x = cari('hapus'); return aksiKonfirmasi({ judul: 'Hapus tugas?', pesan: `"${x.judul}" dihapus.`, label: 'Hapus', bahaya: true, jalan: () => api.hapusTugas(x.id), sukses: 'Tugas dihapus.' }).then((ok) => ok && segar()); }
    if (e.target.closest('[data-ulang]')) return segar();
  });
  muat();
  return bus.on('notif-baru', (n) => { if (/Tugas/i.test(n?.judul || '')) segar(); });
}
