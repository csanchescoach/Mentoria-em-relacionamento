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

Nome: ${nome}
Pontuação total: ${checked}/25 (${pct}%)
Nível: ${nivelLabel}

Respostas detalhadas por categoria:
${resumo}

Retorne APENAS JSON puro, sem markdown, sem texto antes ou depois:
{
  "perfil": "3-4 frases descrevendo o perfil emocional desta mulher com base nas respostas. Seja específica — nomeie padrões reais que ela provavelmente vive. Use linguagem que gere identificação imediata. Use o nome ${nome} pelo menos uma vez.",
  "lacunas": [
    "Lacuna 1 — 1 a 2 frases: o que esta ausência revela sobre ela e como sabota seus relacionamentos. Cite o padrão concreto, não o item do checklist.",
    "Lacuna 2",
    "Lacuna 3",
    "Lacuna 4"
  ],
  "dores": [
    "Dor cotidiana real e física. Ex: não conseguir dormir imaginando se ele está interessado de verdade. Não seja abstrata.",
    "Outra dor específica e visceral",
    "Outra dor"
  ],
  "caminho": "2-3 frases sobre o que ela mais precisa agora. Honesta sobre o trabalho que há pela frente, mas com esperança real e direcionamento claro. Mencione que a mentoria trabalha exatamente esses pontos.",
  "cta": "1 frase poderosa e pessoal que convida ao próximo passo com a Claudia. Dialoga diretamente com o perfil e as dores dela. Não seja genérica."
}

Regras absolutas:
- Máximo de 4 lacunas, máximo de 3 dores
- Tom: mentora que conhece bem esta dor, não terapeuta fria nem coach motivacional vazio
- Cite os itens não conquistados de forma indireta (sem listar mecanicamente os textos do checklist)
- As dores devem ser emocionalmente verdadeiras — situações que ela reconhece no dia a dia
- Personalize para o perfil específico: pontuações iguais em categorias diferentes = diagnósticos diferentes`;

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
