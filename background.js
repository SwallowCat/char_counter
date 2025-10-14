// background.js - アイコンクリック時の動作を制御

let currentSettings = {
    openMode: 'window'
};

// 設定を読み込む
function loadSettings() {
    chrome.storage.local.get(['appSettings'], (result) => {
        currentSettings = result.appSettings || currentSettings;
        console.log('🔧 DEBUG: Loaded settings in background:', currentSettings);
        console.log('🔧 DEBUG: Settings openMode value:', currentSettings.openMode);
        console.log('🔧 DEBUG: Settings openMode type:', typeof currentSettings.openMode);
        updateActionBehavior(currentSettings);
        updateContextMenu();
    });
}

// アクションの動作を更新
async function updateActionBehavior(settings = currentSettings) {
  console.log('updateActionBehavior called with:', settings);
  
  try {
    if (settings.openMode === 'popup') {
      console.log('Setting popup mode - enabling popup');
      await chrome.action.setPopup({popup: 'popup.html'});
      
      // 設定後に少し待機してから確認
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 確認のため現在の設定を取得
      const currentPopup = await chrome.action.getPopup({});
      console.log('Popup set to:', currentPopup);
      
      const expectedUrl = chrome.runtime.getURL('popup.html');
      // ポップアップが正しく設定されているか検証
      if (currentPopup !== expectedUrl) {
        console.error('Popup setting failed! Expected:', expectedUrl, 'Got:', currentPopup);
        // リトライ
        console.log('Retrying popup setting...');
        await chrome.action.setPopup({popup: 'popup.html'});
        await new Promise(resolve => setTimeout(resolve, 50));
        const retryPopup = await chrome.action.getPopup({});
        console.log('Retry result:', retryPopup);
      } else {
        console.log('✅ Popup mode successfully enabled');
      }
    } else {
      console.log('Setting non-popup mode - disabling popup');
      await chrome.action.setPopup({popup: ''});
      
      // 設定後に少し待機してから確認
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // 確認のため現在の設定を取得
      const currentPopup = await chrome.action.getPopup({});
      console.log('Popup disabled, current value:', currentPopup);
      
      if (currentPopup !== '') {
        console.error('Popup disable failed! Expected empty string, got:', currentPopup);
      } else {
        console.log('✅ Popup mode successfully disabled');
      }
    }
  } catch (error) {
    console.error('Error in updateActionBehavior:', error);
  }
}

chrome.action.onClicked.addListener((tab) => {
    console.log('Action clicked, current mode:', currentSettings.openMode);
    console.log('Is initializing:', isInitializing);
    
    // 初期化中の場合は設定を再読み込みしてから処理
    if (isInitializing) {
        console.log('Extension is still initializing, reloading settings...');
        chrome.storage.local.get(['appSettings'], (result) => {
            currentSettings = result.appSettings || currentSettings;
            console.log('Reloaded settings during initialization:', currentSettings);
            
            // 設定を即座に適用
            updateActionBehavior(currentSettings).then(() => {
                console.log('Settings reapplied during initialization');
                // popup モードの場合は何もしない（ポップアップが開くはず）
                if (currentSettings.openMode !== 'popup') {
                    openCounterWithCurrentSettings();
                }
            });
        });
        return;
    }
    
    // ポップアップモードの場合、このリスナーは呼ばれるべきではない
    // もし呼ばれた場合は、ポップアップ設定に問題があることを示す
    if (currentSettings.openMode === 'popup') {
        console.error('ERROR: Action clicked in popup mode! Popup should have opened automatically.');
        console.log('Attempting to fix popup setting...');
        
        // ポップアップ設定を再適用
        updateActionBehavior(currentSettings);
        return;
    }

    try {
        // 統一された関数を使用してカウンターを開く
        openCounterWithCurrentSettings();
    } catch (error) {
        console.error('Action click error:', error);
    }
});

// 初期化時の処理
chrome.runtime.onInstalled.addListener(() => {
    // 初回インストール時にデフォルト設定を保存
    chrome.storage.local.get(['appSettings'], (result) => {
        if (!result.appSettings) {
            const defaultSettings = {
                openMode: 'window'
            };
            chrome.storage.local.set({appSettings: defaultSettings}, () => {
                currentSettings = defaultSettings;
                console.log('Default settings saved:', defaultSettings);
                updateActionBehavior(currentSettings);
                updateContextMenu();
            });
        } else {
            loadSettings();
        }
    });
});

chrome.runtime.onStartup.addListener(() => {
    console.log('Extension startup, loading settings...');
    // 少し遅延を入れて初期化処理の競合を避ける
    setTimeout(() => {
        loadSettings();
    }, 200);
});

// サービスワーカーの初期化時の設定読み込み（一度だけ実行）
let initialLoadComplete = false;
let isInitializing = true;

