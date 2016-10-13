// prerender.cloud chrome extension - for prerendering javascript pages on a remote server to allow javascriptless clients

/**
  * 1. disable javascript
  * 2. let the browser navigate to a page normally
  *   2a. Q: why bother with a normal request if we're replacing it with a prerendered copy?
  *       A: because the prerenderd HTML often has relative URLs, so we want our base URL to be
  *          the original URL so the images can be served (as opposed to the service.prerender.cloud URL)
  *          alternatively, we could load a light-weight fake, e.g. example.org, and just rewrite/redirect all incoming
  *          chrome.webRequest's, but then the URL bar shows the incorrect URL
  * 3. immediately start an AJAX request, within the context of the extension
  * 3. start a loop that replaces any normal content with 'loading'
  * 4. wait for the normal navigation to fire onDOMContentLoaded
  * 4. use "message passing" to send the AJAX response to the client window
  * 5. stop the 'loading' loop when the prerendered version is received from "message passing"
  * 6. finally set the DOM innerHTML
  */

var tabSubscribers;

class TabSubscribers {
  create(tabId, url) {
    this[tabId] = new Tab(tabId, url)
  }
  remove(tabId) {
    delete this[tabId];
  }
}

function isOn() { return localStorage.getItem('toggle') === 'true'; }
function toggle(isOn) {
  chrome.browserAction.setBadgeText({text: isOn ? 'on' : 'off'});
  chrome.contentSettings.javascript.set({primaryPattern: '<all_urls>', setting: isOn ? 'block' : 'allow'});
  tabSubscribers = new TabSubscribers();
}

// subscribe to the browser_action (popup window) toggle button
chrome.runtime.onConnect.addListener(function(port) {
  port.onMessage.addListener(({ isOn }) => toggle(isOn));
});

// read from local storage to see what to do on initial boot
toggle(isOn());


function runCode(tabId, code, cb) {
  chrome.tabs.executeScript(tabId, {code: code, runAt: 'document_start'}, cb);
}

function addListenerCode() {
  return `
    chrome.runtime.onMessage.addListener(
      function(request, sender, sendResponse) {
        window.prerendered = true;
        document.documentElement.innerHTML=request.prerendered;
    });
  `;

}

function prerenderFetch(apiKey, url) {
  return new Promise(function(res, rej) {
    var request = new Request('https://service.prerender.cloud/'+url, {
      headers: {'x-prerender-token': `${apiKey}`}
    });
    window.fetch(request)
        .then(res => res.text())
        .then(res)
        .catch(rej)
  })

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

class Tab {
  constructor(tabId, url) {
    this.tabId = tabId;
    this.url = url;
    chrome.storage.sync.get({apiKey: ''}, items => this.apiKey = items.apiKey);
    runCode(this.tabId, loadingCode());
    prerenderFetch(this.apiKey, url)
      .then(prerendered => {
        if (this.loaded) {
          // send prerendered message
          chrome.tabs.sendMessage(this.tabId, { prerendered });
        } else {
          // save it for later
          this.prerendered = prerendered;
        }
      })
  }

  onBeforeSendHeaders(details) {
    runCode(this.tabId, loadingCode());
  }
  onHeadersReceived() {
    runCode(this.tabId, loadingCode());
  }
  onResponseStarted(details) {
    runCode(this.tabId, loadingCode());
  }
  onDOMContentLoaded(details) {
    runCode(this.tabId, loadingCode());
    runCode(this.tabId, addListenerCode())
    if (this.prerendered) {
      // send prerendered message
      chrome.tabs.sendMessage(this.tabId, { prerendered: this.prerendered });
    } else {
      // save it for later
      this.loaded = true;
    }
  }

}


// subscribe to all request's rendering/painting lifecycle per tab
chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
  isOn() && tabSubscribers[details.tabId] && tabSubscribers[details.tabId].onBeforeSendHeaders(details);
}, {urls: ['<all_urls>'], types: ['main_frame']});
chrome.webRequest.onHeadersReceived.addListener(function(details) {
  isOn() && tabSubscribers[details.tabId] && tabSubscribers[details.tabId].onHeadersReceived(details);
}, {urls: ['<all_urls>'], types: ['main_frame']});
chrome.webRequest.onResponseStarted.addListener(function(details) {
  isOn() && tabSubscribers[details.tabId] && tabSubscribers[details.tabId].onResponseStarted(details);
}, {urls: ['<all_urls>'], types: ['main_frame']});
chrome.webNavigation.onDOMContentLoaded.addListener(function(details) {
  isOn() && tabSubscribers[details.tabId] && tabSubscribers[details.tabId].onDOMContentLoaded(details);
});

// create Tab objects per request/response start stop lifecycle
chrome.webRequest.onBeforeRequest.addListener(function(details) {
  if (!isOn()) return;

  // prevents chrome://, (extensions, options pages etc.. from triggering the prerender)
  if (!details.url.startsWith('http')) return;

  tabSubscribers.remove(details.tabId);
  tabSubscribers.create(details.tabId, details.url);
}, {urls: ['<all_urls>'], types: ['main_frame']}, ['blocking']);
chrome.webNavigation.onCompleted.addListener(function(details) {
  tabSubscribers.remove(details.tabId);
}, {urls: ['<all_urls>'], types: ['main_frame']}, ['blocking']);