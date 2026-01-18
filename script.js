/* jimOS Core Logic */

// ==============================
// 1. 系統狀態與儲存管理 (LocalStorage)
// ==============================
const SYSTEM_KEY = 'jimos_system_v1';
const DEFAULT_STATE = {
    setupCompleted: false,
    user: { name: 'Jim', lang: 'zh-TW', avatar: 'default' },
    settings: { wallpaperIndex: 0, theme: 'light' },
    files: {
        'desktop': [
            { id: 1, name: 'Welcome.txt', type: 'text', content: 'Welcome to jimOS! This is a simulated OS.' },
            { id: 2, name: 'Project Folder', type: 'folder', content: [] }
        ],
        'documents': [],
        'downloads': []
    }
};

let sysState = JSON.parse(localStorage.getItem(SYSTEM_KEY)) || DEFAULT_STATE;

function saveState() {
    localStorage.setItem(SYSTEM_KEY, JSON.stringify(sysState));
}

// ==============================
// 2. 開機流程 (Boot & Setup)
// ==============================
document.addEventListener('DOMContentLoaded', () => {
    initClock();
    
    if (!sysState.setupCompleted) {
        // 首次啟動：顯示 Setup
        document.getElementById('boot-screen').classList.add('hidden');
        document.getElementById('setup-assistant').classList.remove('hidden');
    } else {
        // 正常啟動：跑開機動畫
        runBootSequence();
    }
});

function runBootSequence() {
    const bar = document.querySelector('.progress-bar');
    const text = document.querySelector('.boot-text');
    
    setTimeout(() => { bar.style.width = '100%'; }, 500);
    setTimeout(() => { text.style.opacity = '1'; }, 2000);
    
    setTimeout(() => {
        document.getElementById('boot-screen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('boot-screen').classList.add('hidden');
            document.getElementById('desktop').classList.remove('hidden');
            os.renderDesktop();
        }, 1000);
    }, 3500);
}

const setup = {
    tempLang: 'zh-TW',
    setLang: (lang) => { setup.tempLang = lang; },
    finish: () => {
        const name = document.getElementById('setup-username').value || 'Jim';
        sysState.user.name = name;
        sysState.user.lang = setup.tempLang;
        sysState.setupCompleted = true;
        saveState();
        
        document.getElementById('setup-assistant').classList.add('hidden');
        document.getElementById('boot-screen').classList.remove('hidden');
        // 重設進度條以跑動畫
        document.querySelector('.progress-bar').style.width = '0%';
        runBootSequence();
    }
};

// ==============================
// 3. 作業系統核心功能 (OS)
// ==============================
const os = {
    renderDesktop: () => {
        const container = document.getElementById('desktop-icons');
        container.innerHTML = '';
        sysState.files['desktop'].forEach(file => {
            const el = document.createElement('div');
            el.className = 'desktop-icon';
            el.innerHTML = `
                <i class="fas ${file.type === 'folder' ? 'fa-folder' : 'fa-file-lines'}"></i>
                <div>${file.name}</div>
            `;
            // 雙擊開啟
            el.ondblclick = () => {
                if(file.type === 'text') apps.open('editor', file);
                else apps.open('finder', 'desktop'); // 簡易處理：開啟 Finder
            };
            container.appendChild(el);
        });
    },
    createFile: (type) => {
        const name = prompt('請輸入名稱:', type === 'new_folder' ? 'New Folder' : 'New Text');
        if(!name) return;
        
        const newFile = {
            id: Date.now(),
            name: name,
            type: type === 'new_folder' ? 'folder' : 'text',
            content: type === 'new_folder' ? [] : ''
        };
        sysState.files['desktop'].push(newFile);
        saveState();
        os.renderDesktop();
        document.getElementById('context-menu').classList.add('hidden');
    },
    changeWallpaper: () => {
        const urls = [
            'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564',
            'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2564',
            'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?q=80&w=2564'
        ];
        sysState.settings.wallpaperIndex = (sysState.settings.wallpaperIndex + 1) % urls.length;
        document.documentElement.style.setProperty('--bg-primary', `url('${urls[sysState.settings.wallpaperIndex]}')`);
        saveState();
        document.getElementById('context-menu').classList.add('hidden');
    }
};

// ==============================
// 4. 視窗管理系統 (Window Manager)
// ==============================
let zIndexCounter = 100;
const windows = {};

