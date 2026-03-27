/**
 * Privacy and Data Protection System
 * 
 * Provides:
 * - Query anonymization
 * - User identity protection
 * - Data encryption
 * - PII detection and removal
 * - Secure storage mechanisms
 */

import crypto from 'crypto';

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Generate a consistent anonymous ID for a user
 * Uses HMAC to create deterministic but non-reversible IDs
 */
export function generateAnonymousId(userId: string): string {
  const secret = process.env.ANONYMIZATION_SECRET || 'default-secret-change-in-production';
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(userId);
  return 'anon_' + hmac.digest('hex').substring(0, 16);
}

/**
 * Encrypt sensitive data
 */
export function encrypt(text: string): string {
  try {
    const key = Buffer.from(ENCRYPTION_KEY.substring(0, 64), 'hex');
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Return: iv:authTag:encrypted
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedData: string): string {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const key = Buffer.from(ENCRYPTION_KEY.substring(0, 64), 'hex');
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash sensitive data (one-way, for comparison only)
 */
export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Detect and remove PII (Personally Identifiable Information)
 */
export function detectAndRemovePII(text: string): {
  cleanedText: string;
  piiDetected: string[];
  hasPII: boolean;
} {
  const piiDetected: string[] = [];
  let cleanedText = text;
  
  // Email detection and removal
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = text.match(emailRegex);
  if (emails) {
    piiDetected.push(...emails.map(() => 'email'));
    cleanedText = cleanedText.replace(emailRegex, '[EMAIL_REDACTED]');
  }
  
  // Phone number detection (various formats)
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  const phones = text.match(phoneRegex);
  if (phones) {
    piiDetected.push(...phones.map(() => 'phone'));
    cleanedText = cleanedText.replace(phoneRegex, '[PHONE_REDACTED]');
  }
  
  // Social Security Number (SSN) detection
  const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
  const ssns = text.match(ssnRegex);
  if (ssns) {
    piiDetected.push(...ssns.map(() => 'ssn'));
    cleanedText = cleanedText.replace(ssnRegex, '[SSN_REDACTED]');
  }
  
  // Credit card detection (basic pattern)
  const ccRegex = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g;
  const creditCards = text.match(ccRegex);
  if (creditCards) {
    piiDetected.push(...creditCards.map(() => 'credit_card'));
    cleanedText = cleanedText.replace(ccRegex, '[CARD_REDACTED]');
  }
  
  // Address detection (basic pattern - street numbers and names)
  const addressRegex = /\b\d{1,5}\s+([A-Z][a-z]+\s+){1,3}(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct)\b/gi;
  const addresses = text.match(addressRegex);
  if (addresses) {
    piiDetected.push(...addresses.map(() => 'address'));
    cleanedText = cleanedText.replace(addressRegex, '[ADDRESS_REDACTED]');
  }
  
  // IP Address detection
  const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
  const ips = text.match(ipRegex);
  if (ips) {
    // Filter out common non-IP patterns like version numbers
    const validIps = ips.filter(ip => {
      const parts = ip.split('.');
      return parts.every(part => parseInt(part) <= 255);
    });
    if (validIps.length > 0) {
      piiDetected.push(...validIps.map(() => 'ip_address'));
      cleanedText = cleanedText.replace(ipRegex, '[IP_REDACTED]');
    }
  }
  
  // Common name patterns (capitalized words that might be names)
  // This is more aggressive and might have false positives
  const nameRegex = /\b(My name is|I am|I'm)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
  const names = text.match(nameRegex);
  if (names) {
    piiDetected.push(...names.map(() => 'name'));
    cleanedText = cleanedText.replace(nameRegex, (match, prefix) => `${prefix} [NAME_REDACTED]`);
  }
  
  return {
    cleanedText,
    piiDetected: [...new Set(piiDetected)], // Remove duplicates
    hasPII: piiDetected.length > 0,
  };
}

/**
 * Anonymize query for storage
 */
export function anonymizeQuery(
  query: string,
  userId: string,
  options: {
    removePII?: boolean;
    encryptQuery?: boolean;
    anonymizeUser?: boolean;
  } = {}
): {
  anonymizedQuery: string;
  anonymousUserId: string;
  piiDetected: string[];
  isEncrypted: boolean;
  metadata: {
    originalLength: number;
    cleanedLength: number;
    piiRemoved: boolean;
  };
} {
  const {
    removePII = true,
    encryptQuery = false,
    anonymizeUser = true,
  } = options;
  
  let processedQuery = query;
  let piiDetected: string[] = [];
  
  // Step 1: Remove PII if enabled
  if (removePII) {
    const piiResult = detectAndRemovePII(query);
    processedQuery = piiResult.cleanedText;
    piiDetected = piiResult.piiDetected;
  }
  
  // Step 2: Encrypt query if enabled
  let isEncrypted = false;
  if (encryptQuery) {
    processedQuery = encrypt(processedQuery);
    isEncrypted = true;
  }
  
  // Step 3: Anonymize user ID
  const anonymousUserId = anonymizeUser ? generateAnonymousId(userId) : userId;
  
  return {
    anonymizedQuery: processedQuery,
    anonymousUserId,
    piiDetected,
    isEncrypted,
    metadata: {
      originalLength: query.length,
      cleanedLength: processedQuery.length,
      piiRemoved: piiDetected.length > 0,
    },
  };
}

/**
 * Sanitize user data for storage
 */
export function sanitizeUserData(userData: {
  name?: string;
  email?: string;
  studentId?: string;
  [key: string]: any;
}): {
  sanitized: {
    nameHash?: string;
    emailHash?: string;
    studentIdHash?: string;
    anonymousId: string;
    [key: string]: any;
  };
  encrypted: {
    name?: string;
    email?: string;
    studentId?: string;
  };
} {
  const sanitized: any = {};
  const encrypted: any = {};
  
  // Hash identifiable fields
  if (userData.name) {
    sanitized.nameHash = hashData(userData.name);
    encrypted.name = encrypt(userData.name);
  }
  
  if (userData.email) {
    sanitized.emailHash = hashData(userData.email);
    encrypted.email = encrypt(userData.email);
  }
  
  if (userData.studentId) {
    sanitized.studentIdHash = hashData(userData.studentId);
    encrypted.studentId = encrypt(userData.studentId);
  }
  
  // Generate anonymous ID
  const identifier = userData.email || userData.studentId || userData.name || 'unknown';
  sanitized.anonymousId = generateAnonymousId(identifier);
  
  // Copy non-sensitive fields
  Object.keys(userData).forEach(key => {
    if (!['name', 'email', 'studentId'].includes(key)) {
      sanitized[key] = userData[key];
    }
  });
  
  return { sanitized, encrypted };
}

/**
 * Validate encryption key strength
 */
export function validateEncryptionKey(): {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  issues: string[];
} {
  const issues: string[] = [];
  
  if (!process.env.ENCRYPTION_KEY) {
    issues.push('ENCRYPTION_KEY not set in environment variables');
  }
  
  if (ENCRYPTION_KEY.length < 64) {
    issues.push('Encryption key is too short (minimum 64 characters)');
  }
  
  if (!process.env.ANONYMIZATION_SECRET) {
    issues.push('ANONYMIZATION_SECRET not set in environment variables');
  }
  
  let strength: 'weak' | 'medium' | 'strong' = 'strong';
  if (issues.length > 2) {
    strength = 'weak';
  } else if (issues.length > 0) {
    strength = 'medium';
  }
  
  return {
    isValid: issues.length === 0,
    strength,
    issues,
  };
}

/**
 * Generate privacy report for a query
 */
export function generatePrivacyReport(data: {
  query: string;
  userId: string;
  response?: string;
}): {
  queryPII: ReturnType<typeof detectAndRemovePII>;
  responsePII?: ReturnType<typeof detectAndRemovePII>;
  anonymousUserId: string;
  privacyScore: number;
  recommendations: string[];
} {
  const queryPII = detectAndRemovePII(data.query);
  const responsePII = data.response ? detectAndRemovePII(data.response) : undefined;
  const anonymousUserId = generateAnonymousId(data.userId);
  
  const recommendations: string[] = [];
  let privacyScore = 100;
  
  // Deduct points for PII found
  if (queryPII.hasPII) {
    privacyScore -= queryPII.piiDetected.length * 10;
    recommendations.push('Query contains PII - should be removed before storage');
  }
  
  if (responsePII?.hasPII) {
    privacyScore -= responsePII.piiDetected.length * 10;
    recommendations.push('Response contains PII - should be sanitized');
  }
  
  // Ensure score doesn't go below 0
  privacyScore = Math.max(0, privacyScore);
  
  if (privacyScore === 100) {
    recommendations.push('✅ No PII detected - privacy compliant');
  }
  
  return {
    queryPII,
    responsePII,
    anonymousUserId,
    privacyScore,
    recommendations,
  };
}

/**
 * Secure data for storage (combines anonymization and encryption)
 */
export function secureDataForStorage(data: {
  query: string;
  response: string;
  userId: string;
  courseId: string;
  metadata?: Record<string, any>;
}): {
  secured: {
    query: string;
    response: string;
    anonymousUserId: string;
    courseId: string;
    metadata?: Record<string, any>;
  };
  privacyMetadata: {
    piiRemoved: boolean;
    piiTypes: string[];
    isEncrypted: boolean;
    privacyScore: number;
  };
} {
  // Anonymize and clean query
  const anonymizedQuery = anonymizeQuery(data.query, data.userId, {
    removePII: true,
    encryptQuery: false, // Don't encrypt for searchability
    anonymizeUser: true,
  });
  
  // Clean response
  const cleanedResponse = detectAndRemovePII(data.response);
  
  // Generate privacy report
  const privacyReport = generatePrivacyReport({
    query: data.query,
    userId: data.userId,
    response: data.response,
  });
  
  return {
    secured: {
      query: anonymizedQuery.anonymizedQuery,
      response: cleanedResponse.cleanedText,
      anonymousUserId: anonymizedQuery.anonymousUserId,
      courseId: data.courseId,
      metadata: data.metadata,
    },
    privacyMetadata: {
      piiRemoved: anonymizedQuery.piiDetected.length > 0 || cleanedResponse.piiDetected.length > 0,
      piiTypes: [...new Set([...anonymizedQuery.piiDetected, ...cleanedResponse.piiDetected])],
      isEncrypted: anonymizedQuery.isEncrypted,
      privacyScore: privacyReport.privacyScore,
    },
  };
}
