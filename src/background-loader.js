// Modernize script to ES6 modules
(async () => {
    const src = browser.runtime.getURL('background.js');
    const contentScript = await import(src);
    contentScript.main();
  })();
