// グローバル変数の宣言
window.teams = [];
window.appConfig = { teamSortMethod: 'default' };
let currentTeamIndex = null;
let editingPlayerId = null;

// アプリ起動時にLocalStorageからデータを復元
document.addEventListener('DOMContentLoaded', () => {
    const localData = localStorage.getItem('football_tactics_data');
    if (localData) {
        try {
            const parsed = JSON.parse(localData);
            window.teams = Array.isArray(parsed.teams) ? parsed.teams : [];
            window.appConfig = parsed.appConfig || { teamSortMethod: 'default' };
        } catch (e) {
            console.error("データ解析エラー:", e);
            window.teams = [];
            window.appConfig = { teamSortMethod: 'default' };
        }
    }
    
    // ソート順のセレクトボックスの初期値を合わせる
    const teamSortSelect = document.getElementById('select-team-sort');
    if (teamSortSelect) {
        teamSortSelect.value = window.appConfig.teamSortMethod || 'default';
    }
    
    // 最初の画面を表示
    switchScreen('select-screen');
    renderTeamSelect();
});

// 画面を切り替える関数
function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    if(screenId === 'edit-screen') drawPitch();
}

// データの保存処理（LocalStorageへの即時書き込み）
window.saveCurrentTeamData = function(isSilent = false) {
    try {
        const dataToSave = {
            teams: window.teams,
            appConfig: window.appConfig
        };
        localStorage.setItem('football_tactics_data', JSON.stringify(dataToSave));

        if (!isSilent) {
            const indicator = document.getElementById('autosave-indicator');
            if(indicator) {
                indicator.classList.add('show');
                clearTimeout(window.autosaveTimeout);
                window.autosaveTimeout = setTimeout(() => { indicator.classList.remove('show'); }, 1200);
            }
        }
    } catch (error) {
        console.error("ローカル保存失敗:", error);
        alert("ブラウザへの保存に失敗しました。データ容量の上限に達している可能性があります。");
    }
}

// 画面外クリックでメニューを閉じる
document.addEventListener('click', (e) => {
    if (!e.target.closest('.player-node') && !e.target.closest('.player-action-menu')) {
        closeAllMenus();
    }
});

