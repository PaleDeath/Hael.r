/**
 * Server-side Content Moderation Service
 *
 * Deterministic heuristic moderation — no external API dependencies.
 * The USE_OPENAI_MODERATION env var is retained for back-compat but is ignored;
 * all checks are performed locally.
 */

const BLACKLIST = ['spam', 'scam', 'hack'];

interface ModerationResult {
  blocked: boolean;
  flagged: boolean;
  score?: number;
  categories?: Record<string, number>;
  reason?: string;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function checkBlacklist(text: string): { blocked: boolean; reason?: string } {
  const words = normalizeText(text).split(/\s+/);
  for (const word of words) {
    if (BLACKLIST.includes(word)) {
      return { blocked: true, reason: 'Content contains prohibited term' };
    }
  }
  return { blocked: false };
}

function checkHeuristics(text: string): { flagged: boolean; reason?: string } {
  const reasons: string[] = [];

  // Repeated characters (e.g. "aaaaaaa")
  if (/(.)\\1{4,}/g.test(text)) {
    reasons.push('excessive character repetition');
  }

  // Excessive caps
  const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  if (capsRatio > 0.5 && text.length > 20) {
    reasons.push('excessive capitalization');
  }

  // More than 3 URLs — potential spam
  const urlCount = (text.match(/https?:\/\/[^\s]+/g) || []).length;
  if (urlCount > 3) {
    reasons.push('excessive links');
  }

  return {
    flagged: reasons.length > 0,
    reason: reasons.length > 0 ? reasons.join(', ') : undefined,
  };
}

function moderateText(text: string): ModerationResult {
  if (!text || text.trim().length === 0) {
    return { blocked: true, flagged: false, reason: 'Content cannot be empty' };
  }

  const blacklistCheck = checkBlacklist(text);
  if (blacklistCheck.blocked) {
    return { blocked: true, flagged: false, reason: blacklistCheck.reason };
  }

  const heuristicCheck = checkHeuristics(text);
  return {
    blocked: false,
    flagged: heuristicCheck.flagged,
    reason: heuristicCheck.reason,
  };
}

export async function moderatePost(title: string, content: string): Promise<ModerationResult> {
  const titleResult = moderateText(title);
  if (titleResult.blocked) {
    return { ...titleResult, reason: `Title: ${titleResult.reason}` };
  }

  const contentResult = moderateText(content);
  if (contentResult.blocked) {
    return { ...contentResult, reason: `Content: ${contentResult.reason}` };
  }

  return {
    blocked: false,
    flagged: titleResult.flagged || contentResult.flagged,
    reason: titleResult.reason || contentResult.reason,
  };
}

export async function moderateComment(content: string): Promise<ModerationResult> {
  return moderateText(content);
}
