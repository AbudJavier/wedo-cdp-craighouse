const Anthropic = require('@anthropic-ai/sdk');
const nodemailer = require('nodemailer');
const { db } = require('./config');

const DIRECTORIO = [
  { id: 'mariana', nombre: 'Mariana Vallejo', email: 'mariana.vallejod@gmail.com', rol: 'Presidenta' },
  { id: 'francisco', nombre: 'Francisco Araneda', email: 'araneda.fco@gmail.com', rol: 'Vicepresidente' },
  { id: 'sari', nombre: 'Sari Romero', email: 'sararomeroelias@gmail.com', rol: 'Secretaria' },
  { id: 'javier', nombre: 'Javier Abud', email: 'abudjavier@gmail.com', rol: 'Pro-Secretario' },
  { id: 'christian', nombre: 'Christian Rey', email: 'chrey@distal.cl', rol: 'Tesorero' },
  { id: 'michelle', nombre: 'Michelle Crew', email: 'mich23@gmail.com', rol: 'Pro-Tesorera' },
  { id: 'felipe', nombre: 'Felipe Valdés', email: 'pipevaldesr@gmail.com', rol: 'Director' }
];

const PROMPT_SISTEMA = `Eres el asistente de gestión del directorio del Centro de Padres del Craighouse School.
Tu tarea es analizar la transcripción de una reunión de directorio y extraer todas las tareas, acuerdos y compromisos mencionados.

DIRECTORIO VIGENTE 2026:
| ID | Nombre | Cargo |
|---|---|---|
| mariana | Mariana Vallejo | Presidenta |
| francisco | Francisco Araneda | Vicepresidente |
| sari | Sari Romero | Secretaria |
| javier | Javier Abud | Pro-Secretario |
| christian | Christian Rey | Tesorero |
| michelle | Michelle Crew | Pro-Tesorera |
| felipe | Felipe Valdés | Director |

Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta, sin texto adicional:

{
  "sesion": {
    "fecha": "YYYY-MM-DD",
    "resumen_ejecutivo": "2-3 oraciones resumiendo los temas principales"
  },
  "tareas": [
    {
      "id": "T001",
      "descripcion": "descripción clara y accionable de la tarea",
      "director_id": "id del director asignado o null",
      "director_nombre": "nombre completo o null",
      "plazo": "esta semana | próxima semana | este mes | sin plazo definido",
      "area": "área temática de la tarea"
    }
  ]
}`;

