# Dashboard Divisi Usaha Syariah (Google Apps Script)

Web app dashboard kinerja Unit Usaha Syariah: Aset & Laba, DPK, Pembiayaan, dan rasio keuangan.
Datanya dibaca langsung dari Google Spreadsheet (hasil unggah data mentah Excel).

## Struktur File

Satu file HTML per halaman menu. CSS dan JavaScript khusus halaman ditulis langsung di
dalam file halaman itu (`<style>` / `<script>`), tidak ada lagi `css.html` / `app.html`.

| File | Isi |
|---|---|
| `Kode.gs` | Backend: `doGet`, login + token sesi, pembaca sheet (`getDataBundle`), cache |
| `Index.html` | Kerangka (topbar), CSS & logika bersama (pemuatan data, pindah halaman, helper chart & tabel), halaman **Ringkasan Eksekutif**, dan `include()` semua halaman lain |
| `login.html` | Halaman login |
| `navigation.html` | Sidebar: logo/judul, CSS sidebar, **daftar menu (`MENU_CONFIG`)** dan logika buka/tutup menu |
| `filter.html` | Filter utama untuk semua halaman: Tanggal Data, Tahun (checkbox), Series Data, Konsolidasi Cabang, Unit Kerja |

### Mengatur menu sidebar (`navigation.html`)
Edit `MENU_CONFIG` di bagian `<script>`: urutan array = urutan di sidebar.
- Menu utama: `{ id, title, icon, items }` — `icon` memakai nama ikon [Lucide](https://lucide.dev/icons).
- Sub-menu: `{ name, page }` — `page` = nama file halaman (mis. `'giro'` → `giro.html`).
- Tambahkan `hidden: true` untuk menyembunyikan menu / sub-menu tanpa menghapusnya.
- Logo, judul "Unit Usaha Syariah", dan teks "Menu Navigasi" diubah langsung di markup `<aside>`; lebar sidebar di `--sidebar-width`.

### Filter
- **Tanggal Data**: posisi bulan untuk KPI, leaderboard, dan tabel.
- **Tahun** (checkbox, bisa pilih beberapa): tahun yang ditampilkan di grafik trend / realisasi. Minimal satu tahun harus dicentang.
- **Series Data**: `Bulanan` (semua bulan, default), `Triwulanan` (akhir Mar/Jun/Sep/Des), `Semester` (akhir Jun/Des), `Tahunan` (akhir Des).
  Sumbu grafik memakai nama periode real, mis. `Mar 2025`, `Jun 2025`, `Des 2025`.
  Posisi bulan pada Tanggal Data selalu ikut sebagai titik terakhir, mis. `Agt 2026` bila belum akhir triwulan.

| Menu | File | Sheet |
|---|---|---|
| Highlight Kinerja | `hlaset.html`, `hldpk.html`, `hlpembiayaan.html` | lihat tabel Sumber Data |
| Aset & Laba | `aset.html`, `laba.html`, `pendopr.html`, `byopr.html`, `penydana.html`, `bybaghas.html`, `fbi.html` | `Aset 1`, `Laba 1`, `Pend Opr 1`, `By Opr 1`, `Peny Dana 1`, `By BagHas 1`, `FBI 1` |
| Dana Pihak Ketiga | `dpk.html`, `giro.html`, `tabungan.html`, `deposito.html`, `noadpk.html` | `DPK 1`, `Gir 1`, `Tab 1`, `Depo 1`, `NOA DPK 1` |
| Pembiayaan | `pembiayaan.html`, `korporate.html`, `umkm.html`, `konsumer.html`, `modalkerja.html`, `investasi.html`, `noapby.html`, `ekskur.html`, `poskur.html`, `eksflpp.html`, `posflpp.html` | `Pby 1`, `Korp 1`, `UMKM 1`, `Kons 1`, `MK 1`, `Inv 1`, `NOA Pby 1`, `Eksp KUR 1`, `Pos KUR 1`, `Eks FLPP 1`, `Pos FLPP 1` |
| Rasio | `roa.html`, `ni.html`, `fdr.html`, `bopo.html`, `npf.html`, `casa.html`, `far.html`, `pctfbi.html`, `pctumkm.html` | `ROA 1`, `NI 1`, `FDR 1`, `BOPO 1`, `NPF 1`, `CASA 1`, `FAR 1`, `%FBI 1`, `%UMKM 1` |

Halaman indikator (Aset, Giro, ROA, dst) memakai layout 5 KPI • Trend • Realisasi vs Target •
Leaderboard • Tabel. Nama sheet, format angka, dan warna aksen diatur di bagian `<script>` /
`<style>` file masing-masing, mis. di `giro.html`:

```html
PAGES.giro = halamanIndikator({ page: 'giro', metric: 'Giro', sheet: 'Gir 1', fmt: 'rp', warna: WARNA.teal });
```

### Menambah halaman baru
1. Salin salah satu file indikator (mis. `giro.html`) menjadi `namabaru.html`, ganti semua `giro` dengan `namabaru`, sesuaikan sheet & judul.
2. Tambahkan `<?!= include('namabaru'); ?>` di `Index.html`.
3. Tambahkan `{ name: '...', page: 'namabaru' }` di `MENU_CONFIG` (navigation.html).

## Cara Pasang

1. Unggah `Data_Mentah.xlsx` ke Google Drive → buka dengan Google Spreadsheet (File → Simpan sebagai Google Spreadsheet).
2. Di Spreadsheet: **Ekstensi → Apps Script**. Buat file dengan nama persis seperti tabel di atas (39 file HTML)
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
