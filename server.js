const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

const DATA_FILE = path.join(__dirname, 'data', 'cars.json');

// Get all cars
app.get('/api/cars', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'No se pudo leer el catálogo.' });
        }
        res.json(JSON.parse(data || '[]'));
    });
});

// Save all cars
app.post('/api/cars', (req, res) => {
    const cars = req.body;
    fs.writeFile(DATA_FILE, JSON.stringify(cars, null, 2), 'utf8', (err) => {
        if (err) {
            return res.status(500).json({ error: 'No se pudo guardar la información.' });
        }
        res.json({ success: true, message: 'Catálogo guardado correctamente.' });
    });
});

// Git sync endpoint
app.post('/api/sync', (req, res) => {
    const command = 'git add . && git commit -m "Auto-update catalog from admin panel" && git push origin main';
    exec(command, { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Git error: ${error}`);
            return res.status(500).json({ error: 'Error al sincronizar con GitHub.', details: stderr });
        }
        res.json({ success: true, log: stdout });
    });
});

app.listen(PORT, () => {
    console.log(`\n🚗 Servidor del Catálogo iniciado en: http://localhost:${PORT}`);
    console.log(`⚙️  Panel de Administración local en: http://localhost:${PORT}/admin/\n`);
});
