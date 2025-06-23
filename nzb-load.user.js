// ==UserScript==
// @name                nzb-load
// @description         Automatically downloads NZB files from nzbindex.nl when links with the "nzblnk:" scheme are clicked.
// @description:de_DE   Lädt NZB-Dateien automatisch von nzbindex.nl herunter, wenn auf Links mit dem Schema "nzblnk:" geklickt wird.
// @author              LordBex
// @version             v2.0.1
// @match               *://*/*
// @grant               GM_xmlhttpRequest
// @grant               GM.xmlhttpRequest
// @grant               GM.setValue
// @grant               GM.getValue
// @grant               GM.registerMenuCommand
// @connect             nzbindex.com
// @connect             www.nzbking.com
// @connect             localhost
// @connect             *
// @icon                https://i.imgur.com/O1ao7fL.png
// ==/UserScript==

// ------------------------------------------------------------
//- Default Config:

console.log("nzb-load loaded")

// Default settings
const DEFAULT_SETTINGS = {
    ausgabe: 'download',
    disable_success_alert: false,

    sab_api_key: '',
    sab_url: 'http://localhost:8080/api',
    sab_categories: [],
    sab_default_category: '*',
    sab_sub_menu: true,

    nzbget_url: 'http://localhost:6789',
    nzbget_username: '',
    nzbget_password: '',
};

// Initialisierung der Einstellungen
const SETTINGS = DEFAULT_SETTINGS;
const SETTINGS_KEY = 'nzb-load-settings';

const SAB_HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json"
}

const NZBGET_HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json"
}

// Load settings from GM storage or use defaults
function loadSettings() {
    GM.getValue(SETTINGS_KEY).then(savedSettings => {
        if (savedSettings) {
            Object.assign(SETTINGS, savedSettings);
        } else {
            GM.setValue(SETTINGS_KEY, SETTINGS).then(() => {
                console.log("Default settings saved.");
            });
        }

        document.dispatchEvent(new CustomEvent('init-nzb-load', {
            detail: {
                version: GM.info.script.version,
                name: GM.info.script.name,
            }
        }));

    })
}

async function saveSettings(settings) {
    Object.assign(SETTINGS, settings);

    return GM.setValue(SETTINGS_KEY, SETTINGS)
}

loadSettings();

// ------------------------------------------------------------
// menu buttons

function getDownloadButton(parameters) {
    return {
        name: 'Download',
        f: () => {
            downloadAndSave(parameters)
        },
        bgColor: '#0D4715',
        icon: 'https://raw.githubusercontent.com/sabnzbd/sabnzbd/refs/heads/develop/icons/nzb.ico'
    }
}

async function openMenu(buttons) {
    infoModal.closeModal()
    modal.showModal(buttons)
}

function customHandler({downloadLink, fileName, password}) {
    // wird ausgeführt, wenn AUSGABE auf 'custom' gesetzt ist
    alert("Custom Handler") // Hier kann eigener Code eingefügt werden
}

// ------------------------------------------------------------
// sab-code

const SABNZBD = {
    addUrl: function ({downloadLink, fileName, password, category = '*'}) {
        const formData = new FormData();
        formData.append('name', downloadLink);
        formData.append('mode', 'addurl');
        formData.append('output', 'json');
        formData.append('apikey', SETTINGS.sab_api_key);
        formData.append('cat', category);
        if (fileName) {
            formData.append('nzbname', fileName);
        }
        if (password) {
            formData.append('password', password);
        }

        infoModal.print("Sende Link zu Sab ...")

        GM_xmlhttpRequest({
            method: "POST",
            url: SETTINGS.sab_url,
            data: formData,
            headers: SAB_HEADERS,
            onload: function (response) {
                console.log(response.responseText);
                let result = JSON.parse(response.responseText);

                if (result.status === true) {
                    infoModal.print("Erfolg! NZB hinzugefügt. ID: " + result.nzo_ids.join(', '))
                    infoModal.closeIn(3000)
                } else {
                    infoModal.showModal()
                    infoModal.error('Fehler beim Hinzufügen der NZB-Datei zu SABnzbd.\n' + result.error);
                }
            },
            onerror: function (response) {
                console.error('Anfrage fehlgeschlagen', response);
                alert("Anfrage an SABnzb schlug fail ! (mehr im Log)")
            }
        });
    },

    uploadNzb: function ({responseText, fileName, password, category = SETTINGS.sab_default_category}) {
        let formData = new FormData();
        let blob = new Blob([responseText], {type: "text/xml"});
        formData.append('name', blob, fileName);
        formData.append('mode', 'addfile');
        if (fileName) {
            formData.append('nzbname', fileName);
        }
        if (password) {
            formData.append('password', password);
        }
        formData.append('output', 'json');
        formData.append('cat', category);
        formData.append('apikey', SETTINGS.sab_api_key);
        console.log('Upload Nzb to Sab:', formData);
        infoModal.print("Lade Nzb zu SABnzbd hoch ...")

        GM_xmlhttpRequest({
            method: "POST",
            url: SETTINGS.sab_url,
            data: formData,
            headers: SAB_HEADERS,
            onload: function (response) {
                console.log('Upload response', response.status, response.statusText);
                console.log('Response body', response.responseText);
                let result = JSON.parse(response.responseText);
                if (result.status === true) {
                    successAlert('Success! NZB added. ID: ' + result.nzo_ids.join(', '));
                } else {
                    alert('Error adding NZB file to SABnzbd.\n' + (result.error || 'Unknown error'));
                }
            },
            onerror: function (response) {
                console.error('Error during file upload', response.status, response.statusText);
                alert("Could not upload NZB! (more in log)");
            }
        });
    },

    getCategories: function ({callback, failed_callback, url, key}) {
        url = url || SETTINGS.sab_url;
        key = key || SETTINGS.sab_api_key;

        if (!url || !key) {
            alert('Bitte gib zuerst die SABnzbd URL und den API-Key ein.');
            return;
        }

        const requestURL = new URL(url);
        requestURL.searchParams.append('output', 'json');
        requestURL.searchParams.append('mode', 'get_cats');
        requestURL.searchParams.append('apikey', key);

        GM_xmlhttpRequest({
            method: "GET",
            url: requestURL.toString(),
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json"
            },
            onload: (response) => {
                try {
                    const data = JSON.parse(response.responseText);
                    if (data.categories && data.categories.length > 0) {
                        if (callback) {
                            callback(data.categories);
                        } else { // debug message
                            alert('Kategorien in SABnzbd: ' + data.categories.join(', '));
                        }
                    } else {
                        alert('Keine Kategorien in SABnzbd gefunden.');
                    }
                } catch (e) {
                    console.error('Error parsing SABnzbd response:', e);
                    alert('Fehler beim Laden der Kategorien: ' + e.message);
                }
            },
            onerror: (error) => {
                console.error('Error loading categories from SABnzbd:', error);
                alert('Fehler beim Laden der Kategorien von SABnzbd.');
                if (failed_callback) {
                    failed_callback(error);
                }
            }
        });

    },

    makeButton: function (parameters, category) {
        return {
            name: category.charAt(0).toUpperCase() + category.slice(1),
            value: category.toLowerCase(),
            f: () => {
                parameters.category = category;
                SABNZBD.addUrl(parameters);
            }
        };
    }
}

