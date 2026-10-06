/**
 * 智慧點名系統 - 預設資料與 localStorage 管理模組
 */

// 預設學生清單
const DEFAULT_STUDENTS = [
  { id: "S11201", name: "張小明", dept: "資訊工程學系" },
  { id: "S11202", name: "李美麗", dept: "資訊工程學系" },
  { id: "S11203", name: "王大同", dept: "電機工程學系" },
  { id: "S11204", name: "陳雅婷", dept: "企業管理學系" },
  { id: "S11205", name: "林志豪", dept: "數位媒體設計學系" }
];

// 預設課程與授課教師清單
const DEFAULT_COURSES = [
  { id: "C001", name: "網頁程式設計", teacher: "黃教授", day: 1, period: 2, periods: 2, room: "資訊館 302" },
  { id: "C002", name: "資料結構", teacher: "林教授", day: 2, period: 3, periods: 2, room: "工程館 101" },
  { id: "C003", name: "人工智慧導論", teacher: "張教授", day: 3, period: 5, periods: 2, room: "國際會議廳" },
  { id: "C004", name: "資料庫系統", teacher: "陳教授", day: 4, period: 1, periods: 2, room: "資訊館 205" },
  { id: "C005", name: "軟體工程", teacher: "黃教授", day: 5, period: 3, periods: 2, room: "資訊館 302" }
];

// 預設節次時間表
const DEFAULT_TIME_SLOTS = [
  { period: 1, start: "08:10", end: "09:00" },
  { period: 2, start: "09:10", end: "10:00" },
  { period: 3, start: "10:20", end: "11:10" },
  { period: 4, start: "11:20", end: "12:10" },
  { period: 5, start: "13:20", end: "14:10" },
  { period: 6, start: "14:20", end: "15:10" },
  { period: 7, start: "15:30", end: "16:20" },
  { period: 8, start: "16:30", end: "17:20" }
];

// 預設管理者密碼
const DEFAULT_ADMIN_PASSWORD = "8308";

// 資料初始化與 LocalStorage 存取工具
const DataStore = {
  getStudents() {
    const data = localStorage.getItem("app_students");
    return data ? JSON.parse(data) : DEFAULT_STUDENTS;
  },
  saveStudents(students) {
    localStorage.setItem("app_students", JSON.stringify(students));
  },

  getCourses() {
    const data = localStorage.getItem("app_courses");
    return data ? JSON.parse(data) : DEFAULT_COURSES;
  },
  saveCourses(courses) {
    localStorage.setItem("app_courses", JSON.stringify(courses));
  },

  getTimeSlots() {
    const data = localStorage.getItem("app_timeslots");
    return data ? JSON.parse(data) : DEFAULT_TIME_SLOTS;
  },
  saveTimeSlots(slots) {
    localStorage.setItem("app_timeslots", JSON.stringify(slots));
  },

  getRecords() {
    const data = localStorage.getItem("app_attendance_records");
    return data ? JSON.parse(data) : [];
  },
  saveRecords(records) {
    localStorage.setItem("app_attendance_records", JSON.stringify(records));
  },
  addRecord(record) {
    const records = this.getRecords();
    records.unshift(record);
    this.saveRecords(records);
  },

  getGasUrl() {
    return localStorage.getItem("app_gas_webhook_url") || "";
  },
  saveGasUrl(url) {
    localStorage.setItem("app_gas_webhook_url", url);
  },

  getAdminPassword() {
    return localStorage.getItem("app_admin_password") || DEFAULT_ADMIN_PASSWORD;
  },
  saveAdminPassword(pwd) {
    localStorage.setItem("app_admin_password", pwd);
  }
};