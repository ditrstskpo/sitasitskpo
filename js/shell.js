// Kerangka aplikasi setelah login: sidebar (Menu Bersama + Workspace Saya),
// top bar (cari, A/A+, lonceng, profil), pengumuman, bilah simulasi, nav bawah ponsel.
import { html, raw, inisial, warnaDari, relatif, hariIni, esc } from './core/util.js';
import { ikon } from './core/icons.js';
import { api, modePratinjau } from './core/api.js';
import { state, bus, ambil, hapusCache } from './core/store.js';
import { grupMenu, menuBawah } from './core/menu.js';
import * as P from './core/peran.js';
import { toast, logo, pesanGalat, kosong, chipPokja } from './core/ui.js';
import { pergi, keluarAplikasi } from './core/nav.js';

const KUNCI_TUTUP = 'sitasi:pengumuman-ditutup';
let el = {}, pathAktif = '', urutPengumuman = 0, lepasBus = [];

export function pasang(root, { prefetch } = {}) {
  root.innerHTML = String(html`
    <a href="#konten" class="sr-only" onclick="document.getElementById('konten').focus();return false;">Lewati ke konten</a>
    <div class="shell">
      <aside class="sidebar" id="sidebar" aria-label="Menu utama"></aside>
      <div class="sb-tirai" data-tutup-sb></div>
      <div class="utama">
        <header class="topbar">
          <button type="button" class="btn btn-icon tb-menu" data-buka-sb aria-label="Buka menu">${raw(ikon('menu'))}</button>
          <a class="tb-merek" href="#/beranda">SITASI TSKPO</a>
          <form class="tb-cari" role="search" data-cari>
            ${raw(ikon('search', 18))}
            <input class="input" name="q" type="search" autocomplete="off" placeholder="Cari NIK, Nama PM, No SK, atau Dokumen…" aria-label="Cari">
            <kbd>/</kbd>
          </form>
          <span class="tb-spacer"></span>
          <div class="tb-teks" role="group" aria-label="Ukuran teks">
            <button type="button" data-teks="100" title="Ukuran teks normal">A</button>
            <button type="button" data-teks="naik" title="Perbesar teks">A+</button>
          </div>
          <div class="tb-lonceng" style="position:relative">
            <button type="button" class="btn btn-icon" data-lonceng aria-label="Notifikasi" aria-haspopup="true" aria-expanded="false">${raw(ikon('bell'))}<span class="titik-jml" hidden></span></button>
            <div class="popover" data-pop-notif role="dialog" aria-label="Notifikasi"></div>
          </div>
          <div style="position:relative">
            <button type="button" class="tb-profil" data-profil aria-haspopup="true" aria-expanded="false"></button>
            <div class="popover" data-pop-profil style="width:300px"></div>
          </div>
        </header>
        <div data-sim></div>
        <div data-pengumuman></div>
        <main class="konten" id="konten" tabindex="-1"></main>
        <footer class="kaki">© ${new Date().getFullYear()} Direktorat Rehabilitasi Sosial Tuna Sosial dan Korban Perdagangan Orang, Kementerian Sosial RI${modePratinjau ? ' · Mode Pratinjau (data contoh)' : ''}</footer>
      </div>
      <nav class="nav-bawah" aria-label="Navigasi cepat"></nav>
    </div>`);

  const q = (s) => root.querySelector(s);
  el = {
    root, sidebar: q('#sidebar'), tirai: q('.sb-tirai'), konten: q('#konten'), sim: q('[data-sim]'),
    pengumuman: q('[data-pengumuman]'), bawah: q('.nav-bawah'), lonceng: q('[data-lonceng]'),
    jml: q('.titik-jml'), popNotif: q('[data-pop-notif]'), profil: q('[data-profil]'), popProfil: q('[data-pop-profil]'),
  };

  // prefetch modul halaman saat menu diarahkan (navigasi terasa instan)
  const pra = (e) => { const a = e.target.closest?.('a[data-rute]'); if (a) prefetch?.(a.dataset.rute); };
  root.addEventListener('pointerenter', pra, true);
  root.addEventListener('focusin', pra);

  root.addEventListener('click', klik);
  q('[data-cari]').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = e.target.q.value.trim();
    if (v) { location.hash = '#/cari?q=' + encodeURIComponent(v); e.target.q.blur(); }
  });
  document.addEventListener('keydown', pintasan);
  document.addEventListener('click', tutupPopoverLuar);

  renderSemua();
  muatPengumuman();
  perbaruiPesan();
  const jedaPesan = setInterval(() => { if (!document.hidden) perbaruiPesan(); }, 90_000);
  lepasBus = [
    bus.on('sesi', () => { renderSemua(); muatPengumuman(true); }),
    bus.on('notif-baru', (n) => { renderLonceng(); if (/pesan/i.test(n?.judul || '')) perbaruiPesan(); }),
    bus.on('pengumuman', () => muatPengumuman(true)),
    bus.on('pesan-berubah', () => perbaruiPesan()),
    () => clearInterval(jedaPesan),
  ];
  return { setAktif, kontenBaru, lepas };
}