const NZBGET = {
    _getUrl: function (username, password) {
        if (!SETTINGS.nzbget_url) {
            alert('Bitte gib zuerst die NZBGet URL ein.');
            return null;
        }
        // add http-auth data
        const url = new URL(SETTINGS.nzbget_url);
        url.username = username || SETTINGS.nzbget_username || '';
        url.password = password || SETTINGS.nzbget_password || '';

        // add a path if not already present 'jsonrpc'
        if (!url.pathname.includes('jsonrpc')) {
            url.pathname = url.pathname.replace(/\/$/, '') + '/jsonrpc';
        }

        return url.toString();
    },

    _request: function ({method, params = {}, callback, error}) {
        const data = {
            jsonrpc: "2.0",
            method: method,
            params: params,
            id: Math.floor(Math.random() * 1000000)
        };

        const url = this._getUrl(SETTINGS.nzbget_username, SETTINGS.nzbget_password);

        if (!url) {
            return null; // URL is not valid
        }

        GM_xmlhttpRequest({
            method: "POST",
            url: url,
            data: JSON.stringify(data),
            headers: NZBGET_HEADERS,
            onload: function (response) {
                callback(response);
            },
            onerror: function (response) {
                error(response);
            }
        })
    },

    addUrl: function ({downloadLink, fileName, password}) {
        // remove non Asci
        fileName = fileName.replace(/[^\x20-\x7E]/g, '').trim();
        // docs: https://nzbget.com/documentation/api/append/
        this._request({
            method: "append",
            params: [
                fileName + ".nzb",
                downloadLink,
                "",
                0,
                false,
                false,
                "",
                0,
                "FORCE",
                [
                    {"*unpack": "yes"},
                    {'*unpack:password': password || ''},
                ],
            ],

            callback: function (response) {
                console.log(response.responseText);
                try {
                    let result = JSON.parse(response.responseText);

                    if (result.error) {
                        infoModal.showModal()
                        infoModal.error('Fehler beim Hinzufügen der NZB-Datei zu NZBGet.\n' + result.error.message);
                    } else if (result.result) {
                        infoModal.print("Erfolg! NZB hinzugefügt. ID: " + (result.result || 'Unknown'))
                        infoModal.closeIn(3000)
                    } else {
                        infoModal.showModal()
                        infoModal.error('Unbekannter Fehler beim Hinzufügen der NZB-Datei zu NZBGet.');
                    }
                } catch (e) {
                    console.error('Error parsing response:', e);
                    infoModal.showModal()
                    infoModal.error('Fehler beim Verarbeiten der Antwort von NZBGet.');
                }
            },
            error: function (response) {
                console.error('Anfrage fehlgeschlagen', response);
                alert("Anfrage an NZBGet schlug fehl! (mehr im Log)")
            }
        });

        infoModal.print("Sende Link zu NZBGet ...")
    },
}


function successAlert(message) {
    if (!SETTINGS.disable_success_alert) {
        alert(message)
    }
}

function getCategoriesButtons(parameters) {
    if (SETTINGS.sab_categories.length > 0) {
        return SETTINGS.sab_categories.map(item => {
            return SABNZBD.makeButton(parameters, item);
        })
    } else {
        alert("Keine Kategorien in den Einstellungen gefunden. Bitte zuerst Kategorien hinzufügen.")
    }
}

// ------------------------------------------------------------
// download file-code

