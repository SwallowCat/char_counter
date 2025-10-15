// content/event-handlers.js - イベントハンドラーの管理
(function(global) {
    'use strict';
    console.log('🔧 event-handlers.js module executing...');
    
    // クリップボード関連の操作
    async function handleCopyText(text) {
        try {
            await navigator.clipboard.writeText(text);
            console.log('✅ Text copied to clipboard');
            return true;
        } catch (error) {
            console.error('❌ Failed to copy text:', error);
            return false;
        }
    }
    
    async function handlePasteText() {
        try {
            const text = await navigator.clipboard.readText();
            console.log('✅ Text pasted from clipboard');
            return text;
        } catch (error) {
            console.error('❌ Failed to paste text:', error);
            return '';
        }
    }
    
    // 履歴関連の操作
    async function loadHistory() {
        try {
            const result = await chrome.runtime.sendMessage({ action: 'getHistory' });
            return result || [];
        } catch (error) {
            console.error('❌ Failed to load history:', error);
            return [];
        }
    }
    
    async function saveToHistory(text) {
        try {
            const historyItem = {
                id: Date.now().toString(),
                text: text,
                timestamp: new Date().toLocaleString('ja-JP'),
                charCount: text.length,
                wordCount: global.calculateCounts(text).wordCount
            };
            
            const history = await loadHistory();
            history.unshift(historyItem);
            
            // 最大50件まで保持
            if (history.length > 50) {
                history.length = 50;
            }
            
            await chrome.runtime.sendMessage({ 
                action: 'saveHistory', 
                history: history 
            });
            
            console.log('✅ Text saved to history');
            return true;
        } catch (error) {
            console.error('❌ Failed to save to history:', error);
            return false;
        }
    }
    
    // 設定関連の操作
    async function loadSettings() {
        try {
            const result = await chrome.runtime.sendMessage({ action: 'getSettings' });
            return result || { openMode: 'window' };
        } catch (error) {
            console.error('❌ Failed to load settings:', error);
            return { openMode: 'window' };
        }
    }
    
    async function saveSettings(settings) {
        try {
            await chrome.runtime.sendMessage({ 
                action: 'saveSettings', 
                settings: settings 
            });
            console.log('✅ Settings saved');
            return true;
        } catch (error) {
            console.error('❌ Failed to save settings:', error);
            return false;
        }
    }
    
    // 履歴表示の更新
    function updateHistoryDisplay(element, history) {
        const historyList = element.querySelector('#historyList');
        if (!historyList) return;
        
        if (!history || history.length === 0) {
            historyList.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.7); font-size: 12px;">履歴がありません</div>';
            return;
        }
        
        historyList.innerHTML = history.map(item => `
            <div class="history-item" data-id="${item.id}" style="padding: 8px; margin-bottom: 6px; background: rgba(255,255,255,0.1); border-radius: 4px; cursor: pointer; position: relative; transition: background 0.2s;">
                <div style="font-size: 11px; color: rgba(255,255,255,0.8); margin-bottom: 4px;">${item.timestamp}</div>
                <div style="font-size: 12px; margin-bottom: 4px; word-break: break-word; max-height: 60px; overflow: hidden;">${item.text.substring(0, 100)}${item.text.length > 100 ? '...' : ''}</div>
                <div style="font-size: 10px; color: rgba(255,255,255,0.6);">${item.charCount}文字, ${item.wordCount}語</div>
                <button class="delete-history-item" data-id="${item.id}" style="position: absolute; top: 4px; right: 4px; background: rgba(220, 53, 69, 0.8); border: none; color: white; width: 16px; height: 16px; border-radius: 50%; cursor: pointer; font-size: 10px; display: flex; align-items: center; justify-content: center;">×</button>
            </div>
        `).join('');
    }
    
    // グローバルオブジェクトに関数を登録
    global.handleCopyText = handleCopyText;
    global.handlePasteText = handlePasteText;
    global.loadHistory = loadHistory;
    global.saveToHistory = saveToHistory;
    global.loadSettings = loadSettings;
    global.saveSettings = saveSettings;
    global.updateHistoryDisplay = updateHistoryDisplay;
    
    console.log('✅ event-handlers.js functions registered:', ['handleCopyText', 'handlePasteText', 'loadHistory', 'saveToHistory', 'loadSettings', 'saveSettings', 'updateHistoryDisplay']);
    
})(window.CounterExtension = window.CounterExtension || {});
