var APP = {
  name: 'StockPilot',
  tagline: 'ระบบบริหารจัดการสต๊อกสินค้า',
  version: '1.1.0',
  storagePrefix: 'stockpilot_',
  apiBase: ''
};

var ROLES = {
  admin: 'ผู้ดูแลระบบ',
  buyer: 'ฝ่ายจัดซื้อ',
  pricing: 'ฝ่ายตั้งราคา',
  approver: 'ผู้อนุมัติ',
  uploader: 'ทีมอัปโหลดข้อมูล',
  viewer: 'ผู้บริหาร'
};

var NAV = [
  { key: 'dashboard', label: 'ภาพรวม', roles: ['admin', 'buyer', 'pricing', 'approver', 'uploader', 'viewer'] },
  { key: 'import_stock', label: 'นำเข้าสต๊อก', roles: ['admin', 'uploader'] },
  { key: 'import_price', label: 'นำเข้าราคาซื้อ', roles: ['admin', 'uploader'] },
  { key: 'recommend', label: 'แนะนำสั่งซื้อ', roles: ['admin', 'buyer', 'viewer'] },
  { key: 'pricing', label: 'ตั้งราคาขาย', roles: ['admin', 'pricing', 'viewer'] },
  { key: 'approve', label: 'อนุมัติ', roles: ['admin', 'approver'] },
  { key: 'reports', label: 'รายงาน', roles: ['admin', 'buyer', 'pricing', 'approver', 'viewer'] },
  { key: 'settings', label: 'ตั้งค่าระบบ', roles: ['admin'] }
];

var PAGE_TITLES = {
  dashboard: 'ภาพรวม',
  import_stock: 'นำเข้าข้อมูลด้านคลัง',
  import_price: 'นำเข้าข้อมูลราคาซื้อ',
  recommend: 'รายการแนะนำสั่งซื้อ',
  pricing: 'ตั้งราคาขาย (Cost + GP)',
  approve: 'การอนุมัติ',
  reports: 'รายงานบริหารสต๊อก',
  settings: 'ตั้งค่าระบบ'
};

var STOCK_HEADERS = ['รหัสสินค้า', 'ชื่อสินค้า', 'หมวดหมู่', 'หน่วย', 'สาขา', 'คงเหลือ', 'กำลังเข้า', 'ขายเมื่อวาน', 'ขาย7วัน', 'ขาย30วัน', 'ต้นทุนล่าสุด'];
var STOCK_ALIASES = {
  'รหัสสินค้า': ['รหัสสินค้า', 'รหัส', 'code', 'item_code', 'sku', 'sku_code', 'barcode', 'รหัสบาร์โค้ด'],
  'ชื่อสินค้า': ['ชื่อสินค้า', 'ชื่อ', 'name', 'item_name', 'product_name', 'description'],
  'หมวดหมู่': ['หมวดหมู่', 'หมวด', 'category', 'categories'],
  'หน่วย': ['หน่วย', 'หน่วยนับ', 'unit', 'uom', 'units'],
  'สาขา': ['สาขา', 'branch', 'store', 'warehouse'],
  'คงเหลือ': ['คงเหลือ', 'ยอดคงเหลือ', 'stock', 'stock_on_hand', 'qty', 'quantity', 'on_hand'],
  'กำลังเข้า': ['กำลังเข้า', 'ระหว่างทาง', 'incoming', 'in_transit', 'on_order', 'po_qty'],
  'ขายเมื่อวาน': ['ขายเมื่อวาน', 'ขายวานนี้', 'sales_yesterday', 'yesterday', 'qty_sold_y'],
  'ขาย7วัน': ['ขาย7วัน', 'ขาย 7 วัน', 'sales7', 'sales_7d', 'qty_7d', 'last7'],
  'ขาย30วัน': ['ขาย30วัน', 'ขาย 30 วัน', 'sales30', 'sales_30d', 'qty_30d', 'last30'],
  'ต้นทุนล่าสุด': ['ต้นทุนล่าสุด', 'ต้นทุน', 'cost', 'unit_cost', 'latest_cost', 'cost_latest', 'ต้นทุนหน่วย']
};

var PRICE_HEADERS = ['รหัสสินค้า', 'ชื่อสินค้า', 'ราคาซื้อ', 'ราคาเปรียบเทียบ', 'หน่วย'];
var PRICE_ALIASES = {
  'รหัสสินค้า': ['รหัสสินค้า', 'รหัส', 'code', 'item_code', 'sku', 'sku_code', 'barcode'],
  'ชื่อสินค้า': ['ชื่อสินค้า', 'ชื่อ', 'name', 'item_name', 'product_name'],
  'ราคาซื้อ': ['ราคาซื้อ', 'ราคา', 'price', 'unit_price', 'cost', 'buy_price', 'net_price', 'ราคาต่อหน่วย'],
  'ราคาเปรียบเทียบ': ['ราคาเปรียบเทียบ', 'ราคาเดิม', 'compare_price', 'old_price', 'last_price'],
  'หน่วย': ['หน่วย', 'หน่วยนับ', 'unit', 'uom']
};

