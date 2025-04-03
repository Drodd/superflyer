// 游戏配置
const GAME_CONFIG = {
    gameDuration: 60, // 游戏时长(秒)
    pedestrianBaseSpeed: 2, // 行人基础移动速度
    pedestrianSpeedVariation: 1, // 行人速度变化范围(±1)
    spawnInterval: 1500, // 生成行人的基础间隔(毫秒)
    spawnIntervalVariation: 500, // 生成行人的间隔变化范围(±500毫秒)
    maxPedestrians: 6, // 同时存在的最大行人数量
    maxSelfEsteem: 10, // 自尊值上限
    initialSelfEsteem: 10, // 初始自尊值
    hitStayDuration: 1000, // 行人被击中后停留时间(毫秒)
    hitExitSpeed: 6, // 行人被击中后的离开速度
    officerAppearInterval: 15000, // 城管出现的最小间隔(毫秒)
    spawnPoints: 2 // 行人出生点数量
};

// 上次城管出现的时间
let lastOfficerTime = 0;

// 行人出生点数组
let spawnPointsLastTime = [];

// 行人类型
const PEDESTRIAN_TYPES = {
    RED: {
        className: 'pedestrian-red',
        selfEsteemChange: -2,
        scoreChange: 0, // 只有红色传单发给红人才得分
        probability: 0.25, // 出现概率
        label: '红人',
        description: '压力最大的中年打工人',
        imgSrc: 'img/img_walker_middle.png', // 中年人图片路径
        responses: [
            '没空看！',
            '又要加班！',
            '不要烦我！',
            '工资不够花！',
            '房贷车贷啊！'
        ]
    },
    GREEN: {
        className: 'pedestrian-green',
        selfEsteemChange: -1,
        scoreChange: 0, // 只有绿色传单发给绿人才得分
        probability: 0.35, // 出现概率
        label: '绿人',
        description: '刚入社会的年轻打工人',
        imgSrc: ['img/img_walker_young1.png', 'img/img_walker_young2.png'], // 年轻人图片路径（随机选择）
        responses: [
            '谢谢我看看~',
            '这是什么？',
            '好吧拿走了',
            '让我瞧瞧',
            '多谢啦！'
        ]
    },
    BLUE: {
        className: 'pedestrian-blue',
        selfEsteemChange: 3,
        scoreChange: 0, // 只有蓝色传单发给蓝人才得分
        probability: 0.15, // 出现概率
        label: '蓝人',
        description: '看透一切的退休老年人',
        imgSrc: 'img/img_walker_elder.png', // 老年人图片路径
        responses: [
            '年轻人有毅力',
            '坚持就是胜利',
            '我支持你',
            '加油小伙子',
            '不错不错'
        ]
    },
    PURPLE: {
        className: 'pedestrian-purple',
        selfEsteemChange: 1,
        scoreChange: 0,
        probability: 0.25, // 出现概率
        label: '紫人',
        description: '好奇的小孩',
        height: 80, // 特殊高度
        imgSrc: 'img/img_walker_child.png', // 小孩图片路径
        responses: [
            '好漂亮的纸！',
            '我要收藏！',
            '妈妈快看！',
            '这是什么呀？',
            '谢谢哥哥姐姐！'
        ]
    },
    BLACK: {
        className: 'pedestrian-black',
        selfEsteemChange: -10, // 直接清空自尊值
        scoreChange: 0,
        probability: 0, // 特殊生成机制
        label: '黑人',
        description: '执法的城管',
        imgSrc: 'img/img_walker_police.png', // 城管图片路径
        responses: [
            '违规发传单！',
            '执法部门在此！',
            '没有批文！',
            '扰乱市容！',
            '跟我走一趟！'
        ]
    }
};

// 传单类型配置
const FLYER_TYPES = {
    RED: {
        className: 'flyer-red',
        label: '红色传单',
        targetType: 'RED', // 目标行人类型
        imgSrc: 'img/img_paper_red.png'
    },
    GREEN: {
        className: 'flyer-green',
        label: '绿色传单',
        targetType: 'GREEN', // 目标行人类型
        imgSrc: 'img/img_paper_green.png'
    },
    BLUE: {
        className: 'flyer-blue',
        label: '蓝色传单',
        targetType: 'BLUE', // 目标行人类型
        imgSrc: 'img/img_paper_blue.png'
    }
};

// 游戏状态
const gameState = {
    score: 0,
    timeRemaining: GAME_CONFIG.gameDuration,
    selfEsteem: GAME_CONFIG.initialSelfEsteem,
    gameActive: false,
    pedestrians: [],
    flyers: [], // 保留数组，但不再用于传单飞行，而是用于拖拽中的传单
    lastSpawnTime: 0,
    isDraggingFlyer: false, // 新增：是否正在拖拽传单
    draggedFlyer: null, // 新增：当前拖拽的传单对象
    currentFlyerType: 'RED', // 默认选中红色传单
    flyerQueue: [], // 新增：传单队列
    draggedFlyerIndex: -1 // 记录当前拖拽的传单索引
};

// DOM元素
const gameArea = document.getElementById('game-area');
const timerEl = document.getElementById('timer');
const scoreEl = document.getElementById('score');
const selfEsteemFill = document.getElementById('self-esteem-fill');
const gameBackground = document.getElementById('game-background');

