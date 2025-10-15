// background/context-menu.js - コンテキストメニュー管理

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

// Service Worker用のグローバル登録
globalThis.updateContextMenu = updateContextMenu;
