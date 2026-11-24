# SITASI TSKPO

**Sistem Integrasi Data dan Informasi TSKPO** — portal internal Direktorat Rehabilitasi Sosial Tuna Sosial dan Korban Perdagangan Orang, Kementerian Sosial RI.

Versi **2.3.0 · Tahap 1 (Fondasi) + Tahap 2 (BNBA & Alur Pencairan 11 Tahap) + Tahap 3 (Dashboard & Data Pendukung) + Tahap 4 (Dokumen & Koordinasi)**, sesuai PRD Final v2.2 dan Design System v4.

## Arsitektur

```
Browser (HTML/CSS/JS, tanpa build)  ──baca (dibatasi RLS)──►  Supabase PostgreSQL
  dihosting GitHub Pages            ──tulis lewat RPC─────►  (fungsi SECURITY DEFINER memeriksa peran)
                                    ◄──realtime────────────  notifikasi, pengumuman, status akun, usulan
                                    ──login Google (PKCE)──►  Supabase Auth + daftar izin (tabel pengguna)
        │ berkas, baca Sheets
        └──fetch POST text/plain──►  Google Apps Script (Web App, akun Super Admin)
                                       ├─ Google Drive Super Admin: KTP, surat, Draft SK, Nota Dinas, SK final, foto
                                       ├─ pemicu 1 menit: antrean notifikasi → WhatsApp (Fonnte) + email (Gmail)
                                       └─ baca Google Sheets lama (migrasi)
                                     Hak akses selalu diperiksa basis data memakai token login pengguna.
```

- **Tanpa server sendiri dan tanpa langkah build.** Cukup file statis.
- **Keamanan di basis data:** Row Level Security di setiap tabel; browser tidak dapat menulis langsung ke tabel. Semua perubahan lewat fungsi RPC yang memeriksa peran efektif, dan setiap perubahan dicatat trigger audit.
- **Cepat (gas-instant-ux-pro):** halaman dimuat sesuai kebutuhan dan dipra-muat saat menu diarahkan; sesi dan data referensi disimpan sementara sehingga tampilan langsung muncul; data memakai cache *stale-while-revalidate* yang hanya menggambar ulang bila isinya berubah; paginasi di server (50 baris); batas waktu + coba ulang otomatis untuk jaringan seluler; permintaan tulis ke Apps Script membawa `reqId` sehingga coba ulang tidak membuat data ganda; deteksi offline; telemetri `window.SITASI_PERF` di konsol.
- **Notifikasi tanpa menahan layar:** perpindahan tahap menulis notifikasi in-app dan antrean WA/email dalam satu transaksi; pengiriman dilakukan pemicu Apps Script tiap 1 menit (maks. 3 percobaan). Pesan tidak memuat NIK, rekening, atau data pribadi PM.

## Struktur folder

```
index.html              halaman tunggal (SPA, router hash #/…)
privasi.html            Kebijakan Privasi (syarat Google untuk tombol Masuk dengan Google)
ketentuan.html          Ketentuan Layanan
css/style.css           Design System v4: token warna, komponen, shell, gerak, responsif
css/tahap2.css          komponen Tahap 2: stepper 11 tahap, editor BNBA, antrean, rekap, berkas
css/landing.css         W-00 Halaman Depan
js/config.js            ← isi SUPABASE_URL, kunci publik, dan GAS_URL di sini
js/app.js               titik masuk & router
js/shell.js             sidebar, top bar, lonceng, pengumuman, nav bawah ponsel
js/core/                api, adapter Supabase, adapter pratinjau, cache, ikon, menu, peran, UI
js/pages/               satu file per halaman
assets/                 favicon; letakkan logo & foto gedung resmi (lihat PETUNJUK-ASET.txt)
```

## Halaman Tahap 1

| Rute | Halaman | Akses |
|---|---|---|
| `#/` | W-00 Halaman Depan | Publik |
| `#/masuk` | W-01 Masuk dengan Google | Publik |
| `#/akses-ditolak` | W-02 Akses Ditolak | Publik |
| `#/pilih-peran` | W-01C Pilih Peran (simulasi) | Super Admin |
| laci "Ganti Peran" | W-01B | Super Admin |
| `#/beranda` | Beranda (sesi, notifikasi, peta jalan) | Pegawai |
| `#/notifikasi` | Notifikasi in-app | Semua |
| `#/pengaturan/pengguna` | Pengguna & Hak Akses (allowlist) | Super Admin |
| `#/pengaturan/pokja` | Pokja & Keanggotaan | Super Admin |
| `#/pengaturan/pengumuman` | Kelola Pengumuman | Super Admin, Pokja TU |
| `#/pengaturan/log-aktivitas` | Log Aktivitas & Audit | Super Admin |

## Halaman Tahap 2

