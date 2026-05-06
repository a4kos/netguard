(function () {
  "use strict";

  function signal(reason, extra) {
    window.dispatchEvent(
      new CustomEvent("NETGUARD_SIGNAL", {
        detail: { reason, url: location.href, ...extra }
      })
    );
  }

  const _eval = window.eval;
  window.eval = function (code) {
    signal("eval_called", {
      snippet: typeof code === "string" ? code.slice(0, 120) : "[non-string]"
    });
    return _eval.apply(this, arguments);
  };

  const _createElement = document.createElement.bind(document);
  document.createElement = function (tag) {
    const el = _createElement(tag);
    if (tag.toLowerCase() === "script") {
      const desc = Object.getOwnPropertyDescriptor(
        HTMLScriptElement.prototype,
        "src"
      );
      if (desc) {
        let originalSet = desc.set;
        Object.defineProperty(el, "src", {
          set(value) {
            if (value && !value.startsWith(location.origin)) {
              signal("external_script_injected", { src: value });
            }
            originalSet.call(this, value);
          },
          get: desc.get,
          configurable: true
        });
      }
    }
    return el;
  };

  console.log("[Net Guard] Page monitor active.");
})();
