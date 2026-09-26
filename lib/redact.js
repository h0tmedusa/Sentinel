/**
 * Evidence Sanitization & Secret Redaction Helper
 *
 * Recursively deep-walks an evidence object and redacts sensitive headers and credentials
 * before persisting evidence to the database:
 *   - 'authorization': keeps first 10 characters (e.g. 'Bearer eyJ...') + '***REDACTED***'
 *   - 'x-api-key', '*apiKey', 'password', 'secret': completely replaces with '***REDACTED***'
 *
 * Immutably returns a cloned copy of the evidence structure.
 */

const AUTH_KEY_REGEX = /^authorization$/i;
const FULL_REDACT_KEY_REGEX = /^x-api-key$|apiKey$|^password$|^secret$/i;

export function redactEvidence(evidenceObj) {
  if (evidenceObj === null || typeof evidenceObj !== 'object') {
    return evidenceObj;
  }

  if (Array.isArray(evidenceObj)) {
    return evidenceObj.map((item) => redactEvidence(item));
  }

  const result = {};
  for (const [key, value] of Object.entries(evidenceObj)) {
    if (typeof value === 'string') {
      if (AUTH_KEY_REGEX.test(key)) {
        // Preserve first 10 characters (e.g., scheme and token prefix) + redaction marker
        const prefix = value.slice(0, 10);
        result[key] = prefix ? `${prefix}***REDACTED***` : '***REDACTED***';
      } else if (FULL_REDACT_KEY_REGEX.test(key)) {
        result[key] = '***REDACTED***';
      } else {
        result[key] = value;
      }
    } else if (value !== null && typeof value === 'object') {
      result[key] = redactEvidence(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}
