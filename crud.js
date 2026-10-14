const express = require('express');
const pool = require('./db');

function crearCrud({ tabla, pk, campos, requeridos = [] }) {
  const router = express.Router();

  const manejarError = (err, res) => {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe un registro con un valor único repetido.' });
    }
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(409).json({ error: 'La referencia (llave foránea) no existe.' });
    }
    if (['ER_DATA_TOO_LONG', 'ER_TRUNCATED_WRONG_VALUE', 'ER_WARN_DATA_OUT_OF_RANGE',
         'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD', 'ER_BAD_NULL_ERROR'].includes(err.code)) {
      return res.status(400).json({ error: 'Algún dato tiene un formato o tamaño inválido.' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  };

  const idValido = (valor) => Number.isInteger(Number(valor)) && Number(valor) > 0;

  const tomarCampos = (body) => {
    const datos = {};
    for (const c of campos) {
      if (body[c] !== undefined) datos[c] = body[c];
    }
    return datos;
  };

  // GET /  -> solo registros activos
  router.get('/', async (req, res) => {
    try {
      const [filas] = await pool.query(
        `SELECT * FROM ${tabla} WHERE estado = 1 ORDER BY ${pk}`
      );
      res.json(filas);
    } catch (err) {
      manejarError(err, res);
    }
  });

  // GET /:id
  router.get('/:id', async (req, res) => {
    if (!idValido(req.params.id)) return res.status(400).json({ error: 'Id inválido.' });
    try {
      const [filas] = await pool.query(
        `SELECT * FROM ${tabla} WHERE ${pk} = ? AND estado = 1`,
        [req.params.id]
      );
      if (filas.length === 0) return res.status(404).json({ error: 'Registro no encontrado.' });
      res.json(filas[0]);
    } catch (err) {
      manejarError(err, res);
    }
  });

  // POST /
  router.post('/', async (req, res) => {
    const datos = tomarCampos(req.body || {});
    const faltan = requeridos.filter(
      (c) => datos[c] === undefined || datos[c] === null || datos[c] === ''
    );
    if (faltan.length > 0) {
      return res.status(400).json({ error: 'Faltan campos obligatorios.', campos: faltan });
    }
    try {
      const [resultado] = await pool.query(`INSERT INTO ${tabla} SET ?`, [datos]);
      const [filas] = await pool.query(
        `SELECT * FROM ${tabla} WHERE ${pk} = ?`,
        [resultado.insertId]
      );
      res.status(201).json(filas[0]);
    } catch (err) {
      manejarError(err, res);
    }
  });

  // PUT /:id  -> actualiza solo los campos enviados
  router.put('/:id', async (req, res) => {
    if (!idValido(req.params.id)) return res.status(400).json({ error: 'Id inválido.' });
    const datos = tomarCampos(req.body || {});
    if (Object.keys(datos).length === 0) {
      return res.status(400).json({ error: 'No se envió ningún campo para actualizar.' });
    }
    try {
      await pool.query(
        `UPDATE ${tabla} SET ? WHERE ${pk} = ? AND estado = 1`,
        [datos, req.params.id]
      );
      const [filas] = await pool.query(
        `SELECT * FROM ${tabla} WHERE ${pk} = ? AND estado = 1`,
        [req.params.id]
      );
      if (filas.length === 0) return res.status(404).json({ error: 'Registro no encontrado.' });
      res.json(filas[0]);
    } catch (err) {
      manejarError(err, res);
    }
  });

  // DELETE /:id  -> borrado lógico (estado = 0)
  router.delete('/:id', async (req, res) => {
    if (!idValido(req.params.id)) return res.status(400).json({ error: 'Id inválido.' });
    try {
      const [resultado] = await pool.query(
        `UPDATE ${tabla} SET estado = 0 WHERE ${pk} = ? AND estado = 1`,
        [req.params.id]
      );
      if (resultado.affectedRows === 0) {
        return res.status(404).json({ error: 'Registro no encontrado o ya desactivado.' });
      }
      res.json({ mensaje: 'Registro desactivado correctamente.' });
    } catch (err) {
      manejarError(err, res);
    }
  });

  return router;
}

module.exports = crearCrud;