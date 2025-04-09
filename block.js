(function () {
  "use strict";

  // 1. Disable Right Click
  document.addEventListener("contextmenu", (event) => event.preventDefault());

  // 2. Disable DevTools Shortcuts (F12, Ctrl+Shift+I, etc.)
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "F12" ||
      (event.ctrlKey &&
        event.shiftKey &&
        (event.key === "I" || event.key === "J" || event.key === "C")) ||
      (event.ctrlKey && event.key === "U")
    ) {
      event.preventDefault();
    }
  });

  // 3. Detect DevTools Opening Using Debugger Timing
  setInterval(() => {
    const before = new Date().getTime();
    debugger;
    const after = new Date().getTime();
    if (after - before > 100) {
      alert("Developer tools detected! Redirecting...");
      window.location.href = "about:blank"; // Redirect to a blank page
    }
  }, 1000);

  // 4. Detect Console Tampering
  (function detectConsole() {
    const devtools = { open: false, threshold: 160 };

    function checkDevTools() {
      if (
        window.outerWidth - window.innerWidth > devtools.threshold ||
        window.outerHeight - window.innerHeight > devtools.threshold
      ) {
        devtools.open = true;
        alert("Developer tools detected! Access restricted.");
        window.location.href = "about:blank";
      }
    }

    window.addEventListener("resize", checkDevTools);
    checkDevTools();
  })();

  // // 5. Block Console Access
  // console.log = function () {};
  // console.warn = function () {};
  // console.error = function () {};
  // console.debug = function () {};
  // Object.defineProperty(window, "console", {
  //   get: function () {
  //     throw new Error("Console access is disabled!");
  //   },
  // });

  // 6. Prevent Debugging with an Infinite Loop
  (function preventDebugging() {
    function detectDevTools() {
      if (
        window.outerWidth - window.innerWidth > 160 ||
        window.outerHeight - window.innerHeight > 160
      ) {
        alert("Developer tools detected!");
        document.body.innerHTML = ""; // Clear page content
      }
    }
    setInterval(detectDevTools, 1000);
  })();
})();
