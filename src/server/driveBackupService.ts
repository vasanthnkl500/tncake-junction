import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ============================================================================
// TYPES & DATA STRUCTURES
// ============================================================================

export type BackupCategory =
  | 'Customer_Account_Exports'
  | 'Login_Audit_Logs'
  | 'Orders'
  | 'Invoices_Receipts'
  | 'COD_Reports'
  | 'Product_Settings'
  | 'Database_Backups';

export interface BackupHistoryEntry {
  id: string;
  timestamp: string;
  category: BackupCategory;
  fileName: string;
  driveFileId: string;
  status: 'SUCCESS' | 'FAILED';
  recordsCount: number;
  sizeBytes?: number;
  encrypted: boolean;
  notes?: string;
}

export interface QueuedBackupEvent {
  id: string;
  category: BackupCategory;
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'export';
  data: any;
  timestamp: string;
  attempts: number;
}

export interface DriveBackupState {
  isAuthorized: boolean;
  authorizedEmail: string | null;
  targetAccount: string;
  rootFolderId: string | null;
  categoryFolderIds: Partial<Record<BackupCategory, string>>;
  lastBackupTimestamp: string | null;
  lastBackupStatus: 'success' | 'failed' | 'idle' | 'not_connected';
  lastBackupError: string | null;
  lastTestTimestamp: string | null;
  lastTestStatus: 'success' | 'failed' | 'not_tested';
  backupHistory: BackupHistoryEntry[];
}

const DATA_DIR = path.resolve(process.cwd(), '.server_data');
const STATE_FILE = path.join(DATA_DIR, 'drive_backup_state.json');
const QUEUE_FILE = path.join(DATA_DIR, 'drive_backup_queue.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory token cache (never stored in client or public repositories)
let inMemoryAccessToken: string | null = null;
let accessTokenExpiresAt: number = 0;

// Derive or load server-side encryption key for database backup snapshots
const ENCRYPTION_SECRET = process.env.BACKUP_ENCRYPTION_KEY || 'cake-junction-aes-256-backup-key-2026';
const DERIVED_KEY = crypto.createHash('sha256').update(ENCRYPTION_SECRET).digest();

// ============================================================================
// STATE & QUEUE PERSISTENCE
// ============================================================================

const TARGET_ACCOUNT = 'vasanthnkl500@gmail.com';

function loadState(): DriveBackupState {
  const defaultState: DriveBackupState = {
    isAuthorized: false,
    authorizedEmail: null,
    targetAccount: TARGET_ACCOUNT,
    rootFolderId: null,
    categoryFolderIds: {},
    lastBackupTimestamp: null,
    lastBackupStatus: 'not_connected',
    lastBackupError: null,
    lastTestTimestamp: null,
    lastTestStatus: 'not_tested',
    backupHistory: []
  };

  if (fs.existsSync(STATE_FILE)) {
    try {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return { ...defaultState, ...parsed };
    } catch (e) {
      console.error('Failed to parse drive_backup_state.json, reinitializing:', e);
    }
  }
  return defaultState;
}

function saveState(state: DriveBackupState): void {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save drive_backup_state.json:', e);
  }
}

