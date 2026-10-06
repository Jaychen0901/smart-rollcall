/* ==========================================================================
   點名系統 (Attendance System) - Initial Data & Storage Layer
   ========================================================================== */

const STORAGE_KEYS = {
  STUDENTS: 'attendance_students_v1',
  COURSES: 'attendance_courses_v1',
  RECORDS: 'attendance_records_v1',
  TIMETABLE: 'attendance_timetable_v1',
  GSHEET_URL: 'attendance_gsheet_url_v1',
  ADMIN_PASSWORD: 'attendance_admin_password_v1',
  TIME_SLOTS: 'attendance_time_slots_v1'
};

// Default Teachers & Courses
const defaultCourses = [
  { id: 'C101', name: 'Web 網頁前端開發技術', teacher: '陳志明 教授', room: '資訊館 301', day: 1, period: 2, periods: 2 },
  { id: 'C102', name: 'Python 資料分析與機器學習', teacher: '林雅婷 博士', room: '電腦教室 A', day: 1, period: 4, periods: 2 },
  { id: 'C103', name: '雲端架構與微服務', teacher: '黃家豪 講師', room: '科技大樓 502', day: 2, period: 3, periods: 3 },
  { id: 'C104', name: 'UI/UX 使用者介面設計', teacher: '張佩珊 副教授', room: '創客中心 101', day: 3, period: 1, periods: 2 },
  { id: 'C105', name: '資料庫系統概論', teacher: '劉建宏 教授', room: '資訊館 205', day: 4, period: 2, periods: 3 },
  { id: 'C106', name: '物聯網與智慧嵌入式', teacher: '鄭博文 博士', room: '實驗室 B', day: 5, period: 3, periods: 2 }
];

// Default Class Timetable Periods
const timeSlots = [
  { period: 1, time: '09:00 - 10:00', name: '第一節' },
  { period: 2, time: '10:10 - 11:00', name: '第二節' },
  { period: 3, time: '11:10 - 12:00', name: '第三節' },
  { period: 4, time: '13:30 - 14:20', name: '第四節' },
  { period: 5, time: '14:30 - 15:20', name: '第五節' },
  { period: 6, time: '15:30 - 16:20', name: '第六節' }
];

// Default Students List
const defaultStudents = [
  { id: 'S11201', name: '王小明', department: '資訊工程學系', email: 'xiaoming@univ.edu', avatar: '👨‍🎓' },
  { id: 'S11202', name: '李美玲', department: '資訊管理學系', email: 'meiling@univ.edu', avatar: '👩‍🎓' },
  { id: 'S11203', name: '張立偉', department: '電子工程學系', email: 'liwei@univ.edu', avatar: '👨‍💻' },
  { id: 'S11204', name: '陳思婷', department: '多媒體設計學系', email: 'siting@univ.edu', avatar: '👩‍🎨' },
  { id: 'S11205', name: '林哲宇', department: '資訊工程學系', email: 'zheyu@univ.edu', avatar: '👨‍🔬' },
  { id: 'S11206', name: '黃韻如', department: '人工智慧學系', email: 'yunru@univ.edu', avatar: '👩‍💻' },
  { id: 'S11207', name: '蔡家豪', department: '數據科學學系', email: 'jiahao@univ.edu', avatar: '👨‍💼' },
  { id: 'S11208', name: '許庭安', department: '資訊管理學系', email: 'tingan@univ.edu', avatar: '👩‍🎓' },
  { id: 'S11209', name: '楊柏翰', department: '電子工程學系', email: 'bohan@univ.edu', avatar: '👨‍🎓' },
  { id: 'S11210', name: '鄭雅涵', department: '資訊工程學系', email: 'yahan@univ.edu', avatar: '👩‍💻' }
];

