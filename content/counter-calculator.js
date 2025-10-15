// content/counter-calculator.js - 文字数カウント計算ロジック
(function(global) {
    'use strict';
    console.log('🔧 counter-calculator.js module executing...');
    
    // 文字数カウント計算
    function calculateCounts(text) {
        // 基本的な文字数カウント
        const charCount = text.length;
        const charCountNoSpaces = text.replace(/\s/g, '').length;
        
        // 単語数カウント（日本語と英語の両方に対応）
        let wordCount = 0;
        if (text.trim()) {
            // 英語の単語（空白区切り）
            const englishWords = text.match(/[a-zA-Z]+/g) || [];
            // 日本語の文字（ひらがな、カタカナ、漢字）
            const japaneseChars = text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || [];
            // 数字
            const numbers = text.match(/\d+/g) || [];
            
            wordCount = englishWords.length + japaneseChars.length + numbers.length;
        }
        
        // 行数カウント
        const lineCount = text ? text.split('\n').length : 0;
        
        // 段落数カウント（空行で区切られたブロック）
        const paragraphCount = text ? text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length : 0;
        
        return {
            charCount,
            charCountNoSpaces,
            wordCount,
            lineCount,
            paragraphCount
        };
    }
    
    // カウント結果をHTMLに反映
    function updateCountDisplay(element, counts) {
        const charCountEl = element.querySelector('#charCount');
        const charCountNoSpacesEl = element.querySelector('#charCountNoSpaces');
        const wordCountEl = element.querySelector('#wordCount');
        const lineCountEl = element.querySelector('#lineCount');
        const paragraphCountEl = element.querySelector('#paragraphCount');
        
        if (charCountEl) charCountEl.textContent = counts.charCount.toLocaleString();
        if (charCountNoSpacesEl) charCountNoSpacesEl.textContent = counts.charCountNoSpaces.toLocaleString();
        if (wordCountEl) wordCountEl.textContent = counts.wordCount.toLocaleString();
        if (lineCountEl) lineCountEl.textContent = counts.lineCount.toLocaleString();
        if (paragraphCountEl) paragraphCountEl.textContent = counts.paragraphCount.toLocaleString();
    }
    
    // テキストエリアの値変更時のハンドラー
    function handleTextChange(element) {
        const textarea = element.querySelector('#textArea');
        if (!textarea) return;
        
        const text = textarea.value;
        const counts = calculateCounts(text);
        updateCountDisplay(element, counts);
    }
    
    // グローバルオブジェクトに関数を登録
    global.calculateCounts = calculateCounts;
    global.updateCountDisplay = updateCountDisplay;
    global.handleTextChange = handleTextChange;
    
    console.log('✅ counter-calculator.js functions registered:', ['calculateCounts', 'updateCountDisplay', 'handleTextChange']);
    console.log('🔍 handleTextChange available:', typeof global.handleTextChange === 'function');
    
})(window.CounterExtension = window.CounterExtension || {});
