document.addEventListener("DOMContentLoaded", () => {
  const note = document.getElementById("note");
  const btn = document.getElementById("btnDone");

  // Prefill if re-opened
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (res) => {
    if (res && res.ok && res.state && res.state.reminderNote) {
      note.value = res.state.reminderNote;
    }
  });

  btn.addEventListener("click", () => {
    const text = note.value.trim();
    chrome.runtime.sendMessage(
      { type: "COMPLETE_ONBOARDING", note: text },
      () => {
        // Close tab if possible; otherwise go to Reddit
        window.close();
        setTimeout(() => {
          location.href = "https://www.reddit.com/";
        }, 150);
      }
    );
  });
});
