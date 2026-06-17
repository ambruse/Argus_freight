/**
 * Helper to parse and clean raw email bodies for visual chat threads.
 * Truncates quoted threads, disclaimers, and signature text while preserving
 * the "Regards" or "Thanks" line itself.
 */
export function cleanEmailBody(text: string | null | undefined): string {
  if (!text) return "";
  
  // 1. Normalize line endings and whitespace
  let cleaned = text.replace(/\r\n/g, "\n").trim();
  
  // 2. Cut off quoted text/threads (look for common thread dividers)
  const threadIndicators = [
    /^\s*On\s+.*wrote:\s*$/im,
    /^\s*On\s+.*,\s+.*wrote:\s*$/im,
    /^-{3,}\s*Original Message\s*-{3,}/im,
    /^\s*From:\s+.*$/im,
    /^\s*To:\s+.*$/im,
    /^\s*Sent:\s+.*$/im,
    /^\s*Date:\s+.*$/im,
    /^________________________________$/m,
  ];

  for (const regex of threadIndicators) {
    const match = cleaned.match(regex);
    if (match && match.index !== undefined) {
      cleaned = cleaned.substring(0, match.index).trim();
    }
  }

  // 3. Cut off after signature starters (keeping the starter line itself)
  const lines = cleaned.split("\n");
  const signatureRegexes = [
    /^\s*Best\s+regards/i,
    /^\s*Kind\s+regards/i,
    /^\s*Warm\s+regards/i,
    /^\s*Thanks\s+&\s+regards/i,
    /^\s*Thanks\s+and\s+regards/i,
    /^\s*Regards/i,
    /^\s*Sincerely/i,
    /^\s*Thanks/i,
    /^\s*-{2,}\s*$/m, // "--" standard signature line
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isSignature = signatureRegexes.some((regex) => regex.test(line));
    if (isSignature) {
      // Keep up to this line (inclusive) and discard the rest of the lines
      cleaned = lines.slice(0, i + 1).join("\n").trim();
      break;
    }
  }

  return cleaned;
}
