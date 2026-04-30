require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static('public'));

// === ПОДКЛЮЧЕНИЕ К SUPABASE ===
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// === ПРОСТАЯ СЕКРЕТНАЯ ЗОНА (ГАРАНТИРОВАННО РАБОТАЕТ) ===
function getDailySecretZone() {
    const today = new Date().toISOString().slice(0,10);
    const hash = today.split('').reduce((a,b) => a + b.charCodeAt(0), 0);
    // Зона занимает почти всю монету (от 20% до 80%) — сложно промахнуться
    return { 
        x: 35 + (hash % 30),    // 35..64%
        y: 35 + ((hash * 7) % 30), // 35..64%
        radius: 25,              // большой радиус
        date: today 
    };
}

// === API ===

// Логин / регистрация
app.post('/api/login', async (req, res) => {
    const { telegram_id, username } = req.body;
    
    let { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegram_id)
        .maybeSingle();
    
    if (error) return res.status(500).json({ error: error.message });
    
    if (!user) {
        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([{ telegram_id, username, balance_dust: 500, energy: 150 }])
            .select()
            .single();
        
        if (insertError) return res.status(500).json({ error: insertError.message });
        
        return res.json({ ...newUser, isNew: true, secretZone: getDailySecretZone() });
    }
    
    const now = Math.floor(Date.now() / 1000);
    const lastRefill = user.last_energy_refill || now;
    const elapsed = Math.floor((now - lastRefill) / 60);
    let newEnergy = Math.min(100, user.energy + elapsed);
    
    if (newEnergy !== user.energy) {
        await supabase
            .from('users')
            .update({ energy: newEnergy, last_energy_refill: now })
            .eq('telegram_id', telegram_id);
        user.energy = newEnergy;
    }
    
    res.json({ ...user, isNew: false, secretZone: getDailySecretZone() });
});

// Обработка клика (с большой зоной попадания)
app.post('/api/click', async (req, res) => {
    const { telegram_id, clickX, clickY } = req.body;
    const now = Math.floor(Date.now() / 1000);
    
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegram_id)
        .single();
    
    if (error || !user) return res.status(404).json({ error: 'User not found' });
    
    // Секретная зона (увеличенный радиус)
    const secretZone = getDailySecretZone();
    const dx = Math.abs(clickX - secretZone.x);
    const dy = Math.abs(clickY - secretZone.y);
    const isSecretHit = dx < secretZone.radius && dy < secretZone.radius;
    
    let secretBonus = 0;
    let secretMessage = '';
    
    if (isSecretHit && user.last_secret_click !== secretZone.date) {
        secretBonus = 10000;
        secretMessage = '🎉 ТЫ НАШЁЛ СЕКРЕТНУЮ ЗОНУ! +10000 DUST! 🎉';
        await supabase
            .from('users')
            .update({ last_secret_click: secretZone.date })
            .eq('telegram_id', telegram_id);
    }
    
    // Восстановление энергии
    const lastRefill = user.last_energy_refill || now;
    const elapsed = Math.floor((now - lastRefill) / 60);
    let newEnergy = Math.min(100, user.energy + elapsed);
    
    if (newEnergy < 1) {
        return res.json({ success: false, message: '⛔ Нет энергии! Подожди 5 минут', energy: newEnergy });
    }
    
    newEnergy -= 1;
    const dustGain = user.click_power;
    const newDust = user.balance_dust + dustGain + secretBonus;
    const newTotalClicks = (user.total_clicks || 0) + 1;
    const newLevel = Math.floor(newTotalClicks / 10) + 1;
    const newClickPower = 1 + Math.floor((newLevel - 1) / 10);
    
    const { error: updateError } = await supabase
        .from('users')
        .update({
            balance_dust: newDust,
            energy: newEnergy,
            total_clicks: newTotalClicks,
            level: newLevel,
            click_power: newClickPower,
            last_energy_refill: now
        })
        .eq('telegram_id', telegram_id);
    
    if (updateError) return res.status(500).json({ error: updateError.message });
    
    res.json({
        success: true,
        dust: newDust,
        energy: newEnergy,
        level: newLevel,
        clickPower: newClickPower,
        totalClicks: newTotalClicks,
        secretBonus: secretBonus,
        secretMessage: secretMessage
    });
});

// Остальные API (профиль, daily, лидеры, авто-кликер) такие же, как были
app.get('/api/profile/:telegram_id', async (req, res) => {
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', req.params.telegram_id)
        .maybeSingle();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ...user, secretZone: getDailySecretZone() });
});

app.post('/api/daily', async (req, res) => {
    const { telegram_id } = req.body;
    const today = new Date().toISOString().slice(0,10);
    
    const { data: user, error } = await supabase
        .from('users')
        .select('daily_streak, last_daily_claim, balance_dust')
        .eq('telegram_id', telegram_id)
        .single();
    
    if (error) return res.status(404).json({ error: 'User not found' });
    
    if (user.last_daily_claim === today) {
        return res.json({ success: false, message: 'Сегодня ты уже забирал бонус!' });
    }
    
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0,10);
    let newStreak = (user.last_daily_claim === yesterday) ? (user.daily_streak || 0) + 1 : 1;
    if (newStreak > 7) newStreak = 7;
    
    const rewards = [100, 150, 200, 250, 300, 400, 500];
    const bonus = rewards[newStreak - 1];
    
    await supabase
        .from('users')
        .update({
            balance_dust: (user.balance_dust || 0) + bonus,
            daily_streak: newStreak,
            last_daily_claim: today
        })
        .eq('telegram_id', telegram_id);
    
    res.json({ success: true, bonus, streak: newStreak });
});

app.get('/api/leaderboard', async (req, res) => {
    const { data: leaders, error } = await supabase
        .from('users')
        .select('username, total_clicks, level')
        .order('total_clicks', { ascending: false })
        .limit(10);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(leaders);
});

app.post('/api/buy_auto_miner', async (req, res) => {
    const { telegram_id } = req.body;
    const costs = [500, 1500, 3500, 7500, 15000, 30000, 60000, 120000, 250000, 500000];
    
    const { data: user, error } = await supabase
        .from('users')
        .select('balance_dust, auto_miner_level')
        .eq('telegram_id', telegram_id)
        .single();
    
    if (error) return res.status(404).json({ error: 'User not found' });
    
    const currentLevel = user.auto_miner_level || 0;
    if (currentLevel >= 10) {
        return res.json({ success: false, message: 'Максимальный уровень авто-кликера!' });
    }
    
    const cost = costs[currentLevel];
    if (user.balance_dust < cost) {
        return res.json({ success: false, message: `Не хватает Dust! Нужно ${cost}` });
    }
    
    const newLevel = currentLevel + 1;
    await supabase
        .from('users')
        .update({
            balance_dust: user.balance_dust - cost,
            auto_miner_level: newLevel
        })
        .eq('telegram_id', telegram_id);
    
    res.json({ success: true, newLevel });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ ZUZ Clicker API with Supabase on port ${PORT}`);
});
