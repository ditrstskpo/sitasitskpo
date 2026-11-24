// Jadwal Pegawai Kantor Pusat (PRD 5.4): kisi bulanan Perjadin / Fullday / Fullboard, Sabtu–Minggu & hari libur
// tetap bisa diisi, warna sama untuk kegiatan yang sama di hari yang sama, rekap per pegawai otomatis, realtime.
import { html, raw, angka, debounce, hariIni, esc } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { judulHalaman, kosong, kotakGalat, pesanGalat, toast, tombolMuat, bukaModal, konfirmasi } from '../core/ui.js';
import { opsi, pokjaCepat, namaUnduhan } from '../core/komp.js';
import { pasangEfek, pastikanTip } from '../core/efek.js';
import { unduhExcel } from '../core/xlsx.js';
import { bukaFormulir } from './_t34.js';

const NB = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const NH = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const SINGKAT = { Perjadin: 'PJ', Fullday: 'FD', Fullboard: 'FB' };
const JD_PALET = ['#17824A', '#3E66B3', '#C99A0E', '#7B5EC2', '#D9644A', '#0E9F97', '#C2477F', '#5B6B7F', '#8C6A3E', '#2A4B8D'];
const kunciKeg = (j) => String(j.kegiatan || '').trim().toLowerCase();

/** Pewarnaan rakus: kegiatan yang berbagi tanggal mendapat warna berbeda; kegiatan sama = warna sama. */
function warnaKegiatan(jadwal) {
  const tgl = new Map();
  jadwal.forEach((j) => { const k = kunciKeg(j); if (!tgl.has(k)) tgl.set(k, new Set()); tgl.get(k).add(j.tanggal); });
  const urut = [...tgl.keys()].sort((a, b) => [...tgl.get(a)].sort()[0].localeCompare([...tgl.get(b)].sort()[0]));
  const hasil = new Map();
  urut.forEach((k, n) => {
    // mulai dari warna urutan kegiatan (agar kegiatan berbeda cenderung berbeda warna), lalu hindari warna
    // kegiatan lain yang berlangsung di hari yang sama
    const pakai = new Set(urut.filter((x) => hasil.has(x) && [...tgl.get(x)].some((t) => tgl.get(k).has(t))).map((x) => hasil.get(x)));
    let i = 0; while (pakai.has((n + i) % JD_PALET.length) && i < JD_PALET.length) i++;
    hasil.set(k, (n + i) % JD_PALET.length);
  });
  return (j) => JD_PALET[hasil.get(kunciKeg(j)) ?? 0];
}

