// Netlify serverless function: AI-powered test case generation
// Calls Claude API with recorded browser actions → returns structured JSON test case

const Anthropic = require('@anthropic-ai/sdk');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { events = [], url = '', apiKey } = body;

  const resolvedKey = apiKey || process.env.CLAUDE_API_KEY;
  if (!resolvedKey) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'No Claude API key provided. Add CLAUDE_API_KEY to Netlify env vars or enter your key in the recorder.'
      })
    };
  }

  if (events.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No recorded events provided' }) };
  }

  // Format recorded events into readable steps
  const stepsText = events.map((e, i) => {
    const num = i + 1;
    const page = e.url ? ` [${new URL(e.url).pathname}]` : '';
    switch (e.eventType || e.event_type) {
      case 'click':
        return `${num}. [click]${page} Click "${e.targetText || e.target_text}" (${e.targetSelector || e.target_selector})`;
      case 'input':
        return `${num}. [input]${page} Type "${e.value}" into "${e.targetText || e.target_text}" field`;
      case 'navigation':
        return `${num}. [navigate] ${e.value}`;
      case 'assertion': {
        const pass = (e.assertionType || e.assertion_type) === 'true' ? '✓ PASS' : '✗ FAIL';
        return `${num}. [assertion ${pass}] Verify: "${e.value}"`;
      }
      case 'user_data':
        return `${num}. [user data] ${e.targetText || e.target_text} = "${e.value}"`;
      case 'manual':
        return `${num}. [manual] ${e.targetText || e.target_text}`;
      default:
        return `${num}. [${e.eventType || e.event_type}] ${e.value || e.targetText || e.target_text}`;
    }
  }).join('\n');

  // Extract user data entries for testData field
  const userDataEntries = events
    .filter(e => (e.eventType || e.event_type) === 'user_data')
    .map(e => `${e.targetText || e.target_text}: "${e.value}"`)
    .join(', ');

  // Extract assertion results for actualResult
  const assertions = events
    .filter(e => (e.eventType || e.event_type) === 'assertion')
    .map(e => {
      const pass = (e.assertionType || e.assertion_type) === 'true' ? 'PASS' : 'FAIL';
      return `[${pass}] ${e.value}`;
    })
    .join('; ');

  const prompt = `You are a senior QA engineer. Analyze these recorded browser test actions for the URL: ${url || 'the tested page'}

Recorded Actions:
${stepsText}

${userDataEntries ? `Test Data Used: ${userDataEntries}` : ''}
${assertions ? `Assertion Results: ${assertions}` : ''}

Generate a professional, structured test case. Return ONLY valid JSON (no markdown, no code fences, no explanation):
{
  "title": "concise descriptive test case title",
  "module": "feature or module name derived from the actions",
  "testType": "Functional",
  "testScenario": "one-sentence scenario description of what is being tested",
  "preconditions": "what must be true before running this test (e.g. user logged in, data exists)",
  "testSteps": [
    {"step": "clear action to perform", "expected": "expected result for this specific step"}
  ],
  "expectedResult": "overall expected outcome when test passes",
  "actualResult": "${assertions ? 'derived from assertions: ' + assertions : 'To be filled after test execution'}",
  "testData": "${userDataEntries || 'Any test data required for this test'}",
  "tags": ["tag1", "tag2"]
}

Rules:
- testSteps should combine related actions into logical steps (not one step per click)
- preconditions should reference the starting URL: ${url || 'target URL'}
- tags should reflect the type of test (login, form, navigation, etc.)
- actualResult should summarize the assertion outcomes if assertions were recorded`;

  try {
    const client = new Anthropic({ apiKey: resolvedKey });

    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 2048,
      messages:   [{ role: 'user', content: prompt }]
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';

    // Extract JSON — strip any accidental markdown fences
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'AI returned non-JSON response', raw: text.slice(0, 500) })
      };
    }

    const generated = JSON.parse(jsonMatch[0]);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(generated)
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'AI generation failed: ' + msg })
    };
  }
};
