# Panduan Instalasi SITASI TSKPO (versi 2.1.0: Tahap 1 Fondasi + Tahap 2 BNBA & Alur Pencairan)

Panduan ini untuk pemula. Ikuti **berurutan** dan jangan melompat. Setiap langkah punya tanda **✅ Berhasil jika…** supaya Anda tahu kapan boleh lanjut.

## Gambaran singkat

SITASI terdiri dari 4 bagian. **Setiap bagian dipasang sekali saja.** Urutan di panduan ini sudah diatur supaya situs cukup **dikirim ke GitHub satu kali**.

| # | Bagian | Tempat | File dari paket | Dipasang |
|---|---|---|---|---|
| 1 | Basis data & login | **Supabase** | `SETUP_SUPABASE.sql` (satu file) | 1× |
| 2 | Berkas Google Drive, WhatsApp, email, baca Google Sheets | **Google Apps Script** (akun Super Admin) | `Kode.gs`, `appsscript.json` | 1× |
| 3 | Tombol "Masuk dengan Google" | **Google Cloud** (gratis) | halaman `privasi.html` & `ketentuan.html` (sudah ada di ZIP) | 1× |
| 4 | Tampilan web (semua halaman/layar) | **GitHub Pages** (gratis) | isi `sitasi-tskpo.zip` | 1× |

**Urutan kerja:** Persiapan (0) → Supabase (1) → Apps Script (2) → Login Google (3) → Isi `config.js` (4) → Kirim ke GitHub (5) → Masuk pertama & pengaturan (6) → Migrasi data (7) → Uji (8).

Perkiraan waktu pertama kali: **1,5–2 jam**. Siapkan **Notepad** untuk mencatat alamat dan kunci selama pemasangan.

> **Akun yang dipakai:** gunakan akun Super Admin **asterpokjadata@gmail.com** untuk Supabase, Apps Script, dan Google Cloud, supaya semua aset dimiliki akun Direktorat, bukan akun pribadi. Berkas (KTP, surat, foto) akan tersimpan di Google Drive akun ini.

> **Sudah pernah memasang sebagian?** Tidak apa-apa. Ulangi saja dari awal dengan paket ini. File SQL aman dijalankan ulang (data tidak hilang), dan Apps Script cukup ditempel ulang.

---

## 0. Persiapan: tentukan alamat situs dulu

Alamat situs dibutuhkan di langkah 1–3, jadi kita buat repository kosong lebih dulu. **Belum ada file yang dikirim di sini.**

### 0a. Pasang Git (sekali saja per komputer)
- **Windows:** unduh di https://git-scm.com/download/win, pasang dengan pengaturan bawaan (klik *Next* terus).
- **Mac:** buka *Terminal*, ketik `git --version`. Bila belum ada, macOS menawarkan pemasangan otomatis.

Buka **PowerShell** (Windows) atau **Terminal** (Mac), lalu periksa:
```bash
git --version
```
✅ Berhasil jika muncul tulisan seperti `git version 2.4x.x`.

Kenalkan diri ke Git (sekali saja per komputer):
```bash
git config --global user.name "Nama Anda"
git config --global user.email "email-akun-github@contoh.com"
```

### 0b. Buat akun GitHub dan repository kosong
1. Daftar di https://github.com bila belum punya. **Username** menjadi bagian alamat situs.
2. Klik **+** (kanan atas) → **New repository**.
3. **Repository name:** `sitasi-tskpo` · pilih **Public** · **jangan** centang *README*, *.gitignore*, atau *license* → **Create repository**.

📌 **Catat di Notepad** (ganti `USERNAME` dengan username GitHub Anda):
- Alamat situs: `https://USERNAME.github.io/sitasi-tskpo/`
- Domain situs: `USERNAME.github.io`

> **Aman bila Public?** Ya. Repository hanya berisi tampilan dan **kunci publik** Supabase. Data penerima manfaat ada di Supabase dan dijaga aturan hak akses. Kunci rahasia tidak pernah masuk ke folder ini.

