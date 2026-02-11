// Global storage for detected SWF files
let detectedSwfs = [];

// Listen for network requests to detect .swf files
chrome.webRequest.onCompleted.addListener(
    function(details) {
        // Check if the URL contains .swf extension
        if (details.url.includes(".swf")) {

            // Prevent duplicates in the list
            if (!detectedSwfs.some(item => item.url === details.url)) {
                detectedSwfs.push({
                    url: details.url,
                    tabId: details.tabId,
                    timestamp: Date.now()
                });

                // Save to local storage for access in popup
                chrome.storage.local.set({ swfList: detectedSwfs });

                // Show a badge on the extension icon to notify the user
                chrome.action.setBadgeText({ text: "!", tabId: details.tabId });
                chrome.action.setBadgeBackgroundColor({ color: "#28a745" }); // Success Green
            }
        }
    },
    { urls: ["<all_urls>"] } // Listen to all URLs
);

// Optional: Clear list when a tab is closed (to save memory)
chrome.tabs.onRemoved.addListener((tabId) => {
    detectedSwfs = detectedSwfs.filter(item => item.tabId !== tabId);
    chrome.storage.local.set({ swfList: detectedSwfs });
});
