export interface ScriptTemplate {
  id: string;
  title: string;
  titleTh: string;
  description: string;
  descriptionTh: string;
  category: 'CRUD' | 'Form' | 'Inventory' | 'Student' | 'Ticket';
  code: string;
}

export const SCRIPT_TEMPLATES: ScriptTemplate[] = [
  {
    id: 'full-crud-sheet',
    title: 'Google Sheets Universal CRUD Web App (แนะนำสูงสุด)',
    titleTh: 'Google Sheets Universal CRUD Web App (ครบวงจร อ่าน/เขียน/แก้ไข/ลบ)',
    description: 'Complete API for Google Sheets: Read, Insert, Update, Delete, Search rows automatically mapping headers as JSON properties.',
    descriptionTh: 'สคริปต์สากลสำหรับแปลง Google Sheet ให้เป็น REST API อัตโนมัติ รองรับการดึงข้อมูล เพิ่มแถว แก้ไขตาม ID และลบข้อมูล',
    category: 'CRUD',
    code: `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT: UNIVERSAL GOOGLE SHEETS REST API (CRUD)
 * สร้างโดย GAS Connect - Google Apps Script Data Dashboard
 * =========================================================================
 * 
 * วิธีการติดตั้ง:
 * 1. เปิด Google Sheet ที่ต้องการ
 * 2. ไปที่เมนู "ส่วนขยาย (Extensions)" -> "Apps Script"
 * 3. ลบโค้ดเดิมแล้ววางโค้ดชุดนี้ลงไปทั้งหมด
 * 4. กดปุ่ม "การทำให้ใช้งานได้ (Deploy)" -> "การทำให้ใช้งานได้ใหม่ (New deployment)"
 * 5. เลือกประเภท "เว็บแอป (Web app)"
 * 6. กำหนด "ดำเนินการในฐานะ (Execute as)": ฉัน (Me)
 * 7. กำหนด "ผู้ที่มีสิทธิ์เข้าถึง (Who has access)": ทุกคน (Anyone)
 * 8. กด Deploy แล้วคัดลอก "URL ของเว็บแอป (Web App URL)" ไปใช้งานในแอปได้ทันที!
 */

// ชื่อแท็บ Sheet ที่ต้องการเชื่อมต่อ (ถ้าเว้นว่างจะใช้ Sheet แรก)
var SHEET_NAME = "Sheet1";

/**
 * จัดการคำขอแบบ GET (ดึงข้อมูลทั้งหมด หรือค้นหา)
 */
function doGet(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = SHEET_NAME ? ss.getSheetByName(SHEET_NAME) : ss.getSheets()[0];
    
    if (!sheet) {
      sheet = ss.getSheets()[0];
    }
    
    var data = sheet.getDataRange().getValues();
    
    // ถ้าไม่มีข้อมูล
    if (data.length <= 1) {
      return responseJSON({
        success: true,
        count: 0,
        headers: data.length > 0 ? data[0] : [],
        data: []
      });
    }
    
    var headers = data[0];
    var records = [];
    
    // แปลงแถวเป็น JSON Objects โดยใช้ Header เป็น Key
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      // ตรวจสอบว่าแถวไม่ว่างเปล่า
      var hasValue = row.some(function(cell) { return cell !== "" && cell !== null; });
      if (!hasValue) continue;
      
      var record = { _rowIndex: i + 1 }; // เก็บ index แถวจริงใน Sheet
      for (var j = 0; j < headers.length; j++) {
        var key = String(headers[j]).trim();
        if (key) {
          var val = row[j];
          // แปลงวันที่เป็น ISO String เพื่อความถูกต้อง
          if (val instanceof Date) {
            val = val.toISOString().split('T')[0];
          }
          record[key] = val;
        }
      }
      records.push(record);
    }
    
    // รองรับการค้นหาผ่าน query param: ?search=keyword
    if (e && e.parameter && e.parameter.search) {
      var query = String(e.parameter.search).toLowerCase();
      records = records.filter(function(item) {
        return JSON.stringify(item).toLowerCase().indexOf(query) !== -1;
      });
    }
    
    return responseJSON({
      success: true,
      count: records.length,
      sheetName: sheet.getName(),
      headers: headers.filter(function(h) { return h !== ""; }),
      data: records
    });
    
  } catch (error) {
    return responseJSON({
      success: false,
      error: error.toString()
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * จัดการคำขอแบบ POST (เพิ่มข้อมูล, แก้ไข, ลบ)
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000);
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = SHEET_NAME ? ss.getSheetByName(SHEET_NAME) : ss.getSheets()[0];
    if (!sheet) sheet = ss.getSheets()[0];
    
    var requestData = {};
    if (e.postData && e.postData.contents) {
      try {
        requestData = JSON.parse(e.postData.contents);
      } catch (err) {
        // หากส่งมาแบบ Form-UrlEncoded
        requestData = e.parameter || {};
      }
    } else {
      requestData = e.parameter || {};
    }
    
    var action = requestData.action || (e.parameter && e.parameter.action) || 'create';
    var dataRange = sheet.getDataRange().getValues();
    var headers = dataRange.length > 0 ? dataRange[0] : [];
    
    // -------------------------------------------------------------
    // ACTION 1: CREATE / INSERT NEW ROW
    // -------------------------------------------------------------
    if (action === 'create' || action === 'insert') {
      var newRecord = requestData.data || requestData;
      
      // ถ้า Sheet ยังไม่มี Header ให้สร้าง Header อัตโนมัติ
      if (headers.length === 0) {
        var autoHeaders = Object.keys(newRecord).filter(function(k) { return k !== 'action' && k !== '_rowIndex'; });
        sheet.appendRow(autoHeaders);
        headers = autoHeaders;
      }
      
      var newRow = [];
      for (var j = 0; j < headers.length; j++) {
        var key = String(headers[j]).trim();
        var val = newRecord[key] !== undefined ? newRecord[key] : "";
        newRow.push(val);
      }
      
      sheet.appendRow(newRow);
      
      return responseJSON({
        success: true,
        message: "เพิ่มข้อมูลสำเร็จเรียบร้อยแล้ว",
        action: 'create',
        insertedData: newRecord
      });
    }
    
    // -------------------------------------------------------------
    // ACTION 2: UPDATE ROW (โดยค้นหาจาก Primary Key หรือ ID)
    // -------------------------------------------------------------
    else if (action === 'update') {
      var updateRecord = requestData.data || requestData;
      var primaryKey = requestData.primaryKey || 'id';
      var targetId = String(updateRecord[primaryKey] || requestData.id || "");
      
      if (!targetId) {
        return responseJSON({ success: false, error: "ไม่พบรหัสอ้างอิง ID สำหรับการแก้ไข" });
      }
      
      var idColIndex = -1;
      for (var h = 0; h < headers.length; h++) {
        if (String(headers[h]).trim().toLowerCase() === primaryKey.toLowerCase()) {
          idColIndex = h;
          break;
        }
      }
      
      if (idColIndex === -1) idColIndex = 0; // fallback to column 1
      
      var foundRowIndex = -1;
      for (var r = 1; r < dataRange.length; r++) {
        if (String(dataRange[r][idColIndex]) === targetId) {
          foundRowIndex = r + 1; // 1-based index ใน Google Sheets
          break;
        }
      }
      
      if (foundRowIndex === -1) {
        return responseJSON({ success: false, error: "ไม่พบข้อมูลที่ตรงกับ ID: " + targetId });
      }
      
      // ทำการอัปเดตแต่ละคอลัมน์
      for (var c = 0; c < headers.length; c++) {
        var colKey = String(headers[c]).trim();
        if (updateRecord[colKey] !== undefined) {
          sheet.getRange(foundRowIndex, c + 1).setValue(updateRecord[colKey]);
        }
      }
      
      return responseJSON({
        success: true,
        message: "อัปเดตข้อมูลแถวที่ " + foundRowIndex + " สำเร็จแล้ว",
        action: 'update',
        updatedId: targetId
      });
    }
    
    // -------------------------------------------------------------
    // ACTION 3: DELETE ROW
    // -------------------------------------------------------------
    else if (action === 'delete') {
      var deleteId = String(requestData.id || (requestData.data && requestData.data.id) || "");
      var primaryKey = requestData.primaryKey || 'id';
      
      if (!deleteId) {
        return responseJSON({ success: false, error: "กรุณาระบุ ID ของรายการที่ต้องการลบ" });
      }
      
      var idColIndex = -1;
      for (var h = 0; h < headers.length; h++) {
        if (String(headers[h]).trim().toLowerCase() === primaryKey.toLowerCase()) {
          idColIndex = h;
          break;
        }
      }
      if (idColIndex === -1) idColIndex = 0;
      
      var targetRow = -1;
      for (var r = 1; r < dataRange.length; r++) {
        if (String(dataRange[r][idColIndex]) === deleteId) {
          targetRow = r + 1;
          break;
        }
      }
      
      if (targetRow === -1) {
        return responseJSON({ success: false, error: "ไม่พบรายการที่ต้องการลบ (ID: " + deleteId + ")" });
      }
      
      sheet.deleteRow(targetRow);
      return responseJSON({
        success: true,
        message: "ลบรายการ ID: " + deleteId + " เรียบร้อยแล้ว",
        action: 'delete',
        deletedId: deleteId
      });
    }
    
    return responseJSON({
      success: false,
      error: "Action ไม่ถูกต้อง กรุณาใช้ create, update หรือ delete"
    });
    
  } catch (error) {
    return responseJSON({
      success: false,
      error: error.toString()
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Utility สร้าง Output แบบ JSON พร้อม Header ป้องกันปัญหาการอ่านผลลัพธ์
 */
function responseJSON(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`
  },
  {
    id: 'form-lead-email',
    title: 'Lead & Contact Logger + Email Alert',
    titleTh: 'ระบบบันทึกแบบฟอร์ม / ผู้ติดต่อ พร้อมแจ้งเตือนทางอีเมล',
    description: 'Receives form submissions, logs timestamp and inputs into Google Sheets, and sends an instant email notification to the administrator.',
    descriptionTh: 'รับข้อมูลจากแบบฟอร์มหน้าเว็บ บันทึกวันเวลาลงชีต และส่งอีเมลแจ้งเตือนไปยังผู้ดูแลระบบทันที',
    category: 'Form',
    code: `/**
 * GOOGLE APPS SCRIPT: FORM LOGGER & EMAIL NOTIFICATION
 */
var NOTIFY_EMAIL = "admin@example.com"; // เปลี่ยนเป็นอีเมลของคุณ
var SHEET_NAME = "FormSubmissions";

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var headers = data[0] || [];
  var records = [];
  
  for (var i = 1; i < data.length; i++) {
    var item = {};
    for (var j = 0; j < headers.length; j++) {
      item[headers[j]] = data[i][j];
    }
    records.push(item);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    total: records.length,
    data: records
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(["Timestamp", "Name", "Email", "Phone", "Subject", "Message", "Status"]);
    }
    
    var data = {};
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      data = e.parameter || {};
    }
    
    var timestamp = new Date();
    var name = data.name || data.fullName || "-";
    var email = data.email || "-";
    var phone = data.phone || "-";
    var subject = data.subject || "มีรายการติดต่อใหม่จากเว็บไซต์";
    var message = data.message || data.note || "-";
    var status = "New";
    
    sheet.appendRow([timestamp, name, email, phone, subject, message, status]);
    
    // ส่งอีเมลแจ้งเตือน
    if (NOTIFY_EMAIL && NOTIFY_EMAIL !== "admin@example.com") {
      try {
        MailApp.sendEmail({
          to: NOTIFY_EMAIL,
          subject: "[GAS Connect] รายการแจ้งติดต่อใหม่: " + subject,
          htmlBody: "<h3>มีข้อมูลผู้ติดต่อใหม่</h3>" +
                    "<p><b>ชื่อ:</b> " + name + "</p>" +
                    "<p><b>อีเมล:</b> " + email + "</p>" +
                    "<p><b>เบอร์โทร:</b> " + phone + "</p>" +
                    "<p><b>ข้อความ:</b> " + message + "</p>" +
                    "<p><b>เวลา:</b> " + timestamp.toLocaleString("th-TH") + "</p>"
        });
      } catch (mailErr) {
        Logger.log("Mail error: " + mailErr);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "บันทึกข้อมูลและส่งการแจ้งเตือนเรียบร้อยแล้ว",
      data: { name: name, email: email, timestamp: timestamp }
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
`
  },
  {
    id: 'inventory-stock-manager',
    title: 'Inventory & Stock Tracker API',
    titleTh: 'ระบบสต็อกสินค้า & คลังพัสดุ (Inventory & Stock)',
    description: 'Tracks product SKUs, current stock, minimum thresholds, unit price, and category with low-stock status triggers.',
    descriptionTh: 'ระบบจัดการสินค้าคงคลัง ตรวจสอบจำนวนเหลือน้อย และอัปเดตสต็อกสินค้าผ่าน API',
    category: 'Inventory',
    code: `/**
 * GOOGLE APPS SCRIPT: INVENTORY & STOCK MANAGER API
 */
var SHEET_NAME = "Inventory";

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  var headers = data[0];
  var items = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var item = { _rowIndex: i + 1 };
    for (var j = 0; j < headers.length; j++) {
      item[headers[j]] = row[j];
    }
    // คำนวณสถานะสต็อกอัตโนมัติ
    var qty = Number(item.quantity || item.stock || 0);
    var minQty = Number(item.minStock || 5);
    if (qty <= 0) {
      item.calculatedStatus = "Out of Stock";
    } else if (qty <= minQty) {
      item.calculatedStatus = "Low Stock";
    } else {
      item.calculatedStatus = "In Stock";
    }
    items.push(item);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    count: items.length,
    data: items
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  var payload = JSON.parse(e.postData.contents || "{}");
  
  if (payload.action === 'adjustStock') {
    var sku = payload.sku || payload.id;
    var change = Number(payload.quantityChange || 0);
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var skuIndex = headers.indexOf("sku") !== -1 ? headers.indexOf("sku") : 0;
    var qtyIndex = headers.indexOf("quantity") !== -1 ? headers.indexOf("quantity") : 3;
    
    for (var r = 1; r < data.length; r++) {
      if (String(data[r][skuIndex]) === String(sku)) {
        var current = Number(data[r][qtyIndex] || 0);
        var updated = Math.max(0, current + change);
        sheet.getRange(r + 1, qtyIndex + 1).setValue(updated);
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          sku: sku,
          previousStock: current,
          currentStock: updated
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: "SKU not found" }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Invalid action" }))
    .setMimeType(ContentService.MimeType.JSON);
}
`
  }
];
