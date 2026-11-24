// =====================================================================
// Daftar wilayah (38 provinsi → kabupaten/kota) + pencocokan nama berdasarkan kemiripan.
// Catatan jujur: ini pencocokan kemiripan teks (bukan kecerdasan buatan). Daftar disusun dari
// pengetahuan umum, BUKAN dari berkas milik Direktorat. Bila ada nama yang kurang/berbeda,
// ubah di bagian DATA di bawah ini (satu baris per provinsi: kab = kabupaten, kota = kota).
// =====================================================================
const DATA = {
  'Aceh': { kab: 'Aceh Barat,Aceh Barat Daya,Aceh Besar,Aceh Jaya,Aceh Selatan,Aceh Singkil,Aceh Tamiang,Aceh Tengah,Aceh Tenggara,Aceh Timur,Aceh Utara,Bener Meriah,Bireuen,Gayo Lues,Nagan Raya,Pidie,Pidie Jaya,Simeulue', kota: 'Banda Aceh,Langsa,Lhokseumawe,Sabang,Subulussalam' },
  'Sumatera Utara': { kab: 'Asahan,Batu Bara,Dairi,Deli Serdang,Humbang Hasundutan,Karo,Labuhanbatu,Labuhanbatu Selatan,Labuhanbatu Utara,Langkat,Mandailing Natal,Nias,Nias Barat,Nias Selatan,Nias Utara,Padang Lawas,Padang Lawas Utara,Pakpak Bharat,Samosir,Serdang Bedagai,Simalungun,Tapanuli Selatan,Tapanuli Tengah,Tapanuli Utara,Toba', kota: 'Binjai,Gunungsitoli,Medan,Padangsidimpuan,Pematangsiantar,Sibolga,Tanjungbalai,Tebing Tinggi' },
  'Sumatera Barat': { kab: 'Agam,Dharmasraya,Kepulauan Mentawai,Lima Puluh Kota,Padang Pariaman,Pasaman,Pasaman Barat,Pesisir Selatan,Sijunjung,Solok,Solok Selatan,Tanah Datar', kota: 'Bukittinggi,Padang,Padang Panjang,Pariaman,Payakumbuh,Sawahlunto,Solok' },
  'Riau': { kab: 'Bengkalis,Indragiri Hilir,Indragiri Hulu,Kampar,Kepulauan Meranti,Kuantan Singingi,Pelalawan,Rokan Hilir,Rokan Hulu,Siak', kota: 'Dumai,Pekanbaru' },
  'Kepulauan Riau': { kab: 'Bintan,Karimun,Kepulauan Anambas,Lingga,Natuna', kota: 'Batam,Tanjungpinang' },
  'Jambi': { kab: 'Batanghari,Bungo,Kerinci,Merangin,Muaro Jambi,Sarolangun,Tanjung Jabung Barat,Tanjung Jabung Timur,Tebo', kota: 'Jambi,Sungai Penuh' },
  'Sumatera Selatan': { kab: 'Banyuasin,Empat Lawang,Lahat,Muara Enim,Musi Banyuasin,Musi Rawas,Musi Rawas Utara,Ogan Ilir,Ogan Komering Ilir,Ogan Komering Ulu,Ogan Komering Ulu Selatan,Ogan Komering Ulu Timur,Penukal Abab Lematang Ilir', kota: 'Lubuklinggau,Pagar Alam,Palembang,Prabumulih' },
  'Bengkulu': { kab: 'Bengkulu Selatan,Bengkulu Tengah,Bengkulu Utara,Kaur,Kepahiang,Lebong,Mukomuko,Rejang Lebong,Seluma', kota: 'Bengkulu' },
  'Lampung': { kab: 'Lampung Barat,Lampung Selatan,Lampung Tengah,Lampung Timur,Lampung Utara,Mesuji,Pesawaran,Pesisir Barat,Pringsewu,Tanggamus,Tulang Bawang,Tulang Bawang Barat,Way Kanan', kota: 'Bandar Lampung,Metro' },
  'Kepulauan Bangka Belitung': { kab: 'Bangka,Bangka Barat,Bangka Selatan,Bangka Tengah,Belitung,Belitung Timur', kota: 'Pangkal Pinang' },
  'DKI Jakarta': { kab: 'Kepulauan Seribu', kota: 'Jakarta Barat,Jakarta Pusat,Jakarta Selatan,Jakarta Timur,Jakarta Utara' },
  'Jawa Barat': { kab: 'Bandung,Bandung Barat,Bekasi,Bogor,Ciamis,Cianjur,Cirebon,Garut,Indramayu,Karawang,Kuningan,Majalengka,Pangandaran,Purwakarta,Subang,Sukabumi,Sumedang,Tasikmalaya', kota: 'Bandung,Banjar,Bekasi,Bogor,Cimahi,Cirebon,Depok,Sukabumi,Tasikmalaya' },
  'Banten': { kab: 'Lebak,Pandeglang,Serang,Tangerang', kota: 'Cilegon,Serang,Tangerang,Tangerang Selatan' },
  'Jawa Tengah': { kab: 'Banjarnegara,Banyumas,Batang,Blora,Boyolali,Brebes,Cilacap,Demak,Grobogan,Jepara,Karanganyar,Kebumen,Kendal,Klaten,Kudus,Magelang,Pati,Pekalongan,Pemalang,Purbalingga,Purworejo,Rembang,Semarang,Sragen,Sukoharjo,Tegal,Temanggung,Wonogiri,Wonosobo', kota: 'Magelang,Pekalongan,Salatiga,Semarang,Surakarta,Tegal' },
  'Daerah Istimewa Yogyakarta': { kab: 'Bantul,Gunungkidul,Kulon Progo,Sleman', kota: 'Yogyakarta' },
  'Jawa Timur': { kab: 'Bangkalan,Banyuwangi,Blitar,Bojonegoro,Bondowoso,Gresik,Jember,Jombang,Kediri,Lamongan,Lumajang,Madiun,Magetan,Malang,Mojokerto,Nganjuk,Ngawi,Pacitan,Pamekasan,Pasuruan,Ponorogo,Probolinggo,Sampang,Sidoarjo,Situbondo,Sumenep,Trenggalek,Tuban,Tulungagung', kota: 'Batu,Blitar,Kediri,Madiun,Malang,Mojokerto,Pasuruan,Probolinggo,Surabaya' },
  'Bali': { kab: 'Badung,Bangli,Buleleng,Gianyar,Jembrana,Karangasem,Klungkung,Tabanan', kota: 'Denpasar' },
  'Nusa Tenggara Barat': { kab: 'Bima,Dompu,Lombok Barat,Lombok Tengah,Lombok Timur,Lombok Utara,Sumbawa,Sumbawa Barat', kota: 'Bima,Mataram' },
  'Nusa Tenggara Timur': { kab: 'Alor,Belu,Ende,Flores Timur,Kupang,Lembata,Malaka,Manggarai,Manggarai Barat,Manggarai Timur,Nagekeo,Ngada,Rote Ndao,Sabu Raijua,Sikka,Sumba Barat,Sumba Barat Daya,Sumba Tengah,Sumba Timur,Timor Tengah Selatan,Timor Tengah Utara', kota: 'Kupang' },
  'Kalimantan Barat': { kab: 'Bengkayang,Kapuas Hulu,Kayong Utara,Ketapang,Kubu Raya,Landak,Melawi,Mempawah,Sambas,Sanggau,Sekadau,Sintang', kota: 'Pontianak,Singkawang' },
  'Kalimantan Tengah': { kab: 'Barito Selatan,Barito Timur,Barito Utara,Gunung Mas,Kapuas,Katingan,Kotawaringin Barat,Kotawaringin Timur,Lamandau,Murung Raya,Pulang Pisau,Seruyan,Sukamara', kota: 'Palangka Raya' },
  'Kalimantan Selatan': { kab: 'Balangan,Banjar,Barito Kuala,Hulu Sungai Selatan,Hulu Sungai Tengah,Hulu Sungai Utara,Kotabaru,Tabalong,Tanah Bumbu,Tanah Laut,Tapin', kota: 'Banjarbaru,Banjarmasin' },
  'Kalimantan Timur': { kab: 'Berau,Kutai Barat,Kutai Kartanegara,Kutai Timur,Mahakam Ulu,Paser,Penajam Paser Utara', kota: 'Balikpapan,Bontang,Samarinda' },
  'Kalimantan Utara': { kab: 'Bulungan,Malinau,Nunukan,Tana Tidung', kota: 'Tarakan' },
  'Sulawesi Utara': { kab: 'Bolaang Mongondow,Bolaang Mongondow Selatan,Bolaang Mongondow Timur,Bolaang Mongondow Utara,Kepulauan Sangihe,Kepulauan Siau Tagulandang Biaro,Kepulauan Talaud,Minahasa,Minahasa Selatan,Minahasa Tenggara,Minahasa Utara', kota: 'Bitung,Kotamobagu,Manado,Tomohon' },
  'Gorontalo': { kab: 'Boalemo,Bone Bolango,Gorontalo,Gorontalo Utara,Pohuwato', kota: 'Gorontalo' },
  'Sulawesi Tengah': { kab: 'Banggai,Banggai Kepulauan,Banggai Laut,Buol,Donggala,Morowali,Morowali Utara,Parigi Moutong,Poso,Sigi,Tojo Una-Una,Tolitoli', kota: 'Palu' },
  'Sulawesi Barat': { kab: 'Majene,Mamasa,Mamuju,Mamuju Tengah,Pasangkayu,Polewali Mandar', kota: '' },
  'Sulawesi Selatan': { kab: 'Bantaeng,Barru,Bone,Bulukumba,Enrekang,Gowa,Jeneponto,Kepulauan Selayar,Luwu,Luwu Timur,Luwu Utara,Maros,Pangkajene dan Kepulauan,Pinrang,Sidenreng Rappang,Sinjai,Soppeng,Takalar,Tana Toraja,Toraja Utara,Wajo', kota: 'Makassar,Palopo,Parepare' },
  'Sulawesi Tenggara': { kab: 'Bombana,Buton,Buton Selatan,Buton Tengah,Buton Utara,Kolaka,Kolaka Timur,Kolaka Utara,Konawe,Konawe Kepulauan,Konawe Selatan,Konawe Utara,Muna,Muna Barat,Wakatobi', kota: 'Baubau,Kendari' },
  'Maluku': { kab: 'Buru,Buru Selatan,Kepulauan Aru,Kepulauan Tanimbar,Maluku Barat Daya,Maluku Tengah,Maluku Tenggara,Seram Bagian Barat,Seram Bagian Timur', kota: 'Ambon,Tual' },
  'Maluku Utara': { kab: 'Halmahera Barat,Halmahera Selatan,Halmahera Tengah,Halmahera Timur,Halmahera Utara,Kepulauan Sula,Pulau Morotai,Pulau Taliabu', kota: 'Ternate,Tidore Kepulauan' },
  'Papua': { kab: 'Biak Numfor,Jayapura,Keerom,Kepulauan Yapen,Mamberamo Raya,Sarmi,Supiori,Waropen', kota: 'Jayapura' },
  'Papua Barat': { kab: 'Fakfak,Kaimana,Manokwari,Manokwari Selatan,Pegunungan Arfak,Teluk Bintuni,Teluk Wondama', kota: '' },
  'Papua Barat Daya': { kab: 'Maybrat,Raja Ampat,Sorong,Sorong Selatan,Tambrauw', kota: 'Sorong' },
  'Papua Selatan': { kab: 'Asmat,Boven Digoel,Mappi,Merauke', kota: '' },
  'Papua Tengah': { kab: 'Deiyai,Dogiyai,Intan Jaya,Mimika,Nabire,Paniai,Puncak,Puncak Jaya', kota: '' },
  'Papua Pegunungan': { kab: 'Jayawijaya,Lanny Jaya,Mamberamo Tengah,Nduga,Pegunungan Bintang,Tolikara,Yahukimo,Yalimo', kota: '' },
};