---

## 1. Basis data Supabase

### 1a. Buat proyek
1. Buka https://supabase.com → **Sign in** (pakai akun Google Super Admin).
2. **New project** → *Name:* `sitasi-tskpo` → buat **Database Password** yang kuat lalu simpan baik-baik → *Region:* **Southeast Asia (Singapore)** → **Create new project**.
3. Tunggu ±2 menit sampai proyek siap.

> Region Singapura adalah yang terdekat dengan Indonesia. Ini yang membuat halaman terasa cepat.

### 1b. Jalankan satu file SQL
1. Menu kiri → **SQL Editor** → **New query**.
2. Buka `SETUP_SUPABASE.sql` dengan Notepad → **Ctrl+A** → salin → tempel di SQL Editor.
3. Klik **Run** (atau Ctrl+Enter). Bila muncul peringatan *destructive operation*, pilih **Run this query** (file ini tidak menghapus data).

✅ Berhasil jika di bagian **Results** muncul satu baris: `✅ SETUP SITASI TSKPO SELESAI` dengan angka **11** Pokja, **5** pengguna, **1** Super Admin aktif, **38** provinsi.

### 1c. Catat tiga nilai
| Nilai | Letak di Supabase | Dipakai di |
|---|---|---|
| **Project URL** (`https://abcdefghij.supabase.co`) | Project Settings → **Data API** | config.js, Apps Script, Google Cloud |
| **Publishable key** (`sb_publishable_…`) | Project Settings → **API Keys**. Bila tidak ada, tab *Legacy API Keys* → **anon public** | config.js, Apps Script |
| **Secret key** (`sb_secret_…`) | Project Settings → **API Keys** → **Secret keys** → buat/salin. Atau *service_role* di tab Legacy | **Hanya** Apps Script |

📌 Kode proyek (`abcdefghij`) adalah bagian depan Project URL. Catat juga: `abcdefghij.supabase.co`.

> 🔒 **Secret key tidak boleh** ditaruh di `config.js`, GitHub, Google Sheets, atau grup chat.

---

## 2. Google Apps Script (berkas Drive, WhatsApp, email, migrasi Sheets)

Apps Script bekerja atas nama akun Super Admin: menyimpan berkas (KTP, surat, Draft SK, foto) di **Google Drive Super Admin**, mengirim notifikasi WhatsApp (Fonnte) dan email, serta membaca Google Sheets lama untuk migrasi. Hak akses tetap diperiksa basis data: sebelum berkas disimpan atau dibuka, Supabase memeriksa peran, Pokja, dan tahap pengguna.

### 2a. Buat proyek dan tempel kode
1. Buka https://script.google.com dengan **asterpokjadata@gmail.com** → **New project**.
2. Klik judul *Untitled project* → ganti menjadi `SITASI TSKPO Backend`.
3. Di file `Code.gs`, hapus seluruh isinya, tempel **seluruh isi `Kode.gs`** → **Save** (ikon disket).
4. Klik ikon roda gigi **Project Settings** (kiri) → centang **Show "appsscript.json" manifest file in editor**.
5. Kembali ke **Editor** (ikon `< >`), buka `appsscript.json`, ganti seluruh isinya dengan isi `appsscript.json` dari paket → **Save**.

### 2b. Isi Script Properties (tempat rahasia)
**Project Settings** → gulir ke **Script Properties** → **Add script property**:

| Property | Nilai |
|---|---|
| `SUPABASE_URL` | Project URL (1c) |
| `SUPABASE_ANON_KEY` | Publishable key (1c) |
| `SUPABASE_SERVICE_KEY` | Secret key (1c) |
| `FONNTE_TOKEN` | Boleh dikosongkan. Bisa diisi nanti dari web (langkah 6) |

Klik **Save script properties**.

