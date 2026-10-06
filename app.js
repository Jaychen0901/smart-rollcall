/* ==========================================================================
   點名系統 (Attendance System) - Main Application Controller
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  startClock();
  setupRoleSwitch();
  populateDropdowns();
  renderFrontEnd();
  renderBackEnd();
  setupEventHandlers();
  loadGSheetConfigUI();
}

/* 1. Real-time Live Clock */
function startClock() {
  const dateEl = document.getElementById('header-date');
  const timeEl = document.getElementById('header-time');

  const updateClock = () => {
    const now = new Date();
    const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const dayStr = days[now.getDay()];

    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');

    if (dateEl) dateEl.innerHTML = `📅 ${year}-${month}-${date} (${dayStr})`;
    if (timeEl) timeEl.textContent = `${hours}:${mins}:${secs}`;
  };

  updateClock();
  setInterval(updateClock, 1000);
}

let isTeacherLoggedIn = false;

/* 2. Role Switcher */
function setupRoleSwitch() {
  const btnStudent = document.getElementById('btn-role-student');
  const btnTeacher = document.getElementById('btn-role-teacher');
  const viewStudent = document.getElementById('view-student-portal');
  const viewTeacher = document.getElementById('view-teacher-portal');

  btnStudent.addEventListener('click', () => {
    btnStudent.classList.add('active');
    btnTeacher.classList.remove('active');
    viewStudent.classList.add('active-view');
    viewTeacher.classList.remove('active-view');
    renderFrontEnd();
  });

  btnTeacher.addEventListener('click', () => {
    if (!isTeacherLoggedIn) {
      document.getElementById('admin-login-pwd').value = '';
      document.getElementById('admin-login-error').style.display = 'none';
      openModal('modal-admin-login');
      setTimeout(() => {
        document.getElementById('admin-login-pwd')?.focus();
      }, 200);
      return;
    }

    btnTeacher.classList.add('active');
    btnStudent.classList.remove('active');
    viewTeacher.classList.add('active-view');
    viewStudent.classList.remove('active-view');
    renderBackEnd();
  });
}

/* 3. Dropdowns Population */
function populateDropdowns() {
  const students = window.dataStore.getStudents();
  const courses = window.dataStore.getCourses();

  // Student Select in Check-in form
  const studentSelect = document.getElementById('checkin-student-select');
  if (studentSelect) {
    studentSelect.innerHTML = students.map(s => 
      `<option value="${s.id}">${s.id} - ${s.name} (${s.department})</option>`
    ).join('');
  }

  // Course Select in Check-in form
  const courseSelect = document.getElementById('checkin-course-select');
  if (courseSelect) {
    courseSelect.innerHTML = courses.map(c => 
      `<option value="${c.id}">${c.name} [授課老師: ${c.teacher}]</option>`
    ).join('');
  }

  // Teacher Filter Select in Admin Backend
  const adminCourseFilter = document.getElementById('admin-course-filter');
  if (adminCourseFilter) {
    adminCourseFilter.innerHTML = `<option value="ALL">全部課程 (${courses.length})</option>` +
      courses.map(c => `<option value="${c.id}">${c.name} - ${c.teacher}</option>`).join('');
  }
}

/* 4. Render Front-End (Student Portal) */
function renderFrontEnd() {
  renderTimetable();
  renderStudentHistory();
  updateHeroBanner();
}

function updateHeroBanner() {
  const courses = window.dataStore.getCourses();
  const now = new Date();
  const todayDay = now.getDay(); // 0=Sun, 1=Mon ... 5=Fri
  const slots = window.dataStore.getTimeSlots();

  const heroTitle = document.getElementById('hero-current-course');
  const heroTeacher = document.getElementById('hero-current-teacher');
  if (!heroTitle || !heroTeacher) return;

  // Find the current or next course today
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const currentTime = currentHour * 60 + currentMin;

  let currentCourse = null;
  for (const slot of slots) {
    const course = courses.find(c => c.day === todayDay && c.period === slot.period);
    if (!course) continue;
    // Parse start time from slot.time e.g. "09:00 - 10:00"
    const timeParts = slot.time.split(' - ');
    if (timeParts.length >= 2) {
      const [sh, sm] = timeParts[0].split(':').map(Number);
      const [eh, em] = timeParts[1].split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      // Account for multi-period courses
      const endPeriodIdx = slots.findIndex(s => s.period === slot.period);
      const spanEnd = endPeriodIdx + (course.periods || 1) - 1;
      const lastSlot = slots[Math.min(spanEnd, slots.length - 1)];
      const lastTimeParts = lastSlot.time.split(' - ');
      const actualEnd = lastTimeParts.length >= 2 
        ? (() => { const [h, m] = lastTimeParts[1].split(':').map(Number); return h * 60 + m; })()
        : endMin;

      if (currentTime >= startMin && currentTime <= actualEnd) {
        currentCourse = course;
        break;
      } else if (currentTime < startMin && !currentCourse) {
        currentCourse = course; // Next upcoming course
      }
    }
  }

  if (currentCourse) {
    heroTitle.textContent = currentCourse.name;
    heroTeacher.textContent = `授課老師：${currentCourse.teacher}`;
  } else {
    // Find the first course of today
    const todayCourses = courses.filter(c => c.day === todayDay);
    if (todayCourses.length > 0) {
      heroTitle.textContent = todayCourses[0].name;
      heroTeacher.textContent = `授課老師：${todayCourses[0].teacher}`;
    } else {
      heroTitle.textContent = '今日無課程安排';
      heroTeacher.textContent = '享受美好的一天 🌟';
    }
  }
}