// Singkatan / nama lain yang lazim diketik
const ALIAS_PROVINSI = {
  'dki': 'DKI Jakarta', 'jakarta': 'DKI Jakarta', 'dki jakarta': 'DKI Jakarta', 'diy': 'Daerah Istimewa Yogyakarta', 'yogyakarta': 'Daerah Istimewa Yogyakarta', 'jogja': 'Daerah Istimewa Yogyakarta',
  'daerah istimewa yogyakarta': 'Daerah Istimewa Yogyakarta', 'di yogyakarta': 'Daerah Istimewa Yogyakarta', 'di yogya': 'Daerah Istimewa Yogyakarta', 'ntb': 'Nusa Tenggara Barat', 'ntt': 'Nusa Tenggara Timur', 'kepri': 'Kepulauan Riau',
  'babel': 'Kepulauan Bangka Belitung', 'bangka belitung': 'Kepulauan Bangka Belitung', 'sumut': 'Sumatera Utara', 'sumbar': 'Sumatera Barat', 'sumsel': 'Sumatera Selatan',
  'jabar': 'Jawa Barat', 'jateng': 'Jawa Tengah', 'jatim': 'Jawa Timur', 'kalbar': 'Kalimantan Barat', 'kalteng': 'Kalimantan Tengah', 'kalsel': 'Kalimantan Selatan',
  'kaltim': 'Kalimantan Timur', 'kaltara': 'Kalimantan Utara', 'sulut': 'Sulawesi Utara', 'sulteng': 'Sulawesi Tengah', 'sulsel': 'Sulawesi Selatan', 'sultra': 'Sulawesi Tenggara',
  'sulbar': 'Sulawesi Barat', 'malut': 'Maluku Utara', 'nad': 'Aceh', 'nanggroe aceh darussalam': 'Aceh', 'papua pegunungan tengah': 'Papua Pegunungan',
};
const ALIAS_KABKOTA = { 'kepulauan tanimbar': 'Kepulauan Tanimbar', 'maluku tenggara barat': 'Kepulauan Tanimbar', 'mtb': 'Kepulauan Tanimbar', 'kep seribu': 'Kepulauan Seribu', 'pangkajene kepulauan': 'Pangkajene dan Kepulauan', 'pangkep': 'Pangkajene dan Kepulauan', 'tangsel': 'Tangerang Selatan', 'kota tangsel': 'Tangerang Selatan' };

