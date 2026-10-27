import { UbuLocation, VolunteerLog, SurveyRecord } from '../types/ubuCondom';

// ข้อมูล 15 จุดบริการถุงยางอนามัย มหาวิทยาลัยอุบลราชธานี (ม.อุบลฯ) ตามพิกัดจริง
export const INITIAL_UBU_LOCATIONS: UbuLocation[] = [
  {
    id: 1,
    name: 'หน้าห้องสโมสรนักศึกษา คณะรัฐศาสตร์',
    status: 'มีอยู่',
    lat: 15.12039012,
    lng: 104.9102716,
    zone: 'คณะรัฐศาสตร์',
    landmark: 'บริเวณหน้าห้องสโมสรนักศึกษา'
  },
  {
    id: 2,
    name: 'คลินิกวัยรุ่น โรงพยาบาลมหาวิทยาลัยอุบลราชธานี',
    status: 'มีอยู่',
    lat: 15.11355507,
    lng: 104.9017012,
    zone: 'รพ.มหาวิทยาลัยอุบลราชธานี',
    landmark: 'คลินิกวัยรุ่น ชั้น 1'
  },
  {
    id: 3,
    name: 'อาคารวิจัย คณะวิทยาศาสตร์ หน้้าห้องน้ำ ชั้น 2',
    status: 'หมดแล้ว',
    lat: 15.12243156,
    lng: 104.9065184,
    zone: 'คณะวิทยาศาสตร์',
    landmark: 'อาคารวิจัย หน้าห้องน้ำ ชั้น 2'
  },
  {
    id: 4,
    name: 'อาคารเคมีคณะวิทยาศาสตร์ หน้้าห้องน้ำ ชั้น 1',
    status: 'หมดแล้ว',
    lat: 15.12138677,
    lng: 104.9062624,
    zone: 'คณะวิทยาศาสตร์',
    landmark: 'อาคารเคมี หน้าห้องน้ำ ชั้น 1'
  },
  {
    id: 5,
    name: 'อาคารฟิสิกส์ คณะวิทยาศาสตร์ หน้้าห้องน้ำ ชั้น 1',
    status: 'หมดแล้ว',
    lat: 15.12139712,
    lng: 104.9068713,
    zone: 'คณะวิทยาศาสตร์',
    landmark: 'อาคารฟิสิกส์ หน้าห้องน้ำ ชั้น 1'
  },
  {
    id: 6,
    name: 'อาคารชีวภาพ คณะวิทยาศาสตร์หน้้าห้องน้ำ ชั้น 1',
    status: 'หมดแล้ว',
    lat: 15.12241473,
    lng: 104.90507,
    zone: 'คณะวิทยาศาสตร์',
    landmark: 'อาคารชีวภาพ หน้าห้องน้ำ ชั้น 1'
  },
  {
    id: 7,
    name: 'คณะศิลปศาสตร์ อาคารสถาบันภาษา (ข้างตู้น้ำ) ชั้น 1',
    status: 'มีอยู่',
    lat: 15.11702375,
    lng: 104.9087936,
    zone: 'คณะศิลปศาสตร์',
    landmark: 'อาคารสถาบันภาษา ข้างตู้น้ำ ชั้น 1'
  },
  {
    id: 8,
    name: 'คณะศิลปประยุกต์และสถาปัตยกรรมศาสตร์ ห้องน้ำชาย ชั้น 1',
    status: 'มีอยู่',
    lat: 15.11853592,
    lng: 104.9056822,
    zone: 'คณะศิลปประยุกต์ฯ',
    landmark: 'ห้องน้ำชาย ชั้น 1'
  },
  {
    id: 9,
    name: 'คณะพยาบาลศาสตร์ หน้าห้องน้ำชาย ชั้น 1',
    status: 'มีอยู่',
    lat: 15.11543718,
    lng: 104.9065761,
    zone: 'คณะพยาบาลศาสตร์',
    landmark: 'หน้าห้องน้ำชาย ชั้น 1'
  },
  {
    id: 10,
    name: 'คณะเภสัชศาสตร์ ห้องน้ำชาย ชั้น 1 อาคารนวัตกรรมการเรียนรู้ทางวิทยาศาสตร์สุขภาพ (หลังใหม่)',
    status: 'หมดแล้ว',
    lat: 15.11817916,
    lng: 104.9108215,
    zone: 'คณะเภสัชศาสตร์',
    landmark: 'อาคารนวัตกรรมการเรียนรู้ฯ ห้องน้ำชาย ชั้น 1'
  },
  {
    id: 11,
    name: 'คณะนิติศาสตร์ (หลังเก่า) หน้าห้องน้ำชั้น 1',
    status: 'หมดแล้ว',
    lat: 15.12056672,
    lng: 104.9059662,
    zone: 'คณะนิติศาสตร์',
    landmark: 'อาคารหลังเก่า หน้าห้องน้ำ ชั้น 1'
  },
  {
    id: 12,
    name: 'คณะบริหารศาสตร์ หน้าห้องน้ำ ชั้น 1 อาคาร MS',
    status: 'หมดแล้ว',
    lat: 15.11928109,
    lng: 104.9030504,
    zone: 'คณะบริหารศาสตร์',
    landmark: 'อาคาร MS หน้าห้องน้ำ ชั้น 1'
  },
  {
    id: 13,
    name: 'ว.แพทย์ ห้องน้ำชายชั้น 1 (ฝั่งงานพัฒนานักศึกษา)',
    status: 'มีอยู่',
    lat: 15.11550352,
    lng: 104.9053319,
    zone: 'วิทยาลัยแพทยศาสตร์ฯ',
    landmark: 'ห้องน้ำชาย ชั้น 1 ฝั่งงานพัฒนานักศึกษา'
  },
  {
    id: 14,
    name: 'คณะเกษตรศาสตร์ ห้องน้ำชาย ชั้น 1',
    status: 'หมดแล้ว',
    lat: 15.12196957,
    lng: 104.908739,
    zone: 'คณะเกษตรศาสตร์',
    landmark: 'ห้องน้ำชาย ชั้น 1'
  },
  {
    id: 15,
    name: 'คณะวิศวกรรมศาสตร์ รปภ. ตึก EN6',
    status: 'มีอยู่',
    lat: 15.12007567,
    lng: 104.9048176,
    zone: 'คณะวิศวกรรมศาสตร์',
    landmark: 'จุดบริการ รปภ. ตึก EN6'
  }
];

