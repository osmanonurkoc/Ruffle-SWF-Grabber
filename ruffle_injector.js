/**
 * Ruffle SWF Grabber - Configuration Injector
 * * This script runs in the "MAIN" world, meaning it shares the same javascript
 * context as the webpage. This allows us to modify the `window.RufflePlayer`
 * object directly before the Ruffle emulator loads.
 */

(function() {
    // Ensure the RufflePlayer configuration object exists
    window.RufflePlayer = window.RufflePlayer || {};
    window.RufflePlayer.config = window.RufflePlayer.config || {};

    console.log("[Ruffle SWF Grabber] Injecting configuration overrides...");

    // 1. Force enable the "Download .swf" option in the right-click context menu
    // This allows users to right-click the game and select "Download .swf"
    window.RufflePlayer.config.showSwfDownload = true;

    // 2. Ensure the context menu itself is enabled
    window.RufflePlayer.config.contextMenu = true;

    // 3. Attempt to lock these settings so the website cannot disable them later
    // Some sites might try to set `showSwfDownload = false` in their own code.
    // We use Object.defineProperty to make our changes read-only if possible.
    try {
        Object.defineProperty(window.RufflePlayer.config, "showSwfDownload", {
            value: true,
            writable: false,     // Prevent overwriting
            configurable: false, // Prevent re-defining
            enumerable: true
        });

        console.log("[Ruffle SWF Grabber] Successfully locked download settings. Right-click download is enabled.");
    } catch (err) {
        // If locking fails (e.g. if the site defined it first), we just log it.
        // The simple assignment above usually works for 99% of sites.
        console.warn("[Ruffle SWF Grabber] Could not lock settings, but applied overrides.", err);
    }

})();