export const PROVINSI = Object.keys(DATA);

const _cache = {};
function bangun(prov) {
  if (_cache[prov]) return _cache[prov];
  const d = DATA[prov]; if (!d) return (_cache[prov] = []);
  const a = [];
  d.kab.split(',').filter(Boolean).forEach((n) => a.push({ nama: 'Kabupaten ' + n, inti: n, jenis: 'kab' }));
  d.kota.split(',').filter(Boolean).forEach((n) => a.push({ nama: 'Kota ' + n, inti: n, jenis: 'kota' }));
  return (_cache[prov] = a);
}

/** Daftar nama kabupaten/kota (kanonik) untuk satu provinsi: "Kabupaten X" / "Kota X". */
export function daftarKabKota(provinsi) { return bangun(canonProvinsi(provinsi)).map((x) => x.nama); }
export function semuaKabKota() { return PROVINSI.flatMap((p) => bangun(p).map((x) => ({ provinsi: p, nama: x.nama }))); }

// ---------------------------------------------------------------- kemiripan teks
function bersih(t) {
  return String(t || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[.,/\\()\-_'"]/g, ' ')
    .replace(/\bkep\b/g, 'kepulauan').replace(/\b(tg|tj)\b/g, 'tanjung').replace(/\bsel\b/g, 'selatan').replace(/\bbar\b/g, 'barat')
    .replace(/\btim\b/g, 'timur').replace(/\bteng\b/g, 'tengah').replace(/\but\b/g, 'utara')
    .replace(/\s+/g, ' ').trim();
}
const JENIS = [[/^(kabupaten|kab)\b\s*/, 'kab'], [/^(kota madya|kotamadya|kodya|kota administrasi|kota adm|kota)\b\s*/, 'kota'], [/^(provinsi|prov|propinsi)\b\s*/, '']];
function pecah(t) {
  let s = bersih(t), jenis = '';
  for (const [re, j] of JENIS) { if (re.test(s)) { if (j) jenis = j; s = s.replace(re, ''); break; } }
  s = s.replace(/\b(adm|administrasi)\b/g, '').replace(/\s+/g, ' ').trim();
  return { inti: s, jenis };
}
function bigram(s) { const a = []; const t = ' ' + s + ' '; for (let i = 0; i < t.length - 1; i++) a.push(t.slice(i, i + 2)); return a; }
function dice(a, b) {
  if (!a || !b) return 0; if (a === b) return 1;
  const x = bigram(a), y = bigram(b); const m = new Map();
  x.forEach((g) => m.set(g, (m.get(g) || 0) + 1));
  let sama = 0; y.forEach((g) => { const n = m.get(g); if (n > 0) { sama++; m.set(g, n - 1); } });
  return (2 * sama) / (x.length + y.length);
}
function jarakEdit(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let p = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const c = [i]; for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; }
  return p[n];
}
/** 0..1 — gabungan kemiripan bigram dan jarak edit (tahan salah ketik & spasi). */
export function kemiripan(a, b) {
  const x = bersih(a), y = bersih(b); if (!x || !y) return 0; if (x === y) return 1;
  const ed = 1 - jarakEdit(x, y) / Math.max(x.length, y.length);
  const dc = dice(x, y);
  const gx = x.replace(/ /g, ''), gy = y.replace(/ /g, '');
  const tanpaSpasi = gx === gy ? 1 : 0;
  return Math.max(tanpaSpasi, 0.5 * ed + 0.5 * dc);
}

const AMBANG_PASTI = 0.82;   // otomatis diganti ke nama baku
const AMBANG_SARAN = 0.55;   // ditawarkan sebagai saran

export function canonProvinsi(teks) {
  return cocokProvinsi(teks).nilai || (PROVINSI.includes(teks) ? teks : '');
}

/** Cocokkan teks provinsi bebas → {nilai (nama baku atau ''), skor, saran[]} */
export function cocokProvinsi(teks) {
  const t = String(teks || '').trim();
  if (!t) return { nilai: '', skor: 0, saran: [] };
  const exact = PROVINSI.find((p) => p === t); if (exact) return { nilai: exact, skor: 1, saran: [] };
  const { inti } = pecah(t);
  if (ALIAS_PROVINSI[inti]) return { nilai: ALIAS_PROVINSI[inti], skor: 1, saran: [] };
  const nilai = PROVINSI.map((p) => ({ p, s: Math.max(kemiripan(inti, p), kemiripan(inti, p.replace(/^(Kepulauan|Nusa Tenggara|Daerah Istimewa) /, ''))) })).sort((a, b) => b.s - a.s);
  const top = nilai[0];
  const ganda = nilai[1] && top.s - nilai[1].s < 0.04;
  if (top.s >= AMBANG_PASTI && !ganda) return { nilai: top.p, skor: top.s, saran: [] };
  return { nilai: '', skor: top.s, saran: nilai.filter((x) => x.s >= AMBANG_SARAN).slice(0, 3).map((x) => x.p) };
}

/**
 * Cocokkan teks kabupaten/kota bebas dalam satu provinsi → {nilai, skor, saran[], ambigu}.
 * "Bekasi" tanpa awalan Kota/Kab yang ada dua-duanya = ambigu (tidak dipilihkan otomatis).
 */
export function cocokKabKota(teks, provinsi) {
  const t = String(teks || '').trim();
  const prov = canonProvinsi(provinsi);
  if (!t || !prov) return { nilai: '', skor: 0, saran: [], ambigu: false };
  const daftar = bangun(prov);
  const exact = daftar.find((x) => x.nama === t); if (exact) return { nilai: exact.nama, skor: 1, saran: [], ambigu: false };
  let { inti, jenis } = pecah(t);
  if (ALIAS_KABKOTA[inti]) inti = bersih(ALIAS_KABKOTA[inti]);
  const nilai = daftar.map((x) => {
    let s = kemiripan(inti, x.inti);
    if (jenis && x.jenis !== jenis) s -= 0.12;          // awalan Kab/Kota diketik tapi beda jenis
    return { x, s };
  }).sort((a, b) => b.s - a.s);
  const top = nilai[0]; if (!top) return { nilai: '', skor: 0, saran: [], ambigu: false };
  const kembar = nilai.filter((n) => n.x.inti === top.x.inti && n.s >= AMBANG_PASTI - 0.12);
  if (!jenis && kembar.length > 1) return { nilai: '', skor: top.s, saran: kembar.map((n) => n.x.nama), ambigu: true };
  const bersaing = nilai[1] && nilai[1].x.inti !== top.x.inti && top.s - nilai[1].s < 0.04;
  const lain = nilai.find((n) => n.x.inti !== top.x.inti);
  const unggul = top.s >= 0.75 && lain && top.s - lain.s >= 0.15;       // satu kandidat jelas jauh di depan
  if ((top.s >= AMBANG_PASTI || unggul) && !bersaing) return { nilai: top.x.nama, skor: top.s, saran: [], ambigu: false };
  return { nilai: '', skor: top.s, saran: nilai.filter((n) => n.s >= AMBANG_SARAN).slice(0, 3).map((n) => n.x.nama), ambigu: false };
}

/** Untuk impor Excel: kembalikan nama baku bila cocok; kalau tidak, teks asli + penanda perlu dicek. */
export function normalkanWilayah(provTeks, kabTeks) {
  const p = cocokProvinsi(provTeks);
  const out = { provinsi: p.nilai || String(provTeks || '').trim(), kabkota: String(kabTeks || '').trim(), catatan: [] };
  if (provTeks && !p.nilai) out.catatan.push(`Provinsi "${provTeks}" tidak dikenali${p.saran.length ? ' (mungkin: ' + p.saran.join(' / ') + ')' : ''}`);
  if (p.nilai && kabTeks) {
    const k = cocokKabKota(kabTeks, p.nilai);
    if (k.nilai) out.kabkota = k.nilai;
    else out.catatan.push(`Kab/Kota "${kabTeks}" belum cocok${k.saran.length ? ' (mungkin: ' + k.saran.join(' / ') + ')' : ''}`);
  }
  return out;
}
