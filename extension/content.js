const script = document.createElement("script");
script.src = chrome.runtime.getURL("inject.js");
script.onload = () => script.remove();
(document.head || document.documentElement).appendChild(script);

window.addEventListener("NETGUARD_SIGNAL", (event) => {
  chrome.runtime.sendMessage({
    type: "BEHAVIORAL_SIGNAL",
    detail: event.detail
  });
});