// 游戏区域尺寸
let gameWidth, gameHeight;

// 初始化游戏
function initGame() {
    // 更新游戏区域尺寸
    updateGameDimensions();
    
    // 处理背景图片加载错误
    gameBackground.onerror = () => {
        console.error("背景图片加载失败");
        gameBackground.style.display = 'none';
        gameBackground.alt = '背景图片加载失败';
    };
    
    // 重置游戏状态
    gameState.score = 0;
    gameState.timeRemaining = GAME_CONFIG.gameDuration;
    gameState.selfEsteem = GAME_CONFIG.initialSelfEsteem;
    gameState.gameActive = true;
    gameState.pedestrians = [];
    gameState.flyers = [];
    gameState.flyerQueue = []; // 清空传单队列
    lastOfficerTime = 0; // 重置城管出现时间
    
    // 初始化出生点时间记录
    spawnPointsLastTime = Array(GAME_CONFIG.spawnPoints).fill(0);
    
    // 初始化传单队列
    initFlyerQueue();
    
    // 更新UI
    updateScore();
    updateTimer();
    updateSelfEsteem();
    renderFlyerQueue();
    
    // 开始游戏循环
    requestAnimationFrame(gameLoop);
    
    // 设置倒计时
    const timerInterval = setInterval(() => {
        if (gameState.gameActive) {
            gameState.timeRemaining--;
            updateTimer();
            
            if (gameState.timeRemaining <= 0) {
                clearInterval(timerInterval);
                endGame('时间到！');
            }
        } else {
            clearInterval(timerInterval);
        }
    }, 1000);
}

// 更新游戏区域尺寸
function updateGameDimensions() {
    gameWidth = gameArea.clientWidth;
    gameHeight = gameArea.clientHeight;
}

// 游戏主循环
function gameLoop(timestamp) {
    if (!gameState.gameActive) return;
    
    // 检查各个出生点是否应该生成行人
    for (let i = 0; i < spawnPointsLastTime.length; i++) {
        // 计算出生间隔，增加随机性
        const spawnInterval = GAME_CONFIG.spawnInterval + 
            (Math.random() * 2 - 1) * GAME_CONFIG.spawnIntervalVariation;
        
        if (timestamp - spawnPointsLastTime[i] > spawnInterval && 
            gameState.pedestrians.length < GAME_CONFIG.maxPedestrians) {
            
            // 检查是否应该生成城管
            const shouldSpawnOfficer = timestamp - lastOfficerTime > GAME_CONFIG.officerAppearInterval && Math.random() < 0.2;
            
            if (shouldSpawnOfficer) {
                spawnPedestrian(PEDESTRIAN_TYPES.BLACK, i);
                lastOfficerTime = timestamp;
            } else {
                spawnPedestrian(null, i);
            }
            
            spawnPointsLastTime[i] = timestamp;
        }
    }
    
    // 更新行人位置
    updatePedestrians();
    
    // 更新拖拽中的传单位置
    if (gameState.isDraggingFlyer && gameState.draggedFlyer) {
        updateDraggedFlyer();
    }
    
    // 继续游戏循环
    requestAnimationFrame(gameLoop);
}

// 随机选择行人类型
function getRandomPedestrianType() {
    const random = Math.random();
    let cumulativeProbability = 0;
    
    for (const type in PEDESTRIAN_TYPES) {
        // 跳过城管，城管有特殊生成机制
        if (type === 'BLACK') continue;
        
        cumulativeProbability += PEDESTRIAN_TYPES[type].probability;
        if (random <= cumulativeProbability) {
            return PEDESTRIAN_TYPES[type];
        }
    }
    
    // 默认返回绿色行人
    return PEDESTRIAN_TYPES.GREEN;
}