function saveFile({responseText, fileName, fileType = "application/x-nzb", fileExtension = '.nzb'}) {
    let blob = new Blob([responseText], {type: fileType});
    let link = document.createElement('a');
    link.href = URL.createObjectURL(blob);

    if (!fileName) {
        fileName = 'file' + fileExtension;
    } else if (!fileName.endsWith(fileExtension)) {
        fileName = fileName + fileExtension
    }

    link.download = fileName // Dateiname ändern
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function extractFileNameFromResponse(url, response) {
    if (response.responseHeaders) {
        const contentDisposition = response.responseHeaders
            .split('\n')
            .find(header => header.toLowerCase().startsWith('content-disposition:'));

        if (contentDisposition) {
            console.log("Content-Disposition Header vom Download:", contentDisposition)
            const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (filenameMatch && filenameMatch[1]) {
                return filenameMatch[1].replace(/['"]/g, '');
            }
        }
    }
    // Fallback: Extrahiere den Dateinamen aus der URL
    const urlParts = url.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    const fileName = lastPart.split('?')[0]; // Entferne Query-Parameter
    console.log("Dateiname aus URL extrahiert:", fileName)
    return fileName || 'download.nzb'; // Fallback-Dateiname
}

function downloadFile({downloadLink, fileName, password, callback}) {
    console.log("Download Nzb von " + downloadLink)
    GM_xmlhttpRequest({
        method: "GET",
        url: downloadLink,
        onload: function (nzbResponse) {
            if (!fileName) {
                fileName = extractFileNameFromResponse(downloadLink, nzbResponse)
            }

            callback({
                responseText: nzbResponse.responseText,
                fileName,
                password
            })
        },
        onerror: function () {
            console.error("Failed Download for  " + downloadLink)
            alert("Nzb könnte nicht geladen werden !")
        }
    });
}

function downloadAndSave({downloadLink, fileName, password}) {
    downloadFile({
        downloadLink, fileName, password, callback: (args) => {
            if (password) {
                args.fileName = `${args.fileName}{{${password}}}.nzb`
            }

            saveFile(args)
            infoModal.print("Nzb gespeichert.")

            setTimeout(() => {
                infoModal.closeModal()
            }, 3000)
        }
    })
}

// ------------------------------------------------------------
// handle menu

customElements.define('menu-select-modal', class MenuSelectModal extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        // Create a shadow root
        const shadow = this.attachShadow({mode: "open"});
        shadow.innerHTML = `
             <style>
                .btn {
                    --_bg-color: var(--bg-color, #06f);
                    align-items: center;
                    background-color: var(--_bg-color);
                    border: 2px solid var(--_bg-color);
                    box-sizing: border-box;
                    color: #fff;
                    cursor: pointer;
                    display: inline-flex;
                    fill: #000;
                    font-size: 24px;
                    font-weight: 400;
                    height: 48px;
                    justify-content: center;
                    line-height: 24px;
                    width: 100%;
                    outline: 0;
                    padding: 0 17px;
                    text-align: center;
                    text-decoration: none;
                    transition: all .3s;
                    user-select: none;
                    -webkit-user-select: none;
                    touch-action: manipulation;
                    border-radius: 5px;
                    gap: 5px;
                }

                .btn:hover {
                    filter: brightness(70%);
                }

                dialog {
                    border: none !important;
                    border-radius: calc(5px * 3.74);
                    box-shadow: 0 0 #0000, 0 0 #0000, 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    background-color: rgb(33, 37, 41);
                    padding: 1.6rem;
                    max-height: 70%;
                    max-width: max(400px, 100vw);
                }

                .dialog-header {
                    color: white;
                    font-family: Inter, sans-serif;
                    font-size: 22px;
                    font-weight: 600;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-bottom: 15px;
                    margin-bottom: 15px;
                    border-bottom: 1px solid #444;
                }

                .buttons {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                    min-width: 400px;
                    margin-top: 5px;
                }

                .close {
                    all: initial;
                    background: unset;
                    padding: 5px;
                    margin: 0;
                    border: unset;
                }

                .close {
                    all: initial;
                    background: unset;
                    padding: 8px;
                    margin: 0;
                    border: unset;
                    border-radius: 50%;
                    cursor: pointer;
                    transition: background-color 0.2s, transform 0.1s;
                }

                .close:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                    transform: scale(1.1);
                }

                .close:active {
                    transform: scale(0.95);
                }

                .close:not(:hover) svg {
                    opacity: 0.6;
                }

                @media screen and (max-width: 450px) {
                    .buttons {
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                        min-width: 300px;
                    }
                }

                @media screen and (max-width: 350px) {
                    .buttons {
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                        min-width: 150px;
                    }
                }


            </style>

            <div data-bs-theme="dark">
                 <dialog id="dialog-1">
                    <form method="dialog">
                        <div class="dialog-header">
                            <span>Wähle ...</span>
                            <button class="close">
                                <svg xmlns='http://www.w3.org/2000/svg' width="16" height="16" viewBox='0 0 16 16' fill='#CCC'>
                                    <path d='M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414z'/>
                                </svg>
                            </button>
                        </div>

                        <div class="buttons buttons-here">
                            <p>...</p>
                        </div>
                    </form>
                </dialog>
            </div>
        `

        this.dialog = shadow.querySelector('dialog')
    }

    showModal(items) {
        this.dialog.showModal()

        const modalContent = this.shadowRoot.querySelector('.buttons-here');
        modalContent.innerHTML = '';

        items.forEach(item => {
            const button = document.createElement('button');
            button.className = 'btn';

            if (item.innerHTML) {
                button.innerHTML = item.innerHTML;
            }

            if (item.icon) {
                const img = document.createElement('img');
                img.src = item.icon;
                img.style.marginRight = '8px';
                img.style.width = '24px';
                img.style.height = '24px';
                button.appendChild(img);
            }

            button.appendChild(document.createTextNode(item.name));

            if (item.bgColor) {
                button.style.setProperty('--bg-color', item.bgColor);
            }

            button.onclick = () => {
                item.f(); // call function
            };
            modalContent.appendChild(button);
        });
    }

    closeModal() {
        this.dialog.close()
    }
});

const modal = document.createElement('menu-select-modal');
document.body.appendChild(modal);

// ------------------------------------------------------------
// info dialog handler

customElements.define('nzblnk-info-modal', class NzbInfoModal extends HTMLElement {
    constructor() {
        super();
        this.createModal()
        this.closeTimer = null
    }

    createModal() {
        // Create a shadow root
        const shadow = this.attachShadow({mode: "open"});
        // language=HTML
        shadow.innerHTML = `
            <style>

                .btn {
                    align-items: center;
                    background-color: #06f;
                    border: 2px solid #06f;
                    box-sizing: border-box;
                    color: #fff;
                    cursor: pointer;
                    display: inline-flex;
                    fill: #000;
                    font-size: 24px;
                    font-weight: 400;
                    height: 48px;
                    justify-content: center;
                    line-height: 24px;
                    width: 100%;
                    outline: 0;
                    padding: 0 17px;
                    text-align: center;
                    text-decoration: none;
                    transition: all .3s;
                    user-select: none;
                    -webkit-user-select: none;
                    touch-action: manipulation;
                    border-radius: 5px;
                }

                .btn:hover {
                    background-color: #3385ff;
                    border-color: #3385ff;
                    fill: #06f;
                }

                dialog {
                    border: none !important;
                    border-radius: calc(5px * 3.74);
                    box-shadow: 0 0 #0000, 0 0 #0000, 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    background-color: rgb(33, 37, 41);
                    max-width: max(400px, 100vw);
                    padding: 2rem;
                    width: min(400px, 90vw);
                }

                dialog::backdrop {
                    background-color: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(4px);
                }

                .dialog-header {
                    color: white;
                    font-family: Inter, sans-serif;
                    font-size: 22px;
                    font-weight: 600;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-bottom: 15px;
                    margin-bottom: 15px;
                    border-bottom: 1px solid #444;
                }

                .close {
                    all: initial;
                    background: unset;
                    padding: 5px;
                    margin: 0;
                    border: unset;
                }

                .close:not(:hover) {
                    opacity: 0.3; /* Leichte Transparenz bei Hover */
                }

                .dialog-content {
                    color: whitesmoke;
                }

            </style>

            <div data-bs-theme="dark">
                <dialog id="dialog-2">
                    <form method="dialog">
                        <div class="dialog-header">
                            <span>Info</span>
                            <button class="close">
                                <svg xmlns='http://www.w3.org/2000/svg' width="16" height="16" viewBox='0 0 16 16'
                                     fill='#CCC'>
                                    <path d='M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414z'/>
                                </svg>
                            </button>
                        </div>

                        <div class="dialog-content">

                        </div>
                    </form>
                </dialog>
            </div>
        `

        this.dialog = shadow.querySelector('dialog')
        this.modalContent = shadow.querySelector('.dialog-content')
    }

    showModal(callback) {
        this.dialog.showModal()
    }

    resetModal() {
        this.modalContent.innerHTML = '';
    }

    print(message) {
        let p = document.createElement('p');
        console.log("Info:", message)
        p.innerHTML = message
        this.modalContent.appendChild(p)
    }

    error(message) {
        let p = document.createElement('p');
        p.style.color = 'red'
        console.error("Error:", message)
        p.innerHTML = message
        this.modalContent.appendChild(p)
    }

    closeModal() {
        this.dialog.close()
        clearTimeout(this.closeTimer)
    }

    closeIn(time) {
        this.closeTimer = setTimeout(() => {
            this.closeModal()
        }, time)
    }
});

const infoModal = document.createElement('nzblnk-info-modal');
document.body.appendChild(infoModal);

// ------------------------------------------------------------
// settings modal

customElements.define('nzblnk-settings-modal', class NzbSettingsModal extends HTMLElement {
    constructor() {
        super();
        this.createModal();
        this.activeTab = 'general';
    }

    createModal() {
        const shadow = this.attachShadow({mode: "open"});
        // language=HTML
        shadow.innerHTML = `
            <style>
                :host {
                    --primary-color: #0066ff;
                    --primary-dark: #0055cc;
                    --success-color: #28a745;
                    --success-dark: #218838;
                    --danger-color: #dc3545;
                    --danger-dark: #c82333;
                    --info-color: #17a2b8;
                    --info-dark: #138496;
                    --bg-dark: #212529;
                    --bg-card: #2a2a2a;
                    --border-color: #444;
                    --text-color: #f5f5f5;
                    --text-muted: #aaa;
                    --shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.12);
                    --anim-duration: 0.2s;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    font-size: 16px;
                }

                * {
                    box-sizing: border-box;
                }

                /* Animations */
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }

                @keyframes slideUp {
                    from {
                        transform: translateY(20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }

                @keyframes slideInRight {
                    from {
                        transform: translateX(20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }

                /* Toast notification */
                .toast {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    padding: 12px 20px;
                    background-color: var(--success-color);
                    color: white;
                    border-radius: 8px;
                    box-shadow: var(--shadow);
                    z-index: 9999;
                    animation: slideUp 0.3s ease-out;
                    max-width: 300px;
                }

                .toast.error {
                    background-color: var(--danger-color);
                }

                dialog {
                    border: none !important;
                    border-radius: 16px;
                    box-shadow: var(--shadow);
                    background-color: var(--bg-dark);
                    padding: 0;
                    max-height: 90vh;
                    width: 90vw;
                    max-width: 550px;
                    overflow: hidden;
                    color: var(--text-color);
                    animation: fadeIn 0.3s, slideUp 0.3s;
                }

                dialog::backdrop {
                    background-color: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(4px);
                    animation: fadeIn 0.3s;
                }

                .dialog-container {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    max-height: 90vh;
                }

                .dialog-header {
                    color: var(--text-color);
                    font-size: 22px;
                    font-weight: 600;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 24px;
                    border-bottom: 1px solid var(--border-color);
                    background-color: rgba(0, 0, 0, 0.2);
                }

                .dialog-content {
                    flex: 1;
                    overflow-y: auto;
                    overflow-x: hidden;
                    padding: 0;
                }

                .dialog-footer {
                    padding: 16px 24px;
                    border-top: 1px solid var(--border-color);
                    background-color: rgba(0, 0, 0, 0.2);
                    display: flex;
                    justify-content: flex-end;
                }

                .close {
                    all: initial;
                    background: unset;
                    width: 36px;
                    height: 36px;
                    margin: 0;
                    border: unset;
                    border-radius: 50%;
                    cursor: pointer;
                    transition: all var(--anim-duration);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .close:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                    transform: scale(1.1);
                }

                .close:active {
                    transform: scale(0.95);
                }

                .close svg {
                    width: 20px;
                    height: 20px;
                    opacity: 0.8;
                    transition: opacity var(--anim-duration);
                }

                .close:hover svg {
                    opacity: 1;
                }

                .settings-content {
                    padding: 0;
                    width: 100%;
                }

                .tab-navigation {
                    display: flex;
                    background-color: rgba(0, 0, 0, 0.2);
                    padding: 4px;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                    gap: 2px;
                    overflow-x: auto;
                    min-height: 50px;
                }

                .tab-navigation::-webkit-scrollbar {
                    display: none;
                }

                .tab-button {
                    background-color: transparent;
                    color: var(--text-muted);
                    border: none;
                    padding: 0 20px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 15px;
                    font-weight: 500;
                    transition: all var(--anim-duration);
                    white-space: nowrap;
                    flex-shrink: 0;
                }

                .tab-button:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                    color: var(--text-color);
                }

                .tab-button.active {
                    background-color: var(--primary-color);
                    color: white;
                }

                .tab-content {
                    display: none;
                    padding: 24px;
                    width: 100%;
                    overflow-x: hidden;
                }

                .tab-content.active {
                    display: block;
                    animation: fadeIn 0.3s;
                }

                .settings-section {
                    margin-bottom: 32px;
                    padding-bottom: 24px;
                    border-bottom: 1px solid var(--border-color);
                    width: 100%;
                }

                .settings-section:last-child {
                    margin-bottom: 0;
                    padding-bottom: 0;
                    border-bottom: none;
                }

                .settings-section h3 {
                    margin-top: 0;
                    margin-bottom: 16px;
                    color: var(--text-color);
                    font-size: 18px;
                    font-weight: 600;
                }

                label {
                    display: block;
                    margin-bottom: 20px;
                    font-weight: 500;
                    width: 100%;
                }

                label.checkbox-label {
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                }

                input[type="text"],
                input[type="password"],
                select {
                    width: 100%;
                    padding: 8px 12px;
                    margin-top: 8px;
                    background-color: rgba(255, 255, 255, 0.1);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    color: white;
                    font-size: 16px;
                    transition: all var(--anim-duration);
                }

                input[type="text"]:focus,
                input[type="password"]:focus,
                select:focus {
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 2px rgba(0, 102, 255, 0.25);
                    outline: none;
                }

                input[type="checkbox"] {
                    margin-right: 12px;
                    width: 20px;
                    height: 20px;
                    cursor: pointer;
                    accent-color: var(--primary-color);
                    flex-shrink: 0;
                }

                button {
                    background-color: var(--primary-color);
                    color: white;
                    border: none;
                    padding: 9.5px 15px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 15px;
                    font-weight: 500;
                    transition: all var(--anim-duration);
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }

                button:hover {
                    background-color: var(--primary-dark);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }

                button:active {
                    transform: translateY(1px);
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                }

                button:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                    transform: none;
                }

                /* Category styles */
                .category-list {
                    margin-bottom: 20px;
                    width: 100%;
                }

                .category-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background-color: var(--bg-card);
                    padding: 12px 16px;
                    margin-bottom: 10px;
                    border-radius: 8px;
                    border: 1px solid var(--border-color);
                    transition: all var(--anim-duration);
                    width: 100%;
                    animation: slideInRight 0.3s;
                }

                .category-item:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow);
                }

                .category-item span {
                    font-size: 15px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .remove-category {
                    background-color: transparent;
                    color: var(--danger-color);
                    border: none;
                    font-size: 20px;
                    width: 36px;
                    height: 36px;
                    padding: 0;
                    margin: 0;
                    cursor: pointer;
                    transition: all var(--anim-duration);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    flex-shrink: 0;
                }

                .remove-category:hover {
                    background-color: rgba(220, 53, 69, 0.1);
                    transform: scale(1.2);
                    box-shadow: none;
                }

                .category-form {
                    display: flex;
                    flex-direction: row;
                    align-items: end;
                    margin-bottom: 16px;
                    width: 100%;
                    gap: 8px;
                }

                .add-category {
                    background-color: var(--success-color);
                }

                .add-category:hover {
                    background-color: var(--success-dark);
                }

                .load-categories {
                    background-color: var(--info-color);
                    margin-bottom: 20px;
                }

                .load-categories:hover {
                    background-color: var(--info-dark);
                }

                .action-buttons {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    margin-top: 16px;
                }

                .action-buttons button {
                    flex: 1 1 auto;
                    min-width: 150px;
                    margin-top: 0;
                    margin-right: 0;
                }

                .save-settings {
                    background-color: var(--success-color);
                    font-weight: 600;
                    padding: 14px 24px;
                    font-size: 16px;
                    border-radius: 8px;
                }

                .save-settings:hover {
                    background-color: var(--success-dark);
                }

                .empty-message {
                    background-color: rgba(0, 0, 0, 0.2);
                    padding: 16px;
                    border-radius: 8px;
                    text-align: center;
                    color: var(--text-muted);
                    margin-bottom: 20px;
                }

                @media (max-width: 600px) {
                    dialog {
                        width: 100vw;
                        max-width: 100vw;
                        max-height: 100vh;
                        height: 100vh;
                        border-radius: 0;
                        margin: 0;
                    }

                    .dialog-header, .dialog-footer {
                        padding: 16px;
                    }

                    .tab-button {
                        padding: 12px 16px;
                        font-size: 14px;
                    }

                    .tab-content {
                        padding: 16px;
                    }

                    button {
                        padding: 14px 20px;
                        margin-right: 0;
                    }

                    .dialog-footer {
                        flex-direction: column;
                    }

                    .save-settings {
                        width: 100%;
                        margin-right: 0;
                    }

                    .category-item {
                        flex-wrap: wrap;
                        padding: 16px;
                    }

                    .category-item span {
                        width: calc(100% - 45px);
                    }

                    .toast {
                        left: 20px;
                        right: 20px;
                        max-width: unset;
                        text-align: center;
                    }
                }
            </style>

            <div>
                <dialog id="settings-dialog">
                    <form method="dialog">
                        <div class="dialog-container">
                            <div class="dialog-header">
                                <span>Einstellungen</span>
                                <button class="close" type="button">
                                    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='#CCC'>
                                        <path d='M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414z'/>
                                    </svg>
                                </button>
                            </div>

                            <div class="tab-navigation">
                                <button type="button" class="tab-button active" data-tab="general">Allgemein</button>
                                <button type="button" class="tab-button" data-tab="sab">SABnzbd</button>
                                <button type="button" class="tab-button" data-tab="nzbget">NzbGet</button>
                                <button type="button" class="tab-button" data-tab="importexport" title="Import/Export">
                                    Import/Export
                                </button>
                            </div>

                            <div class="dialog-content">
                                <div class="settings-content">
                                    <div id="general-tab" class="tab-content active">
                                        <div class="settings-section">
                                            <h3>Allgemeine Einstellungen</h3>
                                            <label>
                                                Ausgabe:
                                                <select id="ausgabe">
                                                    <option value="download">Download</option>
                                                    <option value="sabnzbd">Sabnzbd</option>
                                                    <option value="sab_menu">Sabnzbd Menü</option>
                                                    <option value="nzbget">NzbGet</option>
                                                    <option value="nzbget_menu">NzbGet Menü</option>
                                                </select>
                                            </label>
                                            <label class="checkbox-label">
                                                <input type="checkbox" id="disable_success_alert">
                                                Erfolgs-Benachrichtigungen deaktivieren
                                            </label>
                                        </div>
                                    </div>

                                    <div id="sab-tab" class="tab-content">
                                        <div class="settings-section">
                                            <h3>SABnzbd Verbindung</h3>
                                            <label>
                                                SABnzbd URL:
                                                <input type="text" id="sab_url" placeholder="http://localhost:8080/api">
                                            </label>
                                            <label>
                                                SABnzbd API Key:
                                                <input type="password" id="sab_api_key">
                                            </label>
                                        </div>

                                        <div class="settings-section" id="sab_default_category-section">
                                            <label id="sab_default_category-label">
                                                Standard Kategorie:
                                                <input type="text" id="sab_default_category" placeholder="*">
                                            </label>
                                        </div>

                                        <div class="settings-section" id="sab-cat-list">
                                            <h3>Kategorien</h3>

                                            <label class="checkbox-label">
                                                <input type="checkbox" id="sab_sub_menu">
                                                SAB Buttons als Untermenü anzeigen
                                            </label>

                                            <div id="sab-categories-container"></div>
                                            <div class="category-form">
                                                <label style="margin: 0;">
                                                    Neue Kategorie:
                                                    <input type="text" id="new-category" placeholder="Kategoriename">
                                                </label>
                                                <button type="button" class="add-category">+</button>
                                            </div>
                                            <button type="button" class="load-categories">Kategorien von SABnzbd laden
                                            </button>
                                        </div>
                                    </div>

                                    <div id="nzbget-tab" class="tab-content">
                                        <div class="settings-section">
                                            <h3>NzbGet Verbindung</h3>
                                            <label>
                                                URL:
                                                <input type="text" id="nzbget_url" name="nzbget_url"
                                                       placeholder="http://localhost:8080">
                                            </label>
                                            <label>
                                                Nutzername:
                                                <input type="text" id="nzbget_username">
                                            </label>
                                            <label>
                                                Passwort:
                                                <input type="password" id="nzbget_password">
                                            </label>
                                        </div>
                                    </div>

                                    <div id="importexport-tab" class="tab-content">
                                        <div class="settings-section">
                                            <h3>Import/Export Einstellungen</h3>
                                            <div class="action-buttons">
                                                <button type="button" class="export-settings">Exportieren</button>
                                                <input type="file" accept="application/json" style="display:none"
                                                       class="import-file-input">
                                                <button type="button" class="import-settings">Importieren</button>
                                            </div>

                                            <div class="import-result" style="margin-top:10px;color:#aaa;"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="dialog-footer">
                                <button type="button" class="save-settings">Einstellungen speichern</button>
                            </div>
                        </div>
                    </form>
                </dialog>
            </div>
        `;

        // Tabs and Basic Elements
        this.tabButtons = shadow.querySelectorAll('.tab-button');
        this.tabContents = shadow.querySelectorAll('.tab-content');
        this.closeButton = shadow.querySelector('.close');
        this.dialog = shadow.querySelector('#settings-dialog');
        this.saveButton = shadow.querySelector('.save-settings');

        // Sab
        this.sabCategoriesContainer = shadow.querySelector('#sab-categories-container');
        this.addCategoryButton = shadow.querySelector('.add-category');
        this.loadCategoriesButton = shadow.querySelector('.load-categories');

        // Import/Export
        this.exportButton = shadow.querySelector('.export-settings');
        this.importButton = shadow.querySelector('.import-settings');
        this.importFileInput = shadow.querySelector('.import-file-input');
        this.importResult = shadow.querySelector('.import-result');

        // Event-Listener einrichten
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Select-Change-Event für Ausgabe-Typ
        this.shadowRoot.querySelector('#ausgabe').addEventListener('change', () => this.updateShowAndHidden());

        // Tab-Navigation
        this.tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });

        // Schließen-Button im Dialog
        this.closeButton.addEventListener('click', () => this.closeModal());

        // Buttons-Events
        this.saveButton.addEventListener('click', () => this.saveSettings());
        this.addCategoryButton.addEventListener('click', () => this.addCategory());
        this.loadCategoriesButton.addEventListener('click', () => this.loadCategoriesFromSAB());

        // Enter-Taste zum Hinzufügen einer Kategorie
        const newCategoryInput = this.shadowRoot.querySelector('#new-category');
        newCategoryInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addCategory();
            }
        });

        // Verhindern, dass Events an die Seite weitergegeben werden
        this.dialog.addEventListener('keydown', this.stopPropagation);
        this.dialog.addEventListener('keyup', this.stopPropagation);
        this.dialog.addEventListener('keypress', this.stopPropagation);
        this.dialog.addEventListener('mousedown', this.stopPropagation);
        this.dialog.addEventListener('mouseup', this.stopPropagation);
        this.dialog.addEventListener('click', this.stopPropagation);

        // Import/Export Events
        if (this.exportButton) {
            this.exportButton.addEventListener('click', () => this.handleExportSettings());
        }
        if (this.importButton) {
            this.importButton.addEventListener('click', () => this.importFileInput.click());
        }
        if (this.importFileInput) {
            this.importFileInput.addEventListener('change', (e) => this.handleImportSettings(e));
        }
    }

    stopPropagation(e) {
        e.stopPropagation();
    }

    showToast(message, isError = false) {
        // Alte Toast-Nachricht entfernen, falls vorhanden
        const oldToast = this.shadowRoot.querySelector('.toast');
        if (oldToast) {
            oldToast.remove();
        }

        // Neue Toast-Nachricht erstellen
        const toast = document.createElement('div');
        toast.className = `toast ${isError ? 'error' : ''}`;
        toast.textContent = message;

        this.dialog.appendChild(toast);

        // Toast nach 3 Sekunden automatisch ausblenden
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            toast.style.transition = 'opacity 0.3s, transform 0.3s';

            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Import / Export Settings

    handleExportSettings() {
        const settings = {
            // Allgemeine Einstellungen
            ausgabe: this.shadowRoot.querySelector('#ausgabe').value,
            disable_success_alert: this.shadowRoot.querySelector('#disable_success_alert').checked,

            // SABnzbd-Einstellungen
            sab_url: this.shadowRoot.querySelector('#sab_url').value,
            sab_api_key: this.shadowRoot.querySelector('#sab_api_key').value,
            sab_default_category: this.shadowRoot.querySelector('#sab_default_category').value,
            sab_sub_menu: this.shadowRoot.querySelector('#sab_sub_menu').checked,
            sab_categories: SETTINGS.sab_categories || [],

            // NzbGet-Einstellungen
            nzbget_url: this.shadowRoot.querySelector('#nzbget_url').value,
            nzbget_username: this.shadowRoot.querySelector('#nzbget_username').value,
            nzbget_password: this.shadowRoot.querySelector('#nzbget_password').value,
        };

        saveFile({
            fileName: 'nzb-loader-settings',
            fileType: 'application/json',
            responseText: JSON.stringify(settings, null, 2),
            fileExtension: '.json'
        })
    }

    handleImportSettings(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const settings = JSON.parse(e.target.result);
                Object.assign(SETTINGS, settings);
                this.loadCurrentSettings();

                this.importResult.textContent = 'Einstellungen erfolgreich importiert';
                this.importResult.style.color = 'var(--success-color)';
            } catch (error) {
                this.importResult.textContent = 'Fehler beim Import: ' + error.message;
                this.importResult.style.color = 'var(--danger-color)';
            }
        };
        reader.readAsText(file);
    }

    // Modal Things

    updateShowAndHidden() {
        const ausgabeValue = this.shadowRoot.querySelector('#ausgabe').value;

        // tabs
        const sabnzbd_tab_button = this.shadowRoot.querySelector('.tab-button[data-tab="sab"]');
        const nzbget_tab_button = this.shadowRoot.querySelector('.tab-button[data-tab="nzbget"]');

        // sections
        const sab_default_cat = this.shadowRoot.querySelector('#sab_default_category-section');
        const sab_cat_list = this.shadowRoot.querySelector('#sab-cat-list');


        if (ausgabeValue === 'sab_menu') {
            sab_default_cat.style.display = 'none';
            sab_cat_list.style.display = 'block';
        } else {
            sab_default_cat.style.display = 'block';
            sab_cat_list.style.display = 'none';
        }

        if (ausgabeValue === 'sab_menu' || ausgabeValue === 'sabnzbd') {
            sabnzbd_tab_button.style.display = 'block';
        } else {
            sabnzbd_tab_button.style.display = 'none';
        }

        if (ausgabeValue === 'nzbget' || ausgabeValue === 'nzbget_menu') {
            nzbget_tab_button.style.display = 'block';
        } else {
            nzbget_tab_button.style.display = 'none';
        }

    }

    showModal() {
        // Event-Listener für die globalen Tastatur-Events
        document.addEventListener('keydown', this.globalKeydownHandler = (e) => {
            // Verhindern, dass bestimmte Tastenkombinationen durchsickern
            if ((e.ctrlKey || e.metaKey || e.altKey) ||
                ['Escape', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                // Erlauben Sie Tab innerhalb des Dialogs, aber stoppen Sie die Propagation
                if (e.key === 'Tab' && this.dialog.open) {
                    // Erlaube Tab-Navigation innerhalb des Dialogs
                    return;
                }
                e.stopPropagation();
            }
        }, true);

        this.loadCurrentSettings();
        this.updateShowAndHidden();
        this.dialog.showModal();

        // Fokus auf das erste Element im Dialog setzen, um Tastaturbedienung zu erleichtern
        setTimeout(() => {
            const firstInput = this.shadowRoot.querySelector('select, input, button:not(.close)');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    }

    closeModal() {
        // Event-Listener für globale Tastatur-Events entfernen
        if (this.globalKeydownHandler) {
            document.removeEventListener('keydown', this.globalKeydownHandler, true);
            this.globalKeydownHandler = null;
        }

        this.dialog.close();
    }

    switchTab(tabName) {
        this.activeTab = tabName;

        // Tab-Buttons aktualisieren
        this.tabButtons.forEach(button => {
            button.classList.toggle('active', button.getAttribute('data-tab') === tabName);
        });

        // Tab-Inhalte aktualisieren
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });

        // Export-Textarea ausblenden, wenn Tab gewechselt wird
        if (this.importResult) this.importResult.textContent = '';
    }

    // Categories show edit and remove

    renderCategories() {
        this.sabCategoriesContainer.innerHTML = '';

        if (SETTINGS.sab_categories && SETTINGS.sab_categories.length > 0) {
            const categoryList = document.createElement('div');
            categoryList.className = 'category-list';

            SETTINGS.sab_categories.forEach((category, index) => {
                const categoryItem = document.createElement('div');
                categoryItem.className = 'category-item';
                categoryItem.innerHTML = `
                    <span>${category}</span>
                    <button type="button" class="remove-category" data-index="${index}">×</button>
                `;
                categoryList.appendChild(categoryItem);

                // Event-Listener zum Entfernen-Button
                const removeButton = categoryItem.querySelector('.remove-category');
                removeButton.addEventListener('click', () => this.removeCategory(index));
            });

            this.sabCategoriesContainer.appendChild(categoryList);
        } else {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.innerHTML = `
                <p>Keine Kategorien definiert</p>
                <p>Füge Kategorien manuell hinzu oder lade sie von SABnzbd</p>
            `;
            this.sabCategoriesContainer.appendChild(emptyMessage);
        }
    }

    addCategory() {
        const newCategoryInput = this.shadowRoot.querySelector('#new-category');
        const categoryName = newCategoryInput.value.trim();

        if (!categoryName) {
            this.showToast('Bitte gib einen Kategorienamen ein', true);
            return;
        }

        // Kategorien-Array initialisieren, falls nicht vorhanden
        if (!SETTINGS.sab_categories) {
            SETTINGS.sab_categories = [];
        }

        // Prüfen, ob Kategorie bereits existiert
        if (SETTINGS.sab_categories.includes(categoryName)) {
            this.showToast('Diese Kategorie existiert bereits', true);
            return;
        }

        // Neue Kategorie hinzufügen
        SETTINGS.sab_categories.push(categoryName);

        // Eingabe löschen und Kategorien neu rendern
        newCategoryInput.value = '';
        this.renderCategories();
        this.showToast(`Kategorie "${categoryName}" hinzugefügt`);
    }

    removeCategory(index) {
        const categoryName = SETTINGS.sab_categories[index];

        // Erstelle ein eigenes Bestätigungsdialog
        const confirmRemove = confirm(`Möchtest du die Kategorie "${categoryName}" wirklich entfernen?`);

        if (confirmRemove) {
            SETTINGS.sab_categories.splice(index, 1);
            this.renderCategories();
            this.showToast(`Kategorie "${categoryName}" entfernt`);
        }
    }

    loadCategoriesFromSAB() {
        let sab_url = this.shadowRoot.querySelector('#sab_url').value || SETTINGS.sab_url || '';
        let sab_api_key = this.shadowRoot.querySelector('#sab_api_key').value || SETTINGS.sab_api_key || '';

        if (!sab_url || !sab_api_key) {
            this.showToast('Bitte gib zuerst die SABnzbd URL und den API-Key ein', true);
            return;
        }

        this.loadCategoriesButton.textContent = 'Lade...';
        this.loadCategoriesButton.disabled = true;

        SABNZBD.getCategories({
            sab_url: sab_url,
            sab_api_key: sab_api_key,
            callback: (categories) => {
                if (categories && categories.length > 0) {
                    SETTINGS.sab_categories = categories;
                    this.renderCategories();
                    this.showToast(`${categories.length} Kategorien von SABnzbd geladen`);
                } else {
                    this.showToast('Keine Kategorien in SABnzbd gefunden', true);
                }
                this.loadCategoriesButton.textContent = 'Kategorien von SABnzbd laden';
                this.loadCategoriesButton.disabled = false;
            },
            failed_callback: (error) => {
                console.error('Fehler beim Laden der Kategorien:', error);
                this.showToast('Fehler beim Laden der Kategorien. Bitte überprüfe die SABnzbd Einstellungen.', true);
                this.loadCategoriesButton.textContent = 'Kategorien von SABnzbd laden';
                this.loadCategoriesButton.disabled = false;
            }
        });
    }

    // Settings save and load

    loadCurrentSettings() {
        // Allgemeine Einstellungen laden
        const ausgabeSelect = this.shadowRoot.querySelector('#ausgabe');
        const disableSuccessAlert = this.shadowRoot.querySelector('#disable_success_alert');

        ausgabeSelect.value = SETTINGS.ausgabe || 'menu';
        disableSuccessAlert.checked = SETTINGS.disable_success_alert || false;

        // SABnzbd-Einstellungen laden
        this.shadowRoot.querySelector('#sab_url').value = SETTINGS.sab_url || '';
        this.shadowRoot.querySelector('#sab_api_key').value = SETTINGS.sab_api_key || '';
        this.shadowRoot.querySelector('#sab_default_category').value = SETTINGS.sab_default_category || '';
        this.shadowRoot.querySelector('#sab_sub_menu').checked = SETTINGS.sab_sub_menu || false;

        // NzbGet-Einstellungen laden
        this.shadowRoot.querySelector('#nzbget_url').value = SETTINGS.nzbget_url || '';
        this.shadowRoot.querySelector('#nzbget_username').value = SETTINGS.nzbget_username || '';
        this.shadowRoot.querySelector('#nzbget_password').value = SETTINGS.nzbget_password || '';

        // SAB-Kategorien laden
        this.renderCategories();
    }

    saveSettings() {
        const newSettings = {
            // Allgemeine Einstellungen
            ausgabe: this.shadowRoot.querySelector('#ausgabe').value,
            disable_success_alert: this.shadowRoot.querySelector('#disable_success_alert').checked,

            // SABnzbd-Einstellungen
            sab_url: this.shadowRoot.querySelector('#sab_url').value,
            sab_api_key: this.shadowRoot.querySelector('#sab_api_key').value,
            sab_default_category: this.shadowRoot.querySelector('#sab_default_category').value,
            sab_sub_menu: this.shadowRoot.querySelector('#sab_sub_menu').checked,
            sab_categories: SETTINGS.sab_categories || [],

            // NzbGet-Einstellungen
            nzbget_url: this.shadowRoot.querySelector('#nzbget_url').value,
            nzbget_username: this.shadowRoot.querySelector('#nzbget_username').value,
            nzbget_password: this.shadowRoot.querySelector('#nzbget_password').value,
        };

        // Einstellungen speichern
        saveSettings(newSettings).then(() => {
            console.log('Einstellungen gespeichert:', newSettings);

            // Speicher-Animation
            this.saveButton.disabled = true;
            this.saveButton.textContent = 'Gespeichert!';
            this.saveButton.style.backgroundColor = 'var(--success-color)';

            // Bestätigung anzeigen
            this.showToast('Einstellungen gespeichert! Seite wird neu geladen...');

            // reload site
            setTimeout(() => {
                location.reload();
            }, 2000);
        });


    }
});