if (typeof chrome !== 'undefined' && chrome.runtime && !initialLoadComplete) {
    console.log('Service worker initialized, loading settings...');
    initialLoadComplete = true;
    
    // 初期化完了まで少し長めの時間を取る
    setTimeout(() => {
        loadSettings();
        // 初期化完了後にフラグをfalseに
        setTimeout(() => {
            isInitializing = false;
            console.log('Initialization completed');
        }, 500);
    }, 200);
}

// 設定変更メッセージの処理
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateSettings') {
        console.log('Received settings update:', message.settings);
        currentSettings = message.settings;
        
        // 設定を即座に適用
        updateActionBehavior(currentSettings).then(() => {
            console.log('Action behavior updated successfully');
            updateContextMenu();
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
    
    return true; // 非同期レスポンスを示す
});

// コンテキストメニューの更新
let isUpdatingContextMenu = false;

function updateContextMenu() {
    console.log('updateContextMenu called - context menus always enabled');
    
    // 既に更新処理中の場合はスキップ
    if (isUpdatingContextMenu) {
        console.log('Context menu update already in progress, skipping...');
        return;
    }
    
    isUpdatingContextMenu = true;
    
    try {
        chrome.contextMenus.removeAll(() => {
            if (chrome.runtime.lastError) {
                console.error('Error removing context menus:', chrome.runtime.lastError.message);
                isUpdatingContextMenu = false;
                return;
            }
            
            console.log('All context menus removed');
            console.log('Creating context menus...');
            
            // メニュー削除完了後、確実に遅延を入れてから作成
            setTimeout(() => {
                createContextMenus();
            }, 500); // より長い遅延
        });
    } catch (error) {
        console.error('Context menu update error:', error);
        isUpdatingContextMenu = false;
    }
}

// コンテキストメニューを個別に作成する関数
function createContextMenus() {
    let menusCreated = 0;
    const totalMenus = 3;
    
    // 全てのメニューが作成完了したら isUpdatingContextMenu をリセット
    function checkCompletion() {
        menusCreated++;
        if (menusCreated >= totalMenus) {
            isUpdatingContextMenu = false;
            console.log('All context menus creation completed');
        }
    }
    
    try {
        // 拡張機能アイコンの右クリックメニュー
        chrome.contextMenus.create({
            id: "openPopupFromIcon",
            title: "文字数カウンターを開く",
            contexts: ["action"]
        }, () => {
            if (chrome.runtime.lastError) {
                console.error('Action context menu creation error:', chrome.runtime.lastError.message);
            } else {
                console.log('Action context menu created successfully');
            }
            checkCompletion();
        });
        
        // ページ上の右クリックメニュー（Chrome特殊ページを除外）
        chrome.contextMenus.create({
            id: "openPopupFromPage",
            title: "文字数カウンターを開く",
            contexts: ["page"],
            documentUrlPatterns: [
                "http://*/*",
                "https://*/*",
                "file://*/*"
            ]
        }, () => {
            if (chrome.runtime.lastError) {
                console.error('Page context menu creation error:', chrome.runtime.lastError.message);
            } else {
                console.log('Page context menu created successfully (restricted to normal pages)');
            }
            checkCompletion();
        });

        // 選択されたテキストがある場合の専用メニュー（Chrome特殊ページを除外）
        chrome.contextMenus.create({
            id: "openPopupWithText",
            title: "選択したテキストで文字数カウンターを開く",
            contexts: ["selection"],
            documentUrlPatterns: [
                "http://*/*",
                "https://*/*",
                "file://*/*"
            ]
        }, () => {
            if (chrome.runtime.lastError) {
                console.error('Selection context menu creation error:', chrome.runtime.lastError.message);
            } else {
                console.log('Selection context menu created successfully (restricted to normal pages)');
            }
            checkCompletion();
        });
        
    } catch (error) {
        console.error('Error creating context menus:', error);
        isUpdatingContextMenu = false;
    }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
    console.log('=== Context menu clicked ===');
    console.log('Menu ID:', info.menuItemId);
    console.log('Current settings at click time:', currentSettings);
    console.log('Selected text:', info.selectionText || 'none');
    
    try {
        if (info.menuItemId === "openPopupFromIcon") {
            // 拡張機能アイコンからの右クリックの場合は通常通りウィンドウを開く
            console.log('Opening counter from extension icon context menu');
            openCounterWithCurrentSettings();
        } else if (info.menuItemId === "openPopupFromPage") {
            // ページ上での右クリックの場合
            console.log('🔍 DEBUG: openPopupFromPage triggered');
            console.log('🔍 DEBUG: currentSettings.openMode =', currentSettings.openMode);
            console.log('🔍 DEBUG: Is popup mode?', currentSettings.openMode === 'popup');
            
            if (currentSettings.openMode === 'popup') {
                // popup モードの場合は常にページ内にインタラクティブカウンターを表示
                console.log('✅ Popup mode CONFIRMED: Showing interactive counter on page (no text)');
                showInteractiveCounterOnCurrentPage(tab.id, '');
            } else {
                // その他のモードでは通常通りウィンドウを開く
                console.log('❌ Non-popup mode: Opening counter window (no text), mode was:', currentSettings.openMode);
                openCounterWithCurrentSettings();
            }
        } else if (info.menuItemId === "openPopupWithText") {
            const selectedText = info.selectionText || '';
            console.log('🔍 DEBUG: openPopupWithText triggered with text:', selectedText.substring(0, 30));
            console.log('🔍 DEBUG: currentSettings.openMode =', currentSettings.openMode);
            console.log('🔍 DEBUG: Is popup mode?', currentSettings.openMode === 'popup');
            
            if (currentSettings.openMode === 'popup') {
                // popup モードの場合は常にページ内にインタラクティブカウンターを表示（選択テキスト入り）
                console.log('✅ Popup mode CONFIRMED: Showing interactive counter on page with selected text:', selectedText.substring(0, 50));
                showInteractiveCounterOnCurrentPage(tab.id, selectedText);
            } else {
                // その他のモードでは通常通りウィンドウを開く
                console.log('❌ Non-popup mode: Opening counter window with selected text, mode was:', currentSettings.openMode);
                openCounterWithCurrentSettings(selectedText);
            }
        }
    } catch (error) {
        console.error('Context menu click error:', error);
    }
});

