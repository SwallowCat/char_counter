// background/content-script-manager.js - コンテンツスクリプト管理

// ページ上にインタラクティブな文字数カウンターを表示する関数
function showInteractiveCounterOnCurrentPage(tabId, initialText = '') {
    console.log('🎮 showInteractiveCounterOnCurrentPage called with tabId:', tabId, 'initialText:', initialText.substring(0, 50));
    
    // 現在のタブ情報を取得してページタイプを確認
    chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
            console.log('❌ Cannot get tab info, opening fallback window');
            globalThis.openCounterWithCurrentSettings(initialText);
            return;
        }
        
        const url = tab.url;
        console.log('📄 Current page URL:', url);
        
        // Chrome特殊ページかどうかをチェック
        if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('edge://') || url.startsWith('about:')) {
            console.log('⚠️ Chrome special page detected - Content scripts not allowed');
            console.log('🔄 Auto-fallback: Opening in new window (Chrome restriction)');
            globalThis.openCounterWithCurrentSettings(initialText);
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
                        console.log('🔄 Fallback: Opening window with initial text');
                        globalThis.openCounterWithCurrentSettings(initialText);
                        return;
                    }
                    
                    console.log('✅ Content script injected successfully');
                    
                    // 注入後少し待ってから再度ping
                    setTimeout(() => {
                        chrome.tabs.sendMessage(tabId, {action: 'ping'}, (retryPingResponse) => {
                            if (chrome.runtime.lastError) {
                                console.log('❌ Content script still not responding after injection');
                                console.log('🔄 Fallback: Opening window with initial text');
                                globalThis.openCounterWithCurrentSettings(initialText);
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
                                    globalThis.openCounterWithCurrentSettings(initialText);
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
                    globalThis.openCounterWithCurrentSettings(initialText);
                } else {
                    console.log('✅ Interactive counter displayed on page successfully, response:', response);
                }
            });
        });
    });
}

// Service Worker用のグローバル登録
globalThis.showInteractiveCounterOnCurrentPage = showInteractiveCounterOnCurrentPage;
