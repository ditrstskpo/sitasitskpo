// Potongan bersama halaman Tahap 3 & 4: formulir dari definisi kolom, tabel, status, pita peta, dan unduhan.
import { html, raw, angka, tanggal } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { bukaModal, toast, pesanGalat, tombolMuat, konfirmasi } from '../core/ui.js';
import { opsi } from '../core/komp.js';
import { STATUS_BNBA, badge, KLASTER, PROVINSI } from '../core/bnba.js';
import { daftarKabKota, cocokKabKota, cocokProvinsi } from '../core/wilayah.js';

export { KLASTER, PROVINSI };
export const status = (v) => badge(STATUS_BNBA, v);
export const STATUS_OPSI = Object.entries(STATUS_BNBA).map(([k, v]) => [k, v.l]);

export const LKS_OPSI = {
  status_hukum: ['Berbadan hukum', 'Tidak berbadan hukum'],
  status_operasional: ['Aktif', 'Vakum sementara', 'Tidak aktif'],
  akreditasi: ['A', 'B', 'C', 'D-TTA', 'Belum mengajukan'],
  bentuk_layanan: ['Dalam lembaga', 'Luar lembaga', 'Dalam dan luar lembaga'],
  wilayah_jangkauan: ['Kab/Kota', 'Provinsi', 'Nasional'],
  jenis_layanan: ['Rehabilitasi Sosial', 'Perlindungan Sosial', 'Pemberdayaan Sosial'],
};
export const KAT_DOK = ['SK ATENSI', 'SK Kegiatan', 'SK', 'SOP', 'Perpres', 'KAK', 'Bahan Paparan', 'Dokumentasi Kegiatan', 'Lainnya'];
export const IKON_KAT = { 'SK ATENSI': 'award', 'SK Kegiatan': 'file-check', SK: 'scroll', SOP: 'list-checks', Perpres: 'gavel', KAK: 'file-text', 'Bahan Paparan': 'pie', 'Dokumentasi Kegiatan': 'camera', Lainnya: 'folder' };
export const JENIS_HUKUM = ['Peraturan Menteri', 'Keputusan Menteri', 'Keputusan Dirjen', 'Keputusan Direktur', 'Surat Edaran', 'SOP', 'Pedoman/Juknis', 'Lainnya'];

/**
 * Satu kolom formulir. d: { k, l, tipe, opsi, wajib, lebar, ph, help, min, max, baris, nonaktif }
 * tipe: teks | angka | uang | tanggal | waktu | pilih | multi | area | sakelar | email | tel
 */