const settingsModal = document.createElement('nzblnk-settings-modal');
document.body.appendChild(settingsModal);

// ------------------------------------------------------------
// nzb handler

function handleNzb(downloadLink, fileName, password) {

    infoModal.print(`Nzb wurde gefunden: <a href='${downloadLink}'>Link</a> (Fallback)`)
    console.log("Nzb Link:", downloadLink, "Name:", fileName, "Passwort:", password)

    const actions = {
        download: () => {
            downloadAndSave({downloadLink, fileName, password})
        },
        sab_menu: () => {
            const parameters = {downloadLink, fileName, password}

            const buttons = [getDownloadButton(parameters)];

            if (SETTINGS.sab_categories && SETTINGS.sab_categories.length > 1) {
                const sabButtons = getCategoriesButtons(parameters);

                if (SETTINGS.sab_sub_menu) {
                    buttons.push({
                        name: 'Zu Sabnzbd',
                        f: () => {
                            modal.showModal([
                                {
                                    name: 'Zurück',
                                    bgColor: '#4F959D',
                                    f: () => {
                                        modal.showModal(buttons)
                                    }
                                },
                                ...sabButtons
                            ])
                        },
                        icon: 'https://raw.githubusercontent.com/sabnzbd/sabnzbd/refs/heads/develop/icons/sabnzbd.ico'
                    })
                } else {
                    buttons.push(...sabButtons)
                }
            } else {
                buttons.push({
                    name: 'Sabnzbd download',
                    f: () => {
                        let category = '*'

                        if (SETTINGS.sab_categories) {
                            category = SETTINGS.sab_categories[0] || '*'
                        }

                        SABNZBD.addUrl({downloadLink, fileName, password, category})
                    },
                    icon: 'https://raw.githubusercontent.com/sabnzbd/sabnzbd/refs/heads/develop/icons/sabnzbd.ico'
                })
            }

            openMenu(buttons).then(
                () => {
                    console.log('menu opened')
                }
            )
        },
        sabnzbd: () => {
            SABNZBD.addUrl({downloadLink, fileName, password, category: SETTINGS.sab_default_category || '*'})
        },
        nzbget: () => {
            NZBGET.addUrl({downloadLink, fileName, password})
        },
        nzbget_menu: () => {
            const buttons = [
                getDownloadButton({downloadLink, fileName, password}),
                {
                    name: 'NzbGet',
                    f: () => {
                        NZBGET.addUrl({downloadLink, fileName, password})
                    },
                    icon: 'https://avatars.githubusercontent.com/u/140404006?s=64'
                }
            ]

            openMenu(buttons).then(
                () => {
                    console.log('menu opened')
                }
            )
        },
        custom: () => {
            customHandler({downloadLink, fileName, password})
        }
    }

    let selected_action = actions[SETTINGS.ausgabe]
    if (!selected_action) {
        console.error("Ungültige AUSGABE Konfiguration")
        alert("Ungültige AUSGABE Konfiguration")
        return;
    }
    selected_action()
}

