const STORAGE_KEY = "smartAttendancePrototype_v1";

const seedStudents = [
  { id: "s1", name: "Disha Dagar", roll: "2501331520081", section: "B.Tech CSE (AI)" },
  { id: "s2", name: "Jyoti Gangwar", roll: "2501331520105", section: "B.Tech CSE (AI)" },
  { id: "s3", name: "Divya Bhardwaj", roll: "2501331520082", section: "B.Tech CSE (AI)" },
  { id: "s4", name: "Kashaf Naaz", roll: "2501331520112", section: "B.Tech CSE (AI)" },
  { id: "s5", name: "Ishita Singh", roll: "2501331520100", section: "B.Tech CSE (AI)" }
];

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (error) {
    console.warn("Could not read saved attendance data.", error);
  }
  return { students: seedStudents, sessions: [], records: [], activeSessionId: null };
}
let state = loadState();
let toastTimer;

const $ = (id) => document.getElementById(id);
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const prettyDate = (value) => {
  if (!value) return "—";
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};
const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[ch]));
const initials = (name) => String(name).trim().split(/\s+/).slice(0,2).map(p => p[0] || "").join("").toUpperCase();
const saveState = () => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (error) { showToast("Could not save data in this browser."); }
};
function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}
function currentSession() {
  return state.sessions.find(s => s.id === state.activeSessionId) || null;
}
function goTo(page) {
  document.querySelectorAll(".page").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(el => el.classList.toggle("active", el.dataset.page === page));
  $(`${page}Page`).classList.add("active");
  const titles = { dashboard: "Dashboard", attendance: "Mark Attendance", students: "Student Records", reports: "Attendance Reports" };
  $("pageTitle").textContent = titles[page] || "Dashboard";
  renderAll();
}
document.querySelectorAll("[data-page]").forEach(btn => btn.addEventListener("click", () => goTo(btn.dataset.page)));
document.querySelectorAll("[data-goto]").forEach(btn => btn.addEventListener("click", () => goTo(btn.dataset.goto)));
$("todayLabel").textContent = new Date().toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
$("sessionDate").value = todayISO();