export function medan(d, v) {
  const id = 'f-' + d.k, wajib = d.wajib ? html`<span class="wajib">*</span>` : '';
  const nil = v ?? '';
  const dis = d.nonaktif ? raw('disabled') : '';
  let isi;
  if (d.tipe === 'pilih') {
    isi = html`<select id="${id}" class="select" data-k="${d.k}" ${dis}>${opsi(d.opsi || [], nil, d.kosong ?? '— Pilih —')}</select>`;
  } else if (d.tipe === 'kabkota') {
    isi = html`<input id="${id}" class="input" data-k="${d.k}" data-induk="${d.induk || 'provinsi'}" list="dl-t34-${d.k}" value="${nil}" autocomplete="off" placeholder="Pilih provinsi dulu, lalu pilih / ketik kabupaten atau kota" ${dis}><datalist id="dl-t34-${d.k}"></datalist>
      <div class="help" data-saran-kab>Pilih provinsi dulu; daftar kabupaten/kota menyesuaikan.</div>`;
  } else if (d.tipe === 'multi') {
    const pilih = new Set(Array.isArray(v) ? v : String(v || '').split(/\s*[;,]\s*/).filter(Boolean));
    return html`<div class="field ${d.lebar ? 'penuh' : ''}" data-medan="${d.k}"><span class="label">${d.l}${wajib}</span>
      <div class="cek-grup" role="group" aria-label="${d.l}" data-k="${d.k}" data-tipe="multi">${(d.opsi || []).map((o) => {
        const [val, lab] = Array.isArray(o) ? o : [o, o];
        return html`<label class="cek-pil"><input type="checkbox" value="${val}" ${pilih.has(val) ? raw('checked') : ''} ${dis}><span>${lab}</span></label>`;
      })}</div>${d.help ? html`<div class="help">${d.help}</div>` : ''}<div class="err" hidden></div></div>`;
  } else if (d.tipe === 'sakelar') {
    return html`<div class="field ${d.lebar ? 'penuh' : ''}" data-medan="${d.k}"><label class="sakelar"><input type="checkbox" data-k="${d.k}" data-tipe="sakelar" ${v ? raw('checked') : ''} ${dis}> ${d.l}</label>
      ${d.help ? html`<div class="help">${d.help}</div>` : ''}</div>`;
  } else if (d.tipe === 'area') {
    isi = html`<textarea id="${id}" class="textarea" rows="${d.baris || 3}" data-k="${d.k}" placeholder="${d.ph || ''}" ${dis}>${nil}</textarea>`;
  } else {
    const t = { angka: 'text', uang: 'text', tanggal: 'date', waktu: 'datetime-local', email: 'email', tel: 'tel' }[d.tipe] || 'text';
    const mode = d.tipe === 'angka' || d.tipe === 'uang' ? raw('inputmode="numeric"') : '';
    const nv = d.tipe === 'waktu' && nil ? String(nil).slice(0, 16) : d.tipe === 'tanggal' && nil ? String(nil).slice(0, 10) : nil;
    isi = html`<input id="${id}" class="input" type="${t}" ${mode} data-k="${d.k}" value="${nv}" placeholder="${d.ph || ''}" ${d.maks ? raw(`maxlength="${d.maks}"`) : ''} ${dis}>`;
  }
  return html`<div class="field ${d.lebar ? 'penuh' : ''}" data-medan="${d.k}"><label class="label" for="${id}">${d.l}${wajib}</label>${isi}
    ${d.help ? html`<div class="help">${d.help}</div>` : ''}<div class="err" hidden></div></div>`;
}

/** Formulir dua kolom. bagian: [{ judul, kolom: [...] }] atau langsung daftar kolom. */
export function formulir(defs, data = {}) {
  const bagian = defs[0]?.kolom ? defs : [{ kolom: defs }];
  return html`${bagian.map((b, i) => html`<div class="form-bagian">${b.judul ? html`<h3><span class="no">${i + 1}</span>${b.judul}</h3>` : ''}
    ${b.ket ? html`<p class="redup" style="margin:-6px 0 12px;font-size:.875rem">${b.ket}</p>` : ''}
    <div class="form-grid">${b.kolom.map((d) => medan(d, data[d.k]))}</div></div>`)}`;
}
const semuaKolom = (defs) => (defs[0]?.kolom ? defs.flatMap((b) => b.kolom) : defs);

/** Baca nilai formulir; cek kolom wajib. Mengembalikan objek atau null (bila ada yang kosong). */
export function bacaFormulir(root, defs) {
  const o = {}; let ok = true;
  root.querySelectorAll('.field.salah').forEach((f) => { f.classList.remove('salah'); const e = f.querySelector('.err'); if (e) e.hidden = true; });
  for (const d of semuaKolom(defs)) {
    if (d.nonaktif) continue;
    let v;
    if (d.tipe === 'multi') v = [...root.querySelectorAll(`[data-k="${d.k}"] input:checked`)].map((x) => x.value);
    else if (d.tipe === 'sakelar') v = !!root.querySelector(`[data-k="${d.k}"]`)?.checked;
    else v = (root.querySelector(`[data-k="${d.k}"]`)?.value ?? '').trim();
    if (d.tipe === 'uang' && v) v = v.replace(/[^\d]/g, '');
    const kosong = Array.isArray(v) ? !v.length : v === '' || v == null;
    if (d.wajib && kosong) {
      ok = false;
      const f = root.querySelector(`[data-medan="${d.k}"]`);
      if (f) { f.classList.add('salah'); const e = f.querySelector('.err'); if (e) { e.hidden = false; e.innerHTML = String(html`${raw(ikon('alert', 16))} ${d.l} wajib diisi.`); } }
    }
    o[d.k] = Array.isArray(v) ? v : v === '' ? null : v;
  }
  if (!ok) root.querySelector('.field.salah input, .field.salah select, .field.salah textarea')?.focus();
  return ok ? o : null;
}

