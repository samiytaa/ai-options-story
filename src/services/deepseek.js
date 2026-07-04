export async function callDeepSeek({ apiKey, messages, temperature = 0.85 }) {
  if (!apiKey) {
    throw new Error('请先输入DeepSeek API Key');
  }

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `API请求失败 (${response.status})`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}
