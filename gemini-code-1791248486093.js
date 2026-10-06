/**
 * 智慧點名系統 - 主要應用程式邏輯模組
 */

let isAdminLoggedIn = false;

// 頁面載入後初始化
document.addEventListener("DOMContentLoaded", () => {
  initSelectOptions();
  renderTimetable();
  updateLiveTime();
  setInterval(updateLiveTime, 1000);

  // 載入 Webhook 網址至輸入框
  const gasUrlInput = document.getElementById("gas-url-input");
  if (gasUrlInput) gasUrlInput.value = DataStore.getGasUrl();

  // 綁定 Modal 確定按鈕事件
  document.getElementById("btn-admin-login-submit").addEventListener("click", performAdminLogin);
  document.getElementById("btn-add-student-submit").addEventListener("click", handleAddStudent);
  document.getElementById("btn-add-course-submit").addEventListener("click", handleAddCourse);
  document.getElementById("btn-change-pwd-submit").addEventListener("click", handleChangePassword);
});

/* ==================== 模式與視窗切換 ==================== */

function switchMode(mode) {
  const studentBtn = document.getElementById("btn-student-mode");
  const adminBtn = document.getElementById("btn-admin-mode");
  const studentView = document.getElementById("student-view");
  const adminView = document.getElementById("admin-view");

  if (mode === "student") {
    studentBtn.classList.add("active");
    adminBtn.classList.remove("active");
    studentView.classList.add("active");
    adminView.classList.remove("active");
  } else if (mode === "admin") {
    if (!isAdminLoggedIn) {
      openModal("modal-admin-login");
      return;
    }
    adminBtn.classList.add("active");
    studentBtn.classList.remove("active");
    adminView.classList.add("active");
    studentView.classList.remove("active");
    renderAdminTables();
  }
}

function requestAdminLogin() {
  if (isAdminLoggedIn) {
    switchMode("admin");
  } else {
    openModal("modal-admin-login");
  }
}

function performAdminLogin() {
  const pwdInput = document.getElementById("admin-login-pwd");
  const errorDiv = document.getElementById("admin-login-error");
  const pwd = pwdInput.value.trim();

  if (pwd === DataStore.getAdminPassword()) {
    isAdminLoggedIn = true;
    closeModal("modal-admin-login");
    pwdInput.value = "";
    errorDiv.style.display = "none";
    showToast("登入成功！歡迎使用授課老師後台");
    switchMode("admin");
  } else {
    errorDiv.textContent = "密碼錯誤，請重新輸入（預設：8308）";
    errorDiv.style.display = "block";
  }
}

function cancelAdminLogin() {
  closeModal("modal-admin-login");
  document.getElementById("admin-login-pwd").value = "";
  document.getElementById("admin-login-error").style.display = "none";
}

function switchAdminTab(tabName) {
  const tabs = ["records", "students", "courses", "settings"];
  tabs.forEach(t => {
    const btn = document.querySelector(`.tab-btn[onclick="switchAdminTab('${t}')"]`);
    const content = document.getElementById(`tab-${t}`);
    if (btn && content) {
      if (t === tabName) {
        btn.classList.add("active");
        content.classList.add("active");
      } else {
        btn.classList.remove("active");
        content.classList.remove("active");
      }
    }
  });

  if (tabName === "records") renderRecordsTable();
  if (tabName === "students") renderStudentsTable();
  if (tabName === "courses") renderCoursesTable();
}

/* ==================== 下拉選單與 UI 渲染 ==================== */

function updateLiveTime() {
  const timeElem = document.getElementById("checkin-time");
  if (timeElem) {
    const now = new Date();
    timeElem.value = now.getFullYear() + "-" +
      String(now.getMonth() + 1).padStart(2, "0") + "-" +
      String(now.getDate()).padStart(2, "0") + " " +
      String(now.getHours()).padStart(2, "0") + ":" +
      String(now.getMinutes()).padStart(2, "0") + ":" +
      String(now.getSeconds()).padStart(2, "0");
  }
}

