document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('clearButton').addEventListener('click', clearText);
    document.getElementById('saveButton').addEventListener('click', saveToHistory);
    document.getElementById('clearHistoryButton').addEventListener('click', clearHistory);
    
    var textArea = document.getElementById('textArea');
    var copyButton = document.getElementById('copyButton');
    var pasteButton = document.getElementById('pasteButton');

    textArea.addEventListener('input', countCharacters);
    copyButton.addEventListener('click', copyToClipboard);
    pasteButton.addEventListener('click', pasteFromClipboard);

    countCharacters();
    loadHistory();
  });
  
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