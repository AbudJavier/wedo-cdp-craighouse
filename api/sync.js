const { db } = require('./config');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // GET sincronización completa (público - lectura)
    if (req.method === 'GET') {
      // Obtener sesiones
      const sessionSnapshot = await db.collection('sesiones')
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();
      const sesiones = [];
      sessionSnapshot.forEach(doc => {
        sesiones.push({ id: doc.id, ...doc.data() });
      });

      // Obtener Gantt items
      const ganttSnapshot = await db.collection('gantt').get();
      const ganttItems = [];
      ganttSnapshot.forEach(doc => {
        ganttItems.push({ id: doc.id, ...doc.data() });
      });

      // Obtener tareas
      const taskSnapshot = await db.collection('tareas').get();
      const tareas = [];
      taskSnapshot.forEach(doc => {
        tareas.push({ id: doc.id, ...doc.data() });
      });

      return res.status(200).json({
        sesiones,
        ganttItems,
        tareas,
        lastSync: new Date().toISOString()
      });
    }

    // POST para sincronizar cambios (solo admin)
    if (req.method === 'POST') {
      const isAdmin = req.headers['authorization'] === `Bearer ${process.env.WEDO_PASSWORD}`;
      if (!isAdmin) return res.status(403).json({ error: 'No autorizado' });

      const { action, data } = req.body;

      // Sincronizar Gantt item a tarea
      if (action === 'ganttToTask') {
        const { ganttId, nombre, fecha_inicio, fecha_fin, director_id } = data;

        // Crear/actualizar tarea basada en Gantt
        const taskRef = await db.collection('tareas').add({
          descripcion: nombre,
          director_id,
          plazo: fecha_fin,
          area: 'Carta GAM',
          status: 'active',
          ganttId,
          createdAt: new Date()
        });

        // Actualizar Gantt con referencia a tarea
        await db.collection('gantt').doc(ganttId).update({
          taskId: taskRef.id
        });

        return res.status(200).json({ ok: true, taskId: taskRef.id });
      }

      // Sincronizar tarea a Gantt
      if (action === 'taskToGantt') {
        const { taskId, descripcion, plazo } = data;

        const ganttRef = await db.collection('gantt').add({
          nombre: descripcion,
          fecha_fin: plazo,
          taskId,
          createdAt: new Date()
        });

        // Actualizar tarea con referencia a Gantt
        await db.collection('tareas').doc(taskId).update({
          ganttId: ganttRef.id
        });

        return res.status(200).json({ ok: true, ganttId: ganttRef.id });
      }

      return res.status(400).json({ error: 'Acción no válida' });
    }

    return res.status(405).json({ error: 'Método no permitido' });

  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};
