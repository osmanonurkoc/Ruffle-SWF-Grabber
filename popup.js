document.addEventListener('DOMContentLoaded', () => {
    const listDiv = document.getElementById('list');
    const statusDiv = document.getElementById('status');
    const countBadge = document.getElementById('count-badge');

    chrome.storage.local.get(['swfList'], (result) => {
        const swfs = result.swfList || [];

        // Get the current tab to access its Title
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            const currentTab = tabs[0];

            // Filter SWFs for the current active tab only
            const currentSwfs = swfs.filter(s => s.tabId === currentTab.id);

            if (countBadge) countBadge.innerText = currentSwfs.length;

            if (currentSwfs.length > 0) {
                if (statusDiv) statusDiv.style.display = 'none';

                // 1. Get Page Title and Clean it
                const pageTitle = currentTab.title || "Unknown Game";
                const safeFileName = sanitizeFilename(pageTitle);

                currentSwfs.forEach((item, index) => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'swf-item';

                    // Original filename from URL (for reference)
                    let originalName = item.url.substring(item.url.lastIndexOf('/') + 1).split('?')[0];

                    // Determine the final download name
                    // If there are multiple SWFs, append index to avoid overwriting: "Game Name (1).swf"
                    let finalName = safeFileName;
                    if (currentSwfs.length > 1) {
                        finalName = `${safeFileName.replace('.swf', '')} - ${originalName}`;
                        // Or simpler: `${safeFileName.replace('.swf', '')} (${index + 1}).swf`;
                    }
                    if (!finalName.toLowerCase().endsWith('.swf')) finalName += '.swf';

                    itemDiv.innerHTML = `
                    <span class="file-name">${finalName}</span>
                    <span class="url-text" title="${item.url}" style="font-size:10px; color:#999;">Source: .../${originalName}</span>
                    <button class="download-btn" data-url="${item.url}" data-name="${finalName}">Download</button>
                    <div class="msg"></div>
                    `;

                    listDiv.appendChild(itemDiv);
                });

                // Add event listeners
                document.querySelectorAll('.download-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const url = e.target.getAttribute('data-url');
                        const filename = e.target.getAttribute('data-name');
                        const btnElem = e.target;
                        const msgElem = btnElem.nextElementSibling;

                        // UI Feedback
                        btnElem.disabled = true;
                        btnElem.innerText = "Processing...";
                        msgElem.style.color = "#666";
                        msgElem.innerText = "Injecting script...";

                        // Inject script
                        chrome.scripting.executeScript({
                            target: { tabId: currentTab.id },
                            func: downloadFileOnPage,
                            args: [url, filename]
                        }, (injectionResults) => {

                            if (chrome.runtime.lastError) {
                                msgElem.style.color = "#dc3545";
                                msgElem.innerText = "Error: " + chrome.runtime.lastError.message;
                                btnElem.innerText = "Failed";
                                btnElem.disabled = false;
                                return;
                            }

                            btnElem.innerText = "Download Started";
                            msgElem.style.color = "#198754";
                            msgElem.innerText = "Saved as: " + filename;

                            setTimeout(() => {
                                btnElem.disabled = false;
                                btnElem.innerText = "Download Again";
                                msgElem.innerText = "";
                            }, 4000);
                        });
                    });
                });
            }
        });
    });
});

/**
 * Removes illegal characters from the page title to create a valid filename.
 */
function sanitizeFilename(name) {
    // 1. Remove characters not allowed in Windows/Mac/Linux filenames: \ / : * ? " < > |
    let sanitized = name.replace(/[\\/:*?"<>|]/g, ' ');

    // 2. Trim whitespace
    sanitized = sanitized.trim();

    // 3. Limit length (optional, but good practice)
    if (sanitized.length > 100) sanitized = sanitized.substring(0, 100);

    // 4. Ensure it's not empty
    if (sanitized.length === 0) sanitized = "flash_game";

    return sanitized + ".swf";
}

/**
 * Executed inside page context
 */
async function downloadFileOnPage(url, filename) {
    try {
        console.log("[Ruffle SWF Grabber] Downloading:", filename);

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
    } catch (err) {
        console.error("Download failed:", err);
        alert("Error: " + err.message);
    }
}
