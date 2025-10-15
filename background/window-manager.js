// background/window-manager.js - ウィンドウ管理

// 設定に応じてカウンターを開く関数
function openCounterWithCurrentSettings(initialText = '') {
    console.log('=== openCounterWithCurrentSettings called ===');
    console.log('Initial text:', initialText || 'none');
    console.log('Current settings in memory:', globalThis.currentSettings);
    
    // 最新の設定を再取得して確実に使用
    chrome.storage.local.get(['appSettings'], (result) => {
        const latestSettings = result.appSettings || globalThis.currentSettings;
        console.log('Latest settings from storage:', latestSettings);
        
        const url = chrome.runtime.getURL('popup.html') + (initialText ? `?text=${encodeURIComponent(initialText)}` : '');
        console.log('Opening URL:', url);
        
        console.log('Checking openMode:', latestSettings.openMode, typeof latestSettings.openMode);
        console.log('Is popup mode?', latestSettings.openMode === 'popup');
        
        if (latestSettings.openMode === 'popup') {
            console.log('🔹 EXECUTING: Opening in popup mode (small window over current tab)');
            console.log('*** POPUP MODE CONFIRMED - Creating small window ***');
            
            // 現在のウィンドウの中央上部に小さなウィンドウを配置
            chrome.windows.getCurrent((currentWindow) => {
                const windowWidth = 420;
                const windowHeight = 550;
                const left = currentWindow.left + Math.round((currentWindow.width - windowWidth) / 2);
                const top = currentWindow.top + 80; // タブバーの下
                
                console.log('Positioning popup over current tab:', {
                    currentWindow: {left: currentWindow.left, top: currentWindow.top, width: currentWindow.width, height: currentWindow.height},
                    popup: {left: Math.max(0, left), top: Math.max(0, top), width: windowWidth, height: windowHeight}
                });
                
                chrome.windows.create({
                    url: url,
                    type: 'normal',
                    width: windowWidth,
                    height: windowHeight,
                    left: Math.max(0, left),
                    top: Math.max(0, top),
                    state: 'normal',
                    focused: true
                }, (popupWindow) => {
                    if (chrome.runtime.lastError) {
                        console.error('Error creating popup window:', chrome.runtime.lastError);
                    } else {
                        console.log('Initial popup window created:', {
                            expected: {width: 420, height: 550},
                            actual: {width: popupWindow.width, height: popupWindow.height, state: popupWindow.state},
                            position: {left: popupWindow.left, top: popupWindow.top}
                        });
                        
                        // ウィンドウが期待サイズでない場合、明示的にリサイズ
                        if (popupWindow.width !== windowWidth || popupWindow.height !== windowHeight) {
                            console.log('Window size mismatch, applying forced resize...');
                            chrome.windows.update(popupWindow.id, {
                                width: windowWidth,
                                height: windowHeight,
                                left: Math.max(0, left),
                                top: Math.max(0, top),
                                state: 'normal'
                            }, (updatedWindow) => {
                                if (chrome.runtime.lastError) {
                                    console.error('Error resizing window:', chrome.runtime.lastError);
                                } else {
                                    console.log('Window successfully resized:', {
                                        final: {width: updatedWindow.width, height: updatedWindow.height, state: updatedWindow.state},
                                        position: {left: updatedWindow.left, top: updatedWindow.top}
                                    });
                                }
                            });
                        } else {
                            console.log('Window created with correct size on first attempt');
                        }
                    }
                });
            });
        } else if (latestSettings.openMode === 'tab') {
            console.log('🔹 EXECUTING: Opening in tab mode');
            console.log('*** TAB MODE CONFIRMED - Creating new tab ***');
            // タブモードの場合は新しいタブで開く
            chrome.tabs.create({
                url: url
            }, (tab) => {
                console.log('Tab created:', tab);
            });
        } else {
            console.log('🔹 EXECUTING: Opening in window mode (default)');
            console.log('*** WINDOW MODE CONFIRMED - Creating maximized window ***');
            console.log('OpenMode value was:', latestSettings.openMode);
            // ウィンドウモード（デフォルト）の場合は最大化されたウィンドウで開く
            chrome.windows.create({
                url: url,
                type: 'normal',
                state: 'maximized'
            }, (window) => {
                console.log('Normal window created:', window);
            });
        }
    });
}

// 後方互換性のための関数（既存のコードとの互換性を保つ）
function openCounterWindow(initialText = '') {
    openCounterWithCurrentSettings(initialText);
}

// 選択されたテキスト付きでカウンターウィンドウを開く
function openCounterWindowWithText(text) {
    openCounterWithCurrentSettings(text);
}

// Service Worker用のグローバル登録
globalThis.openCounterWithCurrentSettings = openCounterWithCurrentSettings;