export const INITIAL_VOLUNTEER_LOGS: VolunteerLog[] = [
  {
    id: 'vol-101',
    date: '2026-09-27 14:30',
    name: 'กิตติศักดิ์ พงษ์ไพบูลย์',
    year: '3',
    faculty: 'คณะวิทยาศาสตร์',
    studentId: '6601001',
    location: 'อาคารวิจัย คณะวิทยาศาสตร์ หน้้าห้องน้ำ ชั้น 2',
    lubricant: 20,
    size49: 15,
    size52: 25,
    size54: 20,
    size56: 10,
    comment: 'กล่องอยู่ในสภาพดี เติมเรียบร้อยทุกช่องขนาดครับ',
    imageUrl: ''
  },
  {
    id: 'vol-102',
    date: '2026-09-27 11:15',
    name: 'นภัสสร อัครเดชา',
    year: '3',
    faculty: 'คณะวิศวกรรมศาสตร์',
    studentId: '6601002',
    location: 'คณะวิศวกรรมศาสตร์ รปภ. ตึก EN6',
    lubricant: 30,
    size49: 20,
    size52: 35,
    size54: 25,
    size56: 15,
    comment: 'เช็คทำความสะอาดกล่องและเติมเจลหล่อลื่นเพิ่มเติม',
    imageUrl: ''
  },
  {
    id: 'vol-103',
    date: '2026-09-26 16:45',
    name: 'ชานนท์ สุวรรณเมธา',
    year: '4',
    faculty: 'คณะบริหารศาสตร์',
    studentId: '6601003',
    location: 'คณะบริหารศาสตร์ หน้าห้องน้ำ ชั้น 1 อาคาร MS',
    lubricant: 15,
    size49: 10,
    size52: 30,
    size54: 20,
    size56: 10,
    comment: 'เปลี่ยนป้ายสัญลักษณ์ให้ชัดเจนขึ้น',
    imageUrl: ''
  },
  {
    id: 'vol-104',
    date: '2026-09-26 10:20',
    name: 'พิมพิศา ธีรปัญญา',
    year: '2',
    faculty: 'คณะรัฐศาสตร์',
    studentId: '6601004',
    location: 'หน้าห้องสโมสรนักศึกษา คณะรัฐศาสตร์',
    lubricant: 25,
    size49: 20,
    size52: 40,
    size54: 30,
    size56: 20,
    comment: 'จุดนี้คนใช้บริการเยอะมาก ไซส์ 52 หมดไวที่สุด',
    imageUrl: ''
  },
  {
    id: 'vol-105',
    date: '2026-09-25 15:00',
    name: 'อัครพล วัฒนกิจ',
    year: '3',
    faculty: 'คณะพยาบาลศาสตร์',
    studentId: '6601005',
    location: 'คณะพยาบาลศาสตร์ หน้าห้องน้ำชาย ชั้น 1',
    lubricant: 10,
    size49: 15,
    size52: 20,
    size54: 15,
    size56: 10,
    comment: 'นำถุงยางมาเติมตามรอบตรวจประจำสัปดาห์',
    imageUrl: ''
  }
];

