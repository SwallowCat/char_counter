// background.js - アイコンクリック時の動作を制御

chrome.action.onClicked.addListener((tab) => {
    try {
        // 最大化されたウィンドウで開く
        chrome.windows.create({
            url: chrome.runtime.getURL('popup.html'),
            type: 'normal',
            state: 'maximized'
        }, (window) => {
            if (chrome.runtime.lastError) {
                console.error('Window creation error:', chrome.runtime.lastError);
            }
        });
    } catch (error) {
        console.error('Action click error:', error);
        // フォールバック: 通常サイズで開く
        chrome.windows.create({
            url: chrome.runtime.getURL('popup.html'),
            type: 'normal',
            width: 1000,
            height: 700
        });
    }
});

// 右クリックでポップアップを開くオプション
chrome.runtime.onInstalled.addListener(() => {
    try {
        chrome.contextMenus.create({
            id: "openPopup",
            title: "文字数カウンターを開く",
            contexts: ["action"]
        }, () => {
            if (chrome.runtime.lastError) {
                console.error('Context menu creation error:', chrome.runtime.lastError);
            }
        });
    } catch (error) {
        console.error('Runtime onInstalled error:', error);
    }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    try {
        if (info.menuItemId === "openPopup") {
            chrome.tabs.create({
                url: chrome.runtime.getURL('popup.html')
            }, (tab) => {
                if (chrome.runtime.lastError) {
                    console.error('Tab creation error:', chrome.runtime.lastError);
                }
            });
        }
    } catch (error) {
        console.error('Context menu click error:', error);
    }
});
