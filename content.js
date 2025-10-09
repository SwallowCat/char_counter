// セキュアなコンテンツスクリプトの例
(function() {
    'use strict';
    
    // 外部からの不正な操作を防ぐ
    if (window.hasRun) {
        return;
    }
    window.hasRun = true;
    
    // 安全なDOM操作のみ実行
    function safeGetPageText() {
        try {
            // XSS攻撃を防ぐため、innerHTML ではなく textContent を使用
            const textElements = document.querySelectorAll('p, div, span, h1, h2, h3, h4, h5, h6');
            let totalText = '';
            
            textElements.forEach(element => {
                // textContent を使用して安全にテキストを取得
                totalText += element.textContent || '';
            });
            
            return totalText;
        } catch (error) {
            console.error('Error getting page text:', error);
            return '';
        }
    }
    
    // メッセージリスナー（popup.js からの安全な通信）
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'getPageText') {
            const pageText = safeGetPageText();
            const charCount = pageText.replace(/\s+/g, '').length;
            
            sendResponse({
                text: pageText,
                charCount: charCount,
                wordCount: pageText.split(/\s+/).filter(word => word.length > 0).length
            });
        }
    });
    
})();