function renderTimetable() {
  const timetableContainer = document.getElementById('timetable-grid-body');
  if (!timetableContainer) return;

  const courses = window.dataStore.getCourses();
  const todayDay = new Date().getDay(); // 1 = Mon, 5 = Fri, 0 = Sun
  const currentSlots = window.dataStore.getTimeSlots();

  let html = '';
  currentSlots.forEach(slot => {
    html += `<tr>`;
    html += `<td class="period-col"><b>${slot.name}</b><br><small style="color:#64748b">${slot.time}</small></td>`;
    
    // Days 1 to 5 (Mon to Fri)
    for (let day = 1; day <= 5; day++) {
      const isToday = (day === todayDay);
      const course = courses.find(c => c.day === day && c.period === slot.period);
      
      if (course) {
        const highlightClass = isToday ? 'highlight-today' : '';
        html += `<td>
          <div class="course-cell ${highlightClass}" onclick="quickSelectCourse('${course.id}')">
            <span class="c-name">${course.name}</span>
            <span class="c-teacher">👤 ${course.teacher}</span>
            <span class="c-room">📍 ${course.room}</span>
          </div>
        </td>`;
      } else {
        html += `<td class="empty-timetable-slot" onclick="openAddCourseModal(${day}, ${slot.period})" title="點擊以此時段新增課表">
          <div class="add-slot-btn">➕ 新增課表</div>
        </td>`;
      }
    }
    html += `</tr>`;
  });

  timetableContainer.innerHTML = html;
}

window.openAddCourseModal = function(day = 1, period = 1) {
  document.getElementById('new-course-name').value = '';
  document.getElementById('new-course-teacher').value = '';
  document.getElementById('new-course-room').value = '';
  
  const daySelect = document.getElementById('new-course-day');
  if (daySelect) daySelect.value = day;
  
  const periodSelect = document.getElementById('new-course-period');
  if (periodSelect) periodSelect.value = period;

  openModal('modal-add-course');
};

function quickSelectCourse(courseId) {
  const select = document.getElementById('checkin-course-select');
  if (select) {
    select.value = courseId;
    showToast('已選擇課程，請完成簽到', 'warning');
  }
}

function renderStudentHistory() {
  const container = document.getElementById('student-history-tbody');
  if (!container) return;

  const records = window.dataStore.getRecords();
  const students = window.dataStore.getStudents();
  const courses = window.dataStore.getCourses();

  const selectedStudentId = document.getElementById('checkin-student-select')?.value;
  const filtered = selectedStudentId ? records.filter(r => r.studentId === selectedStudentId) : records;

  if (filtered.length === 0) {
    container.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding: 2rem;">尚無簽到紀錄</td></tr>`;
    return;
  }

  container.innerHTML = filtered.slice(0, 8).map(r => {
    const student = students.find(s => s.id === r.studentId) || { name: r.studentId };
    const course = courses.find(c => c.id === r.courseId) || { name: r.courseId, teacher: '授課老師' };
    
    let statusClass = 'present';
    if (r.status === '缺席') statusClass = 'absent';
    if (r.status === '遲到') statusClass = 'late';
    if (r.status === '請假') statusClass = 'leave';

    return `<tr>
      <td>${r.timestamp}</td>
      <td><b>${course.name}</b></td>
      <td>${course.teacher}</td>
      <td><span class="status-pill ${statusClass}">${r.status}</span></td>
      <td>${r.note || '-'}</td>
    </tr>`;
  }).join('');
}

