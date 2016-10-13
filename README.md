![icon128](https://cloud.githubusercontent.com/assets/22159102/19360805/e650aba6-9134-11e6-9b3b-ad4cf5367d89.png)

# Prerender.cloud Chrome Extension

<img style="float: right;" src="https://cloud.githubusercontent.com/assets/16573/19363707/59dadad2-9140-11e6-82f3-24e4c9412dbe.png">

Read more details here: https://www.prerender.cloud/documentation/chrome-extension

## FAQ
* Q: What does it do?
  * A: disables Javascript, and any page you navigate to is rendered by a remote server so you can still see Javascript content
* Q: Is it free?
  * A: for a limited amount of requests (somewhere around 500 per month), it requires an API key beyond that
* Q: does it send cookies/credentials from my browser to prerender.cloud
  * A: **Absolutely not**, it uses `window.fetch`, which does not send cookies by default (unless you include: `{credentials: 'include'}`), see the [source](https://github.com/sanfrancesco/prerendercloud-chromeextension/blob/255cce42a76d29cae5b03944cb8711608eceab24/background.js#L63-L66)


![rollup-demo](https://cloud.githubusercontent.com/assets/22159102/19361329/26e23f16-9137-11e6-8f25-cfba77420fb3.gif)