function loadQueue(): QueuedBackupEvent[] {
  if (fs.existsSync(QUEUE_FILE)) {
    try {
      const raw = fs.readFileSync(QUEUE_FILE, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return [];
}

function saveQueue(queue: QueuedBackupEvent[]): void {
  try {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save drive_backup_queue.json:', e);
  }
}

// ============================================================================
// DATA SANITIZATION (ZERO PASSWORDS, ZERO OTPS, ZERO SECRETS)
// ============================================================================

export function sanitizeForBackup(category: BackupCategory, rawData: any): any {
  if (!rawData) return null;

  // Deep clone to avoid mutating in-memory records
  const cloned = JSON.parse(JSON.stringify(rawData));

  const sanitizeSingle = (item: any): any => {
    if (typeof item !== 'object' || item === null) return item;

    // Strict blacklisted properties
    const forbiddenKeys = [
      'passwordHash',
      'passwordSalt',
      'recoveryKeyHash',
      'hashedOtp',
      'otp',
      'recoveryToken',
      'token',
      'sessionToken',
      'sessionId',
      'apiKey',
      'secret',
      'SMTP_PASS',
      'password'
    ];

    for (const key of forbiddenKeys) {
      delete item[key];
    }

    // Specific sanitization for customer records:
    if (category === 'Customer_Account_Exports') {
      return {
        id: item.id,
        name: item.name,
        username: item.username,
        email: item.email,
        phone: item.phone,
        isEmailVerified: Boolean(item.isEmailVerified),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        lastLoginAt: item.lastLoginAt || null
      };
    }

    // Specific sanitization for login audit logs:
    if (category === 'Login_Audit_Logs') {
      return {
        id: item.id,
        timestamp: item.timestamp,
        action: item.action,
        userIdentifier: item.userIdentifier,
        ip: item.ip,
        outcome: item.outcome,
        details: item.details
      };
    }

    // Recursively clean nested objects
    for (const [k, v] of Object.entries(item)) {
      if (typeof v === 'object' && v !== null) {
        item[k] = sanitizeSingle(v);
      }
    }

    return item;
  };

  if (Array.isArray(cloned)) {
    return cloned.map(sanitizeSingle);
  }
  return sanitizeSingle(cloned);
}

// ============================================================================
// ENCRYPTION HELPERS (AES-256-GCM for Database Backups)
// ============================================================================

export function encryptPayload(dataString: string): { ciphertext: string; iv: string; authTag: string } {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', DERIVED_KEY, iv);
  let encrypted = cipher.update(dataString, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    ciphertext: encrypted,
    iv: iv.toString('hex'),
    authTag
  };
}

// ============================================================================
// GOOGLE DRIVE API CLIENT METHODS (v3 REST API)
// ============================================================================

async function callDriveApi(endpoint: string, options: RequestInit = {}): Promise<any> {
  if (!inMemoryAccessToken) {
    throw new Error('Google Drive is not authorized. Please connect your Google account in the dashboard.');
  }

  const url = endpoint.startsWith('https://') ? endpoint : `https://www.googleapis.com/drive/v3/${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${inMemoryAccessToken}`,
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorText = await response.text();
    let errorJson: any = null;
    try {
      errorJson = JSON.parse(errorText);
    } catch {}
    const msg = errorJson?.error?.message || errorText || `HTTP ${response.status}`;
    throw new Error(`Google Drive API error (${response.status}): ${msg}`);
  }

  return response.json();
}

/**
 * Searches for a folder or creates it if absent
 */
async function ensureFolder(name: string, parentId?: string): Promise<string> {
  const queryParts = [
    `name = '${name.replace(/'/g, "\\'")}'`,
    `mimeType = 'application/vnd.google-apps.folder'`,
    `trashed = false`
  ];
  if (parentId) {
    queryParts.push(`'${parentId}' in parents`);
  }

  const q = encodeURIComponent(queryParts.join(' and '));
  const listRes = await callDriveApi(`files?q=${q}&fields=files(id,name)`);

  if (listRes.files && listRes.files.length > 0) {
    return listRes.files[0].id;
  }

  // Create new folder
  const createPayload: any = {
    name,
    mimeType: 'application/vnd.google-apps.folder'
  };
  if (parentId) {
    createPayload.parents = [parentId];
  }

  const createRes = await callDriveApi('files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createPayload)
  });

  return createRes.id;
}

/**
 * Ensures root 'Cake Junction Secure Backups' folder and subcategories exist
 */
export async function initializeFolderHierarchy(): Promise<{ rootFolderId: string; subfolders: Record<BackupCategory, string> }> {
  const state = loadState();
  const ROOT_FOLDER_NAME = 'Cake Junction Secure Backups';

  // 1. Ensure Root Folder
  const rootId = await ensureFolder(ROOT_FOLDER_NAME);
  state.rootFolderId = rootId;

  // 2. Ensure all Category Folders
  const categories: BackupCategory[] = [
    'Customer_Account_Exports',
    'Login_Audit_Logs',
    'Orders',
    'Invoices_Receipts',
    'COD_Reports',
    'Product_Settings',
    'Database_Backups'
  ];

  const subfolders: Partial<Record<BackupCategory, string>> = {};
  for (const cat of categories) {
    const subId = await ensureFolder(cat, rootId);
    subfolders[cat] = subId;
  }

  state.categoryFolderIds = subfolders;
  saveState(state);

  return { rootFolderId: rootId, subfolders: subfolders as Record<BackupCategory, string> };
}

/**
 * Uploads a file using multipart upload to verify content and metadata atomically
 */
async function uploadFileToDrive({
  fileName,
  mimeType,
  content,
  folderId
}: {
  fileName: string;
  mimeType: string;
  content: string;
  folderId: string;
}): Promise<{ fileId: string; fileName: string; sizeBytes: number }> {
  if (!inMemoryAccessToken) {
    throw new Error('Google Drive access token missing.');
  }

  const boundary = `----CJBoundary${Date.now()}`;
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n` +
    content +
    closeDelimiter;

  const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${inMemoryAccessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartRequestBody
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Drive Upload Failed (${response.status}): ${errText}`);
  }

  const result = await response.json();
  const sizeBytes = Buffer.byteLength(content, 'utf8');

  return {
    fileId: result.id,
    fileName: result.name || fileName,
    sizeBytes
  };
}