function renderAll() {
  renderDashboard();
  renderAttendance();
  renderStudents();
  renderReports();
}
function renderDashboard() {
  $("totalStudents").textContent = state.students.length;
  $("totalSessions").textContent = state.sessions.length;
  const todaySessions = state.sessions.filter(s => s.date === todayISO()).map(s => s.id);
  const todayPresent = new Set(state.records.filter(r => todaySessions.includes(r.sessionId) && r.status === "Present").map(r => r.studentId));
  $("presentToday").textContent = todayPresent.size;
  const perStudent = state.students.map(s => state.records.filter(r => r.studentId === s.id));
  const total = perStudent.reduce((sum, arr) => sum + arr.length, 0);
  const present = state.records.filter(r => r.status === "Present").length;
  $("averageAttendance").textContent = total ? `${Math.round(present / total * 100)}%` : "0%";
  const rows = [...state.records].sort((a,b) => b.markedAt - a.markedAt).slice(0,5);
  $("recentTable").innerHTML = rows.length ? rows.map(r => {
    const student = state.students.find(s => s.id === r.studentId);
    const session = state.sessions.find(s => s.id === r.sessionId);
    if (!student || !session) return "";
    return `<tr><td><div class="person-cell"><span class="person-avatar">${escapeHTML(initials(student.name))}</span><span><strong>${escapeHTML(student.name)}</strong><small>${escapeHTML(student.roll)}</small></span></div></td><td>${escapeHTML(session.course)}</td><td>${prettyDate(session.date)}</td><td><span class="status ${r.status.toLowerCase()}">${r.status}</span></td></tr>`;
  }).join("") : `<tr><td colspan="4" class="empty-state">No attendance recorded yet. Create a session to get started.</td></tr>`;
}
function renderAttendance() {
  const session = currentSession();
  $("activeSessionLabel").textContent = session ? `${session.course} · ${session.section} · ${prettyDate(session.date)}` : "No active session selected";
  $("sessionMessage").textContent = session ? "Session is active. Each student can be recorded only once per session." : "Create a session before marking attendance.";
  const query = $("attendanceSearch").value.trim().toLowerCase();
  const students = state.students.filter(s => `${s.name} ${s.roll} ${s.section}`.toLowerCase().includes(query));
  $("attendanceCount").textContent = `${students.length} student${students.length === 1 ? "" : "s"} shown`;
  $("attendanceTable").innerHTML = students.length ? students.map(s => {
    const record = session && state.records.find(r => r.sessionId === session.id && r.studentId === s.id);
    const statusControl = record ? `<span class="status ${record.status.toLowerCase()}">${record.status}</span>` :
      `<select class="small-select" id="status-${s.id}" aria-label="Status for ${escapeHTML(s.name)}"><option value="Present">Present</option><option value="Absent">Absent</option></select>`;
    const action = record ? `<button class="mark-btn" disabled>Already saved</button>` :
      `<button class="mark-btn" ${session ? "" : "disabled"} data-mark="${s.id}">Save status</button>`;
    return `<tr><td><div class="person-cell"><span class="person-avatar">${escapeHTML(initials(s.name))}</span><span><strong>${escapeHTML(s.name)}</strong><small>${escapeHTML(s.section)}</small></span></div></td><td>${escapeHTML(s.roll)}</td><td>${statusControl}</td><td>${action}</td></tr>`;
  }).join("") : `<tr><td colspan="4" class="empty-state">No students found. Add a student from Student Records.</td></tr>`;
  document.querySelectorAll("[data-mark]").forEach(btn => btn.addEventListener("click", () => markStudent(btn.dataset.mark)));
}
function markStudent(studentId) {
  const session = currentSession();
  if (!session) return showToast("Please create an attendance session first.");
  if (state.records.some(r => r.sessionId === session.id && r.studentId === studentId)) {
    return showToast("Attendance for this student is already recorded in this session.");
  }
  const status = $(`status-${studentId}`)?.value || "Present";
  state.records.push({ id: `r-${Date.now()}-${Math.random().toString(16).slice(2,7)}`, sessionId: session.id, studentId, status, markedAt: Date.now() });
  saveState();
  renderAll();
  showToast(`Attendance saved as ${status}.`);
}
$("createSessionBtn").addEventListener("click", () => {
  const course = $("courseInput").value.trim();
  const section = $("sectionInput").value.trim();
  const date = $("sessionDate").value;
  if (!course || !section || !date) return showToast("Please fill in the course, class and date.");
  const session = { id: `session-${Date.now()}`, course, section, date, createdAt: Date.now() };
  state.sessions.push(session);
  state.activeSessionId = session.id;
  saveState();
  renderAll();
  showToast("New attendance session created.");
});
$("finishSessionBtn").addEventListener("click", () => {
  if (!currentSession()) return showToast("There is no active session to finish.");
  state.activeSessionId = null;
  saveState();
  renderAll();
  showToast("Session finished. Saved records are kept.");
});
$("attendanceSearch").addEventListener("input", renderAttendance);

