document.addEventListener('DOMContentLoaded', () => {
    const listDiv = document.getElementById('list');
    const statusDiv = document.getElementById('status');
    const countBadge = document.getElementById('count-badge');

    chrome.storage.local.get(['swfList'], (result) => {
        const swfs = result.swfList || [];

        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            const currentTab = tabs[0];
            // Filter SWFs for the current active tab only
            const currentSwfs = swfs.filter(s => s.tabId === currentTab.id);

            countBadge.innerText = currentSwfs.length;

            if (currentSwfs.length > 0) {
                statusDiv.style.display = 'none';

                currentSwfs.forEach((item) => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'swf-item';

                    // Extract filename from URL
                    let fileName = item.url.substring(item.url.lastIndexOf('/') + 1).split('?')[0];
                    if (!fileName.toLowerCase().endsWith('.swf')) fileName += '.swf';

                    itemDiv.innerHTML = `
                    <span class="file-name">${fileName}</span>
                    <span class="url-text" title="${item.url}">${item.url}</span>
                    <button class="download-btn" data-url="${item.url}" data-name="${fileName}">Download File</button>
                    <div class="msg"></div>
                    `;

                    listDiv.appendChild(itemDiv);
                });

                // Add event listeners to buttons
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

                        // Inject the script directly into the page context
                        chrome.scripting.executeScript({
                            target: { tabId: currentTab.id },
                            func: downloadFileOnPage,
                            args: [url, filename]
                        }, (injectionResults) => {

                            if (chrome.runtime.lastError) {
                                msgElem.style.color = "#dc3545"; // Red
                                msgElem.innerText = "Error: " + chrome.runtime.lastError.message;
                                btnElem.innerText = "Failed";
                                btnElem.disabled = false;
                                return;
                            }

                            // Script injected successfully
                            btnElem.innerText = "Download Started";
                            msgElem.style.color = "#198754"; // Green
                            msgElem.innerText = "Check your downloads folder.";

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
 * This function is executed inside the page context (DOM).
 * It uses the page's fetch API (inheriting cookies/referer) to get the file
 * and triggers a browser download via a temporary anchor tag.
 */
async function downloadFileOnPage(url, filename) {
    try {
        console.log("[Ruffle SWF Grabber] Fetching URL inside page context:", url);

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);

        console.log("[Ruffle SWF Grabber] Download triggered successfully.");
    } catch (err) {
        console.error("[Ruffle SWF Grabber] Download failed:", err);
        alert("Ruffle SWF Grabber Error:\nCould not download file.\n\nDetails: " + err.message);
    }
}
