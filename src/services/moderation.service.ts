/**
 * Automatic Content Moderation Service
 * 
 * Provides client-side moderation for the Firebase-first app.
 * Uses layered detection: normalization + blacklist + heuristics.
 */

// import DOMPurify from 'dompurify'; // Not used in client-side checks

// Content moderation configuration
const MODERATION_CONFIG = {
  // Basic blacklist (common offensive terms)
  blacklist: [
    // Add your blacklist terms here - keeping minimal for example
    'spam', 'scam', 'hack',
  ],
  
  // Heuristic thresholds
  maxLength: 10000,
  maxTitleLength: 200,
  maxTags: 5,
  
  // Suspicious patterns
  suspiciousPatterns: [
    /(.)\1{4,}/g, // Repeated characters (e.g., "aaaaaa")
    /[A-Z]{10,}/g, // Excessive caps
    /https?:\/\/[^\s]+/g, // URLs (allowed but monitored)
  ],
  
};

export interface ModerationResult {
  blocked: boolean;
  flagged: boolean;
  score?: number;
  categories?: Record<string, number>;
  checkedAt: Date;
  reason?: string;
}

/**
 * Normalize text for moderation checks
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Fast client-side blacklist check
 */
function checkBlacklist(text: string): { blocked: boolean; reason?: string } {
  const normalized = normalizeText(text);
  const words = normalized.split(/\s+/);
  
  for (const word of words) {
    if (MODERATION_CONFIG.blacklist.includes(word)) {
      return { blocked: true, reason: `Content contains prohibited term: ${word}` };
    }
  }
  
  return { blocked: false };
}

/**
 * Check for suspicious patterns
 */
function checkSuspiciousPatterns(text: string): { flagged: boolean; reason?: string } {
  let flagged = false;
  const reasons: string[] = [];
  
  // Check for repeated characters
  if (MODERATION_CONFIG.suspiciousPatterns[0].test(text)) {
    flagged = true;
    reasons.push('excessive character repetition');
  }
  
  // Check for excessive caps
  const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  if (capsRatio > 0.5 && text.length > 20) {
    flagged = true;
    reasons.push('excessive capitalization');
  }
  
  // Check for multiple URLs (potential spam)
  const urlMatches = text.match(MODERATION_CONFIG.suspiciousPatterns[2]);
  if (urlMatches && urlMatches.length > 3) {
    flagged = true;
    reasons.push('excessive links');
  }
  
  return {
    flagged,
    reason: reasons.length > 0 ? reasons.join(', ') : undefined
  };
}

/**
 * Check content length and basic validation
 */
function checkBasicRules(text: string, maxLength: number): { blocked: boolean; reason?: string } {
  if (!text || text.trim().length === 0) {
    return { blocked: true, reason: 'Content cannot be empty' };
  }
  
  if (text.length > maxLength) {
    return { blocked: true, reason: `Content exceeds maximum length of ${maxLength} characters` };
  }
  
  return { blocked: false };
}

/**
 * Client-side pre-moderation check (fast, lightweight)
 * Returns immediately without API calls
 */
export function preModerateContent(text: string, type: 'post' | 'comment' = 'post'): ModerationResult {
  const checkedAt = new Date();
  const maxLength = type === 'post' ? MODERATION_CONFIG.maxLength : MODERATION_CONFIG.maxLength;
  
  // Basic validation
  const basicCheck = checkBasicRules(text, maxLength);
  if (basicCheck.blocked) {
    return {
      blocked: true,
      flagged: false,
      checkedAt,
      reason: basicCheck.reason
    };
  }
  
  // Blacklist check
  const blacklistCheck = checkBlacklist(text);
  if (blacklistCheck.blocked) {
    return {
      blocked: true,
      flagged: false,
      checkedAt,
      reason: blacklistCheck.reason
    };
  }
  
  // Suspicious pattern check (flags but doesn't block)
  const patternCheck = checkSuspiciousPatterns(text);
  
  return {
    blocked: false,
    flagged: patternCheck.flagged,
    checkedAt,
    reason: patternCheck.reason
  };
}

/**
 * Async wrapper kept for call-site compatibility.
 * Runs the same client-side heuristic checks as preModerateContent.
 *
 * NOTE: This does NOT call OpenAI.  If you need AI-backed moderation,
 * POST to /api/moderation/check on the Express backend (server/src/services/moderation.service.ts)
 * which calls the real OpenAI Moderation API when USE_OPENAI_MODERATION=true.
 */
export async function moderateContent(text: string): Promise<ModerationResult> {
  return preModerateContent(text);
}

/**
 * @deprecated Use moderateContent() instead.
 * This alias will be removed in a future cleanup.
 */
export const moderateWithOpenAI = moderateContent;

/**
 * Moderate post content (title + content)
 */
export function moderatePost(title: string, content: string): ModerationResult {
  // Check title
  const titleCheck = preModerateContent(title, 'post');
  if (titleCheck.blocked) {
    return { ...titleCheck, reason: `Title: ${titleCheck.reason}` };
  }
  
  // Check content
  const contentCheck = preModerateContent(content, 'post');
  if (contentCheck.blocked) {
    return { ...contentCheck, reason: `Content: ${contentCheck.reason}` };
  }
  
  // Combine flags
  return {
    blocked: false,
    flagged: titleCheck.flagged || contentCheck.flagged,
    checkedAt: new Date(),
    reason: titleCheck.reason || contentCheck.reason
  };
}

/**
 * Moderate comment content
 */
export function moderateComment(content: string): ModerationResult {
  return preModerateContent(content, 'comment');
}

