/**
 * blocked.html logic. External file: MV3 extension pages disallow inline script.
 */
(function () {
  const params = new URLSearchParams(location.search);
  const reason = params.get("reason") || "";
  const messages = {
    gated:
      "This subreddit is age-gated. While locked, the click-through screen doesn't open.",
    post:
      "This post is marked NSFW, so the full page is redirected instead of showing a blank feed.",
    blocklist: "This subreddit is on your custom blocklist.",
    nsfw:
      "This page was redirected because NSFW content would otherwise show.",
  };
  if (messages[reason]) {
    document.getElementById("message").textContent = messages[reason];
  }
  if (reason) {
    document.getElementById("reasonLine").textContent = "Reason: " + reason;
  }
})();
