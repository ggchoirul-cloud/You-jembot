# 📚 Study Planner Premium

Aplikasi web perencana belajar dengan tampilan **premium merah-hitam**, dibangun murni dengan **HTML5, CSS3, dan Vanilla JavaScript (ES6)** — tanpa React, Vue, Angular, atau framework lainnya. Mendukung **PWA** (bisa di-install ke Android/desktop dan dipakai offline).

## ✨ Fitur

- **Dashboard** — sapaan dinamis, kartu Total Jam Belajar, Study Streak, Target Nilai, Ranking Target, dan progress menuju Juara 1.
- **Jadwal Belajar** — jadwal mingguan (Senin–Minggu) dengan jam, mata pelajaran, checklist selesai, tersimpan otomatis di LocalStorage.
- **Checklist Harian** — 5 checklist besar dengan progress otomatis dan animasi.
- **Target Nilai** — target per mata pelajaran, bisa diubah bebas.
- **Tracker Nilai** — input nilai ulangan (UH1, UH2, UH3, PAS, dst) per mapel.
- **Grafik** — Line chart perkembangan nilai, Bar chart rata-rata per mapel, Pie chart persentase target tercapai (Chart.js).
- **Progress Juara 1** — 5 level (Pemula → Rajin → Pintar → Elite → Juara 1) berdasarkan rata-rata nilai, dengan progress bar animasi.
- **Statistik** — total soal, total jam belajar, nilai tertinggi/terendah, mapel terbaik/terlemah, persentase target.
- **Pomodoro Timer** — 25 menit fokus / 5 menit istirahat, dengan ring animasi dan alarm suara.
- **Kalender Belajar** — kalender bulanan, hari yang sudah belajar otomatis ditandai merah.
- **Achievement** — badge 📚 Rajin Belajar, 🔥 7 Hari Berturut-turut, ⭐ Nilai 95+, 👑 Juara 1 — lengkap dengan confetti saat unlock.
- **Export & Backup** — Export PDF (ringkasan), Export Excel (nilai/jadwal/target), Backup JSON, dan Import JSON.
- **PWA** — `manifest.json` + `service-worker`, bisa di-install ke Android/desktop, mode offline, splash screen & icon otomatis.
- **UI Premium** — glassmorphism, soft shadow, rounded card, gradient, ripple button, fade/slide/scale animation, loading screen, skeleton loading, toast notification, floating action button, dan confetti.
- **Fully Responsive** — mobile-first, sidebar di desktop dan bottom navigation di HP, tanpa elemen keluar layar.

## 🗂️ Struktur Project

```
study-planner/
│
├── index.html          # Struktur halaman & semua section (SPA satu halaman)
├── style.css            # Tema merah-hitam premium, glassmorphism, animasi, responsive
├── script.js             # Seluruh logika aplikasi (ES6, modular, LocalStorage, Chart.js)
├── manifest.json         # Konfigurasi PWA
├── sw.js                 # Service worker (offline & caching)
│
├── assets/
│   ├── logo.png
│   ├── icon.png
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-180.png
│   └── bg.jpg
│
├── README.md
└── favicon.ico
```

## 🚀 Cara Menjalankan

### Lokal
Cukup buka `index.html` langsung di browser, **atau** jalankan server statis sederhana agar service worker & PWA berfungsi penuh:

```bash
npx serve .
# atau
python3 -m http.server 8080
```

Lalu buka `http://localhost:8080`.

### Deploy ke Vercel
1. Push folder ini ke repository GitHub.
2. Import repository ke [vercel.com](https://vercel.com/new).
3. Vercel akan otomatis mendeteksi ini sebagai static site — klik **Deploy**.
4. Tidak perlu build command apa pun (project ini murni statis).

### Install sebagai Aplikasi (PWA)
1. Buka website hasil deploy di Chrome Android atau desktop.
2. Tap menu **⋮** → **Install app / Tambahkan ke layar utama**.
3. Aplikasi akan berjalan seperti aplikasi native, lengkap dengan mode offline.

## 🎨 Tema Desain — Neo-Brutalism

| Elemen | Nilai |
|---|---|
| Merah aksen | `#FF3B30` |
| Kuning aksen | `#FFD400` |
| Biru aksen | `#2F5AFF` |
| Hijau aksen | `#00C853` |
| Hitam (ink/border) | `#111111` |
| Krem (background) | `#FFF7E4` |
| Font display | Archivo Black |
| Font body | Space Grotesk |
| Font mono (label/angka) | JetBrains Mono |
| Style | Border tebal 3-4px, hard offset shadow (tanpa blur), flat color, sudut tegas (0px radius), tombol "menekan" saat diklik |

## 💾 Penyimpanan Data

Seluruh data (jadwal, checklist, target, nilai, sesi pomodoro, kalender, achievement) disimpan di **LocalStorage** browser — tidak memerlukan server/database. Gunakan menu **Export & Backup → Backup JSON** secara berkala untuk mengamankan data, dan **Import JSON** untuk memulihkannya di perangkat lain.

## 🛠️ Tech Stack

> **Catatan koneksi:** Grafik, Export PDF, dan Export Excel memuat library (Chart.js/jsPDF/SheetJS) dari CDN jsDelivr saat halaman dibuka. Jika koneksi lambat, bagian tersebut akan menampilkan status "Memuat…" dan otomatis merender ulang begitu library selesai dimuat — tidak perlu refresh manual. Jika gagal total (offline penuh), akan muncul tombol **Coba Lagi**.


- HTML5, CSS3 native (tanpa Bootstrap)
- Vanilla JavaScript ES6 (tanpa framework)
- [Chart.js](https://www.chartjs.org/) — grafik
- [Font Awesome 6](https://fontawesome.com/) — ikon
- Google Fonts (Poppins, Sora)
- [jsPDF](https://github.com/parallax/jsPDF) — export PDF
- [SheetJS](https://sheetjs.com/) — export Excel
- LocalStorage — penyimpanan data
- Service Worker — PWA & offline mode

---

Dibuat dengan ✦ untuk Gilang — semangat menuju Juara 1!
