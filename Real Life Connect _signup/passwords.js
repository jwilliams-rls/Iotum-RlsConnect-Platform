const { randomBytes, scrypt, timingSafeEqual } = require("node:crypto");
const { promisify } = require("node:util");
const derive = promisify(scrypt);
const parameters = { N: 65536, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt, 64, parameters);
  return ["scrypt", parameters.N, parameters.r, parameters.p, salt, key.toString("hex")].join("$");
}
async function verifyPassword(password, encoded) {
  if (typeof encoded !== "string") return false;
  const parts = encoded.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt" || parts[1] !== "65536" || parts[2] !== "8" || parts[3] !== "1" || !/^[a-f0-9]{32}$/.test(parts[4]) || !/^[a-f0-9]{128}$/.test(parts[5])) return false;
  const key = await derive(password, parts[4], 64, parameters);
  return timingSafeEqual(key, Buffer.from(parts[5], "hex"));
}
module.exports = { hashPassword, verifyPassword };