| Rute | Halaman | Akses |
|---|---|---|
| `#/workspace-bnba` | Pengajuan BNBA per Pokja (daftar usulan, template, impor Excel) | Anggota & Kapokja Pokja, Super Admin |
| `#/workspace-bnba/usulan?id=…` | Formulir usulan: 40 kolom BNBA per PM + data ekonomi awal, submit 1 bundel | Pokja pemilik |
| `#/antrean-verifikasi` | Antrean Verifikasi Kapokja (setujui / kembalikan dengan catatan) | Kapokja, Super Admin |
| `#/usulan-sk` | Usulan & SK Pokja — monitoring 11 tahap | Pegawai |
| `#/tata-usaha` · `#/keuangan` | Workspace TU (4a, 4b, 4c, 6) dan Keuangan (5, 7–11) | Pokja TU / Keuangan, Super Admin |
| `#/usulan/<id>` | Detail Usulan: stepper 11 tahap, panel aksi tahap, berkas, data pencairan, log penyalur, riwayat | Pegawai (aksi sesuai peran) |
| `#/rekap-pencairan` · `#/keuangan/koreksi-rekap` | Rekap Data Pencairan (DATA ATENSI) dan koreksi beralasan | Pegawai / Keuangan |
| `#/master-bnba` · `#/pm/<nik>` | Master BNBA lintas Pokja dan Detail PM | Pegawai (data sensitif tersamar sesuai hak) |
| `#/rekonsiliasi` | Rekonsiliasi Pencairan + diagram alur per usulan | Pegawai |
| `#/pengaturan/notifikasi` | Saklar WA/email, token Fonnte, matriks kejadian, uji kirim, antrean | Super Admin |
| `#/pengaturan/migrasi` | Migrasi Data 2026 dari Excel/CSV atau Google Sheets (uji coba dulu) | Super Admin |

## Halaman Tahap 3 & 4 (v2.3.0)

| Rute | Halaman | Akses · unggah langsung |
|---|---|---|
| `#/` | Dashboard Realisasi Bantuan: KPI, peta 38 provinsi 3D (GeoJSON asli), kolom 3D per klaster/bulan/Pokja, donat, progres Pokja | Pegawai |
| `#/data-lks` · `#/input-lks` | Data LKS (rekap resmi) dan Input LKS (formulir, impor FORMAT LKS.xlsx, verifikasi Kapokja Data/TU) | Pegawai · semua Pokja · **3 foto LKS + 4 jenis berkas** |
| `#/data-aster` · `#/input-aster` | Data Aster (peta target/pendamping) dan Input Aster (26 kolom, impor, verifikasi massal) | Pegawai · Pokja Data |
| `#/data-kepegawaian` · `#/kelola-kepegawaian` | Pegawai pusat, SDM pendamping (peta), OJT | Pegawai · Pokja Kepegawaian/TU · **berkas OJT** |
| `#/jadwal-pegawai` | Kisi jadwal bulanan Perjadin/Fullday/Fullboard, hari libur, rekap, realtime | Pegawai (diri sendiri) · TU (semua) |
| `#/rencana-kerja` | Rencana kerja tahunan per Pokja → verifikasi Pokja Perencanaan | Pegawai · **lampiran TOR/RAB** |
| `#/dokumen-pokja` | Repositori Pokja: folder, seret & lepas banyak berkas, tautan, ajukan publikasi | Anggota Pokja · **unggah dokumen & foto** |
| `#/dokumen-bersama` | 6 kategori, antrean publikasi TU, "Unggah & Ajukan" langsung | Pegawai · **unggah & ajukan** |
| `#/produk-hukum` | Produk hukum & SOP | Pegawai · Pokja Hukum **unggah berkas** |
| `#/tugas` | Tugas & penugasan (Kapokja → anggota, TU → semua, pribadi) | Pegawai |
| `#/pesan` | Chat Pokja, Koordinasi Lintas-Pokja, pesan pribadi, diskusi data; realtime; NIK ditolak | Pegawai |
| `#/usulan/<id>` · `#/pm/<nik>` | Tab **Dokumentasi PM** (Sebelum Usaha, Saat Penyaluran, Supermonev; maks 2 foto ≤ 500 KB) dan tab **Diskusi** | Sesuai kewenangan · **unggah foto** |

Efek visual: kartu KPI miring 3D mengikuti kursor, peta miring 3D dengan tebal, kolom 3D, ornamen cincin 3D, latar berpendar (aurora, kisi bergerak), teks/kartu muncul saat digulir. Semua gerak mati otomatis bila "kurangi gerakan" aktif di perangkat.

## Skema basis data (Tahap 1)