function initSelectOptions() {
  const studentSelect = document.getElementById("student-select");
  const courseSelect = document.getElementById("course-select");
  const periodSelect = document.getElementById("new-course-period");

  const students = DataStore.getStudents();
  studentSelect.innerHTML = '<option value="">-- 請選擇學生 --</option>';
  students.forEach(s => {
    studentSelect.innerHTML += `<option value="${s.id}">${s.name} (${s.id})</option>`;
  });

  const courses = DataStore.getCourses();
  courseSelect.innerHTML = '<option value="">-- 請選擇課程 --</option>';
  courses.forEach(c => {
    courseSelect.innerHTML += `<option value="${c.id}">${c.name} - ${c.teacher}</option>`;
  });

  const timeSlots = DataStore.getTimeSlots();
  if (periodSelect) {
    periodSelect.innerHTML = "";
    timeSlots.forEach(slot => {
      periodSelect.innerHTML += `<option value="${slot.period}">第 ${slot.period} 節 (${slot.start})</option>`;
    });
  }
}

function onStudentSelectChange() {
  const studentId = document.getElementById("student-select").value;
  const deptInput = document.getElementById("student-dept-display");
  const students = DataStore.getStudents();
  const student = students.find(s => s.id === studentId);
  deptInput.value = student ? student.dept : "";
}

function onCourseSelectChange() {
  const courseId = document.getElementById("course-select").value;
  const teacherInput = document.getElementById("teacher-display");
  const courses = DataStore.getCourses();
  const course = courses.find(c => c.id === courseId);
  teacherInput.value = course ? course.teacher : "";
}

/* ==================== 簽到邏輯與 Google Sheets 同步 ==================== */

async function submitCheckin() {
  const studentId = document.getElementById("student-select").value;
  const courseId = document.getElementById("course-select").value;
  const status = document.getElementById("attendance-status").value;
  const timestamp = document.getElementById("checkin-time").value;

  if (!studentId || !courseId) {
    showToast("⚠️ 請務必選擇學生與點名課程！");
    return;
  }

  const student = DataStore.getStudents().find(s => s.id === studentId);
  const course = DataStore.getCourses().find(c => c.id === courseId);

  const record = {
    id: Date.now().toString(),
    timestamp,
    studentId: student.id,
    studentName: student.name,
    department: student.dept,
    courseName: course.name,
    teacherName: course.teacher,
    status
  };

  DataStore.addRecord(record);
  showToast("✅ 本地點名紀錄成功！");

  const syncStatusElem = document.getElementById("webhook-sync-status");
  syncStatusElem.textContent = "Google Sheets: 同步中...";

  const result = await sendToGoogleSheets(record);
  if (result.success) {
    syncStatusElem.textContent = "Google Sheets: 已同步成功";
    syncStatusElem.style.color = "var(--status-present)";
  } else {
    syncStatusElem.textContent = "Google Sheets: " + result.message;
    syncStatusElem.style.color = "var(--status-absent)";
  }
}

/* ==================== 週課表渲染（支援跨節顯示） ==================== */

function renderTimetable() {
  const tbody = document.getElementById("student-timetable-body");
  if (!tbody) return;

  const timeSlots = DataStore.getTimeSlots();
  const courses = DataStore.getCourses();
  tbody.innerHTML = "";

  timeSlots.forEach(slot => {
    let rowHtml = `<tr>
      <td><strong>第 ${slot.period} 節</strong><br><small class="text-muted">${slot.start}-${slot.end}</small></td>`;

    for (let day = 1; day <= 5; day++) {
      // 搜尋涵蓋此節次的課程
      const course = courses.find(c => c.day === day && (slot.period >= c.period && slot.period < c.period + (c.periods || 1)));

      if (course) {
        rowHtml += `<td>
          <div class="timetable-cell-course">
            <strong>${course.name}</strong><br>
            <small>${course.teacher} | ${course.room}</small>
          </div>
        </td>`;
      } else {
        rowHtml += `<td>-</td>`;
      }
    }

    rowHtml += `</tr>`;
    tbody.innerHTML += rowHtml;
  });
}

/* ==================== 後台表格渲染 ==================== */

function renderAdminTables() {
  renderRecordsTable();
  renderStudentsTable();
  renderCoursesTable();
}