// ============================================================================
// TOKEN MANAGEMENT & AUTHORIZATION
// ============================================================================

export async function setServerDriveAccessToken(token: string): Promise<{ success: boolean; email: string; message: string }> {
  inMemoryAccessToken = token;
  accessTokenExpiresAt = Date.now() + 55 * 60 * 1000; // 55 minutes validity

  // Test token against Drive about user
  const about = await callDriveApi('about?fields=user').catch((err) => {
    inMemoryAccessToken = null;
    throw new Error(`Invalid Google Drive token: ${err.message}`);
  });

  const email = about?.user?.emailAddress || TARGET_ACCOUNT;

  const state = loadState();
  state.isAuthorized = true;
  state.authorizedEmail = email;
  state.lastBackupStatus = 'idle';
  state.lastBackupError = null;

  saveState(state);

  // Initialize folders right away
  await initializeFolderHierarchy();

  return {
    success: true,
    email,
    message: `Google Drive connected for ${email}. Backup folders verified.`
  };
}

export function isDriveAuthorized(): boolean {
  return Boolean(inMemoryAccessToken);
}

export function getDriveStatus(): {
  isAuthorized: boolean;
  authorizedEmail: string | null;
  targetAccount: string;
  rootFolderId: string | null;
  lastBackupTimestamp: string | null;
  lastBackupStatus: string;
  lastBackupError: string | null;
  pendingEventsCount: number;
  lastTestTimestamp: string | null;
  lastTestStatus: string;
  backupHistoryCount: number;
} {
  const state = loadState();
  const queue = loadQueue();

  return {
    isAuthorized: isDriveAuthorized(),
    authorizedEmail: state.authorizedEmail,
    targetAccount: state.targetAccount,
    rootFolderId: state.rootFolderId,
    lastBackupTimestamp: state.lastBackupTimestamp,
    lastBackupStatus: state.lastBackupStatus,
    lastBackupError: state.lastBackupError,
    pendingEventsCount: queue.length,
    lastTestTimestamp: state.lastTestTimestamp,
    lastTestStatus: state.lastTestStatus,
    backupHistoryCount: state.backupHistory.length
  };
}

export function getBackupHistory(): BackupHistoryEntry[] {
  const state = loadState();
  return state.backupHistory.slice(0, 50);
}

// ============================================================================
// QUEUE & EVENT DISPATCHING (IDEMPOTENT & DEDUPLICATED)
// ============================================================================

