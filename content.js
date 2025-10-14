// Content Script - ページ上での右クリックメニュー機能をサポート
(function() {
    'use strict';
    
    console.log('🚀 Counter Extension Content Script loaded on:', window.location.href);
    
    // 外部からの不正な操作を防ぐ
    if (window.hasCounterExtensionRun) {
        console.log('⚠️ Content script already running, skipping...');
        return;
    }
    window.hasCounterExtensionRun = true;
    
    // 安全にページのテキストを取得する関数
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
    
    // 選択されたテキストを取得する関数
    function getSelectedText() {
        try {
            return window.getSelection().toString().trim();
        } catch (error) {
            console.error('Error getting selected text:', error);
            return '';
        }
    }
    
    // ページ上に文字数カウント結果を表示するための変数
    let counterResultElement = null;
    let interactiveCounterElement = null;
    
    // インタラクティブな文字数カウンターをページ上に表示
    function showInteractiveCounterOnPage(initialText = '') {
        console.log('🎮 showInteractiveCounterOnPage called with initialText:', initialText.substring(0, 50));
        
        try {
            // 既存の表示を削除
            hideCounterResult();
            hideInteractiveCounter();
            console.log('🧹 Previous displays cleared');
            
            // インタラクティブカウンター要素を作成
            interactiveCounterElement = document.createElement('div');
            interactiveCounterElement.id = 'chrome-interactive-counter';
            interactiveCounterElement.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #ffffff;
                border: 2px solid #4285f4;
                border-radius: 8px;
                padding: 15px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                color: #333;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                width: 400px;
                max-height: 600px;
                overflow-y: auto;
            `;
            
            console.log('📦 Interactive counter element created');
            
            // カウンターのHTML内容を作成
            const counterHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div style="font-weight: bold; color: #4285f4; font-size: 16px;">
                        ✏️ 文字数カウンター
                    </div>
                    <button id="close-counter" style="background: #f44336; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 12px;">
                        ✕
                    </button>
                </div>
                
                <textarea id="counter-textarea" placeholder="文章を入力してください..." style="
                    width: 100%;
                    height: 150px;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-family: inherit;
                    font-size: 13px;
                    resize: vertical;
                    box-sizing: border-box;
                    margin-bottom: 10px;
                ">${initialText}</textarea>
                
                <div style="display: flex; gap: 5px; margin-bottom: 10px;">
                    <button id="clear-text" style="background: #ff9800; color: white; border: none; border-radius: 3px; padding: 5px 10px; cursor: pointer; font-size: 12px;">
                        Clear
                    </button>
                    <button id="copy-text" style="background: #2196f3; color: white; border: none; border-radius: 3px; padding: 5px 10px; cursor: pointer; font-size: 12px;">
                        Copy
                    </button>
                    <button id="paste-text" style="background: #4caf50; color: white; border: none; border-radius: 3px; padding: 5px 10px; cursor: pointer; font-size: 12px;">
                        Paste
                    </button>
                </div>
                
                <div id="counter-results" style="
                    background: #f8f9fa;
                    padding: 10px;
                    border-radius: 4px;
                    border: 1px solid #e9ecef;
                    margin-bottom: 10px;
                ">
                    <div style="font-weight: bold; margin-bottom: 8px; color: #495057;">📊 カウント結果</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;">
                        <div><strong>文字数:</strong> <span id="char-count">0</span></div>
                        <div><strong>空白除く:</strong> <span id="char-count-no-spaces">0</span></div>
                        <div><strong>バイト数:</strong> <span id="byte-count">0</span></div>
                        <div><strong>行数:</strong> <span id="line-count">1</span></div>
                    </div>
                </div>
                
                <div style="font-size: 11px; color: #666; text-align: center; border-top: 1px solid #eee; padding-top: 8px;">
                    リアルタイムで文字数をカウント • ✕ボタンで閉じる
                </div>
            `;
            
            interactiveCounterElement.innerHTML = counterHTML;
            console.log('📝 Interactive HTML content set');
            
            // イベントリスナーを追加
            setupInteractiveCounterEvents();
            
            // ページに追加
            document.body.appendChild(interactiveCounterElement);
            console.log('✅ Interactive counter element added to page');
            
            // 初期カウントを実行
            updateCharacterCount();
            
        } catch (error) {
            console.error('❌ Error in showInteractiveCounterOnPage:', error);
        }
    }
    
    // インタラクティブカウンターのイベントリスナーを設定
    function setupInteractiveCounterEvents() {
        const textarea = interactiveCounterElement.querySelector('#counter-textarea');
        const closeBtn = interactiveCounterElement.querySelector('#close-counter');
        const clearBtn = interactiveCounterElement.querySelector('#clear-text');
        const copyBtn = interactiveCounterElement.querySelector('#copy-text');
        const pasteBtn = interactiveCounterElement.querySelector('#paste-text');
        
        // テキスト変更時にリアルタイムでカウント更新
        textarea.addEventListener('input', updateCharacterCount);
        textarea.addEventListener('keyup', updateCharacterCount);
        textarea.addEventListener('paste', () => setTimeout(updateCharacterCount, 10));
        
        // 閉じるボタン
        closeBtn.addEventListener('click', hideInteractiveCounter);
        
        // クリアボタン
        clearBtn.addEventListener('click', () => {
            textarea.value = '';
            updateCharacterCount();
            textarea.focus();
        });
        
        // コピーボタン
        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(textarea.value);
                copyBtn.textContent = '✓ Copied';
                setTimeout(() => {
                    copyBtn.textContent = 'Copy';
                }, 1000);
            } catch (error) {
                console.error('Copy failed:', error);
            }
        });
        
        // ペーストボタン
        pasteBtn.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                textarea.value = text;
                updateCharacterCount();
                textarea.focus();
            } catch (error) {
                console.error('Paste failed:', error);
            }
        });
        
        console.log('🎛️ Interactive counter events set up');
    }
    
    // 文字数カウントを更新
    function updateCharacterCount() {
        const textarea = interactiveCounterElement?.querySelector('#counter-textarea');
        if (!textarea) return;
        
        const text = textarea.value;
        const charCount = text.length;
        const charCountNoSpaces = text.replace(/\s/g, '').length;
        const byteCount = new Blob([text]).size;
        const lineCount = text.split('\n').length;
        
        // 結果を表示
        const charCountEl = interactiveCounterElement.querySelector('#char-count');
        const charCountNoSpacesEl = interactiveCounterElement.querySelector('#char-count-no-spaces');
        const byteCountEl = interactiveCounterElement.querySelector('#byte-count');
        const lineCountEl = interactiveCounterElement.querySelector('#line-count');
        
        if (charCountEl) charCountEl.textContent = charCount.toLocaleString();
        if (charCountNoSpacesEl) charCountNoSpacesEl.textContent = charCountNoSpaces.toLocaleString();
        if (byteCountEl) byteCountEl.textContent = byteCount.toLocaleString();
        if (lineCountEl) lineCountEl.textContent = lineCount.toLocaleString();
    }
    
    // インタラクティブカウンターを非表示にする
    function hideInteractiveCounter() {
        if (interactiveCounterElement && interactiveCounterElement.parentNode) {
            interactiveCounterElement.parentNode.removeChild(interactiveCounterElement);
            interactiveCounterElement = null;
            console.log('🙈 Interactive counter hidden');
        }
    }
    
    // ページ上に文字数カウント結果を表示（シンプル版）
    function showCounterResultOnPage(data) {
        console.log('🎨 showCounterResultOnPage called with data:', data);
        
        try {
            // 既存の結果表示を削除
            hideCounterResult();
            console.log('🧹 Previous result cleared');
            
            // 結果表示用の要素を作成
            counterResultElement = document.createElement('div');
            counterResultElement.id = 'chrome-counter-result';
            counterResultElement.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #ffffff;
                border: 2px solid #4285f4;
                border-radius: 8px;
                padding: 15px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                color: #333;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                max-width: 320px;
                min-width: 250px;
            `;
            
            console.log('📦 Counter element created');
            
            // タイトル部分を選択テキストかページテキストかで変更
            const titleText = data.isPageText ? '📄 ページ全体の文字数' : '✂️ 選択テキストの文字数';
            
            // テキストプレビュー（最初の50文字）
            const textPreview = data.text ? 
                (data.text.length > 50 ? data.text.substring(0, 50) + '...' : data.text) : '';
            
            // 結果のHTML内容を作成
            const resultHTML = `
                <div style="font-weight: bold; margin-bottom: 10px; color: #4285f4;">
                    ${titleText}
                </div>
                ${textPreview ? `
                    <div style="margin-bottom: 8px; font-size: 12px; color: #666; font-style: italic; border-left: 3px solid #4285f4; padding-left: 8px;">
                        "${textPreview}"
                    </div>
                ` : ''}
                <div style="margin-bottom: 6px;">
                    <strong>文字数:</strong> ${data.charCount.toLocaleString()}
                </div>
                <div style="margin-bottom: 6px;">
                    <strong>文字数(空白除く):</strong> ${data.charCountNoSpaces.toLocaleString()}
                </div>
                <div style="margin-bottom: 6px;">
                    <strong>バイト数:</strong> ${data.byteCount.toLocaleString()}
                </div>
                <div style="margin-bottom: 10px;">
                    <strong>行数:</strong> ${data.lineCount.toLocaleString()}
                </div>
                <div style="font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 6px; margin-top: 8px; text-align: center;">
                    クリックして閉じる • 7秒で自動的に閉じます
                </div>
            `;
            
            counterResultElement.innerHTML = resultHTML;
            console.log('📝 HTML content set');
            
            // クリックで閉じる機能
            counterResultElement.addEventListener('click', hideCounterResult);
            console.log('👆 Click handler attached');
            
            // 7秒後に自動で閉じる
            setTimeout(() => {
                hideCounterResult();
            }, 7000);
            console.log('⏰ Auto-hide timer set');
            
            // ページに追加
            document.body.appendChild(counterResultElement);
            console.log('✅ Counter result element added to page');
            
        } catch (error) {
            console.error('❌ Error in showCounterResultOnPage:', error);
        }
    }
    
    // 結果表示を非表示にする
    function hideCounterResult() {
        if (counterResultElement && counterResultElement.parentNode) {
            counterResultElement.parentNode.removeChild(counterResultElement);
            counterResultElement = null;
        }
    }

    // Background scriptからのメッセージを受信
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('🔥 Content script received message:', request.action, request);
        
        try {
            if (request.action === 'ping') {
                console.log('🏓 Pong! Content script is ready');
                sendResponse({ready: true});
            } else if (request.action === 'getPageText') {
                console.log('📄 Getting page text...');
                const pageText = safeGetPageText();
                const selectedText = getSelectedText();
                const charCount = pageText.replace(/\s+/g, '').length;
                const wordCount = pageText.split(/\s+/).filter(word => word.length > 0).length;
                
                const response = {
                    text: pageText,
                    selectedText: selectedText,
                    charCount: charCount,
                    wordCount: wordCount,
                    url: window.location.href,
                    title: document.title
                };
                
                console.log('📄 Page text response:', {
                    textLength: pageText.length,
                    selectedTextLength: selectedText.length,
                    charCount,
                    wordCount
                });
                
                sendResponse(response);
            } else if (request.action === 'showCounterResult') {
                console.log('🎯 Showing counter result on page with data:', request.data);
                showCounterResultOnPage(request.data);
                sendResponse({success: true});
            } else if (request.action === 'hideCounterResult') {
                console.log('🙈 Hiding counter result');
                hideCounterResult();
                sendResponse({success: true});
            } else if (request.action === 'showInteractiveCounter') {
                console.log('🎮 Showing interactive counter with initial text:', request.initialText?.substring(0, 50) || 'none');
                showInteractiveCounterOnPage(request.initialText || '');
                sendResponse({success: true});
            } else if (request.action === 'hideInteractiveCounter') {
                console.log('🙈 Hiding interactive counter');
                hideInteractiveCounter();
                sendResponse({success: true});
            } else {
                console.log('❓ Unknown action:', request.action);
            }
        } catch (error) {
            console.error('❌ Content script message error:', error);
            sendResponse({error: error.message});
        }
        
        return true; // 非同期レスポンスを示す
    });
})();
