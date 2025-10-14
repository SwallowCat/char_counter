// 即座にポップアップモードを検出（DOMContentLoaded前）
(function() {
    if (window.outerWidth < 600 || window.outerHeight < 400) {
        document.documentElement.classList.add('popup-mode');
    }
})();

document.addEventListener('DOMContentLoaded', function() {
    // ポップアップモードの詳細設定
    detectPopupMode();
    
    document.getElementById('clearButton').addEventListener('click', clearText);
    document.getElementById('saveButton').addEventListener('click', saveToHistory);
    document.getElementById('clearHistoryButton').addEventListener('click', clearHistory);
    document.getElementById('settingsButton').addEventListener('click', openSettings);
    document.getElementById('closeModal').addEventListener('click', closeSettings);
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    document.getElementById('cancelSettingsBtn').addEventListener('click', closeSettings);
    
    // デバッグ情報ボタン
    document.getElementById('debugStatusBtn').addEventListener('click', async function() {
      try {
        // 現在のストレージ設定を取得
        const result = await chrome.storage.local.get(['appSettings']);
        const settings = result.appSettings || {};
        
        // バックグラウンドに現在のポップアップ状態を問い合わせ
        chrome.runtime.sendMessage({action: 'getPopupStatus'}, function(response) {
          alert(`設定: ${JSON.stringify(settings, null, 2)}\n\nポップアップ状態: ${response?.popupUrl || 'エラー'}`);
        });
      } catch (error) {
        alert('デバッグ情報の取得に失敗: ' + error.message);
      }
    });
    
    var textArea = document.getElementById('textArea');
    var copyButton = document.getElementById('copyButton');
    var pasteButton = document.getElementById('pasteButton');

    textArea.addEventListener('input', countCharacters);
    copyButton.addEventListener('click', copyToClipboard);
    pasteButton.addEventListener('click', pasteFromClipboard);

    // モーダル外クリックで閉じる
    document.getElementById('settingsModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeSettings();
        }
    });

    countCharacters();
    loadHistory();
    loadSettings();
    loadInitialText();
  });

  function detectPopupMode() {
    // 既にクラスが設定されていない場合のみ検出
    if (!document.documentElement.classList.contains('popup-mode')) {
        if (window.outerWidth < 600 || window.outerHeight < 400) {
            document.documentElement.classList.add('popup-mode');
        }
    }
    
    // ポップアップモードの場合、ウィンドウサイズを調整
    if (document.documentElement.classList.contains('popup-mode')) {
        if (typeof chrome !== 'undefined' && chrome.windows && chrome.windows.getCurrent) {
            chrome.windows.getCurrent((currentWindow) => {
                if (currentWindow.type === 'popup') {
                    chrome.windows.update(currentWindow.id, {
                        width: 420,
                        height: 520
                    });
                }
            });
        }
    }
    
    // ウィンドウリサイズ時の処理
    window.addEventListener('resize', function() {
        if (window.outerWidth < 600 || window.outerHeight < 400) {
            document.documentElement.classList.add('popup-mode');
        } else {
            document.documentElement.classList.remove('popup-mode');
        }
    });
  }
  
  function countCharacters() {
    var text = document.getElementById('textArea').value.replace(/\s+/g, '');
    var count = text.length;
    document.getElementById('result').innerText = 'Character count: ' + count;
  }

  function copyToClipboard() {
    var textArea = document.getElementById('textArea');
    textArea.select();
    document.execCommand('copy');
    alert('クリップボードにコピーしました！');
  }

  function pasteFromClipboard() {
    navigator.clipboard.readText()
      .then(text => {
        var textArea = document.getElementById('textArea');
        textArea.value = text;
        countCharacters();
      })
      .catch(err => {
        alert('Failed to read clipboard contents: ' + err);
      });
  }

  function clearText() {
    document.getElementById('textArea').value = '';
    document.getElementById('result').innerText = 'result : 0';
  }

  function saveToHistory() {
    var text = document.getElementById('textArea').value.trim();
    if (text === '') {
      alert('保存するテキストがありません。');
      return;
    }

    // Chrome拡張機能のAPIが利用可能かチェック
    if (typeof chrome === 'undefined' || !chrome.storage) {
      console.error('Chrome Storage APIが利用できません');
      alert('Chrome拡張機能として実行してください。');
      return;
    }

    chrome.storage.local.get(['textHistory'], function(result) {
      var history = result.textHistory || [];
      var now = new Date();
      var timestamp = now.toLocaleString('ja-JP');
      var charCount = text.replace(/\s+/g, '').length;

      var historyItem = {
        text: text,
        timestamp: timestamp,
        charCount: charCount,
        id: Date.now()
      };

      history.unshift(historyItem);
      
      // 履歴は最大20件まで保持
      if (history.length > 20) {
        history = history.slice(0, 20);
      }

      chrome.storage.local.set({textHistory: history}, function() {
        if (chrome.runtime.lastError) {
          console.error('保存エラー:', chrome.runtime.lastError);
          alert('履歴の保存に失敗しました。');
        } else {
          alert('履歴に保存しました！');
          loadHistory();
        }
      });
    });
  }

  function loadHistory() {
    // Chrome拡張機能のAPIが利用可能かチェック
    if (typeof chrome === 'undefined' || !chrome.storage) {
      console.error('Chrome Storage APIが利用できません');
      displayHistory([]);
      return;
    }
    
    chrome.storage.local.get(['textHistory'], function(result) {
      var history = result.textHistory || [];
      console.log('履歴を読み込み:', history);
      displayHistory(history);
    });
  }

  function displayHistory(history) {
    var historyList = document.getElementById('historyList');
    console.log('履歴を表示:', history);
    console.log('historyList element:', historyList);
    
    if (!historyList) {
      console.error('historyList要素が見つかりません');
      return;
    }
    
    historyList.innerHTML = '';

    if (history.length === 0) {
      historyList.innerHTML = '<p style="color: #666; font-size: 0.9rem;">履歴がありません</p>';
      return;
    }

    history.forEach(function(item) {
      var historyItem = document.createElement('div');
      historyItem.className = 'history-item';

      var contentDiv = document.createElement('div');
      contentDiv.className = 'history-content';
      contentDiv.onclick = function() {
        restoreFromHistory(item.text);
      };

      var textDiv = document.createElement('div');
      textDiv.className = 'history-text';
      textDiv.textContent = item.text;

      var infoDiv = document.createElement('div');
      infoDiv.className = 'history-info';
      infoDiv.textContent = item.charCount + '文字 - ' + item.timestamp;

      var deleteButton = document.createElement('button');
      deleteButton.className = 'btn delete-button';
      deleteButton.textContent = '×';
      deleteButton.onclick = function(e) {
        e.stopPropagation();
        deleteHistoryItem(item.id);
      };

      contentDiv.appendChild(textDiv);
      contentDiv.appendChild(infoDiv);
      historyItem.appendChild(contentDiv);
      historyItem.appendChild(deleteButton);
      historyList.appendChild(historyItem);
    });
  }

  function restoreFromHistory(text) {
    document.getElementById('textArea').value = text;
    countCharacters();
    alert('履歴からテキストを復元しました！');
  }

  function deleteHistoryItem(itemId) {
    // Chrome拡張機能のAPIが利用可能かチェック
    if (typeof chrome === 'undefined' || !chrome.storage) {
      console.error('Chrome Storage APIが利用できません');
      alert('Chrome拡張機能として実行してください。');
      return;
    }

    chrome.storage.local.get(['textHistory'], function(result) {
      var history = result.textHistory || [];
      var filteredHistory = history.filter(function(item) {
        return item.id !== itemId;
      });

      chrome.storage.local.set({textHistory: filteredHistory}, function() {
        if (chrome.runtime.lastError) {
          console.error('削除エラー:', chrome.runtime.lastError);
          alert('履歴の削除に失敗しました。');
        } else {
          loadHistory();
        }
      });
    });
  }

  function clearHistory() {
    // Chrome拡張機能のAPIが利用可能かチェック
    if (typeof chrome === 'undefined' || !chrome.storage) {
      console.error('Chrome Storage APIが利用できません');
      alert('Chrome拡張機能として実行してください。');
      return;
    }
    
    if (confirm('すべての履歴を削除しますか？')) {
      chrome.storage.local.remove(['textHistory'], function() {
        if (chrome.runtime.lastError) {
          console.error('削除エラー:', chrome.runtime.lastError);
          alert('履歴の削除に失敗しました。');
        } else {
          alert('履歴をすべて削除しました。');
          loadHistory();
        }
      });
    }
  }

  // 設定関連の関数
  function openSettings() {
    document.getElementById('settingsModal').style.display = 'block';
  }

  function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
  }

  function loadSettings() {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      // デフォルト設定を適用
      document.getElementById('windowMode').checked = true;
      console.log('Chrome API not available, using defaults');
      return;
    }

    chrome.storage.local.get(['appSettings'], function(result) {
      var settings = result.appSettings || {
        openMode: 'window'
      };

      console.log('Loading settings in popup:', settings);

      // ラジオボタンの設定
      document.getElementById('popupMode').checked = settings.openMode === 'popup';
      document.getElementById('windowMode').checked = settings.openMode === 'window';
      document.getElementById('tabMode').checked = settings.openMode === 'tab';
      
      console.log('Settings applied to UI - popup:', settings.openMode === 'popup', 
                  'window:', settings.openMode === 'window', 
                  'tab:', settings.openMode === 'tab');
    });
  }

  function saveSettings() {
    var openMode = document.querySelector('input[name="openMode"]:checked').value;

    var settings = {
      openMode: openMode
    };

    console.log('Saving settings:', settings);

    if (typeof chrome === 'undefined' || !chrome.storage) {
      alert('Chrome拡張機能として実行してください。');
      return;
    }

    chrome.storage.local.set({appSettings: settings}, function() {
      if (chrome.runtime.lastError) {
        console.error('設定保存エラー:', chrome.runtime.lastError);
        alert('設定の保存に失敗しました。');
      } else {
        console.log('Settings saved to storage');
        
        // background scriptに設定変更を通知
        chrome.runtime.sendMessage({
          action: 'updateSettings',
          settings: settings
        }, function(response) {
          if (chrome.runtime.lastError) {
            console.error('設定更新通知エラー:', chrome.runtime.lastError);
          } else {
            console.log('Background script notified:', response);
          }
        });
        
        if (settings.openMode === 'popup') {
          alert('ポップアップモードに設定しました！拡張機能のアイコンをクリックするとポップアップが表示されます。');
        } else {
          alert('設定を保存しました！拡張機能のアイコンをクリックして動作を確認してください。');
        }
        closeSettings();
      }
    });
  }

  // URLパラメータから初期テキストを読み込む
  function loadInitialText() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const initialText = urlParams.get('text');
      
      if (initialText) {
        const textArea = document.getElementById('textArea');
        textArea.value = decodeURIComponent(initialText);
        countCharacters();
        
        // パラメータをクリアしてブラウザ履歴をきれいに保つ
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    } catch (error) {
      console.error('初期テキスト読み込みエラー:', error);
    }
  }

  