| Tabel | Isi |
|---|---|
| `pokja` | 11 Pokja beserta warna khasnya |
| `pengguna` | Akun sekaligus daftar izin login (email, peran sistem, jenis akses, aktif, simulasi peran) |
| `pengguna_pokja` | Keanggotaan Pokja (kapokja / anggota); satu orang boleh di beberapa Pokja |
| `audit_log` | Jejak semua perubahan, login, ganti peran, ekspor; tidak dapat diubah/dihapus |
| `notifikasi` | Notifikasi in-app per pengguna (realtime) |
| `pengumuman` | Pengumuman di atas setiap halaman |
| `pengaturan` | Pengaturan sistem (kunci–nilai) |

### Tambahan Tahap 2

Keduanya dipasang dari **satu file** `SETUP_SUPABASE.sql` (gabungan Tahap 1 + Tahap 2, aman dijalankan ulang).

| Tabel / view | Isi |
|---|---|
| `usulan` | Bundel usulan per Pokja (nomor register `USL-<POKJA>-YYYYMM-0001`, status, tahap aktif, SK) |
| `bnba` | Central Database BNBA: 40 kolom + data ekonomi awal; NIK unik; kolom sensitif punya versi tersamar |
| `usulan_tahap` | 13 baris per usulan (1, 2, 3, 4a, 4b, 4c, 5–11) dengan status, isian, PIC, waktu |
| `usulan_riwayat`, `penyaluran_log`, `berkas`, `rekap_koreksi`, `antrian_notif` | Jejak tahap (tidak dapat diubah), log petugas penyalur, berkas Drive/tautan, koreksi rekap beralasan, antrean WA/email |
| `provinsi`, `ref_klaster` | 38 provinsi dan 9 klaster PPKS |
| `usulan_v`, `rekap_pencairan_v` | Ringkasan usulan dan rekap DATA ATENSI (dihitung otomatis dari BNBA) |

Aturan penting yang dijaga **di basis data**: maksimal 2 Super Admin aktif, minimal 1 Super Admin aktif, email unik (huruf kecil), petugas Supermonev tanpa peran sistem/Pokja, mengganti email memutus tautan akun Google lama, dan alasan wajib saat menonaktifkan akun.

Aturan Tahap 2 di basis data: tahap hanya bisa diisi peran yang berwenang (1/3 Pokja pemilik, 2 Kapokja, 4a/4b TU, 4c/6 TU atau Pokja pemilik, 5 dan 7–11 Keuangan, Super Admin semua); tahap tidak bisa diselesaikan bila berkas/isian wajib belum ada; usulan terkunci setelah disubmit; tolak wajib beralasan dan usulan diajukan ulang sebagai usulan baru; satu NIK hanya satu kali; ekspor dan pembukaan data sensitif dicatat di log.

## Mode Pratinjau

Bila `js/config.js` masih kosong, aplikasi berjalan dengan data contoh di browser (sessionStorage) dan pemilih akun contoh untuk mencoba setiap peran. Nama selain lima akun awal PRD adalah fiktif.

## Menjalankan di komputer sendiri

```bash
cd sitasi-tskpo
python -m http.server 8080
# buka http://localhost:8080
```
Untuk login Google lokal, tambahkan `http://localhost:8080/` ke *Redirect URLs* di Supabase.

## Akun awal

| Email | Peran |
|---|---|
| asterpokjadata@gmail.com | Super Admin 1 |
| muhni2806@gmail.com | Kapokja TU |
| viniciherla@gmail.com | Anggota Pokja TU |
| dhenyindahniati@gmail.com | Kapokja Supermonev |
| ardevia28@gmail.com | Kapokja Kepegawaian |

## Uji otomatis (dijalankan sebelum serah terima)

- SQL (Postgres lokal + tiruan Supabase): 65 cek Tahap 1 + 92 cek Tahap 2; `SETUP_SUPABASE.sql` dijalankan 2× (pertama sebagai satu transaksi seperti SQL Editor, kedua di atas data yang ada).
- Apps Script (`uji_gas.cjs`, tiruan layanan Google): 26 cek — autentikasi, token tersamar, batch Fonnte + cadangan, email, unggah/unduh/hapus Drive dengan izin dari basis data, idempotensi unggah.
- Browser (Playwright, mode pratinjau): alur lintas peran (anggota → Kapokja → Super Admin → TU/Keuangan/Direktur), seluruh rute, desktop 1440, tablet 1024, ponsel 390.
- Tahap 3 & 4: 88 cek SQL (`40_uji_tahap34.sql`), 45 cek fungsi pratinjau (`uji_pratinjau_t34.mjs`), 36 cek browser (`uji_tahap34.mjs`: unggah foto 4 MB → ≤ 500 KB, unggah banyak dokumen, jadwal, pesan, verifikasi lintas peran, ponsel, kurangi gerakan).

## Instalasi

Lihat **PANDUAN-INSTALASI.md**.

## Tahapan berikutnya (PRD 8)

5. Supermonev · 6. Integrasi & penyempurnaan.

© Direktorat Rehabilitasi Sosial Tuna Sosial dan Korban Perdagangan Orang, Kementerian Sosial RI
