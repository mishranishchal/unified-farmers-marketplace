const extractMockOcrFields = (rawText = '') => {
  const aadhaar = rawText.match(/\b\d{4}\s?\d{4}\s?\d{4}\b/)?.[0] || null;
  const pan = rawText.match(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/)?.[0] || null;
  return {
    aadhaar,
    pan,
    documentValid: Boolean(aadhaar || pan),
  };
};

module.exports = { extractMockOcrFields };