### 2c. Jalankan pemasangan sekali
1. Di Editor, pilih fungsi **`pasangSITASI`** pada menu tarik-turun di atas → **Run**.
2. Muncul *Authorization required* → **Review permissions** → pilih akun Super Admin → **Advanced** → **Go to SITASI TSKPO Backend (unsafe)** → **Allow**. Peringatan ini wajar untuk skrip buatan sendiri dan hanya muncul sekali.
3. Lihat **Execution log** di bawah.

✅ Berhasil jika log berisi `✅ Pemicu notifikasi tiap 1 menit terpasang`, alamat folder Drive `SITASI TSKPO`, dan `✅ Tersambung ke Supabase`.
❌ Bila tertulis `Gagal tersambung ke Supabase`, periksa ejaan tiga property Supabase di 2b.

### 2d. Terbitkan sebagai Web App
1. Kanan atas **Deploy** → **New deployment** → ikon roda gigi → **Web app**.
2. *Execute as:* **Me (asterpokjadata@gmail.com)** · *Who has access:* **Anyone** → **Deploy**.
3. 📌 Salin **Web app URL** (berakhiran `/exec`) ke Notepad.

> *Anyone* aman: setiap permintaan wajib membawa token login pengguna, dan basis data yang memutuskan boleh atau tidaknya.

---

## 3. Tombol "Masuk dengan Google" (Google Cloud, gratis)

Google Cloud di sini hanya halaman pengaturan di akun Google yang sama. Tidak ada tagihan dan tidak perlu kartu kredit. Bila muncul tawaran *Free trial* / *Activate*, **abaikan**.

> **Sudah sempat membuat proyek "SITASI" saat mencoba Edge Function?** Pakai proyek itu, tidak perlu membuat baru. Google Drive API yang sudah aktif tidak mengganggu. Bila sempat membuat client "SITASI Drive", boleh dihapus.

### 3a. Proyek dan Branding
1. Buka https://console.cloud.google.com dengan akun Super Admin. Bila belum ada proyek: pemilih proyek (kiri atas) → **New Project** → nama `SITASI` → **Create**, lalu pastikan proyek itu terpilih.
2. Menu ☰ → **Google Auth Platform** (dulu *OAuth consent screen*). Bila diminta, klik **Get started**: *App name* `SITASI TSKPO`, *User support email* email Super Admin, *Audience* **External**, *Contact information* email Super Admin → setujui → **Create**.
3. Buka **Branding**, isi:

| Kolom | Isi |
|---|---|
| App name | `SITASI TSKPO` |
| User support email | asterpokjadata@gmail.com |
| App logo | **Kosongkan.** Logo membuat Google mewajibkan verifikasi |
| Application home page | `https://USERNAME.github.io/sitasi-tskpo/` |
| Application privacy policy link | `https://USERNAME.github.io/sitasi-tskpo/privasi.html` |
| Application terms of service link | `https://USERNAME.github.io/sitasi-tskpo/ketentuan.html` |
| Authorized domains → **Add domain** (2 kali) | `USERNAME.github.io` dan `abcdefghij.supabase.co` |
| Developer contact information | asterpokjadata@gmail.com |

4. Klik **Save**. Jangan biarkan baris *Authorized domains* yang kosong: hapus dengan ikon tempat sampah, karena baris kosong membuat Save gagal (*Invalid domain: must not be empty*).

> Halaman `privasi.html` dan `ketentuan.html` sudah ada di paket. Isinya bisa disesuaikan setelah ditinjau Pokja Hukum.

### 3b. Buat Client ID dan Client Secret
1. **Clients** → **Create client**.
2. *Application type:* **Web application** · *Name:* `SITASI TSKPO Login`.
3. *Authorized JavaScript origins* → **Add URI** → `https://USERNAME.github.io`
4. *Authorized redirect URIs* → **Add URI** → `https://abcdefghij.supabase.co/auth/v1/callback` (Project URL Anda + `/auth/v1/callback`).
5. **Create** → 📌 salin **Client ID** dan **Client secret** ke Notepad.

