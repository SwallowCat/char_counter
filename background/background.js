// background.js - メインバックグラウンドスクリプト
// 分割されたモジュールを統合

// モジュールをインポート（Service Workerではimportが使えないため、動的にスクリプトを実行）
importScripts(
    'settings.js',
    'context-menu.js', 
    'window-manager.js',
    'content-script-manager.js'
);

// 初期化フラグ
let initialLoadComplete = false;
let isInitializing = true;

// 設定が確実に初期化されるようにデフォルト値を設定
if (!globalThis.currentSettings) {
    globalThis.currentSettings = { openMode: 'window' };
}

// アクションクリック時の処理
chrome.action.onClicked.addListener((tab) => {
    console.log('Action clicked, current mode:', globalThis.currentSettings?.openMode || 'undefined');
    console.log('Is initializing:', isInitializing);
    
    // 初期化中の場合は設定を再読み込みしてから処理
    if (isInitializing) {
        console.log('Extension is still initializing, reloading settings...');
        chrome.storage.local.get(['appSettings'], (result) => {
            globalThis.currentSettings = result.appSettings || globalThis.currentSettings;
            console.log('Reloaded settings during initialization:', globalThis.currentSettings);
            
                        // 設定を即座に適用
            globalThis.updateActionBehavior(globalThis.currentSettings);
            globalThis.updateContextMenu();
        });
        return;
    }
    
    // ポップアップモードの場合、このリスナーは呼ばれるべきではない
    if (globalThis.currentSettings?.openMode === 'popup') {
        console.error('ERROR: Action clicked in popup mode! Popup should have opened automatically.');
        console.log('Attempting to fix popup setting...');
        
        // ポップアップ設定を再適用
        globalThis.updateActionBehavior(globalThis.currentSettings);
        return;
    }

    try {
        // 統一された関数を使用してカウンターを開く
        globalThis.openCounterWithCurrentSettings();
    } catch (error) {
        console.error('Action click error:', error);
    }
});

// コンテキストメニューのクリック処理
chrome.contextMenus.onClicked.addListener((info, tab) => {
    console.log('=== Context menu clicked ===');
    console.log('Menu ID:', info.menuItemId);
    console.log('Current settings at click time:', globalThis.currentSettings);
    console.log('Selected text:', info.selectionText || 'none');
    
    // 設定が未定義の場合は読み込み直す
    if (!globalThis.currentSettings) {
        console.log('⚠️ Settings undefined, loading from storage...');
        chrome.storage.local.get(['appSettings'], (result) => {
            globalThis.currentSettings = result.appSettings || { openMode: 'window' };
            console.log('🔄 Settings reloaded:', globalThis.currentSettings);
            // 設定読み込み後に再度処理を実行
            processContextMenuClick(info, tab);
        });
        return;
    }
    
    processContextMenuClick(info, tab);
});

// コンテキストメニュークリックの実際の処理
function processContextMenuClick(info, tab) {
    
    try {
        if (info.menuItemId === "openPopupFromIcon") {
            // 拡張機能アイコンからの右クリックの場合は通常通りウィンドウを開く
            console.log('Opening counter from extension icon context menu');
            globalThis.openCounterWithCurrentSettings();
        } else if (info.menuItemId === "openPopupFromPage") {
            // ページ上での右クリックの場合
            console.log('🔍 DEBUG: openPopupFromPage triggered');
            console.log('🔍 DEBUG: currentSettings.openMode =', globalThis.currentSettings.openMode);
            console.log('🔍 DEBUG: Is popup mode?', globalThis.currentSettings.openMode === 'popup');
            
            if (globalThis.currentSettings.openMode === 'popup') {
                // popup モードの場合は常にページ内にインタラクティブカウンターを表示
                console.log('✅ Popup mode CONFIRMED: Showing interactive counter on page (no text)');
                globalThis.showInteractiveCounterOnCurrentPage(tab.id, '');
            } else {
                // その他のモードでは通常通りウィンドウを開く
                console.log('❌ Non-popup mode: Opening counter window (no text), mode was:', globalThis.currentSettings.openMode);
                globalThis.openCounterWithCurrentSettings();
            }
        } else if (info.menuItemId === "openPopupWithText") {
            const selectedText = info.selectionText || '';
            console.log('🔍 DEBUG: openPopupWithText triggered with text:', selectedText.substring(0, 30));
            console.log('🔍 DEBUG: currentSettings.openMode =', globalThis.currentSettings.openMode);
            console.log('🔍 DEBUG: Is popup mode?', globalThis.currentSettings.openMode === 'popup');
            
            if (globalThis.currentSettings.openMode === 'popup') {
                // popup モードの場合は常にページ内にインタラクティブカウンターを表示（選択テキスト入り）
                console.log('✅ Popup mode CONFIRMED: Showing interactive counter on page with selected text:', selectedText.substring(0, 50));
                globalThis.showInteractiveCounterOnCurrentPage(tab.id, selectedText);
            } else {
                // その他のモードでは通常通りウィンドウを開く
                console.log('❌ Non-popup mode: Opening counter window with selected text, mode was:', globalThis.currentSettings.openMode);
                globalThis.openCounterWithCurrentSettings(selectedText);
            }
        }
    } catch (error) {
        console.error('Context menu click error:', error);
    }
}

