// Pengaturan > Pengguna & Hak Akses (Super Admin)
// Allowlist login, peran sistem (maks 2 Super Admin), jenis akses, keanggotaan Pokja.
import { html, raw, relatif, tanggalJam, inisial, warnaDari, debounce, emailValid, angka } from '../core/util.js';
import { ikon } from '../core/icons.js';
import { api } from '../core/api.js';
import { state, ambil, dariCache, hapusCache } from '../core/store.js';
import { judulHalaman, skelKartu, skelTabel, kosong, kotakGalat, pager, chipPokja, badgeAktif, bukaModal, konfirmasi,
  toast, pesanGalat, tombolMuat, hitungNaik, gayaPokja } from '../core/ui.js';
import { daftarPokja } from './ganti-peran.js';

const PER = 50;

export async function render(el, { query, segarkanSesi }) {
  const f = { q: '', pokja: query.get('pokja') || '', peran: '', status: 'aktif' };
  let hal = 1, pokja = [], ringkas = null;

  el.innerHTML = String(html`
    ${judulHalaman({ pill: 'Hak Akses & Allowlist', sorot: 'Pengguna', sisa: '& Hak Akses',
      sub: 'Hanya email yang terdaftar di sini yang dapat masuk dengan Google. Maksimal 2 Super Admin aktif; penambahan dan penggantian dilakukan di halaman ini tanpa mengubah kode.',
      aksi: String(html`<button type="button" class="btn btn-primary" data-tambah>${raw(ikon('user-plus', 20))} Tambah Pengguna</button>`) })}
    <div data-kpi>${skelKartu(4)}</div>
    <section class="card filter-card">
      <div class="filter-head">${raw(ikon('filter', 20))} Saring Pengguna</div>
      <div class="filter-grid">
        <div class="field"><label class="label" for="f-q">Cari nama, email, atau NIP</label>
          <div class="input-ikon">${raw(ikon('search', 18))}<input id="f-q" class="input" type="search" placeholder="Ketik untuk mencari…" autocomplete="off"></div></div>
        <div class="field"><label class="label" for="f-pokja">Pokja</label><select id="f-pokja" class="select"><option value="">Semua Pokja</option></select></div>
        <div class="field"><label class="label" for="f-peran">Peran</label><select id="f-peran" class="select">
          <option value="">Semua peran</option><option value="super_admin">Super Admin</option><option value="direktur">Direktur</option>
          <option value="kapokja">Kapokja</option><option value="anggota">Anggota Pokja</option><option value="petugas_supermonev">Petugas Supermonev</option><option value="petugas_bank">Petugas Bank</option></select></div>
        <div class="field"><label class="label" for="f-status">Status</label><select id="f-status" class="select">
          <option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option><option value="">Semua status</option></select></div>
        <button type="button" class="btn btn-ghost" data-reset>${raw(ikon('refresh', 18))} Reset</button>
      </div>
    </section>
    <section class="card table-card" style="margin-top:24px">
      <div class="card-head"><div><h2 class="card-title">Daftar Pengguna Terdaftar</h2><p class="card-sub" data-jumlah>Memuat…</p></div></div>
      <div data-tabel>${skelTabel(8, 6)}</div>
    </section>`);

  const $ = (s) => el.querySelector(s);
  const tabel = $('[data-tabel]');

  // ---------------------------------------------------------------- data
  async function muatPokja() {
    try {
      pokja = await daftarPokja();
      $('#f-pokja').innerHTML = String(html`<option value="">Semua Pokja</option>${pokja.map((p) => html`<option value="${p.id}">${p.nama}</option>`)}`);
      $('#f-pokja').value = f.pokja;
    } catch {}
  }
  async function muatKpi(paksa = false) {
    const c = dariCache('pengguna:ringkas');
    if (c && !paksa) gambarKpi(c);
    try { ringkas = await ambil('pengguna:ringkas', () => api.ringkasanPengguna(), { ttl: 30_000, paksa: paksa || !!c }); gambarKpi(ringkas); } catch {}
  }
  function gambarKpi(r) {
    ringkas = r;
    $('[data-kpi]').innerHTML = String(html`<div class="kpi-row">
      <div class="kpi"><span class="kpi-badge">${raw(ikon('users', 22))}</span><span class="kpi-label">Pengguna Aktif</span><span class="kpi-num" data-hitung="${r.aktif}">0</span><span class="kpi-note">${angka(r.belum_login)} belum pernah login</span></div>
      <div class="kpi sky"><span class="kpi-badge">${raw(ikon('pegawai', 22))}</span><span class="kpi-label">Pegawai Direktorat</span><span class="kpi-num" data-hitung="${r.pegawai}">0</span><span class="kpi-note">Akses menu sesuai Pokja</span></div>
      <div class="kpi gold"><span class="kpi-badge">${raw(ikon('clipboard-list', 22))}</span><span class="kpi-label">Petugas Supermonev</span><span class="kpi-num" data-hitung="${r.petugas_supermonev}">0</span><span class="kpi-note">Hanya menu Supermonev</span></div>
      <div class="kpi violet"><span class="kpi-badge">${raw(ikon('shield', 22))}</span><span class="kpi-label">Super Admin</span><span class="kpi-num">${r.super_admin}<small>/ 2 akun</small></span><span class="kpi-note">${angka(r.nonaktif)} akun nonaktif</span></div>
    </div>`);
    hitungNaik($('[data-kpi]'));
  }

  const kunci = () => 'pengguna:daftar:' + JSON.stringify({ ...f, hal });
  async function muatTabel(paksa = false) {
    const k = kunci();
    const c = dariCache(k);
    if (c && !paksa) gambarTabel(c); else if (!c) tabel.innerHTML = String(skelTabel(8, 6));
    try {
      const d = await ambil(k, () => api.daftarPengguna({ ...f, hal, per: PER }), { ttl: 30_000, paksa: paksa || !!c });
      if (k === kunci()) gambarTabel(d);
    } catch (e) { if (k === kunci()) tabel.innerHTML = String(kotakGalat(pesanGalat(e))); }
  }

  function peranSel(u) {
    const b = [];
    if (u.peran_sistem === 'super_admin') b.push(html`<span class="badge b-violet">${raw(ikon('shield', 15))} Super Admin${u.super_admin_slot ? ' ' + u.super_admin_slot : ''}</span>`);
    if (u.peran_sistem === 'direktur') b.push(html`<span class="badge b-proc">${raw(ikon('landmark', 15))} Direktur</span>`);
    if (u.jenis_akses === 'petugas_supermonev' || u.juga_supermonev) b.push(html`<span class="badge b-gold">${raw(ikon('clipboard-list', 15))} Petugas Supermonev</span>`);
    if (u.jenis_akses === 'petugas_bank') b.push(html`<span class="badge b-proc">${raw(ikon('landmark', 15))} Petugas Bank</span>`);
    const pk = (u.pengguna_pokja || []).filter((x) => x.pokja).sort((a, c) => a.pokja.urutan - c.pokja.urutan);
    pk.forEach((x) => b.push(chipPokja(x.pokja, (x.jabatan === 'kapokja' ? 'Kapokja · ' : 'Anggota · ') + x.pokja.nama_pendek)));
    if (!b.length) b.push(html`<span class="redup">Pegawai (belum ada Pokja)</span>`);
    return html`<div class="chips">${b}</div>`;
  }

  function gambarTabel({ baris, total }) {
    $('[data-jumlah]').textContent = `${angka(total)} pengguna sesuai saringan`;
    if (!baris.length) {
      tabel.innerHTML = String(kosong({ ikonNama: 'users', judul: 'Tidak ada pengguna', teks: 'Ubah saringan, atau tambahkan pengguna baru agar email tersebut dapat masuk.',
        aksi: String(html`<button type="button" class="btn btn-primary" data-tambah>${raw(ikon('user-plus', 18))} Tambah Pengguna</button>`) }));
      return;
    }
    const sayaId = state.sesi?.pengguna?.id;
    tabel.innerHTML = String(html`<div class="table-wrap"><table class="tbl">
      <thead><tr><th class="no">No</th><th>Nama & Email</th><th>Peran & Pokja</th><th>Status</th><th>Login Terakhir</th><th class="aksi">Aksi</th></tr></thead>
      <tbody>${baris.map((u, i) => html`<tr>
        <td class="no">${(hal - 1) * PER + i + 1}</td>
        <td style="min-width:280px"><div class="sel-id"><span class="avatar" style="--c:${warnaDari(u.nama)}">${inisial(u.nama)}</span>
          <span><b>${u.nama}${u.id === sayaId ? html` <span class="badge b-ok" style="height:22px;font-size:.6875rem">Anda</span>` : ''}</b><small style="overflow-wrap:anywhere">${u.email}</small>${u.nip ? html`<small>NIP ${u.nip}</small>` : ''}</span></div></td>
        <td style="min-width:240px">${peranSel(u)}</td>
        <td>${badgeAktif(u.aktif)}</td>
        <td style="white-space:nowrap"><span title="${tanggalJam(u.login_terakhir)}">${u.login_terakhir ? relatif(u.login_terakhir) : html`<span class="redup">Belum pernah login</span>`}</span></td>
        <td class="aksi"><div style="display:flex;gap:6px">
          <button type="button" class="btn btn-sm btn-secondary" data-ubah="${u.id}">${raw(ikon('pencil', 16))} Ubah</button>
          ${u.id === sayaId ? '' : u.aktif
            ? html`<button type="button" class="btn btn-sm btn-ghost" data-nonaktif="${u.id}" style="color:var(--merah)">${raw(ikon('user-x', 16))} Nonaktifkan</button>`
            : html`<button type="button" class="btn btn-sm btn-ghost" data-aktifkan="${u.id}">${raw(ikon('user-check', 16))} Aktifkan</button>`}
        </div></td></tr>`)}</tbody></table></div>
      ${total > PER ? pager({ hal, total, per: PER }) : ''}`);
    tabel._baris = baris;
  }

  // ---------------------------------------------------------------- formulir tambah / ubah
  function bukaForm(u = null) {
    const baru = !u;
    const pk = new Map((u?.pengguna_pokja || []).filter((x) => x.pokja).map((x) => [x.pokja.id, x.jabatan]));
    const saPenuh = (ringkas?.super_admin ?? 0) >= 2 && u?.peran_sistem !== 'super_admin';
    const m = bukaModal({
      judul: baru ? 'Tambah Pengguna' : 'Ubah Pengguna', ukuran: 'besar',
      isi: String(html`<form data-form novalidate>
        <div data-galat-form></div>
        <div class="form-section"><div class="form-section-head"><span class="no">1</span><h3>Identitas & Akun Google</h3></div>
          <div class="form-grid">
            <div class="field"><label class="label" for="u-nama">Nama lengkap<span class="wajib">*</span></label><input id="u-nama" name="nama" class="input" value="${u?.nama || ''}" autocomplete="off" autofocus><div class="err" hidden></div></div>
            <div class="field"><label class="label" for="u-email">Email Google<span class="wajib">*</span></label><input id="u-email" name="email" type="email" class="input" value="${u?.email || ''}" autocomplete="off" inputmode="email"><div class="err" hidden></div>
              <span class="help" data-email-help>${baru ? 'Email ini yang dipakai untuk "Masuk dengan Google".' : ''}</span></div>
            <div class="field"><label class="label" for="u-nip">NIP / Nomor Induk <span class="redup" style="font-weight:500">(opsional)</span></label><input id="u-nip" name="nip" class="input" value="${u?.nip || ''}" inputmode="numeric"></div>
            <div class="field"><label class="label" for="u-hp">Nomor HP / WhatsApp</label><input id="u-hp" name="no_hp" class="input" value="${u?.no_hp || ''}" inputmode="tel" placeholder="08…">
              <div class="help">Dipakai untuk kode masuk "Akun Kemensos" (dikirim lewat WhatsApp) dan notifikasi WhatsApp.</div></div>
          </div></div>
        <div class="form-section"><div class="form-section-head"><span class="no">2</span><h3>Jenis Akses</h3></div>
          <p class="help" style="margin:-4px 0 10px">Boleh memilih <b>Pegawai Direktorat dan Petugas Supermonev sekaligus</b>: seluruh Workspace tetap tampil, ditambah halaman Supermonev. Bila hanya Petugas Supermonev, yang tampil hanya halaman Supermonev. Petugas Bank berdiri sendiri.</p>
          <div class="pilihan" style="--kol:3">
            <label><input type="checkbox" name="akses_pegawai" ${u ? (u.jenis_akses === 'pegawai' ? raw('checked') : '') : raw('checked')}><span><b>Pegawai Direktorat</b><small>Menu Bersama dan Workspace sesuai Pokja</small></span></label>
            <label><input type="checkbox" name="akses_smv" ${u && (u.jenis_akses === 'petugas_supermonev' || u.juga_supermonev) ? raw('checked') : ''}><span><b>Petugas Supermonev</b><small>Formulir Supermonev; boleh dari luar Direktorat</small></span></label>
            <label><input type="checkbox" name="akses_bank" ${u?.jenis_akses === 'petugas_bank' ? raw('checked') : ''}><span><b>Petugas Bank</b><small>Hanya menu Burekol: isi rekening & kirim koreksi</small></span></label>
          </div></div>
        <div class="form-section" data-bag-pegawai><div class="form-section-head"><span class="no">3</span><h3>Peran Sistem</h3></div>
          <div class="pilihan" style="--kol:3">
            <label><input type="radio" name="peran_sistem" value="" ${!u?.peran_sistem ? raw('checked') : ''}><span><b>Tidak ada</b><small>Pegawai biasa (peran dari Pokja)</small></span></label>
            <label><input type="radio" name="peran_sistem" value="direktur" ${u?.peran_sistem === 'direktur' ? raw('checked') : ''}><span><b>Direktur</b><small>Melihat dashboard, rekap, dokumen</small></span></label>
            <label><input type="radio" name="peran_sistem" value="super_admin" ${u?.peran_sistem === 'super_admin' ? raw('checked') : ''} ${saPenuh ? raw('disabled') : ''}><span><b>Super Admin</b><small>${saPenuh ? 'Penuh: sudah 2 Super Admin aktif' : `Terpakai ${ringkas?.super_admin ?? '?'} dari 2`}</small></span></label>
          </div></div>
        <div class="form-section" data-bag-pegawai><div class="form-section-head"><span class="no">4</span><h3>Keanggotaan Pokja</h3><span class="spacer" style="flex:1"></span><small class="redup">Boleh lebih dari satu Pokja</small></div>
          <div style="display:grid;gap:8px">${pokja.map((p) => {
            const j = pk.get(p.id) || '';
            return html`<div style="display:flex;align-items:center;gap:12px;justify-content:space-between;flex-wrap:wrap;padding:6px 0;border-bottom:1px solid var(--garis-halus)">
              <span class="chip-pokja putih" style="${gayaPokja(p)}">${p.nama}</span>
              <div class="segmen" role="group" aria-label="Jabatan di Pokja ${p.nama}" data-pokja="${p.id}">
                <button type="button" data-j="" aria-pressed="${j === ''}">Tidak</button>
                <button type="button" data-j="anggota" aria-pressed="${j === 'anggota'}">Anggota</button>
                <button type="button" data-j="kapokja" aria-pressed="${j === 'kapokja'}">Kapokja</button></div></div>`;
          })}</div></div>
        <div class="form-section"><div class="form-section-head"><span class="no" data-no-akhir>5</span><h3>Status & Catatan</h3></div>
          <div class="form-grid">
            <label class="saklar penuh"><input type="checkbox" name="aktif" ${u?.aktif === false ? '' : raw('checked')} ${u && u.id === state.sesi?.pengguna?.id ? raw('disabled') : ''}><span>Akun aktif (boleh masuk)</span></label>
            <div class="field penuh"><label class="label" for="u-catatan">Catatan <span class="redup" style="font-weight:500">(opsional, hanya terlihat Super Admin)</span></label><textarea id="u-catatan" name="catatan" class="textarea" rows="2">${u?.catatan || ''}</textarea></div>
          </div></div>
      </form>`),
      kaki: String(html`<button type="button" class="btn btn-ghost" data-batal>Batal</button>
        <button type="button" class="btn btn-primary" data-simpan>${raw(ikon('check', 18))} ${baru ? 'Simpan Pengguna' : 'Simpan Perubahan'}</button>`),
    });
    const form = m.el.querySelector('[data-form]');
    // jenis_akses (basis data) dan penanda "juga Supermonev" dihitung dari tiga kotak centang
    const jenisForm = () => {
      const pg = form.akses_pegawai.checked, sm = form.akses_smv.checked, bk = form.akses_bank.checked;
      if (bk) return { jenis_akses: 'petugas_bank', juga_supermonev: false };
      if (pg) return { jenis_akses: 'pegawai', juga_supermonev: sm };
      if (sm) return { jenis_akses: 'petugas_supermonev', juga_supermonev: false };
      return null;
    };
    const aturJenis = () => {
      const j = jenisForm(), tanpaPokja = !j || j.jenis_akses !== 'pegawai';
      form.querySelectorAll('[data-bag-pegawai]').forEach((x) => { x.hidden = tanpaPokja; });
      m.el.querySelector('[data-no-akhir]').textContent = tanpaPokja ? '3' : '5';
    };
    form.addEventListener('change', (e) => {
      if (e.target.name === 'akses_bank' && e.target.checked) { form.akses_pegawai.checked = false; form.akses_smv.checked = false; }
      if (['akses_pegawai', 'akses_smv'].includes(e.target.name) && e.target.checked) form.akses_bank.checked = false;
      if (e.target.name?.startsWith('akses_')) aturJenis();
    });
    form.addEventListener('click', (e) => {
      const b = e.target.closest('.segmen button');
      if (!b) return;
      b.parentElement.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    });
    if (!baru && u.auth_id) {
      form.email.addEventListener('input', () => {
        m.el.querySelector('[data-email-help]').innerHTML = form.email.value.trim().toLowerCase() !== u.email
          ? String(html`<span style="color:var(--emas-teks2)">${raw(ikon('alert', 14))} Mengganti email memutus tautan akun Google lama. Pengguna masuk dengan email baru.</span>`) : '';
      });
    }
    aturJenis();

    const salahkan = (nama, pesan) => {
      const fld = form[nama].closest('.field'); fld.classList.add('salah');
      const err = fld.querySelector('.err'); err.hidden = false; err.innerHTML = String(html`${raw(ikon('alert', 14))} ${pesan}`);
    };
    m.foot.querySelector('[data-simpan]').addEventListener('click', async (e) => {
      form.querySelectorAll('.field.salah').forEach((x) => { x.classList.remove('salah'); const er = x.querySelector('.err'); if (er) er.hidden = true; });
      m.el.querySelector('[data-galat-form]').innerHTML = '';
      const jf = jenisForm();
      if (!jf) { m.el.querySelector('[data-galat-form]').innerHTML = String(kotakGalat('Pilih minimal satu jenis akses.')); return; }
      const data = {
        id: u?.id || null, nama: form.nama.value.trim(), email: form.email.value.trim().toLowerCase(),
        nip: form.nip.value.trim(), no_hp: form.no_hp.value.trim(), jenis_akses: jf.jenis_akses, juga_supermonev: jf.juga_supermonev,
        peran_sistem: jf.jenis_akses !== 'pegawai' ? null : (form.peran_sistem.value || null),
        aktif: form.aktif.checked, catatan: form.catatan.value.trim(),
        pokja: jf.jenis_akses !== 'pegawai' ? [] : [...form.querySelectorAll('.segmen')]
          .map((s) => ({ pokja_id: s.dataset.pokja, jabatan: s.querySelector('[aria-pressed="true"]')?.dataset.j || '' })).filter((x) => x.jabatan),
      };
      let ok = true;
      if (!data.nama) { salahkan('nama', 'Nama wajib diisi.'); ok = false; }
      if (!data.email) { salahkan('email', 'Email wajib diisi.'); ok = false; }
      else if (!emailValid(data.email)) { salahkan('email', 'Format email tidak valid.'); ok = false; }
      if (!ok) return form.querySelector('.field.salah input')?.focus();

      const pulih = tombolMuat(e.currentTarget);
      try {
        await api.simpanPengguna(data);
        hapusCache('pengguna');
        toast(baru ? `${data.nama} ditambahkan. Email ini sekarang dapat masuk dengan Google.` : `Data ${data.nama} diperbarui.`, 'sukses');
        m.tutup();
        if (data.id && data.id === state.sesi?.pengguna?.id) segarkanSesi?.();
        muatKpi(true); muatTabel(true);
      } catch (err) {
        pulih();
        const pesan = pesanGalat(err);
        if (/email/i.test(pesan)) salahkan('email', pesan);
        m.el.querySelector('[data-galat-form]').innerHTML = String(html`<div class="galat" style="margin-bottom:16px">${raw(ikon('alert', 20))}<span>${pesan}</span></div>`);
        m.body.scrollTop = 0;
      }
    });
  }

  async function ubahStatus(id, aktif) {
    const u = (tabel._baris || []).find((x) => x.id === id);
    if (!u) return;
    const j = await konfirmasi(aktif
      ? { judul: 'Aktifkan akun?', pesan: `${u.nama} (${u.email}) akan dapat masuk kembali dengan Google.`, label: 'Aktifkan', ikonNama: 'user-check' }
      : { judul: 'Nonaktifkan akun?', pesan: `${u.nama} (${u.email}) tidak akan bisa masuk dan seluruh data langsung tertutup baginya. Riwayatnya tetap tersimpan.`,
          label: 'Nonaktifkan', bahaya: true, ikonNama: 'user-x', alasan: { label: 'Alasan penonaktifan', wajib: true, placeholder: 'Contoh: pindah tugas, pensiun, akun ganda' } });
    if (!j.ok) return;
    try {
      await api.aturStatusPengguna(id, aktif, j.alasan || null);
      hapusCache('pengguna');
      toast(aktif ? `${u.nama} diaktifkan kembali.` : `${u.nama} dinonaktifkan.`, 'sukses');
      muatKpi(true); muatTabel(true);
    } catch (e) { toast(pesanGalat(e), 'galat'); }
  }

  // ---------------------------------------------------------------- interaksi
  const saring = () => { hal = 1; muatTabel(); };
  $('#f-q').addEventListener('input', debounce((e) => { f.q = e.target.value; saring(); }, 300));
  ['pokja', 'peran', 'status'].forEach((k) => $('#f-' + k).addEventListener('change', (e) => { f[k] = e.target.value; saring(); }));
  $('#f-status').value = f.status;

  el.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.matches('[data-tambah]')) return bukaForm();
    if (t.matches('[data-reset]')) {
      Object.assign(f, { q: '', pokja: '', peran: '', status: 'aktif' });
      $('#f-q').value = ''; $('#f-pokja').value = ''; $('#f-peran').value = ''; $('#f-status').value = 'aktif';
      return saring();
    }
    if (t.matches('[data-ulang]')) return muatTabel(true);
    if (t.matches('[data-hal]')) { hal = Number(t.dataset.hal); muatTabel(); return el.querySelector('.table-card').scrollIntoView({ block: 'start' }); }
    if (t.matches('[data-ubah]')) return bukaForm((tabel._baris || []).find((x) => x.id === t.dataset.ubah));
    if (t.matches('[data-nonaktif]')) return ubahStatus(t.dataset.nonaktif, false);
    if (t.matches('[data-aktifkan]')) return ubahStatus(t.dataset.aktifkan, true);
  });

  await Promise.all([muatPokja(), muatKpi(), muatTabel()]);
}