// コートの描画
window.drawPitch = function() {
    const canvas = document.getElementById('pitchCanvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    const stripes = 12;
    const stripeHeight = h / stripes;
    for(let i=0; i<stripes; i++) {
        ctx.fillStyle = (i % 2 === 0) ? '#2e7d32' : '#388e3c';
        ctx.fillRect(0, i * stripeHeight, w, stripeHeight);
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 3;
    ctx.fillStyle = 'none';

    const m = 20; 
    ctx.strokeRect(m, m, w - m*2, h - m*2);

    ctx.beginPath(); ctx.moveTo(m, h/2); ctx.lineTo(w - m, h/2); ctx.stroke(); 
    ctx.beginPath(); ctx.arc(w/2, h/2, 50, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.arc(w/2, h/2, 3, 0, Math.PI*2); ctx.fill();

    ctx.strokeRect(w/2 - 80, m, 160, 70);
    ctx.strokeRect(w/2 - 30, m, 60, 25);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.arc(w/2, m + 45, 2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(w/2, m + 45, 40, 0.64, Math.PI - 0.64, false); ctx.stroke();

    ctx.strokeRect(w/2 - 80, h - m - 70, 160, 70);
    ctx.strokeRect(w/2 - 30, h - m - 25, 60, 25);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.arc(w/2, h - m - 45, 2, 0, Math.PI*2); ctx.fill(); 
    ctx.beginPath(); ctx.arc(w/2, h - m - 45, 40, Math.PI + 0.64, Math.PI * 2 - 0.64, false); ctx.stroke();

    const r = 10;
    ctx.beginPath(); ctx.arc(m, m, r, 0, Math.PI/2); ctx.stroke();
    ctx.beginPath(); ctx.arc(w - m, m, r, Math.PI/2, Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(m, h - m, r, Math.PI * 1.5, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(w - m, h - m, r, Math.PI, Math.PI * 1.5); ctx.stroke();
}

// チーム一覧の描画
window.renderTeamSelect = function() {
    const grid = document.getElementById('team-grid');
    if(!grid) return;
    grid.innerHTML = '';
    
    const sortMethod = appConfig.teamSortMethod || 'default';
    let indexedTeams = teams.map((team, index) => ({ team, originalIndex: index }));

    if (sortMethod === 'name') {
        indexedTeams.sort((a, b) => {
            const nameA = a.team.name || '';
            const nameB = b.team.name || '';
            return nameA.localeCompare(nameB, 'ja');
        });
    }

    indexedTeams.forEach((item) => {
        const team = item.team;
        const index = item.originalIndex; 
        
        const card = document.createElement('div');
        card.className = 'team-card';
        
        const activeBgColor = team.uniformColor || '#e53935';
        card.style.backgroundColor = activeBgColor;
        
        const activeTextColor = getContrastColor(activeBgColor);
        card.style.color = activeTextColor;

        card.onclick = (e) => {
            if (e.target.closest('.btn-delete-team') || e.target.closest('.team-order-controls')) return;
            openTeam(index);
        };

        const subTextColor = (activeTextColor === '#000000') ? '#333333' : 'var(--text-muted)';

        let cardHTML = `
            <button class="btn-delete-team" title="チームを削除">🗑️</button>
            <h3 style="color: ${activeTextColor};">${team.name || '無名チーム'}</h3>
            <p style="font-size:12px; color: ${subTextColor}; margin:5px 0 0 0;">監督： ${team.manager || '未設定'}</p>
        `;

        if (sortMethod === 'custom') {
            cardHTML += `
                <div class="team-order-controls">
                    <button onclick="moveTeamOrder(${index}, -1)">◀ 前へ</button>
                    <button onclick="moveTeamOrder(${index}, 1)">次へ ▶</button>
                </div>
            `;
        }

        card.innerHTML = cardHTML;
        card.querySelector('.btn-delete-team').onclick = (e) => {
            e.stopPropagation(); 
            deleteTeam(index);
        };

        grid.appendChild(card);
    });
}

window.deleteTeam = function(index) {
    const teamName = teams[index].name || '無名チーム';
    if (confirm(`本当に「${teamName}」をチームごと削除しますか？`)) {
        teams.splice(index, 1);
        saveCurrentTeamData(true); 
        renderTeamSelect();
    }
}

window.moveTeamOrder = function(currentIndex, direction) {
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= teams.length) return;
    const temp = teams[currentIndex];
    teams[currentIndex] = teams[targetIndex];
    teams[targetIndex] = temp;
    saveCurrentTeamData(true); 
    renderTeamSelect();
}

window.changeTeamSortMethod = function() {
    const method = document.getElementById('select-team-sort').value;
    appConfig.teamSortMethod = method;
    saveCurrentTeamData(true); 
    renderTeamSelect();
}

window.showCreateTeamModal = function() {
    const name = prompt("チーム名を入力してください:");
    if (!name) return;
    teams.push({ name: name, manager: '', uniformColor: '#e53935', gkUniformColor: '#ffb300', fpNumberColor: '#ffffff', playerSortMethod: 'default', players: [] });
    saveCurrentTeamData(true); 
    renderTeamSelect();
}

window.openTeam = function(index) {
    currentTeamIndex = index;
    switchScreen('edit-screen');
    
    const team = teams[currentTeamIndex];
    document.getElementById('input-team-name').value = team.name || '';
    document.getElementById('input-manager-name').value = team.manager || '';
    document.getElementById('input-uniform-color').value = team.uniformColor || '#e53935';
    document.getElementById('input-gk-uniform-color').value = team.gkUniformColor || '#ffb300';
    document.getElementById('input-fp-number-color').value = team.fpNumberColor || '#ffffff';
    document.getElementById('select-player-sort').value = team.playerSortMethod || 'default';
    
    document.getElementById('display-team-name').innerText = team.name || '';
    document.getElementById('display-manager-name').innerText = team.manager ? `監督： ${team.manager}` : '';
    
    syncColorPickerUI();
    renderPlayerList();
    renderPlayersOnPitch();
    window.scrollTo(0, 0);
}

window.backToSelectScreen = function() {
    closeAllMenus();
    currentTeamIndex = null;
    switchScreen('select-screen');
    renderTeamSelect();
}

window.updateTeamMeta = function() {
    if (currentTeamIndex === null) return;
    const teamName = document.getElementById('input-team-name').value;
    const managerName = document.getElementById('input-manager-name').value;
    teams[currentTeamIndex].name = teamName;
    teams[currentTeamIndex].manager = managerName;
    
    document.getElementById('display-team-name').innerText = teamName;
    document.getElementById('display-manager-name').innerText = managerName ? `監督： ${managerName}` : '';
    
    syncColorPickerUI();
    saveCurrentTeamData(true); 
}

function syncColorPickerUI() {
    const fpColor = document.getElementById('input-uniform-color').value;
    const gkColor = document.getElementById('input-gk-uniform-color').value;
    const fpNumColor = document.getElementById('input-fp-number-color').value;

    if(document.getElementById('fp-color-preview')) document.getElementById('fp-color-preview').style.backgroundColor = fpColor;
    if(document.getElementById('gk-color-preview')) document.getElementById('gk-color-preview').style.backgroundColor = gkColor;
    if(document.getElementById('fp-number-color-preview')) document.getElementById('fp-number-color-preview').style.backgroundColor = fpNumColor;
}

function closeAllMenus() {
    document.querySelectorAll('.player-action-menu').forEach(m => m.remove());
}

window.updateUniformColor = function() {
    if (currentTeamIndex === null) return;
    const fpColor = document.getElementById('input-uniform-color').value;
    const gkColor = document.getElementById('input-gk-uniform-color').value;
    const fpNumColor = document.getElementById('input-fp-number-color').value;
    
    teams[currentTeamIndex].uniformColor = fpColor;
    teams[currentTeamIndex].gkUniformColor = gkColor;
    teams[currentTeamIndex].fpNumberColor = fpNumColor;
    
    syncColorPickerUI();
    renderPlayersOnPitch();
    saveCurrentTeamData(true); 
}

window.changeSortMethod = function() {
    if (currentTeamIndex === null) return;
    const method = document.getElementById('select-player-sort').value;
    teams[currentTeamIndex].playerSortMethod = method;
    renderPlayerList();
    saveCurrentTeamData(true); 
}

// 選手登録（画像自動圧縮・リサイズ機能付き）
window.registerPlayer = function() {
    if (currentTeamIndex === null) return;
    const team = teams[currentTeamIndex];
    const isGk = document.getElementById('p-is-gk').checked;
    const name = document.getElementById('p-name').value;
    const number = document.getElementById('p-number').value;
    const memo1 = document.getElementById('p-memo1').value;
    const memo2 = document.getElementById('p-memo2').value;
    const photoInput = document.getElementById('p-photo');

    if (!name) { alert("氏名は必須です"); return; }
    if (editingPlayerId === null && team.players.length >= 100) {
        alert("登録できる選手は100人までです。"); return;
    }

    const proceed = (photoDataUrl) => {
        if (editingPlayerId !== null) {
            const p = team.players.find(pl => pl.id === editingPlayerId);
            if(p) {
                p.isGk = isGk; p.name = name; p.number = number; p.memo1 = memo1; p.memo2 = memo2;
                if(photoDataUrl) p.photo = photoDataUrl;
            }
            editingPlayerId = null;
        } else {
            team.players.push({
                id: Date.now().toString(), isGk: isGk, name: name, number: number, memo1: memo1, memo2: memo2,
                photo: photoDataUrl || '', x: 195, y: isGk ? 480 : 280, isOnPitch: false
            });
        }
        clearPlayerForm(); renderPlayerList(); renderPlayersOnPitch();
        saveCurrentTeamData(false); 
    };

    if (photoInput.files && photoInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const size = 120; // 丸アイコン用に120x120の正方形に縮小
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                
                // 正方形の中央に綺麗にトリミングする計算
                const minSide = Math.min(img.width, img.height);
                const sx = (img.width - minSide) / 2;
                const sy = (img.height - minSide) / 2;
                
                ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
                
                // JPEG形式に変換し、画質70%で極限まで軽量化（1枚数KBになります）
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                proceed(compressedDataUrl);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(photoInput.files[0]);
    } else {
        proceed(null);
    }
}

window.clearPlayerForm = function() {
    document.getElementById('p-is-gk').checked = false;
    document.getElementById('p-name').value = '';
    document.getElementById('p-number').value = '';
    document.getElementById('p-memo1').value = '';
    document.getElementById('p-memo2').value = '';
    document.getElementById('p-photo').value = '';
    editingPlayerId = null;
    document.getElementById('btn-submit-player').innerText = "選手を追加・更新";
    document.getElementById('btn-cancel-edit').style.display = "none";
}

window.renderPlayerList = function() {
    if (currentTeamIndex === null) return;
    const team = teams[currentTeamIndex];
    document.getElementById('player-count').innerText = team ? team.players.length : 0;
    const listContainer = document.getElementById('registered-players-list');
    if(!listContainer || !team) return;
    listContainer.innerHTML = '';

    const sortMethod = team.playerSortMethod || 'default';
    let sortedPlayers = [...team.players];

    if (sortMethod === 'number') {
        sortedPlayers.sort((a, b) => (parseInt(a.number) || 9999) - (parseInt(b.number) || 9999));
    } else if (sortMethod === 'name') {
        sortedPlayers.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    } else if (sortMethod === 'gk') {
        sortedPlayers.sort((a, b) => (b.isGk ? 1 : 0) - (a.isGk ? 1 : 0));
    }

    sortedPlayers.forEach(p => {
        const item = document.createElement('div');
        item.className = 'player-list-item';
        const numDisplay = p.number !== '' ? p.number : '-';

        item.innerHTML = `
            <div style="display: flex; align-items: center; overflow: hidden; flex: 1; padding-right: 5px;">
                <span class="custom-list-num-wrapper"><span class="list-player-number">${numDisplay}</span></span>
                <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    <strong style="font-size: 15px;">${p.name} ${p.isGk ? '<span style="color:#ffb300; font-size:11px; font-weight:bold;">(GK)</span>' : ''}</strong> <br>
                    <span style="font-size:11px; color:#aaa;">${p.memo1 || ''}</span>
                </div>
            </div>
            <div style="display:flex; gap:5px; flex-shrink: 0;">
                <button class="btn-secondary" style="padding:6px 10px; font-size:12px;" onclick="togglePitchStatus('${p.id}')">${p.isOnPitch ? '外す' : '起用'}</button>
                <button class="btn-secondary" style="padding:6px 10px; font-size:12px;" onclick="loadPlayerToForm('${p.id}')">編集</button>
                <button class="btn-danger" style="padding:6px 10px; font-size:12px;" onclick="deletePlayer('${p.id}')">削除</button>
            </div>
        `;
        listContainer.appendChild(item);
    });
}

window.deletePlayer = function(id) {
    if (currentTeamIndex === null) return;
    const team = teams[currentTeamIndex];
    const p = team.players.find(pl => pl.id === id);
    if (confirm(`本当に ${p.name} 選手を削除しますか？`)) {
        team.players = team.players.filter(pl => pl.id !== id);
        if (editingPlayerId === id) clearPlayerForm();
        closeAllMenus(); renderPlayerList(); renderPlayersOnPitch();
        saveCurrentTeamData(false);
    }
}

window.loadPlayerToForm = function(id) {
    if (currentTeamIndex === null) return;
    const p = teams[currentTeamIndex].players.find(pl => pl.id === id);
    if(!p) return;
    editingPlayerId = p.id;
    document.getElementById('p-is-gk').checked = p.isGk || false;
    document.getElementById('p-name').value = p.name;
    document.getElementById('p-number').value = p.number;
    document.getElementById('p-memo1').value = p.memo1;
    document.getElementById('p-memo2').value = p.memo2;
    document.getElementById('btn-submit-player').innerText = "登録変更を保存する";
    document.getElementById('btn-cancel-edit').style.display = "block";
    document.getElementById('player-form').scrollIntoView({ behavior: 'smooth' });
    closeAllMenus();
}

window.togglePitchStatus = function(id) {
    if (currentTeamIndex === null) return;
    const p = teams[currentTeamIndex].players.find(pl => pl.id === id);
    if(!p) return;
    p.isOnPitch = !p.isOnPitch;
    closeAllMenus(); renderPlayerList(); renderPlayersOnPitch();
    saveCurrentTeamData(false); 
}

function showActionMenu(pageX, pageY, playerObject) {
    closeAllMenus();
    const menu = document.createElement('div');
    menu.className = 'player-action-menu';
    menu.style.left = `${Math.min(pageX, window.innerWidth - 130)}px`;
    menu.style.top = `${pageY}px`;
    menu.innerHTML = `
        <button style="color: #fff;" id="btn-menu-pitch">❌ 外す</button>
        <button style="color: #ffb300;" id="btn-menu-edit">✏️ 編集</button>
        <button style="color: #ff5252;" id="btn-menu-delete">🗑️ 削除</button>
    `;
    menu.querySelector('#btn-menu-pitch').onclick = () => togglePitchStatus(playerObject.id);
    menu.querySelector('#btn-menu-edit').onclick = () => loadPlayerToForm(playerObject.id);
    menu.querySelector('#btn-menu-delete').onclick = () => deletePlayer(playerObject.id);
    document.body.appendChild(menu);
}

window.renderPlayersOnPitch = function() {
    const container = document.getElementById('players-on-pitch');
    if(!container || currentTeamIndex === null || !teams[currentTeamIndex]) return;
    container.innerHTML = '';
    const team = teams[currentTeamIndex];
    const fpColor = team.uniformColor || '#e53935';
    const gkColor = team.gkUniformColor || '#ffb300';
    const globalFpNumColor = team.fpNumberColor || '#ffffff';

    team.players.forEach(p => {
        if (!p.isOnPitch) return;
        const node = document.createElement('div');
        node.className = 'player-node';
        node.style.left = `${(p.x / 450) * 100}%`;
        node.style.top = `${(p.y / 600) * 100}%`;
        
        const activeColor = p.isGk ? gkColor : fpColor;
        node.style.borderColor = activeColor;

        if (p.photo) {
            node.style.backgroundImage = `url(${p.photo})`;
            if (p.number) {
                const badge = document.createElement('div');
                badge.className = 'number-badge';
                
                if (p.isGk) {
                    badge.style.backgroundColor = gkColor;
                    badge.style.color = getContrastColor(gkColor);
                } else {
                    badge.style.backgroundColor = fpColor;
                    badge.style.color = globalFpNumColor; 
                }
                
                badge.innerText = p.number;
                node.appendChild(badge);
            }
        } else {
            node.style.backgroundColor = activeColor;
            const centerNum = document.createElement('div');
            centerNum.className = 'number-center';
            
            if (p.isGk) {
                node.style.color = getContrastColor(gkColor);
            } else {
                node.style.color = globalFpNumColor;
            }
            
            centerNum.innerText = p.number || '';
            node.appendChild(centerNum);
        }

        const labelContainer = document.createElement('div');
        labelContainer.className = 'player-label-container';
        const nameElm = document.createElement('div');
        nameElm.className = 'name-label'; nameElm.innerText = p.name;
        labelContainer.appendChild(nameElm);

        if (p.memo1 && p.memo1.trim() !== '') {
            const memoElm = document.createElement('div');
            memoElm.className = 'memo-label'; memoElm.innerText = p.memo1;
            labelContainer.appendChild(memoElm);
        }
        node.appendChild(labelContainer);
        makeElementDraggable(node, p);
        container.appendChild(node);
    });
    syncColorPickerUI();
}

function makeElementDraggable(elm, playerObject) {
    let isDragging = false; let hasMoved = false;
    const pitchWrapper = document.getElementById('pitch-wrapper');

    const startDrag = (e) => { isDragging = true; hasMoved = false; e.preventDefault(); };
    const doDrag = (e) => {
        if (!isDragging) return; hasMoved = true;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const rect = pitchWrapper.getBoundingClientRect();
        let percentX = ((clientX - rect.left) / rect.width);
        let percentY = ((clientY - rect.top) / rect.height);
        let targetX = (percentX * 450) - 25; let targetY = (percentY * 600) - 25;
        targetX = Math.max(0, Math.min(targetX, 450 - 50)); targetY = Math.max(0, Math.min(targetY, 600 - 50));
        elm.style.left = `${(targetX / 450) * 100}%`; elm.style.top = `${(targetY / 600) * 100}%`;
        playerObject.x = targetX; playerObject.y = targetY;
    };
    const endDrag = (e) => {
        if (isDragging) {
            isDragging = false;
            if (!hasMoved) {
                const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
                const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
                showActionMenu(clientX, clientY, playerObject);
            } else {
                saveCurrentTeamData(false);
            }
        }
    };
    elm.addEventListener('mousedown', startDrag); document.addEventListener('mousemove', doDrag); document.addEventListener('mouseup', endDrag);
    elm.addEventListener('touchstart', startDrag, { passive: false }); document.addEventListener('touchmove', doDrag, { passive: false }); elm.addEventListener('touchend', endDrag);
}

function getContrastColor(hexcolor){
    const r = parseInt(hexcolor.substr(1,2),16); const g = parseInt(hexcolor.substr(3,2),16); const b = parseInt(hexcolor.substr(5,2),16);
    return ((((r*299)+(g*587)+(b*114))/1000) >= 128) ? '#000000' : '#ffffff';
}