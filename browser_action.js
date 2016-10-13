var port = chrome.runtime.connect({name: "Sample Communication"});

function isOn() { return localStorage.getItem('toggle') === 'true'; }
function toggle(isOn) {
  port.postMessage({ isOn });
  document.getElementById('toggle').checked = isOn;
  document.getElementById('status').innerHTML = isOn ? 'on' : 'off';
  document.getElementById('status').style.background = isOn ? 'rgba(0,100,0,0.5)' : 'rgba(200,0,0,0.5)';
}

document.getElementById('toggle').addEventListener('click', function() {
  setToggleState(document.getElementById('toggle').checked);
});

function refreshToggleState() {
  toggle(isOn());
}

function setToggleState(val) {
  localStorage.setItem('toggle', val)
  refreshToggleState()
}

refreshToggleState();

// document.querySelector('#go-to-options').addEventListener('click', function() {
//   chrome.runtime.openOptionsPage();
// });

function save_options() {
  var apiKey = document.getElementById('api-key').value;

  chrome.storage.sync.set({apiKey: apiKey}, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('api-key-status');
    status.textContent = 'API key saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 2000);
  });
}

function restore_options() {
  chrome.storage.sync.get({apiKey: ''}, function(items) {
    document.getElementById('api-key').value = items.apiKey;
  });
}

document.getElementById('save').addEventListener('click', save_options);
document.getElementById('api-key').addEventListener('keypress', function (e) {
    var key = e.which || e.keyCode;
    console.log('key', key);
    // 13 is enter
    if (key === 13) save_options()
});

const fixAnchors = () => {
  var links = document.getElementsByTagName("a");
  for (var i = 0; i < links.length; i++) {
    (function () {
      var ln = links[i];
      var location = ln.href;
      ln.onclick = function () {
          chrome.tabs.create({active: true, url: location});
      };
    })();
  }
}

document.addEventListener('DOMContentLoaded', restore_options);
document.addEventListener('DOMContentLoaded', fixAnchors);