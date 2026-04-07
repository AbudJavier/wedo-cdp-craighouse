// Proxy: reenvía la transcripción al webhook de n8n
// Evita el bloqueo CORS del browser al llamar n8n directamente

const N8N_WEBHOOK = 'https://javierabud.app.n8n.cloud/webhook/cdp-sesion';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { transcripcion } = req.body || {};
  if (!transcripcion || transcripcion.length < 50) {
    return res.status(400).json({ error: 'Transcripción muy corta o vacía' });
  }

  try {
    const response = await fetch(N8N_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'sesion', transcripcion })
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'n8n respondió con error ' + response.status });
    }

    return res.status(200).json({ ok: true, message: 'Workflow iniciado' });

  } catch (err) {
    console.error('[n8n proxy] Error:', err.message);
    return res.status(500).json({ error: err.message || 'Error al contactar n8n' });
  }
};
