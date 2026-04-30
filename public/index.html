<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>ZUZ Clicker — 3D монета</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            user-select: none;
        }
        body {
            background: linear-gradient(145deg, #0A0A0A 0%, #1A1A1A 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
            color: white;
            padding: 20px;
        }
        .game-container {
            max-width: 500px;
            width: 100%;
            background: rgba(20,20,30,0.7);
            backdrop-filter: blur(10px);
            border-radius: 60px;
            padding: 24px;
            box-shadow: 0 25px 50px rgba(0,0,0,0.5);
            border: 1px solid rgba(212,175,55,0.3);
            text-align: center;
        }
        
        /* 3D МОНЕТА */
        .coin-3d {
            width: 220px;
            height: 220px;
            margin: 20px auto;
            position: relative;
            cursor: pointer;
            transition: transform 0.07s cubic-bezier(0.2, 1.2, 0.8, 1);
            filter: drop-shadow(0 10px 20px rgba(0,0,0,0.5));
        }
        .coin-3d:active {
            transform: scale(0.92) rotate(3deg);
        }
        .coin-inner {
            width: 100%;
            height: 100%;
            background: radial-gradient(circle at 35% 35%, #FFF0A8, #D4AF37, #B8860B);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 72px;
            font-weight: 900;
            color: #2A1A00;
            text-shadow: 0 2px 10px rgba(255,215,0,0.8);
            box-shadow: 0 10px 25px rgba(0,0,0,0.4), inset 0 -8px 15px rgba(0,0,0,0.3), inset 0 5px 10px rgba(255,255,200,0.6);
            border: 2px solid #FFE066;
            transition: all 0.05s linear;
            letter-spacing: 4px;
        }
        
        /* СТАТИСТИКА */
        .stats {
            background: rgba(0,0,0,0.5);
            border-radius: 40px;
            padding: 20px;
            margin: 20px 0;
            backdrop-filter: blur(4px);
        }
        .stat-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 14px;
            font-size: 18px;
            font-weight: 500;
        }
        .energy-bar-container {
            background: #2A2A2A;
            border-radius: 30px;
            height: 20px;
            overflow: hidden;
            margin: 10px 0;
            box-shadow: inset 0 1px 3px #000;
        }
        .energy-fill {
            background: linear-gradient(90deg, #00D18C, #00FFB3);
            width: 100%;
            height: 100%;
            transition: width 0.2s ease;
            border-radius: 30px;
            box-shadow: 0 0 6px #00FFAA;
        }
        
        /* ВЫЛЕТАЮЩИЕ ЦИФРЫ */
        .click-effect {
            position: fixed;
            pointer-events: none;
            font-size: 32px;
            font-weight: bold;
            color: #00FFAA;
            text-shadow: 0 0 5px #00D18C;
            animation: floatUp 0.5s ease-out forwards;
            z-index: 2000;
            filter: drop-shadow(0 0 4px #00D18C);
        }
        @keyframes floatUp {
            0% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(0.8);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -150%) scale(1.4);
            }
        }
        
        /* КНОПКИ */
        button {
            background: linear-gradient(135deg, #D4AF37, #B8860B);
            color: #0A0A0A;
            border: none;
            padding: 12px 24px;
            border-radius: 60px;
            font-weight: bold;
            font-size: 16px;
            margin: 8px 6px;
            cursor: pointer;
            transition: 0.1s linear;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        }
        button:active {
            transform: scale(0.96);
        }
        .level-badge {
            background: linear-gradient(135deg, #D4AF37, #FFD966);
            color: #1A1A1A;
            border-radius: 40px;
            padding: 8px 18px;
            font-size: 16px;
            font-weight: bold;
            display: inline-block;
            margin-bottom: 15px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
    </style>
</head>
<body>
<div class="game-container">
    <div class="level-badge" id="levelDisplay">🗿 Уровень 1</div>
    
    <div class="coin-3d" id="coin">
        <div class="coin-inner">ZUZ</div>
    </div>
    
    <div class="stats">
        <div class="stat-row">
            <span>💎 Пыль времени (Dust)</span>
            <span id="dustBalance">0</span>
        </div>
        <div class="stat-row">
            <span>⚡ Энергия</span>
            <span id="energyValue">100</span>
        </div>
        <div class="energy-bar-container">
            <div class="energy-fill" id="energyFill" style="width: 100%"></div>
        </div>
        <div class="stat-row">
            <span>💪 Сила клика</span>
            <span id="clickPower">1</span>
        </div>
        <div class="stat-row">
            <span>🏆 Всего кликов</span>
            <span id="totalClicks">0</span>
        </div>
    </div>
    
    <button id="convertBtn">🔄 Обменять Dust → ZUZ</button>
    <button id="leaderboardBtn">🏅 Таблица лидеров</button>
</div>

<script src="https://telegram.org/js/telegram-web-app.js"></script>
<script>
    let tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation();
    
    let userId = tg.initDataUnsafe.user?.id;
    let username = tg.initDataUnsafe.user?.username || tg.initDataUnsafe.user?.first_name || "Игрок";
    
    let dust = 0;
    let energy = 100;
    let clickPower = 1;
    let totalClicks = 0;
    let level = 1;
    
    const API_URL = window.location.origin;
    
    async function login() {
        const res = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegram_id: userId, username })
        });
        const data = await res.json();
        dust = data.balance_dust;
        energy = data.energy;
        clickPower = data.click_power;
        totalClicks = data.total_clicks;
        level = data.level;
        updateUI();
    }
    
    function updateUI() {
        document.getElementById('dustBalance').innerText = dust;
        document.getElementById('energyValue').innerText = energy;
        document.getElementById('clickPower').innerText = clickPower;
        document.getElementById('totalClicks').innerText = totalClicks;
        document.getElementById('levelDisplay').innerHTML = `🏆 Уровень ${level} 🏆`;
        const percent = Math.max(0, Math.min(100, (energy / 100) * 100));
        document.getElementById('energyFill').style.width = `${percent}%`;
    }
    
    async function handleClick() {
        if (energy < 1) {
            tg.showAlert("⛔ Нет энергии! Подожди немного ⏳");
            return;
        }
        
        const res = await fetch(`${API_URL}/api/click`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegram_id: userId })
        });
        const data = await res.json();
        if (data.success) {
            dust = data.dust;
            energy = data.energy;
            level = data.level;
            clickPower = data.clickPower;
            totalClicks++;
            updateUI();
            showClickEffect();
            tg.HapticFeedback.impactOccurred('heavy');
        } else {
            tg.showAlert(data.message);
        }
    }
    
    function showClickEffect() {
        const coin = document.getElementById('coin');
        const rect = coin.getBoundingClientRect();
        const effect = document.createElement('div');
        effect.className = 'click-effect';
        effect.innerText = `+${clickPower}`;
        effect.style.left = `${rect.left + rect.width / 2}px`;
        effect.style.top = `${rect.top + rect.height / 2}px`;
        document.body.appendChild(effect);
        setTimeout(() => effect.remove(), 500);
    }
    
    document.getElementById('coin').addEventListener('click', handleClick);
    
    document.getElementById('convertBtn').addEventListener('click', () => {
        tg.showAlert(`🔄 Обмен Dust → ZUZ будет доступен после запуска смарт-контракта.\nВаш Dust: ${dust}`);
    });
    
    document.getElementById('leaderboardBtn').addEventListener('click', async () => {
        const res = await fetch(`${API_URL}/api/leaderboard`);
        const leaders = await res.json();
        let msg = "🏆 ТОП-10 КЛИКЕРОВ 🏆\n\n";
        leaders.forEach((u, i) => {
            msg += `${i+1}. ${u.username} — ${u.total_clicks} кликов (ур. ${u.level})\n`;
        });
        tg.showAlert(msg);
    });
    
    login();
</script>
</body>
</html>
