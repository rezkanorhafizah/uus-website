# Dashboard Divisi Usaha Syariah (Google Apps Script)

Web app dashboard kinerja Unit Usaha Syariah: Aset & Laba, DPK, Pembiayaan, dan rasio keuangan.
Datanya dibaca langsung dari Google Spreadsheet (hasil unggah data mentah Excel).

## Struktur File

| File | Isi |
|---|---|
| `Kode.gs` | Backend: `doGet`, login + token sesi, pembaca sheet (`getDataBundle`), cache |
| `Index.html` | Kerangka halaman: memuat semua file di bawah lewat `include()` |
| `css.html` | Seluruh stylesheet |
| `app.html` | Logika inti: menu, filter, navigasi, format angka, helper chart & tabel |
| `login.html` | Halaman login |
| `home.html` | Highlight Kinerja: ringkasan eksekutif (kartu Aset/DPK/Pembiayaan) |
| `hlaset.html` | Highlight Aset & Laba + Rasio Keuangan (ROA, FDR, BOPO, NPF, NI, CASA) |
| `hldpk.html` | Highlight DPK (KPI, trend, komposisi instrumen & akad, realisasi, leaderboard, tabel) |
| `hlpembiayaan.html` | Highlight Pembiayaan (KPI, trend, komposisi penggunaan/debitur/kolektibilitas, %NPF, realisasi, leaderboard, tabel) |
| `aset.html` | Halaman detail satu indikator (dipakai semua sub-menu sidebar) |

## Cara Pasang

1. Unggah `Data_Mentah.xlsx` ke Google Drive → buka dengan Google Spreadsheet (File → Simpan sebagai Google Spreadsheet).
2. Di Spreadsheet: **Ekstensi → Apps Script**. Buat file dengan nama persis seperti tabel di atas
   (`Kode.gs` sebagai *Script*, sisanya sebagai *HTML*, tanpa ekstensi `.html` saat memberi nama), lalu salin isinya.
   - Bila script dibuat terpisah (standalone), isi `CONFIG.SPREADSHEET_ID` di `Kode.gs`.
3. **Terapkan → Deployment baru → Aplikasi web**. Jalankan sebagai: *Saya*; Akses: sesuai kebutuhan.
4. Buka URL web app, login (akun diatur di `CONFIG.USERS` pada `Kode.gs`; ganti password default sebelum dipakai).

## Sumber Data (sheet)

Setiap indikator dibaca dari sheet berakhiran ` 1` dengan kolom:
`Periode | Periode Date | Unit Kerja | <Nilai> | Target | Kelompok Unit Kerja | YoY | Ytd | Mtm | RBB/C`.
Periode dikunci dari `Periode Date`, jadi label "Sep 2026" / "Sept 2026" tidak masalah.
YoY/Ytd/Mtm/RBB/C diambil dari sheet; bila kosong dihitung otomatis dari periode pembanding.

| Halaman | Sheet yang dipakai |
|---|---|
| Ringkasan | `Aset 1`, `Laba 1`, `DPK 1`, `NOA DPK 1`, `Pby 1`, `NOA Pby 1` |
| Aset & Laba | `Aset 1`, `Laba 1`, `ROA 1`, `FDR 1`, `BOPO 1`, `NPF 1`, `NI 1`, `CASA 1` |
| DPK | `DPK 1`, `NOA DPK 1`, `Gir 1`, `Tab 1`, `Depo 1`, `NOA Gir 1`, `NOA Tab 1`, `NOA Depo 1` |
| Pembiayaan | `Pby 1`, `NOA Pby 1`, `NPF 1`, `MK 1`, `Inv 1`, `Kons 1`, `Korp 1`, `UMKM 1`, `NOA Korp 1`, `NOA UMKM 1`, `NOA Kons 1` |

### Sheet yang belum ada di data mentah

Grafik berikut menampilkan pesan "Data belum tersedia" sampai sheet-nya ditambahkan
(format kolom sama seperti `DPK 1` / `Pby 1`). Nama sheet bisa diubah di konstanta
`HLD_SHEET` (hldpk.html) dan `HLP_SHEET` (hlpembiayaan.html).

- DPK per akad: `Mudharabah 1`, `Wadiah 1`, `NOA Mudharabah 1`, `NOA Wadiah 1`
- NOA pembiayaan per penggunaan: `NOA MK 1`, `NOA Inv 1`
- Nominal NPF per kolektibilitas: `Kol1 1`, `Kol2 1`, `Kol3 1`, `Kol4 1`, `Kol5 1`

Sheet rasio (`ROA 1`, `FDR 1`, `BOPO 1`, `NPF 1`, `NI 1`, `CASA 1`) sudah ada tetapi nilainya masih 0.
Isi dalam bentuk persentase/desimal (mis. 1,25% atau 0,0125).