function lepas() {
  lepasBus.forEach((f) => f());
  document.removeEventListener('keydown', pintasan);
  document.removeEventListener('click', tutupPopoverLuar);
  el = {};
}

function kontenBaru() {
  const k = el.konten;
  k.classList.remove('pindah'); void k.offsetWidth; k.classList.add('pindah');
  const wadah = document.createElement('div');
  k.replaceChildren(wadah);
  return wadah;
}

function setAktif(path) {
  pathAktif = path;
  el.root?.querySelectorAll('[data-rute]').forEach((a) => {
    if (a.dataset.rute === path) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  tutupSidebar();
}

function renderSemua() {
  const s = state.sesi;
  if (!s || !el.root) return;
  renderSidebar(s); renderProfil(s); renderSim(s); renderLonceng(); renderBawah(s); aturTombolTeks();
  setAktif(pathAktif);
  pasangJumlahPesan();
}

// ---------------------------------------------------------------- jumlah pesan belum dibaca (menu Pesan)
let jumlahPesan = 0, janjiPesan = null;
function pasangJumlahPesan() {
  el.root?.querySelectorAll('[data-rute="/pesan"]').forEach((a) => {
    let b = a.querySelector('.jumlah');
    if (!jumlahPesan) { b?.remove(); return; }
    if (!b) { b = document.createElement('span'); b.className = 'jumlah'; a.appendChild(b); }
    b.textContent = jumlahPesan > 99 ? '99+' : String(jumlahPesan);
    b.setAttribute('aria-label', `${jumlahPesan} pesan belum dibaca`);
  });
}
function perbaruiPesan() {
  if (!state.sesi || !P.isPegawai(state.sesi) || janjiPesan) return;
  janjiPesan = api.jumlahPesanBelum().then((n) => { jumlahPesan = Number(n) || 0; pasangJumlahPesan(); }).catch(() => {}).finally(() => { janjiPesan = null; });
}

function itemMenu(m) {
  return html`<a class="sb-item" href="#${m.rute}" data-rute="${m.rute}">${raw(ikon(m.ikon))}<span class="lbl">${m.label}</span>
    ${m.tahap ? html`<span class="tahap" title="Dibangun pada Tahap ${m.tahap}">T${m.tahap}</span>` : ''}</a>`;
}

function renderSidebar(s) {
  const nama = s.pengguna.nama;
  el.sidebar.innerHTML = String(html`
    <a class="sb-logo" href="#${P.halamanAwal(s)}" style="text-decoration:none">${logo(40)}<span><b>SITASI TSKPO</b><small>Dit. RSTSKPO · Kementerian Sosial RI</small></span></a>
    <nav class="sb-nav">${grupMenu(s).map((g) => html`<div class="sb-group"><div class="sb-group-title">${g.judul}</div>${g.item.map(itemMenu)}</div>`)}</nav>
    <div class="sb-user">
      <span class="avatar kecil" style="--c:${warnaDari(nama)}">${inisial(nama)}</span>
      <span class="teks"><b>${nama}</b><small>${s.efektif.label}</small></span>
      ${P.isSuperAdminAsli(s) ? html`<button type="button" class="btn btn-icon" data-ganti-peran title="Ganti peran" aria-label="Ganti peran">${raw(ikon('repeat', 18))}</button>` : ''}
    </div>`);
}

function renderProfil(s) {
  const nama = s.pengguna.nama;
  el.profil.innerHTML = String(html`<span class="avatar kecil" style="--c:${warnaDari(nama)}">${inisial(nama)}</span>
    <span class="teks"><b>${nama}</b><small>${s.efektif.label}</small></span>${raw(ikon('chevron-down', 16, 'redup'))}`);
  el.popProfil.innerHTML = String(html`
    <div class="popover-head" style="display:block"><b style="display:block">${nama}</b><small class="redup" style="overflow-wrap:anywhere">${s.pengguna.email}</small>
      <div class="chips" style="margin-top:8px">${s.efektif.pokja.map((p) => chipPokja(p, (p.jabatan === 'kapokja' ? 'Kapokja ' : 'Anggota ') + p.nama_pendek))}
      ${!s.efektif.pokja.length ? html`<span class="badge b-proc">${s.efektif.label}</span>` : ''}</div></div>
    <div class="menu-list">
      ${P.isSuperAdminAsli(s) ? html`<button type="button" data-ganti-peran>${raw(ikon('repeat', 18))} Ganti Peran</button>` : ''}
      <a href="#/notifikasi">${raw(ikon('bell', 18))} Semua Notifikasi</a>
      <button type="button" class="bahaya" data-keluar>${raw(ikon('logout', 18))} Keluar</button>
    </div>`);
}

function renderSim(s) {
  el.sim.innerHTML = s.efektif.simulasi
    ? String(html`<div class="sim-bar" role="status">${raw(ikon('shield-alert', 18))}<span>Mode simulasi: Anda melihat sistem sebagai <b>${s.efektif.label.replace(' (simulasi Super Admin)', '')}</b>. Semua tindakan tercatat atas nama Super Admin.</span>
      <button type="button" data-kembali-sa>${raw(ikon('arrow-left', 16))} Kembali ke Super Admin</button></div>`)
    : '';
}

function renderLonceng() {
  if (!el.jml) return;
  const n = state.notifBelum || 0;
  el.jml.hidden = n <= 0;
  el.jml.textContent = n > 99 ? '99+' : String(n);
  el.lonceng.setAttribute('aria-label', n ? `Notifikasi, ${n} belum dibaca` : 'Notifikasi');
}

function renderBawah(s) {
  el.bawah.innerHTML = String(html`${menuBawah(s).map((m) => html`<a href="#${m.rute}" data-rute="${m.rute}">${raw(ikon(m.ikon, 22))}<span>${m.label.replace(' / Dashboard', '').replace(' Pencairan', '').replace(' & Komunikasi', '').replace(' & Hak Akses', '')}</span></a>`)}
    <button type="button" data-buka-sb>${raw(ikon('grid', 22))}<span>Lainnya</span></button>`);
  el.bawah.style.gridTemplateColumns = `repeat(${menuBawah(s).length + 1}, 1fr)`;
}

// ---------------------------------------------------------------- pengumuman
async function muatPengumuman(paksa = false) {
  if (!state.sesi || !el.pengumuman) return;
  try {
    const daftar = await ambil('pengumuman:aktif', () => api.pengumumanAktif(hariIni()), { ttl: 120_000, paksa });
    renderPengumuman(daftar);
  } catch { /* pengumuman bukan hal kritis */ }
}
function ditutup() { try { return JSON.parse(sessionStorage.getItem(KUNCI_TUTUP) || '[]'); } catch { return []; } }
function renderPengumuman(daftar) {
  const tutup = ditutup();
  const tampil = (daftar || []).filter((x) => !tutup.includes(x.id + x.diubah_pada));
  if (!tampil.length) { el.pengumuman.innerHTML = ''; return; }
  urutPengumuman = urutPengumuman % tampil.length;
  const x = tampil[urutPengumuman];
  el.pengumuman.innerHTML = String(html`<div class="pengumuman ${x.tingkat === 'penting' ? 'penting' : ''}" role="region" aria-label="Pengumuman">
    ${raw(ikon('megaphone', 20))}<div class="isi"><b>${x.judul}:</b> ${x.isi}</div>
    ${tampil.length > 1 ? html`<button type="button" data-pengumuman-lanjut title="Pengumuman berikutnya"><span class="geser">${urutPengumuman + 1}/${tampil.length}</span>${raw(ikon('chevron-right', 16))}</button>` : ''}
    <button type="button" data-pengumuman-tutup="${x.id + x.diubah_pada}">Tutup ${raw(ikon('x', 16))}</button></div>`);
  el.pengumuman._daftar = daftar;
}

// ---------------------------------------------------------------- notifikasi (popover)
async function bukaNotif() {
  const pop = el.popNotif;
  pop.innerHTML = String(html`<div class="popover-head"><b>Notifikasi</b></div><div style="padding:12px 16px"><div class="skel skel-baris"></div><div class="skel skel-baris" style="width:70%"></div><div class="skel skel-baris" style="width:85%"></div></div>`);
  try {
    const { baris } = await api.notifikasi({ hal: 1, per: 8 });
    pop.innerHTML = String(html`<div class="popover-head"><b>Notifikasi</b>
        ${state.notifBelum ? html`<button type="button" class="tautan-btn" data-baca-semua style="min-height:32px;font-size:.8125rem">Tandai semua dibaca</button>` : ''}</div>
      <div style="max-height:380px;overflow:auto">${baris.length ? baris.map((n) => html`<button type="button" class="notif-item ${n.dibaca_pada ? '' : 'baru'}" data-notif="${n.id}" data-tautan="${n.tautan || ''}">
          <span class="ubin ${n.jenis === 'pengumuman' ? 'emas' : n.jenis === 'sukses' ? '' : 'biru'}" style="width:36px;height:36px;border-radius:12px">${raw(ikon(n.jenis === 'pengumuman' ? 'megaphone' : n.jenis === 'sukses' ? 'check-circle' : 'bell', 18))}</span>
          <span><span class="judul">${n.judul}</span>${n.isi ? html`<span class="isi">${n.isi}</span>` : ''}<span class="waktu">${relatif(n.dibuat_pada)}</span></span></button>`)
        : kosong({ ikonNama: 'bell', judul: 'Belum ada notifikasi', teks: 'Pemberitahuan tugas dan verifikasi akan muncul di sini.' })}</div>
      <div class="menu-list" style="border-top:1px solid var(--garis-halus)"><a href="#/notifikasi">${raw(ikon('arrow-right', 18))} Lihat semua notifikasi</a></div>`);
  } catch (e) {
    pop.innerHTML = String(html`<div class="popover-head"><b>Notifikasi</b></div><div style="padding:16px" class="redup">${pesanGalat(e)}</div>`);
  }
}

// ---------------------------------------------------------------- interaksi
function togglePopover(tombol, pop, onBuka) {
  const buka = !pop.classList.contains('buka');
  tutupSemuaPopover();
  if (buka) { pop.classList.add('buka'); tombol.setAttribute('aria-expanded', 'true'); onBuka?.(); }
}
function tutupSemuaPopover() {
  el.root?.querySelectorAll('.popover.buka').forEach((p) => p.classList.remove('buka'));
  el.root?.querySelectorAll('[aria-expanded="true"]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
}
function tutupPopoverLuar(e) {
  if (!el.root || e.target.closest('.popover, [data-lonceng], [data-profil]')) return;
  tutupSemuaPopover();
}
function bukaSidebar() { el.sidebar.classList.add('buka'); el.tirai.classList.add('buka'); el.sidebar.querySelector('a')?.focus(); }
function tutupSidebar() { el.sidebar?.classList.remove('buka'); el.tirai?.classList.remove('buka'); }

async function klik(e) {
  const t = e.target.closest('button, a');
  if (!t) return;
  if (t.matches('[data-lonceng]')) return togglePopover(t, el.popNotif, bukaNotif);
  if (t.matches('[data-profil]')) return togglePopover(t, el.popProfil);
  if (t.matches('[data-buka-sb]')) return bukaSidebar();
  if (t.closest('.popover a')) tutupSemuaPopover();
  if (t.matches('[data-teks]')) return ubahTeks(t.dataset.teks);
  if (t.matches('[data-ganti-peran]')) {
    tutupSemuaPopover(); tutupSidebar();
    const m = await import('./pages/ganti-peran.js');
    return m.bukaGantiPeran();
  }
  if (t.matches('[data-kembali-sa]')) {
    t.disabled = true;
    const m = await import('./pages/ganti-peran.js');
    return m.terapkanPeran('super_admin', null);
  }
  if (t.matches('[data-keluar]')) {
    tutupSemuaPopover();
    await keluarAplikasi();
    return toast('Anda telah keluar dari SITASI TSKPO.', 'info');
  }
  if (t.matches('[data-pengumuman-tutup]')) {
    const id = t.dataset.pengumumanTutup;
    sessionStorage.setItem(KUNCI_TUTUP, JSON.stringify([...ditutup(), id]));
    return renderPengumuman(el.pengumuman._daftar);
  }
  if (t.matches('[data-pengumuman-lanjut]')) { urutPengumuman++; return renderPengumuman(el.pengumuman._daftar); }
  if (t.matches('[data-baca-semua]')) {
    try { await api.tandaiDibaca(null); state.notifBelum = 0; renderLonceng(); bukaNotif(); } catch (err) { toast(pesanGalat(err), 'galat'); }
    return;
  }
  if (t.matches('[data-notif]')) {
    const baru = t.classList.contains('baru');
    tutupSemuaPopover();
    if (baru) { api.tandaiDibaca(t.dataset.notif).catch(() => {}); state.notifBelum = Math.max(0, state.notifBelum - 1); renderLonceng(); }
    const tautan = t.dataset.tautan;
    if (tautan && tautan.startsWith('#/')) location.hash = tautan;
  }
}

function pintasan(e) {
  const k = e.key;
  const ketik = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
  if ((k === '/' && !ketik) || (k.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey))) {
    const c = el.root?.querySelector('[data-cari] input');
    if (c && c.offsetParent) { e.preventDefault(); c.focus(); }
  }
  if (k === 'Escape') { tutupSemuaPopover(); tutupSidebar(); }
}

// ---------------------------------------------------------------- ukuran teks (A / A+)
const TINGKAT = ['100', '112', '125'];
export function terapkanUkuranTeks() {
  const v = localStorage.getItem('sitasi:teks') || '100';
  document.documentElement.classList.remove('teks-112', 'teks-125');
  if (v !== '100') document.documentElement.classList.add('teks-' + v);
}
function ubahTeks(arah) {
  const kini = localStorage.getItem('sitasi:teks') || '100';
  const baru = arah === '100' ? '100' : TINGKAT[Math.min(TINGKAT.indexOf(kini) + 1, TINGKAT.length - 1)];
  try { localStorage.setItem('sitasi:teks', baru); } catch {}
  terapkanUkuranTeks(); aturTombolTeks();
  toast(baru === '100' ? 'Ukuran teks normal.' : `Ukuran teks ${baru === '112' ? '112,5' : '125'}%.`, 'info');
}
function aturTombolTeks() {
  const v = localStorage.getItem('sitasi:teks') || '100';
  el.root?.querySelector('[data-teks="100"]')?.setAttribute('aria-pressed', String(v === '100'));
  el.root?.querySelector('[data-teks="naik"]')?.setAttribute('aria-pressed', String(v !== '100'));
}

export { pergi, esc };
