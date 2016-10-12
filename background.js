// prerender.cloud chrome extension - for prerendering javascript pages on a remote server to allow javascriptless clients
/**
  * 1. disable javascript
  * 2. let the browser navigate to a page normally
  * 3. start a loop that replaces any normal content with 'loading'
  * 4. wait for the normal navigation to fire onDOMContentLoaded
  * 4. start an AJAX request for the prerendered version
  * 5. stop the 'loading' loop when the prerendered version is received
  */


// disable javascript
chrome.contentSettings.javascript.set({primaryPattern: '<all_urls>', setting: 'block'});

function runCode(tabId, code, cb) {
  chrome.tabs.executeScript(tabId, {code: code}, cb);
}

function prerenderFetchCode(apiKey) {
  return `
    if (!window.prerendered) {
      var request = new Request('https://service.prerender.cloud/'+window.location.href, {
        headers: {'x-prerender-token': '${apiKey}'}
      });
      window.fetch(request)
          .then(res => res.text())
          .then(prerendered => {
            window.prerendered = prerendered;
            document.documentElement.innerHTML=prerendered;
          })
          .catch(console.error)
    } else {
      console.log('already prerendered');
    }
  `;
}

function loadingCode() {
  return `
    var clearContent = function() {
      if (!window.prerendered) {
        document.documentElement.innerHTML='loading prerendered version...';
        window.requestAnimationFrame(clearContent);
      }
    }
    window.requestAnimationFrame(clearContent);
  `;

}

class TabSubscribers {
  create(tabId, url) {
    this[tabId] = new Tab(tabId, url)
  }
  remove(tabId) {
    delete this[tabId];
  }
}

// there are, empirically (trial and error) 3 javascript contexts
// 1. onBeforeRequest
// 2. onHeadersReceived
// 3. onDOMContentLoaded
class Tab {
  constructor(tabId, url) {
    this.tabId = tabId;
    this.url = url;
    chrome.storage.sync.get({apiKey: ''}, items => this.apiKey = items.apiKey);
    runCode(this.tabId, loadingCode());
  }

  // this is the first moment where javascript
  // can be executed in the context of the loaded URL
  onHeadersReceived() {
    runCode(this.tabId, loadingCode());
  }

  // intuitively we'd start the prerender fetch as early as possible
  // but we lose the javascript context if we run it before the DOMContentLoaded event
  onDOMContentLoaded(details) {
    runCode(this.tabId, loadingCode());
    runCode(this.tabId, prerenderFetchCode(this.apiKey));
  }

}


var tabSubscribers = new TabSubscribers();

// subscribe to all request's rendering/painting lifecycle per tab
chrome.webNavigation.onDOMContentLoaded.addListener(function(details) {
  tabSubscribers[details.tabId] && tabSubscribers[details.tabId].onDOMContentLoaded(details);
});
chrome.webRequest.onHeadersReceived.addListener(function(details) {
  tabSubscribers[details.tabId] && tabSubscribers[details.tabId].onHeadersReceived(details);
}, {urls: ['<all_urls>'], types: ['main_frame']})


// create Tab objects per request/response start stop lifecycle
chrome.webRequest.onBeforeRequest.addListener(function(details) {
  // prevents chrome://, (extensions, options pages etc.. from triggering the prerender)
  if (!details.url.startsWith('http')) return;

  tabSubscribers.remove(details.tabId);
  tabSubscribers.create(details.tabId, details.url);
}, {urls: ['<all_urls>'], types: ['main_frame']}, ['blocking']);
chrome.webNavigation.onCompleted.addListener(function(details) {
  tabSubscribers.remove(details.tabId);
}, {urls: ['<all_urls>'], types: ['main_frame']}, ['blocking']);