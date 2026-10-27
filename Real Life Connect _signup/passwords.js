const { randomBytes, scrypt } = require("node:crypto");
const { promisify } = require("node:util");
const derive = promisify(scrypt);
const parameters = { N: 65536, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt, 64, parameters);
  return ["scrypt", parameters.N, parameters.r, parameters.p, salt, key.toString("hex")].join("$");
}
module.exports = { hashPassword };