// 設定に応じてカウンターを開く関数
function openCounterWithCurrentSettings(initialText = '') {
    console.log('=== openCounterWithCurrentSettings called ===');
    console.log('Initial text:', initialText || 'none');
    console.log('Current settings in memory:', currentSettings);
    
    // 念のため最新の設定を読み込み直してから実行
    chrome.storage.local.get(['appSettings'], (result) => {
        const latestSettings = result.appSettings || currentSettings;
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

// ページ上に文字数カウント結果を直接表示する関数
function showCounterResultOnCurrentPage(tabId, selectedText = '') {
    console.log('🔥 showCounterResultOnCurrentPage called with tabId:', tabId, 'selectedText:', selectedText);
    
    // まず content script が応答するかテスト
    chrome.tabs.sendMessage(tabId, {action: 'ping'}, (pingResponse) => {
        if (chrome.runtime.lastError) {
            console.log('❌ Content script not responding, attempting to inject');
            console.log('Error:', chrome.runtime.lastError.message);
            
            // Content scriptを再注入を試行
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
            }, (injectionResults) => {
                if (chrome.runtime.lastError) {
                    console.log('❌ Content script injection failed, opening fallback window');
                    console.log('Injection error:', chrome.runtime.lastError.message);
                    openCounterWithCurrentSettings(selectedText);
                    return;
                }
                
                console.log('✅ Content script injected successfully for counter result');
                
                // 注入後少し待ってから処理続行
                setTimeout(() => {
                    proceedWithCounterResultDisplay(tabId, selectedText);
                }, 300);
            });
            
            return;
        }
        
        proceedWithCounterResultDisplay(tabId, selectedText);
    });
}

// カウンター結果表示の処理を分離
function proceedWithCounterResultDisplay(tabId, selectedText) {
    console.log('✅ Content script is ready, proceeding with display');
    
    if (selectedText) {
        console.log('📝 Processing selected text:', selectedText.substring(0, 50) + '...');
        // 選択されたテキストの文字数カウント
        const charCount = selectedText.length;
        const charCountNoSpaces = selectedText.replace(/\s/g, '').length;
        const byteCount = new Blob([selectedText]).size;
        const lineCount = selectedText.split('\n').length;
        
        const counterData = {
            text: selectedText,
            charCount: charCount,
            charCountNoSpaces: charCountNoSpaces,
            byteCount: byteCount,
            lineCount: lineCount
        };
        
        console.log('📊 Sending counter data to content script:', counterData);
        
        // content script に結果表示を依頼
        chrome.tabs.sendMessage(tabId, {
            action: 'showCounterResult',
            data: counterData
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('❌ Error showing result on page:', chrome.runtime.lastError.message);
                console.log('🔄 Fallback: Opening window with selected text');
                openCounterWithCurrentSettings(selectedText);
            } else {
                console.log('✅ Counter result displayed on page successfully, response:', response);
            }
        });
    } else {
        console.log('📄 No selected text, getting page text...');
        // テキストが選択されていない場合は、ページ全体のテキストを取得
        chrome.tabs.sendMessage(tabId, {
            action: 'getPageText'
        }, (response) => {
            if (chrome.runtime.lastError || !response) {
                console.error('❌ Error getting page text:', chrome.runtime.lastError?.message || 'No response');
                console.log('🔄 Fallback: Opening window without text');
                openCounterWithCurrentSettings();
                return;
            }
            
            console.log('📄 Page text received, length:', response.text?.length || 0);
            
            const pageText = response.text || '';
            const charCount = pageText.length;
            const charCountNoSpaces = pageText.replace(/\s/g, '').length;
            const byteCount = new Blob([pageText]).size;
            const lineCount = pageText.split('\n').length;
            
            const counterData = {
                text: pageText.substring(0, 100) + (pageText.length > 100 ? '...' : ''),
                charCount: charCount,
                charCountNoSpaces: charCountNoSpaces,
                byteCount: byteCount,
                lineCount: lineCount,
                isPageText: true
            };
            
            console.log('📊 Sending page counter data to content script:', counterData);
            
            // content script に結果表示を依頼
            chrome.tabs.sendMessage(tabId, {
                action: 'showCounterResult',
                data: counterData
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('❌ Error showing page result:', chrome.runtime.lastError.message);
                    console.log('🔄 Fallback: Opening window without text');
                    openCounterWithCurrentSettings();
                } else {
                    console.log('✅ Page counter result displayed successfully, response:', response);
                }
            });
        });
    }
}

