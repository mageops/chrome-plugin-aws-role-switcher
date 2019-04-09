function getJsonUrl() {
	chrome.storage.sync.get({
		configJsonUrl: null
	}, function(items) {
	    window.postMessage({name: 'cs:awsrs:set-json-url', url: items.configJsonUrl}, '*');
	});
}

function injectScript() {
	var s = document.createElement('script');

	s.src = chrome.extension.getURL('injected.js');
	s.onload = onScriptLoad;

	(document.head || document.documentElement).appendChild(s);
}

function onScriptLoad() {
	getJsonUrl();
	this.remove(); 
}

injectScript();


