// Kepegawaian & OJT (workspace Pokja Kepegawaian; OJT juga Pokja TU): kelola pegawai pusat & SDM pendamping,
// sinkron dari akun SITASI, impor Excel, dan OJT beserta berkas (undangan, daftar hadir, laporan).
import { html, raw, angka, debounce } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { hapusCache, swr } from '../core/store.js';
import { judulHalaman, kosong, kotakGalat, skelTabel, pesanGalat, toast, tombolMuat, bukaModal, chipPokja } from '../core/ui.js';
import { tabs, pokjaCepat } from '../core/komp.js';
import { bukaImpor } from '../core/impor.js';
import { daftarBerkas, pasangUnggah } from '../core/unggah.js';
import { pasangEfek } from '../core/efek.js';
import { PROVINSI, tabel, bukaFormulir, aksiKonfirmasi, tglPendek } from './_t34.js';
import * as P from '../core/peran.js';

const KOLOM_IMPOR = [{ k: 'nama', x: 'Nama', wajib: true }, { k: 'jenis', x: 'Jenis', alias: ['Pusat/Pendamping'] }, { k: 'nip', x: 'NIP' }, { k: 'jabatan', x: 'Jabatan' },
  { k: 'golongan', x: 'Golongan', alias: ['Pangkat/Golongan'] }, { k: 'pokja_kode', x: 'Kode Pokja', alias: ['Pokja'] }, { k: 'provinsi', x: 'Provinsi' }, { k: 'kabkota', x: 'Kab/Kota', alias: ['Kabupaten/Kota'] },
  { k: 'no_hp', x: 'No HP', alias: ['Nomor HP', 'HP'] }, { k: 'email', x: 'Email' }, { k: 'mulai_tugas', x: 'Mulai Tugas', alias: ['TMT'] }, { k: 'status', x: 'Status' }];