export async function render(el, { query }) {
  const kini = new Date(hariIni() + 'T00:00:00');
  let th = Number(query?.get('tahun')) || kini.getFullYear(), bl = Number(query?.get('bulan')) || kini.getMonth() + 1;
  let data = null, fPokja = '', fq = '';
  const pokja = await pokjaCepat();
  el.innerHTML = String(html`
    ${judulHalaman({ pill: 'Kantor Pusat Dit. RSTSKPO', sorot: 'Jadwal Pegawai', sisa: 'Bulanan',
      sub: 'Kisi jadwal Perjadin, Fullday, dan Fullboard. Klik kotak kosong untuk mengisi; pegawai dapat mengisi jadwalnya sendiri, Pokja TU dapat mengisi untuk semua pegawai. Perubahan tampil realtime.',
      aksi: '<div data-aksi style="display:flex;gap:10px;flex-wrap:wrap"></div>' })}
    <section class="card rv" style="margin-bottom:16px"><div class="jadwal-alat">
      <div class="bulan-nav"><button class="btn btn-icon" data-geser="-1" aria-label="Bulan sebelumnya">${raw(ikon('chevron-left', 18))}</button>
        <b data-judul-bulan></b><button class="btn btn-icon" data-geser="1" aria-label="Bulan berikutnya">${raw(ikon('chevron-right', 18))}</button></div>
      <button class="btn btn-ghost btn-sm" data-bulan-ini>Bulan ini</button>
      <select class="select" data-pokja style="max-width:240px" aria-label="Saring Pokja">${opsi(pokja.map((p) => [p.id, 'Pokja ' + p.nama_pendek]), '', 'Semua Pokja')}</select>
      <label class="input-ikon" style="flex:1 1 200px;max-width:320px">${raw(ikon('search', 18))}<input class="input" data-cari placeholder="Cari pegawai" aria-label="Cari pegawai"></label>
      <span class="spacer" style="flex:1"></span>
      <div class="rekap-jenis" aria-label="Keterangan jenis"><span class="pj">PJ</span><small class="redup">Perjadin</small><span class="fd">FD</span><small class="redup">Fullday</small><span class="fb">FB</span><small class="redup">Fullboard</small></div>
    </div></section>
    <div data-kisi class="rv"><div class="skel" style="height:420px;border-radius:18px"></div></div>
    <section class="card rv" style="margin-top:16px"><div class="card-head"><span class="ubin emas">${raw(ikon('calendar', 22))}</span><div><h2 class="card-title">Kegiatan Bulan Ini</h2>
      <p class="card-sub">Warna yang sama menandai kegiatan yang sama. Hari libur nasional ditandai merah muda dan tetap dapat diisi.</p></div></div><div data-legenda></div></section>`);
  pasangEfek(el); pastikanTip();
  const $ = (q) => el.querySelector(q);

  const hari = () => { const n = new Date(th, bl, 0).getDate(); return Array.from({ length: n }, (_, i) => `${th}-${String(bl).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`); };
  const pegSaya = () => data?.pegawai.find((p) => p.milik_saya);
  const boleh = (p) => data?.boleh_semua || p?.milik_saya;

  function gambar() {
    $('[data-judul-bulan]').textContent = `${NB[bl - 1]} ${th}`;
    $('[data-aksi]').innerHTML = String(html`${data?.boleh_semua ? html`<button class="btn btn-ghost" data-libur>${raw(ikon('flag', 18))} Atur hari libur</button>` : ''}
      <button class="btn btn-secondary" data-unduh>${raw(ikon('sheet', 18))} Unduh Excel</button>
      ${data?.boleh_semua || pegSaya() ? html`<button class="btn btn-primary" data-tambah>${raw(ikon('calendar-plus', 18))} Tambah Kegiatan</button>` : ''}`);
    if (!data) return;
    const pg = data.pegawai.filter((p) => (!fPokja || p.pokja_id === fPokja) && (!fq || p.nama.toLowerCase().includes(fq.toLowerCase())));
    if (!data.pegawai.length) {
      $('[data-kisi]').innerHTML = String(html`<section class="card">${kosong({ ikonNama: 'jadwal', judul: 'Belum ada data pegawai kantor pusat', teks: 'Pokja Kepegawaian menambahkan pegawai di menu Kepegawaian & OJT (tombol "Sinkron dari akun").' })}</section>`);
      $('[data-legenda]').innerHTML = ''; return;
    }
    const peta = new Map(data.jadwal.map((j) => [j.pegawai_id + '|' + j.tanggal, j]));
    const libur = new Map((data.libur || []).map((x) => [x.tanggal, x.nama]));
    const warna = warnaKegiatan(data.jadwal);
    const hh = hari(), hi = hariIni();
    const kelasKol = (t) => { const w = new Date(t + 'T00:00:00').getDay(); return [libur.has(t) ? 'libur' : w === 0 || w === 6 ? 'akhir-pekan' : '', t === hi ? 'hari-ini' : ''].join(' '); };
    $('[data-kisi]').innerHTML = String(html`<div class="jadwal-wrap"><table class="jadwal"><thead><tr><th class="kol-nama">Pegawai</th>
      ${hh.map((t) => html`<th class="${kelasKol(t)}" ${libur.has(t) ? raw(`data-tip="${esc(libur.get(t))}"`) : ''}>${Number(t.slice(8))}<small>${NH[new Date(t + 'T00:00:00').getDay()]}</small></th>`)}
      <th class="kol-rekap">Rekap</th></tr></thead><tbody>
      ${pg.map((p) => {
        const r = { Perjadin: 0, Fullday: 0, Fullboard: 0 };
        const sel = hh.map((t) => {
          const j = peta.get(p.id + '|' + t);
          if (j) r[j.jenis]++;
          const bisa = boleh(p);
          return html`<td class="${kelasKol(t)}"><button type="button" class="jd-sel" data-sel="${p.id}|${t}" ${!j && !bisa ? raw('disabled') : ''}
            aria-label="${p.nama}, ${Number(t.slice(8))} ${NB[bl - 1]}${j ? ': ' + j.kegiatan : bisa ? ', kosong — tambah kegiatan' : ', kosong'}"
            ${j ? raw(`data-tip="${esc(`${p.nama} · ${Number(t.slice(8))} ${NB[bl - 1]}: ${j.kegiatan} (${j.jenis})${j.lokasi ? ' · ' + j.lokasi : ''}`)}"`) : ''}>
            ${j ? html`<span class="jd-isi" style="--c:${warna(j)}">${SINGKAT[j.jenis]}</span>` : ''}</button></td>`;
        });
        const tot = r.Perjadin + r.Fullday + r.Fullboard;
        return html`<tr><th class="kol-nama" scope="row"><b>${p.nama}</b><small>${p.pokja_nama || p.jabatan || ''}${p.milik_saya ? ' · Anda' : ''}</small></th>${sel}
          <td class="kol-rekap"><span class="rekap-jenis"><span class="pj" title="Perjadin">${r.Perjadin}</span><span class="fd" title="Fullday">${r.Fullday}</span><span class="fb" title="Fullboard">${r.Fullboard}</span></span> <b>${tot}</b> hari</td></tr>`;
      })}</tbody></table></div>`);
    // legenda kegiatan
    const g = new Map();
    data.jadwal.forEach((j) => { const k = kunciKeg(j); const x = g.get(k) || { j, tgl: new Set(), peg: new Set() }; x.tgl.add(j.tanggal); x.peg.add(j.pegawai_id); g.set(k, x); });
    $('[data-legenda]').innerHTML = String(g.size ? html`<div class="jd-legenda">${[...g.values()].sort((a, b) => [...a.tgl].sort()[0].localeCompare([...b.tgl].sort()[0])).map((x) => {
      const t = [...x.tgl].sort();
      return html`<span style="--c:${warna(x.j)}"><i></i>${x.j.kegiatan} · ${SINGKAT[x.j.jenis]} · ${Number(t[0].slice(8))}${t.length > 1 ? '–' + Number(t[t.length - 1].slice(8)) : ''} ${NB[bl - 1].slice(0, 3)} · ${angka(x.peg.size)} orang</span>`;
    })}</div>` : html`<p class="redup">Belum ada kegiatan pada bulan ini.</p>`);
  }

  async function muat() {
    try { data = await api.jadwalBulan(th, bl); gambar(); }
    catch (e) { $('[data-kisi]').innerHTML = String(html`<section class="card">${kotakGalat(pesanGalat(e))}</section>`); }
  }

  const formTambah = ({ pegawaiId = null, tanggal = null } = {}) => {
    const pilihan = data.boleh_semua ? data.pegawai.filter((p) => p.status === 'Aktif' || p.id === pegawaiId).map((p) => [p.id, p.nama]) : null;
    const saya = pegSaya();
    bukaFormulir({
      judul: 'Tambah Kegiatan', ukuran: 'besar', label: 'Simpan jadwal',
      data: { mulai: tanggal || hariIni(), selesai: tanggal || '', pegawai: pegawaiId ? [pegawaiId] : [] },
      atas: !data.boleh_semua && saya ? String(html`<div class="info-card biru" style="margin-bottom:16px">${raw(ikon('info', 20, 'ik'))}<span>Jadwal diisi untuk <b>${saya.nama}</b> (akun Anda). Jadwal pegawai lain diisi oleh Pokja TU.</span></div>`) : '',
      defs: [{ kolom: [
        { k: 'kegiatan', l: 'Nama kegiatan', wajib: true, lebar: true, ph: 'mis. Supermonev Kab. Indramayu' },
        { k: 'jenis', l: 'Jenis penugasan', tipe: 'pilih', opsi: ['Perjadin', 'Fullday', 'Fullboard'], wajib: true }, { k: 'lokasi', l: 'Lokasi', ph: 'mis. Kab. Indramayu' },
        { k: 'mulai', l: 'Tanggal mulai', tipe: 'tanggal', wajib: true }, { k: 'selesai', l: 'Tanggal selesai', tipe: 'tanggal', help: 'Kosongkan bila satu hari' },
        ...(pilihan ? [{ k: 'pegawai', l: 'Pegawai yang bertugas', tipe: 'multi', opsi: pilihan, wajib: true, lebar: true }] : []),
        { k: 'keterangan', l: 'Keterangan', tipe: 'area', lebar: true, baris: 2 },
      ] }],
      simpan: async (o) => {
        const r = await api.simpanJadwal({ ...o, pegawai: pilihan ? o.pegawai : [saya.id] });
        toast(`${angka(r.ditambah)} hari-pegawai tersimpan.`);
        if (r.konflik?.length) toast(`${r.konflik.length} tanggal dilewati karena sudah terisi: ` + r.konflik.slice(0, 4).map((k) => `${k.pegawai} ${k.tanggal.slice(8)} (${k.kegiatan})`).join(', ') + (r.konflik.length > 4 ? ', …' : ''), 'peringatan', 'Sebagian tanggal sudah terisi');
        await muat();
      },
    });
  };

  const bukaSel = (pid, t) => {
    const p = data.pegawai.find((x) => x.id === pid), j = data.jadwal.find((x) => x.pegawai_id === pid && x.tanggal === t);
    if (!j) { if (boleh(p)) formTambah({ pegawaiId: pid, tanggal: t }); return; }
    const grup = data.jadwal.filter((x) => x.grup === j.grup);
    const nama = (id) => data.pegawai.find((x) => x.id === id)?.nama || '—';
    const m = bukaModal({
      judul: j.kegiatan, ukuran: 'kecil',
      isi: String(html`<dl class="kv"><div><dt>Pegawai</dt><dd>${p.nama}</dd></div><div><dt>Tanggal</dt><dd>${Number(t.slice(8))} ${NB[bl - 1]} ${th}</dd></div>
        <div><dt>Jenis</dt><dd>${j.jenis}</dd></div><div><dt>Lokasi</dt><dd>${j.lokasi || '—'}</dd></div>
        <div style="grid-column:1/-1"><dt>Keterangan</dt><dd>${j.keterangan || '—'}</dd></div>
        <div style="grid-column:1/-1"><dt>Dalam kegiatan ini (${grup.length} hari-pegawai)</dt><dd>${[...new Set(grup.map((x) => x.pegawai_id))].map(nama).join(', ')}</dd></div>
        <div style="grid-column:1/-1"><dt>Diisi oleh</dt><dd>${j.dibuat_nama || '—'}</dd></div></dl>`),
      kaki: boleh(p) ? String(html`<button class="btn btn-ghost" data-hapus1 style="color:var(--merah)">${raw(ikon('trash', 16))} Hapus hari ini</button>
        ${grup.length > 1 ? html`<button class="btn btn-ghost" data-hapus-grup style="color:var(--merah)">Hapus seluruh kegiatan</button>` : ''}
        <button class="btn btn-primary" data-ubah>${raw(ikon('pencil', 16))} Ubah</button>`) : '<button class="btn btn-ghost" data-batal>Tutup</button>',
    });
    m.el.querySelector('[data-ubah]')?.addEventListener('click', () => {
      m.tutup();
      bukaFormulir({
        judul: 'Ubah Kegiatan', ukuran: '', data: { ...j, semua: grup.length > 1 },
        defs: [{ kolom: [{ k: 'kegiatan', l: 'Nama kegiatan', wajib: true, lebar: true }, { k: 'jenis', l: 'Jenis', tipe: 'pilih', opsi: ['Perjadin', 'Fullday', 'Fullboard'], wajib: true },
          { k: 'lokasi', l: 'Lokasi' }, { k: 'keterangan', l: 'Keterangan', tipe: 'area', lebar: true, baris: 2 },
          ...(grup.length > 1 ? [{ k: 'semua', l: `Terapkan ke seluruh kegiatan (${grup.length} hari-pegawai)`, tipe: 'sakelar', lebar: true }] : [])] }],
        simpan: async (o) => { const n = await api.ubahJadwal(j.id, o, !!o.semua); toast(`${angka(n)} jadwal diperbarui.`); await muat(); },
      });
    });
    const hapus = async (semua) => {
      const k = await konfirmasi({ judul: semua ? 'Hapus seluruh kegiatan?' : 'Hapus jadwal hari ini?', pesan: semua ? `${grup.length} hari-pegawai "${j.kegiatan}" dihapus.` : `Jadwal ${p.nama} tanggal ${Number(t.slice(8))} dihapus.`, label: 'Hapus', bahaya: true });
      if (!k.ok) return;
      try { const n = await api.hapusJadwal(j.id, semua); toast(`${angka(n)} jadwal dihapus.`); m.tutup(); await muat(); } catch (e) { toast(pesanGalat(e), 'galat'); }
    };
    m.el.querySelector('[data-hapus1]')?.addEventListener('click', () => hapus(false));
    m.el.querySelector('[data-hapus-grup]')?.addEventListener('click', () => hapus(true));
  };

  el.addEventListener('click', async (e) => {
    const s = e.target.closest('[data-sel]'); if (s && !s.disabled) { const [pid, t] = s.dataset.sel.split('|'); return bukaSel(pid, t); }
    const g = e.target.closest('[data-geser]');
    if (g) { bl += Number(g.dataset.geser); if (bl < 1) { bl = 12; th--; } if (bl > 12) { bl = 1; th++; } data = null; gambar(); $('[data-kisi]').innerHTML = '<div class="skel" style="height:420px;border-radius:18px"></div>'; return muat(); }
    if (e.target.closest('[data-bulan-ini]')) { th = kini.getFullYear(); bl = kini.getMonth() + 1; return muat(); }
    if (e.target.closest('[data-tambah]')) return formTambah();
    if (e.target.closest('[data-ulang]')) return muat();
    const u = e.target.closest('[data-unduh]');
    if (u && data) {
      const pulih = tombolMuat(u, 'Menyiapkan…');
      try {
        const peta = new Map(data.jadwal.map((j) => [j.pegawai_id + '|' + j.tanggal, j])), hh = hari();
        const kolom = ['Pegawai', 'Pokja', ...hh.map((t) => `${Number(t.slice(8))} ${NH[new Date(t + 'T00:00:00').getDay()]}`), 'Perjadin', 'Fullday', 'Fullboard', 'Total hari'];
        const baris = data.pegawai.map((p) => {
          const r = { Perjadin: 0, Fullday: 0, Fullboard: 0 };
          const sel = hh.map((t) => { const j = peta.get(p.id + '|' + t); if (!j) return ''; r[j.jenis]++; return `${SINGKAT[j.jenis]} - ${j.kegiatan}${j.lokasi ? ' (' + j.lokasi + ')' : ''}`; });
          return [p.nama, p.pokja_nama || '', ...sel, r.Perjadin, r.Fullday, r.Fullboard, r.Perjadin + r.Fullday + r.Fullboard];
        });
        await unduhExcel(namaUnduhan(`Jadwal-Pegawai-${th}-${String(bl).padStart(2, '0')}`), [{ nama: `${NB[bl - 1]} ${th}`, kolom, data: baris },
          { nama: 'Daftar Kegiatan', baris: data.jadwal.map((j) => ({ Tanggal: j.tanggal, Pegawai: data.pegawai.find((p) => p.id === j.pegawai_id)?.nama, Kegiatan: j.kegiatan, Jenis: j.jenis, Lokasi: j.lokasi, Keterangan: j.keterangan })) }]);
      } catch (err) { toast(pesanGalat(err), 'galat'); }
      pulih();
    }
    if (e.target.closest('[data-libur]')) {
      const isi = (data.libur_semua || data.libur || []).slice().sort((a, b) => a.tanggal.localeCompare(b.tanggal)).map((x) => `${x.tanggal} ${x.nama}`).join('\n');
      bukaFormulir({
        judul: 'Atur Hari Libur Nasional', ukuran: '', label: 'Simpan hari libur', data: { daftar: isi },
        atas: String(html`<p class="redup" style="margin-bottom:12px">Satu baris satu hari libur, format <b>YYYY-MM-DD Nama</b>. Hari libur hanya penanda warna; jadwal tetap bisa diisi.</p>`),
        defs: [{ kolom: [{ k: 'daftar', l: 'Daftar hari libur', tipe: 'area', baris: 12, lebar: true, ph: '2026-12-25 Hari Raya Natal' }] }],
        simpan: async (o) => {
          const daftar = String(o.daftar || '').split('\n').map((x) => x.trim()).filter(Boolean).map((x) => { const m = x.match(/^(\d{4}-\d{2}-\d{2})\s+(.+)$/); if (!m) throw new Error(`Baris "${x}" tidak sesuai format YYYY-MM-DD Nama.`); return { tanggal: m[1], nama: m[2].trim() }; });
          await api.aturHariLibur(daftar); toast(`${angka(daftar.length)} hari libur tersimpan.`); await muat();
        },
      });
    }
  });
  $('[data-pokja]').addEventListener('change', (e) => { fPokja = e.target.value; gambar(); });
  $('[data-cari]').addEventListener('input', debounce((e) => { fq = e.target.value.trim(); gambar(); }, 200));
  gambar();
  await muat();
  let lepas = () => {};
  try { lepas = await api.langgananTabel('jadwal', debounce(() => muat(), 500)); } catch {}
  return () => { try { lepas(); } catch {} };
}
