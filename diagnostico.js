export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { nome, checked, pct, nivelLabel, resumo } = req.body;

  if (!nome || pct === undefined) {
    return res.status(400).json({ error: 'Dados insuficientes' });
  }

  const prompt = `Você é Claudia Sanches, mentora de desenvolvimento pessoal e relacionamentos amorosos.
Uma lead preencheu seu diagnóstico emocional gratuito "Estou pronta para um relacionamento saudável?". Gere uma análise profunda, empática e totalmente personalizada com base nas respostas dela.

Nome da lead: ${nome}
Pontuação total: ${checked}/25 (${pct}%)
Nível: ${nivelLabel}

Respostas detalhadas por categoria:
${resumo}

Retorne APENAS JSON puro, sem markdown, sem texto antes ou depois:
{
  "perfil": "3-4 frases descrevendo o perfil emocional desta mulher. OBRIGATÓRIO: escreva SEMPRE na segunda pessoa — use 'você', 'seu', 'sua'. Exemplo: 'Você é uma mulher que...', 'Você consegue...', 'Você ainda sente...'. Seja específica, nomeie padrões reais. Pode mencionar o nome ${nome} UMA vez no início, depois use sempre 'você'.",
  "lacunas": [
    "Lacuna 1 — 1 a 2 frases na SEGUNDA PESSOA: 'Você ainda...', 'Quando você...'. O que esta ausência revela e como sabota seus relacionamentos. Padrão concreto, não o texto do checklist.",
    "Lacuna 2 na segunda pessoa",
    "Lacuna 3 na segunda pessoa",
    "Lacuna 4 na segunda pessoa"
  ],
  "dores": [
    "Dor cotidiana na SEGUNDA PESSOA: 'Você fica relendo...', 'Você vai dormir...'. Real, visceral, do dia a dia. Não abstrata.",
    "Outra dor específica na segunda pessoa",
    "Outra dor na segunda pessoa"
  ],
  "caminho": "2-3 frases na SEGUNDA PESSOA sobre o que você mais precisa agora. Honesta, com esperança real. Mencione que a mentoria trabalha exatamente esses pontos.",
  "cta": "1 frase poderosa na SEGUNDA PESSOA convidando ao próximo passo. Dialoga com o perfil e as dores dela. Não genérica."
}

Regras absolutas:
- TODA a resposta deve ser na SEGUNDA PESSOA (você, seu, sua) — nunca na terceira pessoa (ela, seu nome sozinho, 'a lead')
- Máximo de 4 lacunas, máximo de 3 dores
- Tom: mentora que conhece bem esta dor, não terapeuta fria nem coach motivacional vazio
- Cite os itens não conquistados de forma indireta
- As dores devem ser cenas reais do cotidiano que a pessoa se reconhece
- Personalize: pontuações iguais em categorias diferentes = diagnósticos diferentes`;

  try {
    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await apiRes.json();

    if (!apiRes.ok) {
      console.error('Anthropic error:', data);
      return res.status(500).json({ error: 'Erro na API do Claude', detail: data });
    }

    const raw   = data.content.map(b => b.text || '').join('');
    const clean = raw.replace(/```json|```/g, '').trim();
    const diag  = JSON.parse(clean);

    return res.status(200).json({ ok: true, diagnostico: diag });

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'Erro interno', detail: err.message });
  }
}