// 生成行人
function spawnPedestrian(forcedType = null, spawnPointIndex = 0) {
    const pedestrianType = forcedType || getRandomPedestrianType();
    
    // 创建行人元素
    const pedestrian = document.createElement('div');
    pedestrian.className = `pedestrian ${pedestrianType.className}`;
    
    // 创建行人图片元素
    const pedestrianImg = document.createElement('img');
    
    // 如果是有多个图片选项的类型（如年轻人），则随机选择一个
    if (Array.isArray(pedestrianType.imgSrc)) {
        const randomIndex = Math.floor(Math.random() * pedestrianType.imgSrc.length);
        pedestrianImg.src = pedestrianType.imgSrc[randomIndex];
    } else {
        pedestrianImg.src = pedestrianType.imgSrc;
    }
    
    // 设置图片样式，不缩放图片
    pedestrianImg.style.width = 'auto';
    pedestrianImg.style.height = 'auto';
    pedestrianImg.style.display = 'block';
    
    // 清除默认行人文本和背景
    pedestrian.innerHTML = '';
    pedestrian.style.backgroundColor = 'transparent';
    pedestrian.style.border = 'none';
    
    // 添加图片到行人元素
    pedestrian.appendChild(pedestrianImg);
    
    // 确定行人的垂直位置
    // 缩小随机高度范围至窗口高度的10%
    const centerY = gameHeight * 0.35; // 垂直中心位置在窗口高度的35%处
    const range = gameHeight * 0.05; // 上下浮动范围为窗口高度的5%（总范围为10%）
    // 向上移动窗口高度的40%
    const topPosition = centerY - range + Math.random() * (range * 2) - gameHeight * 0.4;
    
    // 设置随机移动速度（基础速度±变化范围）
    const randomSpeed = GAME_CONFIG.pedestrianBaseSpeed + 
        (Math.random() * 2 - 1) * GAME_CONFIG.pedestrianSpeedVariation;
    
    // 设置行人位置(从右侧进入)
    pedestrian.style.left = gameWidth + 'px';
    pedestrian.style.top = topPosition + 'px';
    
    // 添加到游戏区域
    gameArea.appendChild(pedestrian);
    
    // 初始宽高（临时，图片加载后会更新）
    const tempWidth = 60;
    const tempHeight = pedestrianType.height || 120;
    
    // 为行人添加一个步行动画计时器
    const walkingOffset = Math.random() * Math.PI * 2; // 随机初始相位，使行人走路不同步
    
    // 添加到行人数组
    const pedestrianObj = {
        element: pedestrian,
        imgElement: pedestrianImg,
        x: gameWidth,
        y: topPosition,
        width: tempWidth,
        height: tempHeight,
        speed: randomSpeed,
        type: pedestrianType,
        spawnPointIndex: spawnPointIndex,
        walkingOffset: walkingOffset, // 步行动画的相位偏移
        initialY: topPosition // 保存初始的Y坐标，作为上下摆动的基准线
    };
    
    gameState.pedestrians.push(pedestrianObj);
    
    // 图片加载完成后，更新实际宽高
    pedestrianImg.onload = function() {
        // 获取图片实际尺寸
        const naturalWidth = this.naturalWidth;
        const naturalHeight = this.naturalHeight;
        
        // 更新行人对象的宽高属性
        const index = gameState.pedestrians.findIndex(p => p.element === pedestrian);
        if (index !== -1) {
            gameState.pedestrians[index].width = naturalWidth;
            gameState.pedestrians[index].height = naturalHeight;
        }
    };
}

// 更新行人位置
function updatePedestrians() {
    const currentTime = Date.now();
    
    for (let i = gameState.pedestrians.length - 1; i >= 0; i--) {
        const pedestrian = gameState.pedestrians[i];
        
        // 如果行人被击中但还在停留时间内
        if (pedestrian.isHit && currentTime - pedestrian.hitTime < GAME_CONFIG.hitStayDuration) {
            // 保持不动
            continue;
        }
        
        // 如果是被击中的城管，则不移动（停留在原地直到游戏结束）
        if (pedestrian.isHit && pedestrian.type === PEDESTRIAN_TYPES.BLACK) {
            continue;
        }
        
        // 如果行人被击中且停留时间已过，加速离开
        if (pedestrian.isHit) {
            pedestrian.speed = GAME_CONFIG.hitExitSpeed;
            
            // 如果对话气泡存在且不是需要保留的，移除它
            if (pedestrian.responseBubble && gameArea.contains(pedestrian.responseBubble) && !pedestrian.keepBubble) {
                gameArea.removeChild(pedestrian.responseBubble);
                pedestrian.responseBubble = null;
            }
        }
        
        // 移动行人
        pedestrian.x -= pedestrian.speed;
        
        // 模拟行走的上下位移动画
        if (!pedestrian.isHit) {
            // 通过正弦波生成上下摆动的效果，振幅2像素，频率与行走速度相关
            const walkCycle = Math.sin((currentTime * 0.01 * pedestrian.speed) + pedestrian.walkingOffset);
            const verticalOffset = walkCycle * 3; // 上下振幅3像素
            
            // 计算新的Y位置（基准线Y坐标 + 上下振幅）
            pedestrian.y = pedestrian.initialY + verticalOffset;
            
            // 更新元素位置
            pedestrian.element.style.top = pedestrian.y + 'px';
        }
        
        // 更新X位置
        pedestrian.element.style.left = pedestrian.x + 'px';
        
        // 同步移动保留的对话气泡位置（城管的气泡）
        if (pedestrian.keepBubble && pedestrian.responseBubble) {
            // 更新气泡的水平位置
            pedestrian.responseBubble.style.left = (pedestrian.x + pedestrian.width/2) + 'px';
            
            // 找到气泡内部的三角形元素
            const bubbleDiv = pedestrian.responseBubble.querySelector('div'); // 主气泡div
            const triangleOuter = bubbleDiv.querySelector('div:nth-child(1)'); // 外三角形
            const triangleInner = bubbleDiv.querySelector('div:nth-child(2)'); // 内三角形
            
            // 获取气泡高度
            const bubbleHeight = bubbleDiv.offsetHeight + 10; // 加上三角形高度
            
            // 检查三角形当前是在顶部还是底部
            if (triangleOuter.style.bottom === 'auto') {
                // 三角形在顶部，气泡在下方
                pedestrian.responseBubble.style.top = (pedestrian.y + pedestrian.height) + 'px';
            } else {
                // 三角形在底部，气泡在上方
                // 计算行人中点位置
                const pedestrianMiddle = pedestrian.y + (pedestrian.height * 0.5);
                // 将气泡放置在行人中点上方，使气泡底部（带三角形的部分）与中点对齐
                const bubbleTop = pedestrianMiddle - bubbleHeight;
                pedestrian.responseBubble.style.top = bubbleTop + 'px';
            }
        }
        
        // 如果行人离开屏幕，移除它
        if (pedestrian.x < -pedestrian.width) {
            if (pedestrian.responseBubble && gameArea.contains(pedestrian.responseBubble)) {
                gameArea.removeChild(pedestrian.responseBubble);
            }
            gameArea.removeChild(pedestrian.element);
            gameState.pedestrians.splice(i, 1);
        }
    }
}

