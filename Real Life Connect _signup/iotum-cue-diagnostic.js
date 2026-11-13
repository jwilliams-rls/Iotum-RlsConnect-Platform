// Read-only diagnostic for a completed Iotum conference.
// Deliberately prints field names and presence flags, never transcripts,
// summaries, recording URLs, authentication tokens or participant details.
const { createIotumClient } = require('./iotum-client');
const conferenceId = Number(process.argv[2]);
if (!Number.isSafeInteger(conferenceId) || conferenceId <= 0 || process.argv.length !== 3) {
  console.error('Usage: node iotum-cue-diagnostic.js <positive-conference-id>');
  process.exitCode = 1;
} else {
  const labels = ['overview', 'detailed_summary', 'action_items', 'ai_insights', 'cue', 'summary', 'transcription', 'transcript', 'recording', 'sentiment', 'download', 'url'];
  const isRelevant = key => labels.some(x => key.toLowerCase().includes(x));
  const describe = (data, prefix = '', depth = 0, out = []) => {
    if (!data || typeof data !== 'object' || depth > 4 || out.length >= 100) return out;
    for (const [key, value] of Object.entries(data)) {
      if (out.length >= 100) break;
      const name = prefix ? prefix + '.' + key : key;
      if (isRelevant(key)) out.push({ field: name, type: Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value, present: value !== null && value !== undefined && value !== '' });
      if (Array.isArray(value) && value.length && typeof value[0] === 'object') describe(value[0], name+'[0]', depth+1, out);
      else if (value && typeof value === 'object') describe(value, name, depth+1, out);
    }
    return out;
  };
  (async () => {
    const client = createIotumClient();
    await client.authenticate();
    // The API fetch is read-only and does not change or download recordings.
    const response = await client.post('/conference/fetch', { conference_id: conferenceId, output: 'detail' });
    const result = Array.isArray(response) ? response[0] : response;
    if (!result || typeof result !== 'object') throw new Error('Unexpected conference response');
    const entries = describe(result);
    console.log(JSON.stringify({
      conferenceId,
      responseKind: Array.isArray(response) ? 'array' : 'object',
      topLevelFields: Object.keys(result).sort(),
      candidateContentFields: entries,
      recordedItems: Array.isArray(result.recordings) ? result.recordings.length : null,
      warning: 'A meeting_summary_url is not proof that Cue Overview, Detailed Summary or Action Items can be exported. Only field names and presence were examined.'
    }, null, 2));
  })().catch(err => {
    console.error('Read-only Iotum diagnostic failed: '+err.message);
    process.exitCode = 1;
  });
}
