// Formulir usulan BNBA (Draft / Perlu Perbaikan): daftar PM di kiri, formulir 40 kolom per PM di kanan,
// bilah aksi lengket: Simpan Draf & Submit 1 Bundle ke Kapokja.
import { html, raw, angka, tanggalJam } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { hapusCache } from '../core/store.js';
import { judulHalaman, toast, konfirmasi, pesanGalat, tombolMuat, kotakGalat, bukaModal } from '../core/ui.js';
import { opsi, tautanAman } from '../core/komp.js';
import { KOLOM, KOLOM_EKONOMI, GRUP, JENIS_BANTUAN, STATUS_USULAN, badge, rupiah, usia, lengkapPM, bolehTahap } from '../core/bnba.js';
import { bukaImporBnba } from './_usulan-modal.js';
import { pergi } from '../core/nav.js';

const GRUP_FORM = ['umum', 'ktp', 'dom', 'profil', 'intervensi', 'ekonomi'];
const NAV = { umum: 'Umum', ktp: 'Alamat KTP', dom: 'Domisili', profil: 'Profil PPKS', intervensi: 'Intervensi', ekonomi: 'Ekonomi Awal' };
const SINGKAT = ['NIK', 'KK', 'PPKS', 'RT', 'RW', 'SK', 'SP2D', 'BNI', 'KWU', 'PHL'];
function label(x) {
  return x.toLowerCase().replace(/(^|[\s/(.])([a-z])/g, (m, a, b) => a + b.toUpperCase())
    .replace(/\b([A-Za-z0-9]+)\b/g, (w) => (SINGKAT.includes(w.toUpperCase()) ? w.toUpperCase() : w));
}
const KOL_FORM = [...KOLOM, ...KOLOM_EKONOMI].filter((c) => GRUP_FORM.includes(c.g));
const fmtUang = (v) => (v === '' || v == null ? '' : angka(String(v).replace(/[^\d]/g, '')));

function field(c, v) {
  const id = 'f-' + c.k, w = c.wajib ? html`<span class="wajib">*</span>` : '';
  const kelas = c.lebar || c.tipe === 'teks' ? 'field penuh' : 'field';
  let inp;
  if (c.k === 'usia') inp = html`<input id="${id}" class="input" readonly value="${usia(v) !== '' ? usia(v) + ' tahun' : 'Otomatis dari tanggal lahir'}" data-usia>`;
  else if (c.tipe === 'pilih') inp = html`<select id="${id}" class="select" name="${c.k}">${opsi(c.opsi.map((o) => [o, c.k === 'jenis_bantuan' ? `${o} — ${JENIS_BANTUAN[o]}` : o]), v, 'Pilih…')}</select>`;
  else if (c.tipe === 'tanggal') inp = html`<input id="${id}" class="input" type="date" name="${c.k}" value="${v || ''}">`;
  else if (c.tipe === 'uang') inp = html`<label class="input-awalan"><span>Rp</span><input id="${id}" class="input angka" inputmode="numeric" name="${c.k}" value="${fmtUang(v)}" data-uang></label>`;
  else if (c.tipe === 'nik') inp = html`<input id="${id}" class="input mono" inputmode="numeric" maxlength="16" name="${c.k}" value="${v || ''}" data-nik placeholder="16 digit angka">`;
  else if (c.tipe === 'teks') inp = html`<textarea id="${id}" class="textarea" rows="2" name="${c.k}">${v || ''}</textarea>`;
  else inp = html`<input id="${id}" class="input" name="${c.k}" value="${v || ''}">`;
  return html`<div class="${kelas}"><label class="label" for="${id}">${label(c.x)}${w}${c.sensitif ? html` <span class="badge b-lock kecil">${raw(ikon('lock', 12))} Sensitif</span>` : ''}</label>${inp}<div class="err" hidden></div></div>`;
}

export async function render(el, { sesi: s, query }) {
  const id = query.get('id');
  if (!id) return pergi('/workspace-bnba');
  let d, pm = [], pilih = 0, kotor = false, cari = '';
  el.innerHTML = '<div class="skel" style="height:180px;border-radius:20px"></div><div class="skel" style="height:420px;border-radius:20px;margin-top:24px"></div>';

  async function muat() {
    d = await api.usulanDetail(id);
    const u = d.usulan;
    if (!['draft', 'perlu_perbaikan'].includes(u.status) || !bolehTahap(s, u.pokja_id, '1')) {
      toast('Usulan ini sudah diajukan atau bukan milik Pokja Anda; ditampilkan sebagai detail.', 'info');
      pergi('/usulan/' + id); return false;
    }
    pm = await api.bnbaDraft(id);
    return true;
  }
  try { if (!(await muat())) return; } catch (e) { el.innerHTML = String(kotakGalat(pesanGalat(e))); el.querySelector('[data-ulang]').onclick = () => location.reload(); return; }

  const $ = (q) => el.querySelector(q);
  function gambarKepala() {
    const u = d.usulan, lengkap = pm.filter(lengkapPM).length;
    $('[data-kepala]').innerHTML = String(html`
      <div class="chips" style="margin-bottom:12px">${badge(STATUS_USULAN, u.status, u.status === 'draft' ? 'Draft (belum submit)' : null)}<span class="badge b-proc mono">${u.no_register}</span></div>
      ${judulHalaman({ pill: 'Workspace Pokja · Penyusunan Usulan Bundel BNBA', sorot: 'Detail Usulan', sisa: '— ' + u.judul,
        sub: `${u.kategori} · ${u.pokja_nama}. Isi 40 kolom BNBA per PM dan link profil asesmen kolektif, lalu submit sekali ke Kapokja.`,
        aksi: String(html`<button class="btn btn-secondary" data-ubah-judul>${raw(ikon('pencil', 18))} Ubah Judul &amp; Link</button>
          <button class="btn btn-secondary" data-impor>${raw(ikon('file-up', 18))} Impor Excel</button>
          ${!u.tgl_submit ? html`<button class="btn btn-ghost" data-hapus-usulan>${raw(ikon('trash', 18))} Hapus Draft</button>` : ''}`) })}
      ${u.status === 'perlu_perbaikan' && u.catatan_terakhir ? html`<div class="galat" style="margin-bottom:16px">${raw(ikon('alert', 22))}<span><b>Dikembalikan Kapokja:</b> ${u.catatan_terakhir}</span></div>` : ''}
      <div class="info-strip">
        <div><span class="ubin">${raw(ikon('users', 20))}</span><small>Target PM Total</small><b>${angka(pm.length)} PM</b></div>
        <div><span class="ubin emas">${raw(ikon('banknote', 20))}</span><small>Plafon Anggaran Bundel</small><b>${rupiah(pm.reduce((a, x) => a + (Number(x.nilai_bantuan) || 0), 0))}</b></div>
        <div><span class="ubin biru">${raw(ikon('link', 20))}</span><small>Link Profil Asesmen</small>${u.link_profil ? html`<a href="${tautanAman(u.link_profil)}" target="_blank" rel="noopener"><b>Buka profil kolektif ${raw(ikon('external', 14))}</b></a>` : html`<b class="teks-merah">Belum diisi</b>`}</div>
        <div><span class="ubin">${raw(ikon('clipboard-check', 20))}</span><small>Status Validasi</small><b><span class="badge b-ok kecil">${lengkap} Lengkap</span> ${pm.length - lengkap ? html`<span class="badge b-fix kecil">${pm.length - lengkap} Belum lengkap</span>` : ''}</b>
          <small>Diperbarui ${tanggalJam(u.diubah_pada)}</small></div>
      </div>`);
  }
  function gambarDaftar() {
    const s2 = cari.toLowerCase();
    $('[data-daftar]').innerHTML = String(html`${pm.map((b, i) => ({ b, i })).filter(({ b }) => !s2 || b.nama?.toLowerCase().includes(s2) || b.nik?.includes(s2)).map(({ b, i }) => html`
      <button type="button" class="pm-item ${i === pilih ? 'aktif' : ''}" data-pilih="${i}">
        <span class="pm-no">#${String(i + 1).padStart(2, '0')}</span>
        ${lengkapPM(b) ? html`<span class="badge b-ok kecil">Lengkap</span>` : html`<span class="badge b-fix kecil">Belum lengkap</span>`}
        <b>${b.nama}</b><span class="mono">NIK: ${b.nik}</span>
        <small>${b.jenis_bantuan || '—'} · ${rupiah(b.nilai_bantuan)}</small></button>`)}
      ${pilih === -1 ? html`<div class="pm-item aktif baru"><span class="pm-no">PM baru</span><b>Mengisi PM baru…</b></div>` : ''}
      ${!pm.length && pilih !== -1 ? html`<p class="redup" style="padding:12px">Belum ada PM. Tambah manual atau impor dari Excel.</p>` : ''}`);
  }
  // pilih: indeks PM yang sedang dibuka; -1 = PM baru. Dirapikan setiap gambar ulang (mis. usulan kosong, PM dihapus).
  const rapikanPilih = () => { if (pilih >= pm.length) pilih = pm.length - 1; if (pilih < 0) pilih = -1; };
  function gambarForm() {
    rapikanPilih();
    const b = pilih >= 0 ? pm[pilih] : {};
    $('[data-form]').innerHTML = String(html`
      <div class="form-kepala"><span class="badge b-proc mono">${pilih >= 0 ? `PM #${String(pilih + 1).padStart(2, '0')} dari ${pm.length}` : 'PM baru'}</span>
        <b>${b.nama || 'Penerima manfaat baru'}</b>${b.nik ? html`<span class="mono redup">NIK ${b.nik}</span>` : ''}
        <nav class="nav-seksi" aria-label="Bagian formulir">${GRUP_FORM.map((g, i) => html`<a href="#seksi-${g}" data-lompat="${g}"><span>${i + 1}</span>${NAV[g]}</a>`)}</nav></div>
      <form data-pm novalidate>${GRUP_FORM.map((g, i) => html`<section class="form-section" id="seksi-${g}">
        <div class="form-section-head"><span class="no">${i + 1}</span><h3>${GRUP[g]}</h3>
          ${g === 'dom' ? html`<button type="button" class="btn btn-ghost btn-sm" data-salin-ktp style="margin-left:auto">${raw(ikon('copy', 16))} Sama dengan KTP</button>` : ''}</div>
        <div class="form-grid">${KOL_FORM.filter((c) => c.g === g).map((c) => field(c, c.k === 'usia' ? b.tgl_lahir : b[c.k]))}
          ${g === 'ekonomi' ? html`<div class="field"><label class="label">Laba Bersih Awal (otomatis)</label><div class="input angka baca" data-laba>${rupiah((Number(b.pendapatan_kotor_awal) || 0) - (Number(b.biaya_awal) || 0))}</div><div class="help">Pendapatan kotor − biaya; pembanding penilaian Supermonev.</div></div>` : ''}</div>
      </section>`)}
      <div class="form-aksi">${pilih >= 0 ? html`<button type="button" class="btn btn-ghost teks-merah" data-hapus-pm>${raw(ikon('trash', 18))} Hapus PM</button>` : ''}
        <span class="spacer"></span><button type="submit" class="btn btn-primary">${raw(ikon('save', 18))} Simpan PM Ini</button></div></form>`);
    kotor = false;
  }
  function gambarBilah() {
    const lengkap = pm.filter(lengkapPM).length, kurang = pm.length - lengkap;
    $('[data-bilah]').innerHTML = String(html`<a class="btn btn-ghost" href="#/workspace-bnba">${raw(ikon('arrow-left', 18))} Daftar Usulan</a>
      <span class="bilah-info"><b>${lengkap} / ${pm.length} PM Lengkap</b>${kurang ? html`<span class="badge b-fix kecil">${kurang} PM perlu dilengkapi</span>` : ''}</span>
      <span class="spacer"></span><button class="btn btn-secondary" data-simpan-draf>${raw(ikon('save', 18))} Simpan Draf<span class="sembunyi-hp"> Usulan</span></button>
      <button class="btn btn-primary" data-submit>${raw(ikon('send', 18))} Submit<span class="sembunyi-hp"> 1 Bundle</span> ke Kapokja</button>`);
  }
  const gambarSemua = () => { rapikanPilih(); gambarKepala(); gambarDaftar(); gambarForm(); gambarBilah(); };

  el.innerHTML = String(html`<div data-kepala></div>
    <div class="editor-usulan">
      <aside class="card pm-panel"><div class="card-head"><span class="ubin">${raw(ikon('list', 20))}</span><div><h2 class="card-title">Daftar PM Usulan</h2></div></div>
        <button class="btn btn-primary btn-block" data-tambah>${raw(ikon('user-plus', 18))} Tambah PM Manual</button>
        <label class="input-ikon" style="margin:12px 0">${raw(ikon('search', 18))}<input class="input" data-cari placeholder="Cari nama / NIK" aria-label="Cari PM"></label>
        <div class="pm-list" data-daftar></div></aside>
      <section class="card" data-form></section>
    </div>
    <div class="aksi-lengket" data-bilah></div>`);
  gambarSemua();

  function kumpul() {
    const o = {};
    el.querySelectorAll('form[data-pm] [name]').forEach((x) => { o[x.name] = x.matches('[data-uang]') ? x.value.replace(/[^\d]/g, '') : x.value.trim(); });
    if (pilih >= 0 && pm[pilih]) o.id = pm[pilih].id;
    return o;
  }
  function cekField(x) {
    const f = x.closest('.field'), err = f?.querySelector('.err');
    if (!err) return true;
    let pesan = '';
    if (x.matches('[data-nik]') && x.value && !/^\d{16}$/.test(x.value)) pesan = 'Harus 16 digit angka.';
    if (x.name === 'nik' && !x.value) pesan = 'NIK wajib diisi.';
    if (x.name === 'nama' && !x.value.trim()) pesan = 'Nama wajib diisi.';
    err.hidden = !pesan; err.innerHTML = pesan ? String(html`${raw(ikon('alert', 14))} ${pesan}`) : '';
    f.classList.toggle('salah', !!pesan); f.classList.toggle('sah', !pesan && x.matches('[data-nik]') && !!x.value);
    return !pesan;
  }
  async function simpanPM(btn) {
    const form = el.querySelector('form[data-pm]');
    if (![...form.querySelectorAll('[name]')].map(cekField).every(Boolean)) { toast('Periksa kolom yang ditandai merah.', 'galat'); return false; }
    const pulih = tombolMuat(btn);
    try {
      const data = kumpul(), r = await api.simpanBnba(id, data);
      pm = await api.bnbaDraft(id);
      pilih = pm.findIndex((x) => x.id === r.id || x.nik === data.nik);
      hapusCache('usulan'); d.usulan.diubah_pada = new Date().toISOString();
      gambarSemua(); toast(r.hasil === 'TAMBAH' ? 'PM ditambahkan ke usulan.' : 'Perubahan PM tersimpan.');
      return true;
    } catch (e) { pulih(); toast(pesanGalat(e), 'galat'); return false; }
  }
  async function bolehPindah() {
    if (!kotor) return true;
    return (await konfirmasi({ judul: 'Perubahan belum disimpan', pesan: 'Data PM yang sedang diisi belum disimpan. Buang perubahan?', label: 'Buang perubahan', bahaya: true })).ok;
  }

  el.addEventListener('input', (e) => {
    if (e.target.closest('form[data-pm]')) kotor = true;
    if (e.target.matches('[data-cari]')) { cari = e.target.value; gambarDaftar(); }
    if (e.target.matches('[data-nik]')) e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16);
    if (e.target.name === 'tgl_lahir') { const x = el.querySelector('[data-usia]'); if (x) x.value = usia(e.target.value) !== '' ? usia(e.target.value) + ' tahun' : ''; }
    if (e.target.matches('[data-uang]')) {
      const f = el.querySelector('form[data-pm]'), n = (k) => Number(f.querySelector(`[name=${k}]`)?.value.replace(/\D/g, '')) || 0;
      const lb = el.querySelector('[data-laba]'); if (lb) lb.textContent = rupiah(n('pendapatan_kotor_awal') - n('biaya_awal'));
    }
  });
  el.addEventListener('focusout', (e) => {
    if (e.target.matches('form[data-pm] [name]')) cekField(e.target);
    if (e.target.matches('[data-uang]')) e.target.value = fmtUang(e.target.value);
  });
  el.addEventListener('submit', (e) => { e.preventDefault(); simpanPM(e.submitter || e.target.querySelector('[type=submit]')); });
  el.addEventListener('click', async (e) => {
    const lp = e.target.closest('[data-lompat]');
    if (lp) { e.preventDefault(); el.querySelector('#seksi-' + lp.dataset.lompat)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    const pi = e.target.closest('[data-pilih]');
    if (pi) { if (!(await bolehPindah())) return; pilih = Number(pi.dataset.pilih); gambarDaftar(); gambarForm(); el.querySelector('[data-form]').scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
    if (e.target.closest('[data-tambah]')) { if (!(await bolehPindah())) return; pilih = -1; gambarDaftar(); gambarForm(); el.querySelector('#f-nama')?.focus(); return; }
    if (e.target.closest('[data-salin-ktp]')) {
      ['provinsi', 'kabkota', 'kecamatan', 'kelurahan', 'jalan'].forEach((k) => { const a = el.querySelector(`[name=ktp_${k}]`), b = el.querySelector(`[name=dom_${k}]`); if (a && b) b.value = a.value; });
      kotor = true; return;
    }
    if (e.target.closest('[data-hapus-pm]')) {
      const b = pm[pilih];
      if (!(await konfirmasi({ judul: 'Hapus PM dari usulan?', pesan: `${b.nama} (NIK ${b.nik}) dihapus dari usulan ini.`, label: 'Hapus PM', bahaya: true })).ok) return;
      try { await api.hapusBnba(b.id); pm = await api.bnbaDraft(id); pilih = Math.min(pilih, pm.length - 1); hapusCache('usulan'); gambarSemua(); toast('PM dihapus.'); }
      catch (err) { toast(pesanGalat(err), 'galat'); }
      return;
    }
    if (e.target.closest('[data-simpan-draf]')) {
      if (kotor) await simpanPM(e.target.closest('button')); else toast('Draf usulan sudah tersimpan. Perubahan setiap PM tersimpan saat menekan "Simpan PM Ini".', 'info');
      return;
    }
    if (e.target.closest('[data-submit]')) {
      if (kotor && !(await simpanPM(e.target.closest('button')))) return;
      const kurang = pm.filter((x) => !lengkapPM(x)).length;
      if (!pm.length) return toast('Usulan belum berisi PM.', 'galat');
      if (kurang) return toast(`${kurang} PM belum lengkap (klaster, jenis bantuan, atau nilai bantuan).`, 'galat');
      if (!d.usulan.link_profil) return toast('Link profil asesmen wajib diisi. Gunakan tombol "Ubah Judul & Link".', 'galat');
      const k = await konfirmasi({ judul: 'Submit usulan ke Kapokja?', ikonNama: 'send', label: 'Submit sekarang',
        pesan: `${pm.length} PM senilai ${rupiah(pm.reduce((a, x) => a + (Number(x.nilai_bantuan) || 0), 0))} dikirim ke Kapokja ${d.usulan.pokja_nama}. Setelah submit, usulan terkunci sampai diverifikasi.` });
      if (!k.ok) return;
      try { await api.ajukanUsulan(id); hapusCache('usulan'); toast('Usulan terkirim. Kapokja mendapat notifikasi.'); pergi('/workspace-bnba'); }
      catch (err) { toast(pesanGalat(err), 'galat'); }
      return;
    }
    if (e.target.closest('[data-impor]')) return bukaImporBnba(d.usulan, { onSelesai: async () => { pm = await api.bnbaDraft(id); pilih = 0; gambarSemua(); } });
    if (e.target.closest('[data-ubah-judul]')) {
      const u = d.usulan;
      const m = bukaModal({ judul: 'Ubah Judul & Link Profil', isi: String(html`<div class="field"><label class="label" for="uj-j">Judul usulan<span class="wajib">*</span></label><input id="uj-j" class="input" value="${u.judul}"></div>
        <div class="field" style="margin-top:16px"><label class="label" for="uj-l">Link profil asesmen</label><input id="uj-l" class="input" type="url" value="${u.link_profil || ''}" placeholder="https://drive.google.com/…"></div>`),
        kaki: String(html`<button class="btn btn-ghost" data-batal>Batal</button><button class="btn btn-primary" data-ok>Simpan</button>`) });
      m.el.querySelector('[data-ok]').onclick = async (ev) => {
        const pulih = tombolMuat(ev.currentTarget);
        try { await api.simpanUsulan({ id, judul: m.el.querySelector('#uj-j').value, link_profil: m.el.querySelector('#uj-l').value, kategori: u.kategori });
          await muat(); gambarKepala(); m.tutup(); hapusCache('usulan'); toast('Judul dan link tersimpan.'); }
        catch (err) { pulih(); toast(pesanGalat(err), 'galat'); }
      };
      return;
    }
    if (e.target.closest('[data-hapus-usulan]')) {
      if (!(await konfirmasi({ judul: 'Hapus draft usulan?', pesan: 'Usulan dan seluruh PM di dalamnya dihapus. Tindakan ini tidak dapat dibatalkan.', label: 'Hapus draft', bahaya: true })).ok) return;
      try { await api.hapusUsulan(id); hapusCache('usulan'); toast('Draft usulan dihapus.'); pergi('/workspace-bnba'); } catch (err) { toast(pesanGalat(err), 'galat'); }
    }
  });
  const jaga = (e) => { if (kotor) { e.preventDefault(); e.returnValue = ''; } };
  addEventListener('beforeunload', jaga);
  return () => removeEventListener('beforeunload', jaga);
}