function renderRecordsTable() {
  const tbody = document.getElementById("records-table-body");
  if (!tbody) return;

  const records = DataStore.getRecords();
  const query = (document.getElementById("search-records")?.value || "").toLowerCase();

  const filtered = records.filter(r => 
    r.studentName.toLowerCase().includes(query) ||
    r.studentId.toLowerCase().includes(query) ||
    r.courseName.toLowerCase().includes(query)
  );

  tbody.innerHTML = "";
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color: var(--text-muted);">無簽到紀錄</td></tr>`;
    return;
  }

  filtered.forEach(r => {
    let badgeClass = "badge-present";
    if (r.status === "遲到") badgeClass = "badge-late";
    if (r.status === "請假") badgeClass = "badge-leave";
    if (r.status === "曠課") badgeClass = "badge-absent";

    tbody.innerHTML += `<tr>
      <td>${r.timestamp}</td>
      <td>${r.studentId}</td>
      <td><strong>${r.studentName}</strong></td>
      <td>${r.department}</td>
      <td>${r.courseName}</td>
      <td>${r.teacherName}</td>
      <td><span class="badge ${badgeClass}">${r.status}</span></td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="deleteRecord('${r.id}')">刪除</button>
      </td>
    </tr>`;
  });
}

function deleteRecord(id) {
  let records = DataStore.getRecords();
  records = records.filter(r => r.id !== id);
  DataStore.saveRecords(records);
  renderRecordsTable();
  showToast("已刪除該條簽到紀錄");
}

function clearAllRecords() {
  if (confirm("確定要清空所有點名紀錄嗎？此操作無法撤銷！")) {
    DataStore.saveRecords([]);
    renderRecordsTable();
    showToast("所有簽到紀錄已清空");
  }
}

function renderStudentsTable() {
  const tbody = document.getElementById("students-table-body");
  if (!tbody) return;

  const students = DataStore.getStudents();
  const query = (document.getElementById("search-students")?.value || "").toLowerCase();

  const filtered = students.filter(s => 
    s.name.toLowerCase().includes(query) ||
    s.id.toLowerCase().includes(query)
  );

  tbody.innerHTML = "";
  filtered.forEach(s => {
    tbody.innerHTML += `<tr>
      <td><strong>${s.id}</strong></td>
      <td>${s.name}</td>
      <td>${s.dept}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="deleteStudent('${s.id}')">刪除</button>
      </td>
    </tr>`;
  });
}

function handleAddStudent() {
  const id = document.getElementById("new-student-id").value.trim();
  const name = document.getElementById("new-student-name").value.trim();
  const dept = document.getElementById("new-student-dept").value.trim();

  if (!id || !name || !dept) {
    alert("請完整填寫學生資料");
    return;
  }

  const students = DataStore.getStudents();
  if (students.some(s => s.id === id)) {
    alert("該學號已存在！");
    return;
  }

  students.push({ id, name, dept });
  DataStore.saveStudents(students);
  closeModal("modal-add-student");
  initSelectOptions();
  renderStudentsTable();
  showToast("成功新增學生：" + name);
}

function deleteStudent(id) {
  let students = DataStore.getStudents();
  students = students.filter(s => s.id !== id);
  DataStore.saveStudents(students);
  initSelectOptions();
  renderStudentsTable();
  showToast("已刪除學生資料");
}

function renderCoursesTable() {
  const tbody = document.getElementById("courses-table-body");
  if (!tbody) return;

  const courses = DataStore.getCourses();
  const dayNames = ["", "星期一", "星期二", "星期三", "星期四", "星期五"];

  tbody.innerHTML = "";
  courses.forEach(c => {
    tbody.innerHTML += `<tr>
      <td><strong>${c.name}</strong></td>
      <td>${c.teacher}</td>
      <td>${dayNames[c.day]} 第 ${c.period} 節</td>
      <td>${c.room}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="deleteCourse('${c.id}')">刪除</button>
      </td>
    </tr>`;
  });
}

