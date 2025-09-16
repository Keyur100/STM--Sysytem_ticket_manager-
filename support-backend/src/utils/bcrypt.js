import bcrypt from "bcrypt";

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10

/**
 * Hash a plain text password
 * @param {string} password - The plain password
 * @returns {Promise<string>} - The hashed password
 */
export const hashPassword = async (password) => {
  if (!password) throw new Error("Password is required");
  return await bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compare a plain password with a hashed password
 * @param {string} password - The plain password
 * @param {string} hashedPassword - The hashed password from DB
 * @returns {Promise<boolean>} - True if match, else false
 */
export const comparePassword = async (password, hashedPassword) => {
  if (!password || !hashedPassword) return false;
  return await bcrypt.compare(password, hashedPassword);
};
