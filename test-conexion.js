require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    const [filas] = await conn.query('SELECT COUNT(*) AS tablas FROM information_schema.tables WHERE table_schema = DATABASE()');
    console.log('CONEXION OK, tablas:', filas[0].tablas);
    await conn.end();
  } catch (err) {
    console.log('FALLO:', err.code, '|', err.message);
  }
})();