export const INITIAL_RATINGS: number[] = [5, 5, 5, 4, 5, 5, 4, 5, 5, 4, 3, 5, 4, 5, 5, 4, 5, 5, 4, 5];

export const INITIAL_SURVEY_RECORDS: SurveyRecord[] = [
  { id: 'sur-101', date: '2026-10-26 18:30', rating: 5, feedback: 'ตู้บริการตั้งอยู่ใกล้อาคารเรียน หาเจอง่าย ใช้งานสะดวกและมิดชิดมากครับ' },
  { id: 'sur-102', date: '2026-10-26 15:20', rating: 5, feedback: 'เป็นโครงการสวัสดิการที่ดีมาก ช่วยลดความเขินอาย มีเจลหล่อลื่นพร้อมบริการด้วย' },
  { id: 'sur-103', date: '2026-10-25 20:10', rating: 4, feedback: 'อยากให้เพิ่มจุดติดตั้งหน้าหอพักนักศึกษาเพิ่มเติมด้วยครับ' },
  { id: 'sur-104', date: '2026-10-25 14:05', rating: 5, feedback: 'ประทับใจระบบแผนที่ออนไลน์ เช็คสถานะตู้บริการได้ real-time ไม่ต้องเดินเก้อ' },
  { id: 'sur-105', date: '2026-10-24 19:45', rating: 5, feedback: 'ไซส์ 52 มม. เติมไวมาก ขอบคุณพี่ๆ จิตอาสาและโรงพยาบาล ม.อุบลฯ ครับ' },
  { id: 'sur-106', date: '2026-10-24 11:30', rating: 4, feedback: 'กล่องจุดบริการสะอาดเรียบร้อยดีมากครับ' },
  { id: 'sur-107', date: '2026-10-23 16:15', rating: 5, feedback: 'สะดวก ปลอดภัย เข้าถึงง่าย มีประโยชน์กับนักศึกษามากค่ะ' },
  { id: 'sur-108', date: '2026-10-22 13:50', rating: 5, feedback: 'ระบบแสดงแผนที่แม่นยำ นำทางด้วย Google Maps ได้สะดวกมาก' },
];