### 3c. Aktifkan Google di Supabase
1. Supabase → **Authentication** → **Sign In / Providers** → **Google** → aktifkan **Enable Sign in with Google**.
2. Tempel **Client ID** dan **Client Secret** → **Save**.
3. **Authentication** → **URL Configuration**:
   - *Site URL:* `https://USERNAME.github.io/sitasi-tskpo/`
   - *Redirect URLs* → **Add URL** → `https://USERNAME.github.io/sitasi-tskpo/` → **Save**

Alamat harus **persis sama**, termasuk garis miring `/` di akhir.

**Publish app** dilakukan di langkah 5d, setelah situs aktif.

---

## 4. Isi `js/config.js` (sekali, sebelum dikirim)

1. Ekstrak `sitasi-tskpo.zip`. Hasilnya folder **`sitasi-tskpo`**.
2. Buka `sitasi-tskpo/js/config.js` dengan Notepad, isi tiga baris ini (di antara tanda kutip):
```js
SUPABASE_URL: 'https://abcdefghij.supabase.co',
SUPABASE_ANON_KEY: 'sb_publishable_xxxxxxxx',
GAS_URL: 'https://script.google.com/macros/s/XXXX/exec',
```
3. **Save**.

| Kunci | Boleh di config.js? |
|---|---|
| Project URL, Publishable/anon key, Web app URL Apps Script | ✅ Ya (memang untuk browser) |
| Secret key / service_role, token Fonnte, Client secret Google | ❌ **Tidak pernah** |

(Opsional) Letakkan logo dan foto gedung resmi di folder `assets/`. Lihat `assets/PETUNJUK-ASET.txt`.

---

## 5. Kirim ke GitHub (sekali) dan aktifkan situs

### 5a. Masuk ke folder yang BENAR (langkah paling penting)
1. Buka folder `sitasi-tskpo` di File Explorer, klik kolom alamat di atas, ketik `powershell`, lalu Enter. PowerShell terbuka tepat di folder itu.
2. Periksa isinya:
```powershell
dir
```
✅ Berhasil jika yang terlihat **langsung** `index.html`, `privasi.html`, `ketentuan.html`, `css`, `js`, `assets`.
❌ Jika yang terlihat hanya satu folder `sitasi-tskpo`, masuk dulu: `cd sitasi-tskpo`, lalu `dir` lagi. **Jangan lanjut sebelum `index.html` terlihat.**

> `SETUP_SUPABASE.sql`, `Kode.gs`, dan `appsscript.json` sengaja **tidak** ada di folder ini dan tidak diunggah ke GitHub.

### 5b. Kirim (jalankan satu per satu)
```bash
git init
git add .
git commit -m "SITASI TSKPO 2.1.0"
git branch -M main
git remote add origin https://github.com/USERNAME/sitasi-tskpo.git
git push -u origin main
```
- Perhatikan **titik** di akhir `git add .`
- Saat `git push` meminta **Password**, masukkan **Personal Access Token**, bukan kata sandi GitHub: https://github.com/settings/tokens → **Generate new token (classic)** → *Note* `sitasi`, *Expiration* 90 days, centang **repo** → **Generate** → salin `ghp_…`. Saat menempel token, layar **tidak menampilkan apa pun**. Itu normal, tekan Enter saja.

✅ Berhasil jika muncul `Writing objects: 100%` dan `* [new branch] main -> main`.