const winManager = {
    create: (id, title, contentHTML, width=600, height=400) => {
        if(document.getElementById(`win-${id}`)) {
            // 視窗已存在，置頂並還原
            const win = document.getElementById(`win-${id}`);
            win.style.display = 'flex';
            winManager.focus(win);
            return;
        }

        const win = document.createElement('div');
        win.id = `win-${id}`;
        win.className = 'window glass';
        win.style.width = width + 'px';
        win.style.height = height + 'px';
        win.style.top = '100px';
        win.style.left = '100px';
        win.style.zIndex = ++zIndexCounter;

        win.innerHTML = `
            <div class="title-bar" onmousedown="winManager.dragStart(event, '${win.id}')">
                <div class="buttons">
                    <div class="win-btn close-btn" onclick="winManager.close('${id}')"></div>
                    <div class="win-btn min-btn" onclick="winManager.minimize('${id}')"></div>
                    <div class="win-btn max-btn" onclick="winManager.maximize('${id}')"></div>
                </div>
                <div class="window-title">${title}</div>
            </div>
            <div class="window-content">
                ${contentHTML}
            </div>
        `;

        win.onmousedown = () => winManager.focus(win);
        document.getElementById('window-area').appendChild(win);
        
        // 更新上方 Menu Bar
        document.getElementById('active-app-name').innerText = title;
        
        // 更新 Dock 指示燈
        const dockItem = document.querySelector(`.dock-item[title="${title}"] .dot`);
        if(dockItem) dockItem.classList.remove('hidden');
    },
    close: (id) => {
        const win = document.getElementById(`win-${id}`);
        if(win) win.remove();
        document.getElementById('active-app-name').innerText = 'jimOS';
        const dockItem = document.querySelector(`.dock-item[title="${id.charAt(0).toUpperCase() + id.slice(1)}"] .dot`); // 簡單匹配
        // 注意：這裡簡化了 title 對應，實際需更嚴謹
    },
    minimize: (id) => {
        const win = document.getElementById(`win-${id}`);
        win.style.display = 'none';
    },
    maximize: (id) => {
        const win = document.getElementById(`win-${id}`);
        if(win.style.width === '100%') {
            win.style.width = '600px'; win.style.height = '400px'; win.style.top = '100px'; win.style.left = '100px';
        } else {
            win.style.width = '100%'; win.style.height = 'calc(100vh - 70px)'; win.style.top = '28px'; win.style.left = '0';
        }
    },
    focus: (win) => {
        win.style.zIndex = ++zIndexCounter;
    },
    dragStart: (e, winId) => {
        const win = document.getElementById(winId);
        let shiftX = e.clientX - win.getBoundingClientRect().left;
        let shiftY = e.clientY - win.getBoundingClientRect().top;

        function moveAt(pageX, pageY) {
            win.style.left = pageX - shiftX + 'px';
            win.style.top = pageY - shiftY + 'px';
        }

        function onMouseMove(event) {
            moveAt(event.pageX, event.pageY);
        }

        document.addEventListener('mousemove', onMouseMove);
        win.onmouseup = function() {
            document.removeEventListener('mousemove', onMouseMove);
            win.onmouseup = null;
        };
    }
};

// ==============================
// 5. 應用程式邏輯 (Apps)
// ==============================
const apps = {
    open: (appName, data=null) => {
        switch(appName) {
            case 'finder':
                winManager.create('finder', 'Finder', apps.renderFinder(), 700, 450);
                break;
            case 'terminal':
                winManager.create('terminal', 'Terminal', apps.renderTerminal(), 600, 350);
                setTimeout(() => document.getElementById('term-input').focus(), 100);
                break;
            case 'calculator':
                winManager.create('calculator', 'Calculator', apps.renderCalculator(), 300, 400);
                break;
            case 'editor':
                winManager.create('editor', 'Notes', apps.renderEditor(data), 500, 350);
                break;
            case 'settings':
                 winManager.create('settings', 'System Settings', `<div style="padding:20px;"><h2>設定</h2><p>目前使用者: ${sysState.user.name}</p><button class="btn" onclick="os.changeWallpaper()">切換桌布</button><button class="btn" onclick="localStorage.clear();location.reload();">重置系統 (Reset)</button></div>`);
                 break;
            case 'safari':
                winManager.create('safari', 'Safari', `<div style="display:flex;flex-direction:column;height:100%;"><div style="padding:10px;border-bottom:1px solid #ddd;background:#f9f9f9;"><input type="text" value="https://google.com" style="width:100%;padding:5px;border-radius:5px;border:1px solid #ddd;"></div><iframe src="https://www.wikipedia.org" style="flex-grow:1;border:none;"></iframe></div>`, 800, 500);
                break;
            case 'trash':
                 winManager.create('trash', 'Trash', `<div style="padding:20px;text-align:center;"><i class="fas fa-trash fa-3x" style="color:#888;"></i><p>垃圾桶是空的</p></div>`, 400, 300);
                 break;
            default:
                alert('App not implemented yet!');
        }
    },
    
    renderFinder: () => {
        // 簡單渲染桌面檔案
        let filesHtml = sysState.files['desktop'].map(f => `
            <div style="text-align:center; width:80px; margin:5px; cursor:pointer;" ondblclick="apps.open('${f.type==='text'?'editor':'finder'}')">
                <i class="fas ${f.type==='folder'?'fa-folder':'fa-file-lines'}" style="font-size:40px; color:${f.type==='folder'?'#1c92f4':'#999'};"></i>
                <div style="font-size:12px; margin-top:5px; word-break:break-all;">${f.name}</div>
            </div>
        `).join('');
        return `
            <div class="app-finder">
                <div class="sidebar">
                    <div class="sidebar-item">Favorites</div>
                    <div class="sidebar-item" style="padding-left:20px;"> Desktop</div>
                    <div class="sidebar-item" style="padding-left:20px;"> Documents</div>
                    <div class="sidebar-item" style="padding-left:20px;"> Downloads</div>
                </div>
                <div class="file-area">${filesHtml}</div>
            </div>
        `;
    },

    renderTerminal: () => {
        return `
            <div class="app-terminal" onclick="document.getElementById('term-input').focus()">
                <div id="term-output" class="terminal-output">
                    <div>Last login: ${new Date().toDateString()} on ttys000</div>
                    <div>Type "help" for a list of commands.</div>
                    <br>
                </div>
                <div class="terminal-input-line">
                    <span style="color:#27c93f; margin-right:8px;">${sysState.user.name}@jimOS:~$</span>
                    <input type="text" id="term-input" class="terminal-input" onkeydown="handleTerminalCommand(event)">
                </div>
            </div>
        `;
    },
    
    renderCalculator: () => {
        return `
            <div class="calc-grid">
                <div class="calc-display" id="calc-disp">0</div>
                <button class="calc-btn" onclick="calcInput('C')">C</button>
                <button class="calc-btn" onclick="calcInput('/')">/</button>
                <button class="calc-btn" onclick="calcInput('*')">*</button>
                <button class="calc-btn" onclick="calcInput('-')">-</button>
                <button class="calc-btn" onclick="calcInput('7')">7</button>
                <button class="calc-btn" onclick="calcInput('8')">8</button>
                <button class="calc-btn" onclick="calcInput('9')">9</button>
                <button class="calc-btn op" onclick="calcInput('+')">+</button>
                <button class="calc-btn" onclick="calcInput('4')">4</button>
                <button class="calc-btn" onclick="calcInput('5')">5</button>
                <button class="calc-btn" onclick="calcInput('6')">6</button>
                <button class="calc-btn op" onclick="calcResult()">=</button>
                <button class="calc-btn" onclick="calcInput('1')">1</button>
                <button class="calc-btn" onclick="calcInput('2')">2</button>
                <button class="calc-btn" onclick="calcInput('3')">3</button>
                <button class="calc-btn" onclick="calcInput('0')">0</button>
            </div>
        `;
    },

    renderEditor: (file) => {
        const content = file ? file.content : '';
        return `
            <textarea style="width:100%; height:100%; border:none; outline:none; padding:10px; resize:none; font-family: sans-serif; font-size: 16px;">${content}</textarea>
        `;
    }
};

