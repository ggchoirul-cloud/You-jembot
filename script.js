/* =========================================================================
   STUDY PLANNER PREMIUM — script.js
   Semua logika aplikasi: state management, rendering, LocalStorage,
   Chart.js, Pomodoro, Kalender, Achievement, Export, dan PWA.
   Ditulis modular dengan ES6, tanpa framework eksternal.
   ========================================================================= */

(() => {
  "use strict";

  /* =======================================================================
     1. KONFIGURASI & KONSTAN
     ======================================================================= */

  const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const DAYS_ORDERED = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
  const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

  const DEFAULT_CHECKLIST_TEMPLATE = [
    { id: "belajar_materi", text: "Belajar Materi", icon: "fa-book-open" },
    { id: "kerjakan_soal",  text: "Kerjakan 30 Soal", icon: "fa-pen" },
    { id: "review_catatan",text: "Review Catatan", icon: "fa-notes-medical" },
    { id: "selesai_pr",    text: "Selesaikan PR", icon: "fa-file-pen" },
    { id: "tidur_awal",    text: "Tidur Sebelum 22.00", icon: "fa-bed" },
  ];

  const DEFAULT_TARGETS = {
    "MTK": 95, "IPA": 95, "Bahasa Indonesia": 93,
    "Bahasa Inggris": 93, "IPS": 92, "PKN": 92,
  };

  const LEVELS = [
    { name: "Pemula", min: 0,  icon: "fa-seedling" },
    { name: "Rajin",  min: 60, icon: "fa-fire" },
    { name: "Pintar", min: 75, icon: "fa-lightbulb" },
    { name: "Elite",  min: 85, icon: "fa-bolt" },
    { name: "Juara 1",min: 95, icon: "fa-crown" },
  ];

  const BADGES = [
    { id: "rajin",  emoji: "📚", name: "Rajin Belajar", desc: "Belajar 5+ jam total",
      check: (s) => s.totalHours >= 5 },
    { id: "streak7",emoji: "🔥", name: "7 Hari Beruntun", desc: "Streak 7 hari berturut-turut",
      check: (s) => s.streak >= 7 },
    { id: "nilai95",emoji: "⭐", name: "Nilai 95+", desc: "Meraih nilai 95 ke atas",
      check: (s) => s.highestScore >= 95 },
    { id: "juara1", emoji: "👑", name: "Juara 1", desc: "Mencapai level Juara 1",
      check: (s) => s.avgScore >= 95 },
  ];

  const STORAGE_PREFIX = "sp_";

  /* =======================================================================
     2. STATE MANAGEMENT (LocalStorage wrapper)
     ======================================================================= */

  const Store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(STORAGE_PREFIX + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        console.warn("Store.get error:", e);
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
      } catch (e) {
        console.warn("Store.set error:", e);
      }
    },
  };

  // State utama aplikasi, dimuat dari LocalStorage dengan default fallback.
  const state = {
    schedule: Store.get("schedule", buildDefaultSchedule()),
    checklistTemplate: Store.get("checklistTemplate", DEFAULT_CHECKLIST_TEMPLATE),
    checklistDaily: Store.get("checklistDaily", {}),     // { "YYYY-MM-DD": { itemId: bool } }
    targets: Store.get("targets", DEFAULT_TARGETS),
    scores: Store.get("scores", {}),                     // { subject: [{id,label,value}] }
    pomodoroSessions: Store.get("pomodoroSessions", {}),  // { "YYYY-MM-DD": count }
    studyLog: Store.get("studyLog", []),                  // ["YYYY-MM-DD", ...] hari belajar
    achievementsUnlocked: Store.get("achievementsUnlocked", []),
  };

  function buildDefaultSchedule() {
    const sched = {};
    DAYS_ORDERED.forEach((d) => { sched[d] = []; });
    return sched;
  }

  function persist(key) {
    Store.set(key, state[key]);
  }

  function todayKey(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  }

  function todayDayName() {
    return DAYS[new Date().getDay()];
  }

  /* =======================================================================
     3. UTILITAS UI: TOAST, RIPPLE, CONFETTI
     ======================================================================= */

  function showToast(message, type = "info", icon = "fa-circle-info") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    const iconClass = type === "success" ? "fa-circle-check" : type === "warn" ? "fa-triangle-exclamation" : icon;
    toast.innerHTML = `<i class="fa-solid ${iconClass}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("leaving");
      setTimeout(() => toast.remove(), 320);
    }, 3200);
  }

  // Efek ripple pada tombol dengan class .ripple
  function attachRipple() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".ripple");
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const circle = document.createElement("span");
      const size = Math.max(rect.width, rect.height);
      circle.className = "ripple-effect";
      circle.style.width = circle.style.height = `${size}px`;
      circle.style.left = `${e.clientX - rect.left - size / 2}px`;
      circle.style.top = `${e.clientY - rect.top - size / 2}px`;
      btn.appendChild(circle);
      setTimeout(() => circle.remove(), 620);
    });
  }

  // Confetti ringan berbasis canvas, tanpa dependency eksternal.
  const Confetti = (() => {
    const canvas = document.getElementById("confetti-canvas");
    const ctx = canvas.getContext("2d");
    let particles = [];
    let animId = null;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener("resize", resize);
    resize();

    function burst(count = 140) {
      const colors = ["#FF3B30", "#FFD400", "#2F5AFF", "#00C853", "#111111"];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: canvas.width / 2 + (Math.random() - 0.5) * 200,
          y: canvas.height * 0.3,
          vx: (Math.random() - 0.5) * 12,
          vy: Math.random() * -12 - 4,
          size: Math.random() * 7 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 12,
          gravity: 0.35,
          life: 0,
          maxLife: 140 + Math.random() * 60,
        });
      }
      if (!animId) loop();
    }

    function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        p.life++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - p.life / p.maxLife);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });
      particles = particles.filter((p) => p.life < p.maxLife && p.y < canvas.height + 40);
      if (particles.length > 0) {
        animId = requestAnimationFrame(loop);
      } else {
        animId = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    return { burst };
  })();

  /* =======================================================================
     4. NAVIGASI (sidebar, bottom nav, topbar)
     ======================================================================= */

  const VIEW_TITLES = {
    dashboard: "Dashboard", jadwal: "Jadwal Belajar", checklist: "Checklist Harian",
    target: "Target Nilai", tracker: "Tracker Nilai", grafik: "Grafik",
    progress: "Progress Juara 1", statistik: "Statistik", pomodoro: "Pomodoro",
    kalender: "Kalender", achievement: "Achievement", export: "Export & Backup",
  };

  function navigateTo(target) {
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    document.getElementById(`view-${target}`)?.classList.add("active");

    document.querySelectorAll(".nav-item").forEach((el) => {
      el.classList.toggle("active", el.dataset.target === target);
    });
    document.querySelectorAll(".bottom-nav button[data-target]").forEach((el) => {
      el.classList.toggle("active", el.dataset.target === target);
    });

    document.getElementById("topbar-title").textContent = VIEW_TITLES[target] || "Study Planner";
    closeSidebar();

    // Render ulang konten spesifik view saat dibuka (memastikan data terbaru & animasi grafik)
    RENDERERS[target]?.();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openSidebar() {
    document.getElementById("sidebar").classList.add("open");
    document.getElementById("sidebar-overlay").classList.add("show");
  }
  function closeSidebar() {
    if (window.innerWidth < 900) {
      document.getElementById("sidebar").classList.remove("open");
      document.getElementById("sidebar-overlay").classList.remove("show");
    }
  }

  function initNavigation() {
    document.querySelectorAll(".nav-item").forEach((btn) => {
      btn.addEventListener("click", () => navigateTo(btn.dataset.target));
    });
    document.querySelectorAll(".bottom-nav button[data-target]").forEach((btn) => {
      btn.addEventListener("click", () => navigateTo(btn.dataset.target));
    });
    document.getElementById("menu-btn").addEventListener("click", openSidebar);
    document.getElementById("bottom-nav-more").addEventListener("click", openSidebar);
    document.getElementById("sidebar-overlay").addEventListener("click", closeSidebar);
    document.getElementById("fab-checklist").addEventListener("click", () => navigateTo("checklist"));
  }

  /* =======================================================================
     5. PERHITUNGAN / DERIVED DATA
     ======================================================================= */

  function getAllScoresFlat() {
    const flat = [];
    Object.keys(state.scores).forEach((subject) => {
      (state.scores[subject] || []).forEach((entry) => flat.push({ subject, ...entry }));
    });
    return flat;
  }

  function getSubjectAverage(subject) {
    const list = state.scores[subject] || [];
    if (list.length === 0) return null;
    const sum = list.reduce((a, b) => a + Number(b.value), 0);
    return sum / list.length;
  }

  function getOverallAverage() {
    const subjects = Object.keys(state.targets);
    const averages = subjects.map(getSubjectAverage).filter((v) => v !== null);
    if (averages.length === 0) return 0;
    return averages.reduce((a, b) => a + b, 0) / averages.length;
  }

  function getCurrentLevel(avg) {
    let current = LEVELS[0];
    for (const lvl of LEVELS) {
      if (avg >= lvl.min) current = lvl;
    }
    return current;
  }

  function getLevelIndex(levelName) {
    return LEVELS.findIndex((l) => l.name === levelName);
  }

  function getTotalStudyHours() {
    const totalSessions = Object.values(state.pomodoroSessions).reduce((a, b) => a + b, 0);
    return (totalSessions * 25) / 60; // 25 menit per sesi
  }

  function getStreak() {
    const logSet = new Set(state.studyLog);
    let streak = 0;
    // Mulai dari hari ini; jika hari ini belum ada log, mulai hitung dari kemarin
    let cursor = new Date();
    if (!logSet.has(todayKey())) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (true) {
      const key = cursor.toISOString().slice(0, 10);
      if (logSet.has(key)) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  function getTargetAchievedCount() {
    const subjects = Object.keys(state.targets);
    let achieved = 0;
    subjects.forEach((s) => {
      const avg = getSubjectAverage(s);
      if (avg !== null && avg >= state.targets[s]) achieved++;
    });
    return { achieved, total: subjects.length };
  }

  function getTotalSoal() {
    // Total soal dihitung dari jumlah checklist "Kerjakan 30 Soal" yang pernah dicentang, x30
    let count = 0;
    Object.values(state.checklistDaily).forEach((day) => {
      if (day["kerjakan_soal"]) count += 30;
    });
    return count;
  }

  function computeSummary() {
    const avgScore = getOverallAverage();
    const flat = getAllScoresFlat();
    const highestScore = flat.length ? Math.max(...flat.map((s) => Number(s.value))) : 0;
    const lowestScore = flat.length ? Math.min(...flat.map((s) => Number(s.value))) : 0;
    const totalHours = getTotalStudyHours();
    const streak = getStreak();
    const { achieved, total } = getTargetAchievedCount();

    // Mapel terbaik & terlemah berdasarkan rata-rata
    let best = null, worst = null;
    Object.keys(state.targets).forEach((s) => {
      const avg = getSubjectAverage(s);
      if (avg === null) return;
      if (!best || avg > best.avg) best = { subject: s, avg };
      if (!worst || avg < worst.avg) worst = { subject: s, avg };
    });

    return {
      avgScore, highestScore, lowestScore, totalHours, streak,
      targetAchieved: achieved, targetTotal: total,
      totalSoal: getTotalSoal(), best, worst,
    };
  }

  /* =======================================================================
     6. RENDER: DASHBOARD
     ======================================================================= */

  function renderDashboard() {
    const s = computeSummary();
    const statGrid = document.getElementById("dashboard-stats");
    statGrid.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon"><i class="fa-solid fa-clock"></i></div>
        <p class="stat-value">${s.totalHours.toFixed(1)}j</p>
        <p class="stat-label">Total Jam Belajar</p>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><i class="fa-solid fa-fire"></i></div>
        <p class="stat-value">${s.streak}</p>
        <p class="stat-label">Study Streak (hari)</p>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><i class="fa-solid fa-bullseye"></i></div>
        <p class="stat-value">${targetAverage().toFixed(0)}</p>
        <p class="stat-label">Target Nilai Rata-rata</p>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><i class="fa-solid fa-ranking-star"></i></div>
        <p class="stat-value">${s.targetAchieved}/${s.targetTotal}</p>
        <p class="stat-label">Ranking Target Tercapai</p>
      </div>
    `;

    const level = getCurrentLevel(s.avgScore);
    document.getElementById("dash-level-pill").textContent = level.name;
    document.getElementById("dash-progress-fill").style.width = `${Math.min(100, s.avgScore)}%`;
    document.getElementById("dash-progress-caption").textContent = `Rata-rata nilai: ${s.avgScore.toFixed(1)} / 100`;

    // Mini checklist hari ini
    const dailyData = state.checklistDaily[todayKey()] || {};
    const checklistMini = document.getElementById("dash-checklist-mini");
    if (state.checklistTemplate.length === 0) {
      checklistMini.innerHTML = `<p class="mini-empty">Belum ada checklist.</p>`;
    } else {
      checklistMini.innerHTML = state.checklistTemplate.map((item) => `
        <div class="mini-item ${dailyData[item.id] ? "done" : ""}">
          <i class="fa-solid ${dailyData[item.id] ? "fa-circle-check" : item.icon}"></i>
          <span>${item.text}</span>
        </div>
      `).join("");
    }

    // Mini jadwal hari ini
    const todaySchedule = state.schedule[todayDayName()] || [];
    const jadwalMini = document.getElementById("dash-jadwal-mini");
    if (todaySchedule.length === 0) {
      jadwalMini.innerHTML = `<p class="mini-empty">Tidak ada jadwal hari ini. Nikmati waktu luangmu ✦</p>`;
    } else {
      jadwalMini.innerHTML = todaySchedule.map((item) => `
        <div class="mini-item ${item.done ? "done" : ""}">
          <i class="fa-solid ${item.done ? "fa-circle-check" : "fa-clock"}"></i>
          <span>${item.time} — ${item.subject}</span>
        </div>
      `).join("");
    }
  }

  function targetAverage() {
    const values = Object.values(state.targets);
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + Number(b), 0) / values.length;
  }

  /* =======================================================================
     7. RENDER: JADWAL BELAJAR
     ======================================================================= */

  let activeDay = todayDayName();

  function renderDayTabs() {
    const wrap = document.getElementById("day-tabs");
    wrap.innerHTML = DAYS_ORDERED.map((d) => `
      <button class="day-tab ${d === activeDay ? "active" : ""}" data-day="${d}">${d}</button>
    `).join("");
    wrap.querySelectorAll(".day-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeDay = btn.dataset.day;
        renderDayTabs();
        renderScheduleTable();
      });
    });
  }

  function renderScheduleTable() {
    const tbody = document.getElementById("schedule-tbody");
    const list = state.schedule[activeDay] || [];
    const emptyHint = document.getElementById("schedule-empty");

    if (list.length === 0) {
      tbody.innerHTML = "";
      emptyHint.hidden = false;
      return;
    }
    emptyHint.hidden = true;

    tbody.innerHTML = list.map((item) => `
      <tr>
        <td>${item.time}</td>
        <td><span class="subj-badge"><span class="subj-dot"></span>${item.subject}</span></td>
        <td><button class="checkbox-round ${item.done ? "checked" : ""}" data-id="${item.id}" data-action="toggle-schedule"><i class="fa-solid fa-check"></i></button></td>
        <td><button class="row-btn" data-id="${item.id}" data-action="delete-schedule"><i class="fa-solid fa-trash"></i></button></td>
      </tr>
    `).join("");

    tbody.querySelectorAll('[data-action="toggle-schedule"]').forEach((btn) => {
      btn.addEventListener("click", () => toggleScheduleDone(btn.dataset.id));
    });
    tbody.querySelectorAll('[data-action="delete-schedule"]').forEach((btn) => {
      btn.addEventListener("click", () => deleteScheduleItem(btn.dataset.id));
    });
  }

  function toggleScheduleDone(id) {
    const list = state.schedule[activeDay];
    const item = list.find((i) => i.id === id);
    if (!item) return;
    item.done = !item.done;
    if (item.done && activeDay === todayDayName()) {
      logStudyDay();
    }
    persist("schedule");
    renderScheduleTable();
    renderDashboard();
    showToast(item.done ? `${item.subject} ditandai selesai` : `${item.subject} ditandai belum selesai`, "success");
  }

  function deleteScheduleItem(id) {
    state.schedule[activeDay] = state.schedule[activeDay].filter((i) => i.id !== id);
    persist("schedule");
    renderScheduleTable();
    renderDashboard();
  }

  function initJadwal() {
    renderDayTabs();
    renderScheduleTable();
    document.getElementById("btn-add-jadwal").addEventListener("click", () => {
      const time = prompt("Masukkan jam (contoh: 19.00 - 20.00):");
      if (!time) return;
      const subject = prompt("Masukkan mata pelajaran:");
      if (!subject) return;
      state.schedule[activeDay].push({
        id: "sch_" + Date.now(),
        time, subject, done: false,
      });
      persist("schedule");
      renderScheduleTable();
      showToast("Jadwal baru ditambahkan", "success");
    });
  }

  /* =======================================================================
     8. RENDER: CHECKLIST HARIAN
     ======================================================================= */

  function renderChecklist() {
    const key = todayKey();
    const dailyData = state.checklistDaily[key] || {};
    document.getElementById("checklist-date").textContent = formatDateID(new Date());

    const wrap = document.getElementById("checklist-big");
    wrap.innerHTML = state.checklistTemplate.map((item) => `
      <div class="check-card ${dailyData[item.id] ? "done" : ""}" data-id="${item.id}">
        <div class="check-icon"><i class="fa-solid ${dailyData[item.id] ? "fa-circle-check" : item.icon}"></i></div>
        <span class="check-text">${item.text}</span>
        <div class="checkbox-round ${dailyData[item.id] ? "checked" : ""}"><i class="fa-solid fa-check"></i></div>
      </div>
    `).join("");

    wrap.querySelectorAll(".check-card").forEach((card) => {
      card.addEventListener("click", () => toggleChecklistItem(card.dataset.id));
    });

    const total = state.checklistTemplate.length;
    const done = state.checklistTemplate.filter((i) => dailyData[i.id]).length;
    const pct = total === 0 ? 0 : (done / total) * 100;
    document.getElementById("checklist-progress-fill").style.width = `${pct}%`;
    document.getElementById("checklist-progress-caption").textContent = `${done} / ${total} selesai`;
  }

  function toggleChecklistItem(itemId) {
    const key = todayKey();
    if (!state.checklistDaily[key]) state.checklistDaily[key] = {};
    const newVal = !state.checklistDaily[key][itemId];
    state.checklistDaily[key][itemId] = newVal;
    persist("checklistDaily");

    if (newVal) {
      logStudyDay();
    }

    const wasComplete = state.checklistTemplate.every((i) => state.checklistDaily[key][i.id]);
    renderChecklist();
    renderDashboard();
    evaluateAchievements();

    if (wasComplete) {
      Confetti.burst(160);
      showToast("Checklist harian 100% selesai! Kerja bagus 🎉", "success");
    }
  }

  function logStudyDay() {
    const key = todayKey();
    if (!state.studyLog.includes(key)) {
      state.studyLog.push(key);
      persist("studyLog");
    }
  }

  function formatDateID(date) {
    const days = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
    return `${days[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  }

  /* =======================================================================
     9. RENDER: TARGET NILAI
     ======================================================================= */

  function renderTarget() {
    const grid = document.getElementById("target-grid");
    grid.innerHTML = Object.keys(state.targets).map((subject) => `
      <div class="target-card">
        <span class="subject-name"><span class="subject-dot"></span>${subject}</span>
        <div class="target-input-wrap">
          <input type="number" class="target-num-input" min="0" max="100" value="${state.targets[subject]}" data-subject="${subject}" />
        </div>
      </div>
    `).join("");

    grid.querySelectorAll(".target-num-input").forEach((input) => {
      input.addEventListener("change", () => {
        let val = Number(input.value);
        if (isNaN(val)) val = 0;
        val = Math.max(0, Math.min(100, val));
        input.value = val;
        state.targets[input.dataset.subject] = val;
        persist("targets");
        showToast(`Target ${input.dataset.subject} diperbarui ke ${val}`, "success");
        renderDashboard();
      });
    });
  }

  /* =======================================================================
     10. RENDER: TRACKER NILAI
     ======================================================================= */

  let activeTrackerSubject = Object.keys(state.targets)[0];

  function renderTrackerSelect() {
    const select = document.getElementById("tracker-subject-select");
    select.innerHTML = Object.keys(state.targets).map((s) => `<option value="${s}">${s}</option>`).join("");
    select.value = activeTrackerSubject;
    select.addEventListener("change", () => {
      activeTrackerSubject = select.value;
      renderScoreList();
    });
  }

  function renderScoreList() {
    const list = state.scores[activeTrackerSubject] || [];
    const wrap = document.getElementById("score-list");
    if (list.length === 0) {
      wrap.innerHTML = `<p class="score-empty">Belum ada nilai untuk ${activeTrackerSubject}. Tambahkan nilai ulanganmu ✦</p>`;
      return;
    }
    wrap.innerHTML = list.map((entry) => `
      <div class="score-item">
        <span class="score-label">${entry.label}</span>
        <span class="score-value">${entry.value}</span>
        <button class="row-btn" data-id="${entry.id}" data-action="delete-score"><i class="fa-solid fa-trash"></i></button>
      </div>
    `).join("");
    wrap.querySelectorAll('[data-action="delete-score"]').forEach((btn) => {
      btn.addEventListener("click", () => deleteScore(btn.dataset.id));
    });
  }

  function addScore() {
    const labelInput = document.getElementById("tracker-label-input");
    const scoreInput = document.getElementById("tracker-score-input");
    const label = labelInput.value.trim();
    let value = Number(scoreInput.value);

    if (!label) { showToast("Isi nama ulangan terlebih dahulu", "warn"); return; }
    if (isNaN(value)) { showToast("Isi nilai yang valid", "warn"); return; }
    value = Math.max(0, Math.min(100, value));

    if (!state.scores[activeTrackerSubject]) state.scores[activeTrackerSubject] = [];
    state.scores[activeTrackerSubject].push({ id: "sc_" + Date.now(), label, value });
    persist("scores");

    labelInput.value = "";
    scoreInput.value = "";
    renderScoreList();
    renderDashboard();
    evaluateAchievements();
    showToast(`Nilai ${label}: ${value} ditambahkan`, "success");

    if (value >= 95) {
      Confetti.burst(120);
      showToast("Nilai 95+! Prestasi luar biasa ⭐", "success");
    }
  }

  function deleteScore(id) {
    state.scores[activeTrackerSubject] = (state.scores[activeTrackerSubject] || []).filter((e) => e.id !== id);
    persist("scores");
    renderScoreList();
    renderDashboard();
  }

  function initTracker() {
    renderTrackerSelect();
    renderScoreList();
    document.getElementById("btn-add-score").addEventListener("click", addScore);
  }

  /* =======================================================================
     10b. UTIL: MENUNGGU LIBRARY CDN (Chart.js/jsPDF/XLSX) DENGAN RETRY
     Mencegah fitur "diam-diam kosong" jika CDN lambat/gagal termuat —
     kita tampilkan status ke user dan otomatis render ulang saat siap.
     ======================================================================= */

  function waitForGlobal(checkFn, { timeout = 20000, interval = 400 } = {}) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      (function tick() {
        if (checkFn()) return resolve(true);
        if (Date.now() - start > timeout) return reject(new Error("timeout"));
        setTimeout(tick, interval);
      })();
    });
  }

  /* =======================================================================
     11. RENDER: GRAFIK (Chart.js)
     ======================================================================= */

  let lineChart = null, barChart = null, pieChart = null;
  let chartLibRetrying = false;

  const CHART_RED = "#FF3B30";
  const CHART_RED_2 = "#2F5AFF";
  const CHART_TEXT = "#111111";
  const CHART_GRID = "rgba(17,17,17,.12)";

  function setChartStatus(message, showRetryBtn) {
    document.querySelectorAll(".chart-wrap").forEach((wrap) => {
      let hint = wrap.querySelector(".chart-status-hint");
      const canvas = wrap.querySelector("canvas");
      if (!message) {
        if (hint) hint.remove();
        if (canvas) canvas.style.visibility = "visible";
        return;
      }
      if (canvas) canvas.style.visibility = "hidden";
      if (!hint) {
        hint = document.createElement("div");
        hint.className = "chart-status-hint";
        wrap.appendChild(hint);
      }
      hint.innerHTML = `
        <i class="fa-solid ${showRetryBtn ? "fa-triangle-exclamation" : "fa-spinner fa-spin"}"></i>
        <span>${message}</span>
        ${showRetryBtn ? '<button type="button" class="btn-outline chart-retry-btn">Coba Lagi</button>' : ""}
      `;
      if (showRetryBtn) {
        hint.querySelector(".chart-retry-btn").addEventListener("click", () => renderCharts());
      }
    });
  }

  function renderCharts() {
    if (typeof Chart === "undefined") {
      setChartStatus("Memuat grafik…", false);
      if (chartLibRetrying) return;
      chartLibRetrying = true;
      waitForGlobal(() => typeof Chart !== "undefined", { timeout: 20000 })
        .then(() => {
          chartLibRetrying = false;
          setChartStatus(null);
          renderChartsInner();
        })
        .catch(() => {
          chartLibRetrying = false;
          setChartStatus("Grafik gagal dimuat. Periksa koneksi internet.", true);
        });
      return;
    }
    setChartStatus(null);
    renderChartsInner();
  }

  function renderChartsInner() {
    try {
      renderLineChart();
      renderBarChart();
      renderPieChart();
    } catch (e) {
      console.warn("Gagal merender grafik:", e);
      setChartStatus("Terjadi kesalahan saat merender grafik.", true);
    }
  }

  function renderLineChart() {
    const ctx = document.getElementById("chart-line");
    const flat = getAllScoresFlat();
    const labels = flat.map((s) => `${s.subject} • ${s.label}`);
    const data = flat.map((s) => s.value);

    if (lineChart) lineChart.destroy();
    lineChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels.length ? labels : ["Belum ada data"],
        datasets: [{
          label: "Nilai",
          data: data.length ? data : [0],
          borderColor: CHART_RED,
          backgroundColor: "rgba(255,45,45,.15)",
          pointBackgroundColor: CHART_RED_2,
          pointRadius: 4,
          tension: 0.35,
          fill: true,
        }],
      },
      options: chartBaseOptions({ y: { min: 0, max: 100 } }),
    });
  }

  function renderBarChart() {
    const ctx = document.getElementById("chart-bar");
    const subjects = Object.keys(state.targets);
    const data = subjects.map((s) => getSubjectAverage(s) || 0);

    if (barChart) barChart.destroy();
    barChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: subjects,
        datasets: [{
          label: "Rata-rata Nilai",
          data,
          backgroundColor: subjects.map((_, i) => i % 2 === 0 ? CHART_RED : CHART_RED_2),
          borderRadius: 8,
          maxBarThickness: 38,
        }],
      },
      options: chartBaseOptions({ y: { min: 0, max: 100 } }),
    });
  }

  function renderPieChart() {
    const ctx = document.getElementById("chart-pie");
    const { achieved, total } = getTargetAchievedCount();
    const belum = total - achieved;

    if (pieChart) pieChart.destroy();
    pieChart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: ["Tercapai", "Belum Tercapai"],
        datasets: [{
          data: [achieved, belum],
          backgroundColor: [CHART_RED, "rgba(255,255,255,.12)"],
          borderColor: "#111111",
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { color: CHART_TEXT, font: { family: "Space Grotesk", weight: "700" } } } },
      },
    });
  }

  function chartBaseOptions(extra = {}) {
    return {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: CHART_TEXT, font: { size: 10, family: "Space Grotesk", weight: "700" } }, grid: { color: CHART_GRID } },
        y: { ticks: { color: CHART_TEXT, font: { family: "Space Grotesk", weight: "700" } }, grid: { color: CHART_GRID }, ...extra.y },
      },
    };
  }

  /* =======================================================================
     12. RENDER: PROGRESS JUARA 1
     ======================================================================= */

  function renderProgress() {
    const avg = getOverallAverage();
    const level = getCurrentLevel(avg);
    const levelIdx = getLevelIndex(level.name);

    document.getElementById("level-name").textContent = level.name;
    document.getElementById("level-avg").textContent = `Rata-rata nilai: ${avg.toFixed(1)} / 100`;
    document.getElementById("level-progress-fill").style.width = `${Math.min(100, avg)}%`;
    document.getElementById("level-orb").innerHTML = `<i class="fa-solid ${level.icon}"></i>`;

    const stepsWrap = document.getElementById("level-steps");
    stepsWrap.innerHTML = LEVELS.map((l, idx) => `
      <div class="level-step ${idx <= levelIdx ? "reached" : ""}">
        <i class="fa-solid ${l.icon}"></i>${l.name}
      </div>
    `).join("");
  }

  /* =======================================================================
     13. RENDER: STATISTIK
     ======================================================================= */

  function renderStatistik() {
    const s = computeSummary();
    const grid = document.getElementById("statistik-grid");
    const rows = [
      { icon: "fa-list-ol", label: "Total Soal", value: s.totalSoal },
      { icon: "fa-clock", label: "Total Jam Belajar", value: `${s.totalHours.toFixed(1)}j` },
      { icon: "fa-arrow-trend-up", label: "Nilai Tertinggi", value: s.highestScore || "-" },
      { icon: "fa-arrow-trend-down", label: "Nilai Terendah", value: s.lowestScore || "-" },
      { icon: "fa-star", label: "Mapel Terbaik", value: s.best ? `${s.best.subject}` : "-" },
      { icon: "fa-triangle-exclamation", label: "Mapel Terlemah", value: s.worst ? `${s.worst.subject}` : "-" },
      { icon: "fa-percent", label: "Persentase Target", value: s.targetTotal ? `${Math.round((s.targetAchieved / s.targetTotal) * 100)}%` : "0%" },
      { icon: "fa-fire", label: "Study Streak", value: `${s.streak} hari` },
    ];
    grid.innerHTML = rows.map((r) => `
      <div class="stat-card">
        <div class="stat-icon"><i class="fa-solid ${r.icon}"></i></div>
        <p class="stat-value">${r.value}</p>
        <p class="stat-label">${r.label}</p>
      </div>
    `).join("");
  }

  /* =======================================================================
     14. POMODORO TIMER
     ======================================================================= */

  const Pomodoro = (() => {
    const FOCUS_SEC = 25 * 60;
    const BREAK_SEC = 5 * 60;
    const CIRCUMFERENCE = 565.48;

    let remaining = FOCUS_SEC;
    let mode = "focus"; // focus | break
    let running = false;
    let intervalId = null;

    const elTime = document.getElementById("pomodoro-time");
    const elMode = document.getElementById("pomodoro-mode");
    const elRing = document.getElementById("pomodoro-ring-fill");
    const elCount = document.getElementById("pomodoro-count");
    const btnStart = document.getElementById("btn-pomo-start");

    function format(sec) {
      const m = String(Math.floor(sec / 60)).padStart(2, "0");
      const s = String(sec % 60).padStart(2, "0");
      return `${m}:${s}`;
    }

    function render() {
      elTime.textContent = format(remaining);
      elMode.textContent = mode === "focus" ? "Fokus Belajar" : "Istirahat";
      const total = mode === "focus" ? FOCUS_SEC : BREAK_SEC;
      const ratio = remaining / total;
      elRing.style.strokeDashoffset = `${CIRCUMFERENCE * (1 - ratio)}`;
      btnStart.innerHTML = running
        ? '<i class="fa-solid fa-pause"></i> Jeda'
        : '<i class="fa-solid fa-play"></i> Mulai';
      const count = state.pomodoroSessions[todayKey()] || 0;
      elCount.textContent = `Sesi selesai hari ini: ${count}`;
    }

    function playBeep() {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        [0, 0.25, 0.5].forEach((delay) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = 880;
          gain.gain.setValueAtTime(0.15, ctx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.22);
          osc.connect(gain).connect(ctx.destination);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + 0.24);
        });
      } catch (e) { /* audio tidak tersedia, abaikan */ }
    }

    function tick() {
      remaining--;
      if (remaining < 0) {
        playBeep();
        if (mode === "focus") {
          const key = todayKey();
          state.pomodoroSessions[key] = (state.pomodoroSessions[key] || 0) + 1;
          persist("pomodoroSessions");
          logStudyDay();
          showToast("Sesi fokus selesai! Waktunya istirahat 🎉", "success");
          Confetti.burst(80);
          mode = "break";
          remaining = BREAK_SEC;
          renderDashboard();
          evaluateAchievements();
        } else {
          showToast("Istirahat selesai. Ayo fokus lagi!", "info", "fa-mug-hot");
          mode = "focus";
          remaining = FOCUS_SEC;
        }
      }
      render();
    }

    function start() {
      if (running) { pause(); return; }
      running = true;
      intervalId = setInterval(tick, 1000);
      render();
    }
    function pause() {
      running = false;
      clearInterval(intervalId);
      render();
    }
    function reset() {
      pause();
      mode = "focus";
      remaining = FOCUS_SEC;
      render();
    }
    function skip() {
      pause();
      mode = mode === "focus" ? "break" : "focus";
      remaining = mode === "focus" ? FOCUS_SEC : BREAK_SEC;
      render();
    }

    function init() {
      document.getElementById("btn-pomo-start").addEventListener("click", start);
      document.getElementById("btn-pomo-reset").addEventListener("click", reset);
      document.getElementById("btn-pomo-skip").addEventListener("click", skip);
      render();
    }

    return { init, render };
  })();

  /* =======================================================================
     15. KALENDER
     ======================================================================= */

  let calendarCursor = new Date();

  function renderCalendar() {
    const label = document.getElementById("cal-month-label");
    label.textContent = `${MONTHS[calendarCursor.getMonth()]} ${calendarCursor.getFullYear()}`;

    const grid = document.getElementById("calendar-grid");
    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const logSet = new Set(state.studyLog);
    const todayStr = todayKey();

    let html = "";
    for (let i = 0; i < firstDay; i++) html += `<div class="cal-cell empty"></div>`;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const isToday = dateStr === todayStr;
      const isDone = logSet.has(dateStr);
      html += `<div class="cal-cell ${isDone ? "done" : ""} ${isToday ? "today" : ""}">${day}</div>`;
    }
    grid.innerHTML = html;
  }

  function initCalendar() {
    document.getElementById("cal-prev").addEventListener("click", () => {
      calendarCursor.setMonth(calendarCursor.getMonth() - 1);
      renderCalendar();
    });
    document.getElementById("cal-next").addEventListener("click", () => {
      calendarCursor.setMonth(calendarCursor.getMonth() + 1);
      renderCalendar();
    });
  }

  /* =======================================================================
     16. ACHIEVEMENT
     ======================================================================= */

  function renderAchievement() {
    const s = computeSummary();
    const summaryForCheck = {
      totalHours: s.totalHours, streak: s.streak,
      highestScore: s.highestScore, avgScore: s.avgScore,
    };
    const grid = document.getElementById("badge-grid");
    grid.innerHTML = BADGES.map((b) => {
      const unlocked = b.check(summaryForCheck);
      return `
        <div class="badge-card ${unlocked ? "unlocked" : ""}">
          <span class="badge-emoji">${b.emoji}</span>
          <p class="badge-name">${b.name}</p>
          <p class="badge-desc">${b.desc}</p>
        </div>
      `;
    }).join("");
  }

  function evaluateAchievements() {
    const s = computeSummary();
    const summaryForCheck = {
      totalHours: s.totalHours, streak: s.streak,
      highestScore: s.highestScore, avgScore: s.avgScore,
    };
    BADGES.forEach((b) => {
      const unlocked = b.check(summaryForCheck);
      const alreadyUnlocked = state.achievementsUnlocked.includes(b.id);
      if (unlocked && !alreadyUnlocked) {
        state.achievementsUnlocked.push(b.id);
        persist("achievementsUnlocked");
        Confetti.burst(180);
        showToast(`Achievement baru: ${b.emoji} ${b.name}!`, "success");
      }
    });
  }

  /* =======================================================================
     17. EXPORT & BACKUP
     ======================================================================= */

  function exportPDF() {
    if (!window.jspdf) {
      showToast("Modul PDF sedang dimuat, mencoba lagi…", "info", "fa-spinner");
      waitForGlobal(() => !!window.jspdf, { timeout: 15000 })
        .then(exportPDF)
        .catch(() => showToast("Modul PDF gagal dimuat. Periksa koneksi internet lalu coba lagi.", "warn"));
      return;
    }
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      const s = computeSummary();
      let y = 18;

      doc.setFontSize(18);
      doc.setTextColor(255, 45, 45);
      doc.text("Study Planner Premium — Ringkasan", 14, y);
      y += 10;
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      doc.text(`Tanggal ekspor: ${formatDateID(new Date())}`, 14, y);
      y += 10;

      doc.setFontSize(13);
      doc.setTextColor(0, 0, 0);
      doc.text("Statistik Umum", 14, y); y += 7;
      doc.setFontSize(10);
      [
        `Total Jam Belajar: ${s.totalHours.toFixed(1)} jam`,
        `Study Streak: ${s.streak} hari`,
        `Rata-rata Nilai: ${s.avgScore.toFixed(1)}`,
        `Nilai Tertinggi: ${s.highestScore}`,
        `Nilai Terendah: ${s.lowestScore}`,
        `Target Tercapai: ${s.targetAchieved}/${s.targetTotal}`,
        `Level: ${getCurrentLevel(s.avgScore).name}`,
      ].forEach((line) => { doc.text(line, 14, y); y += 6; });

      y += 4;
      doc.setFontSize(13);
      doc.text("Target & Rata-rata Nilai per Mapel", 14, y); y += 7;
      doc.setFontSize(10);
      Object.keys(state.targets).forEach((subject) => {
        const avg = getSubjectAverage(subject);
        doc.text(`${subject}: target ${state.targets[subject]} | rata-rata ${avg !== null ? avg.toFixed(1) : "-"}`, 14, y);
        y += 6;
      });

      doc.save("study-planner-ringkasan.pdf");
      showToast("PDF berhasil diunduh", "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal membuat PDF", "warn");
    }
  }

  function exportExcel() {
    if (typeof XLSX === "undefined") {
      showToast("Modul Excel sedang dimuat, mencoba lagi…", "info", "fa-spinner");
      waitForGlobal(() => typeof XLSX !== "undefined", { timeout: 15000 })
        .then(exportExcel)
        .catch(() => showToast("Modul Excel gagal dimuat. Periksa koneksi internet lalu coba lagi.", "warn"));
      return;
    }
    try {
      const wb = XLSX.utils.book_new();

      // Sheet Nilai
      const scoreRows = [["Mata Pelajaran", "Ulangan", "Nilai"]];
      getAllScoresFlat().forEach((s) => scoreRows.push([s.subject, s.label, s.value]));
      const wsScores = XLSX.utils.aoa_to_sheet(scoreRows);
      XLSX.utils.book_append_sheet(wb, wsScores, "Nilai");

      // Sheet Jadwal
      const schedRows = [["Hari", "Jam", "Mata Pelajaran", "Status"]];
      DAYS_ORDERED.forEach((day) => {
        (state.schedule[day] || []).forEach((item) => {
          schedRows.push([day, item.time, item.subject, item.done ? "Selesai" : "Belum"]);
        });
      });
      const wsSched = XLSX.utils.aoa_to_sheet(schedRows);
      XLSX.utils.book_append_sheet(wb, wsSched, "Jadwal");

      // Sheet Target
      const targetRows = [["Mata Pelajaran", "Target", "Rata-rata"]];
      Object.keys(state.targets).forEach((s) => {
        const avg = getSubjectAverage(s);
        targetRows.push([s, state.targets[s], avg !== null ? avg.toFixed(1) : "-"]);
      });
      const wsTarget = XLSX.utils.aoa_to_sheet(targetRows);
      XLSX.utils.book_append_sheet(wb, wsTarget, "Target");

      XLSX.writeFile(wb, "study-planner-data.xlsx");
      showToast("Excel berhasil diunduh", "success");
    } catch (e) {
      console.error(e);
      showToast("Gagal membuat Excel", "warn");
    }
  }

  function backupJSON() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `study-planner-backup-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Backup JSON berhasil diunduh", "success");
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        Object.keys(data).forEach((key) => {
          if (key in state) {
            state[key] = data[key];
            persist(key);
          }
        });
        showToast("Data berhasil dipulihkan dari backup", "success");
        renderAll();
      } catch (err) {
        console.error(err);
        showToast("File backup tidak valid", "warn");
      }
    };
    reader.readAsText(file);
  }

  function initExport() {
    document.getElementById("btn-export-pdf").addEventListener("click", exportPDF);
    document.getElementById("btn-export-excel").addEventListener("click", exportExcel);
    document.getElementById("btn-backup-json").addEventListener("click", backupJSON);
    document.getElementById("btn-import-json").addEventListener("click", () => {
      document.getElementById("import-file-input").click();
    });
    document.getElementById("import-file-input").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) importJSON(file);
      e.target.value = "";
    });
  }

  /* =======================================================================
     18. RENDER ALL / INIT
     ======================================================================= */

  const RENDERERS = {
    dashboard: renderDashboard,
    jadwal: renderScheduleTable,
    checklist: renderChecklist,
    target: renderTarget,
    tracker: renderScoreList,
    grafik: renderCharts,
    progress: renderProgress,
    statistik: renderStatistik,
    pomodoro: Pomodoro.render,
    kalender: renderCalendar,
    achievement: renderAchievement,
    export: () => {},
  };

  function renderAll() {
    renderDashboard();
    renderDayTabs();
    renderScheduleTable();
    renderChecklist();
    renderTarget();
    renderTrackerSelect();
    renderScoreList();
    renderCharts();
    renderProgress();
    renderStatistik();
    Pomodoro.render();
    renderCalendar();
    renderAchievement();
  }

  function initThemeToggle() {
    // Toggle warna aksen utama antara merah dan biru (khas neo-brutalism multi-warna)
    let useBlue = Store.get("themeBlueAccent", false);
    const apply = () => {
      document.documentElement.style.setProperty("--accent", useBlue ? "#2F5AFF" : "#FF3B30");
      document.documentElement.style.setProperty("--accent-2", useBlue ? "#1E3FCC" : "#E8321A");
    };
    apply();
    document.getElementById("theme-toggle").addEventListener("click", () => {
      useBlue = !useBlue;
      Store.set("themeBlueAccent", useBlue);
      apply();
      showToast("Warna aksen diperbarui", "info", "fa-palette");
    });
  }

  function init() {
    attachRipple();
    initNavigation();
    initJadwal();
    initTracker();
    Pomodoro.init();
    initCalendar();
    initExport();
    initThemeToggle();

    renderAll();
    evaluateAchievements();

    // Sapaan dinamis berdasarkan jam
    const hour = new Date().getHours();
    const greeting = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 18 ? "Selamat sore" : "Selamat malam";
    document.getElementById("greet-hello").textContent = `${greeting}, Gilang 👋`;

    // Sembunyikan loading screen
    setTimeout(() => {
      document.getElementById("loading-screen").classList.add("hide");
    }, 900);

    // Registrasi Service Worker untuk PWA
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch((err) => {
          console.warn("Service worker registration failed:", err);
        });
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