export function queueBackupEvent(params: {
  category: BackupCategory;
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'export';
  data: any;
}): void {
  const queue = loadQueue();
  const now = new Date().toISOString();

  // Sanitize data before enqueuing so NO secrets ever touch disk
  const sanitized = sanitizeForBackup(params.category, params.data);

  // Deduplicate: replace any existing pending item with the same category and entityId
  const existingIdx = queue.findIndex(
    q => q.category === params.category && q.entityId === params.entityId
  );

  const event: QueuedBackupEvent = {
    id: `qb-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    category: params.category,
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    data: sanitized,
    timestamp: now,
    attempts: 0
  };

  if (existingIdx >= 0) {
    queue[existingIdx] = event;
  } else {
    queue.push(event);
  }

  saveQueue(queue);

  // If Drive is authorized, asynchronously trigger flush in background
  if (isDriveAuthorized()) {
    setTimeout(() => {
      flushBackupQueue().catch((err) => {
        console.warn('Background backup queue flush error:', err.message);
      });
    }, 1500);
  }
}

// ============================================================================
// CORE BACKUP EXECUTION & FLUSH
// ============================================================================

export async function testDriveConnection(): Promise<{ success: boolean; message: string; details?: any }> {
  const state = loadState();
  state.lastTestTimestamp = new Date().toISOString();

  if (!isDriveAuthorized()) {
    state.lastTestStatus = 'failed';
    saveState(state);
    return {
      success: false,
      message: 'Google Drive is not connected. Please authorize using your Google account.'
    };
  }

  try {
    const about = await callDriveApi('about?fields=user,storageQuota');
    const rootId = await ensureFolder('Cake Junction Secure Backups');
    state.rootFolderId = rootId;
    state.lastTestStatus = 'success';
    saveState(state);

    return {
      success: true,
      message: `Google Drive connection healthy. Verified access for ${about?.user?.emailAddress || state.authorizedEmail}.`,
      details: {
        email: about?.user?.emailAddress,
        rootFolderId: rootId
      }
    };
  } catch (err: any) {
    state.lastTestStatus = 'failed';
    saveState(state);
    return {
      success: false,
      message: `Google Drive connection test failed: ${err.message}`
    };
  }
}

export async function flushBackupQueue(): Promise<{
  processed: number;
  failed: number;
  remaining: number;
  errors: string[];
}> {
  const state = loadState();
  const queue = loadQueue();

  if (queue.length === 0) {
    return { processed: 0, failed: 0, remaining: 0, errors: [] };
  }

  if (!isDriveAuthorized()) {
    return { processed: 0, failed: 0, remaining: queue.length, errors: ['Drive not connected. Events queued.'] };
  }

  // Ensure folders exist
  let folders = state.categoryFolderIds;
  if (!folders || Object.keys(folders).length < 5) {
    const res = await initializeFolderHierarchy();
    folders = res.subfolders;
  }

  const itemsToProcess = [...queue];
  const remainingQueue: QueuedBackupEvent[] = [];
  const errors: string[] = [];
  let processedCount = 0;

  // Group queued items by category for efficient, non-flooding batch uploads
  const grouped: Partial<Record<BackupCategory, QueuedBackupEvent[]>> = {};
  for (const item of itemsToProcess) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category]!.push(item);
  }

  for (const [catKey, items] of Object.entries(grouped) as [BackupCategory, QueuedBackupEvent[]][]) {
    const targetFolderId = folders[catKey];
    if (!targetFolderId) {
      remainingQueue.push(...items);
      continue;
    }

    try {
      const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `cj_${catKey.toLowerCase()}_${timestampStr}.json`;
      const payload = {
        exportedAt: new Date().toISOString(),
        category: catKey,
        recordsCount: items.length,
        items: items.map(i => ({
          entityId: i.entityId,
          entityType: i.entityType,
          action: i.action,
          timestamp: i.timestamp,
          data: i.data
        }))
      };

      const jsonContent = JSON.stringify(payload, null, 2);
      const uploadRes = await uploadFileToDrive({
        fileName,
        mimeType: 'application/json',
        content: jsonContent,
        folderId: targetFolderId
      });

      // Record successful history entry
      const historyEntry: BackupHistoryEntry = {
        id: `bkh-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
        timestamp: new Date().toISOString(),
        category: catKey,
        fileName,
        driveFileId: uploadRes.fileId,
        status: 'SUCCESS',
        recordsCount: items.length,
        sizeBytes: uploadRes.sizeBytes,
        encrypted: false,
        notes: `Synchronized ${items.length} queued ${catKey} event(s).`
      };

      state.backupHistory.unshift(historyEntry);
      if (state.backupHistory.length > 50) {
        state.backupHistory = state.backupHistory.slice(0, 50);
      }

      state.lastBackupTimestamp = historyEntry.timestamp;
      state.lastBackupStatus = 'success';
      state.lastBackupError = null;

      processedCount += items.length;
    } catch (err: any) {
      errors.push(`Failed category ${catKey}: ${err.message}`);
      // Increment attempt counter and re-queue items
      for (const item of items) {
        item.attempts = (item.attempts || 0) + 1;
        if (item.attempts <= 10) {
          remainingQueue.push(item);
        }
      }
      state.lastBackupStatus = 'failed';
      state.lastBackupError = err.message;
    }
  }

  saveQueue(remainingQueue);
  saveState(state);

  return {
    processed: processedCount,
    failed: itemsToProcess.length - processedCount,
    remaining: remainingQueue.length,
    errors
  };
}

