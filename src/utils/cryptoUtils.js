/**
 * Generates a cryptographically secure random alphanumeric string.
 * @param {number} length - The length of the token
 * @returns {string} Secure random string
 */
export const generateSecureToken = (length = 16) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars[array[i] % chars.length];
  }
  return token;
};

/**
 * Generates a cryptographically secure random uppercase code.
 * @param {number} length - The length of the code
 * @returns {string} Secure random uppercase code
 */
export const generateSecureCode = (length = 6) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[array[i] % chars.length];
  }
  return code;
};
