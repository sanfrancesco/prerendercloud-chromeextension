
document.getElementById('toggle').addEventListener('click', function() {
  setToggleState(document.getElementById('toggle').checked);
});

function setToggleState(val) {
  console.log('setting state to', val);
  chrome.storage.sync.set({toggle: val}, getToggleState);
}

function getToggleState() {
  chrome.storage.sync.get({toggle: true}, function(items) {
    console.log('getting state', items);
    let isOn = !!items.toggle;
    console.log('isOn',isOn);
    document.getElementById('toggle').checked = isOn;
    document.getElementById('status').innerHTML = isOn ? 'on' : 'off';
    document.getElementById('status').style.background = isOn ? 'rgba(0,100,0,0.5)' : 'rgba(200,0,0,0.5)';
    chrome.browserAction.setBadgeText({text: isOn ? 'on' : 'off'});
  });
}

getToggleState();

document.querySelector('#go-to-options').addEventListener('click', function() {
  chrome.runtime.openOptionsPage();
});

