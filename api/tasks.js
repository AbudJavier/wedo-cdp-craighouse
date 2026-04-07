const { db } = require('./config');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;
  const isAdmin = req.headers['authorization'] === `Bearer ${process.env.WEDO_PASSWORD}`;

  try {
    // GET todas las tareas (público - lectura)
    if (req.method === 'GET' && action === 'list') {
      const snapshot = await db.collection('tareas').orderBy('createdAt', 'desc').get();
      const tareas = [];
      snapshot.forEach(doc => {
        tareas.push({ id: doc.id, ...doc.data() });
      });
      return res.status(200).json({ tareas });
    }

    // GET tareas de un director específico
    if (req.method === 'GET' && action === 'director') {
      const { directorId } = req.query;
      const snapshot = await db.collection('tareas')
        .where('director_id', '==', directorId)
        .orderBy('createdAt', 'desc')
        .get();
      const tareas = [];
      snapshot.forEach(doc => {
        tareas.push({ id: doc.id, ...doc.data() });
      });
      return res.status(200).json({ tareas });
    }

    // POST crear tarea (solo admin)
    if (req.method === 'POST' && action === 'create') {
      if (!isAdmin) return res.status(403).json({ error: 'No autorizado' });

      const { descripcion, director_id, director_nombre, plazo, area } = req.body;
      const docRef = await db.collection('tareas').add({
        descripcion,
        director_id,
        director_nombre,
        plazo,
        area,
        status: 'pending',
        createdAt: new Date(),
        ganttId: null
      });

      return res.status(201).json({ id: docRef.id, ok: true });
    }

    // PUT actualizar tarea (solo admin)
    if (req.method === 'PUT' && action === 'update') {
      if (!isAdmin) return res.status(403).json({ error: 'No autorizado' });

      const { taskId, ...updates } = req.body;
      await db.collection('tareas').doc(taskId).update({
        ...updates,
        updatedAt: new Date()
      });

      return res.status(200).json({ ok: true });
    }

    // DELETE tarea (solo admin)
    if (req.method === 'DELETE' && action === 'delete') {
      if (!isAdmin) return res.status(403).json({ error: 'No autorizado' });

      const { taskId } = req.query;
      await db.collection('tareas').doc(taskId).delete();

      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Acción no válida' });

  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};
