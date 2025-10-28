import Tesseract from "tesseract.js";

const dateRegex = /\b(20[2-3][0-9]|19[9][0-9])[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12][0-9]|3[01])\b/g;
const expKeywords = ["expire", "expiry", "valid until", "exp."];

export default {
  async getExpiration(base64Image) {
    const buffer = Buffer.from(base64Image, "base64");
    const { data: { text } } = await Tesseract.recognize(buffer, "eng");
    const normalized = text.toLowerCase();
    const dateMatches = [...normalized.matchAll(dateRegex)];

    for (const keyword of expKeywords) {
      const idx = normalized.indexOf(keyword);
      if (idx !== -1) {
        for (const m of dateMatches) {
          if (Math.abs(m.index - idx) < 100) return m[0];
        }
      }
    }

    return dateMatches.length ? dateMatches[0][0] : null;
  }
};