// ==============================
// 6. 輔助功能與事件
// ==============================

// 時鐘
function initClock() {
    function update() {
        const now = new Date();
        const str = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        document.getElementById('clock').innerText = str;
    }
    setInterval(update, 1000);
    update();
}

// 終端機邏輯
function handleTerminalCommand(e) {
    if(e.key === 'Enter') {
        const input = e.target.value;
        const output = document.getElementById('term-output');
        const user = sysState.user.name;
        
        output.innerHTML += `<div><span style="color:#27c93f;">${user}@jimOS:~$</span> ${input}</div>`;
        
        // 指令解析
        let response = '';
        const cmd = input.trim().toLowerCase();
        
        if(cmd === 'help') response = 'Available commands: help, clear, ls, date, neofetch, jimOS, whoami';
        else if(cmd === 'clear') { output.innerHTML = ''; e.target.value = ''; return; }
        else if(cmd === 'ls') response = 'Desktop  Documents  Downloads';
        else if(cmd === 'date') response = new Date().toString();
        else if(cmd === 'whoami') response = user;
        else if(cmd === 'jimos --version') response = 'jimOS v1.0.0 (Web Simulation)';
        else if(cmd === 'neofetch' || cmd === 'jimos') {
            response = `
                <pre style="color:#007AFF;">
      .
     / \\
    |   |    jimOS 1.0
   /     \\   ---------
  |      |  OS: jimOS Web
   \\     /   Kernel: JavaScript
    \\___/    Uptime: Just now
                </pre>
            `;
        } else if(cmd === 'jim') response = 'Hello! I am Jim, the creator of this OS simulator.';
        else if(cmd !== '') response = `Command not found: ${cmd}`;

        if(response) output.innerHTML += `<div>${response}</div>`;
        
        e.target.value = '';
        output.scrollTop = output.scrollHeight;
    }
}

// 計算機邏輯
let calcExp = '';
function calcInput(v) {
    if(v === 'C') calcExp = '';
    else calcExp += v;
    document.getElementById('calc-disp').innerText = calcExp || '0';
}
function calcResult() {
    try {
        calcExp = eval(calcExp).toString();
    } catch {
        calcExp = 'Error';
    }
    document.getElementById('calc-disp').innerText = calcExp;
}

// 桌面右鍵選單
document.getElementById('desktop').addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const menu = document.getElementById('context-menu');
    menu.style.left = e.pageX + 'px';
    menu.style.top = e.pageY + 'px';
    menu.classList.remove('hidden');
});
document.addEventListener('click', () => {
    document.getElementById('context-menu').classList.add('hidden');
});