/* 5. Render Back-End (Teacher Admin Dashboard) */
function renderBackEnd() {
  const selectedCourseId = document.getElementById('admin-course-filter')?.value || 'ALL';
  const students = window.dataStore.getStudents();
  const courses = window.dataStore.getCourses();
  const records = window.dataStore.getRecords();
  const todayStr = window.getTodayDateStr();

  // Filter records for today
  let todayRecords = records.filter(r => r.timestamp.startsWith(todayStr));
  if (selectedCourseId !== 'ALL') {
    todayRecords = todayRecords.filter(r => r.courseId === selectedCourseId);
  }

  // Calculate stats
  const totalStudentsCount = students.length;
  let presentCount = 0;
  let lateCount = 0;
  let absentCount = 0;
  let leaveCount = 0;

  students.forEach(s => {
    const rec = todayRecords.find(r => r.studentId === s.id);
    if (!rec) {
      absentCount++;
    } else {
      if (rec.status === '出席') presentCount++;
      else if (rec.status === '遲到') lateCount++;
      else if (rec.status === '請假') leaveCount++;
      else absentCount++;
    }
  });

  // Update Stat Widgets
  document.getElementById('stat-total-val').textContent = totalStudentsCount;
  document.getElementById('stat-present-val').textContent = presentCount;
  document.getElementById('stat-late-val').textContent = lateCount;
  document.getElementById('stat-absent-val').textContent = absentCount;

  const totalWeeklyPeriods = courses.reduce((sum, c) => sum + (c.periods || 2), 0);
  const statPeriodsEl = document.getElementById('stat-periods-val');
  if (statPeriodsEl) statPeriodsEl.textContent = `${totalWeeklyPeriods} 節`;

  // Render Attendance List for Teacher Roll Call
  const rollcallContainer = document.getElementById('admin-rollcall-tbody');
  if (!rollcallContainer) return;

  rollcallContainer.innerHTML = students.map(s => {
    const rec = todayRecords.find(r => r.studentId === s.id);
    const currentStatus = rec ? rec.status : '未到';
    const currentNote = rec ? (rec.note || '') : '';

    return `<tr data-student-id="${s.id}">
      <td>
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <span style="font-size:1.2rem;">${s.avatar}</span>
          <div>
            <strong>${s.name}</strong><br>
            <small style="color:var(--text-muted); font-family:monospace;">${s.id}</small>
          </div>
        </div>
      </td>
      <td>${s.department}</td>
      <td>
        <div class="status-btn-group">
          <button class="status-btn ${currentStatus === '出席' ? 'active-present' : ''}" onclick="updateStudentRollcall('${s.id}', '出席')">出席</button>
          <button class="status-btn ${currentStatus === '遲到' ? 'active-late' : ''}" onclick="updateStudentRollcall('${s.id}', '遲到')">遲到</button>
          <button class="status-btn ${currentStatus === '請假' ? 'active-leave' : ''}" onclick="updateStudentRollcall('${s.id}', '請假')">請假</button>
          <button class="status-btn ${currentStatus === '缺席' || currentStatus === '未到' ? 'active-absent' : ''}" onclick="updateStudentRollcall('${s.id}', '缺席')">缺席</button>
        </div>
      </td>
      <td>
        <input type="text" class="custom-input" style="padding: 0.35rem 0.6rem; font-size: 0.85rem;" 
               placeholder="備註說明..." value="${currentNote}" 
               onchange="updateStudentNote('${s.id}', this.value)" />
      </td>
      <td>
        <small style="color:var(--text-subtle);">${rec ? rec.timestamp.split(' ')[1] : '-'}</small>
      </td>
      <td>
        <button class="btn btn-outline btn-sm" style="color:var(--status-absent); border-color:rgba(239,68,68,0.3); padding:0.25rem 0.5rem;" onclick="deleteStudent('${s.id}')">🗑️ 刪除</button>
      </td>
    </tr>`;
  }).join('');

  renderStudentManagementTable();
  renderTeacherManagementTable();
}

function renderStudentManagementTable() {
  const container = document.getElementById('admin-student-list-tbody');
  if (!container) return;

  const students = window.dataStore.getStudents();
  if (students.length === 0) {
    container.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:1.5rem;">無學生資料</td></tr>`;
    return;
  }

  container.innerHTML = students.map(s => `
    <tr>
      <td><span style="font-family:monospace;">${s.id}</span></td>
      <td><strong>${s.name}</strong></td>
      <td><small style="color:var(--text-muted);">${s.department}</small></td>
      <td style="text-align: right;">
        <button class="btn btn-outline btn-sm" style="color:var(--status-absent); border-color:rgba(239,68,68,0.3); padding:0.2rem 0.5rem; font-size:0.75rem;" onclick="deleteStudent('${s.id}')">
          🗑️ 刪除
        </button>
      </td>
    </tr>
  `).join('');
}

