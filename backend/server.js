// backend/server.js (Обновлено с проверкой initData)

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto'); // Для проверки хеша
const querystring = require('querystring'); // Для парсинга initData

const app = express();
const port = process.env.PORT || 3000; // Используем переменную окружения для порта

// --- Конфигурация ---
// ВАЖНО: Замени 'YOUR_BOT_TOKEN' на реальный токен твоего бота!
// Лучше всего хранить токен в переменных окружения, а не прямо в коде.
const BOT_TOKEN = process.env.BOT_TOKEN || '8139416482:AAG3LnixdbowRFXwNTEdmF0RMgPPA1ojn3w'; // ЗАМЕНИТЬ!

if (BOT_TOKEN === '' && process.env.NODE_ENV !== 'development') {
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.error("!!! ОШИБКА: Не указан реальный BOT_TOKEN для продакшена! !!!");
    console.error("!!! Установите переменную окружения BOT_TOKEN.             !!!");
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    // В реальном приложении лучше прервать запуск: process.exit(1);
} else if (BOT_TOKEN === '') {
     console.warn("[Предупреждение] Используется заглушка BOT_TOKEN. Установите реальный токен.");
}

app.use(cors()); // Разрешаем запросы с фронтенда
app.use(bodyParser.json());

// --- Простое хранилище в памяти (Данные теряются при перезапуске!) ---
const userDataStore = {}; // { userId: { username, highScore } }
// -----------------------------------------------------------------------

console.log("Инициализация бэкенда (v3 - с проверкой initData)...");

// --- Функции ---

/**
 * Проверяет подлинность данных из Telegram Web App initData.
 * @param {string} initData - Строка initData, полученная от Telegram.
 * @returns {object|null} Распарсенные данные пользователя, если проверка успешна, иначе null.
 */
function verifyTelegramWebAppData(initData) {
    if (!initData || typeof initData !== 'string') {
        console.error('[Auth Verify] Ошибка: initData отсутствует или не строка.');
        return null;
    }
    if (!BOT_TOKEN || BOT_TOKEN === 'YOUR_BOT_TOKEN') {
        console.error('[Auth Verify] Ошибка: BOT_TOKEN не настроен на сервере.');
        return null; // Не можем проверить без токена
    }

    const params = querystring.parse(initData);
    const hash = params.hash;

    if (!hash) {
         console.error('[Auth Verify] Ошибка: hash отсутствует в initData.');
        return null;
    }

    // Удаляем hash из параметров перед созданием строки для проверки
    delete params.hash;

    // Формируем строку данных для проверки хеша
    const dataCheckString = Object.keys(params)
        .sort() // Сортируем ключи по алфавиту
        .map(key => `${key}=${params[key]}`)
        .join('\n'); // Соединяем через \n

    try {
        // Создаем секретный ключ из токена бота
        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();

        // Вычисляем хеш строки данных
        const calculatedHash = crypto.createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

        // Сравниваем хеши
        if (calculatedHash === hash) {
            console.log('[Auth Verify] Проверка initData УСПЕШНА. Данные пользователя:', params.user);
            // Возвращаем распарсенного пользователя (он там в виде JSON строки)
            try {
                 const user = JSON.parse(params.user);
                 // Добавляем auth_date для возможной проверки свежести данных
                 user.auth_date = params.auth_date;
                 return user;
            } catch(e) {
                 console.error('[Auth Verify] Ошибка парсинга user JSON из initData:', e);
                 return null;
            }
        } else {
            console.warn('[Auth Verify] Проверка initData НЕ ПРОШЛА. Хеши не совпадают.');
            console.warn(`   - Полученный hash: ${hash}`);
            console.warn(`   - Рассчитанный hash: ${calculatedHash}`);
            return null;
        }
    } catch (error) {
        console.error('[Auth Verify] Критическая ошибка при проверке хеша:', error);
        return null;
    }
}


// --- Middleware для проверки initData (для защищенных роутов) ---
const authenticateUser = (req, res, next) => {
    const initData = req.body.initData || req.headers['x-init-data']; // Ищем в теле или заголовке

    if (!initData) {
        console.warn('[Auth Middleware] Отсутствует initData в запросе.');
        return res.status(401).json({ message: "Unauthorized: initData required" });
    }

    const user = verifyTelegramWebAppData(initData);

    if (!user) {
        console.warn('[Auth Middleware] Не удалось верифицировать initData.');
        return res.status(403).json({ message: "Forbidden: Invalid initData" });
    }

    // Добавляем проверенного пользователя в объект запроса для дальнейшего использования
    req.verifiedUser = user;
    console.log(`[Auth Middleware] Пользователь ${user.id} (${user.username || user.first_name}) аутентифицирован.`);
    next(); // Переходим к следующему обработчику (основному роуту)
};


// --- API Эндпоинты ---

