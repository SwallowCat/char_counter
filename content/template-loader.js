// content/template-loader.js - HTMLテンプレートの読み込みと処理
(function(global) {
    'use strict';
    console.log('🔧 template-loader.js module executing...');
    
    // テンプレートローダー
    async function loadInteractiveCounterTemplate(initialText = '') {
        try {
            // テンプレートをfetchで読み込み
            const response = await fetch(chrome.runtime.getURL('templates/interactive-counter.html'));
            let template = await response.text();
            
            // プレースホルダーを置換
            template = template.replace('{{initialText}}', initialText);
            
            return template;
        } catch (error) {
            console.error('Error loading template:', error);
            // フォールバック: 直接HTMLを返す
            return getFallbackHTML(initialText);
        }
    }
    
    // フォールバック用のHTML（元のhardcoded HTMLを使用）
    function getFallbackHTML(initialText = '') {
        return `
            <div id="extension-interactive-counter" style="position: fixed; top: 20px; right: 20px; z-index: 2147483647; width: 400px; height: auto; max-height: 80vh; overflow-y: auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.4;">
                <div style="padding: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h2 style="margin: 0; font-size: 18px; font-weight: 600;">文字数カウンター</h2>
                        <button id="closeButton" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;">×</button>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <textarea id="textArea" placeholder="ここにテキストを入力してください..." style="width: 100%; height: 120px; padding: 10px; border: none; border-radius: 8px; resize: vertical; font-size: 14px; font-family: inherit; box-sizing: border-box;">${initialText}</textarea>
                    </div>
                    
                    <div id="countInfo" style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 8px; margin-bottom: 15px; font-size: 13px;">
                        <div>文字数: <span id="charCount">0</span> 文字</div>
                        <div>文字数（空白なし）: <span id="charCountNoSpaces">0</span> 文字</div>
                        <div>単語数: <span id="wordCount">0</span> 語</div>
                        <div>行数: <span id="lineCount">0</span> 行</div>
                        <div>段落数: <span id="paragraphCount">0</span> 段落</div>
                    </div>
                    
                    <div style="display: flex; gap: 8px; margin-bottom: 15px; flex-wrap: wrap;">
                        <button id="clearButton" style="flex: 1; padding: 8px 12px; background: rgba(255,255,255,0.2); border: none; color: white; border-radius: 6px; cursor: pointer; font-size: 12px; min-width: 60px;">クリア</button>
                        <button id="copyButton" style="flex: 1; padding: 8px 12px; background: rgba(255,255,255,0.2); border: none; color: white; border-radius: 6px; cursor: pointer; font-size: 12px; min-width: 60px;">コピー</button>
                        <button id="pasteButton" style="flex: 1; padding: 8px 12px; background: rgba(255,255,255,0.2); border: none; color: white; border-radius: 6px; cursor: pointer; font-size: 12px; min-width: 60px;">貼付</button>
                        <button id="saveButton" style="flex: 1; padding: 8px 12px; background: rgba(255,255,255,0.2); border: none; color: white; border-radius: 6px; cursor: pointer; font-size: 12px; min-width: 60px;">保存</button>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <button id="historyToggle" style="width: 100%; padding: 10px; background: rgba(255,255,255,0.2); border: none; color: white; border-radius: 6px; cursor: pointer; font-size: 13px;">履歴を表示 ▼</button>
                    </div>
                    
                    <div id="historySection" style="display: none;">
                        <div style="margin-bottom: 10px;">
                            <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                                <button id="clearHistoryButton" style="flex: 1; padding: 6px 10px; background: rgba(220, 53, 69, 0.8); border: none; color: white; border-radius: 4px; cursor: pointer; font-size: 11px;">履歴をクリア</button>
                            </div>
                        </div>
                        
                        <div id="historyList" style="max-height: 200px; overflow-y: auto; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; padding: 8px;">
                            <div style="text-align: center; color: rgba(255,255,255,0.7); font-size: 12px;">履歴がありません</div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 15px;">
                        <button id="settingsToggle" style="width: 100%; padding: 10px; background: rgba(255,255,255,0.2); border: none; color: white; border-radius: 6px; cursor: pointer; font-size: 13px;">設定 ⚙️</button>
                    </div>
                    
                    <div id="settingsSection" style="display: none; margin-top: 15px;">
                        <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px;">
                            <h3 style="margin: 0 0 10px 0; font-size: 14px;">拡張機能の動作設定</h3>
                            <div style="margin-bottom: 10px;">
                                <label style="display: block; margin-bottom: 5px; font-size: 12px;">アイコンクリック時の動作:</label>
                                <select id="openModeSelect" style="width: 100%; padding: 8px; border: none; border-radius: 4px; font-size: 12px;">
                                    <option value="popup">ポップアップ</option>
                                    <option value="window">新しいウィンドウ</option>
                                    <option value="tab">新しいタブ</option>
                                </select>
                            </div>
                            <div style="display: flex; gap: 8px; margin-top: 15px;">
                                <button id="saveSettingsButton" style="flex: 1; padding: 8px; background: rgba(40, 167, 69, 0.8); border: none; color: white; border-radius: 4px; cursor: pointer; font-size: 12px;">保存</button>
                                <button id="cancelSettingsButton" style="flex: 1; padding: 8px; background: rgba(108, 117, 125, 0.8); border: none; color: white; border-radius: 4px; cursor: pointer; font-size: 12px;">キャンセル</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // グローバルオブジェクトに関数を登録
    global.loadInteractiveCounterTemplate = loadInteractiveCounterTemplate;
    
    console.log('✅ template-loader.js functions registered:', ['loadInteractiveCounterTemplate']);
    console.log('🔍 loadInteractiveCounterTemplate available:', typeof global.loadInteractiveCounterTemplate === 'function');
    
})(window.CounterExtension = window.CounterExtension || {});
