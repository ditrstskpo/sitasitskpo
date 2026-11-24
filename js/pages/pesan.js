// Pesan & Komunikasi Internal (PRD 5.4 / Tahap 4): Koordinasi Lintas-Pokja, Chat Pokja, Pesan Pribadi, dan
// Diskusi pada data usulan/PM. Realtime; NIK/No. KK ditolak di pesan. Bukan pengganti pencatatan resmi.
import { html, raw, relatif, inisial, debounce } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { bus } from '../core/store.js';
import { judulHalaman, kosong, kotakGalat, pesanGalat, toast, bukaModal } from '../core/ui.js';
import { pergi } from '../core/nav.js';
import { bukaFormulir } from './_t34.js';
import { pasangUtas } from './_pesan.js';
import * as P from '../core/peran.js';

const GRUP = [['lintas', 'Koordinasi Lintas-Pokja', 'globe2'], ['pokja', 'Chat Pokja', 'users'], ['pribadi', 'Pesan Pribadi', 'user'], ['diskusi', 'Diskusi Data', 'hash']];

export async function render(el, { sesi: s, query }) {
  let daftar = [], aktif = query?.get('c') || null, utas = null, saring = '';
  const bolehTopik = P.isSuperAdmin(s) || P.diPokja(s, 'TU') || P.isKapokja(s);
  el.innerHTML = String(html`
    ${judulHalaman({ pill: 'Komunikasi Internal', sorot: 'Pesan', sisa: '& Komunikasi',
      sub: 'Chat Pokja, koordinasi lintas-Pokja, dan pesan pribadi antarpegawai. Demi perlindungan data, NIK dan No. KK tidak boleh dikirim lewat pesan.',
      aksi: String(html`${bolehTopik ? html`<button class="btn btn-secondary" data-topik>${raw(ikon('hash', 18))} Topik Lintas-Pokja</button>` : ''}
        <button class="btn btn-primary" data-pesan-baru>${raw(ikon('msg-plus', 18))} Pesan Pribadi Baru</button>`) })}
    <div class="pesan-tata rv" data-tata>
      <aside class="cp-panel"><div class="cp-kepala"><label class="input-ikon">${raw(ikon('search', 18))}<input class="input" data-saring placeholder="Cari percakapan" aria-label="Cari percakapan"></label></div>
        <nav class="cp-daftar" data-daftar aria-label="Daftar percakapan"><div class="skel skel-baris"></div><div class="skel skel-baris"></div><div class="skel skel-baris"></div></nav></aside>
      <section data-utas class="utas"><div class="utas-kosong">${kosong({ ikonNama: 'pesan', judul: 'Pilih percakapan', teks: 'Pilih kanal di kiri, atau mulai pesan pribadi baru.' })}</div></section>
    </div>`);
  const $ = (q) => el.querySelector(q);

  const gDaftar = () => {
    const q = saring.toLowerCase();
    const isi = GRUP.map(([j, label, ik]) => {
      const b = daftar.filter((c) => c.jenis === j && (!q || String(c.judul).toLowerCase().includes(q)));
      if (!b.length) return '';
      return html`<div class="cp-grup">${label}</div>${b.map((c) => html`<button type="button" class="cp-item" data-cp="${c.id}" aria-current="${c.id === aktif}">
        <span class="av" style="--c:${c.warna || (j === 'lintas' ? '#2A4B8D' : j === 'diskusi' ? '#7B5EC2' : '#17824A')};--cx:${c.warna ? '#fff' : '#fff'}">${j === 'pribadi' ? inisial(c.judul) : raw(ikon(ik, 18))}</span>
        <span class="nm"><b>${c.judul}</b><small>${c.terakhir ? `${c.terakhir.pengirim}: ${c.terakhir.isi ?? 'pesan dihapus'}` : 'Belum ada pesan'}</small></span>
        <span style="display:grid;justify-items:end;gap:4px">${c.terakhir ? html`<span class="wkt">${relatif(c.terakhir.waktu)}</span>` : ''}${c.belum ? html`<span class="bl" aria-label="${c.belum} belum dibaca">${c.belum > 99 ? '99+' : c.belum}</span>` : ''}</span></button>`)}`;
    });
    $('[data-daftar]').innerHTML = String(html`${isi}`) || String(kosong({ ikonNama: 'pesan', judul: 'Tidak ada percakapan' }));
  };
  async function muatDaftar() {
    try { daftar = await api.daftarPercakapan(); gDaftar(); }
    catch (e) { $('[data-daftar]').innerHTML = String(kotakGalat(pesanGalat(e))); }
  }
  const buka = (id) => {
    aktif = id;
    const c = daftar.find((x) => x.id === id);
    history.replaceState(null, '', '#/pesan?c=' + encodeURIComponent(id));
    $('[data-tata]').classList.add('buka-utas');
    const w = document.createElement('section');
    $('[data-utas]').replaceWith(w); w.dataset.utas = '';
    utas = pasangUtas(w, { id, judul: c?.judul || 'Percakapan', sub: c ? GRUP.find((g) => g[0] === c.jenis)?.[1] : '',
      kembali: () => { $('[data-tata]').classList.remove('buka-utas'); },
      onBaca: (cid) => { const x = daftar.find((y) => y.id === cid); if (x) { x.belum = 0; gDaftar(); } } });
    gDaftar();
    setTimeout(() => utas?.fokus(), 80);
  };

  el.addEventListener('click', async (e) => {
    const c = e.target.closest('[data-cp]'); if (c) return buka(c.dataset.cp);
    if (e.target.closest('[data-pesan-baru]')) {
      const m = bukaModal({ judul: 'Pesan Pribadi Baru', ukuran: 'kecil', isi: String(html`<label class="input-ikon">${raw(ikon('search', 18))}<input class="input" data-cari-kontak placeholder="Ketik nama pegawai" aria-label="Cari pegawai" autofocus></label>
        <div data-kontak style="display:grid;gap:4px;margin-top:12px;max-height:50vh;overflow:auto"></div>`) });
      const isiKontak = async (q) => {
        try {
          const k = await api.kontakPesan(q);
          m.el.querySelector('[data-kontak]').innerHTML = String(k.length ? html`${k.map((u) => html`<button type="button" class="cp-item" data-kontak-id="${u.id}"><span class="av">${inisial(u.nama)}</span>
            <span class="nm"><b>${u.nama}</b><small>${u.pokja || 'Pegawai'}</small></span><span></span></button>`)}` : html`<p class="redup">Tidak ditemukan.</p>`);
        } catch (err) { m.el.querySelector('[data-kontak]').innerHTML = String(kotakGalat(pesanGalat(err))); }
      };
      m.el.querySelector('[data-cari-kontak]').addEventListener('input', debounce((ev) => isiKontak(ev.target.value.trim()), 250));
      m.el.addEventListener('click', async (ev) => {
        const k = ev.target.closest('[data-kontak-id]'); if (!k) return;
        try { const cp = await api.bukaPribadi(k.dataset.kontakId); m.tutup(); await muatDaftar(); buka(cp.id); } catch (err) { toast(pesanGalat(err), 'galat'); }
      });
      isiKontak('');
      return;
    }
    if (e.target.closest('[data-topik]')) {
      return bukaFormulir({ judul: 'Topik Koordinasi Lintas-Pokja', ukuran: 'kecil', label: 'Buat topik', defs: [{ kolom: [{ k: 'judul', l: 'Judul topik', wajib: true, lebar: true, maks: 80, ph: 'mis. Persiapan Rakornas ATENSI 2027' }] }],
        atas: String(html`<p class="redup" style="margin-bottom:12px">Topik terlihat dan dapat diikuti semua pegawai.</p>`),
        simpan: async (o) => { const cp = await api.buatTopikLintas(o.judul); toast('Topik dibuat.'); await muatDaftar(); buka(cp.id); } });
    }
  });
  $('[data-saring]').addEventListener('input', debounce((e) => { saring = e.target.value.trim(); gDaftar(); }, 150));

  await muatDaftar();
  if (aktif && daftar.some((c) => c.id === aktif)) buka(aktif);
  else if (aktif) {
    // percakapan diskusi yang belum pernah diikuti tidak ada di daftar: buka langsung
    try { await api.pesanPercakapan(aktif, null, 1); buka(aktif); } catch { aktif = null; }
  } else if (window.innerWidth > 767 && daftar[0]) buka(daftar[0].id);

  let lepas = () => {};
  const segarDaftar = debounce(() => muatDaftar(), 600);
  try { lepas = await api.langgananTabel('pesan', (p) => { utas?.tambah(p); segarDaftar(); }); } catch {}
  const lepasBus = bus.on('pesan-berubah', segarDaftar);
  void pergi;
  return () => { try { lepas(); } catch {} lepasBus(); };
}
