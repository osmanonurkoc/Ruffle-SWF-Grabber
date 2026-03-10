/**
 * Ruffle SWF Grabber - Strict Instance Injector
 * Runs in the "MAIN" world to hijack Ruffle configurations at the element level.
 */

(function() {
    console.log("[Ruffle SWF Grabber] Injecting strict instance-level overrides...");

    // Helper: Force properties to always return true and ignore false assignments
    const enforceTrue = (obj, prop) => {
        Object.defineProperty(obj, prop, {
            get: () => true,
                              set: () => {}, // Silently ignore any attempt to set it to false
                              configurable: true,
                              enumerable: true
        });
    };

    // Helper: Apply the forced properties to any config object
    const patchConfig = (config) => {
        const safeConfig = config || {};
        enforceTrue(safeConfig, 'showSwfDownload');
        enforceTrue(safeConfig, 'contextMenu');
        return safeConfig;
    };

    // 1. PATCH GLOBAL OBJECT
    // Fallback for older implementations using window.RufflePlayer
    let internalRuffle = window.RufflePlayer || {};
    let internalConfig = patchConfig(internalRuffle.config);

    Object.defineProperty(internalRuffle, 'config', {
        get: () => internalConfig,
                          set: (newConfig) => {
                              internalConfig = patchConfig(Object.assign({}, internalConfig, newConfig));
                          },
                          configurable: true,
                          enumerable: true
    });

    Object.defineProperty(window, 'RufflePlayer', {
        get: () => internalRuffle,
                          set: (newValue) => {
                              if (newValue && typeof newValue === 'object') {
                                  let tempConfig = newValue.config;
                                  newValue.config = patchConfig(Object.assign({}, internalConfig, tempConfig));
                              }
                              internalRuffle = newValue;
                          },
                          configurable: true
    });

    // 2. PATCH ELEMENT INSTANCES
    // Hijack the specific <ruffle-player> DOM elements
    const hijackRuffleElement = (element) => {
        if (element._ruffleGrabberHijacked) return;
        element._ruffleGrabberHijacked = true;

        // Hijack the element's direct config property
        let instanceConfig = patchConfig(element.config);
        Object.defineProperty(element, 'config', {
            get: () => instanceConfig,
                              set: (newConfig) => {
                                  instanceConfig = patchConfig(Object.assign({}, instanceConfig, newConfig));
                              },
                              configurable: true,
                              enumerable: true
        });

        // Hijack the element's load() method
        // Sites often pass { showSwfDownload: false } directly here
        let originalLoad = element.load;
        const patchedLoad = function(options) {
            if (typeof options === 'object') {
                options = patchConfig(options);
            }
            return originalLoad.apply(this, arguments);
        };

        // If load is already defined, wrap it. If not, define a setter to catch it later.
        if (typeof originalLoad === 'function') {
            element.load = patchedLoad;
        } else {
            Object.defineProperty(element, 'load', {
                get: () => patchedLoad,
                                  set: (newLoad) => {
                                      if (typeof newLoad === 'function') {
                                          originalLoad = newLoad;
                                      }
                                  },
                                  configurable: true,
                                  enumerable: true
            });
        }
    };

    // 3. INTERCEPT DOM CREATION (document.createElement)
    // Catch elements before they are appended to the document
    const originalCreateElement = document.createElement;
    document.createElement = function() {
        const element = originalCreateElement.apply(this, arguments);
        if (arguments[0] && arguments[0].toLowerCase() === 'ruffle-player') {
            hijackRuffleElement(element);
        }
        return element;
    };

    // 4. INTERCEPT DOM MUTATIONS (innerHTML injections)
    // Catch elements added bypassing createElement
    const observer = new MutationObserver((mutations) => {
        for (let mutation of mutations) {
            for (let node of mutation.addedNodes) {
                if (node.nodeType === 1 && node.tagName && node.tagName.toLowerCase() === 'ruffle-player') {
                    hijackRuffleElement(node);
                }
            }
        }
    });

    if (document.documentElement) {
        observer.observe(document.documentElement, { childList: true, subtree: true });
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            observer.observe(document.documentElement, { childList: true, subtree: true });
        });
    }

})();
