// HTML pattern uses Unicode Sets (v); escape punctuation inside character classes.
export const phonePattern = String.raw`\+?[0-9 \(\)\-]{8,30}`;
