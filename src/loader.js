// Modernize script to ES6 modules
(async () => {
    const src = browser.runtime.getURL('injector.js');
    const contentScript = await import(src);
    contentScript.main();
  })();
