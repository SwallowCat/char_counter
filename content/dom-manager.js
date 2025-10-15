// content/dom-manager.js - DOM操作とページ情報の管理
(function(global) {
    'use strict';
    console.log('🔧 dom-manager.js module executing...');
    
    // ページのテキストを安全に取得
    function safeGetPageText() {
        try {
            // XSS攻撃を防ぐため、innerHTML ではなく textContent を使用
            const textElements = document.querySelectorAll('p, div, span, h1, h2, h3, h4, h5, h6, article, section');
            let totalText = '';
            
            textElements.forEach(element => {
                // textContent を使用して安全にテキストを取得
                const text = element.textContent || '';
                if (text.trim().length > 0) {
                    totalText += text + ' ';
                }
            });
            
            return totalText.trim();
        } catch (error) {
            console.error('Error getting page text:', error);
            return '';
        }
    }
    
    // 選択されたテキストを取得
    function getSelectedText() {
        try {
            return window.getSelection().toString().trim();
        } catch (error) {
            console.error('Error getting selected text:', error);
            return '';
        }
    }
    
    // Chrome拡張機能の特別なページかどうかを判定
    function isChromeExtensionPage() {
        const url = window.location.href;
        return url.startsWith('chrome-extension://') || url.startsWith('chrome://') || url.startsWith('moz-extension://');
    }
    
    // インタラクティブカウンターをページに表示
    function showInteractiveCounter(html) {
        // 既存のカウンターを削除
        removeInteractiveCounter();
        
        // 新しい要素を作成
        const counterElement = document.createElement('div');
        counterElement.innerHTML = html;
        
        // ページに追加
        document.body.appendChild(counterElement);
        
        return counterElement.firstElementChild;
    }
    
    // インタラクティブカウンターを削除
    function removeInteractiveCounter() {
        const existingCounter = document.getElementById('extension-interactive-counter');
        if (existingCounter) {
            existingCounter.remove();
        }
    }
    
    // カウンター要素が存在するかチェック
    function hasInteractiveCounter() {
        return document.getElementById('extension-interactive-counter') !== null;
    }
    
    // 要素の可視性をチェック
    function isElementVisible(element) {
        if (!element) return false;
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    }
    
    // ドキュメントの読み込み状態をチェック
    function isDocumentReady() {
        return document.readyState === 'complete' || document.readyState === 'interactive';
    }
    
    // グローバルオブジェクトに関数を登録
    global.safeGetPageText = safeGetPageText;
    global.getSelectedText = getSelectedText;
    global.isChromeExtensionPage = isChromeExtensionPage;
    global.showInteractiveCounter = showInteractiveCounter;
    global.removeInteractiveCounter = removeInteractiveCounter;
    global.hasInteractiveCounter = hasInteractiveCounter;
    global.isElementVisible = isElementVisible;
    global.isDocumentReady = isDocumentReady;
    
    console.log('✅ dom-manager.js functions registered:', ['safeGetPageText', 'getSelectedText', 'isChromeExtensionPage', 'showInteractiveCounter', 'removeInteractiveCounter', 'hasInteractiveCounter', 'isElementVisible', 'isDocumentReady']);
    
})(window.CounterExtension = window.CounterExtension || {});
