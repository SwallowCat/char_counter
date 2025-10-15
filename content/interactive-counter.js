// content/interactive-counter.js - インタラクティブカウンターのメイン機能
(function(global) {
    'use strict';
    console.log('🔧 interactive-counter.js module executing...');
    
    let interactiveCounterElement = null;
    let currentSettings = { openMode: 'window' };
    
    // インタラクティブカウンターをページに表示
    async function showInteractiveCounterOnPage(initialText = '') {
        console.log('🎮 showInteractiveCounterOnPage called with initialText:', initialText.substring(0, 50));
        
        try {
            // 既存のカウンターを削除
            global.removeInteractiveCounter();
            
            // 設定を読み込み
            currentSettings = await global.loadSettings();
            console.log('📋 Loaded settings:', currentSettings);
            
            // テンプレートを読み込み
            const html = await global.loadInteractiveCounterTemplate(initialText);
            
            // カウンターを表示
            interactiveCounterElement = global.showInteractiveCounter(html);
            
            if (interactiveCounterElement) {
                console.log('✅ Interactive counter created successfully');
                
                // イベントハンドラーを設定
                setupInteractiveCounterEvents();
                
                // 初期カウントを更新
                global.handleTextChange(interactiveCounterElement);
                
                // テキストエリアにフォーカス
                const textarea = interactiveCounterElement.querySelector('#textArea');
                if (textarea) {
                    textarea.focus();
                }
                
                console.log('🎯 Interactive counter setup completed');
            } else {
                console.error('❌ Failed to create interactive counter element');
            }
        } catch (error) {
            console.error('❌ Error in showInteractiveCounterOnPage:', error);
        }
    }
    
    // イベントハンドラーの設定
    function setupInteractiveCounterEvents() {
        if (!interactiveCounterElement) {
            console.error('❌ No interactive counter element found for event setup');
            return;
        }
        
        // DOM要素を取得
        const inputTextarea = interactiveCounterElement.querySelector('#textArea');
        const clearBtn = interactiveCounterElement.querySelector('#clearButton');
        const copyBtn = interactiveCounterElement.querySelector('#copyButton');
        const pasteBtn = interactiveCounterElement.querySelector('#pasteButton');
        const saveBtn = interactiveCounterElement.querySelector('#saveButton');
        const closeBtn = interactiveCounterElement.querySelector('#closeButton');
        const historyToggle = interactiveCounterElement.querySelector('#historyToggle');
        const historySection = interactiveCounterElement.querySelector('#historySection');
        const historyList = interactiveCounterElement.querySelector('#historyList');
        const clearHistoryBtn = interactiveCounterElement.querySelector('#clearHistoryButton');
        const settingsToggle = interactiveCounterElement.querySelector('#settingsToggle');
        const settingsSection = interactiveCounterElement.querySelector('#settingsSection');
        const openModeSelect = interactiveCounterElement.querySelector('#openModeSelect');
        const saveSettingsBtn = interactiveCounterElement.querySelector('#saveSettingsButton');
        const cancelSettingsBtn = interactiveCounterElement.querySelector('#cancelSettingsButton');
        
        // テキストエリアの変更イベント
        if (inputTextarea) {
            inputTextarea.addEventListener('input', () => {
                global.handleTextChange(interactiveCounterElement);
            });
            console.log('✅ Text area event listener added');
        }
        
        // クリアボタン
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (inputTextarea) {
                    inputTextarea.value = '';
                    global.handleTextChange(interactiveCounterElement);
                    inputTextarea.focus();
                }
            });
        }
        
        // コピーボタン
        if (copyBtn) {
            copyBtn.addEventListener('click', async () => {
                if (inputTextarea) {
                    const success = await global.handleCopyText(inputTextarea.value);
                    if (success) {
                        copyBtn.textContent = '✓';
                        setTimeout(() => copyBtn.textContent = 'コピー', 1000);
                    }
                }
            });
        }
        
        // 貼り付けボタン
        if (pasteBtn) {
            pasteBtn.addEventListener('click', async () => {
                if (inputTextarea) {
                    const text = await global.handlePasteText();
                    if (text) {
                        inputTextarea.value = text;
                        global.handleTextChange(interactiveCounterElement);
                        inputTextarea.focus();
                    }
                }
            });
        }
        
        // 保存ボタン
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                if (inputTextarea && inputTextarea.value.trim()) {
                    const success = await global.saveToHistory(inputTextarea.value);
                    if (success) {
                        saveBtn.textContent = '✓';
                        setTimeout(() => saveBtn.textContent = '保存', 1000);
                        // 履歴を更新
                        await updateHistoryList();
                    }
                }
            });
        }
        
        // 閉じるボタン
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                global.removeInteractiveCounter();
                interactiveCounterElement = null;
            });
        }
        
        // 履歴表示切り替え
        if (historyToggle && historySection) {
            historyToggle.addEventListener('click', async () => {
                const isVisible = historySection.style.display !== 'none';
                if (isVisible) {
                    historySection.style.display = 'none';
                    historyToggle.textContent = '履歴を表示 ▼';
                } else {
                    historySection.style.display = 'block';
                    historyToggle.textContent = '履歴を非表示 ▲';
                    await updateHistoryList();
                }
            });
        }
        
        // 履歴クリアボタン
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', async () => {
                if (confirm('履歴をすべて削除しますか？')) {
                    await chrome.runtime.sendMessage({ 
                        action: 'saveHistory', 
                        history: [] 
                    });
                    await updateHistoryList();
                }
            });
        }
        
        // 履歴アイテムのクリック処理
        if (historyList) {
            historyList.addEventListener('click', async (e) => {
                if (e.target.classList.contains('delete-history-item')) {
                    // 削除ボタンがクリックされた場合
                    const itemId = e.target.dataset.id;
                    await deleteHistoryItem(itemId);
                    await updateHistoryList();
                    e.stopPropagation();
                } else if (e.target.closest('.history-item')) {
                    // 履歴アイテムがクリックされた場合
                    const historyItem = e.target.closest('.history-item');
                    const itemId = historyItem.dataset.id;
                    const history = await global.loadHistory();
                    const item = history.find(h => h.id === itemId);
                    if (item && inputTextarea) {
                        inputTextarea.value = item.text;
                        global.handleTextChange(interactiveCounterElement);
                        inputTextarea.focus();
                    }
                }
            });
        }
        
        // 設定表示切り替え
        if (settingsToggle && settingsSection) {
            settingsToggle.addEventListener('click', async () => {
                const isVisible = settingsSection.style.display !== 'none';
                if (isVisible) {
                    settingsSection.style.display = 'none';
                } else {
                    settingsSection.style.display = 'block';
                    // 現在の設定を表示
                    if (openModeSelect) {
                        openModeSelect.value = currentSettings.openMode || 'window';
                    }
                }
            });
        }
        
        // 設定保存ボタン
        if (saveSettingsBtn && openModeSelect) {
            saveSettingsBtn.addEventListener('click', async () => {
                const newSettings = {
                    openMode: openModeSelect.value
                };
                
                const success = await global.saveSettings(newSettings);
                if (success) {
                    currentSettings = newSettings;
                    
                    // バックグラウンドスクリプトに設定更新を通知
                    try {
                        await chrome.runtime.sendMessage({
                            action: 'updateSettings',
                            settings: newSettings
                        });
                        console.log('✅ Settings updated in background script');
                    } catch (error) {
                        console.error('❌ Failed to update settings in background script:', error);
                    }
                    
                    saveSettingsBtn.textContent = '✓';
                    setTimeout(() => {
                        saveSettingsBtn.textContent = '保存';
                        if (settingsSection) {
                            settingsSection.style.display = 'none';
                        }
                    }, 1000);
                }
            });
        }
        
        // 設定キャンセルボタン
        if (cancelSettingsBtn && settingsSection) {
            cancelSettingsBtn.addEventListener('click', () => {
                settingsSection.style.display = 'none';
                // 元の設定に戻す
                if (openModeSelect) {
                    openModeSelect.value = currentSettings.openMode || 'window';
                }
            });
        }
        
        console.log('✅ All event handlers set up successfully');
    }
    
    // 履歴リストの更新
    async function updateHistoryList() {
        const history = await global.loadHistory();
        global.updateHistoryDisplay(interactiveCounterElement, history);
    }
    
    // 履歴アイテムの削除
    async function deleteHistoryItem(itemId) {
        const history = await global.loadHistory();
        const filteredHistory = history.filter(item => item.id !== itemId);
        await chrome.runtime.sendMessage({ 
            action: 'saveHistory', 
            history: filteredHistory 
        });
    }
    
    // グローバルオブジェクトに関数を登録
    global.showInteractiveCounterOnPage = showInteractiveCounterOnPage;
    global.setupInteractiveCounterEvents = setupInteractiveCounterEvents;
    
    console.log('✅ interactive-counter.js functions registered:', ['showInteractiveCounterOnPage', 'setupInteractiveCounterEvents']);
    console.log('🔍 showInteractiveCounterOnPage available:', typeof global.showInteractiveCounterOnPage === 'function');
    
})(window.CounterExtension = window.CounterExtension || {});