export async function render(el, { sesi: s }) {
  const bolehPeg = P.isSuperAdmin(s) || P.diPokja(s, 'KEPEGAWAIAN');
  let tab = bolehPeg ? 'pusat' : 'ojt', q = '';
  const pokja = await pokjaCepat();
  const opsiPokja = pokja.map((p) => [p.id, p.nama_pendek]);
  const daftarTab = () => [...(bolehPeg ? [['pusat', 'Pegawai Kantor Pusat'], ['pendamping', 'SDM Pendamping']] : []), ['ojt', 'OJT']];
  el.innerHTML = String(html`
    ${judulHalaman({ pill: 'Workspace Kepegawaian', sorot: 'Kepegawaian', sisa: '& OJT',
      sub: bolehPeg ? 'Kelola data pegawai kantor pusat dan SDM pendamping lapangan. Tautkan pegawai ke akun SITASI agar dapat mengisi jadwalnya sendiri.' : 'Pokja TU mengelola OJT (On the Job Training) beserta berkasnya.',
      aksi: '<div data-aksi style="display:flex;gap:10px;flex-wrap:wrap"></div>' })}
    <div data-tabs></div>
    <section class="card filter-card" style="margin-bottom:16px" data-cari-kartu><label class="input-ikon">${raw(ikon('search', 18))}<input class="input" data-q placeholder="Cari nama, NIP, jabatan" aria-label="Cari"></label></section>
    <section class="card table-card rv" data-isi>${skelTabel(8, 6)}</section>`);
  pasangEfek(el);
  const $ = (x) => el.querySelector(x);
  let barisPeg = [], barisOjt = [], semuaPeg = [];

  const gAksi = () => {
    $('[data-tabs]').innerHTML = String(tabs(daftarTab(), tab));
    $('[data-cari-kartu]').hidden = tab === 'ojt';
    $('[data-aksi]').innerHTML = String(tab === 'ojt'
      ? html`<button class="btn btn-primary" data-tambah-ojt>${raw(ikon('plus', 18))} Tambah OJT</button>`
      : html`<button class="btn btn-ghost" data-sinkron>${raw(ikon('refresh', 18))} Sinkron dari akun</button>
        <button class="btn btn-secondary" data-impor>${raw(ikon('upload', 18))} Impor Excel</button>
        <button class="btn btn-primary" data-tambah>${raw(ikon('user-plus', 18))} Tambah ${tab === 'pusat' ? 'Pegawai' : 'Pendamping'}</button>`);
  };
  const defsPeg = (jenis) => [
    { judul: 'Identitas', kolom: [{ k: 'nama', l: 'Nama lengkap', wajib: true, lebar: true }, { k: 'nip', l: 'NIP', tipe: 'angka', maks: 18 }, { k: 'jabatan', l: 'Jabatan' },
      { k: 'golongan', l: 'Pangkat/Golongan' }, { k: 'status', l: 'Status', tipe: 'pilih', opsi: ['Aktif', 'Nonaktif'], kosong: null }] },
    jenis === 'pusat'
      ? { judul: 'Penempatan', kolom: [{ k: 'pokja_id', l: 'Pokja', tipe: 'pilih', opsi: opsiPokja }, { k: 'urutan', l: 'Urutan tampil di jadwal', tipe: 'angka', help: 'Angka kecil tampil lebih atas' },
        { k: 'mulai_tugas', l: 'Mulai tugas', tipe: 'tanggal' }] }
      : { judul: 'Wilayah Tugas', kolom: [{ k: 'provinsi', l: 'Provinsi', tipe: 'pilih', opsi: PROVINSI, wajib: true }, { k: 'kabkota', l: 'Kabupaten/Kota' }, { k: 'mulai_tugas', l: 'Mulai tugas', tipe: 'tanggal' }] },
    { judul: 'Kontak', kolom: [{ k: 'no_hp', l: 'No. HP', tipe: 'tel' }, { k: 'email', l: 'Email', tipe: 'email' }, { k: 'catatan', l: 'Catatan', tipe: 'area', lebar: true, baris: 2 }] },
  ];
  const formPeg = (lama = null) => bukaFormulir({
    judul: lama ? 'Ubah ' + lama.nama : tab === 'pusat' ? 'Tambah Pegawai Kantor Pusat' : 'Tambah SDM Pendamping', defs: defsPeg(lama?.jenis || tab), data: lama || { status: 'Aktif' },
    atas: lama?.akun_email ? String(html`<div class="info-card biru" style="margin-bottom:16px">${raw(ikon('link', 20, 'ik'))}<span>Tertaut ke akun SITASI <b>${lama.akun_email}</b>: pegawai ini dapat mengisi jadwalnya sendiri.</span></div>`) : '',
    simpan: async (o) => { await api.simpanPegawai({ ...o, id: lama?.id, jenis: lama?.jenis || tab, pengguna_id: lama?.pengguna_id || null }); toast('Data pegawai tersimpan.'); segar(); },
  });
  const formOjt = (lama = null) => bukaFormulir({
    judul: lama ? 'Ubah OJT' : 'Tambah OJT', data: lama || { status: 'Rencana' },
    defs: [{ kolom: [{ k: 'judul', l: 'Judul OJT', wajib: true, lebar: true }, { k: 'penyelenggara', l: 'Penyelenggara' }, { k: 'lokasi', l: 'Lokasi' },
      { k: 'tanggal_mulai', l: 'Tanggal mulai', tipe: 'tanggal', wajib: true }, { k: 'tanggal_selesai', l: 'Tanggal selesai', tipe: 'tanggal' },
      { k: 'status', l: 'Status', tipe: 'pilih', opsi: ['Rencana', 'Berlangsung', 'Selesai', 'Batal'], kosong: null }, { k: 'peserta_luar', l: 'Jumlah peserta dari luar', tipe: 'angka' },
      { k: 'peserta', l: 'Peserta (pegawai/pendamping terdaftar)', tipe: 'multi', lebar: true, opsi: semuaPeg.filter((p) => p.status === 'Aktif').map((p) => [p.id, p.nama]) },
      { k: 'catatan', l: 'Catatan', tipe: 'area', lebar: true, baris: 2 }] }],
    simpan: async (o) => { await api.simpanOjt({ ...o, id: lama?.id }); toast('OJT tersimpan.'); segar(); },
  });
  const berkasOjt = async (o) => {
    const m = bukaModal({ judul: 'Berkas OJT · ' + o.judul, ukuran: 'besar', isi: '<div class="skel" style="height:200px"></div>', kaki: '<button class="btn btn-ghost" data-batal>Tutup</button>' });
    const gambar = async () => {
      const b = await api.berkasKonteks('ojt', o.id);
      m.body.innerHTML = String(html`<div class="grid grid-2" style="gap:12px">
        ${[['undangan', 'Undangan / surat tugas'], ['daftar_hadir', 'Daftar hadir'], ['materi', 'Materi'], ['laporan', 'Laporan & dokumentasi']].map(([j, judul]) =>
          daftarBerkas({ konteks: 'ojt', ref: o.id, jenis: j, judul, berkas: b, boleh: true }))}</div>`);
    };
    pasangUnggah(m.body, { muatUlang: async () => { await gambar(); segar(); } });
    try { await gambar(); } catch (e) { m.body.innerHTML = String(kotakGalat(pesanGalat(e))); }
  };

  const gPeg = (d) => {
    barisPeg = d.baris;
    if (!d.baris.length) { $('[data-isi]').innerHTML = String(kosong({ ikonNama: 'pegawai', judul: 'Belum ada data', teks: 'Tambah satu per satu, impor Excel, atau sinkron dari akun SITASI.' })); return; }
    $('[data-isi]').innerHTML = String(html`<div class="card-head" style="padding:20px 20px 8px"><h2 class="card-title">${tab === 'pusat' ? 'Pegawai Kantor Pusat' : 'SDM Pendamping'}</h2><span class="badge b-proc">${angka(d.total)} orang</span></div>
      ${tabel(d.baris, [
        ['Nama', (p) => html`<div class="sel-utama"><b>${p.nama}</b><small class="mono">${p.nip || ''}</small></div>`],
        ['Jabatan', (p) => html`<div class="sel-utama">${p.jabatan || '—'}<small>${p.golongan || ''}</small></div>`],
        tab === 'pusat' ? ['Pokja', (p) => (p.pokja_nama ? chipPokja({ nama_pendek: p.pokja_nama, warna: p.warna, warna_tint: p.warna_tint, warna_teks: p.warna_teks }) : '—')]
          : ['Wilayah', (p) => html`<div class="sel-utama">${p.kabkota || '—'}<small>${p.provinsi || ''}</small></div>`],
        ['Akun SITASI', (p) => (p.akun_email ? html`<span class="badge b-ok kecil">${raw(ikon('link', 14))} Tertaut</span>` : html`<span class="badge b-draft kecil">Belum</span>`)],
        ['Status', (p) => html`<span class="badge ${p.status === 'Aktif' ? 'b-ok' : 'b-lock'} kecil">${p.status}</span>`],
        ['', (p) => html`<button class="btn btn-icon" data-ubah="${p.id}" title="Ubah" aria-label="Ubah ${p.nama}">${raw(ikon('pencil', 18))}</button>
          <button class="btn btn-icon" data-hapus="${p.id}" title="Hapus" aria-label="Hapus ${p.nama}">${raw(ikon('trash', 18))}</button>`, 'kanan'],
      ])}`);
  };
  const gOjt = (d) => {
    barisOjt = d.baris;
    if (!d.baris.length) { $('[data-isi]').innerHTML = String(kosong({ ikonNama: 'graduation', judul: 'Belum ada OJT', aksi: String(html`<button class="btn btn-primary" data-tambah-ojt style="margin-top:12px">${raw(ikon('plus', 18))} Tambah OJT</button>`) })); return; }
    $('[data-isi]').innerHTML = String(html`<div class="card-head" style="padding:20px 20px 8px"><h2 class="card-title">Daftar OJT</h2><span class="badge b-proc">${angka(d.baris.length)}</span></div>
      ${tabel(d.baris, [
        ['Kegiatan', (o) => html`<div class="sel-utama"><b>${o.judul}</b><small>${[o.penyelenggara, o.lokasi].filter(Boolean).join(' · ')}</small></div>`],
        ['Tanggal', (o) => html`${tglPendek(o.tanggal_mulai)}${o.tanggal_selesai && o.tanggal_selesai !== o.tanggal_mulai ? ' – ' + tglPendek(o.tanggal_selesai) : ''}`],
        ['Peserta', (o) => angka((o.peserta || []).length + (o.peserta_luar || 0))], ['Status', (o) => o.status],
        ['Berkas', (o) => html`<button class="btn btn-sm btn-secondary" data-berkas-ojt="${o.id}">${raw(ikon('paperclip', 16))} ${o.jumlah_berkas} · Unggah</button>`],
        ['', (o) => html`<button class="btn btn-icon" data-ubah-ojt="${o.id}" aria-label="Ubah OJT">${raw(ikon('pencil', 18))}</button>
          <button class="btn btn-icon" data-hapus-ojt="${o.id}" aria-label="Hapus OJT">${raw(ikon('trash', 18))}</button>`, 'kanan'],
      ])}`);
  };
  async function muat() {
    gAksi();
    try {
      if (tab === 'ojt') {
        if (!semuaPeg.length) semuaPeg = (await api.daftarPegawai({ per: 500 })).baris;
        await swr('kep:ojt', () => api.daftarOjt({}), gOjt, { ttl: 5_000 });
      } else await swr('kep:' + tab + ':' + q, () => api.daftarPegawai({ jenis: tab, q, per: 500 }), gPeg, { ttl: 5_000 });
    } catch (e) { $('[data-isi]').innerHTML = String(kotakGalat(pesanGalat(e))); }
  }
  const segar = () => { hapusCache('kep:'); hapusCache('peg:'); semuaPeg = []; muat(); };

  el.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; return muat(); }
    const x = (sel) => e.target.closest(sel);
    if (x('[data-tambah]')) return formPeg();
    if (x('[data-ubah]')) return formPeg(barisPeg.find((p) => p.id === x('[data-ubah]').dataset.ubah));
    if (x('[data-hapus]')) {
      const p = barisPeg.find((y) => y.id === x('[data-hapus]').dataset.hapus);
      return aksiKonfirmasi({ judul: 'Hapus pegawai?', pesan: `Data ${p.nama} dihapus. Bila pegawai sudah memiliki jadwal, ubah statusnya menjadi Nonaktif saja.`, label: 'Hapus', bahaya: true,
        jalan: () => api.hapusPegawai(p.id), sukses: 'Data pegawai dihapus.' }).then((ok) => ok && segar());
    }
    if (x('[data-sinkron]')) {
      const pulih = tombolMuat(x('[data-sinkron]'), 'Menyinkron…');
      try { const n = await api.sinkronPegawai(); toast(n ? `${angka(n)} pegawai baru ditambahkan dari akun SITASI.` : 'Semua akun pegawai sudah tercatat.', n ? 'sukses' : 'info'); segar(); }
      catch (err) { toast(pesanGalat(err), 'galat'); pulih(); }
      return;
    }
    if (x('[data-impor]')) {
      return bukaImpor({ judul: 'Impor Data Pegawai', kolom: KOLOM_IMPOR, ket: 'Kolom "Jenis" diisi <b>pusat</b> atau <b>pendamping</b>. Nama + provinsi (atau NIP) yang sudah ada dilewati.',
        wajib: (o) => !!o.nama, ubah: (o) => ({ ...o, jenis: /pendamping/i.test(o.jenis || '') ? 'pendamping' : /pusat/i.test(o.jenis || '') ? 'pusat' : tab }),
        kirim: (rows, uji) => api.imporPegawai(rows, uji), pratinjauKolom: ['_baris', 'nama', 'jenis', 'jabatan', 'provinsi'],
        template: { nama: 'Template-Pegawai', data: [['Nama Pendamping', 'pendamping', '', 'Pendamping Rehabilitasi Sosial', '', '', 'Jawa Barat', 'Kab. Bogor', '0812-0000-0000', '', '2024-02-01', 'Aktif']] }, onSelesai: segar });
    }
    if (x('[data-tambah-ojt]')) { if (!semuaPeg.length) semuaPeg = (await api.daftarPegawai({ per: 500 })).baris; return formOjt(); }
    if (x('[data-ubah-ojt]')) return formOjt(barisOjt.find((o) => o.id === x('[data-ubah-ojt]').dataset.ubahOjt));
    if (x('[data-berkas-ojt]')) return berkasOjt(barisOjt.find((o) => o.id === x('[data-berkas-ojt]').dataset.berkasOjt));
    if (x('[data-hapus-ojt]')) {
      const o = barisOjt.find((y) => y.id === x('[data-hapus-ojt]').dataset.hapusOjt);
      return aksiKonfirmasi({ judul: 'Hapus OJT?', pesan: `"${o.judul}" dihapus.`, label: 'Hapus', bahaya: true, jalan: () => api.hapusOjt(o.id), sukses: 'OJT dihapus.' }).then((ok) => ok && segar());
    }
    if (x('[data-ulang]')) return segar();
  });
  $('[data-q]').addEventListener('input', debounce((e) => { q = e.target.value.trim(); muat(); }, 300));
  muat();
}