function parseNzblnkUrl(url) {
    // Entferne 'nzblnk:?' vom Anfang der URL
    let paramsString = url.slice(url.indexOf("?") + 1);

    // Analysiere die Parameter
    const params = new URLSearchParams(paramsString);

    // Füge die Parameter zu einem Objekt hinzu
    let result = {};
    for (let param of params) {
        result[param[0]] = param[1];
    }

    return result;
}

// ------------------------------------------------------------
// load from ...

function loadFromNzbKing(nzb_info, when_failed) {
    console.log("Suche auf nzbking.com")
    GM_xmlhttpRequest({
        method: "GET",
        url: "https://www.nzbking.com/?q=" + nzb_info.h,
        onload: function (response) {
            console.log("King:", response)
            let parser = new DOMParser();
            let doc = parser.parseFromString(response.responseText, 'text/html');

            const nzbLink = doc.querySelector('a[href^="/nzb:"]');
            if (nzbLink) {
                console.log("Auf nzbking gefunden");
                handleNzb("https://www.nzbking.com" + nzbLink.getAttribute('href'), nzb_info.t, nzb_info.p)
                return;
            }

            return when_failed()
        },
        onerror: function () {
            console.error("Request zu NzbKing fehlgeschlagen")
            when_failed()
        }
    });
}

