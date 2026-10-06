/* ==========================================================================
   點名系統 (Attendance System) - Google Sheets Integration & Apps Script Generator
   ========================================================================== */

const GAS_SCRIPT_TEMPLATE = `
/**
 * 點名系統 - Google 試算表後端 Apps Script 接收程式
 * 說明：
 * 1. 請在您的 Google 試算表點選「擴充功能」->「Apps Script」
 * 2. 貼上此段程式碼並儲存
 * 3. 點選右上角「發佈/部署」->「新增部署」
 * 4. 種類選擇「網路應用程式 (Web App)」
 * 5. 誰可以存取 (Who has access) 選擇「所有人 (Anyone)」
 * 6. 點選「部署」並複製產生的「網路應用程式 URL」，貼回點名系統後台即可！
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // 如果是第一列，自動寫入欄位表頭
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["簽到時間", "學號", "學生姓名", "系所", "課程名稱", "授課老師", "點名狀態", "備註說明"]);
      sheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#6366f1").setFontColor("#ffffff");
    }
    
    var data = JSON.parse(e.postData.contents);
    
    if (data.action === "ping") {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Google Sheets Webhook 連線成功！" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.action === "addAttendance") {
      sheet.appendRow([
        data.timestamp || new Date().toLocaleString(),
        data.studentId || '',
        data.studentName || '',
        data.department || '',
        data.courseName || '',
        data.teacher || '',
        data.status || '出席',
        data.note || ''
      ]);
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "紀錄已寫入 Google 試算表！" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.action === "syncAll") {
      var records = data.records || [];
      records.forEach(function(r) {
        sheet.appendRow([
          r.timestamp,
          r.studentId,
          r.studentName,
          r.department,
          r.courseName,
          r.teacher,
          r.status,
          r.note || ''
        ]);
      });
      return ContentService.createTextOutput(JSON.stringify({ status: "success", count: records.length, message: "批次同步完成！" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "未知動作" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService.createTextOutput("點名系統 Google Apps Script API 運作中。請使用 POST 請求。");
}
`.trim();

class GoogleSheetsSyncEngine {
  constructor() {
    this.scriptTemplate = GAS_SCRIPT_TEMPLATE;
  }

  getScriptCode() {
    return this.scriptTemplate;
  }

  getWebhookUrl() {
    return window.dataStore.getGSheetUrl();
  }

  setWebhookUrl(url) {
    window.dataStore.setGSheetUrl(url);
  }

  async sendToGoogleSheet(payload) {
    const url = this.getWebhookUrl();
    if (!url) {
      console.warn('Google Sheets Webhook URL 未設定');
      return { success: false, reason: 'no_url', message: '尚未設定 Google 試算表 Webhook 網址' };
    }

    try {
      // Send post request using fetch (no-cors fallback handled safely)
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload)
      });

      const resText = await response.text();
      try {
        const json = JSON.parse(resText);
        return { success: json.status === 'success', data: json };
      } catch (e) {
        return { success: true, message: '資料已傳送至 Google 試算表' };
      }
    } catch (error) {
      console.error('Google Sheets Sync Error:', error);
      // Mode text/plain no-cors mode retry
      try {
        await fetch(url, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload)
        });
        return { success: true, message: '以靜默模式傳送成功 (No-CORS)' };
      } catch (err2) {
        return { success: false, error: err2.toString() };
      }
    }
  }

  async testConnection() {
    const url = this.getWebhookUrl();
    if (!url) {
      return { success: false, message: '請先輸入 Google Apps Script 網址' };
    }
    return await this.sendToGoogleSheet({ action: 'ping' });
  }

  async syncAttendanceRecord(record, student, course) {
    const payload = {
      action: 'addAttendance',
      timestamp: record.timestamp,
      studentId: student.id,
      studentName: student.name,
      department: student.department,
      courseName: course.name,
      teacher: course.teacher,
      status: record.status,
      note: record.note
    };
    return await this.sendToGoogleSheet(payload);
  }

  async syncAllRecords() {
    const records = window.dataStore.getRecords();
    const students = window.dataStore.getStudents();
    const courses = window.dataStore.getCourses();

    const formattedList = records.map(r => {
      const student = students.find(s => s.id === r.studentId) || { name: r.studentId, department: '未知' };
      const course = courses.find(c => c.id === r.courseId) || { name: r.courseId, teacher: '未知' };
      return {
        timestamp: r.timestamp,
        studentId: student.id,
        studentName: student.name,
        department: student.department,
        courseName: course.name,
        teacher: course.teacher,
        status: r.status,
        note: r.note
      };
    });

    return await this.sendToGoogleSheet({
      action: 'syncAll',
      records: formattedList
    });
  }
}

window.googleSheetsSync = new GoogleSheetsSyncEngine();
