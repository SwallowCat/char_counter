// background/settings.js - 設定管理

let currentSettings = {
    openMode: 'window'  // デフォルト値
};

// 設定を読み込む
function loadSettings() {
    console.log('📖 Loading settings from storage...');
    chrome.storage.local.get(['appSettings'], (result) => {
        console.log('🔍 Raw storage result:', result);
        
        if (result.appSettings) {
            currentSettings = result.appSettings;
            console.log('✅ Settings loaded from storage:', currentSettings);
        } else {
            console.log('⚠️ No saved settings found, using defaults:', currentSettings);
        }
        
        console.log('🔧 DEBUG: Final settings in background:', currentSettings);
        console.log('🔧 DEBUG: Settings openMode value:', currentSettings.openMode);
        console.log('🔧 DEBUG: Settings openMode type:', typeof currentSettings.openMode);
        
        // グローバル設定を更新
        globalThis.currentSettings = currentSettings;
        
        updateActionBehavior(currentSettings);
        updateContextMenu();
    });
}

// アクションの動作を更新
async function updateActionBehavior(settings = currentSettings) {
  console.log('updateActionBehavior called with:', settings);
  
  try {
    if (settings.openMode === 'popup') {
      console.log('Setting popup mode - enabling popup');
      await chrome.action.setPopup({popup: 'popup.html'});
      
      // 設定後に少し待機してから確認
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 確認のため現在の設定を取得
      const currentPopup = await chrome.action.getPopup({});
      console.log('Popup set to:', currentPopup);
      
      const expectedUrl = chrome.runtime.getURL('popup.html');
      // ポップアップが正しく設定されているか検証
      if (currentPopup !== expectedUrl) {
        console.error('Popup setting failed! Expected:', expectedUrl, 'Got:', currentPopup);
        // リトライ
        console.log('Retrying popup setting...');
        await chrome.action.setPopup({popup: 'popup.html'});
        await new Promise(resolve => setTimeout(resolve, 50));
        const retryPopup = await chrome.action.getPopup({});
        console.log('Retry result:', retryPopup);
      } else {
        console.log('✅ Popup mode successfully enabled');
      }
    } else {
      console.log('Setting non-popup mode - disabling popup');
      await chrome.action.setPopup({popup: ''});
      
      // 設定後に少し待機してから確認
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // 確認のため現在の設定を取得
      const currentPopup = await chrome.action.getPopup({});
      console.log('Popup disabled, current value:', currentPopup);
      
      if (currentPopup !== '') {
        console.error('Popup disable failed! Expected empty string, got:', currentPopup);
      } else {
        console.log('✅ Popup mode successfully disabled');
      }
    }
  } catch (error) {
    console.error('Error in updateActionBehavior:', error);
  }
}

// Service Worker用のグローバル登録（windowではなくglobalThisを使用）
globalThis.currentSettings = currentSettings;
globalThis.loadSettings = loadSettings;
globalThis.updateActionBehavior = updateActionBehavior;