// メッセージ処理
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateSettings') {
        console.log('Received settings update:', message.settings);
        globalThis.currentSettings = message.settings;
        
        // 設定を即座に適用
        globalThis.updateActionBehavior(globalThis.currentSettings).then(() => {
            console.log('Action behavior updated successfully');
            globalThis.updateContextMenu();
            sendResponse({success: true});
        }).catch(error => {
            console.error('Error updating action behavior:', error);
            sendResponse({success: false, error: error.message});
        });
        
        return true; // 非同期応答を示す
    }
    
    if (message.action === 'getPopupStatus') {
        chrome.action.getPopup({}).then(popupUrl => {
            console.log('Current popup status requested, returning:', popupUrl);
            sendResponse({popupUrl: popupUrl});
        });
        return true; // 非同期応答のため
    }
    
    if (message.action === 'getHistory') {
        chrome.storage.local.get(['counterHistory'], (result) => {
            const history = result.counterHistory || [];
            console.log('History requested, returning:', history.length, 'items');
            sendResponse(history);
        });
        return true; // 非同期応答のため
    }
    
    if (message.action === 'saveHistory') {
        const history = message.history || [];
        chrome.storage.local.set({counterHistory: history}, () => {
            console.log('History saved:', history.length, 'items');
            sendResponse({success: true});
        });
        return true; // 非同期応答のため
    }
    
    if (message.action === 'getSettings') {
        chrome.storage.local.get(['appSettings'], (result) => {
            const settings = result.appSettings || {};
            console.log('📤 Settings requested from storage:', settings);
            console.log('📤 Current global settings:', globalThis.currentSettings);
            sendResponse(settings);
        });
        return true; // 非同期応答のため
    }
    
    if (message.action === 'saveSettings') {
        const settings = message.settings || {};
        console.log('💾 Saving new settings:', settings);
        chrome.storage.local.set({appSettings: settings}, () => {
            console.log('✅ Settings saved to storage:', settings);
            // 設定更新時は現在の設定も更新
            globalThis.currentSettings = settings;
            console.log('🔄 Updated global settings:', globalThis.currentSettings);
            globalThis.updateActionBehavior(globalThis.currentSettings);
            globalThis.updateContextMenu();
            sendResponse({success: true});
        });
        return true; // 非同期応答のため
    }
    
    return true; // 非同期レスポンスを示す
});

// ライフサイクルイベント
chrome.runtime.onInstalled.addListener(() => {
    console.log('🚀 Extension installed, checking existing settings...');
    // 初回インストール時にデフォルト設定を保存
    chrome.storage.local.get(['appSettings'], (result) => {
        console.log('🔍 Existing settings on install:', result);
        
        if (!result.appSettings) {
            const defaultSettings = {
                openMode: 'window'
            };
            console.log('💾 Saving default settings:', defaultSettings);
            chrome.storage.local.set({appSettings: defaultSettings}, () => {
                globalThis.currentSettings = defaultSettings;
                console.log('✅ Default settings saved and applied:', defaultSettings);
                globalThis.updateActionBehavior(globalThis.currentSettings);
                globalThis.updateContextMenu();
            });
        } else {
            console.log('📖 Existing settings found, loading...');
            globalThis.loadSettings();
        }
    });
});

chrome.runtime.onStartup.addListener(() => {
    console.log('Extension startup, loading settings...');
    // 少し遅延を入れて初期化処理の競合を避ける
    setTimeout(() => {
        globalThis.loadSettings();
    }, 200);
});

// サービスワーカーの初期化時の設定読み込み（一度だけ実行）
if (typeof chrome !== 'undefined' && chrome.runtime && !initialLoadComplete) {
    console.log('Service worker initialized, loading settings...');
    initialLoadComplete = true;
    
    // 初期化完了まで少し長めの時間を取る
    setTimeout(() => {
        globalThis.loadSettings();
        // 初期化完了後にフラグをfalseに
        setTimeout(() => {
            isInitializing = false;
            console.log('Initialization completed');
            console.log('Final settings after initialization:', globalThis.currentSettings);
        }, 500);
    }, 200);
}