function loadFromNzbIndex(nzb_info, when_failed) {
    console.log("Suche auf nzbindex.com")
    let url = `https://nzbindex.com/api/search?q=${nzb_info.h}&max=5&sort=agedesc`

    GM_xmlhttpRequest({
        method: "GET",
        url: url,
        onload: function (response) {
            console.log("nzbindex:", response)
            let data = JSON.parse(response.responseText);

            if (!data?.data) {
                console.error("Irgengendwas ist komisch bei nzbindex.com")
                console.log(data)
                return when_failed()
            }

            data = data.data

            if (data.page.totalElements === 0) {
                console.log("Nichts auf nzbindex.com gefunden")
                return when_failed()
            }

            if (data.content === undefined) {
                console.log("Keine Ergebnisse auf nzbindex.com gefunden - result is undefined")
                return when_failed()
            }

            if (data.content.length === 0) {
                console.log("Keine Ergebnisse auf nzbindex.com gefunden - result is empty")
                return when_failed()
            }

            if (!data.content[0]?.id) {
                console.log("Id ist nicht gesetzt bei nzbindex.com")
                return when_failed()
            }

            let ids = data.content.map(item => item.id).join(',');

            console.log("Auf nzbindex.com gefunden")
            handleNzb("https://nzbindex.com/download?ids=" + ids, nzb_info.t, nzb_info.p)
        },
        onerror: function (response) {
            console.log("Request zu nzbindex.com fehlgeschlagen")
            console.error(response)
            return when_failed()
        }
    });
}