// 初始化传单队列，添加3张随机传单
function initFlyerQueue() {
    // 清空队列
    gameState.flyerQueue = [];
    
    // 添加3张随机传单
    for (let i = 0; i < 3; i++) {
        addRandomFlyerToQueue();
    }
}

// 向队列添加一张随机传单
function addRandomFlyerToQueue() {
    // 获取FLYER_TYPES的所有键
    const flyerTypes = Object.keys(FLYER_TYPES);
    
    // 随机选择一种传单类型
    const randomType = flyerTypes[Math.floor(Math.random() * flyerTypes.length)];
    
    // 将随机传单添加到队列
    gameState.flyerQueue.push(randomType);
}

// 从队列中移除第一张传单并添加一张新的随机传单
// 注意：此函数已不再使用，因为现在可以从任意位置移除传单
// 而是使用 gameState.flyerQueue.splice() 和 addRandomFlyerToQueue() 组合来实现
function shiftFlyerQueue() {
    // 移除第一张传单
    gameState.flyerQueue.shift();
    
    // 添加一张新的随机传单
    addRandomFlyerToQueue();
    
    // 更新传单队列显示
    renderFlyerQueue();
}

// 渲染传单队列
function renderFlyerQueue() {
    // 先删除旧的传单队列UI
    const oldQueue = document.getElementById('flyer-queue');
    if (oldQueue) {
        oldQueue.remove();
    }
    
    // 创建新的传单队列容器
    const queueContainer = document.createElement('div');
    queueContainer.id = 'flyer-queue';
    
    // 为队列中的每张传单创建一个UI元素
    gameState.flyerQueue.forEach((flyerType, index) => {
        const flyerElement = document.createElement('div');
        flyerElement.className = `queue-flyer`;
        flyerElement.dataset.index = index; // 存储索引，方便后续识别
        
        // 创建传单图片元素
        const flyerImg = document.createElement('img');
        flyerImg.src = FLYER_TYPES[flyerType].imgSrc;
        flyerImg.alt = FLYER_TYPES[flyerType].label;
        
        // 添加图片到传单元素
        flyerElement.appendChild(flyerImg);
        
        // 所有传单都添加拖拽事件
        flyerElement.addEventListener('mousedown', startDragQueueFlyer);
        flyerElement.addEventListener('touchstart', startDragQueueFlyer);
        
        queueContainer.appendChild(flyerElement);
    });
    
    // 将队列添加到游戏区域
    gameArea.appendChild(queueContainer);
}

// 开始拖拽队列中的传单
function startDragQueueFlyer(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!gameState.gameActive) return;
    if (gameState.isDraggingFlyer) return; // 防止重复创建
    
    // 获取被点击传单的索引
    const flyerIndex = parseInt(e.currentTarget.dataset.index);
    if (isNaN(flyerIndex) || flyerIndex < 0 || flyerIndex >= gameState.flyerQueue.length) return;
    
    gameState.isDraggingFlyer = true;
    gameState.draggedFlyerIndex = flyerIndex;
    
    // 获取事件坐标
    let clientX, clientY;
    if (e.type === 'touchstart') {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    // 获取游戏区域位置
    const gameAreaRect = gameArea.getBoundingClientRect();
    
    // 获取队列中的传单类型
    const flyerType = gameState.flyerQueue[flyerIndex];
    gameState.currentFlyerType = flyerType;
    
    // 创建可拖拽的传单，位置在点击位置
    const x = clientX - gameAreaRect.left;
    const y = clientY - gameAreaRect.top;
    
    createDraggableFlyer(x, y);
    
    // 隐藏被拖拽的传单元素
    e.currentTarget.style.visibility = 'hidden';
}

// 替换发射传单的函数，改为创建可拖拽的传单
function createDraggableFlyer(x, y) {
    // 获取当前选中的传单类型
    const flyerType = FLYER_TYPES[gameState.currentFlyerType];
    
    // 创建传单元素
    const flyer = document.createElement('div');
    flyer.className = 'flyer flyer-dragging';
    
    // 创建传单图片元素
    const flyerImg = document.createElement('img');
    flyerImg.src = flyerType.imgSrc;
    flyerImg.alt = flyerType.label;
    
    // 添加图片到传单元素
    flyer.appendChild(flyerImg);
    
    // 设置传单初始位置
    flyer.style.left = x + 'px';
    flyer.style.top = y + 'px';
    
    // 图片加载完成后设置拖拽传单的大小和位置
    flyerImg.onload = function() {
        const imgWidth = this.naturalWidth;
        const imgHeight = this.naturalHeight;
        
        // 更新传单对象的宽高属性
        if (gameState.draggedFlyer) {
            gameState.draggedFlyer.width = imgWidth;
            gameState.draggedFlyer.height = imgHeight;
            
            // 调整位置，使鼠标/手指位于传单中心
            gameState.draggedFlyer.x = x - imgWidth / 2;
            gameState.draggedFlyer.y = y - imgHeight / 2;
            
            // 更新传单位置
            updateDraggedFlyer();
        }
    };
    
    // 添加到游戏区域
    gameArea.appendChild(flyer);
    
    // 创建传单对象并保存
    gameState.draggedFlyer = {
        element: flyer,
        x: x,
        y: y,
        width: 60, // 默认宽度，图片加载后会更新
        height: 90, // 默认高度，图片加载后会更新
        type: flyerType
    };
    
    return flyer;
}

