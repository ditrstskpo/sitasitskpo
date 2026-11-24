// Penugasan Petugas Supermonev (W-28): Kapokja Supermonev & Kapokja TU menugaskan PM yang jatuh tempo monitoring
// kepada petugas per periode, dikelompokkan per kab/kota. Penugasan dapat dipindah sebelum formulir diisi; perubahan
// tercatat di audit log dan petugas mendapat notifikasi. Pegawai lain dapat melihat (tanpa mengubah).
import { html, raw, angka, tanggal, debounce } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { bus } from '../core/store.js';
import { judulHalaman, kosong, kotakGalat, pesanGalat, toast, tombolMuat, bukaModal, skelTabel } from '../core/ui.js';
import { opsi, pokjaCepat } from '../core/komp.js';
import { pasangEfek, segarkanEfek } from '../core/efek.js';
import { chipPokjaU } from '../core/bnba.js';
import { PROVINSI } from './_t34.js';
import { STATUS_SMV, lencanaStatus, chipJatuhTempo, bukaFormSmv, catatanPratinjau } from './_smv.js';
import { rekomendasi, lokasiPenyaluran } from './_rekom-petugas.js';

export async function render(el) {
  const f = { q: '', bulan: '', putaran: '', provinsi: '', kabkota: '', pokja: '', status: '', petugas: '' };
  const pilih = new Map();     // kunci "bnba:putaran" → { bnba_id, putaran, nama }
  let d = null, petugas = [], tutup = new Set();
  const pokja = await pokjaCepat().catch(() => []);
  el.innerHTML = String(html`
    <div class="latar-hidup">
    ${judulHalaman({ pill: 'Supermonev · W-28', sorot: 'Penugasan Petugas', sisa: 'Supermonev',
      sub: 'PM yang jatuh tempo monitoring muncul otomatis (3 bulan setelah cair), lengkap dengan lokasi penyalurannya. Centang PM per kab/kota atau satu per satu, pilih pegawai (sistem merekomendasikan petugas penyalur dan pegawai sekota), lalu tekan "Tugaskan". Bisa dipindah selama formulir belum diisi.',
      aksi: String(html`<a class="btn btn-secondary" href="#/supermonev">${raw(ikon('clipboard-list', 18))} Formulir & Verifikasi</a>`) })}
    ${catatanPratinjau()}
    <div class="info-card biru rv" style="margin-bottom:16px">${raw(ikon('info', 20, 'ik'))}<span><b>Beda dengan menu Tugas &amp; Penugasan:</b> halaman ini khusus <b>turun lapangan Supermonev</b> (memantau PM yang sudah cair). Hanya Kapokja Supermonev dan Kapokja TU yang menugaskan. Penerima tugas boleh pegawai mana pun. Untuk tugas kerja umum (surat, rapat, laporan), pakai menu <a href="#/tugas">Tugas &amp; Penugasan</a>.</span></div>
    <div data-ringkas class="ringkas-tugas rv">${[1, 2, 3, 4, 5].map(() => html`<div class="skel" style="height:92px;border-radius:18px"></div>`)}</div>
    </div>
    <section class="card filter-card rv" style="margin:20px 0">
      <div class="filter-head">${raw(ikon('sliders', 20))}<b>Saring PM jatuh tempo</b><span class="spacer"></span><button class="btn btn-ghost btn-sm" data-reset>${raw(ikon('refresh', 16))} Reset</button></div>
      <div class="dash-filter">
        <label class="input-ikon lebar">${raw(ikon('search', 18))}<input class="input" data-q placeholder="Nama PM atau NIK" aria-label="Cari PM"></label>
        <select class="select" data-f="bulan" aria-label="Bulan jatuh tempo"><option value="">Semua bulan</option></select>
        <select class="select" data-f="putaran" aria-label="Putaran">${opsi([1, 2, 3, 4].map((n) => [String(n), 'Putaran ' + n]), '', 'Semua putaran')}</select>
        <select class="select" data-f="status" aria-label="Status">${opsi(Object.entries(STATUS_SMV).map(([k, x]) => [k, x.l]), '', 'Semua status')}</select>
        <select class="select" data-f="provinsi" aria-label="Provinsi">${opsi(PROVINSI, '', 'Semua provinsi')}</select>
        <select class="select" data-f="pokja" aria-label="Pokja">${opsi(pokja.filter((p) => p.kelompok === 'teknis').map((p) => [p.id, 'Pokja ' + p.nama_pendek]), '', 'Semua Pokja')}</select>
        <select class="select" data-f="petugas" aria-label="Petugas"><option value="">Semua petugas</option></select>
      </div></section>
    <div class="penugasan-tata">
      <div data-daftar class="rv">${skelTabel(8, 5)}</div>
      <aside class="panel-petugas rv skala" data-petugas aria-label="Beban kerja petugas"><div class="skel" style="height:280px;border-radius:20px"></div></aside>
    </div>
    <div class="aksi-massal" data-aksi hidden></div>`);
  pasangEfek(el);
  const $ = (q) => el.querySelector(q);
  const kunci = (r) => r.bnba_id + ':' + r.putaran;

  function gambarRingkas() {
    const r = d.ringkas;
    const kartu = (ik, n, label, kelas, st) => html`<button type="button" class="rt-kartu ${kelas} ${f.status === st ? 'on' : ''}" data-saring-status="${st}" data-tilt="4">
      <span class="ubin">${raw(ikon(ik, 22))}</span><b><span data-hitung="${n}">0</span></b><span>${label}</span></button>`;
    $('[data-ringkas]').innerHTML = String(html`${kartu('calendar-clock', r.total, 'Jatuh tempo', '', '')}${kartu('user-x', r.belum, 'Belum ditugaskan', 'abu', 'belum_ditugaskan')}
      ${kartu('user-check', r.ditugaskan, 'Sudah ditugaskan', 'biru', 'ditugaskan')}${kartu('pencil', r.diisi, 'Sedang diisi / menunggu', 'emas', 'menunggu')}${kartu('check-circle', r.selesai, 'Selesai', 'hijau', 'terverifikasi')}
      ${r.lewat ? html`<div class="rt-peringatan">${raw(ikon('alert', 20))}<span><b>${angka(r.lewat)} PM</b> sudah lewat jatuh tempo dan belum diisi.</span></div>` : ''}`);
    const sb = $('[data-f="bulan"]');
    if (sb.options.length <= 1) sb.innerHTML = String(html`<option value="">Semua bulan</option>${d.bulan.map((b) => html`<option value="${b}">${new Date(b + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</option>`)}`);
  }
  function gambarPetugas() {
    const maks = Math.max(1, ...petugas.map((p) => p.beban));
    $('[data-petugas]').innerHTML = String(html`<section class="card">
      <div class="card-head"><span class="ubin emas">${raw(ikon('users', 20))}</span><div><h2 class="card-title">Pegawai &amp; Petugas</h2><p class="card-sub">Semua pegawai berhak akses. Angka = PM aktif.</p></div></div>
      <label class="input-ikon" style="margin-bottom:10px">${raw(ikon('search', 18))}<input class="input" data-cari-petugas placeholder="Cari nama atau pokja" aria-label="Cari pegawai"></label>
      <div class="beban-daftar" data-beban-daftar>${petugas.length ? petugas.map((p) => html`<button type="button" class="beban ${f.petugas === p.id ? 'on' : ''}" data-saring-petugas="${p.id}" title="Saring PM milik ${p.nama}">
        <span class="beban-nm"><b>${p.nama}</b><small>${p.peran || p.jenis}${p.domisili_kabkota ? ' · ' + p.domisili_kabkota : ''}</small></span><span class="beban-trek"><i style="--w:${Math.round((p.beban / maks) * 100)}%"></i></span><b class="beban-n">${angka(p.beban)}</b></button>`)
        : html`<p class="redup">Belum ada petugas. Super Admin menambahkan akun di Pengaturan → Pengguna & Hak Akses.</p>`}</div>
      <p class="help" style="margin-top:12px">Ketuk nama petugas untuk melihat PM yang ditugaskan kepadanya.</p></section>`);
    const sp = $('[data-f="petugas"]');
    if (sp.options.length <= 1) sp.innerHTML = String(html`<option value="">Semua petugas</option>${petugas.map((p) => html`<option value="${p.id}">${p.nama}</option>`)}`);
  }
  function gambarDaftar() {
    const w = $('[data-daftar]');
    if (!d.baris.length) { w.innerHTML = String(html`<section class="card">${kosong({ ikonNama: 'calendar-clock', judul: 'Tidak ada PM jatuh tempo sesuai saringan', teks: 'PM akan muncul otomatis menjelang jatuh tempo monitoring.' })}</section>`); return; }
    const grup = new Map();
    d.baris.forEach((r) => { const k = (r.kabkota || 'Tanpa kab/kota') + '|' + (r.provinsi || ''); (grup.get(k) || grup.set(k, []).get(k)).push(r); });
    const boleh = d.boleh_tugaskan;
    w.innerHTML = String(html`${[...grup].map(([k, rows]) => {
      const [kab, prov] = k.split('|'), bisa = rows.filter((r) => !r.isian_id), semuaPilih = bisa.length && bisa.every((r) => pilih.has(kunci(r)));
      const belum = rows.filter((r) => r.status === 'belum_ditugaskan').length;
      return html`<section class="grup-kab ${tutup.has(k) ? 'tutup' : ''}" data-grup="${k}">
        <header>${boleh ? html`<label class="cek-besar" title="Pilih semua PM di ${kab}"><input type="checkbox" data-pilih-grup="${k}" ${semuaPilih ? raw('checked') : ''} ${bisa.length ? '' : raw('disabled')}><span></span></label>` : ''}
          <button type="button" class="gk-judul" data-lipat="${k}" aria-expanded="${!tutup.has(k)}"><b>${kab}</b><small>${prov} · ${angka(rows.length)} PM${belum ? html` · <span class="merah-teks">${angka(belum)} belum ditugaskan</span>` : ''}</small>
            ${raw(ikon('chevron-down', 18, 'gk-panah'))}</button></header>
        ${boleh && bisa.length ? rekomGrup(k, bisa) : ''}
        <div class="gk-isi">${rows.map((r) => html`<div class="baris-tugas ${pilih.has(kunci(r)) ? 'dipilih' : ''}">
          ${boleh ? html`<label class="cek-besar"><input type="checkbox" data-pilih="${kunci(r)}" ${pilih.has(kunci(r)) ? raw('checked') : ''} ${r.isian_id ? raw('disabled title="Formulir sudah diisi"') : ''} aria-label="Pilih ${r.nama}"><span></span></label>` : ''}
          <div class="bt-pm"><b>${r.nama}</b><small class="mono">${r.nik}</small>
            <small class="bt-lokasi" title="Lokasi penyaluran bantuan">${raw(ikon('map-pin', 13))} Disalurkan di ${lokasiPenyaluran(r)}${(r.penyalur || []).length ? html` · oleh ${r.penyalur.join(', ')}` : ''}</small></div>
          <div class="bt-info">${chipPokjaU(r)}<span class="redup">Putaran ${r.putaran} · ${tanggal(r.jatuh_tempo)}</span></div>
          <div class="bt-tempo">${['belum_ditugaskan', 'ditugaskan'].includes(r.status) ? chipJatuhTempo(r.jatuh_tempo) : ''}</div>
          <div class="bt-status">${lencanaStatus(STATUS_SMV, r.status)}<small>${r.petugas_nama ? html`${raw(ikon('user', 13))} ${r.petugas_nama}` : ''}</small></div>
          <button type="button" class="btn btn-ghost btn-sm" data-lihat-pm="${r.bnba_id}" data-putaran="${r.putaran}" aria-label="Buka formulir ${r.nama}">${raw(ikon('eye', 16))}</button></div>`)}</div></section>`;
    })}`);
    segarkanEfek(el);
  }
  const rekomGrup = (k, bisa) => {
    const top = rekomendasi(bisa, petugas).filter((x) => x.skor > 0).slice(0, 2);
    if (!top.length) return '';
    return html`<div class="rekom-grup">${raw(ikon('sparkles', 15))}<span class="redup">Rekomendasi:</span>${top.map((x) => html`<button type="button" class="btn btn-ghost btn-sm rekom-chip" data-rekom-grup="${k}" data-rekom-petugas="${x.p.id}" title="${x.alasan.join(' · ')}"><b>${x.p.nama}</b><small>${x.alasan[0]}</small></button>`)}</div>`;
  };
  function gambarAksi() {
    const a = $('[data-aksi]');
    a.hidden = !pilih.size;
    if (!pilih.size) return;
    const sudah = [...pilih.values()].filter((x) => x.petugas_id).length;
    a.innerHTML = String(html`${raw(ikon('check-circle', 22))}<b>${angka(pilih.size)} PM dipilih</b>
      <span class="spacer"></span>
      <button type="button" class="btn btn-ghost" data-bersih style="color:#fff">Bersihkan pilihan</button>
      ${sudah ? html`<button type="button" class="btn btn-secondary" data-batal-tugas>${raw(ikon('user-x', 18))} Batalkan penugasan (${angka(sudah)})</button>` : ''}
      <button type="button" class="btn btn-primary btn-sinar" data-tugaskan>${raw(ikon('user-check', 18))} Tugaskan ke Petugas…</button>`);
  }
  async function muat() {
    try {
      const [x, p] = await Promise.all([api.smvPenugasan(Object.fromEntries(Object.entries(f).filter(([, v]) => v))), api.smvPetugas()]);
      d = x; petugas = p;
      // buang pilihan yang sudah tidak bisa dipilih
      const ada = new Map(d.baris.map((r) => [kunci(r), r]));
      [...pilih.keys()].forEach((k) => { const r = ada.get(k); if (!r || r.isian_id) pilih.delete(k); else pilih.set(k, r); });
      gambarRingkas(); gambarPetugas(); gambarDaftar(); gambarAksi(); segarkanEfek(el);
    } catch (e) { $('[data-daftar]').innerHTML = String(kotakGalat(pesanGalat(e))); $('[data-daftar] [data-ulang]')?.addEventListener('click', muat); }
  }

  function bukaTugaskan(praPilih = null) {
    const daftar = [...pilih.values()], urut = rekomendasi(daftar, petugas), adaRek = urut.some((x) => x.skor > 0);
    const m = bukaModal({
      judul: `Tugaskan ${angka(daftar.length)} PM ke Petugas`, laci: true, ukuran: 'lebar',
      isi: String(html`<p class="redup" style="margin-bottom:12px">Pilih satu pegawai. Yang paling cocok dengan lokasi penyaluran ada di atas. Angka di kanan = jumlah PM aktif yang sedang ia pegang.</p>
        <label class="input-ikon" style="margin-bottom:12px">${raw(ikon('search', 18))}<input class="input" data-cari-modal placeholder="Cari nama, pokja, atau kabupaten/kota" aria-label="Cari pegawai"></label>
        <div class="pilih-petugas" role="radiogroup" aria-label="Pegawai atau petugas">${urut.map(({ p, skor, alasan }, i) => html`${adaRek && i === 0 && skor > 0 ? html`<h3 class="pp-judul">${raw(ikon('sparkles', 16))} Rekomendasi untuk lokasi ini</h3>` : ''}${adaRek && skor === 0 && (i === 0 || urut[i - 1].skor > 0) ? html`<h3 class="pp-judul">Semua pegawai</h3>` : ''}<label class="pp-kartu ${skor > 0 ? 'rekom' : ''}" data-teks="${(p.nama + ' ' + (p.peran || '') + ' ' + (p.domisili_kabkota || '') + ' ' + p.jenis).toLowerCase()}"><input type="radio" name="petugas" value="${p.id}" ${praPilih === p.id ? raw('checked') : ''}>
          <span class="pp-av">${raw(ikon(p.jenis === 'Petugas lapangan' ? 'navigation' : 'users', 22))}</span><span class="pp-nm"><b>${p.nama}</b><small>${p.peran || p.jenis}${p.domisili_kabkota ? ' · berdomisili di ' + p.domisili_kabkota : ''}</small>
            ${alasan.length ? html`<span class="chips">${alasan.map((x) => html`<span class="badge b-ok kecil">${x}</span>`)}</span>` : ''}</span>
          <span class="pp-beban"><b>${angka(p.beban)}</b><small>PM aktif</small></span></label>`)}</div>
        <div class="field" style="margin-top:16px"><label class="label" for="tg-cat">Catatan untuk petugas (opsional)</label><textarea id="tg-cat" class="textarea" rows="2" placeholder="mis. Mohon dikunjungi minggu ini; koordinasi dengan pendamping setempat"></textarea></div>
        <details class="rincian-pilih" style="margin-top:14px"><summary>Lihat ${angka(daftar.length)} PM yang dipilih</summary><ul>${daftar.map((r) => html`<li>${r.nama} · putaran ${r.putaran}${r.petugas_nama ? html` <small class="redup">(kini: ${r.petugas_nama})</small>` : ''}</li>`)}</ul></details>
        <div class="galat" data-galat hidden style="margin-top:12px"></div>`),
      kaki: String(html`<button type="button" class="btn btn-ghost" data-batal>Batal</button><button type="button" class="btn btn-primary" data-ok>${raw(ikon('send', 18))} Tugaskan &amp; Beri Tahu Petugas</button>`),
    });
    m.el.addEventListener('input', (e) => { if (!e.target.matches('[data-cari-modal]')) return; const q = e.target.value.trim().toLowerCase(); m.el.querySelectorAll('.pp-kartu').forEach((c) => { c.hidden = !!q && !c.dataset.teks.includes(q); }); });
    m.el.querySelector('[data-ok]').onclick = async (e) => {
      const pid = m.el.querySelector('input[name="petugas"]:checked')?.value, g = m.el.querySelector('[data-galat]');
      if (!pid) { g.hidden = false; g.innerHTML = String(html`${raw(ikon('alert', 20))}<span>Pilih petugas lebih dulu.</span>`); return; }
      const pulih = tombolMuat(e.currentTarget, 'Menugaskan…');
      try {
        const r = await api.smvTugaskan(daftar.map((x) => ({ bnba_id: x.bnba_id, putaran: x.putaran })), pid, m.el.querySelector('#tg-cat').value.trim() || null);
        m.tutup(); pilih.clear();
        toast(`${angka(r.ditugaskan)} PM ditugaskan${r.dipindah ? `, ${angka(r.dipindah)} dipindahkan` : ''}. Petugas mendapat notifikasi.${r.dilewati?.length ? ` ${angka(r.dilewati.length)} dilewati (formulir sudah diisi).` : ''}`, 'sukses', 'Penugasan tersimpan');
        muat();
      } catch (err) { pulih(); g.hidden = false; g.innerHTML = String(html`${raw(ikon('alert', 20))}<span>${pesanGalat(err)}</span>`); }
    };
  }

  el.addEventListener('click', async (e) => {
    const sp = e.target.closest('[data-saring-status]'); if (sp) { f.status = f.status === sp.dataset.saringStatus ? '' : sp.dataset.saringStatus; $('[data-f="status"]').value = f.status; return muat(); }
    const rg = e.target.closest('[data-rekom-grup]');
    if (rg) { d.baris.filter((r) => ((r.kabkota || 'Tanpa kab/kota') + '|' + (r.provinsi || '')) === rg.dataset.rekomGrup && !r.isian_id).forEach((r) => pilih.set(kunci(r), r)); gambarDaftar(); gambarAksi(); return bukaTugaskan(rg.dataset.rekomPetugas); }
    const pt = e.target.closest('[data-saring-petugas]'); if (pt) { f.petugas = f.petugas === pt.dataset.saringPetugas ? '' : pt.dataset.saringPetugas; $('[data-f="petugas"]').value = f.petugas; return muat(); }
    const lp = e.target.closest('[data-lipat]'); if (lp) { const k = lp.dataset.lipat; tutup.has(k) ? tutup.delete(k) : tutup.add(k); lp.closest('.grup-kab').classList.toggle('tutup'); lp.setAttribute('aria-expanded', String(!tutup.has(k))); return; }
    const lh = e.target.closest('[data-lihat-pm]'); if (lh) return bukaFormSmv({ bnba_id: lh.dataset.lihatPm, putaran: Number(lh.dataset.putaran), onSelesai: muat });
    if (e.target.closest('[data-bersih]')) { pilih.clear(); gambarDaftar(); gambarAksi(); return; }
    if (e.target.closest('[data-tugaskan]')) return bukaTugaskan();
    const bt = e.target.closest('[data-batal-tugas]');
    if (bt) {
      const items = [...pilih.values()].filter((x) => x.petugas_id);
      const pulih = tombolMuat(bt);
      try { const n = await api.smvBatalTugas(items.map((x) => ({ bnba_id: x.bnba_id, putaran: x.putaran }))); toast(`${angka(n)} penugasan dibatalkan.`, 'info'); pilih.clear(); muat(); }
      catch (err) { pulih(); toast(pesanGalat(err), 'galat'); }
      return;
    }
    if (e.target.closest('[data-reset]')) { Object.keys(f).forEach((k) => { f[k] = ''; }); el.querySelectorAll('[data-f]').forEach((x) => { x.value = ''; }); $('[data-q]').value = ''; return muat(); }
  });
  el.addEventListener('change', (e) => {
    const c = e.target.closest('[data-pilih]');
    if (c) { const r = d.baris.find((x) => kunci(x) === c.dataset.pilih); c.checked ? pilih.set(kunci(r), r) : pilih.delete(kunci(r)); c.closest('.baris-tugas').classList.toggle('dipilih', c.checked); gambarAksi(); return; }
    const gp = e.target.closest('[data-pilih-grup]');
    if (gp) { d.baris.filter((r) => ((r.kabkota || 'Tanpa kab/kota') + '|' + (r.provinsi || '')) === gp.dataset.pilihGrup && !r.isian_id).forEach((r) => (gp.checked ? pilih.set(kunci(r), r) : pilih.delete(kunci(r)))); gambarDaftar(); gambarAksi(); return; }
    const x = e.target.closest('[data-f]'); if (x) { f[x.dataset.f] = x.value; muat(); }
  });
  el.addEventListener('input', (e) => { if (!e.target.matches('[data-cari-petugas]')) return; const q = e.target.value.trim().toLowerCase(); el.querySelectorAll('[data-beban-daftar] .beban').forEach((b) => { b.hidden = !!q && !b.textContent.toLowerCase().includes(q); }); });
  el.addEventListener('input', debounce((e) => { if (e.target.matches('[data-q]')) { f.q = e.target.value.trim(); muat(); } }, 350));
  const lepas = [];
  try { lepas.push(await api.langgananTabel('smv_tugas', debounce(muat, 600))); } catch {}
  lepas.push(bus.on('realtime-pulih', muat));
  await muat();
  return () => lepas.forEach((x) => { try { x?.(); } catch {} });
}
