(function () {
  "use strict";

  // 1️⃣ Block Right-Click (Prevents Inspect Element & Copy)
  document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    alert("Copying is disabled on this website!");
  });

  // 2️⃣ Block Copying (Ctrl+C, Ctrl+X, Ctrl+V, Cmd+C for Mac)
  document.addEventListener("keydown", (event) => {
    if (
      (event.ctrlKey &&
        (event.key === "c" || event.key === "x" || event.key === "v")) || // Windows Copy/Paste
      (event.metaKey &&
        (event.key === "c" || event.key === "x" || event.key === "v")) // Mac Copy/Paste
    ) {
      event.preventDefault();
      alert("Copying is disabled on this website!");
    }
  });

  // 3️⃣ Prevent Text Selection (So Users Can’t Highlight and Copy)
  // document.addEventListener("selectstart", (event) => {
  //   event.preventDefault();
  //   alert("Text selection is disabled!");
  // });

  // 4️⃣ Detect Screenshot Attempt (Windows Snipping Tool & Mac Screenshot)
  function detectScreenshot() {
    alert("Screenshot detected! Please respect our content.");
  }

  // Windows: Detect 'PrtScn' Key (Print Screen)
  document.addEventListener("keydown", (event) => {
    if (event.key === "PrintScreen") {
      detectScreenshot();
    }
  });

  // Mac: Detect Screenshot Shortcuts (Cmd+Shift+3 and Cmd+Shift+4)
  document.addEventListener("keydown", (event) => {
    if (
      event.metaKey &&
      event.shiftKey &&
      (event.key === "3" || event.key === "4")
    ) {
      detectScreenshot();
    }
  });
})();