// 更新拖拽中传单的位置
function updateDraggedFlyer() {
    if (!gameState.draggedFlyer) return;
    
    // 传单位置已通过mousemove/touchmove事件更新
    gameState.draggedFlyer.element.style.left = gameState.draggedFlyer.x + 'px';
    gameState.draggedFlyer.element.style.top = gameState.draggedFlyer.y + 'px';
}

// 鼠标/触摸移动时更新传单位置
document.addEventListener('mousemove', moveDraggedFlyer);
document.addEventListener('touchmove', moveDraggedFlyer);

// 鼠标/触摸释放时尝试放置传单
document.addEventListener('mouseup', endDragFlyer);
document.addEventListener('touchend', endDragFlyer);

// 拖拽传单时更新位置
function moveDraggedFlyer(e) {
    if (!gameState.gameActive || !gameState.isDraggingFlyer || !gameState.draggedFlyer) return;
    
    e.preventDefault();
    
    // 获取事件坐标
    let clientX, clientY;
    if (e.type === 'touchmove') {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    // 获取游戏区域位置
    const gameAreaRect = gameArea.getBoundingClientRect();
    
    // 更新传单位置
    const x = clientX - gameAreaRect.left;
    const y = clientY - gameAreaRect.top;
    
    gameState.draggedFlyer.x = x - gameState.draggedFlyer.width / 2;
    gameState.draggedFlyer.y = y - gameState.draggedFlyer.height / 2;
}

// 结束拖拽，尝试放置传单
function endDragFlyer(e) {
    if (!gameState.gameActive || !gameState.isDraggingFlyer || !gameState.draggedFlyer) return;
    
    e.preventDefault();
    
    // 检查是否碰撞到行人
    const isCollided = checkFlyerDropCollision();
    
    // 如果没有碰撞到行人，恢复传单队列中的传单显示
    if (!isCollided) {
        const queueFlyers = document.querySelectorAll('.queue-flyer');
        if (queueFlyers && queueFlyers[gameState.draggedFlyerIndex]) {
            queueFlyers[gameState.draggedFlyerIndex].style.visibility = 'visible';
        }
    } else {
        // 如果碰撞到了行人，更新传单队列，移除已用的传单
        gameState.flyerQueue.splice(gameState.draggedFlyerIndex, 1);
        // 补充一张新的随机传单
        addRandomFlyerToQueue();
        // 重新渲染传单队列
        renderFlyerQueue();
    }
    
    // 清除拖拽状态
    gameState.draggedFlyerIndex = -1;
}

// 检查传单是否与行人碰撞并处理结果
function checkFlyerDropCollision() {
    if (!gameState.draggedFlyer) return false;
    
    const flyer = gameState.draggedFlyer;
    let collided = false;
    
    for (let j = gameState.pedestrians.length - 1; j >= 0; j--) {
        const pedestrian = gameState.pedestrians[j];
        
        // 如果行人已被击中，跳过碰撞检测
        if (pedestrian.isHit) continue;
        
        // 简单的矩形碰撞检测
        if (flyer.x < pedestrian.x + pedestrian.width &&
            flyer.x + flyer.width > pedestrian.x &&
            flyer.y < pedestrian.y + pedestrian.height &&
            flyer.y + flyer.height > pedestrian.y) {
            
            // 获取基础得分和自尊值变化
            let scoreChange = 0;
            const selfEsteemChange = pedestrian.type.selfEsteemChange;
            
            // 找出行人类型对应的键名
            let pedestrianTypeKey = '';
            for (const key in PEDESTRIAN_TYPES) {
                if (PEDESTRIAN_TYPES[key] === pedestrian.type) {
                    pedestrianTypeKey = key;
                    break;
                }
            }
            
            // 检查传单类型是否匹配行人类型
            if (flyer.type.targetType === pedestrianTypeKey) {
                // 如果匹配，得1分
                scoreChange = 1;
                
                // 播放金币特效
                showCoinAnimation(flyer.x + flyer.width / 2, flyer.y, scoreChange);
            }
            
            // 更新分数
            gameState.score += scoreChange;
            updateScore();
            
            // 添加命中效果
            pedestrian.element.style.opacity = '0.8';
            
            // 标记行人为已击中，停止移动
            pedestrian.isHit = true;
            pedestrian.hitTime = Date.now();
            
            // 显示行人回应
            showPedestrianResponse(pedestrian);
            
            // 显示效果提示
            showImpactEffect(pedestrian, scoreChange, selfEsteemChange);
            
            // 特殊行人处理：城管
            if (pedestrian.type === PEDESTRIAN_TYPES.BLACK) {
                // 添加红色光晕效果而非修改边框（因为现在是图片）
                pedestrian.element.style.filter = 'drop-shadow(0 0 8px rgba(255, 0, 0, 0.8))';
                
                // 标记这个是城管，不会移除对话气泡
                pedestrian.keepBubble = true;
                
                // 城管被击中，游戏结束
                setTimeout(() => {
                    endGame('被城管抓到了！');
                }, 1500); // 给玩家时间看到城管的回应
            } else {
                // 更新自尊值
                changeSelfEsteem(selfEsteemChange);
            }
            
            collided = true;
            break;
        }
    }
    
    // 无论是否碰撞，都移除拖拽的传单
    gameArea.removeChild(flyer.element);
    gameState.draggedFlyer = null;
    gameState.isDraggingFlyer = false;
    
    return collided;
}

// 显示金币动画特效
function showCoinAnimation(x, y, scoreChange) {
    // 创建多个金币元素
    const coinCount = scoreChange > 0 ? 5 : 0;
    
    // 如果没有得分，就不显示金币
    if (coinCount === 0) return;
    
    // 创建得分文本
    const scoreText = document.createElement('div');
    scoreText.className = 'score-text';
    scoreText.textContent = `+${scoreChange}`;
    scoreText.style.left = `${x}px`;
    scoreText.style.top = `${y - 30}px`;
    gameArea.appendChild(scoreText);
    
    // 自动移除得分文本
    setTimeout(() => {
        if (gameArea.contains(scoreText)) {
            gameArea.removeChild(scoreText);
        }
    }, 1200);
    
    // 创建金币元素
    for (let i = 0; i < coinCount; i++) {
        const coin = document.createElement('div');
        coin.className = 'coin-animation';
        
        // 随机位置偏移
        const offsetX = Math.random() * 60 - 30;
        const offsetY = Math.random() * 20 - 10;
        
        coin.style.left = `${x + offsetX}px`;
        coin.style.top = `${y + offsetY}px`;
        
        // 随机动画延迟
        const delay = Math.random() * 0.3;
        coin.style.animationDelay = `${delay}s`;
        
        gameArea.appendChild(coin);
        
        // 自动移除金币元素
        setTimeout(() => {
            if (gameArea.contains(coin)) {
                gameArea.removeChild(coin);
            }
        }, 1000 + delay * 1000);
    }
}

// 显示行人回应
function showPedestrianResponse(pedestrian) {
    // 随机选择一个回应
    const responses = pedestrian.type.responses;
    const response = responses[Math.floor(Math.random() * responses.length)];
    
    // 创建对话气泡容器
    const bubbleContainer = document.createElement('div');
    bubbleContainer.style.position = 'absolute';
    bubbleContainer.style.left = (pedestrian.x + pedestrian.width/2) + 'px';
    bubbleContainer.style.top = (pedestrian.y) + 'px'; // 先定位在行人顶部
    bubbleContainer.style.zIndex = '100';
    bubbleContainer.style.pointerEvents = 'none';
    bubbleContainer.style.transform = 'translateX(-50%)'; // 水平居中
    
    // 创建主气泡
    const bubble = document.createElement('div');
    bubble.style.backgroundColor = 'white';
    bubble.style.border = '2px solid #333';
    bubble.style.borderRadius = '15px';
    bubble.style.padding = '8px 12px';
    bubble.style.fontSize = '15px';
    bubble.style.fontWeight = 'bold';
    bubble.style.textAlign = 'center'; // 文字居中
    bubble.style.maxWidth = '150px'; // 设置最大宽度
    bubble.style.minWidth = '80px'; // 设置最小宽度
    bubble.style.wordWrap = 'break-word'; // 允许单词换行
    bubble.style.whiteSpace = 'normal'; // 允许文字换行
    bubble.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
    bubble.style.position = 'relative'; // 设置为相对定位，便于三角形定位
    bubble.style.lineHeight = '1.4'; // 增加行高
    bubble.style.transition = 'all 0.2s ease'; // 添加过渡效果
    bubble.textContent = response;
    
    // 创建更精美的三角形
    const triangleContainer = document.createElement('div');
    triangleContainer.style.position = 'absolute';
    triangleContainer.style.left = '50%';
    triangleContainer.style.transform = 'translateX(-50%)';
    triangleContainer.style.bottom = '-12px'; // 放在气泡底部，指向下方
    triangleContainer.style.width = '24px';
    triangleContainer.style.height = '12px';
    triangleContainer.style.overflow = 'hidden';
    triangleContainer.style.zIndex = '-1';
    
    const triangle = document.createElement('div');
    triangle.style.position = 'absolute';
    triangle.style.width = '15px';
    triangle.style.height = '15px';
    triangle.style.backgroundColor = 'white';
    triangle.style.border = '2px solid #333';
    triangle.style.borderRadius = '2px';
    triangle.style.top = '-10px';
    triangle.style.left = '50%';
    triangle.style.transform = 'translateX(-50%) rotate(45deg)';
    triangle.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
    
    // 组合气泡
    triangleContainer.appendChild(triangle);
    bubble.appendChild(triangleContainer);
    bubbleContainer.appendChild(bubble);
    
    // 添加到游戏区域(先隐藏)
    bubbleContainer.style.visibility = 'hidden';
    gameArea.appendChild(bubbleContainer);
    
    // 计算并调整气泡位置
    setTimeout(() => {
        // 获取行人中点位置
        const bubbleHeight = bubble.offsetHeight + 12; // 加上三角形高度
        
        // 根据行人类型设置不同的垂直位置
        let verticalPosition;
        
        // 紫人（小孩）在行人图片高度的50%位置
        if (pedestrian.type === PEDESTRIAN_TYPES.PURPLE) {
            verticalPosition = 0.5;
        } else {
            // 其他类型行人在行人图片高度的10%位置
            verticalPosition = 0.2;
        }
        
        // 计算行人高度位置
        const pedestrianPosition = pedestrian.y + (pedestrian.height * verticalPosition);
        
        // 将气泡放置在行人指定位置上方，使气泡底部（带三角形的部分）与该位置对齐
        const bubbleTop = pedestrianPosition - bubbleHeight;
        
        // 设置气泡位置
        bubbleContainer.style.top = bubbleTop + 'px';
        
        // 获取游戏区域边界
        const gameAreaRect = gameArea.getBoundingClientRect();
        
        // 确保左右不超出边界
        const containerRect = bubbleContainer.getBoundingClientRect();
        if (containerRect.left < gameAreaRect.left) {
            const offset = gameAreaRect.left - containerRect.left + 10;
            bubbleContainer.style.left = `${parseFloat(bubbleContainer.style.left) + offset}px`;
            
            // 调整三角形位置
            triangleContainer.style.left = `calc(50% - ${offset}px)`;
        } else if (containerRect.right > gameAreaRect.right) {
            const offset = containerRect.right - gameAreaRect.right + 10;
            bubbleContainer.style.left = `${parseFloat(bubbleContainer.style.left) - offset}px`;
            
            // 调整三角形位置
            triangleContainer.style.left = `calc(50% + ${offset}px)`;
        }
        
        // 确保顶部不超出游戏区域
        if (bubbleTop < 0) {
            // 如果顶部超出，将气泡放在行人下方
            bubbleContainer.style.top = (pedestrian.y + pedestrian.height) + 'px';
            
            // 调整三角形到气泡顶部，朝上
            triangleContainer.style.bottom = 'auto';
            triangleContainer.style.top = '-12px';
            
            // 重新调整三角形旋转角度
            triangle.style.top = '7px';
            triangle.style.transform = 'translateX(-50%) rotate(225deg)';
        }
        
        // 显示气泡
        bubbleContainer.style.visibility = 'visible';
        
        // 添加淡入效果
        bubble.style.opacity = '0';
        bubble.style.transform = 'scale(0.8)';
        
        setTimeout(() => {
            bubble.style.opacity = '1';
            bubble.style.transform = 'scale(1)';
        }, 10);
    }, 10);
    
    // 根据行人类型设置气泡颜色
    let bubbleColor, borderColor, textColor;
    
    if (pedestrian.type === PEDESTRIAN_TYPES.RED) {
        bubbleColor = '#fff0f0';
        borderColor = '#ff5252';
        textColor = '#cc0000';
    } else if (pedestrian.type === PEDESTRIAN_TYPES.GREEN) {
        bubbleColor = '#f0fff0';
        borderColor = '#4caf50';
        textColor = '#2e7d32';
    } else if (pedestrian.type === PEDESTRIAN_TYPES.BLUE) {
        bubbleColor = '#f0f8ff';
        borderColor = '#2196f3';
        textColor = '#0d47a1';
    } else if (pedestrian.type === PEDESTRIAN_TYPES.PURPLE) {
        bubbleColor = '#f9f0ff';
        borderColor = '#9c27b0';
        textColor = '#6a1b9a';
    } else if (pedestrian.type === PEDESTRIAN_TYPES.BLACK) {
        bubbleColor = '#333';
        borderColor = '#000';
        textColor = 'white';
    }
    
    bubble.style.backgroundColor = bubbleColor;
    bubble.style.borderColor = borderColor;
    bubble.style.color = textColor;
    triangle.style.backgroundColor = bubbleColor;
    triangle.style.borderColor = borderColor;
    
    // 保存对话气泡引用
    pedestrian.responseBubble = bubbleContainer;
}

// 显示命中效果
function showImpactEffect(pedestrian, scoreChange, selfEsteemChange) {
    const impact = document.createElement('div');
    impact.style.position = 'absolute';
    impact.style.left = (pedestrian.x + pedestrian.width/2) + 'px';
    impact.style.top = pedestrian.y + 'px';
    impact.style.color = 'white';
    impact.style.fontWeight = 'bold';
    impact.style.fontSize = '20px';
    impact.style.textShadow = '1px 1px 2px rgba(0, 0, 0, 0.8)';
    impact.style.pointerEvents = 'none';
    impact.style.zIndex = '1000';
    impact.style.transform = 'translateX(-50%)'; // 居中显示
    
    // 设置文本内容
    let text = '';
    if (scoreChange > 0) {
        text += `+${scoreChange}分 `;
    }
    if (selfEsteemChange > 0) {
        text += `自尊+${selfEsteemChange}`;
        impact.style.color = '#00ff00';
    } else if (selfEsteemChange < 0) {
        text += `自尊${selfEsteemChange}`;
        impact.style.color = '#ff5555';
    }
    
    impact.textContent = text;
    
    // 添加到游戏区域
    gameArea.appendChild(impact);
    
    // 添加动画效果
    let opacity = 1;
    let posY = pedestrian.y;
    
    const animateImpact = () => {
        opacity -= 0.02;
        posY -= 1;
        
        impact.style.opacity = opacity;
        impact.style.top = posY + 'px';
        
        if (opacity > 0) {
            requestAnimationFrame(animateImpact);
        } else {
            gameArea.removeChild(impact);
        }
    };
    
    requestAnimationFrame(animateImpact);
}

// 窗口大小改变时更新游戏尺寸和元素位置
window.addEventListener('resize', () => {
    updateGameDimensions();
    
    // 重新调整所有行人的垂直位置以适应新的窗口大小
    const centerY = gameHeight * 0.35;
    const range = gameHeight * 0.05;
    const offset40Percent = gameHeight * 0.4; // 40%窗口高度的偏移
    
    gameState.pedestrians.forEach(pedestrian => {
        // 计算当前位置相对于初始位置的偏移（用于保持行走动画的连续性）
        const currentOffset = pedestrian.y - pedestrian.initialY;
        
        // 重新计算行人的初始Y坐标
        const relativePosition = (pedestrian.initialY + offset40Percent - (centerY - range)) / (range * 2);
        const newCenterY = gameHeight * 0.35;
        const newRange = gameHeight * 0.05;
        const newOffset40Percent = gameHeight * 0.4;
        const newInitialY = (newCenterY - newRange) + relativePosition * (newRange * 2) - newOffset40Percent;
        
        // 更新行人的基准线Y坐标和当前Y坐标
        pedestrian.initialY = newInitialY;
        pedestrian.y = newInitialY + currentOffset;
        
        // 更新元素位置
        pedestrian.element.style.top = pedestrian.y + 'px';
    });
});

// 修改游戏区域点击事件处理（只用于重新开始游戏）
gameArea.addEventListener('click', (e) => {
    if (!gameState.gameActive) {
        // 如果游戏未激活，重新开始游戏
        const gameOverMsg = gameArea.querySelector('div[style*="translate(-50%, -50%)"]');
        if (gameOverMsg) {
            gameArea.removeChild(gameOverMsg);
        }
        initGame();
    }
});

// 更新分数显示
function updateScore() {
    scoreEl.textContent = gameState.score;
}

// 更新计时器显示
function updateTimer() {
    timerEl.textContent = gameState.timeRemaining;
}

// 更改自尊值
function changeSelfEsteem(value) {
    gameState.selfEsteem = Math.max(0, Math.min(GAME_CONFIG.maxSelfEsteem, gameState.selfEsteem + value));
    updateSelfEsteem();
    
    // 检查自尊值是否为0
    if (gameState.selfEsteem <= 0) {
        endGame('自尊值归零！');
    }
}

// 更新自尊值显示
function updateSelfEsteem() {
    const percentage = (gameState.selfEsteem / GAME_CONFIG.maxSelfEsteem) * 100;
    selfEsteemFill.style.width = `${percentage}%`;
    
    // 根据自尊值改变颜色
    if (percentage > 60) {
        selfEsteemFill.style.backgroundColor = '#4CAF50'; // 绿色
    } else if (percentage > 30) {
        selfEsteemFill.style.backgroundColor = '#FFC107'; // 黄色
    } else {
        selfEsteemFill.style.backgroundColor = '#F44336'; // 红色
    }
}

// 结束游戏
function endGame(reason) {
    gameState.gameActive = false;
    
    // 显示游戏结束信息
    const gameOverMsg = document.createElement('div');
    gameOverMsg.style.position = 'absolute';
    gameOverMsg.style.top = '50%';
    gameOverMsg.style.left = '50%';
    gameOverMsg.style.transform = 'translate(-50%, -50%)';
    gameOverMsg.style.fontSize = '32px';
    gameOverMsg.style.fontWeight = 'bold';
    gameOverMsg.style.padding = '20px';
    gameOverMsg.style.backgroundColor = 'rgba(255,255,255,0.9)';
    gameOverMsg.style.borderRadius = '10px';
    gameOverMsg.style.textAlign = 'center';
    gameOverMsg.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
    gameOverMsg.style.zIndex = '1000';
    
    gameOverMsg.innerHTML = `游戏结束: ${reason}<br>得分: ${gameState.score}<br>最终自尊值: ${gameState.selfEsteem}<br><br>点击屏幕重新开始`;
    
    gameArea.appendChild(gameOverMsg);
    
    // 清除所有行人和传单
    gameState.pedestrians.forEach(p => {
        if (p.responseBubble && gameArea.contains(p.responseBubble)) {
            gameArea.removeChild(p.responseBubble);
        }
        gameArea.removeChild(p.element);
    });
    gameState.flyers.forEach(f => {
        gameArea.removeChild(f.element);
    });
    gameState.pedestrians = [];
    gameState.flyers = [];
}

// 在DOMContentLoaded事件中初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    initGame();
}); 