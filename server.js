require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static('public'));

// Подключаем БД (асинхронно)
const db = new sqlite3.Database('clicker.db');

// Создаём таблицы
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id INTEGER UNIQUE,
            username TEXT,
            balance_dust INTEGER DEFAULT 0,
            balance_zuz REAL DEFAULT 0,
            energy INTEGER DEFAULT 100,
            level INTEGER DEFAULT 1,
            click_power INTEGER DEFAULT 1,
            total_clicks INTEGER DEFAULT 0,
            last_energy_refill INTEGER DEFAULT (strftime('%s', 'now')),
            created_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
    `);
});

// ===== API ЭНДПОИНТЫ =====

// Получение или регистрация пользователя
app.post('/api/login', (req, res) => {
    const { telegram_id, username } = req.body;
    db.get('SELECT * FROM users WHERE telegram_id = ?', [telegram_id], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) {
            db.run('INSERT INTO users (telegram_id, username) VALUES (?, ?)', [telegram_id, username], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                db.get('SELECT * FROM users WHERE telegram_id = ?', [telegram_id], (err, newUser) => {
                    res.json(newUser);
                });
            });
        } else {
            res.json(user);
        }
    });
});

// Обработка клика
app.post('/api/click', (req, res) => {
    const { telegram_id } = req.body;
    const now = Math.floor(Date.now() / 1000);
    
    db.get('SELECT * FROM users WHERE telegram_id = ?', [telegram_id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found' });
        
        const last = user.last_energy_refill;
        const elapsed = Math.floor((now - last) / 60);
        let newEnergy = Math.min(100, user.energy + elapsed);
        
        if (newEnergy < 1) {
            return res.json({ success: false, message: 'Нет энергии', energy: newEnergy });
        }
        
        newEnergy -= 1;
        const dustGain = user.click_power;
        const newDust = user.balance_dust + dustGain;
        const newTotalClicks = user.total_clicks + 1;
        const newLevel = Math.floor(newTotalClicks / 10) + 1;
        const newClickPower = 1 + Math.floor((newLevel - 1) / 10);
        
        db.run(`
            UPDATE users SET 
                balance_dust = ?, 
                energy = ?, 
                total_clicks = ?,
                level = ?,
                click_power = ?,
                last_energy_refill = ?
            WHERE telegram_id = ?
        `, [newDust, newEnergy, newTotalClicks, newLevel, newClickPower, now, telegram_id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                success: true,
                dust: newDust,
                energy: newEnergy,
                level: newLevel,
                clickPower: newClickPower
            });
        });
    });
});

// Получение профиля
app.get('/api/profile/:telegram_id', (req, res) => {
    db.get('SELECT * FROM users WHERE telegram_id = ?', [req.params.telegram_id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    });
});

// Таблица лидеров
app.get('/api/leaderboard', (req, res) => {
    db.all('SELECT username, total_clicks, level FROM users ORDER BY total_clicks DESC LIMIT 10', (err, leaders) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(leaders);
    });
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ ZUZ Clicker API запущен на порту ${PORT}`);
});