// Default Today's Initial Attendance Mock Records
const getTodayDateStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const defaultRecords = [
  { id: 'R-1', studentId: 'S11201', courseId: 'C101', status: '出席', timestamp: `${getTodayDateStr()} 10:05:22`, note: '準時簽到' },
  { id: 'R-2', studentId: 'S11202', courseId: 'C101', status: '出席', timestamp: `${getTodayDateStr()} 10:08:14`, note: '線上點名' },
  { id: 'R-3', studentId: 'S11203', courseId: 'C101', status: '遲到', timestamp: `${getTodayDateStr()} 10:24:50`, note: '遲到15分鐘' },
  { id: 'R-4', studentId: 'S11204', courseId: 'C101', status: '請假', timestamp: `${getTodayDateStr()} 09:12:00`, note: '病假 (已附診斷書)' },
  { id: 'R-5', studentId: 'S11205', courseId: 'C101', status: '出席', timestamp: `${getTodayDateStr()} 10:02:00`, note: '' }
];

// Storage Helper Engine
class AppDataStore {
  constructor() {
    this.initData();
  }

  initData() {
    if (!localStorage.getItem(STORAGE_KEYS.STUDENTS)) {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(defaultStudents));
    }
    if (!localStorage.getItem(STORAGE_KEYS.COURSES)) {
      localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(defaultCourses));
    }
    if (!localStorage.getItem(STORAGE_KEYS.RECORDS)) {
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(defaultRecords));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ADMIN_PASSWORD)) {
      localStorage.setItem(STORAGE_KEYS.ADMIN_PASSWORD, '8308');
    }
    if (!localStorage.getItem(STORAGE_KEYS.TIME_SLOTS)) {
      localStorage.setItem(STORAGE_KEYS.TIME_SLOTS, JSON.stringify(timeSlots));
    }
  }

  getTimeSlots() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.TIME_SLOTS)) || timeSlots;
  }

  saveTimeSlots(slots) {
    localStorage.setItem(STORAGE_KEYS.TIME_SLOTS, JSON.stringify(slots));
  }

  resetTimeSlots() {
    localStorage.setItem(STORAGE_KEYS.TIME_SLOTS, JSON.stringify(timeSlots));
    return timeSlots;
  }

  getAdminPassword() {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_PASSWORD) || '8308';
  }

  setAdminPassword(newPwd) {
    localStorage.setItem(STORAGE_KEYS.ADMIN_PASSWORD, newPwd.trim());
  }

  verifyAdminPassword(pwd) {
    return (pwd || '').trim() === this.getAdminPassword();
  }

  getStudents() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS)) || defaultStudents;
  }

  saveStudents(students) {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  }

  addStudent(student) {
    const list = this.getStudents();
    list.push(student);
    this.saveStudents(list);
  }

  deleteStudent(studentId) {
    let list = this.getStudents();
    list = list.filter(s => s.id !== studentId);
    this.saveStudents(list);
  }

  getCourses() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.COURSES)) || defaultCourses;
  }

  saveCourses(courses) {
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
  }

  addCourse(course) {
    const list = this.getCourses();
    list.push(course);
    this.saveCourses(list);
  }

  deleteCourse(courseId) {
    let list = this.getCourses();
    list = list.filter(c => c.id !== courseId);
    this.saveCourses(list);
  }

  getRecords() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.RECORDS)) || defaultRecords;
  }

  saveRecords(records) {
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
  }

  addOrUpdateRecord(studentId, courseId, status, note = '') {
    const records = this.getRecords();
    const todayStr = getTodayDateStr();
    const now = new Date();
    const timeStr = `${todayStr} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    // Check if record exists for this student & course today
    const existingIndex = records.findIndex(r => r.studentId === studentId && r.courseId === courseId && r.timestamp.startsWith(todayStr));

    let updatedRecord;
    if (existingIndex >= 0) {
      records[existingIndex].status = status;
      records[existingIndex].timestamp = timeStr;
      records[existingIndex].note = note || records[existingIndex].note;
      updatedRecord = records[existingIndex];
    } else {
      updatedRecord = {
        id: 'R-' + Date.now(),
        studentId,
        courseId,
        status,
        timestamp: timeStr,
        note
      };
      records.unshift(updatedRecord);
    }

    this.saveRecords(records);
    return updatedRecord;
  }

  getGSheetUrl() {
    return localStorage.getItem(STORAGE_KEYS.GSHEET_URL) || '';
  }

  setGSheetUrl(url) {
    localStorage.setItem(STORAGE_KEYS.GSHEET_URL, url.trim());
  }
}

window.dataStore = new AppDataStore();
window.timeSlots = timeSlots;
window.getTodayDateStr = getTodayDateStr;