/**
 * Modal formulir siap pakai. simpan(obj) → hasil; bila melempar galat, pesan ditampilkan dan modal tetap terbuka.
 */
export function bukaFormulir({ judul, defs, data = {}, ukuran = 'besar', label = 'Simpan', atas = '', bawah = '', simpan, tambahan }) {
  const m = bukaModal({
    judul, ukuran,
    isi: String(html`${atas ? raw(atas) : ''}${formulir(defs, data)}${bawah ? raw(bawah) : ''}<div class="galat" data-galat hidden style="margin-top:16px"></div>`),
    kaki: String(html`<button type="button" class="btn btn-ghost" data-batal>Batal</button><button type="button" class="btn btn-primary" data-ok>${raw(ikon('check', 18))} ${label}</button>`),
  });
  tambahan?.(m);
  m.el.querySelector('[data-ok]').onclick = async (e) => {
    const o = bacaFormulir(m.el, defs); if (!o) return;
    const pulih = tombolMuat(e.currentTarget);
    const g = m.el.querySelector('[data-galat]'); g.hidden = true;
    try { const r = await simpan(o, m); m.tutup(); return r; }
    catch (err) { pulih(); g.hidden = false; g.innerHTML = String(html`${raw(ikon('alert', 20))}<span>${pesanGalat(err)}</span>`); g.scrollIntoView({ block: 'nearest' }); }
  };
  return m;
}

/** Tabel data. kolom: [[judul, (r,i) => isi, kelas?]] · atr(r) → atribut baris. */
export function tabel(baris, kolom, { atr = () => '', kelas = '' } = {}) {
  return html`<div class="table-wrap"><table class="tbl ${kelas}"><thead><tr>${kolom.map(([j, , k]) => html`<th class="${k || ''}">${raw(j)}</th>`)}</tr></thead>
    <tbody>${baris.map((r, i) => html`<tr ${raw(atr(r, i))}>${kolom.map(([, f, k]) => html`<td class="${k || ''}">${f(r, i)}</td>`)}</tr>`)}</tbody></table></div>`;
}

/** Kepala bagian di dalam pita gelap. */
export function kepalaPita({ pill, judul, sorot, sub, aksi = '' }) {
  return html`<div class="band-kepala"><div>${pill ? html`<span class="pill">${pill}</span>` : ''}
    <h2>${sorot ? html`<span class="hl hl-sapu">${sorot}</span> ` : ''}${judul || ''}</h2>${sub ? html`<p>${sub}</p>` : ''}</div>
    ${aksi ? html`<div style="display:flex;gap:10px;flex-wrap:wrap">${raw(aksi)}</div>` : ''}</div>`;
}

/** Kartu grafik dengan judul + keterangan. */
export const kartuGrafik = (judul, ket, isi, { kelas = 'card', tunda = 0 } = {}) =>
  html`<section class="${kelas} grafik-kartu rv" style="--tunda:${tunda}ms"><div><h3>${judul}</h3></div>${ket ? html`<p class="ket">${ket}</p>` : ''}${isi}</section>`;

/** Konfirmasi + panggil + toast. */
export async function aksiKonfirmasi({ judul, pesan, label, bahaya = false, alasan = null, jalan, sukses }) {
  const k = await konfirmasi({ judul, pesan, label, bahaya, alasan });
  if (!k.ok) return false;
  try { await jalan(k.alasan); if (sukses) toast(sukses); return true; }
  catch (e) { toast(pesanGalat(e), 'galat'); return false; }
}

/** Ambil semua halaman dari fungsi daftar (untuk unduhan sesuai filter). */
export async function ambilSemua(fn, f, per = 500, batas = 20000) {
  const hasil = []; let hal = 1, total = Infinity;
  while (hasil.length < Math.min(total, batas)) {
    const r = await fn({ ...f, hal, per });
    total = r.total ?? 0; hasil.push(...(r.baris || []));
    if (!(r.baris || []).length) break;
    hal++;
  }
  return hasil;
}