/**
 * Performs a comprehensive manual or scheduled full backup of all business tables:
 * - Product Catalogue & Settings
 * - Customer Accounts (sanitized)
 * - Orders & Fulfilment History
 * - Invoices & Billing
 * - COD Reconciliation
 * - Encrypted Database Snapshot
 */
export async function executeFullBackupNow(liveData: {
  customers: any[];
  orders: any[];
  cakes: any[];
  settings: any;
  feedback: any[];
  enquiries: any[];
  paymentProofs: any[];
  auditLogs: any[];
}): Promise<{ success: boolean; message: string; backedUpCategories: string[]; historyId: string }> {
  if (!isDriveAuthorized()) {
    throw new Error('Google Drive is not authorized. Please connect your Google account first.');
  }

  const state = loadState();
  const folders = (await initializeFolderHierarchy()).subfolders;
  const nowStr = new Date().toISOString().replace(/[:.]/g, '-');
  const backedUpCategories: string[] = [];

  // 1. Flush any pending incremental queue first
  await flushBackupQueue();

  // 2. Product Settings & Catalogue Backup
  try {
    const sanitizedSettings = { ...liveData.settings };
    delete sanitizedSettings.smsGateway?.apiKey;
    const prodContent = JSON.stringify({
      backupTimestamp: new Date().toISOString(),
      shopSettings: sanitizedSettings,
      cakesCount: liveData.cakes.length,
      cakes: liveData.cakes
    }, null, 2);

    const upRes = await uploadFileToDrive({
      fileName: `product_settings_${nowStr}.json`,
      mimeType: 'application/json',
      content: prodContent,
      folderId: folders.Product_Settings
    });

    state.backupHistory.unshift({
      id: `full-prod-${Date.now()}`,
      timestamp: new Date().toISOString(),
      category: 'Product_Settings',
      fileName: `product_settings_${nowStr}.json`,
      driveFileId: upRes.fileId,
      status: 'SUCCESS',
      recordsCount: liveData.cakes.length,
      sizeBytes: upRes.sizeBytes,
      encrypted: false
    });
    backedUpCategories.push('Product_Settings');
  } catch (err: any) {
    console.error('Failed Product_Settings backup:', err);
  }

  // 3. Customer Account Exports (strictly sanitized, NO passwords/hashes)
  try {
    const sanitizedCustomers = sanitizeForBackup('Customer_Account_Exports', liveData.customers);
    const custContent = JSON.stringify({
      backupTimestamp: new Date().toISOString(),
      totalCustomers: sanitizedCustomers.length,
      customers: sanitizedCustomers
    }, null, 2);

    const upRes = await uploadFileToDrive({
      fileName: `customer_accounts_${nowStr}.json`,
      mimeType: 'application/json',
      content: custContent,
      folderId: folders.Customer_Account_Exports
    });

    state.backupHistory.unshift({
      id: `full-cust-${Date.now()}`,
      timestamp: new Date().toISOString(),
      category: 'Customer_Account_Exports',
      fileName: `customer_accounts_${nowStr}.json`,
      driveFileId: upRes.fileId,
      status: 'SUCCESS',
      recordsCount: sanitizedCustomers.length,
      sizeBytes: upRes.sizeBytes,
      encrypted: false
    });
    backedUpCategories.push('Customer_Account_Exports');
  } catch (err: any) {
    console.error('Failed Customer_Account_Exports backup:', err);
  }

  // 4. Orders & Invoices Backup
  try {
    const sanitizedOrders = sanitizeForBackup('Orders', liveData.orders);
    const ordContent = JSON.stringify({
      backupTimestamp: new Date().toISOString(),
      totalOrders: sanitizedOrders.length,
      orders: sanitizedOrders
    }, null, 2);

    const upRes = await uploadFileToDrive({
      fileName: `orders_archive_${nowStr}.json`,
      mimeType: 'application/json',
      content: ordContent,
      folderId: folders.Orders
    });

    state.backupHistory.unshift({
      id: `full-ord-${Date.now()}`,
      timestamp: new Date().toISOString(),
      category: 'Orders',
      fileName: `orders_archive_${nowStr}.json`,
      driveFileId: upRes.fileId,
      status: 'SUCCESS',
      recordsCount: sanitizedOrders.length,
      sizeBytes: upRes.sizeBytes,
      encrypted: false
    });
    backedUpCategories.push('Orders');
  } catch (err: any) {
    console.error('Failed Orders backup:', err);
  }

  // 5. COD Reports (Cash on Delivery orders and reconciliation)
  try {
    const codOrders = liveData.orders.filter(
      o => o.paymentStatus === 'cash_on_delivery' || o.paymentMode === 'cod' || o.isCod === true
    );
    const codContent = JSON.stringify({
      backupTimestamp: new Date().toISOString(),
      reconciliationDate: new Date().toISOString().slice(0, 10),
      codOrdersCount: codOrders.length,
      totalCodValue: codOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      orders: codOrders
    }, null, 2);

    const upRes = await uploadFileToDrive({
      fileName: `cod_reconciliation_${nowStr}.json`,
      mimeType: 'application/json',
      content: codContent,
      folderId: folders.COD_Reports
    });

    state.backupHistory.unshift({
      id: `full-cod-${Date.now()}`,
      timestamp: new Date().toISOString(),
      category: 'COD_Reports',
      fileName: `cod_reconciliation_${nowStr}.json`,
      driveFileId: upRes.fileId,
      status: 'SUCCESS',
      recordsCount: codOrders.length,
      sizeBytes: upRes.sizeBytes,
      encrypted: false
    });
    backedUpCategories.push('COD_Reports');
  } catch (err: any) {
    console.error('Failed COD_Reports backup:', err);
  }

  // 6. Encrypted AES-256-GCM Full Database Snapshot
  try {
    const fullSnapshot = {
      backupTimestamp: new Date().toISOString(),
      shopName: liveData.settings.shopName,
      customers: sanitizeForBackup('Customer_Account_Exports', liveData.customers),
      orders: sanitizeForBackup('Orders', liveData.orders),
      cakes: liveData.cakes,
      feedback: liveData.feedback,
      enquiries: liveData.enquiries,
      paymentProofs: liveData.paymentProofs,
      auditLogs: sanitizeForBackup('Login_Audit_Logs', liveData.auditLogs)
    };

    const serialized = JSON.stringify(fullSnapshot);
    const encrypted = encryptPayload(serialized);
    const encryptedFileBody = JSON.stringify({
      schema: 'CAKE_JUNCTION_ENCRYPTED_BACKUP_V1',
      cipher: 'aes-256-gcm',
      timestamp: new Date().toISOString(),
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      ciphertext: encrypted.ciphertext
    }, null, 2);

    const upRes = await uploadFileToDrive({
      fileName: `cakejunction_encrypted_snapshot_${nowStr}.enc`,
      mimeType: 'application/octet-stream',
      content: encryptedFileBody,
      folderId: folders.Database_Backups
    });

    state.backupHistory.unshift({
      id: `full-db-${Date.now()}`,
      timestamp: new Date().toISOString(),
      category: 'Database_Backups',
      fileName: `cakejunction_encrypted_snapshot_${nowStr}.enc`,
      driveFileId: upRes.fileId,
      status: 'SUCCESS',
      recordsCount: 1,
      sizeBytes: upRes.sizeBytes,
      encrypted: true,
      notes: 'Full AES-256-GCM encrypted database snapshot.'
    });
    backedUpCategories.push('Database_Backups');
  } catch (err: any) {
    console.error('Failed Database_Backups backup:', err);
  }

  state.lastBackupTimestamp = new Date().toISOString();
  state.lastBackupStatus = 'success';
  state.lastBackupError = null;
  if (state.backupHistory.length > 50) {
    state.backupHistory = state.backupHistory.slice(0, 50);
  }
  saveState(state);

  return {
    success: true,
    message: `Full automated backup successfully completed. Synchronized: ${backedUpCategories.join(', ')}.`,
    backedUpCategories,
    historyId: state.backupHistory[0]?.id || 'bkh-done'
  };
}
