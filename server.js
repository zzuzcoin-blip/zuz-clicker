require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static('public'));

// === БАЗА ДАННЫХ ===
const db = new sqlite3.Database('clicker.db');

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            telegram_id INTEGER PRIMARY KEY,
            username TEXT,
            balance_dust INTEGER DEFAULT 0,
            balance_zuz REAL DEFAULT 0,
            energy INTEGER DEFAULT 100,
            level INTEGER DEFAULT 1,
            click_power INTEGER DEFAULT 1,
            total_clicks INTEGER DEFAULT 0,
            auto_miner_level INTEGER DEFAULT 0,
            daily_streak INTEGER DEFAULT 0,
            last_daily_claim INTEGER DEFAULT 0,
            last_secret_click INTEGER DEFAULT 0,
            achievements TEXT DEFAULT '[]',
            created_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
    `);
});

// === ГЕНЕРАЦИЯ СЕКРЕТНОЙ ЗОНЫ НА СЕГОДНЯ ===
function getDailySecretZone() {
    const today = new Date().toISOString().slice(0,10);
    const hash = today.split('').reduce((a,b) => a + b.charCodeAt(0), 0);
    // Рандомная точка на монете (x: 0-100%, y: 0-100%)
    return {
        x: 20 + (hash % 60),
        y: 20 + ((hash * 7) % 60),
        date: today
    };
}

// === API ===

// Логин / регистрация
app.post('/api/login', (req, res) => {
    const { telegram_id, username } = req.body;
    
    db.get('SELECT * FROM users WHERE telegram_id = ?', [telegram_id], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (!user) {
            // Новый пользователь → приветственный бонус
            db.run(
                'INSERT INTO users (telegram_id, username, balance_dust, energy) VALUES (?, ?, ?, ?)',
                [telegram_id, username, 500, 150],
                function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    db.get('SELECT * FROM users WHERE telegram_id = ?', [telegram_id], (err, newUser) => {
                        res.json({ ...newUser, isNew: true, secretZone: getDailySecretZone() });
                    });
                }
            );
        } else {
            // Восстановление энергии
            const now = Math.floor(Date.now() / 1000);
            const elapsed = Math.floor((now - (user.last_energy_refill || now)) / 60);
            let newEnergy = Math.min(100, user.energy + elapsed);
            if (newEnergy !== user.energy) {
                db.run('UPDATE users SET energy = ?, last_energy_refill = ? WHERE telegram_id = ?', 
                    [newEnergy, now, telegram_id]);
                user.energy = newEnergy;
            }
            res.json({ ...user, isNew: false, secretZone: getDailySecretZone() });
        }
    });
});

// Обработка клика (с учётом секретной зоны)
app.post('/api/click', (req, res) => {
    const { telegram_id, clickX, clickY } = req.body;
    const now = Math.floor(Date.now() / 1000);
    
    db.get('SELECT * FROM users WHERE telegram_id = ?', [telegram_id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found' });
        
        // Проверка секретной зоны
        const secretZone = getDailySecretZone();
        const isSecretHit = Math.abs(clickX - secretZone.x) < 8 && Math.abs(clickY - secretZone.y) < 8;
        let secretBonus = 0;
        let secretMessage = '';
        
        if (isSecretHit && user.last_secret_click !== secretZone.date) {
            secretBonus = 10000;
            secretMessage = '🎉 ТЫ НАШЁЛ СЕКРЕТНУЮ ЗОНУ! +10000 DUST! 🎉';
            db.run('UPDATE users SET last_secret_click = ? WHERE telegram_id = ?', [secretZone.date, telegram_id]);
        }
        
        // Восстановление энергии
        const elapsed = Math.floor((now - (user.last_energy_refill || now)) / 60);
        let newEnergy = Math.min(100, user.energy + elapsed);
        
        if (newEnergy < 1) {
            return res.json({ 
                success: false, 
                message: '⛔ Нет энергии! Подожди 5 минут',
                energy: newEnergy,
                secretMessage: ''
            });
        }
        
        newEnergy -= 1;
        const dustGain = user.click_power;
        const newDust = user.balance_dust + dustGain + secretBonus;
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
                clickPower: newClickPower,
                secretBonus: secretBonus,
                secretMessage: secretMessage
            });
        });
    });
});

// Получение профиля
app.get('/api/profile/:telegram_id', (req, res) => {
    db.get('SELECT * FROM users WHERE telegram_id = ?', [req.params.telegram_id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found' });
        res.json({ ...user, secretZone: getDailySecretZone() });
    });
});

// Ежедневный бонус
app.post('/api/daily', (req, res) => {
    const { telegram_id } = req.body;
    const today = new Date().toISOString().slice(0,10);
    
    db.get('SELECT daily_streak, last_daily_claim FROM users WHERE telegram_id = ?', [telegram_id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found' });
        
        const lastClaim = user.last_daily_claim;
        const isToday = lastClaim === today;
        
        if (isToday) {
            return res.json({ success: false, message: 'Сегодня ты уже забирал бонус!' });
        }
        
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0,10);
        let newStreak = (lastClaim === yesterday) ? user.daily_streak + 1 : 1;
        if (newStreak > 7) newStreak = 7;
        
        const rewards = [100, 150, 200, 250, 300, 400, 500];
        const bonus = rewards[newStreak - 1];
        
        db.run('UPDATE users SET balance_dust = balance_dust + ?, daily_streak = ?, last_daily_claim = ? WHERE telegram_id = ?',
            [bonus, newStreak, today, telegram_id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, bonus: bonus, streak: newStreak });
        });
    });
});

// Таблица лидеров
app.get('/api/leaderboard', (req, res) => {
    db.all('SELECT username, total_clicks, level FROM users ORDER BY total_clicks DESC LIMIT 10', (err, leaders) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(leaders);
    });
});

// Покупка авто-кликера
app.post('/api/buy_auto_miner', (req, res) => {
    const { telegram_id } = req.body;
    const costs = [500, 1500, 3500, 7500, 15000, 30000, 60000, 120000, 250000, 500000];
    
    db.get('SELECT balance_dust, auto_miner_level FROM users WHERE telegram_id = ?', [telegram_id], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found' });
        
        const currentLevel = user.auto_miner_level;
        if (currentLevel >= 10) {
            return res.json({ success: false, message: 'Максимальный уровень авто-кликера!' });
        }
        
        const cost = costs[currentLevel];
        if (user.balance_dust < cost) {
            return res.json({ success: false, message: `Не хватает Dust! Нужно ${cost}` });
        }
        
        const newLevel = currentLevel + 1;
        db.run('UPDATE users SET balance_dust = balance_dust - ?, auto_miner_level = ? WHERE telegram_id = ?',
            [cost, newLevel, telegram_id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, newLevel: newLevel, cost: cost });
        });
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ ZUZ Clicker API запущен на порту ${PORT}`);
});