function handleAddCourse() {
  const name = document.getElementById("new-course-name").value.trim();
  const teacher = document.getElementById("new-course-teacher").value.trim();
  const room = document.getElementById("new-course-room").value.trim();
  const day = parseInt(document.getElementById("new-course-day").value, 10);
  const period = parseInt(document.getElementById("new-course-period").value, 10);

  if (!name || !teacher || !room) {
    alert("請完整填寫課程資料");
    return;
  }

  const courses = DataStore.getCourses();
  const newCourse = {
    id: "C" + Date.now().toString().slice(-4),
    name,
    teacher,
    day,
    period,
    periods: 2,
    room
  };

  courses.push(newCourse);
  DataStore.saveCourses(courses);
  closeModal("modal-add-course");
  initSelectOptions();
  renderCoursesTable();
  renderTimetable();
  showToast("成功新增課程：" + name);
}

function deleteCourse(id) {
  let courses = DataStore.getCourses();
  courses = courses.filter(c => c.id !== id);
  DataStore.saveCourses(courses);
  initSelectOptions();
  renderCoursesTable();
  renderTimetable();
  showToast("已刪除課程");
}

function saveGasUrl() {
  const url = document.getElementById("gas-url-input").value.trim();
  DataStore.saveGasUrl(url);
  showToast("Google Sheets Webhook 網址已儲存");
}

function testGasWebhook() {
  const url = DataStore.getGasUrl();
  if (!url) {
    alert("請先輸入 Webhook URL 並點擊儲存");
    return;
  }
  showToast("正在發送測試封包至 Google Sheets...");
  sendToGoogleSheets({
    timestamp: new Date().toLocaleString(),
    studentId: "TEST001",
    studentName: "測試員",
    department: "測試科系",
    courseName: "系統連線測試",
    teacherName: "管理員",
    status: "出席"
  });
}

function handleChangePassword() {
  const oldPwd = document.getElementById("pwd-old").value;
  const newPwd = document.getElementById("pwd-new").value;
  const confirmPwd = document.getElementById("pwd-confirm").value;

  if (oldPwd !== DataStore.getAdminPassword()) {
    alert("原密碼輸入不正確！");
    return;
  }
  if (!newPwd || newPwd.length < 4) {
    alert("新密碼長度至少需要 4 位數");
    return;
  }
  if (newPwd !== confirmPwd) {
    alert("兩次新密碼輸入不一致！");
    return;
  }

  DataStore.saveAdminPassword(newPwd);
  closeModal("modal-change-password");
  showToast("管理者密碼修改成功！");
}

/* ==================== 匯出功能 (CSV / ICS) ==================== */

function exportAttendanceToCSV() {
  const records = DataStore.getRecords();
  if (records.length === 0) {
    alert("目前無可匯出的點名紀錄！");
    return;
  }

  let csvContent = "\uFEFF點名時間,學號,學生姓名,系所,點名課程,授課教師,簽到狀態\n";
  records.forEach(r => {
    csvContent += `"${r.timestamp}","${r.studentId}","${r.studentName}","${r.department}","${r.courseName}","${r.teacherName}","${r.status}"\n`;
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `點名紀錄匯出_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportTimetableToICS() {
  const courses = DataStore.getCourses();
  const timeSlots = DataStore.getTimeSlots();

  let icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//智慧點名系統//週課表//ZH-TW",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH"
  ];

  courses.forEach(c => {
    const slot = timeSlots.find(s => s.period === c.period);
    const startStr = slot ? slot.start.replace(":", "") + "00" : "080000";
    const endStr = slot ? slot.end.replace(":", "") + "00" : "100000";

    icsContent.push(
      "BEGIN:VEVENT",
      `SUMMARY:${c.name} (${c.teacher})`,
      `LOCATION:${c.room}`,
      `DESCRIPTION:授課教師: ${c.teacher}`,
      `DTSTART;TZID=Asia/Taipei:20260901T${startStr}`,
      `DTEND;TZID=Asia/Taipei:20260901T${endStr}`,
      "RRULE:FREQ=WEEKLY;COUNT=18",
      "END:VEVENT"
    );
  });

  icsContent.push("END:VCALENDAR");

  const blob = new Blob([icsContent.join("\r\n")], { type: "text/calendar;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `個人課表_${new Date().toISOString().slice(0,10)}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ==================== Modal 與 Toast 工具 ==================== */

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("active");
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("active");
}

function showToast(message) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 100);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}