export const tglPendek = (v) => (v ? tanggal(v) : '—');
export const ya = (v) => (v ? 'Ya' : 'Tidak');
export const daftarTeks = (a) => (Array.isArray(a) ? a.join(', ') : a || '');
export const chipKlaster = (a) => (a || []).map((k) => html`<span class="chip-klaster">${k}</span>`);
export const tagAkr = (v) => (v ? html`<span class="tag-akr ${v === 'Belum mengajukan' ? 'belum' : v}">${v === 'Belum mengajukan' ? 'Belum' : v}</span>` : '—');
export const n0 = (v) => angka(v || 0);

/** Kartu ringkas di atas tabel (jumlah per status), untuk tab bersegmen. */
export function segmen(daftar, aktif) {
  return html`<div class="segmen-tab" role="tablist">${daftar.map(([id, label, n, kelas]) => html`<button type="button" class="seg ${kelas || ''} ${id === aktif ? 'on' : ''}" role="tab" aria-selected="${id === aktif}" data-seg="${id}">
    ${label}${n != null ? html`<span class="hitung">${angka(n)}</span>` : ''}</button>`)}</div>`;
}

export const ikonMime = (mime = '', nama = '') => {
  const e = (String(nama).split('.').pop() || '').toUpperCase();
  if (/pdf/.test(mime) || e === 'PDF') return ['PDF', '#D9644A'];
  if (/word|msword/.test(mime) || /^DOCX?$/.test(e)) return ['DOC', '#3E66B3'];
  if (/sheet|excel/.test(mime) || /^XLSX?$/.test(e)) return ['XLS', '#17824A'];
  if (/presentation|powerpoint/.test(mime) || /^PPTX?$/.test(e)) return ['PPT', '#C2477F'];
  if (/^image\//.test(mime)) return ['FOTO', '#0E9F97'];
  if (!mime) return ['LINK', '#7B5EC2'];
  return [e.slice(0, 4) || 'FILE', '#5B6B7F'];
};


// ---- Provinsi → Kabupaten/Kota bertingkat (sama dengan Workspace BNBA), berlaku untuk semua formulir tipe 'kabkota' ----
const lingkup = (el) => el.closest('.modal, form, main') || document;
function isiDaftarKab(inp) {
  const prov = lingkup(inp).querySelector(`[data-k="${inp.dataset.induk}"]`)?.value || '';
  const dl = document.getElementById(inp.getAttribute('list'));
  if (dl) dl.innerHTML = daftarKabKota(prov).map((n) => `<option value="${n}"></option>`).join('');
  const h = inp.closest('.field')?.querySelector('[data-saran-kab]');
  if (h) h.textContent = prov ? 'Pilih dari daftar atau ketik; ejaan dicocokkan otomatis.' : 'Pilih provinsi dulu; daftar kabupaten/kota menyesuaikan.';
  return prov;
}
if (typeof document !== 'undefined' && !window.__wilayahT34) {
  window.__wilayahT34 = true;
  document.addEventListener('focusin', (e) => { if (e.target.matches?.('input[data-induk]')) isiDaftarKab(e.target); });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.matches?.('select[data-k]')) {
      lingkup(t).querySelectorAll(`input[data-induk="${t.dataset.k}"]`).forEach((inp) => {
        isiDaftarKab(inp);
        if (inp.value && t.value && !cocokKabKota(inp.value, t.value).nilai) inp.value = '';
      });
    }
  });
  document.addEventListener('focusout', (e) => {
    const inp = e.target; if (!inp.matches?.('input[data-induk]') || !inp.value.trim()) return;
    const prov = isiDaftarKab(inp), h = inp.closest('.field')?.querySelector('[data-saran-kab]');
    if (!prov) return;
    const r = cocokKabKota(inp.value, prov);
    if (r.nilai) { if (r.nilai !== inp.value) { inp.value = r.nilai; if (h) h.textContent = 'Disesuaikan otomatis dengan nama baku.'; } }
    else if (h) h.textContent = r.saran.length ? 'Belum cocok. Mungkin: ' + r.saran.join(' / ') : 'Nama ini belum ada di daftar provinsi tersebut; periksa ejaan.';
  });
}