function loadNzbLnk(nzblnk) {
    let nzb_info = parseNzblnkUrl(nzblnk)

    infoModal.resetModal()
    infoModal.showModal()

    const loadFunctions = [
        {
            info: "NzbIndex",
            func: loadFromNzbIndex,
        },
        {
            info: "NzbKing",
            func: loadFromNzbKing,
        }
    ]

    let load = function () {
        infoModal.print(`Keine Nzb gefunden :( `)
        setTimeout(() => {
            infoModal.closeModal()
        }, 6000)
    };

    Array.from(loadFunctions).reverse().forEach(function (f) {
        const old_load = load
        load = function () {
            infoModal.print(`Versuche ${f.info} ....`)

            return f.func(nzb_info, old_load)
        }
    })

    load()
}

// ------------------------------------------------------------
// settings menu command

// Register the settings menu command
if (GM.registerMenuCommand) {
    GM.registerMenuCommand("Einstellungen", () => {
        settingsModal.showModal();
    });
}

document.addEventListener('open-nzbload-settings', () => {
    settingsModal.showModal();
})

// ------------------------------------------------------------
// trigger

function checkHandelLink(url) {
    if (url.startsWith('nzblnk:')) {
        return true;
    }
    return false;
}

function handleLink(url) {
    loadNzbLnk(url);
}

// Event-Delegation für alle nzblnk-Links
document.body.addEventListener('click', (event) => {
    const linkElement = event.target.closest('a');
    const url = linkElement?.href;
    if (url && checkHandelLink(url)) {
        event.preventDefault();
        handleLink(url);
    }
});

console.log("finished loading nzb-load script", GM.info.script.version);