// ページ上にインタラクティブな文字数カウンターを表示する関数
function showInteractiveCounterOnCurrentPage(tabId, initialText = '') {
    console.log('🎮 showInteractiveCounterOnCurrentPage called with tabId:', tabId, 'initialText:', initialText.substring(0, 50));
    
    // 現在のタブ情報を取得してページタイプを確認
    chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
            console.log('❌ Cannot get tab info, opening fallback window');
            openCounterWithCurrentSettings(initialText);
            return;
        }
        
        const url = tab.url;
        console.log('📄 Current page URL:', url);
        
        // Chrome特殊ページかどうかをチェック
        if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('edge://') || url.startsWith('about:')) {
            console.log('⚠️ Chrome special page detected - Content scripts not allowed');
            console.log('🔄 Auto-fallback: Opening in new window (Chrome restriction)');
            openCounterWithCurrentSettings(initialText);
            return;
        }
        
        // まず content script が応答するかテスト
        chrome.tabs.sendMessage(tabId, {action: 'ping'}, (pingResponse) => {
            if (chrome.runtime.lastError) {
                console.log('❌ Content script not responding - attempting to inject');
                console.log('Error:', chrome.runtime.lastError.message);
                
                // Content scriptを再注入を試行
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content.js']
                }, (injectionResults) => {
                    if (chrome.runtime.lastError) {
                        console.log('❌ Content script injection failed:', chrome.runtime.lastError.message);
                        console.log('� Fallback: Opening window with initial text');
                        openCounterWithCurrentSettings(initialText);
                        return;
                    }
                    
                    console.log('✅ Content script injected successfully');
                    
                    // 注入後少し待ってから再度ping
                    setTimeout(() => {
                        chrome.tabs.sendMessage(tabId, {action: 'ping'}, (retryPingResponse) => {
                            if (chrome.runtime.lastError) {
                                console.log('❌ Content script still not responding after injection');
                                console.log('🔄 Fallback: Opening window with initial text');
                                openCounterWithCurrentSettings(initialText);
                                return;
                            }
                            
                            console.log('✅ Content script is ready after injection, proceeding with display');
                            
                            // content script にインタラクティブカウンター表示を依頼
                            chrome.tabs.sendMessage(tabId, {
                                action: 'showInteractiveCounter',
                                initialText: initialText
                            }, (response) => {
                                if (chrome.runtime.lastError) {
                                    console.error('❌ Error showing interactive counter on page:', chrome.runtime.lastError.message);
                                    console.log('🔄 Fallback: Opening window with initial text');
                                    openCounterWithCurrentSettings(initialText);
                                } else {
                                    console.log('✅ Interactive counter displayed on page successfully after injection, response:', response);
                                }
                            });
                        });
                    }, 300); // 注入後に少し待機
                });
                
                return;
            }
            
            console.log('✅ Content script is ready for interactive counter, proceeding with display');
            
            // content script にインタラクティブカウンター表示を依頼
            chrome.tabs.sendMessage(tabId, {
                action: 'showInteractiveCounter',
                initialText: initialText
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('❌ Error showing interactive counter on page:', chrome.runtime.lastError.message);
                    console.log('🔄 Fallback: Opening window with initial text');
                    openCounterWithCurrentSettings(initialText);
                } else {
                    console.log('✅ Interactive counter displayed on page successfully, response:', response);
                }
            });
        });
    });
}
