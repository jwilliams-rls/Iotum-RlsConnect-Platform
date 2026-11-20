const DEFAULT_ORIGIN = 'https://real-life.reallife-connect.live';
function createIotumClient({ token = process.env.IOTUM_API_TOKEN, fetchImpl = fetch } = {}) {
  if (!token) throw new Error('IOTUM_API_TOKEN is missing. Use the existing Codespaces secret; do not paste it into chat.');
  let authToken;
  async function request(endpoint, payload) {
    let response;
    try {
      response = await fetchImpl(`${DEFAULT_ORIGIN}/enterprise_api${endpoint}`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20000),
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
    } catch { throw new Error(`Iotum ${endpoint}: connection interrupted; outcome may be unknown.`); }
    // Never print the provider response body: it can contain credentials and personal data.
    if (!response.ok) throw new Error(`Iotum ${endpoint}: HTTP ${response.status}.`);
    let result;
    try { result = await response.json(); } catch { throw new Error(`Iotum ${endpoint}: invalid response.`); }
    if (!result || result.error || result.errors) throw new Error(`Iotum ${endpoint}: rejected response.`);
    return result;
  }
  return {
    async authenticate() {
      const result = await request('/authenticate', { api_token: token });
      if (typeof result.auth_token !== 'string' || !result.auth_token) throw new Error('Iotum authentication returned no token.');
      authToken = result.auth_token;
    },
    async post(endpoint, payload = {}) {
      if (!authToken) throw new Error('Authenticate before using Iotum.');
      return request(endpoint, { ...payload, auth_token: authToken });
    }
  };
}
module.exports = { createIotumClient, DEFAULT_ORIGIN };