function renderTeacherManagementTable() {
  const container = document.getElementById('admin-course-list-tbody');
  if (!container) return;

  const courses = window.dataStore.getCourses();
  const dayNames = ['', '週一', '週二', '週三', '週四', '週五'];

  if (courses.length === 0) {
    container.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:1.5rem;">無教師/課程資料</td></tr>`;
    return;
  }

  container.innerHTML = courses.map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td>👤 ${c.teacher}</td>
      <td><small style="color:var(--text-muted);">${dayNames[c.day] || ''} 第${c.period}節 (${c.room})</small></td>
      <td style="text-align: right;">
        <button class="btn btn-outline btn-sm" style="color:var(--status-absent); border-color:rgba(239,68,68,0.3); padding:0.2rem 0.5rem; font-size:0.75rem;" onclick="deleteCourse('${c.id}')">
          🗑️ 刪除
        </button>
      </td>
    </tr>
  `).join('');
}

/* Delete Handlers */
window.deleteStudent = function(studentId) {
  const student = window.dataStore.getStudents().find(s => s.id === studentId);
  const studentName = student ? student.name : studentId;

  if (confirm(`確定要刪除學生【${studentName} (${studentId})】嗎？`)) {
    window.dataStore.deleteStudent(studentId);
    showToast(`已成功刪除學生：${studentName}`, 'warning');
    populateDropdowns();
    renderFrontEnd();
    renderBackEnd();
  }
};

window.deleteCourse = function(courseId) {
  const course = window.dataStore.getCourses().find(c => c.id === courseId);
  const courseName = course ? course.name : courseId;

  if (confirm(`確定要刪除課程與授課教師【${courseName}】嗎？`)) {
    window.dataStore.deleteCourse(courseId);
    showToast(`已成功刪除課程/教師：${courseName}`, 'warning');
    populateDropdowns();
    renderFrontEnd();
    renderBackEnd();
  }
};

/* Roll Call Action Functions */
window.updateStudentRollcall = function(studentId, newStatus) {
  const selectedCourseId = document.getElementById('admin-course-filter')?.value;
  const courseId = (selectedCourseId && selectedCourseId !== 'ALL') ? selectedCourseId : window.dataStore.getCourses()[0].id;

  const student = window.dataStore.getStudents().find(s => s.id === studentId);
  const course = window.dataStore.getCourses().find(c => c.id === courseId);

  const record = window.dataStore.addOrUpdateRecord(studentId, courseId, newStatus);
  showToast(`已變更 [${student.name}] 點名狀態為：${newStatus}`, 'success');

  // Trigger Google Sheet sync if Webhook URL set
  if (window.googleSheetsSync.getWebhookUrl()) {
    window.googleSheetsSync.syncAttendanceRecord(record, student, course);
  }

  renderBackEnd();
};

window.updateStudentNote = function(studentId, noteText) {
  const selectedCourseId = document.getElementById('admin-course-filter')?.value;
  const courseId = (selectedCourseId && selectedCourseId !== 'ALL') ? selectedCourseId : window.dataStore.getCourses()[0].id;

  const records = window.dataStore.getRecords();
  const todayStr = window.getTodayDateStr();
  const rec = records.find(r => r.studentId === studentId && r.timestamp.startsWith(todayStr));

  if (rec) {
    rec.note = noteText;
    window.dataStore.saveRecords(records);
    showToast('已更新備註說明', 'success');
  } else {
    window.dataStore.addOrUpdateRecord(studentId, courseId, '出席', noteText);
    showToast('已新增加簽到並紀錄備註', 'success');
  }
};

window.markAllPresent = function() {
  const selectedCourseId = document.getElementById('admin-course-filter')?.value;
  const courseId = (selectedCourseId && selectedCourseId !== 'ALL') ? selectedCourseId : window.dataStore.getCourses()[0].id;

  const students = window.dataStore.getStudents();
  students.forEach(s => {
    window.dataStore.addOrUpdateRecord(s.id, courseId, '出席');
  });

  showToast('全班已一鍵標記為【出席】！', 'success');

  if (window.googleSheetsSync.getWebhookUrl()) {
    window.googleSheetsSync.syncAllRecords();
  }

  renderBackEnd();
};

/* 6. Event Handlers setup */
function setupEventHandlers() {
  // Student Check-in Submit Button
  const btnCheckinSubmit = document.getElementById('btn-checkin-submit');
  if (btnCheckinSubmit) {
    btnCheckinSubmit.addEventListener('click', handleStudentCheckin);
  }

  // Student Select Change listener
  const checkinStudentSelect = document.getElementById('checkin-student-select');
  if (checkinStudentSelect) {
    checkinStudentSelect.addEventListener('change', renderStudentHistory);
  }

  // Admin Course Filter change
  const adminCourseFilter = document.getElementById('admin-course-filter');
  if (adminCourseFilter) {
    adminCourseFilter.addEventListener('change', renderBackEnd);
  }

  // Add Student Form submit
  const btnAddStudentSubmit = document.getElementById('btn-add-student-submit');
  if (btnAddStudentSubmit) {
    btnAddStudentSubmit.addEventListener('click', handleAddStudent);
  }

  // Add Course Form submit
  const btnAddCourseSubmit = document.getElementById('btn-add-course-submit');
  if (btnAddCourseSubmit) {
    btnAddCourseSubmit.addEventListener('click', handleAddCourse);
  }

  // Google Sheets Config submit
  const btnSaveGsheetUrl = document.getElementById('btn-save-gsheet-url');
  if (btnSaveGsheetUrl) {
    btnSaveGsheetUrl.addEventListener('click', handleSaveGsheetUrl);
  }

  const btnTestGsheet = document.getElementById('btn-test-gsheet');
  if (btnTestGsheet) {
    btnTestGsheet.addEventListener('click', handleTestGsheet);
  }

  const btnSyncGsheetNow = document.getElementById('btn-sync-gsheet-now');
  if (btnSyncGsheetNow) {
    btnSyncGsheetNow.addEventListener('click', handleSyncGsheetNow);
  }

  const btnCopyGasCode = document.getElementById('btn-copy-gas-code');
  if (btnCopyGasCode) {
    btnCopyGasCode.addEventListener('click', handleCopyGasCode);
  }

  // Admin Login submit button & Enter key
  const btnAdminLoginSubmit = document.getElementById('btn-admin-login-submit');
  if (btnAdminLoginSubmit) {
    btnAdminLoginSubmit.addEventListener('click', handleAdminLoginSubmit);
  }
  const inputAdminLoginPwd = document.getElementById('admin-login-pwd');
  if (inputAdminLoginPwd) {
    inputAdminLoginPwd.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') handleAdminLoginSubmit();
    });
  }

  // Change Password submit button
  const btnChangePwdSubmit = document.getElementById('btn-change-pwd-submit');
  if (btnChangePwdSubmit) {
    btnChangePwdSubmit.addEventListener('click', handleChangePasswordSubmit);
  }
}

/* Admin Password Authentication Handlers */
function handleAdminLoginSubmit() {
  const pwdInput = document.getElementById('admin-login-pwd');
  const errorDiv = document.getElementById('admin-login-error');
  const pwdVal = pwdInput.value.trim();

  if (window.dataStore.verifyAdminPassword(pwdVal)) {
    isTeacherLoggedIn = true;
    closeModal('modal-admin-login');

    const btnStudent = document.getElementById('btn-role-student');
    const btnTeacher = document.getElementById('btn-role-teacher');
    const viewStudent = document.getElementById('view-student-portal');
    const viewTeacher = document.getElementById('view-teacher-portal');

    btnTeacher.classList.add('active');
    btnStudent.classList.remove('active');
    viewTeacher.classList.add('active-view');
    viewStudent.classList.remove('active-view');

    renderBackEnd();
    showToast('🔓 密碼驗證成功！已切換至授課老師管理後台', 'success');
  } else {
    errorDiv.style.display = 'block';
    errorDiv.textContent = '❌ 密碼錯誤！請重新輸入 (預設密碼：8308)';
    pwdInput.value = '';
    pwdInput.focus();
  }
}

window.cancelAdminLogin = function() {
  closeModal('modal-admin-login');
  const btnStudent = document.getElementById('btn-role-student');
  const btnTeacher = document.getElementById('btn-role-teacher');
  const viewStudent = document.getElementById('view-student-portal');
  const viewTeacher = document.getElementById('view-teacher-portal');

  btnStudent.classList.add('active');
  btnTeacher.classList.remove('active');
  viewStudent.classList.add('active-view');
  viewTeacher.classList.remove('active-view');
};

window.handleAdminLogout = function() {
  isTeacherLoggedIn = false;
  window.cancelAdminLogin();
  showToast('🚪 已成功登出管理者後台', 'warning');
};

function handleChangePasswordSubmit() {
  const oldPwd = document.getElementById('pwd-old').value.trim();
  const newPwd = document.getElementById('pwd-new').value.trim();
  const confirmPwd = document.getElementById('pwd-confirm').value.trim();

  if (!window.dataStore.verifyAdminPassword(oldPwd)) {
    showToast('❌ 當前原密碼輸入錯誤！', 'error');
    return;
  }

  if (!newPwd) {
    showToast('❌ 新密碼不可為空！', 'error');
    return;
  }

  if (newPwd !== confirmPwd) {
    showToast('❌ 新密碼與再次確認密碼不一致！', 'error');
    return;
  }

  window.dataStore.setAdminPassword(newPwd);
  showToast('🎉 管理者密碼已成功修改！', 'success');
  closeModal('modal-change-password');
  document.getElementById('pwd-old').value = '';
  document.getElementById('pwd-new').value = '';
  document.getElementById('pwd-confirm').value = '';
}

/* Student Manual Checkin handler */
async function handleStudentCheckin() {
  const studentId = document.getElementById('checkin-student-select').value;
  const courseId = document.getElementById('checkin-course-select').value;
  const status = document.getElementById('checkin-status-select').value;
  const note = document.getElementById('checkin-note-input').value;

  if (!studentId || !courseId) {
    showToast('請選擇學生與課程！', 'error');
    return;
  }

  const students = window.dataStore.getStudents();
  const courses = window.dataStore.getCourses();
  const student = students.find(s => s.id === studentId);
  const course = courses.find(c => c.id === courseId);

  const record = window.dataStore.addOrUpdateRecord(studentId, courseId, status, note);
  showToast(`🎉 學生 [${student.name}] 簽到成功！(${status})`, 'success');

  // Trigger Google Sheet sync
  if (window.googleSheetsSync.getWebhookUrl()) {
    showToast('同步傳送資料至 Google 試算表中...', 'warning');
    const syncRes = await window.googleSheetsSync.syncAttendanceRecord(record, student, course);
    if (syncRes.success) {
      showToast('已同步寫入 Google 試算表！', 'success');
    }
  }

  renderStudentHistory();
}

/* Add New Student Handler */
function handleAddStudent() {
  const id = document.getElementById('new-student-id').value.trim();
  const name = document.getElementById('new-student-name').value.trim();
  const dept = document.getElementById('new-student-dept').value.trim();

  if (!id || !name) {
    showToast('學號與姓名為必填！', 'error');
    return;
  }

  window.dataStore.addStudent({
    id,
    name,
    department: dept || '資訊學院',
    email: `${id.toLowerCase()}@univ.edu`,
    avatar: '🎓'
  });

  showToast(`已成功新增學生：${name} (${id})`, 'success');
  closeModal('modal-add-student');
  populateDropdowns();
  renderBackEnd();
}

/* Add New Teacher & Course Handler */
function handleAddCourse() {
  const name = document.getElementById('new-course-name').value.trim();
  const teacher = document.getElementById('new-course-teacher').value.trim();
  const room = document.getElementById('new-course-room').value.trim();
  const day = parseInt(document.getElementById('new-course-day').value, 10);
  const period = parseInt(document.getElementById('new-course-period').value, 10);
  const periods = parseInt(document.getElementById('new-course-periods')?.value || '2', 10);

  if (!name || !teacher) {
    showToast('課程名稱與授課教師姓名為必填！', 'error');
    return;
  }

  const courseId = 'C' + Math.floor(100 + Math.random() * 900);

  window.dataStore.addCourse({
    id: courseId,
    name,
    teacher,
    room: room || '未指定教室',
    day,
    period,
    periods
  });

  showToast(`已成功新增【${name}】(共 ${periods} 節課)！`, 'success');
  closeModal('modal-add-course');
  populateDropdowns();
  renderFrontEnd();
  renderBackEnd();
}

/* Google Sheets Setup UI & Actions */
function loadGSheetConfigUI() {
  const codeBox = document.getElementById('gas-script-code');
  if (codeBox) {
    codeBox.textContent = window.googleSheetsSync.getScriptCode();
  }
  const urlInput = document.getElementById('gsheet-url-input');
  if (urlInput) {
    urlInput.value = window.googleSheetsSync.getWebhookUrl();
  }
}

function handleSaveGsheetUrl() {
  const url = document.getElementById('gsheet-url-input').value.trim();
  window.googleSheetsSync.setWebhookUrl(url);
  showToast('Google 試算表 Webhook 網址已儲存！', 'success');
}

async function handleTestGsheet() {
  handleSaveGsheetUrl();
  showToast('正在測試 Google Apps Script 連線...', 'warning');
  const res = await window.googleSheetsSync.testConnection();
  if (res.success) {
    showToast('✅ Google 試算表連線成功！', 'success');
  } else {
    showToast('❌ 連線測試失敗：' + (res.message || '請確認 URL 正確發佈為 Web App'), 'error');
  }
}

async function handleSyncGsheetNow() {
  handleSaveGsheetUrl();
  showToast('開始全量同步點名資料至 Google 試算表...', 'warning');
  const res = await window.googleSheetsSync.syncAllRecords();
  if (res.success) {
    showToast('✅ 全量資料成功同步至 Google 試算表！', 'success');
  } else {
    showToast('❌ 同步失敗：' + (res.message || '請檢查網址'), 'error');
  }
}

function handleCopyGasCode() {
  const code = window.googleSheetsSync.getScriptCode();
  navigator.clipboard.writeText(code).then(() => {
    showToast('已複製 Apps Script 程式碼至剪貼簿！', 'success');
  }).catch(() => {
    showToast('複製失敗，請手動複製程式碼', 'error');
  });
}

/* Helper Modals & Toasts */
window.openModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
};

window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
};

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
    <div>${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/* Platform Export Functions */
window.exportAttendanceToCSV = function() {
  const records = window.dataStore.getRecords();
  const students = window.dataStore.getStudents();
  const courses = window.dataStore.getCourses();

  if (records.length === 0) {
    showToast('尚無點名紀錄可匯出', 'warning');
    return;
  }

  let csvContent = "\uFEFF簽到時間,學號,學生姓名,系所,課程名稱,授課老師,點名狀態,備註說明\n";

  records.forEach(r => {
    const student = students.find(s => s.id === r.studentId) || { name: r.studentId, department: '未知' };
    const course = courses.find(c => c.id === r.courseId) || { name: r.courseId, teacher: '未知' };
    csvContent += `"${r.timestamp}","${student.id}","${student.name}","${student.department}","${course.name}","${course.teacher}","${r.status}","${r.note || ''}"\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `點名紀錄總表_${window.getTodayDateStr()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('已成功匯出點名紀錄 CSV 檔！', 'success');
};

window.exportTimetableToICS = function() {
  const courses = window.dataStore.getCourses();
  if (courses.length === 0) {
    showToast('尚無課表資料可匯出', 'warning');
    return;
  }

  let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Attendance System//Course Timetable//EN\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\n";

  courses.forEach(c => {
    icsContent += "BEGIN:VEVENT\n";
    icsContent += `SUMMARY:${c.name}\n`;
    icsContent += `DESCRIPTION:授課老師：${c.teacher}\n`;
    icsContent += `LOCATION:${c.room}\n`;
    icsContent += "STATUS:CONFIRMED\n";
    icsContent += "END:VEVENT\n";
  });

  icsContent += "END:VCALENDAR";

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `個人每週課表_${window.getTodayDateStr()}.ics`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('已成功匯出 .ics 課表行事曆！可加入手機與 Google Calendar', 'success');
};

/* ==========================================================================
   Timetable Period / Time Slot Editor Functions
   ========================================================================== */

window.openTimeslotsEditorModal = function() {
  renderTimeslotsEditorList();
  openModal('modal-edit-timeslots');
};

function renderTimeslotsEditorList() {
  const container = document.getElementById('timeslots-editor-list');
  if (!container) return;

  const slots = window.dataStore.getTimeSlots();

  container.innerHTML = slots.map((slot, idx) => {
    // Parse start/end from "09:00 - 10:00"
    const timeParts = slot.time.split(' - ');
    const startTime = timeParts[0] ? timeParts[0].trim() : '09:00';
    const endTime = timeParts[1] ? timeParts[1].trim() : '10:00';

    return `
      <div class="timeslot-editor-row" data-slot-idx="${idx}" style="
        display: grid; 
        grid-template-columns: 100px 1fr 100px 100px 40px; 
        gap: 0.5rem; 
        align-items: center; 
        padding: 0.65rem 0; 
        border-bottom: 1px solid var(--border-color);
      ">
        <div>
          <label style="font-size: 0.7rem; color: var(--text-subtle); display:block; margin-bottom: 2px;">節次名稱</label>
          <input type="text" class="custom-input ts-name" value="${slot.name}" style="padding: 0.35rem 0.5rem; font-size: 0.85rem;" />
        </div>
        <div style="font-size: 0.75rem; color: var(--text-muted); text-align:center;">
          第 ${slot.period} 節
        </div>
        <div>
          <label style="font-size: 0.7rem; color: var(--text-subtle); display:block; margin-bottom: 2px;">開始時間</label>
          <input type="time" class="custom-input ts-start" value="${startTime}" style="padding: 0.35rem 0.5rem; font-size: 0.85rem;" />
        </div>
        <div>
          <label style="font-size: 0.7rem; color: var(--text-subtle); display:block; margin-bottom: 2px;">結束時間</label>
          <input type="time" class="custom-input ts-end" value="${endTime}" style="padding: 0.35rem 0.5rem; font-size: 0.85rem;" />
        </div>
        <div style="text-align:center;">
          <button class="btn btn-outline btn-sm" style="padding: 0.2rem 0.4rem; color:var(--status-absent); border-color:rgba(239,68,68,0.3);" onclick="removeTimeSlotRow(${idx})" title="刪除此節次">
            🗑️
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.addTimeSlotRow = function() {
  const slots = window.dataStore.getTimeSlots();
  const nextPeriod = slots.length > 0 ? Math.max(...slots.map(s => s.period)) + 1 : 1;
  
  // Calculate next reasonable time
  let defaultStart = '16:30';
  let defaultEnd = '17:20';
  if (slots.length > 0) {
    const lastSlot = slots[slots.length - 1];
    const lastTimeParts = lastSlot.time.split(' - ');
    if (lastTimeParts[1]) {
      const [h, m] = lastTimeParts[1].trim().split(':').map(Number);
      const newStartMin = h * 60 + m + 10; // 10 min break
      const newEndMin = newStartMin + 50; // 50 min class
      const fmtTime = (mins) => {
        const hh = String(Math.floor(mins / 60)).padStart(2, '0');
        const mm = String(mins % 60).padStart(2, '0');
        return `${hh}:${mm}`;
      };
      defaultStart = fmtTime(newStartMin);
      defaultEnd = fmtTime(newEndMin);
    }
  }

  slots.push({
    period: nextPeriod,
    time: `${defaultStart} - ${defaultEnd}`,
    name: `第${nextPeriod}節`
  });

  window.dataStore.saveTimeSlots(slots);
  renderTimeslotsEditorList();
  showToast(`已新增第 ${nextPeriod} 節次`, 'success');
};

window.removeTimeSlotRow = function(index) {
  const slots = window.dataStore.getTimeSlots();
  if (slots.length <= 1) {
    showToast('至少需保留一個節次！', 'error');
    return;
  }
  const removedName = slots[index].name;
  slots.splice(index, 1);
  // Re-number periods sequentially
  slots.forEach((s, i) => { s.period = i + 1; });
  window.dataStore.saveTimeSlots(slots);
  renderTimeslotsEditorList();
  showToast(`已刪除「${removedName}」`, 'warning');
};

window.resetTimeSlotsToDefault = function() {
  if (confirm('確定要恢復為預設的 6 節課時段嗎？自訂設定將會被覆蓋。')) {
    window.dataStore.resetTimeSlots();
    renderTimeslotsEditorList();
    showToast('已恢復為預設 6 節課時段', 'success');
  }
};

window.saveCustomTimeSlots = function() {
  const container = document.getElementById('timeslots-editor-list');
  if (!container) return;

  const rows = container.querySelectorAll('.timeslot-editor-row');
  const updatedSlots = [];
  let hasError = false;

  rows.forEach((row, idx) => {
    const name = row.querySelector('.ts-name')?.value.trim();
    const startTime = row.querySelector('.ts-start')?.value;
    const endTime = row.querySelector('.ts-end')?.value;

    if (!name || !startTime || !endTime) {
      hasError = true;
      return;
    }

    updatedSlots.push({
      period: idx + 1,
      time: `${startTime} - ${endTime}`,
      name: name
    });
  });

  if (hasError) {
    showToast('請確認所有節次名稱與時間欄位皆已填寫！', 'error');
    return;
  }

  if (updatedSlots.length === 0) {
    showToast('至少需要一個節次設定！', 'error');
    return;
  }

  window.dataStore.saveTimeSlots(updatedSlots);
  showToast(`已成功儲存 ${updatedSlots.length} 個節次時間設定！`, 'success');
  closeModal('modal-edit-timeslots');
  
  // Re-render everything with new timeslots
  updateCoursePeriodOptions();
  renderFrontEnd();
  renderBackEnd();
};

/* Update the period select options in add-course modal to match current custom time slots */
function updateCoursePeriodOptions() {
  const periodSelect = document.getElementById('new-course-period');
  if (!periodSelect) return;

  const slots = window.dataStore.getTimeSlots();
  periodSelect.innerHTML = slots.map(s =>
    `<option value="${s.period}">${s.name} (${s.time})</option>`
  ).join('');
}

/* Also call on page load to keep course period select in sync */
window.addEventListener('DOMContentLoaded', () => {
  // Delay slightly to ensure data is loaded
  setTimeout(updateCoursePeriodOptions, 100);
});
