import { DatasetPreset } from '../types/gas';

export const SAMPLE_DATASETS: DatasetPreset[] = [
  {
    id: 'inventory-demo',
    name: 'Inventory & Product Catalog',
    nameTh: 'คลังสินค้า & รายการสินค้า',
    description: 'Track products, warehouse stock levels, unit pricing, suppliers, and re-order thresholds.',
    descriptionTh: 'ระบบจัดการสินค้าคงคลัง ตรวจเช็คจำนวนคงเหลือ หมวดหมู่ และสถานะพร้อมจัดส่ง',
    icon: 'Package',
    primaryKey: 'id',
    statusField: 'status',
    fields: [
      { key: 'id', label: 'Product ID', type: 'string', isPrimaryKey: true, isRequired: true },
      { key: 'name', label: 'ชื่อสินค้า', type: 'string', isRequired: true },
      { key: 'category', label: 'หมวดหมู่', type: 'select', options: ['อิเล็กทรอนิกส์', 'อุปกรณ์สำนักงาน', 'เครื่องใช้ไฟฟ้า', 'เครื่องแต่งกาย', 'อาหาร/เครื่องดื่ม'] },
      { key: 'sku', label: 'รหัส SKU', type: 'string' },
      { key: 'stock', label: 'คงเหลือ (ชิ้น)', type: 'number', isRequired: true },
      { key: 'minStock', label: 'จุดสั่งซื้อขั้นต่ำ', type: 'number' },
      { key: 'price', label: 'ราคาต่อหน่วย (฿)', type: 'number', isRequired: true },
      { key: 'status', label: 'สถานะ', type: 'status', options: ['พร้อมจำหน่าย', 'สินค้าใกล้หมด', 'สินค้าหมด', 'รอสั่งซื้อ'] },
      { key: 'supplier', label: 'ผู้จัดจำหน่าย', type: 'string' },
      { key: 'lastUpdated', label: 'อัปเดตล่าสุด', type: 'date' }
    ],
    recommendedScript: 'full-crud-sheet',
    data: [
      { id: 'PRD-1001', name: 'MacBook Air M3 15-inch', category: 'อิเล็กทรอนิกส์', sku: 'APL-MBA-15', stock: 24, minStock: 5, price: 47900, status: 'พร้อมจำหน่าย', supplier: 'Apple Authorized TH', lastUpdated: '2026-09-24' },
      { id: 'PRD-1002', name: 'Logitech MX Master 3S', category: 'อิเล็กทรอนิกส์', sku: 'LOG-MXM-3S', stock: 8, minStock: 10, price: 3890, status: 'สินค้าใกล้หมด', supplier: 'Synnex Thailand', lastUpdated: '2026-09-25' },
      { id: 'PRD-1003', name: 'เก้าอี้เพื่อสุขภาพ Ergonomic Pro', category: 'อุปกรณ์สำนักงาน', sku: 'OFC-CHR-01', stock: 15, minStock: 4, price: 12500, status: 'พร้อมจำหน่าย', supplier: 'WorkSpace Solution', lastUpdated: '2026-09-20' },
      { id: 'PRD-1004', name: 'โต๊ะทำงานปรับระดับไฟฟ้า Dual Motor', category: 'อุปกรณ์สำนักงาน', sku: 'DSK-ELE-02', stock: 3, minStock: 5, price: 18900, status: 'สินค้าใกล้หมด', supplier: 'ErgoTech Living', lastUpdated: '2026-09-26' },
      { id: 'PRD-1005', name: 'จอแสดงผล Dell UltraSharp 27 4K', category: 'อิเล็กทรอนิกส์', sku: 'DEL-U27-4K', stock: 0, minStock: 6, price: 21900, status: 'สินค้าหมด', supplier: 'VST ECS Thailand', lastUpdated: '2026-09-22' },
      { id: 'PRD-1006', name: 'หูฟังตัดเสียงรบกวน Sony WH-1000XM5', category: 'อิเล็กทรอนิกส์', sku: 'SNY-WH-XM5', stock: 19, minStock: 5, price: 13990, status: 'พร้อมจำหน่าย', supplier: 'Sony Thai Co., Ltd.', lastUpdated: '2026-09-27' },
      { id: 'PRD-1007', name: 'เครื่องชงกาแฟ Espresso Capsule Mini', category: 'เครื่องใช้ไฟฟ้า', sku: 'COF-MIN-09', stock: 2, minStock: 4, price: 4590, status: 'สินค้าใกล้หมด', supplier: 'Aroma Group', lastUpdated: '2026-09-18' },
      { id: 'PRD-1008', name: 'เมล็ดกาแฟดอยช้าง คั่วกลาง 500g', category: 'อาหาร/เครื่องดื่ม', sku: 'COF-BN-500', stock: 45, minStock: 15, price: 380, status: 'พร้อมจำหน่าย', supplier: 'Doi Chaang Estate', lastUpdated: '2026-09-27' },
      { id: 'PRD-1009', name: 'ชุดไฟสตูดิโอ LED Softbox 100W', category: 'อิเล็กทรอนิกส์', sku: 'LGT-SFT-10', stock: 0, minStock: 3, price: 2990, status: 'รอสั่งซื้อ', supplier: 'Godox Thailand', lastUpdated: '2026-09-15' },
      { id: 'PRD-1010', name: 'สมุดบันทึกหนังแท้ A5 Dot Grid', category: 'อุปกรณ์สำนักงาน', sku: 'STA-NBK-A5', stock: 68, minStock: 20, price: 420, status: 'พร้อมจำหน่าย', supplier: 'B2S Station', lastUpdated: '2026-09-26' }
    ]
  },
  {
    id: 'students-demo',
    name: 'Student & Member Directory',
    nameTh: 'ทะเบียนนักเรียน / บุคลากร',
    description: 'Manage student records, departments, enrollments, GPA scores, and academic status.',
    descriptionTh: 'ระบบฐานข้อมูลนักศึกษา ทะเบียนประวัติ คณะ สาขาวิชา เกรดเฉลี่ย และสถานะการศึกษา',
    icon: 'GraduationCap',
    primaryKey: 'studentId',
    statusField: 'status',
    fields: [
      { key: 'studentId', label: 'รหัสนักศึกษา', type: 'string', isPrimaryKey: true, isRequired: true },
      { key: 'fullName', label: 'ชื่อ-นามสกุล', type: 'string', isRequired: true },
      { key: 'faculty', label: 'คณะ', type: 'select', options: ['คณะวิทยาศาสตร์', 'คณะวิศวกรรมศาสตร์', 'คณะบริหารธุรกิจ', 'คณะมนุษยศาสตร์', 'คณะเทคโนโลยีสารสนเทศ'] },
      { key: 'major', label: 'สาขาวิชา', type: 'string' },
      { key: 'year', label: 'ชั้นปี', type: 'select', options: ['ปี 1', 'ปี 2', 'ปี 3', 'ปี 4', 'ปริญญาโท'] },
      { key: 'gpa', label: 'GPA', type: 'number' },
      { key: 'email', label: 'อีเมลสถาบัน', type: 'email' },
      { key: 'status', label: 'สถานะสภาพ', type: 'status', options: ['ปกติ (Active)', 'พักการเรียน', 'สำเร็จการศึกษา', 'รอตรวจสอบ'] },
      { key: 'enrollmentDate', label: 'วันที่เข้าศึกษา', type: 'date' }
    ],
    recommendedScript: 'full-crud-sheet',
    data: [
      { studentId: '6601001', fullName: 'กิตติศักดิ์ พงษ์ไพบูลย์', faculty: 'คณะวิทยาศาสตร์', major: 'วิทยาการคอมพิวเตอร์', year: 'ปี 3', gpa: 3.82, email: 'kittisak.p@ubu.ac.th', status: 'ปกติ (Active)', enrollmentDate: '2023-06-15' },
      { studentId: '6601002', fullName: 'นภัสสร อัครเดชา', faculty: 'คณะวิศวกรรมศาสตร์', major: 'วิศวกรรมปัญญาประดิษฐ์', year: 'ปี 3', gpa: 3.95, email: 'napassorn.a@ubu.ac.th', status: 'ปกติ (Active)', enrollmentDate: '2023-06-15' },
      { studentId: '6601003', fullName: 'ชานนท์ สุวรรณเมธา', faculty: 'คณะบริหารธุรกิจ', major: 'การตลาดดิจิทัล', year: 'ปี 4', gpa: 3.45, email: 'chanon.s@ubu.ac.th', status: 'ปกติ (Active)', enrollmentDate: '2022-06-20' },
      { studentId: '6601004', fullName: 'พิมพิศา ธีรปัญญา', faculty: 'คณะเทคโนโลยีสารสนเทศ', major: 'ความมั่นคงไซเบอร์', year: 'ปี 2', gpa: 3.68, email: 'pimpisa.t@ubu.ac.th', status: 'ปกติ (Active)', enrollmentDate: '2024-06-18' },
      { studentId: '6601005', fullName: 'อัครพล วัฒนกิจ', faculty: 'คณะวิศวกรรมศาสตร์', major: 'วิศวกรรมหุ่นยนต์', year: 'ปี 3', gpa: 3.15, email: 'akarapol.w@ubu.ac.th', status: 'พักการเรียน', enrollmentDate: '2023-06-15' },
      { studentId: '6601006', fullName: 'มนัสวี กลิ่นสุคนธ์', faculty: 'คณะมนุษยศาสตร์', major: 'ภาษาอังกฤษเพื่อการสื่อสาร', year: 'ปี 4', gpa: 3.89, email: 'manatsawee.k@ubu.ac.th', status: 'สำเร็จการศึกษา', enrollmentDate: '2022-06-20' },
      { studentId: '6601007', fullName: 'ธนกฤต เลิศพิสิฐ', faculty: 'คณะวิทยาศาสตร์', major: 'คณิตศาสตร์ประกันภัย', year: 'ปี 1', gpa: 3.50, email: 'thanakrit.l@ubu.ac.th', status: 'ปกติ (Active)', enrollmentDate: '2025-06-12' }
    ]
  },
  {
    id: 'tickets-demo',
    name: 'Helpdesk & Service Tickets',
    nameTh: 'ระบบแจ้งซ่อม & Service Tickets',
    description: 'Track IT service requests, bug reports, equipment issues, priority queues, and assignees.',
    descriptionTh: 'ระบบแจ้งซ่อมและใบงานฝ่ายไอที ติดตามสถานะงาน ระดับความเร่งด่วน และผู้รับผิดชอบ',
    icon: 'LifeBuoy',
    primaryKey: 'ticketId',
    statusField: 'status',
    fields: [
      { key: 'ticketId', label: 'Ticket ID', type: 'string', isPrimaryKey: true, isRequired: true },
      { key: 'title', label: 'หัวข้อปัญหา/คำร้อง', type: 'string', isRequired: true },
      { key: 'requester', label: 'ผู้แจ้ง', type: 'string', isRequired: true },
      { key: 'department', label: 'แผนก', type: 'select', options: ['การเงินและบัญชี', 'การตลาด', 'ทรัพยากรบุคคล', 'เทคโนโลยีสารสนเทศ', 'ฝ่ายปฏิบัติการ'] },
      { key: 'priority', label: 'ความเร่งด่วน', type: 'select', options: ['ต่ำ (Low)', 'ปานกลาง (Medium)', 'ด่วน (High)', 'ด่วนมาก (Critical)'] },
      { key: 'status', label: 'สถานะคำร้อง', type: 'status', options: ['รอดำเนินการ (New)', 'กำลังดำเนินการ (In Progress)', 'รออะไหล่/ข้อมูล', 'เสร็จสิ้น (Resolved)'] },
      { key: 'assignedTo', label: 'ผู้รับผิดชอบ', type: 'string' },
      { key: 'createdAt', label: 'วันที่แจ้ง', type: 'date' }
    ],
    recommendedScript: 'full-crud-sheet',
    data: [
      { ticketId: 'TCK-2026-081', title: 'เครื่องพิมพ์ชั้น 4 หมึกหมดและกระดาษติด', requester: 'สมหญิง ศรีสมร', department: 'การเงินและบัญชี', priority: 'ปานกลาง (Medium)', status: 'กำลังดำเนินการ (In Progress)', assignedTo: 'ช่างเอก (IT Support)', createdAt: '2026-09-27' },
      { ticketId: 'TCK-2026-082', title: 'ไม่สามารถเข้าใช้งานระบบ VPN สำนักงานใหญ่ได้', requester: 'วรวิทย์ สุขเจริญ', department: 'ฝ่ายปฏิบัติการ', priority: 'ด่วนมาก (Critical)', status: 'กำลังดำเนินการ (In Progress)', assignedTo: 'วิศวกรต้น (Network)', createdAt: '2026-09-27' },
      { ticketId: 'TCK-2026-083', title: 'ขอเพิ่มสิทธิ์เข้าถึง Google Drive แผนกการตลาด', requester: 'ศศิธร บุญญา', department: 'การตลาด', priority: 'ต่ำ (Low)', status: 'เสร็จสิ้น (Resolved)', assignedTo: 'แอดมินบิว (IT Admin)', createdAt: '2026-09-26' },
      { ticketId: 'TCK-2026-084', title: 'หน้าจอคอมพิวเตอร์ห้องประชุม 2 ดับกะทันหัน', requester: 'ธีรเดช เกียรติคุณ', department: 'ทรัพยากรบุคคล', priority: 'ด่วน (High)', status: 'รอดำเนินการ (New)', assignedTo: 'ช่างเอก (IT Support)', createdAt: '2026-09-27' },
      { ticketId: 'TCK-2026-085', title: 'ติดตั้งโปรแกรมสถิติ SPSS สำหรับพนักงานใหม่', requester: 'กัญญาภัทร ลือชา', department: 'การตลาด', priority: 'ต่ำ (Low)', status: 'เสร็จสิ้น (Resolved)', assignedTo: 'ช่างเอก (IT Support)', createdAt: '2026-09-25' }
    ]
  }
];
