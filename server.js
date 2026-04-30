require('dotenv').config();
const express = require('express');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static('public')); // папка с фронтендом

// Подключаем БД
const db = new Database('clicker.db');

// Создаём таблицы
db.exec(`
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

// ===== API ЭНДПОИНТЫ =====

// Получение или регистрация пользователя
app.post('/api/login', (req, res) => {
    const { telegram_id, username } = req.body;
    let user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegram_id);
    if (!user) {
        const stmt = db.prepare('INSERT INTO users (telegram_id, username) VALUES (?, ?)');
        stmt.run(telegram_id, username);
        user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegram_id);
    }
    res.json(user);
});

// Обработка клика
app.post('/api/click', (req, res) => {
    const { telegram_id } = req.body;
    const now = Math.floor(Date.now() / 1000);
    
    let user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegram_id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Восстановление энергии
    const last = user.last_energy_refill;
    const elapsed = Math.floor((now - last) / 60); // каждые 5 минут +1 энергия
    let newEnergy = Math.min(100, user.energy + elapsed);
    
    if (newEnergy < 1) {
        return res.json({ success: false, message: 'Нет энергии', energy: newEnergy });
    }
    
    newEnergy -= 1;
    const dustGain = user.click_power;
    const newDust = user.balance_dust + dustGain;
    const newTotalClicks = user.total_clicks + 1;
    
    // Обновляем уровень (каждые 10 кликов -> +1 уровень)
    const newLevel = Math.floor(newTotalClicks / 10) + 1;
    const newClickPower = 1 + Math.floor((newLevel - 1) / 10);
    
    const stmt = db.prepare(`
        UPDATE users SET 
            balance_dust = ?, 
            energy = ?, 
            total_clicks = ?,
            level = ?,
            click_power = ?,
            last_energy_refill = ?
        WHERE telegram_id = ?
    `);
    stmt.run(newDust, newEnergy, newTotalClicks, newLevel, newClickPower, now, telegram_id);
    
    res.json({
        success: true,
        dust: newDust,
        energy: newEnergy,
        level: newLevel,
        clickPower: newClickPower
    });
});

// Получение профиля
app.get('/api/profile/:telegram_id', (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(req.params.telegram_id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
});

// Таблица лидеров
app.get('/api/leaderboard', (req, res) => {
    const leaders = db.prepare('SELECT username, total_clicks, level FROM users ORDER BY total_clicks DESC LIMIT 10').all();
    res.json(leaders);
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ ZUZ Clicker API запущен на порту ${PORT}`);
});