$("studentForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = $("studentName").value.trim();
  const roll = $("studentRoll").value.trim();
  const section = $("studentSection").value.trim() || "Not specified";
  if (!name || !roll) return;
  if (state.students.some(s => s.roll.toLowerCase() === roll.toLowerCase())) {
    $("studentMessage").textContent = "This roll number already exists. Please use a unique ID.";
    $("studentMessage").style.color = "#bd654b";
    return;
  }
  state.students.push({ id: `student-${Date.now()}`, name, roll, section });
  saveState();
  $("studentForm").reset();
  $("studentSection").value = "B.Tech CSE (AI)";
  $("studentMessage").textContent = `${name} was added successfully.`;
  $("studentMessage").style.color = "#287f68";
  renderAll();
  showToast("Student record added.");
});
$("studentSearch").addEventListener("input", renderStudents);
function renderStudents() {
  const query = $("studentSearch").value.trim().toLowerCase();
  const students = state.students.filter(s => `${s.name} ${s.roll} ${s.section}`.toLowerCase().includes(query));
  $("studentCountBadge").textContent = state.students.length;
  $("studentsTable").innerHTML = students.length ? students.map(s => `<tr><td><div class="person-cell"><span class="person-avatar">${escapeHTML(initials(s.name))}</span><strong>${escapeHTML(s.name)}</strong></div></td><td>${escapeHTML(s.roll)}</td><td>${escapeHTML(s.section)}</td><td><button class="danger-btn" data-delete-student="${s.id}">Remove</button></td></tr>`).join("") : `<tr><td colspan="4" class="empty-state">No students match your search.</td></tr>`;
  document.querySelectorAll("[data-delete-student]").forEach(btn => btn.addEventListener("click", () => {
    const student = state.students.find(s => s.id === btn.dataset.deleteStudent);
    if (!student) return;
    if (!confirm(`Remove ${student.name}? Their attendance records will also be removed.`)) return;
    state.students = state.students.filter(s => s.id !== student.id);
    state.records = state.records.filter(r => r.studentId !== student.id);
    saveState(); renderAll(); showToast("Student and related records removed.");
  }));
}
$("reportSearch").addEventListener("input", renderReports);
function renderReports() {
  const present = state.records.filter(r => r.status === "Present").length;
  const absent = state.records.filter(r => r.status === "Absent").length;
  $("reportEntries").textContent = state.records.length;
  $("reportPresent").textContent = present;
  $("reportAbsent").textContent = absent;
  $("reportAverage").textContent = state.records.length ? `${Math.round(present / state.records.length * 100)}%` : "0%";
  const query = $("reportSearch").value.trim().toLowerCase();
  const students = state.students.filter(s => `${s.name} ${s.roll}`.toLowerCase().includes(query));
  $("reportTable").innerHTML = students.length ? students.map(s => {
    const records = state.records.filter(r => r.studentId === s.id);
    const p = records.filter(r => r.status === "Present").length;
    const a = records.filter(r => r.status === "Absent").length;
    const percent = records.length ? Math.round(p / records.length * 100) : 0;
    return `<tr><td><div class="person-cell"><span class="person-avatar">${escapeHTML(initials(s.name))}</span><strong>${escapeHTML(s.name)}</strong></div></td><td>${escapeHTML(s.roll)}</td><td>${records.length}</td><td>${p}</td><td>${a}</td><td><span class="progress-track"><span class="progress-fill" style="display:block;width:${percent}%"></span></span>${percent}%</td></tr>`;
  }).join("") : `<tr><td colspan="6" class="empty-state">No students found.</td></tr>`;
  const sessions = [...state.sessions].sort((a,b) => b.createdAt - a.createdAt);
  $("sessionsTable").innerHTML = sessions.length ? sessions.map(s => {
    const count = state.records.filter(r => r.sessionId === s.id).length;
    return `<tr><td><strong>${escapeHTML(s.course)}</strong></td><td>${escapeHTML(s.section)}</td><td>${prettyDate(s.date)}</td><td>${count}</td></tr>`;
  }).join("") : `<tr><td colspan="4" class="empty-state">No sessions created yet.</td></tr>`;
}
$("exportBtn").addEventListener("click", () => {
  const rows = [["Student Name","Roll Number","Course","Class / Section","Session Date","Status","Marked At"]];
  state.records.forEach(r => {
    const student = state.students.find(s => s.id === r.studentId);
    const session = state.sessions.find(s => s.id === r.sessionId);
    if (student && session) rows.push([student.name, student.roll, session.course, session.section, session.date, r.status, new Date(r.markedAt).toLocaleString()]);
  });
  const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = "smart_attendance_report.csv"; link.click();
  URL.revokeObjectURL(url);
  showToast("CSV report exported.");
});

renderAll();
