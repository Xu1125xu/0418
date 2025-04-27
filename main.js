document.addEventListener('DOMContentLoaded', function() {
    console.log('全畫面波浪動畫已載入！');
    
    // 建立 canvas 元素並插入 body
    let canvas = document.getElementById('waveCanvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'waveCanvas';
        document.body.appendChild(canvas);
    }

    const ctx = canvas.getContext('2d');
    
    // 設定基本參數，使用隨機值
    const verticalCenter = window.innerHeight * (0.3 + Math.random() * 0.4); // 隨機位置在畫面30%-70%之間
    const baseAmplitude = (97.5 + Math.random() * 39); // 增加 30%（從 75-105 增加到 97.5-136.5）
    
    // 波形參數 - 使用隨機值初始化
    const waveParams = {
        frequency: (0.0013 + Math.random() * 0.00195), // 增加 30%
        phase: Math.random() * Math.PI * 2, // 隨機相位
        speed: 0.01 + Math.random() * 0.02, // 隨機速度
        horizontalSpeed: 1 + Math.random() * 0.5, // 水平移動速度 (每幀移動的像素數)
        floatSpeed: 0.0008 + Math.random() * 0.0004, // 飄浮速度
        floatAmplitude: 30 + Math.random() * 20 // 飄浮幅度
    };
    
    // WebSocket 整合：接收來自 Node.js 的數值，動態調整圓圈閃爍速度
    let ws;
    let arduinoValue = 512; // 初始值
    // 控制圓圈閃爍速度的變數
    let circleFlickerSpeed = 2;

    function setupWebSocket() {
        ws = new WebSocket('ws://localhost:8080');
        ws.onmessage = function(event) {
            const val = parseInt(event.data);
            if (!isNaN(val)) {
                arduinoValue = val;
                // 只用可變電阻控制圓圈閃爍速度，範圍 0.5~15
                circleFlickerSpeed = 0.5 + (val / 1023) * 14.5;
                // 顯示 debug 資訊
                if (document.getElementById('debugInfo')) {
                  document.getElementById('debugInfo').textContent = `Pot: ${arduinoValue}  Flicker: ${circleFlickerSpeed.toFixed(2)}`;
                }
            }
        };
        ws.onopen = function() { console.log('WebSocket connected'); };
        ws.onclose = function() { console.log('WebSocket closed'); };
    }
    setupWebSocket();

    // 在畫面左上角顯示 debug 資訊
    if (!document.getElementById('debugInfo')) {
        const info = document.createElement('div');
        info.id = 'debugInfo';
        info.style.position = 'fixed';
        info.style.left = '12px';
        info.style.top = '12px';
        info.style.background = 'rgba(255,255,255,0.8)';
        info.style.color = '#222';
        info.style.fontSize = '18px';
        info.style.zIndex = 9999;
        info.style.padding = '4px 12px';
        info.style.borderRadius = '8px';
        info.textContent = 'Pot: ---  Flicker: ---';
        document.body.appendChild(info);
    }

    // 用於創建自然變化的多個波
    const subWaves = [
        { 
            frequency: waveParams.frequency * (0.325 + Math.random() * 0.13), // 增加 30%
            amplitude: baseAmplitude * 0.195, // 增加 30%
            speed: waveParams.speed * 0.7,
            phase: Math.random() * Math.PI * 2
        },
        { 
            frequency: waveParams.frequency * (0.975 + Math.random() * 0.195), // 增加 30%
            amplitude: baseAmplitude * 0.0975, // 增加 30%
            speed: waveParams.speed * 1.3,
            phase: Math.random() * Math.PI * 2
        }
    ];
    
    // 時間變數
    let time = Math.random() * 100; // 隨機的起始時間
    
    // 水平偏移量 - 用於實現右至左的移動
    let horizontalOffset = 0;
    
    // 儲存前一幀的波形，用於高比例平滑過渡
    let previousWavePoints = [];
    
    // 延伸參數 - 讓線條延伸到畫面外
    const extensionFactor = 0.3; // 每側延伸畫面寬度的30%

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        // 重設前一幀波形
        previousWavePoints = Array(Math.ceil(canvas.width * (1 + extensionFactor * 2))).fill(verticalCenter);
    }

    // 使用平滑曲線繪製波浪
    function drawSmoothWave(points) {
        if (points.length < 2) return;
        
        const startX = -canvas.width * extensionFactor;
        
        ctx.beginPath();
        ctx.moveTo(startX, points[0]);
        
        // 使用平滑的曲線連接點
        for (let i = 1; i < points.length; i++) {
            const x = startX + i;
            ctx.lineTo(x, points[i]);
        }
        
        ctx.stroke();
    }
    
    // 自然平滑波形函數 - 加入水平偏移
    function generateWavePoint(x, time, offset) {
        // 添加水平偏移，實現右至左移動
        const adjustedX = x + offset;
        
        // 主波
        let value = Math.sin(adjustedX * waveParams.frequency + time * waveParams.speed + waveParams.phase) * baseAmplitude;
        
        // 添加子波，創造更自然的波形
        for (const wave of subWaves) {
            value += Math.sin(adjustedX * wave.frequency + time * wave.speed + wave.phase) * wave.amplitude;
        }
        
        return value;
    }

    // 新增：閃爍小圓圈參數
    const circleCount = 28; // 再多加一些小圓圈
    const circles = Array.from({length: circleCount}).map(() => ({
        theta: Math.random() * Math.PI * 2, // 角度位置
        phase: Math.random() * Math.PI * 2, // 閃爍相位
        color: `hsl(${Math.floor(Math.random()*360)},80%,60%)`
    }));

    function drawWave() {
        // 用 waveParams.speed 控制波浪線動畫速度
        time += waveParams.speed;
        horizontalOffset += waveParams.horizontalSpeed;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const baseRadius = Math.min(canvas.width, canvas.height) * 0.28;
        const lineCount = 15;
        for (let l = 0; l < lineCount; l++) {
            let alpha = 0.18 + 0.08 * (1 - Math.abs(l - (lineCount-1)/2)/(lineCount/2));
            let freqFactor = 1 + (l - (lineCount-1)/2) * 0.07;
            let phaseOffset = l * Math.PI / 8 + time * 0.2 * l;
            let radiusOffset = (l - (lineCount-1)/2) * 16;
            let points = [];
            const segments = 360;
            for (let i = 0; i <= segments; i++) {
                let theta = (i / segments) * Math.PI * 2;
                let wave = Math.sin(theta * 6 * freqFactor + time * waveParams.speed * freqFactor + phaseOffset) * (baseAmplitude * 0.7)
                    + Math.sin(theta * 13 * freqFactor + time * waveParams.speed * 1.7 + phaseOffset) * (baseAmplitude * 0.2);
                let r = baseRadius + radiusOffset + wave;
                let x = cx + Math.cos(theta) * r;
                let y = cy + Math.sin(theta) * r;
                points.push([x, y]);
            }
            ctx.save();
            ctx.strokeStyle = `rgba(100, 180, 255, ${alpha})`;
            ctx.lineWidth = l === Math.floor(lineCount/2) ? 2 : 1;
            ctx.beginPath();
            let first = true;
            for (let i = 0; i < points.length; i++) {
                let [x, y] = points[i];
                if (i > 0 && Math.abs(x - points[i-1][0]) > canvas.width/2) {
                    ctx.moveTo(x, y);
                } else {
                    if (first) { ctx.moveTo(x, y); first = false; }
                    else ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
            ctx.restore();
            // 在主波浪線上加小圓圈（只加在最中間那條）
            if (l === Math.floor(lineCount/2)) {
                for (let c of circles) {
                    let idx = Math.floor((c.theta / (Math.PI * 2)) * points.length);
                    idx = Math.max(0, Math.min(points.length-1, idx));
                    let [x, y] = points[idx];
                    // 只用 circleFlickerSpeed 控制小圓圈閃爍速度
                    const flicker = 0.7 + 0.6 * Math.sin(time * circleFlickerSpeed + c.phase);
                    ctx.save();
                    ctx.globalAlpha = 0.85 + 0.15 * Math.sin(time * (circleFlickerSpeed + 0.7) + c.phase);
                    ctx.beginPath();
                    ctx.arc(x, y, 16 * flicker, 0, Math.PI * 2);
                    ctx.fillStyle = c.color;
                    ctx.shadowColor = c.color;
                    ctx.shadowBlur = 24 * flicker;
                    ctx.fill();
                    ctx.lineWidth = 3;
                    ctx.strokeStyle = '#fff';
                    ctx.shadowBlur = 0;
                    ctx.globalAlpha = 1;
                    ctx.beginPath();
                    ctx.arc(x, y, 16 * flicker + 2, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }
        requestAnimationFrame(drawWave);
    }

    window.addEventListener('resize', function() {
        resizeCanvas();
    });
    
    resizeCanvas();
    // 開始動畫循環
    requestAnimationFrame(drawWave);
});