function crearEmailAsignado(director, tareas, sesion, wedoUrl) {
  const tareasHTML = tareas.map(t => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #e8eaf0;">
        <strong style="color:#1B2A6B;font-size:14px;">${t.descripcion}</strong>
        <div style="font-size:12px;color:#8892B0;margin-top:4px;">
          📅 ${t.plazo} &nbsp;·&nbsp; 🏷 ${t.area || 'General'}
        </div>
      </td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'DM Sans',-apple-system,sans-serif;background:#F4F5F9;padding:40px 20px;margin:0">
  <div style="max-width:520px;margin:0 auto">
    <div style="background:#1B2A6B;padding:24px 32px;border-radius:10px 10px 0 0;border-bottom:3px solid #C0392B">
      <div style="font-size:20px;font-weight:900;color:#fff;letter-spacing:2px">WE<span style="color:#C0392B">DO</span></div>
      <div style="font-size:11px;color:rgba(255,255,255,0.5);letter-spacing:2px;text-transform:uppercase;margin-top:4px">CDP Craighouse · Reunión de Directorio</div>
    </div>
    <div style="background:#fff;padding:28px 32px;border-radius:0 0 10px 10px;box-shadow:0 4px 20px rgba(27,42,107,0.1)">
      <div style="font-size:13px;color:#C0392B;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Tus compromisos</div>
      <div style="font-size:22px;font-weight:800;color:#1B2A6B;margin-bottom:4px">Hola, ${director.nombre.split(' ')[0]} 👋</div>
      <div style="font-size:14px;color:#8892B0;margin-bottom:24px">
        Aquí están las tareas que quedaron asignadas a ti en la reunión del ${sesion.fecha}.
      </div>
      <table style="width:100%;border-collapse:collapse;background:#F4F5F9;border-radius:8px;overflow:hidden">
        ${tareasHTML}
      </table>
      <div style="margin-top:24px;padding:16px;background:#EEF0FB;border-radius:8px;border-left:3px solid #1B2A6B">
        <div style="font-size:12px;font-weight:700;color:#1B2A6B;margin-bottom:4px">Resumen de la sesión</div>
        <div style="font-size:13px;color:#4A5568;line-height:1.6">${sesion.resumen_ejecutivo}</div>
      </div>
      <div style="margin-top:24px">
        <a href="${wedoUrl}/tasks" style="background:#C0392B;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;display:inline-block;font-weight:700;font-size:13px">Ver mis tareas en WeDo</a>
      </div>
    </div>
    <div style="text-align:center;margin-top:16px;font-size:11px;color:#8892B0">
      WeDo · CDP Craighouse · Plataforma interna
    </div>
  </div>
</body>
</html>`;
}

function crearEmailSinAsignar(tareas, sesion, wedoUrl) {
  const tareasHTML = tareas.map(t => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #e8eaf0;">
        <strong style="color:#1B2A6B;font-size:14px;">${t.descripcion}</strong>
        <div style="font-size:12px;color:#8892B0;margin-top:4px;">
          🏷 ${t.area || 'General'} &nbsp;·&nbsp; ⚠️ Sin asignar
        </div>
      </td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'DM Sans',-apple-system,sans-serif;background:#F4F5F9;padding:40px 20px;margin:0">
  <div style="max-width:520px;margin:0 auto">
    <div style="background:#C0392B;padding:24px 32px;border-radius:10px 10px 0 0;">
      <div style="font-size:20px;font-weight:900;color:#fff;letter-spacing:2px">WE<span style="color:#fff;opacity:0.7">DO</span></div>
      <div style="font-size:11px;color:rgba(255,255,255,0.7);letter-spacing:2px;text-transform:uppercase;margin-top:4px">Tareas sin asignar</div>
    </div>
    <div style="background:#fff;padding:28px 32px;border-radius:0 0 10px 10px;box-shadow:0 4px 20px rgba(27,42,107,0.1)">
      <div style="font-size:13px;color:#C0392B;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Acción requerida</div>
      <div style="font-size:22px;font-weight:800;color:#1B2A6B;margin-bottom:4px">Mariana, estas tareas necesitan responsable 👀</div>
      <div style="font-size:14px;color:#8892B0;margin-bottom:24px">
        Las siguientes tareas de la reunión del ${sesion.fecha} quedaron sin asignar.
      </div>
      <table style="width:100%;border-collapse:collapse;background:#FEF0EE;border-radius:8px;overflow:hidden">
        ${tareasHTML}
      </table>
      <div style="margin-top:24px">
        <a href="${wedoUrl}/admin" style="background:#C0392B;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;display:inline-block;font-weight:700;font-size:13px">Asignar tareas en WeDo</a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const password = req.headers['authorization'];
  const expectedPassword = `Bearer ${(process.env.WEDO_PASSWORD || '').trim()}`;
  if (password !== expectedPassword) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const { transcripcion } = req.body;
  if (!transcripcion || transcripcion.length < 50) {
    return res.status(400).json({ error: 'Transcripción muy corta o vacía' });
  }

  try {
    // 1. Llamar a Claude API
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      messages: [
        { role: 'user', content: `${PROMPT_SISTEMA}\n\nTRANSCRIPCIÓN:\n${transcripcion}` }
      ]
    });

    const rawContent = message.content[0].text.trim();
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Claude no devolvió JSON válido');

    const resultado = JSON.parse(jsonMatch[0]);
    const { sesion, tareas } = resultado;

    // 2. Guardar en Firestore - sesión
    const docRef = await db.collection('sesiones').add({
      fecha: sesion.fecha,
      resumen_ejecutivo: sesion.resumen_ejecutivo,
      tareas: tareas,
      createdAt: new Date(),
      procesadoPor: 'claude-api'
    });

    // 2b. Guardar cada tarea como documento individual en colección 'tareas'
    for (const tarea of tareas) {
      await db.collection('tareas').add({
        descripcion: tarea.descripcion,
        director_id: tarea.director_id || null,
        director_nombre: tarea.director_nombre || null,
        plazo: tarea.plazo || 'sin plazo definido',
        area: tarea.area || 'General',
        status: 'pending',
        sesionId: docRef.id,
        createdAt: new Date()
      });
    }

    // 3. Configurar Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    const wedoUrl = process.env.WEDO_URL || 'https://wedo-cdp-craighouse.vercel.app';

    // 4. Agrupar tareas por director
    const tareasAsignadas = {};
    const tareasSinAsignar = [];

    for (const tarea of tareas) {
      if (tarea.director_id && tarea.director_id !== 'null') {
        if (!tareasAsignadas[tarea.director_id]) tareasAsignadas[tarea.director_id] = [];
        tareasAsignadas[tarea.director_id].push(tarea);
      } else {
        tareasSinAsignar.push(tarea);
      }
    }

    // 5. Enviar emails individuales
    const emailsEnviados = [];
    for (const [dirId, tareasList] of Object.entries(tareasAsignadas)) {
      const director = DIRECTORIO.find(d => d.id === dirId);
      if (!director) continue;

      await transporter.sendMail({
        from: `"WeDo CDP Craighouse" <${process.env.GMAIL_USER}>`,
        to: director.email,
        subject: `📋 WeDo: Tus tareas de la reunión del ${sesion.fecha}`,
        html: crearEmailAsignado(director, tareasList, sesion, wedoUrl)
      });
      emailsEnviados.push(director.nombre);
    }

    // 6. Email a Presidenta con tareas sin asignar
    if (tareasSinAsignar.length > 0) {
      const presidenta = DIRECTORIO.find(d => d.id === 'mariana');
      await transporter.sendMail({
        from: `"WeDo CDP Craighouse" <${process.env.GMAIL_USER}>`,
        to: presidenta.email,
        subject: `⚠️ WeDo: ${tareasSinAsignar.length} tareas sin asignar - reunión ${sesion.fecha}`,
        html: crearEmailSinAsignar(tareasSinAsignar, sesion, wedoUrl)
      });
    }

    return res.status(200).json({
      ok: true,
      sesionId: docRef.id,
      sesion,
      tareas,
      emailsEnviados,
      tareasSinAsignar: tareasSinAsignar.length
    });

  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
};
