const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Configura tu conexión a MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'calidad_aire'
   // Asegúrate de usar el puerto interno del contenedor

});

// Endpoint para guardar un dato
app.post('/api/datos', (req, res) => {
  const { sensor_id, topico, valor, unidad } = req.body;
  if (!sensor_id || !topico || valor === undefined) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }
  const sql = 'INSERT INTO datos_sensores (sensor_id, topico, valor, unidad) VALUES (?, ?, ?, ?)';
  const params = [sensor_id, topico, valor, unidad];
  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: result.insertId });
  });
});

// Endpoint para consultar el histórico (opcionalmente por tópico)
app.get('/api/historico', (req, res) => {
  const { topico } = req.query;
  let sql = 'SELECT * FROM datos_sensores';
  let params = [];
  if (topico) {
    sql += ' WHERE topico = ?';
    params.push(topico);
  }
  sql += ' ORDER BY fecha_hora DESC LIMIT 100';
  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Endpoint para guardar una alerta
app.post('/api/alertas', (req, res) => {
  const { color, nivel_ica } = req.body;
  if (!color || nivel_ica === undefined) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }
  const sql = 'INSERT INTO alertas (color, nivel_ica) VALUES (?, ?)';
  db.query(sql, [color, nivel_ica], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: result.insertId });
  });
});

// Endpoint para consultar el historial de alertas
app.get('/api/alertas', (req, res) => {
  const sql = 'SELECT * FROM alertas ORDER BY fecha_hora DESC LIMIT 100';
  db.query(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Endpoint para consultar el promedio del ICA por año
app.get('/api/ica-por-anio', (req, res) => {
  const sql = `
    SELECT YEAR(fecha_hora) AS anio, AVG(valor) AS promedio_ica
    FROM datos_sensores
    WHERE topico = '/air/ica'
    GROUP BY anio
    ORDER BY anio
  `;
  db.query(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Iniciar el servidor
app.listen(3000, () => {
  console.log('API escuchando en http://localhost:3000');
});