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

document.querySelector('#go-to-options').addEventListener('click', function() {
  chrome.runtime.openOptionsPage();
});

