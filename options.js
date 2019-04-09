function save() {
  var configJsonUrl = document.getElementById('role-json-url').value;
  var btn = document.getElementById('save');

  btn.classList.add('success');
  btn.innerHTML = 'Saving...';

  chrome.storage.sync.set({
    configJsonUrl: configJsonUrl
  }, function() {
    btn.innerHTML = 'Saved ✓';

    setTimeout(function() {
      btn.classList.remove('success');
      btn.innerHTML = 'Save';
    }, 700);
  });
}

function restore() {
  chrome.storage.sync.get({
    configJsonUrl: null
  }, function(items) {
    document.getElementById('role-json-url').value = items.configJsonUrl;
  });
}

document.addEventListener('DOMContentLoaded', restore);
document.getElementById('save').addEventListener('click', save);