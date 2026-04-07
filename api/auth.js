module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const { password } = req.body;

    // Solo acepta la contraseña de Mariana (presidenta)
    if (password === process.env.WEDO_PASSWORD?.trim()) {
      return res.status(200).json({
        ok: true,
        token: `Bearer ${process.env.WEDO_PASSWORD?.trim()}`,
        role: 'admin',
        user: {
          id: 'mariana',
          nombre: 'Mariana Vallejo',
          rol: 'Presidenta'
        }
      });
    }

    return res.status(401).json({ error: 'Contraseña incorrecta' });

  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};
