require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const crearCrud = require('./crud');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    mensaje: 'In-air API auxiliar (calibración)',
    estado: 'API funcionando correctamente'
  });
});

app.get('/probar-conexion', async (req, res) => {
  try {
    const [filas] = await pool.query(
      `SELECT COUNT(*) AS total_tablas
       FROM information_schema.tables
       WHERE table_schema = DATABASE()`
    );
    res.json({
      mensaje: 'Conexión exitosa con MySQL',
      total_tablas: filas[0].total_tablas
    });
  } catch (err) {
    console.error('ERROR DE CONEXION:', err.code, err.message);
    res.status(503).json({ error: 'No fue posible conectar con MySQL' });
  }
});

app.use('/estaciones-referencia', crearCrud({
  tabla: 'estacion_referencia',
  pk: 'id_estacion_referencia',
  campos: ['nombre', 'tipo', 'entidad_operadora', 'latitud', 'longitud', 'descripcion'],
  requeridos: ['nombre', 'entidad_operadora']
}));

app.use('/lecturas-referencia', crearCrud({
  tabla: 'lectura_referencia',
  pk: 'id_lectura_referencia',
  campos: ['id_estacion_referencia', 'variable', 'valor', 'unidad', 'fecha_medicion'],
  requeridos: ['id_estacion_referencia', 'variable', 'valor', 'unidad', 'fecha_medicion']
}));

app.use('/calibraciones', crearCrud({
  tabla: 'calibracion',
  pk: 'id_calibracion',
  campos: [
    'id_estacion_referencia', 'id_dispositivo', 'codigo', 'variable', 'metodo',
    'pendiente', 'intercepto', 'r2', 'rmse', 'fecha_inicio', 'fecha_fin', 'observaciones'
  ],
  requeridos: [
    'id_estacion_referencia', 'id_dispositivo', 'codigo', 'variable', 'metodo',
    'fecha_inicio', 'fecha_fin'
  ]
}));

// JSON mal formado u otros errores
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API auxiliar escuchando en el puerto ${PORT}`));