var PRODUCT_HEADERS = ['รหัสสินค้า', 'ชื่อสินค้า', 'หมวดหมู่', 'หน่วย', 'จำนวนต่อแพ็ก', 'ซัพพลายเออร์'];
var PRODUCT_ALIASES = {
  'รหัสสินค้า': ['รหัสสินค้า', 'รหัส', 'code', 'item_code', 'sku', 'sku_code', 'barcode', 'รหัสบาร์โค้ด'],
  'ชื่อสินค้า': ['ชื่อสินค้า', 'ชื่อ', 'name', 'item_name', 'product_name', 'description'],
  'หมวดหมู่': ['หมวดหมู่', 'หมวด', 'category', 'categories'],
  'หน่วย': ['หน่วย', 'หน่วยนับ', 'unit', 'uom', 'units'],
  'จำนวนต่อแพ็ก': ['จำนวนต่อแพ็ก', 'แพ็ก', 'pack', 'pack_size', 'qty_pack', 'pack_qty'],
  'ซัพพลายเออร์': ['ซัพพลายเออร์', 'supplier', 'vendor', 'ผู้ขาย']
};

var BPLUS_DEFAULT_COLUMNS = ['รหัสสินค้า', 'ชื่อสินค้า', 'จำนวนสั่งซื้อ', 'ราคาซื้อ', 'หน่วย', 'สาขา'];

var CATEGORY_HEADERS = ['หมวดหมู่', 'GP (%)', 'Min (วัน)', 'Max (วัน)'];
var CATEGORY_ALIASES = {
  'หมวดหมู่': ['หมวดหมู่', 'หมวดหมู่สินค้า', 'ชื่อหมวดหมู่', 'หมวด', 'ชื่อหมวด', 'ประเภท', 'category', 'name'],
  'GP': ['GP', 'GP%', 'GP (%)', 'GP มาตรฐาน', 'gp', 'gp%', 'อัตรากำไร', 'กำไร', 'กำไรขั้นต้น', 'margin', 'standard_gp'],
  'Min (วัน)': ['Min', 'Min (วัน)', 'min', 'min_days', 'ขั้นต่ำ', 'ต่ำสุด', 'ขั้นต่ำ (วัน)'],
  'Max (วัน)': ['Max', 'Max (วัน)', 'max', 'max_days', 'สูงสุด', 'สูงสุด (วัน)']
};

var PAYMENT_METHODS = ['เงินสด', 'เครดิต', 'เช็ค'];

var SUPPLIER_HEADERS = ['รหัสเจ้าหนี้', 'ชื่อเจ้าหนี้', 'วิธีการชำระเงิน', 'credit term (วัน)'];
var SUPPLIER_ALIASES = {
  'รหัสเจ้าหนี้': ['รหัสเจ้าหนี้', 'รหัส', 'code', 'id', 'creditor_code', 'creditor', 'supplier_code', 'รหัสซัพพลายเออร์', 'รหัสเจ้าหนี้/ผู้จัดจำหน่าย'],
  'ชื่อเจ้าหนี้': ['ชื่อเจ้าหนี้', 'ชื่อซัพพลายเออร์', 'ชื่อ', 'name', 'supplier', 'supplier_name', 'vendor', 'ผู้ขาย'],
  'วิธีการชำระเงิน': ['วิธีการชำระเงิน', 'วิธีชำระเงิน', 'การชำระเงิน', 'เงื่อนไขการชำระเงิน', 'payment', 'payment_method', 'pay_method'],
  'credit term (วัน)': ['credit term', 'credit term (วัน)', 'credit_term', 'creditterm', 'เครดิตเทอม', 'เครดิตเทอม (วัน)', 'วันเครดิต', 'cr_term', 'credit days']
};

var DEFAULT_SETTINGS = {
  leadTimeDays: 7,
  safetyStockDays: 3,
  orderCycleDays: 14,
  roundingCoin: 1,
  approverLimit: 50000,
  lowStockDOH: 7,
  deadStockDays: 90,
  currency: '฿',
  bpColumns: BPLUS_DEFAULT_COLUMNS.slice(),
  bpDelimiter: ','
};

var PR_STATUS = {
  draft: 'ฉบับร่าง',
  pending: 'รออนุมัติ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ไม่อนุมัติ'
};

var PRICE_BATCH_STATUS = {
  pending: 'รออนุมัติ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ไม่อนุมัติ'
};

function canAccess(role, pageKey) {
  var item = NAV.find(function (n) { return n.key === pageKey; });
  if (!item) return false;
  return item.roles.indexOf(role) >= 0;
}
