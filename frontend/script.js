// frontend/script.js (v7 - Без призрака, с Настройками звука)

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM готов. Запуск скрипта v7 (Без призрака, Настройки звука)...");

    // --- Конфигурация игры ---
    const BOARD_SIZE = 8;
    const PIECE_POOL_SIZE = 3;
    const API_BASE_URL = 'http://localhost:3000/api'; // ИЗМЕНИ НА АДРЕС БЭКЕНДА ПРИ ДЕПЛОЕ
    const LEADERBOARD_LIMIT = 10;
    const COMBO_SCORE_MULTIPLIER = 1.5;
    const LOCALSTORAGE_SOUND_KEY = 'blockblast_soundEnabled'; // Ключ для сохранения настройки звука

    // --- Элементы DOM ---
    console.log("Получаем элементы DOM...");
    const gameContainer = document.getElementById('game-container');
    const boardElement = document.getElementById('game-board');
    const piecePoolElement = document.getElementById('piece-pool');
    const currentScoreElement = document.getElementById('current-score');
    const highScoreElement = document.getElementById('high-score');
    const gameOverModal = document.getElementById('game-over-modal');
    const finalScoreElement = document.getElementById('final-score');
    const finalHighscoreElement = document.getElementById('final-highscore-value');
    const modalRestartButton = document.getElementById('modal-restart-button');
    const dragCloneElement = document.getElementById('drag-clone');
    // Кнопки хедера
    const leaderboardButton = document.getElementById('leaderboard-button');
    const settingsButton = document.getElementById('settings-button'); // Новая кнопка
    // Модальные окна
    const leaderboardModal = document.getElementById('leaderboard-modal');
    const settingsModal = document.getElementById('settings-modal'); // Новое модальное окно
    // Элементы управления
    const leaderboardListElement = document.getElementById('leaderboard-list');
    const leaderboardCloseButton = document.getElementById('leaderboard-close-button');
    const settingsCloseButton = document.getElementById('settings-close-button'); // Кнопка закрытия настроек
    const soundToggleCheckbox = document.getElementById('sound-toggle-checkbox'); // Чекбокс звука
    const comboAnimationContainer = document.getElementById('combo-animation-container');
    // ПРОВЕРКА КЛЮЧЕВЫХ ЭЛЕМЕНТОВ
    if (!boardElement || !piecePoolElement || !dragCloneElement || !currentScoreElement || !highScoreElement || !gameOverModal || !leaderboardModal || !settingsModal || !settingsButton || !soundToggleCheckbox ) {
        console.error("КРИТИЧЕСКАЯ ОШИБКА: Не найдены основные игровые элементы DOM!");
        alert("Ошибка загрузки игры: не найдены элементы интерфейса. Обновите страницу.");
        return;
    }
    console.log("Элементы DOM получены.");

    // --- Аудио Элементы ---
    const audioElements = {
        place: document.getElementById('audio-place'),
        clear: document.getElementById('audio-clear'),
        combo: document.getElementById('audio-combo'),
        gameover: document.getElementById('audio-gameover')
    };
    let audioContextInitialized = false; // Флаг для инициализации AudioContext
    let isSoundEnabled = true; // Флаг вкл/выкл звука (управляется настройкой)

    // --- Состояние игры ---
    let board = []; let currentScore = 0; let highScore = 0;
    let availablePieces = []; let draggedPiece = null; let draggedPieceElement = null;
    let dragStartOffset = { x: 0, y: 0 }; let isTouching = false; let touchIdentifier = null;
    let telegramUser = null; let telegramInitData = null;
    // let lastGhostTarget = { row: -1, col: -1 }; // УДАЛЕНО (Призрак)
    let boardCellSize = { width: 0, height: 0 };
    let boardPadding = { top: 0, left: 0 };
    let isOverBoard = false; // Флаг, находится ли курсор/палец над доской

    // --- Определения фигур ---
    // (Оставлено без изменений, как в v6)
    const pieceDefinitions = [ /* ... массив фигур ... */
        { id: '1x1', shape: [[0, 0]], color: 1 }, { id: '1x2', shape: [[0, 0], [1, 0]], color: 2 },
        { id: '2x1', shape: [[0, 0], [0, 1]], color: 2 }, { id: '1x3', shape: [[0, 0], [1, 0], [2, 0]], color: 3 },
        { id: '3x1', shape: [[0, 0], [0, 1], [0, 2]], color: 3 }, { id: '2x2', shape: [[0, 0], [0, 1], [1, 0], [1, 1]], color: 4 },
        { id: 'L3a', shape: [[0, 0], [1, 0], [1, 1]], color: 5 }, { id: 'L3b', shape: [[0, 1], [1, 1], [1, 0]], color: 5 },
        { id: 'L3c', shape: [[0, 0], [0, 1], [1, 1]], color: 5 }, { id: 'L3d', shape: [[1, 0], [0, 0], [0, 1]], color: 5 },
        { id: 'T4a', shape: [[0,0],[0,1],[0,2],[1,1]], color: 6 }, { id: 'T4b', shape: [[0,1],[1,0],[1,1],[2,1]], color: 6 },
        { id: 'T4c', shape: [[1,0],[1,1],[1,2],[0,1]], color: 6 }, { id: 'T4d', shape: [[0,0],[1,0],[2,0],[1,1]], color: 6 },
        { id: 'S4a', shape: [[0,1],[0,2],[1,0],[1,1]], color: 7 }, { id: 'S4b', shape: [[0,0],[1,0],[1,1],[2,1]], color: 7 },
        { id: 'Z4a', shape: [[0,0],[0,1],[1,1],[1,2]], color: 1 }, { id: 'Z4b', shape: [[0,1],[1,1],[1,0],[2,0]], color: 1 },
        { id: 'U5', shape: [[0,0],[0,2],[1,0],[1,1],[1,2]], color: 2 }, { id: 'Plus5', shape: [[0,1],[1,0],[1,1],[1,2],[2,1]], color: 3 },
        { id: '1x4', shape: [[0,0],[1,0],[2,0],[3,0]], color: 4 }, { id: '4x1', shape: [[0,0],[0,1],[0,2],[0,3]], color: 4 },
        { id: '1x5', shape: [[0,0],[1,0],[2,0],[3,0],[4,0]], color: 5 }, { id: '5x1', shape: [[0,0],[0,1],[0,2],[0,3],[0,4]], color: 5 },
        { id: 'Frame3x3', shape: [[0,0],[0,1],[0,2], [1,0],[1,2], [2,0],[2,1],[2,2]], color: 6 },
        { id: '3x3', shape: [[0,0],[0,1],[0,2], [1,0],[1,1],[1,2], [2,0],[2,1],[2,2]], color: 7 },
        { id: 'L4a', shape: [[0,0],[1,0],[2,0],[2,1]], color: 2 }, { id: 'L4b', shape: [[0,1],[1,1],[2,1],[2,0]], color: 2 },
        { id: 'L4c', shape: [[0,0],[0,1],[1,1],[2,1]], color: 2 }, { id: 'L4d', shape: [[1,0],[1,1],[1,2],[0,2]], color: 2 },
    ];
    console.log(`Определено ${pieceDefinitions.length} фигур.`);

    // --- Функции ---

    async function initGame() {
        console.log("Вызов initGame (v7)...");
        initializeAudio(); // Инициализация звука и загрузка настроек

        // --- Логика Telegram InitData ---
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.ready();
            telegramInitData = window.Telegram.WebApp.initData;
            telegramUser = window.Telegram.WebApp.initDataUnsafe?.user;
            if (telegramInitData && telegramUser) {
                console.log("TG InitData получена. User:", telegramUser);
                try {
                    const response = await fetch(`${API_BASE_URL}/user/init`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: telegramInitData }) });
                    if (response.status === 403) throw new Error(`Доступ запрещен (403). Невалидные данные initData.`);
                    if (!response.ok) throw new Error(`Ошибка инициализации пользователя: ${response.status} ${response.statusText}`);
                    const data = await response.json(); highScore = data.highScore || 0; if (data.username) telegramUser.username = data.username;
                    console.log(`Иниц. ОК. Рекорд: ${highScore}`); updateHighScoreDisplay();
                } catch (error) { console.error("Ошибка инициализации пользователя на бэкенде:", error); telegramInitData = null; telegramUser = null; highScore = 0; updateHighScoreDisplay(); }
            } else { console.warn("Нет initData/user. Оффлайн."); telegramInitData = null; telegramUser = null; highScore = 0; updateHighScoreDisplay(); }
        } else { console.warn("Нет SDK Telegram. Оффлайн."); telegramInitData = null; telegramUser = null; highScore = 0; updateHighScoreDisplay(); }
        // --- Конец логики InitData ---

        createBoard();
        calculateBoardMetrics();
        resetGame();
        setupGlobalListeners();
        setupUIClickListeners(); // Настройка слушателей кнопок UI (включая новые)

        console.log("initGame завершен.");
    }

    // Инициализация аудио: загрузка настроек, установка состояния чекбокса и обработчик взаимодействия
    function initializeAudio() {
        // Загрузка настройки звука из localStorage
        const savedSoundSetting = localStorage.getItem(LOCALSTORAGE_SOUND_KEY);
        // Звук включен по умолчанию, если настройка не сохранена
        isSoundEnabled = savedSoundSetting !== null ? JSON.parse(savedSoundSetting) : true;
        console.log(`Звук инициализирован. Сохраненная настройка: ${savedSoundSetting}, Текущее состояние: ${isSoundEnabled}`);

        // Установка состояния чекбокса в соответствии с загруженной настройкой
        if (soundToggleCheckbox) {
             soundToggleCheckbox.checked = isSoundEnabled;
        } else {
             console.error("Элемент чекбокса звука не найден!");
        }


        // Обработчик для инициализации AudioContext при первом взаимодействии
        const interactionHandler = () => {
            if (!audioContextInitialized) {
                audioContextInitialized = true;
                console.log("Первое взаимодействие пользователя зарегистрировано. AudioContext инициализирован.");
                // Пытаемся тихо воспроизвести и остановить звук, чтобы "разбудить" AudioContext
                const sounds = Object.values(audioElements);
                const soundToWake = sounds.find(s => s);
                if (soundToWake) {
                    // Воспроизводим только если звук включен в настройках!
                    if(isSoundEnabled) {
                        soundToWake.play().then(() => {
                            soundToWake.pause();
                            soundToWake.currentTime = 0;
                            console.log("Пробное воспроизведение звука успешно.");
                        }).catch(e => {
                            console.warn("Пробное воспроизведение звука не удалось:", e.name, e.message);
                        });
                    } else {
                         console.log("Пробное воспроизведение пропущено, звук выключен в настройках.");
                    }
                }
                // Удаляем обработчики после первого срабатывания
                document.removeEventListener('click', interactionHandler);
                document.removeEventListener('touchstart', interactionHandler);
                document.removeEventListener('keydown', interactionHandler);
            }
        };
        // Добавляем обработчики (удалятся после первого срабатывания)
        document.addEventListener('click', interactionHandler, { once: true });
        document.addEventListener('touchstart', interactionHandler, { once: true });
        document.addEventListener('keydown', interactionHandler, { once: true });
    }

    // Функция воспроизведения звука (теперь проверяет isSoundEnabled)
    function playSound(soundKey) {
        const audioElement = audioElements[soundKey];
        // Воспроизводим только если контекст инициализирован, звук включен и элемент найден
        if (audioContextInitialized && isSoundEnabled && audioElement) {
            audioElement.currentTime = 0;
            audioElement.play().catch(error => {
                console.warn(`Не удалось воспроизвести звук '${soundKey}':`, error.name, error.message);
            });
        } else {
             // Логи для отладки, почему не играем
             // if (!audioContextInitialized) console.log(`Звук '${soundKey}' не воспроизведен: AudioContext не инициализирован.`);
             // if (!isSoundEnabled) console.log(`Звук '${soundKey}' не воспроизведен: выключен в настройках.`);
             // if (!audioElement) console.warn(`Звук '${soundKey}' не воспроизведен: аудио элемент не найден.`);
        }
    }

    // Обработчик изменения состояния чекбокса звука
    function handleSoundToggle() {
        isSoundEnabled = soundToggleCheckbox.checked;
        console.log(`Настройка звука изменена: ${isSoundEnabled}`);
        // Сохраняем настройку в localStorage
        try {
             localStorage.setItem(LOCALSTORAGE_SOUND_KEY, JSON.stringify(isSoundEnabled));
             console.log(`Настройка звука сохранена в localStorage.`);
             // Можно воспроизвести тихий звук при включении для подтверждения
             if (isSoundEnabled) {
                 // Например, короткий щелчок или звук 'place' тихо
                 // playSound('place'); // Или специальный звук 'ui_click'
             }
        } catch (e) {
             console.error("Не удалось сохранить настройку звука в localStorage:", e);
        }

    }


    function calculateBoardMetrics() { /* ... без изменений ... */
        const firstCell = boardElement.querySelector('.cell'); if (firstCell) { boardCellSize.width = firstCell.offsetWidth; boardCellSize.height = firstCell.offsetHeight; } else { const approxSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell-size')) || 40; boardCellSize.width = approxSize; boardCellSize.height = approxSize; console.warn("Не удалось найти ячейку для измерения, используется приблизительный размер."); } const boardStyle = getComputedStyle(boardElement); boardPadding.top = parseFloat(boardStyle.paddingTop || '0'); boardPadding.left = parseFloat(boardStyle.paddingLeft || '0');
    }
    function resetGame() { /* ... без изменений, кроме удаления hidePieceGhost() ... */
        console.log("Вызов resetGame..."); currentScore = 0; updateScoreDisplay(); updateFinalHighscoreDisplay(); gameOverModal.classList.add('hidden'); leaderboardModal.classList.add('hidden'); settingsModal.classList.add('hidden'); /* hidePieceGhost(); УДАЛЕНО */ board = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(0)); const cells = boardElement.querySelectorAll('.cell'); cells.forEach(cell => { cell.className = 'cell'; cell.removeAttribute('data-color'); }); clearPiecePool(); generateNewPieces(); if (!isAnyMovePossible()) { console.warn("Нет возможных ходов сразу после генерации! Повторная попытка..."); clearPiecePool(); generateNewPieces(); if (!isAnyMovePossible()) { console.error("КРИТИЧЕСКАЯ ОШИБКА: Нет ходов даже после второй генерации!"); alert("Невероятно! Нет доступных ходов. Пожалуйста, начните игру заново."); showGameOverModal(); } } resetPieceAppearance(); console.log("resetGame завершен.");
    }
    function createBoard() { /* ... без изменений ... */
        console.log("Вызов createBoard..."); boardElement.innerHTML = ''; boardElement.style.setProperty('--board-size', BOARD_SIZE); for (let r = 0; r < BOARD_SIZE; r++) { for (let c = 0; c < BOARD_SIZE; c++) { const cell = document.createElement('div'); cell.classList.add('cell'); cell.dataset.row = r; cell.dataset.col = c; boardElement.appendChild(cell); } } boardElement.addEventListener('dragover', handleDragOver); boardElement.addEventListener('drop', handleDrop); boardElement.addEventListener('touchmove', handleTouchMove); boardElement.addEventListener('dragenter', handleDragEnterBoard); boardElement.addEventListener('dragleave', handleDragLeaveBoard); console.log("createBoard завершен.");
    }
    function setupGlobalListeners() { /* ... без изменений ... */
        window.removeEventListener('touchend', handleTouchEnd); window.removeEventListener('touchcancel', handleTouchEnd); window.removeEventListener('resize', calculateBoardMetrics); window.addEventListener('touchend', handleTouchEnd, { passive: false }); window.addEventListener('touchcancel', handleTouchEnd, { passive: false }); window.addEventListener('resize', calculateBoardMetrics);
    }
    // Обновленная функция: добавляем слушатели для Настроек
    function setupUIClickListeners() {
        leaderboardButton.addEventListener('click', showLeaderboard);
        leaderboardCloseButton.addEventListener('click', hideLeaderboard);

        settingsButton.addEventListener('click', showSettings); // Показ настроек
        settingsCloseButton.addEventListener('click', hideSettings); // Скрытие настроек

        soundToggleCheckbox.addEventListener('change', handleSoundToggle); // Обработка переключателя звука

        modalRestartButton.addEventListener('click', resetGame);
        const restartButton = document.getElementById('restart-button'); if (restartButton) { restartButton.addEventListener('click', resetGame); }
    }
    function updateScoreDisplay() { /* ... без изменений ... */ currentScoreElement.textContent = currentScore; }
    function updateHighScoreDisplay() { /* ... без изменений ... */ highScoreElement.textContent = highScore; }
    function updateFinalHighscoreDisplay() { /* ... без изменений ... */ finalHighscoreElement.textContent = highScore; }
    function createPieceElement(pieceData) { /* ... без изменений ... */
        try { const pieceWrapper = document.createElement('div'); pieceWrapper.classList.add('piece-preview-wrapper'); const pieceElement = document.createElement('div'); pieceElement.classList.add('piece'); pieceElement.dataset.pieceId = pieceData.id; pieceElement.draggable = true; let maxRow = 0, maxCol = 0; pieceData.shape.forEach(([r, c]) => { if (r > maxRow) maxRow = r; if (c > maxCol) maxCol = c; }); const rows = maxRow + 1; const cols = maxCol + 1; pieceElement.style.gridTemplateRows = `repeat(${rows}, var(--cell-size))`; pieceElement.style.gridTemplateColumns = `repeat(${cols}, var(--cell-size))`; pieceElement.style.width = `calc(${cols} * var(--cell-size))`; pieceElement.style.height = `calc(${rows} * var(--cell-size))`; const grid = Array(rows).fill(0).map(() => Array(cols).fill(null)); pieceData.shape.forEach(([r, c]) => { const block = document.createElement('div'); block.classList.add('piece-block'); block.dataset.color = pieceData.color; grid[r][c] = block; }); for (let r = 0; r < rows; r++) { for (let c = 0; c < cols; c++) { pieceElement.appendChild(grid[r][c] || document.createElement('div')); } } pieceElement.addEventListener('dragstart', handleDragStart); pieceElement.addEventListener('dragend', handleDragEnd); pieceElement.addEventListener('touchstart', handleTouchStart, { passive: false }); pieceWrapper.appendChild(pieceElement); return pieceWrapper; } catch (error) { console.error(`ОШИБКА в createPieceElement для фигуры ${pieceData?.id}:`, error); return null; }
    }
    function clearPiecePool() { /* ... без изменений ... */
        console.log("Очистка пула фигур..."); piecePoolElement.innerHTML = ''; availablePieces = [];
    }
    function generateNewPieces() { /* ... без изменений ... */
        console.log("Вызов generateNewPieces..."); if (!piecePoolElement) { console.error("ОШИБКА: piecePoolElement не найден при генерации фигур!"); return; } availablePieces = []; for (let i = 0; i < PIECE_POOL_SIZE; i++) { const randomIndex = Math.floor(Math.random() * pieceDefinitions.length); const newPieceData = JSON.parse(JSON.stringify(pieceDefinitions[randomIndex])); newPieceData.instanceId = `p${Date.now()}-${i}`; availablePieces.push(newPieceData); const pieceWrapperElement = createPieceElement(newPieceData); if (pieceWrapperElement && pieceWrapperElement.firstChild) { pieceWrapperElement.firstChild.dataset.instanceId = newPieceData.instanceId; piecePoolElement.appendChild(pieceWrapperElement); } else { console.error(`  - ОШИБКА создания DOM для фигуры ${newPieceData.id}`); } } console.log(`generateNewPieces: Сгенерировано ${availablePieces.length} фигур.`); checkGameOver(); updatePieceAvailability();
    }
    function canPlacePiece(pieceData, startRow, startCol) { /* ... без изменений ... */
        if (!pieceData || !pieceData.shape) return false; for (const [dr, dc] of pieceData.shape) { const r = startRow + dr; const c = startCol + dc; if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE || board[r][c] !== 0) return false; } return true;
    }
    function placePiece(pieceData, startRow, startCol) { /* ... без изменений ... */
        playSound('place'); let blocksPlaced = 0; pieceData.shape.forEach(([dr, dc]) => { const r = startRow + dr; const c = startCol + dc; if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) { board[r][c] = pieceData.color; const cellElement = boardElement.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`); if (cellElement) { cellElement.className = 'cell filled'; cellElement.dataset.color = pieceData.color; } else { console.warn(`Не найдена ячейка DOM [${r}, ${c}] при размещении.`); } blocksPlaced++; } }); addScore(blocksPlaced);
    }
    function addScore(points) { /* ... без изменений ... */
        currentScore += points; updateScoreDisplay(); if (currentScore > highScore) { highScore = currentScore; updateHighScoreDisplay(); updateFinalHighscoreDisplay(); }
    }
    function checkAndClearLines() { /* ... без изменений ... */
        let linesClearedCount = 0; const rowsToClear = new Set(); const colsToClear = new Set(); for (let r = 0; r < BOARD_SIZE; r++) { if (board[r].every(cell => cell !== 0)) rowsToClear.add(r); } for (let c = 0; c < BOARD_SIZE; c++) { let colFull = true; for (let r = 0; r < BOARD_SIZE; r++) { if (board[r][c] === 0) { colFull = false; break; } } if (colFull) colsToClear.add(c); } const cellsToClearCoords = new Set(); rowsToClear.forEach(r => { for (let c = 0; c < BOARD_SIZE; c++) cellsToClearCoords.add(`${r}-${c}`); }); colsToClear.forEach(c => { for (let r = 0; r < BOARD_SIZE; r++) cellsToClearCoords.add(`${r}-${c}`); }); if (cellsToClearCoords.size > 0) { linesClearedCount = rowsToClear.size + colsToClear.size; console.log(`Очистка ${linesClearedCount} линий (${rowsToClear.size} строк, ${colsToClear.size} столбцов).`); cellsToClearCoords.forEach(coord => { const [r, c] = coord.split('-').map(Number); const cellElement = boardElement.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`); if (cellElement && board[r][c] !== 0) cellElement.classList.add('clearing'); }); if (linesClearedCount > 1) { playSound('combo'); showComboAnimation(linesClearedCount); } else if (linesClearedCount > 0) { playSound('clear'); } setTimeout(() => { cellsToClearCoords.forEach(coord => { const [r, c] = coord.split('-').map(Number); if (board[r][c] !== 0) { board[r][c] = 0; const cellElement = boardElement.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`); if (cellElement) { cellElement.className = 'cell'; cellElement.removeAttribute('data-color'); } } }); let scoreForLines = 0; const basePointsPerLine = BOARD_SIZE; if (linesClearedCount > 0) { for (let i = 1; i <= linesClearedCount; i++) scoreForLines += basePointsPerLine * i; if (linesClearedCount > 1) { scoreForLines = Math.round(scoreForLines * COMBO_SCORE_MULTIPLIER); console.log(`Комбо x${linesClearedCount}! Бонус x${COMBO_SCORE_MULTIPLIER}`); } console.log(`+${scoreForLines} очков за ${linesClearedCount} линии`); addScore(scoreForLines); } if (availablePieces.length === 0) generateNewPieces(); else { checkGameOver(); updatePieceAvailability(); } }, 350); } else { if (availablePieces.length === 0) generateNewPieces(); else { checkGameOver(); updatePieceAvailability(); } }
    }
    function showComboAnimation(linesCount) { /* ... без изменений ... */
        if (!comboAnimationContainer) return; const comboText = document.createElement('div'); comboText.classList.add('combo-text'); if(linesCount >= 2) comboText.classList.add(`combo-${Math.min(linesCount, 7)}`); comboText.textContent = `Комбо x${linesCount}!`; comboAnimationContainer.appendChild(comboText); comboText.addEventListener('animationend', () => { comboText.remove(); }, { once: true });
    }
    function isAnyMovePossible() { /* ... без изменений ... */
        if (availablePieces.length === 0) return true; for (const pieceData of availablePieces) { for (let r = 0; r < BOARD_SIZE; r++) { for (let c = 0; c < BOARD_SIZE; c++) { if (canPlacePiece(pieceData, r, c)) return true; } } } return false;
    }
    function checkGameOver() { /* ... без изменений, кроме удаления hidePieceGhost() ... */
        if (!isAnyMovePossible()) { console.log("ИГРА ОКОНЧЕНА! Нет возможных ходов."); playSound('gameover'); showGameOverModal(); /* hidePieceGhost(); УДАЛЕНО */ updateFinalHighscoreDisplay(); if (telegramInitData && currentScore >= 0) submitScore(currentScore); else if (!telegramInitData) console.log("Оффлайн режим, счет не отправлен на сервер."); }
    }
    function showGameOverModal() { /* ... без изменений ... */
        finalScoreElement.textContent = currentScore; gameOverModal.classList.remove('hidden');
    }
    async function submitScore(score) { /* ... без изменений ... */
        if (!telegramInitData) { console.warn("Попытка отправить счет без initData."); return; } console.log(`Отправка счета ${score} на сервер...`); try { const response = await fetch(`${API_BASE_URL}/score/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: telegramInitData, score: score }) }); if (response.status === 403) throw new Error(`Доступ запрещен (403). Невалидные данные initData.`); if (!response.ok) throw new Error(`Ошибка отправки счета: ${response.status} ${response.statusText}`); const result = await response.json(); console.log("Ответ сервера на отправку счета:", result); if (result.newHighScore !== undefined) { highScore = result.newHighScore; updateHighScoreDisplay(); updateFinalHighscoreDisplay(); } } catch (error) { console.error("Ошибка при отправке счета:", error); }
    }
    function updatePieceAvailability() { /* ... без изменений ... */
        piecePoolElement.querySelectorAll('.piece').forEach(pElement => { const instanceId = pElement.dataset.instanceId; const pieceData = availablePieces.find(p => p.instanceId === instanceId); if (!pieceData) return; let canPlaceThisPiece = false; for (let r = 0; r < BOARD_SIZE; r++) { for (let c = 0; c < BOARD_SIZE; c++) { if (canPlacePiece(pieceData, r, c)) { canPlaceThisPiece = true; break; } } if (canPlaceThisPiece) break; } if (canPlaceThisPiece) { pElement.classList.remove('disabled'); pElement.draggable = true; } else { pElement.classList.add('disabled'); pElement.draggable = false; } });
    }
    function resetPieceAppearance(instanceId = null) { /* ... без изменений, кроме удаления hidePieceGhost() ... */
        /* if (GHOST_ENABLED) hidePieceGhost(); УДАЛЕНО */ const idToReset = instanceId || draggedPiece?.instanceId; if (idToReset) { const pieceElement = piecePoolElement.querySelector(`.piece[data-instance-id="${idToReset}"]`); if (pieceElement) { const wrapper = pieceElement.closest('.piece-preview-wrapper'); if(wrapper) wrapper.style.visibility = 'visible'; pieceElement.style.opacity = '1'; } } else { piecePoolElement.querySelectorAll('.piece-preview-wrapper').forEach(wrapper => { wrapper.style.visibility = 'visible'; }); piecePoolElement.querySelectorAll('.piece:not(.disabled)').forEach(p => { p.style.opacity = '1'; }); } if (!dragCloneElement.classList.contains('hidden')) { dragCloneElement.classList.add('hidden'); dragCloneElement.innerHTML = ''; } draggedPiece = null; draggedPieceElement = null; isTouching = false; touchIdentifier = null;
    }

    // --- Drag & Drop Handlers (Без изменений, призрак уже удален) ---
    function handleDragEnterBoard(e) { isOverBoard = true; }
    function handleDragLeaveBoard(e) { if (!boardElement.contains(e.relatedTarget)) isOverBoard = false; }
    function handleDragStart(e) {
        const pieceElement = e.target.closest('.piece'); if (!pieceElement || pieceElement.classList.contains('disabled') || pieceElement.id === 'drag-clone') { e.preventDefault(); return; } const instanceId = pieceElement.dataset.instanceId; draggedPiece = availablePieces.find(p => p.instanceId === instanceId); if (!draggedPiece) { console.error(`handleDragStart: Не найдены данные для фигуры ${instanceId}`); e.preventDefault(); return; } draggedPieceElement = pieceElement; isOverBoard = false; const rect = pieceElement.getBoundingClientRect(); dragStartOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top }; e.dataTransfer.setData('text/plain', instanceId); e.dataTransfer.effectAllowed = 'move'; setTimeout(() => { const wrapper = pieceElement.closest('.piece-preview-wrapper'); if (wrapper) wrapper.style.visibility = 'hidden'; dragCloneElement.innerHTML = pieceElement.innerHTML; dragCloneElement.style.width = pieceElement.style.width; dragCloneElement.style.height = pieceElement.style.height; dragCloneElement.style.gridTemplateRows = pieceElement.style.gridTemplateRows; dragCloneElement.style.gridTemplateColumns = pieceElement.style.gridTemplateColumns; dragCloneElement.style.gap = getComputedStyle(pieceElement).gap; dragCloneElement.classList.remove('hidden'); updateDragClonePosition(e.clientX, e.clientY); }, 0); /* hidePieceGhost(); УДАЛЕНО */
    }
    function handleDragOver(e) {
        e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (draggedPiece) { updateDragClonePosition(e.clientX, e.clientY); const boardRect = boardElement.getBoundingClientRect(); const isCurrentlyOver = (e.clientX >= boardRect.left && e.clientX <= boardRect.right && e.clientY >= boardRect.top && e.clientY <= boardRect.bottom); if (isCurrentlyOver && !isOverBoard) isOverBoard = true; else if (!isCurrentlyOver && isOverBoard) isOverBoard = false; /* Логика призрака удалена */ }
    }
    function handleDragEnd(e) {
        /* hidePieceGhost(); УДАЛЕНО */ if (draggedPiece) resetPieceAppearance(draggedPiece.instanceId); else resetPieceAppearance(); isOverBoard = false;
    }
    function handleDrop(e) {
        e.preventDefault(); const currentDraggedInstanceId = draggedPiece?.instanceId; /* hidePieceGhost(); УДАЛЕНО */ if (!draggedPiece || !isOverBoard) { resetPieceAppearance(currentDraggedInstanceId); isOverBoard = false; return; } const { row: targetRow, col: targetCol } = getBoardCoordsFromClientCoords(e.clientX, e.clientY); if (canPlacePiece(draggedPiece, targetRow, targetCol)) { placePiece(draggedPiece, targetRow, targetCol); const pieceIndex = availablePieces.findIndex(p => p.instanceId === currentDraggedInstanceId); if (pieceIndex > -1) { availablePieces.splice(pieceIndex, 1); const wrapperToRemove = piecePoolElement.querySelector(`.piece[data-instance-id="${currentDraggedInstanceId}"]`)?.closest('.piece-preview-wrapper'); if (wrapperToRemove) wrapperToRemove.remove(); } draggedPiece = null; draggedPieceElement = null; dragCloneElement.classList.add('hidden'); checkAndClearLines(); } else { resetPieceAppearance(currentDraggedInstanceId); } isOverBoard = false;
    }
    function updateDragClonePosition(clientX, clientY) { /* ... без изменений ... */
        if (!dragCloneElement.classList.contains('hidden')) { dragCloneElement.style.left = `${clientX - dragStartOffset.x}px`; dragCloneElement.style.top = `${clientY - dragStartOffset.y}px`; }
    }

    // --- Touch Event Handlers (Без изменений, призрак уже удален) ---
    function handleTouchStart(e) {
        const pieceElement = e.target.closest('.piece'); if (!pieceElement || pieceElement.classList.contains('disabled') || isTouching || pieceElement.id === 'drag-clone') return; const touch = e.changedTouches[0]; if (!touch) return; touchIdentifier = touch.identifier; isTouching = true; const instanceId = pieceElement.dataset.instanceId; draggedPiece = availablePieces.find(p => p.instanceId === instanceId); if (!draggedPiece) { console.error(`TouchStart: Не найдены данные для фигуры ${instanceId}`); isTouching = false; return; } draggedPieceElement = pieceElement; const rect = pieceElement.getBoundingClientRect(); dragStartOffset = { x: touch.clientX - rect.left, y: touch.clientY - rect.top }; const wrapper = pieceElement.closest('.piece-preview-wrapper'); if (wrapper) wrapper.style.visibility = 'hidden'; dragCloneElement.innerHTML = pieceElement.innerHTML; dragCloneElement.style.width = pieceElement.style.width; dragCloneElement.style.height = pieceElement.style.height; dragCloneElement.style.gridTemplateRows = pieceElement.style.gridTemplateRows; dragCloneElement.style.gridTemplateColumns = pieceElement.style.gridTemplateColumns; dragCloneElement.style.gap = getComputedStyle(pieceElement).gap; dragCloneElement.classList.remove('hidden'); updateDragClonePosition(touch.clientX, touch.clientY); const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY); isOverBoard = boardElement.contains(elementUnderTouch); /* Логика призрака удалена */ e.preventDefault();
    }
    function handleTouchMove(e) {
        if (!isTouching || !draggedPiece) return; const touch = Array.from(e.changedTouches).find(t => t.identifier === touchIdentifier); if (!touch) return; e.preventDefault(); updateDragClonePosition(touch.clientX, touch.clientY); const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY); const currentIsOverBoard = boardElement.contains(elementUnderTouch); isOverBoard = currentIsOverBoard; /* Логика призрака удалена */
    }
    function handleTouchEnd(e) {
        if (!isTouching || !draggedPiece) return; const touch = Array.from(e.changedTouches).find(t => t.identifier === touchIdentifier); if (!touch) return; const currentDraggedInstanceId = draggedPiece.instanceId; /* hidePieceGhost(); УДАЛЕНО */ let placedSuccessfully = false; const dropX = touch.clientX; const dropY = touch.clientY; const elementUnderTouch = document.elementFromPoint(dropX, dropY); const finalIsOverBoard = isOverBoard || boardElement.contains(elementUnderTouch); if (draggedPiece && finalIsOverBoard) { const { row: targetRow, col: targetCol } = getBoardCoordsFromClientCoords(dropX, dropY); if (canPlacePiece(draggedPiece, targetRow, targetCol)) { placePiece(draggedPiece, targetRow, targetCol); placedSuccessfully = true; const pieceIndex = availablePieces.findIndex(p => p.instanceId === currentDraggedInstanceId); if (pieceIndex > -1) { availablePieces.splice(pieceIndex, 1); const wrapperToRemove = piecePoolElement.querySelector(`.piece[data-instance-id="${currentDraggedInstanceId}"]`)?.closest('.piece-preview-wrapper'); if (wrapperToRemove) wrapperToRemove.remove(); } draggedPiece = null; draggedPieceElement = null; dragCloneElement.classList.add('hidden'); checkAndClearLines(); } } if (!placedSuccessfully) { if(draggedPiece) resetPieceAppearance(currentDraggedInstanceId); else resetPieceAppearance(); } isTouching = false; touchIdentifier = null; /* lastGhostTarget УДАЛЕН */ isOverBoard = false;
    }

    // Вспомогательная функция для получения координат доски из координат окна
    function getBoardCoordsFromClientCoords(clientX, clientY) {
        // Эта функция теперь используется только для drop/touchend, расчет остался тем же
        const boardRect = boardElement.getBoundingClientRect();
        const xRelativeToBoard = clientX - boardRect.left;
        const yRelativeToBoard = clientY - boardRect.top;
        const firstCellOriginX = boardPadding.left;
        const firstCellOriginY = boardPadding.top;
        const xOnGrid = xRelativeToBoard - firstCellOriginX;
        const yOnGrid = yRelativeToBoard - firstCellOriginY;
        // Координаты точки drop относительно сетки, СКОРРЕКТИРОВАННЫЕ на смещение курсора внутри фигуры
        const targetGridX = xOnGrid - dragStartOffset.x;
        const targetGridY = yOnGrid - dragStartOffset.y;
        // Округляем до ближайшей ячейки
        const targetCol = Math.round(targetGridX / boardCellSize.width);
        const targetRow = Math.round(targetGridY / boardCellSize.height);
        return { row: targetRow, col: targetCol };
    }


    // --- Ghost Functions ---
    // ФУНКЦИИ showPieceGhost и hidePieceGhost УДАЛЕНЫ

    // --- Leaderboard Functions ---
    async function fetchLeaderboard() { /* ... без изменений ... */
        try { const response = await fetch(`${API_BASE_URL}/leaderboard/global?limit=${LEADERBOARD_LIMIT}`); if (!response.ok) throw new Error(`Ошибка сервера при загрузке лидеров: ${response.status} ${response.statusText}`); return await response.json(); } catch (error) { console.error("Ошибка загрузки таблицы лидеров:", error); return null; }
    }
    async function displayLeaderboard(data) { /* ... без изменений ... */
        leaderboardListElement.innerHTML = ''; if (!data) { leaderboardListElement.innerHTML = '<p class="leaderboard-error">Не удалось загрузить таблицу лидеров. Попробуйте позже.</p>'; return; } if (data.length === 0) { leaderboardListElement.innerHTML = '<p class="leaderboard-empty">В таблице лидеров пока пусто!</p>'; return; } data.forEach((user, index) => { const entryDiv = document.createElement('div'); entryDiv.classList.add('leaderboard-entry'); let rankDisplay; switch (index) { case 0: rankDisplay = '🥇'; break; case 1: rankDisplay = '🥈'; break; case 2: rankDisplay = '🥉'; break; default: rankDisplay = `${index + 1}.`; } const safeUsername = user.username?.replace(/</g, "<")?.replace(/>/g, ">") || `User ${user.userId?.toString().slice(-4) || '???'}`; entryDiv.innerHTML = `<span class="rank">${rankDisplay}</span><span class="name" title="${safeUsername}">${safeUsername}</span><span class="score">${user.highScore}</span>`; leaderboardListElement.appendChild(entryDiv); });
    }
    async function showLeaderboard() { /* ... без изменений ... */
        leaderboardListElement.innerHTML = '<p class="leaderboard-loading">Загрузка таблицы лидеров...</p>'; leaderboardModal.classList.remove('hidden'); const leaderboardData = await fetchLeaderboard(); displayLeaderboard(leaderboardData);
    }
    function hideLeaderboard() { /* ... без изменений ... */
        leaderboardModal.classList.add('hidden');
    }

    // --- НОВЫЕ: Settings Functions ---
    function showSettings() {
        console.log("Открытие настроек...");
        // Убедимся, что чекбокс отражает текущее состояние isSoundEnabled
        soundToggleCheckbox.checked = isSoundEnabled;
        settingsModal.classList.remove('hidden');
    }

    function hideSettings() {
        settingsModal.classList.add('hidden');
    }


    // --- Запуск игры ---
    initGame();

}); // Конец 'DOMContentLoaded'