Kalau terminal terasa sulit, pakai **GitHub Desktop** (https://desktop.github.com): *Add Local Repository* → pilih folder `sitasi-tskpo` → *Publish repository*.

### 5c. Aktifkan GitHub Pages
Repository → **Settings** → **Pages** → *Source:* **Deploy from a branch** · *Branch:* `main` dan `/ (root)` → **Save** → centang **Enforce HTTPS**.

Tunggu 1–2 menit, muat ulang. ✅ Berhasil jika tertulis *Your site is live at `https://USERNAME.github.io/sitasi-tskpo/`*, dan alamat `…/privasi.html` bisa dibuka.

### 5d. Publish aplikasi Google
Google Cloud → **Google Auth Platform** → **Audience** → **Publish app** → **Confirm**. Bila muncul tawaran *Submit for verification*, tutup saja: aplikasi ini hanya meminta nama, email, dan foto profil, jadi tidak perlu verifikasi.

✅ Berhasil jika *Publishing status* menjadi **In production**.

❌ Tombol **Publish app** masih abu-abu? Periksa lagi 3a: logo kosong, ketiga tautan terisi, kedua domain ada, lalu **Save**, dan muat ulang halaman Audience. Bila tetap tidak bisa, jalan sementara: **Audience → Test users → Add users**, lalu masukkan email setiap pegawai (maks. 100). Login tetap berfungsi untuk email tersebut, tetapi Google menampilkan layar peringatan "belum diverifikasi" yang bisa dilewati dengan **Continue**. Kirim tangkapan layarnya agar bisa dicarikan jalan keluar.

---

## 6. Masuk pertama dan pengaturan

1. Buka situs → **Masuk** → **Masuk dengan Google** → pilih **asterpokjadata@gmail.com**.
   ✅ Berhasil jika muncul halaman **Pilih Peran**, lalu Beranda.
2. **Pengaturan → Pengguna & Hak Akses:** periksa 5 akun awal (namanya masih sementara), tambahkan pegawai lain beserta Pokja-nya, dan isi **No. HP** untuk Kapokja, TU, dan Keuangan agar WhatsApp sampai.
3. **Pengaturan → Notifikasi WA & Email:**
   1. Isi **Alamat web SITASI** (alamat situs Anda) → **Simpan**.
   2. Tempel **token Fonnte** → **Simpan Token** (tersimpan di Script Properties, tampil tersamar).
   3. Nyalakan saklar **WhatsApp** dan/atau **Email**, atur **Matriks Kejadian** bila perlu.
   4. **Uji Kirim** ke nomor/email Anda → tunggu ≤ 1 menit (atau klik **Proses antrean sekarang**).

Pesan WA/email **tidak** memuat NIK, rekening, atau data pribadi PM. Isinya hanya nomor register, judul usulan, tahap, dan tautan.

---

## 7. Migrasi data BNBA 2026 (sekali, sebelum dipakai)

Menu **Pengaturan → Migrasi Data** (Super Admin). Data lama hanya **dibaca**, tidak diubah.

1. **Pilih sumber:** *Berkas Excel/CSV* (BNBA PENGAJUAN atau 2026-DATA ATENSI, dibaca di browser), **atau** *Google Sheets* (tempel tautan; spreadsheet harus bisa dibuka akun Super Admin).
2. **Opsi:** tahun data dan Pokja (bila file tidak punya kolom POKJA, Pokja ditebak dari KLASTER PPKS).
3. **Pindai (uji coba)** → periksa angka *ditambah / dilengkapi / dilewati / gagal* dan daftar baris bermasalah. Belum ada yang tersimpan.
4. **Jalankan Impor** → data dikelompokkan menjadi usulan per Pokja + NO SK, diproses per 500 baris.

Aman diulang: NIK yang sudah ada tidak digandakan, dan hanya kolom yang masih kosong yang dilengkapi. Jalankan sekali lagi tepat sebelum mulai dipakai untuk menangkap data terbaru. Migrasi tidak mengirim notifikasi.

---

## 8. Uji sebelum dipakai

| Uji | Hasil yang benar |
|---|---|
| Masuk dengan email Google yang **tidak** terdaftar | Halaman **Akses Ditolak** dengan email tersebut |
| Masuk dengan **asterpokjadata@gmail.com** | Halaman **Pilih Peran**, lalu Beranda |
| Pengaturan → Pengguna → **Tambah Pengguna** (pegawai + Pokja) | Email itu bisa masuk dan menunya sesuai Pokja |
| Tambah Super Admin ke-2, lalu coba ke-3 | Ke-3 ditolak: *Maksimal 2 Super Admin aktif* |
| **Nonaktifkan** pengguna yang sedang membuka aplikasi | Ia otomatis keluar ke Akses Ditolak tanpa memuat ulang |
| Ganti peran menjadi Kapokja TU | Menu Pengaturan hilang, bilah biru "Mode simulasi" tampil |
| Pokja TU membuat pengumuman **Penting** | Lonceng pengguna lain bertambah tanpa memuat ulang |
| Anggota Pokja → Workspace BNBA → **Buat Usulan Baru** → tambah 2 PM → **Submit** | Usulan berstatus *Menunggu*; lonceng (dan WA/email bila aktif) Kapokja bertambah |
| Tambah PM dengan NIK yang sudah dipakai | Ditolak dengan nama usulan pemiliknya |
| Kapokja → Antrean Verifikasi → **Setujui** | Usulan masuk Tahap 3; anggota Pokja menerima notifikasi |
| Tahap 3: **unggah** Draft SK + Nota Dinas → **Konfirmasi selesai** | Berkas muncul di Drive Super Admin, folder `SITASI TSKPO / Usulan & SK / …`; Tahap 4a terbuka; Pokja TU menerima notifikasi |
| Klik ikon unduh pada berkas | Berkas terunduh; tercatat di Log Aktivitas |
| Coba selesaikan tahap tanpa berkas wajib | Ditolak dengan pesan berkas yang kurang |
| Direktur membuka Detail Usulan | Bisa melihat, tidak ada tombol proses |
| Master BNBA → **Ekspor Excel** sebagai anggota Pokja lain | Rekening, No. KK, nama ibu, alamat tersamar; tercatat di Log Aktivitas |
| Keuangan → Rekap SP2D & Koreksi → ubah nilai tanpa alasan | Ditolak; dengan alasan → tersimpan, nilai asli tetap ada |
| Buka di ponsel | Navigasi bawah tampil; tombol A+ memperbesar teks |

---

## Memperbarui di kemudian hari

Hanya bagian yang berubah yang perlu diperbarui. Google Cloud dan pengaturan Supabase **tidak** perlu diulang.

| Yang berubah | Yang dilakukan |
|---|---|
| Tampilan (ZIP baru) | Salin isi folder ZIP baru ke folder `sitasi-tskpo` lama → **Replace**. Jangan hapus folder tersembunyi `.git`, dan isi ulang `js/config.js` (simpan dulu 3 nilainya). Lalu `git add .` → `git commit -m "Pembaruan"` → `git push`. Tunggu 1–2 menit, tekan **Ctrl+Shift+R** |
| Basis data (file SQL baru, mis. Tahap 3) | SQL Editor → New query → tempel → **Run** |
| `Kode.gs` | Tempel kode baru → **Save** → **Deploy → Manage deployments** → ikon pensil → *Version:* **New version** → **Deploy**. Alamat `/exec` **tidak berubah**, jadi `config.js` tidak perlu diubah |

## Kecepatan & keamanan

- **Kecepatan:** membaca data langsung dari Supabase (Singapura). Unggah/unduh berkas lewat Apps Script; permintaan pertama setelah lama tidak dipakai bisa 2–4 detik karena Google "membangunkan" skrip, sesudahnya lebih cepat.
- **Paket Supabase Free:** proyek dijeda otomatis bila tidak dipakai 7 hari. Buka dasbor Supabase lalu klik **Restore project**. Paket Free tidak memiliki backup harian otomatis, padahal PRD mensyaratkan backup harian. Sebelum produksi dengan data asli PM, pertimbangkan **Pro** (US$25/bulan).
- **Akun Super Admin** memegang semua berkas di Drive. Aktifkan **verifikasi 2 langkah** dan jangan bagikan kata sandinya. Unduhan langsung dari Drive (di luar web) tidak tercatat di Log Aktivitas SITASI.
- **Folder Drive `SITASI TSKPO`** jangan dipindah atau diganti nama. Bila terlanjur, jalankan lagi `pasangSITASI`.
- **Kunci rahasia bocor?** Supabase → Project Settings → API Keys → buat ulang (*roll*) kunci tersebut, lalu perbarui `SUPABASE_SERVICE_KEY` di Script Properties.
- **Kuota Google:** email Gmail pribadi ±100/hari; Apps Script ±20.000 panggilan URL/hari. Pemicu 1 menit memakai ±1.440 panggilan/hari, jauh di bawah batas.
- **Dua proyek:** PRD menyarankan proyek **Uji** dan **Produksi** terpisah. Ulangi langkah 1–5 untuk proyek kedua dengan repository terpisah.

## Pemecahan masalah

| Yang terlihat | Penyebab | Solusi |
|---|---|---|
| Situs 404 di GitHub Pages | `index.html` tidak di akar repository | Buka repository di browser. Bila terlihat folder, ulangi 5a–5b dari folder yang benar, lalu `git push -u origin main --force` |
| Tampilan polos tanpa warna | Folder `css/` atau `js/` tidak ikut | Unggah lewat terminal (bukan *Upload files* di web) |
| **Publish app** abu-abu | Branding belum lengkap | Lengkapi 3a (logo kosong, 3 tautan, 2 domain) → Save → muat ulang Audience |
| Google: *Access blocked … has not completed the Google verification process* | Aplikasi masih *Testing* dan email belum jadi test user | Lakukan 5d, atau tambahkan email itu di Audience → Test users |
| Google: *Error 400: redirect_uri_mismatch* | Redirect URI salah | Isi persis `https://<kode>.supabase.co/auth/v1/callback` (3b) |
| Setelah memilih akun Google kembali ke halaman depan saja | Alamat situs belum ada di Redirect URLs | Lengkapi 3c, persis dengan `/` di akhir |
| *Struktur basis data belum lengkap* | File SQL belum dijalankan | Ulangi 1b |
| Email terdaftar tetapi **Akses Ditolak** | Salah ketik email atau memilih akun Google lain | Periksa di Pengaturan → Pengguna; saat masuk pilih akun yang benar |
| *Aplikasi belum dapat dimuat* | Internet terputus atau config.js salah ketik | Periksa koneksi dan nilai di `js/config.js` |
| Masih **Mode Pratinjau** (data contoh) | config.js belum terisi saat dikirim, atau cache lama | Isi langkah 4, lalu `git add .` → `git commit -m "config"` → `git push`, tunggu 1–2 menit, Ctrl+Shift+R |
| *Updates were rejected* saat push | Repository di GitHub berisi file lain | `git pull --rebase origin main` lalu `git push` |
| *LF will be replaced by CRLF* | Peringatan biasa di Windows | Abaikan |
| *Alamat Apps Script belum diisi* saat unggah berkas | `GAS_URL` kosong | Isi langkah 4 (Web app URL dari 2d), lalu kirim ulang |
| *Apps Script membalas HTTP … (bukan JSON)* | Deployment bukan *Web app* / akses bukan *Anyone* | Ulangi 2d; pastikan alamat berakhiran `/exec` (bukan `/dev`) |
| *Sesi berakhir* saat unggah | Token login kedaluwarsa | Muat ulang halaman, lalu coba lagi |
| WA tidak terkirim, status *Gagal: Token Fonnte belum diisi* | Token belum disimpan | Langkah 6.3, lalu **Kirim ulang yang gagal** |
| Antrean menumpuk *Antri* | Pemicu belum terpasang | Jalankan lagi `pasangSITASI` (2c) |
| Migrasi Google Sheets: *Spreadsheet tidak bisa dibuka* | Belum dibagikan ke akun Super Admin | Bagikan spreadsheet ke asterpokjadata@gmail.com (Viewer) |