// Google Apps Script Source Code Template สำหรับให้แอดมินหรือผู้ดูแลระบบนำไปวางใน Google Sheets
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * UBU CONDOM - GOOGLE APPS SCRIPT BACKEND (ระบบหลังบ้าน Google Sheets)
 * มหาวิทยาลัยอุบลราชธานี
 * =========================================================================
 * วิธีติดตั้ง:
 * 1. ใน Google Sheet > เมนู "ส่วนขยาย (Extensions)" > "Apps Script"
 * 2. ลบโค้ดเดิมทั้งหมดออก แล้ววางโค้ดนี้ลงไป
 * 3. กดบันทึก (Ctrl+S) แล้วกดปุ่ม "การทำให้ใช้งานได้ (Deploy)" > "การทำให้ใช้งานได้ใหม่ (New deployment)"
 * 4. เลือกประเภท: "เว็บแอป (Web app)"
 * 5. ตั้งค่าดังนี้:
 *    - Execute as: Me (ฉัน)
 *    - Who has access: Anyone (ทุกคน)
 * 6. กด "Deploy" แล้วคัดลอก Web App URL (ลงท้ายด้วย /exec) มาวางในระบบ
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const LOCATIONS_SHEET_NAME = 'Locations';
const VOLUNTEER_LOGS_SHEET_NAME = 'VolunteerLogs';
const SURVEYS_SHEET_NAME = 'Surveys';

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'getLocations';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  setupInitialSheets(ss);

  if (action === 'getLocations') {
    const locSheet = ss.getSheetByName(LOCATIONS_SHEET_NAME);
    const data = locSheet.getDataRange().getValues();
    const headers = data[0] || [];
    const locations = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0] || row[1]) {
        locations.push({
          id: i,
          name: row[1] || row[0],
          status: row[2] || 'มีอยู่',
          lat: Number(row[3]) || 15.1190,
          lng: Number(row[4]) || 104.9030,
        });
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      locations: locations,
      data: locations
    })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'getAdminData') {
    const logSheet = ss.getSheetByName(VOLUNTEER_LOGS_SHEET_NAME);
    const surveySheet = ss.getSheetByName(SURVEYS_SHEET_NAME);

    const logData = logSheet ? logSheet.getDataRange().getValues() : [];
    const logs = [];
    for (let i = 1; i < logData.length; i++) {
      const r = logData[i];
      if (r[0] || r[1]) {
        logs.push({
          id: 'log-' + i,
          date: String(r[0]),
          name: String(r[1]),
          studentId: String(r[2]),
          faculty: String(r[3]),
          year: String(r[4]),
          location: String(r[5]),
          lubricant: Number(r[6]) || 0,
          size49: Number(r[7]) || 0,
          size52: Number(r[8]) || 0,
          size54: Number(r[9]) || 0,
          size56: Number(r[10]) || 0,
          comment: String(r[11] || ''),
          imageUrl: String(r[12] || ''),
        });
      }
    }

    const surveyData = surveySheet ? surveySheet.getDataRange().getValues() : [];
    const ratings = [];
    for (let j = 1; j < surveyData.length; j++) {
      const star = Number(surveyData[j][1]);
      if (star >= 1 && star <= 5) {
        ratings.push(star);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      logs: logs.reverse(),
      ratings: ratings.length > 0 ? ratings : [5, 5, 5, 4, 5, 5, 4, 5, 5, 4],
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Ready' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  setupInitialSheets(ss);

  let payload = {};
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Invalid JSON' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const action = payload.action;

  // 1. แจ้งเตือนของหมด (Report Out)
  if (action === 'reportOut') {
    const locName = payload.locationName;
    const locSheet = ss.getSheetByName(LOCATIONS_SHEET_NAME);
    const data = locSheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === locName || data[i][0] === locName) {
        locSheet.getRange(i + 1, 3).setValue('หมดแล้ว');
        break;
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'บันทึกสถานะของหมด ณ ' + locName + ' สำเร็จ'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 2. ปรับสถานะจุดบริการ (Admin Toggle)
  if (action === 'toggleStatus') {
    const locName = payload.locationName;
    const newStatus = payload.newStatus;
    const locSheet = ss.getSheetByName(LOCATIONS_SHEET_NAME);
    const data = locSheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === locName || data[i][0] === locName) {
        locSheet.getRange(i + 1, 3).setValue(newStatus);
        break;
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'อัปเดตสถานะ ' + locName + ' เป็น ' + newStatus
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 3. จิตอาสาบันทึกการเติมสต็อก + อัปโหลดรูปภาพลง Google Drive
  if (action === 'volunteerReplenish') {
    const data = payload.data || {};
    let imageUrl = '';

    // บันทึกรูปลงโฟลเดอร์ Google Drive (ถ้ามี)
    if (payload.photoBase64) {
      try {
        const decoded = Utilities.base64Decode(payload.photoBase64);
        const blob = Utilities.newBlob(decoded, payload.photoMimeType || 'image/jpeg', payload.photoFileName || ('volunteer_' + Date.now() + '.jpg'));
        
        let folder;
        const folders = DriveApp.getFoldersByName('UBU_Condom_Volunteer_Photos');
        if (folders.hasNext()) {
          folder = folders.next();
        } else {
          folder = DriveApp.createFolder('UBU_Condom_Volunteer_Photos');
        }
        const file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        imageUrl = file.getUrl();
      } catch (imgErr) {
        imageUrl = 'Error saving image: ' + imgErr.toString();
      }
    }

    // บันทึกลง Sheet: VolunteerLogs
    const logSheet = ss.getSheetByName(VOLUNTEER_LOGS_SHEET_NAME);
    const timestamp = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm');
    logSheet.appendRow([
      timestamp,
      data.name || '',
      data.studentId || '',
      data.faculty || '',
      data.year || '',
      data.location || '',
      Number(data.lubricant) || 0,
      Number(data.size49) || 0,
      Number(data.size52) || 0,
      Number(data.size54) || 0,
      Number(data.size56) || 0,
      data.comment || '',
      imageUrl
    ]);

    // ปรับสถานะจุดบริการเป็น "มีอยู่"
    const locSheet = ss.getSheetByName(LOCATIONS_SHEET_NAME);
    const locData = locSheet.getDataRange().getValues();
    for (let i = 1; i < locData.length; i++) {
      if (locData[i][1] === data.location || locData[i][0] === data.location) {
        locSheet.getRange(i + 1, 3).setValue('มีอยู่');
        break;
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'บันทึกข้อมูลจิตอาสาสำเร็จ!',
      imageUrl: imageUrl
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 4. ส่งแบบประเมินความพึงพอใจ
  if (action === 'submitSurvey') {
    const surveySheet = ss.getSheetByName(SURVEYS_SHEET_NAME);
    const timestamp = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm');
    surveySheet.appendRow([
      timestamp,
      Number(payload.rating) || 5,
      payload.feedback || ''
    ]);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'บันทึกแบบประเมินเรียบร้อยแล้ว'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Unknown action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ฟังก์ชันสร้างชีตเริ่มต้นอัตโนมัติหากยังไม่มี
function setupInitialSheets(ss) {
  let locSheet = ss.getSheetByName(LOCATIONS_SHEET_NAME);
  if (!locSheet) {
    locSheet = ss.insertSheet(LOCATIONS_SHEET_NAME);
    locSheet.appendRow(['ID', 'LocationName', 'Status', 'Lat', 'Lng']);
    const initialLocations = [
      [1, 'หน้าห้องสโมสรนักศึกษา คณะรัฐศาสตร์', 'มีอยู่', 15.12039012, 104.9102716],
      [2, 'คลินิกวัยรุ่น โรงพยาบาลมหาวิทยาลัยอุบลราชธานี', 'มีอยู่', 15.11355507, 104.9017012],
      [3, 'อาคารวิจัย คณะวิทยาศาสตร์ หน้้าห้องน้ำ ชั้น 2', 'หมดแล้ว', 15.12243156, 104.9065184],
      [4, 'อาคารเคมีคณะวิทยาศาสตร์ หน้้าห้องน้ำ ชั้น 1', 'หมดแล้ว', 15.12138677, 104.9062624],
      [5, 'อาคารฟิสิกส์ คณะวิทยาศาสตร์ หน้้าห้องน้ำ ชั้น 1', 'หมดแล้ว', 15.12139712, 104.9068713],
      [6, 'อาคารชีวภาพ คณะวิทยาศาสตร์หน้้าห้องน้ำ ชั้น 1', 'หมดแล้ว', 15.12241473, 104.90507],
      [7, 'คณะศิลปศาสตร์ อาคารสถาบันภาษา (ข้างตู้น้ำ) ชั้น 1', 'มีอยู่', 15.11702375, 104.9087936],
      [8, 'คณะศิลปประยุกต์และสถาปัตยกรรมศาสตร์ ห้องน้ำชาย ชั้น 1', 'มีอยู่', 15.11853592, 104.9056822],
      [9, 'คณะพยาบาลศาสตร์ หน้าห้องน้ำชาย ชั้น 1', 'มีอยู่', 15.11543718, 104.9065761],
      [10, 'คณะเภสัชศาสตร์ ห้องน้ำชาย ชั้น 1 อาคารนวัตกรรมการเรียนรู้ทางวิทยาศาสตร์สุขภาพ (หลังใหม่)', 'หมดแล้ว', 15.11817916, 104.9108215],
      [11, 'คณะนิติศาสตร์ (หลังเก่า) หน้าห้องน้ำชั้น 1', 'หมดแล้ว', 15.12056672, 104.9059662],
      [12, 'คณะบริหารศาสตร์ หน้าห้องน้ำ ชั้น 1 อาคาร MS', 'หมดแล้ว', 15.11928109, 104.9030504],
      [13, 'ว.แพทย์ ห้องน้ำชายชั้น 1 (ฝั่งงานพัฒนานักศึกษา)', 'มีอยู่', 15.11550352, 104.9053319],
      [14, 'คณะเกษตรศาสตร์ ห้องน้ำชาย ชั้น 1', 'หมดแล้ว', 15.12196957, 104.908739],
      [15, 'คณะวิศวกรรมศาสตร์ รปภ. ตึก EN6', 'มีอยู่', 15.12007567, 104.9048176]
    ];
    initialLocations.forEach(function(row) {
      locSheet.appendRow(row);
    });
  }

  let logSheet = ss.getSheetByName(VOLUNTEER_LOGS_SHEET_NAME);
  if (!logSheet) {
    logSheet = ss.insertSheet(VOLUNTEER_LOGS_SHEET_NAME);
    logSheet.appendRow([
      'Date', 'VolunteerName', 'StudentID', 'Faculty', 'Year', 'Location',
      'Lubricant', 'Size49', 'Size52', 'Size54', 'Size56', 'Comment', 'ImageUrl'
    ]);
  }

  let surveySheet = ss.getSheetByName(SURVEYS_SHEET_NAME);
  if (!surveySheet) {
    surveySheet = ss.insertSheet(SURVEYS_SHEET_NAME);
    surveySheet.appendRow(['Date', 'Rating', 'Feedback']);
  }
}
`;
