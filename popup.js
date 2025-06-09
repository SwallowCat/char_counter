document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('clearButton').addEventListener('click', clearText);
    var textArea = document.getElementById('textArea');
    var copyButton = document.getElementById('copyButton');
    var pasteButton = document.getElementById('pasteButton');

    textArea.addEventListener('input', countCharacters);
    copyButton.addEventListener('click', copyToClipboard);
    pasteButton.addEventListener('click', pasteFromClipboard);

    countCharacters();
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
    document.getElementById('result').innerText = '';
  }