// 1. Инициализация/Аутентификация пользователя (ЗАЩИЩЕНО)
// Теперь принимает initData в теле запроса
app.post('/api/user/init', authenticateUser, (req, res) => {
    // Используем данные из req.verifiedUser, которые были проверены в middleware
    const userId = req.verifiedUser.id.toString(); // ID может быть числом, приводим к строке
    const username = req.verifiedUser.username || req.verifiedUser.first_name || `User_${userId}`;

    console.log(`[Init Endpoint] Запрос от верифицированного пользователя ID=${userId}, Имя=${username}`);

    if (!userDataStore[userId]) {
        console.log(`[Init Endpoint] Новый пользователь: ${username} (${userId}). Рекорд: 0`);
        userDataStore[userId] = { username: username, highScore: 0 };
    } else {
        // Обновляем имя, если изменилось
        if (userDataStore[userId].username !== username) {
             console.log(`[Init Endpoint] Обновляем имя пользователя ${userId}: ${userDataStore[userId].username} -> ${username}`);
             userDataStore[userId].username = username;
        }
        console.log(`[Init Endpoint] Пользователь ${userDataStore[userId].username} (${userId}) уже есть. Рекорд: ${userDataStore[userId].highScore}`);
    }

    res.json({
        userId: userId, // Возвращаем ID для согласованности
        username: userDataStore[userId].username,
        highScore: userDataStore[userId].highScore
    });
});

// 2. Сохранение нового рекорда (ЗАЩИЩЕНО)
// Теперь принимает initData и score
app.post('/api/score/submit', authenticateUser, (req, res) => {
    const userId = req.verifiedUser.id.toString(); // ID из проверенных данных
    const score = req.body.score; // Счет из тела запроса

    console.log(`[Score Submit Endpoint] Получен результат от верифицированного ${userId}: ${score}`);

    if (typeof score !== 'number' || score < 0 || !Number.isInteger(score)) { // Проверяем, что score - целое неотрицательное число
        console.warn(`[Score Submit Endpoint] Некорректный score (${score}) от ${userId}`);
        return res.status(400).json({ message: "Некорректное значение Score" });
    }

    // Пользователь уже должен существовать после /init, но проверим на всякий случай
    if (!userDataStore[userId]) {
        console.warn(`[Score Submit Endpoint] Попытка сохранить счет для неизвестного (но верифицированного?) пользователя: ${userId}. Создаем запись.`);
        // Если верификация прошла, но записи нет - возможно, первый запуск или перезапуск сервера. Создадим.
        const username = req.verifiedUser.username || req.verifiedUser.first_name || `User_${userId}`;
        userDataStore[userId] = { username: username, highScore: 0 };
    }

    if (score > userDataStore[userId].highScore) {
        console.log(`[Score Submit Endpoint] Новый рекорд для ${userDataStore[userId].username} (${userId}): ${score} (был ${userDataStore[userId].highScore})`);
        userDataStore[userId].highScore = score;
        res.json({ message: "Новый рекорд сохранен!", newHighScore: score });
    } else {
        console.log(`[Score Submit Endpoint] Счет ${score} не выше рекорда (${userDataStore[userId].highScore}) для ${userId}`);
        res.json({ message: "Счет получен, но не рекорд.", currentHighScore: userDataStore[userId].highScore });
    }
});

// 3. Получение рекорда текущего пользователя (ЗАЩИЩЕНО)
// Теперь принимает initData
app.post('/api/score/me', authenticateUser, (req, res) => {
    const userId = req.verifiedUser.id.toString();
    console.log(`[Score Me Endpoint] Запрос рекорда для верифицированного ${userId}`);

    const userRecord = userDataStore[userId];
    const highScore = userRecord ? userRecord.highScore : 0;

    console.log(`[Score Me Endpoint] Рекорд для ${userId}: ${highScore}`);
    res.json({ highScore: highScore });
});


// 4. Получение глобальной таблицы лидеров (ОСТАВЛЯЕМ ОТКРЫТЫМ - для простоты)
// ВАЖНО: Если хочешь, чтобы только авторизованные пользователи могли видеть таблицу,
// добавь сюда `authenticateUser` так же, как в другие роуты.
// app.get('/api/leaderboard/global', authenticateUser, (req, res) => { ... });
app.get('/api/leaderboard/global', (req, res) => {
    const topN = parseInt(req.query.limit, 10) || 10; // Берем лимит из ?limit=N, по умолчанию 10
    console.log(`[Leaderboard Endpoint] Запрос глобального топ-${topN}`);

    const sortedUsers = Object.entries(userDataStore)
        .map(([userId, data]) => ({
            userId: userId, // userId может быть полезен для фронтенда
            username: data.username,
            highScore: data.highScore
        }))
        .filter(user => user.highScore > 0)
        .sort((a, b) => b.highScore - a.highScore)
        .slice(0, topN);

    console.log(`[Leaderboard Endpoint] Отправка топ-${sortedUsers.length} игроков.`);
    res.json(sortedUsers); // Отправляем массив [{ userId, username, highScore }, ...]
});


// --- Запуск сервера ---
app.listen(port, () => {
    console.log(`-------------------------------------------`);
    console.log(` Бэкенд BlockBlast (v3) запущен на порту ${port} `);
    console.log(` Проверка initData ВКЛЮЧЕНА.`);
    console.log(`-------------------------------------------`);
});

process.on('SIGINT', () => {
    console.log("\n[Server] Завершение работы...");
    // Здесь в будущем можно добавить сохранение данных из userDataStore в файл/БД
    process.exit(0);
});