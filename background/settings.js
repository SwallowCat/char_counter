// background/settings.js - 設定管理

let currentSettings = {
    openMode: 'popup'  // デフォルト値
};

// 設定を読み込む
async function loadSettings() {
    console.log('📖 Loading settings from storage...');
    
    try {
        const result = await new Promise(resolve => {
            chrome.storage.local.get(['appSettings'], resolve);
        });
        
        console.log('🔍 Raw storage result:', result);
        
        if (result.appSettings) {
            currentSettings = result.appSettings;
            console.log('✅ Settings loaded from storage:', currentSettings);
        } else {
            console.log('⚠️ No saved settings found, using defaults:', currentSettings);
            // デフォルト設定を保存
            await new Promise(resolve => {
                chrome.storage.local.set({ appSettings: currentSettings }, resolve);
            });
            console.log('� Default settings saved to storage');
        }
        
        console.log('�🔧 DEBUG: Final settings in background:', currentSettings);
        console.log('🔧 DEBUG: Settings openMode value:', currentSettings.openMode);
        console.log('🔧 DEBUG: Settings openMode type:', typeof currentSettings.openMode);
        
        // グローバル設定を更新
        globalThis.currentSettings = currentSettings;
        
        await updateActionBehavior(currentSettings);
        globalThis.updateContextMenu();
        
        console.log('🔧 Settings loading completed successfully');
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// アクションの動作を更新
async function updateActionBehavior(settings = currentSettings) {
  console.log('🔧 updateActionBehavior called with:', settings);
  console.log('🔧 Current time:', new Date().toISOString());
  
  try {
    if (settings.openMode === 'popup') {
      console.log('🎯 Setting popup mode - enabling popup');
      console.log('🎯 Setting popup URL to: popup/templates/popup.html');
      
      await chrome.action.setPopup({popup: 'popup/templates/popup.html'});
      
      // 設定後に少し待機してから確認
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // 確認のため現在の設定を取得
      const currentPopup = await chrome.action.getPopup({});
      const expectedUrl = chrome.runtime.getURL('popup/templates/popup.html');
      
      console.log('🔍 Popup verification:');
      console.log('  Expected:', expectedUrl);
      console.log('  Actual  :', currentPopup);
      
      // ポップアップが正しく設定されているか検証
      if (currentPopup !== expectedUrl) {
        console.error('❌ Popup setting failed! Expected:', expectedUrl, 'Got:', currentPopup);
        // リトライ
        console.log('🔄 Retrying popup setting...');
        await chrome.action.setPopup({popup: 'popup/templates/popup.html'});
        await new Promise(resolve => setTimeout(resolve, 100));
        const retryPopup = await chrome.action.getPopup({});
        console.log('🔄 Retry result:', retryPopup);
        
        if (retryPopup === expectedUrl) {
          console.log('✅ Popup mode successfully enabled after retry');
        } else {
          console.error('❌ Popup setting failed even after retry!');
        }
      } else {
        console.log('✅ Popup mode successfully enabled on first try');
      }
    } else {
      console.log('🎯 Setting non-popup mode - disabling popup');
      await chrome.action.setPopup({popup: ''});
      
      // 設定後に少し待機してから確認
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 確認のため現在の設定を取得
      const currentPopup = await chrome.action.getPopup({});
      console.log('🔍 Popup disabled, current value:', currentPopup);
      
      if (currentPopup !== '') {
        console.error('❌ Popup disable failed! Expected empty string, got:', currentPopup);
      } else {
        console.log('✅ Popup mode successfully disabled');
      }
    }
  } catch (error) {
    console.error('❌ Error in updateActionBehavior:', error);
    console.error('❌ Stack trace:', error.stack);
  }
}

// Service Worker用のグローバル登録（windowではなくglobalThisを使用）
globalThis.currentSettings = currentSettings;
globalThis.loadSettings = loadSettings;
globalThis.updateActionBehavior = updateActionBehavior;
