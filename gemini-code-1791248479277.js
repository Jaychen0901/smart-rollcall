/**
 * 智慧點名系統 - Google Sheets (GAS) Webhook 整合模組
 */

const GAS_SCRIPT_TEMPLATE = `
/**
 * Google Apps Script (GAS) 部署腳本
 * 貼至 Google 試算表 -> 擴充功能 -> Apps Script 中
 */
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    // 取得或自動建立「點名紀錄」工作表，避免寫入錯誤頁籤
    var sheet = ss.getSheetByName("點名紀錄") || ss.insertSheet("點名紀錄");
    
    // 首次執行自動建立標頭
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["點名時間", "學號", "姓名", "系所", "課程名稱", "授課教師", "簽到狀態"]);
      sheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#e2e8f0");
    }

    var data = JSON.parse(e.postData.contents);
    sheet.appendRow([
      data.timestamp || new Date().toLocaleString("zh-TW"),
      data.studentId,
      data.studentName,
      data.department,
      data.courseName,
      data.teacherName,
      data.status
    ]);

    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "紀錄同步成功" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
`;

/**
 * 傳送簽到資料至 Google Sheets Webhook
 */
async function sendToGoogleSheets(recordData) {
  const webhookUrl = DataStore.getGasUrl();
  if (!webhookUrl) {
    return { success: false, message: "未設定 Google Sheets Webhook URL" };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(recordData)
    });
    return { success: true, message: "已發送至 Google Sheets (no-cors 模式)" };
  } catch (err) {
    console.error("GAS Webhook 錯誤：", err);
    return { success: false, message: "發送失敗：" + err.message };
  }
}

/**
 * 顯示 GAS 腳本複製說明 Modal
 */
function showGasScriptGuide() {
  const guideText = `請遵循以下步驟設定 Google 試算表連動：\n\n` +
    `1. 開啟您的 Google 試算表。\n` +
    `2. 點選上方選單：「擴充功能」 -> 「Apps Script」。\n` +
    `3. 清空原本的程式碼，將以下腳本複製並貼上：\n\n` +
    GAS_SCRIPT_TEMPLATE +
    `\n4. 點選右上角「部署」 -> 「新建部署」。\n` +
    `5. 類型選擇「Web 應用程式」，【誰可以存取】務必設定為：「所有人 (Anyone)」。\n` +
    `6. 部署後複製獲得的 Webhook URL，回到此系統填入即可！`;
  
  alert(guideText);
}