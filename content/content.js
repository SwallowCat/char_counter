// content.js - メインコンテンツスクリプト（モジュール統合版）
(function() {
    'use strict';
    
    console.log('🚀 Counter Extension Content Script loaded on:', window.location.href);
    
    // 外部からの不正な操作を防ぐ
    if (window.hasCounterExtensionRun) {
        console.log('⚠️ Content script already running, skipping...');
        return;
    }
    window.hasCounterExtensionRun = true;
    
    // グローバル名前空間を初期化
    window.CounterExtension = window.CounterExtension || {};
    
    // モジュール読み込み状態の追跡
    let modulesLoaded = false;
    let pendingMessages = [];
    
    // モジュールがすでに読み込まれているかチェックして初期化
    function initializeModules() {
        try {
            console.log('🔍 Checking for preloaded modules...');
            console.log('🔍 Initial CounterExtension state:', window.CounterExtension);
            console.log('🔍 Available functions:', Object.keys(window.CounterExtension || {}));
            
            // 重要な関数が正しく読み込まれているか確認
            const requiredFunctions = ['showInteractiveCounterOnPage', 'loadInteractiveCounterTemplate', 'handleTextChange'];
            const missingFunctions = requiredFunctions.filter(fn => !window.CounterExtension?.[fn]);
            
            console.log('🔍 Function availability check:');
            requiredFunctions.forEach(fn => {
                const funcRef = window.CounterExtension?.[fn];
                console.log(`  - ${fn}: ${typeof funcRef} (${funcRef ? 'FOUND' : 'MISSING'})`);
            });
            
            if (missingFunctions.length > 0) {
                console.error('❌ Missing functions detected:', missingFunctions);
                console.error('📊 Current CounterExtension contents:', window.CounterExtension);
                throw new Error(`Missing required functions: ${missingFunctions.join(', ')}`);
            }
            
            console.log('✅ All required functions are available');
            console.log('📊 Available functions:', Object.keys(window.CounterExtension));
            
            // モジュール読み込み完了をマーク
            modulesLoaded = true;
            
            // メッセージリスナーを設定
            setupMessageListener();
            
            // 保留されていたメッセージを処理
            processPendingMessages();
            
        } catch (error) {
            console.error('❌ Failed to initialize content script modules:', error);
            console.error('Error details:', error.message, error.stack);
            console.error('Current CounterExtension state:', window.CounterExtension);
            // フォールバックとして基本機能のみ提供
            setupFallbackFunctionality();
        }
    }
    
    // 保留されたメッセージを処理する関数
    function processPendingMessages() {
        console.log('📬 Processing pending messages:', pendingMessages.length);
        
        pendingMessages.forEach(({ message, sender, sendResponse }) => {
            handleMessage(message, sender, sendResponse);
        });
        
        pendingMessages = []; // クリア
    }
    
    // インタラクティブカウンター表示の再試行機能
    function showInteractiveCounterWithRetry(initialText, sendResponse, retryCount) {
        const maxRetries = 5;
        const retryDelay = 200; // 200ms
        
        console.log(`🔄 Attempt ${retryCount + 1}/${maxRetries + 1} to show interactive counter`);
        console.log('🔍 Current CounterExtension object:', window.CounterExtension);
        console.log('🔍 Available functions:', Object.keys(window.CounterExtension || {}));
        console.log('🔍 showInteractiveCounterOnPage exists?', typeof window.CounterExtension?.showInteractiveCounterOnPage);
        
        if (window.CounterExtension?.showInteractiveCounterOnPage) {
            console.log('✅ Function available, showing interactive counter');
            try {
                window.CounterExtension.showInteractiveCounterOnPage(initialText);
                sendResponse({ success: true });
            } catch (error) {
                console.error('❌ Error executing showInteractiveCounterOnPage:', error);
                sendResponse({ success: false, error: error.message });
            }
            return;
        }
        
        if (retryCount < maxRetries) {
            console.log(`⏳ Function not available yet, retrying in ${retryDelay}ms...`);
            setTimeout(() => {
                showInteractiveCounterWithRetry(initialText, sendResponse, retryCount + 1);
            }, retryDelay);
        } else {
            console.error('❌ showInteractiveCounterOnPage function not available after maximum retries');
            console.log('📊 Available functions:', Object.keys(window.CounterExtension));
            sendResponse({ success: false, error: 'Function not available after retries' });
        }
    }

    // メッセージ処理の実装
    function handleMessage(message, sender, sendResponse) {
        console.log('📥 Handling message:', message);
        
        if (message.action === 'showInteractiveCounter') {
            const initialText = message.initialText || '';
            console.log('🎮 Showing interactive counter with text:', initialText.substring(0, 50));
            
            // Chrome拡張機能の特別なページでは実行しない
            if (window.CounterExtension.isChromeExtensionPage && window.CounterExtension.isChromeExtensionPage()) {
                console.log('⚠️ Skipping interactive counter on Chrome extension page');
                sendResponse({ success: false, error: 'Cannot show counter on Chrome extension page' });
                return true;
            }
            
            // インタラクティブカウンターを表示（再試行付き）
            showInteractiveCounterWithRetry(initialText, sendResponse, 0);
            return true; // 非同期応答を示す
        }
        
        if (message.action === 'ping') {
            console.log('🏓 Ping received, sending pong...');
            sendResponse({ status: 'pong', url: window.location.href });
            return true;
        }
        
        if (message.action === 'getPageText') {
            const pageText = window.CounterExtension.safeGetPageText ? 
                window.CounterExtension.safeGetPageText() : '';
            sendResponse({ text: pageText });
            return true;
        }
        
        if (message.action === 'getSelectedText') {
            const selectedText = window.CounterExtension.getSelectedText ? 
                window.CounterExtension.getSelectedText() : window.getSelection().toString();
            sendResponse({ text: selectedText });
            return true;
        }
        
        return true;
    }
    
    // メッセージリスナーの設定
    function setupMessageListener() {
        console.log('📡 Setting up message listener...');
        
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('📥 Content script received message:', message);
            
            // モジュールが読み込まれていない場合は保留
            if (!modulesLoaded) {
                console.log('⏳ Modules not loaded yet, queuing message...');
                pendingMessages.push({ message, sender, sendResponse });
                return true; // 非同期応答を示す
            }
            
            // モジュールが読み込まれている場合は即座に処理
            return handleMessage(message, sender, sendResponse);
        });
        
        console.log('✅ Message listener set up successfully');
    }
    
    // フォールバック機能（モジュール読み込み失敗時）
    function setupFallbackFunctionality() {
        console.log('⚠️ Setting up fallback functionality...');
        
        // 基本的なメッセージリスナーのみ設定
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'ping') {
                sendResponse({ status: 'pong', url: window.location.href });
                return true;
            }
            
            if (message.action === 'getSelectedText') {
                try {
                    const selectedText = window.getSelection().toString();
                    sendResponse({ text: selectedText });
                } catch (error) {
                    sendResponse({ text: '' });
                }
                return true;
            }
            
            if (message.action === 'showInteractiveCounter') {
                console.error('❌ Interactive counter not available in fallback mode');
                sendResponse({ success: false, error: 'Interactive counter not available' });
                return true;
            }
            
            return true;
        });
    }
    
    // 早期のメッセージリスナー設定（モジュール読み込み前）
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('📥 Early message received:', message);
        
        // モジュールが読み込まれていない場合は保留
        if (!modulesLoaded) {
            console.log('⏳ Modules not loaded yet, queuing early message...');
            pendingMessages.push({ message, sender, sendResponse });
            return true; // 非同期応答を示す
        }
        
        // モジュールが読み込まれている場合は処理
        return handleMessage(message, sender, sendResponse);
    });
    
    // モジュールの読み込み完了を待つ関数
    function waitForModules(callback, maxAttempts = 20, attempt = 0) {
        const requiredFunctions = ['showInteractiveCounterOnPage', 'loadInteractiveCounterTemplate', 'handleTextChange'];
        const missingFunctions = requiredFunctions.filter(fn => !window.CounterExtension?.[fn]);
        
        if (missingFunctions.length === 0) {
            console.log('✅ All modules loaded successfully');
            callback();
            return;
        }
        
        if (attempt >= maxAttempts) {
            console.error('❌ Timeout waiting for modules to load. Missing:', missingFunctions);
            console.error('📊 Available functions:', Object.keys(window.CounterExtension || {}));
            setupFallbackFunctionality();
            return;
        }
        
        console.log(`⏳ Waiting for modules... Attempt ${attempt + 1}/${maxAttempts}. Missing:`, missingFunctions);
        setTimeout(() => waitForModules(callback, maxAttempts, attempt + 1), 100);
    }
    
    // ドキュメントの準備完了を待ってモジュールを初期化
    function initializeWhenReady() {
        if (document.readyState === 'loading') {
            console.log('📄 Document still loading, waiting for DOMContentLoaded...');
            document.addEventListener('DOMContentLoaded', () => {
                console.log('📄 DOMContentLoaded event fired, waiting for modules...');
                setTimeout(() => waitForModules(initializeModules), 200);
            });
        } else {
            console.log('📄 Document already loaded, waiting for modules...');
            setTimeout(() => waitForModules(initializeModules), 100);
        }
    }
    
    // 初期化を実行
    initializeWhenReady();
    
})();
