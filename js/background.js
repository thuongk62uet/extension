let openedWindowId;

//click vao icon bieu tuong cua tool -> open trang google translate
chrome.browserAction.onClicked.addListener(() => {
    if(openedWindowId){
        chrome.windows.update(openedWindowId, {focused: true}, ()=> {});
        return;
    }
    // tạo ra 1 windows form 
    chrome.windows.create({
        url: "https://translate.google.com/",
        type: "popup",
        height: 500, //460
        width: 1000, //700
        top: 200,
        left: (screen.width-1000)/2//leftPopupPosition
    }, (createdWindow) => {
    openedWindowId = createdWindow.id;
    chrome.tabs.executeScript(createdWindow.tabs[0].id, { file: "js/settings_injector.js" });
    });
});

chrome.windows.onRemoved.addListener(windowId => {
    if(windowId === openedWindowId) {
        openedWindowId = null;
    }
});

class Background {
    constructor() {
        this.Utils = new Config(this.configLoadCallback());
        this.translation = new Translation(this);
        this.storage = null;
        this.appWindowId = null;
        this.run();
        this.version = chrome.runtime.getManifest().version;
    }

    run() {
        this.initStorage();
        this.initListeners();
        this.translation.createContextMenu();
    }
    configLoadCallback() {
        var a = this;
        return function () {
            a.uid = a.Utils.getUserID()
        }
    }

    initStorage() {
        chrome.storage.local.get(storage => {
            this.storage = storage;
        })
    }

    initListeners() {
        this.initInstalledListeners();
        this.initMessageListeners();
        this.initWebrequestListeners();
        this.initStorageListeners();
    }

    initInstalledListeners() {
        chrome.runtime.onInstalled.addListener(a => {
            chrome.storage.local.set({
                time: new Date().getTime()
            }, () => {}), this.checkInstallReason(a.reason)
        })
    }

    initMessageListeners() {
        chrome.runtime.onMessage.addListener((msg, sender, sendResp) => {
            switch (msg.action) {
                case "openSettings":
                    this.showSettingsPage();
                    break;
                case "updateSettings":
                    this.updateSettingsPage();
                    break;
                case 'isAppWindowExists':
                    this.handleAppExistingRequest(sendResp);
                    break;
                default:
                    //console.warn('Something went wrong');
            }
            return true;
        })
    }

    showSettingsPage() {
        chrome.windows.getCurrent(current_window =>  {
            if(current_window.type === 'popup') {
                chrome.windows.remove(current_window.id, () => {});
                this.showSettingsPage();
                return;
            }

            let id = current_window.id;
            chrome.windows.update(id, {focused: true}, () => {})
            const settingsUrl = chrome.runtime.getURL("settings.html");
            chrome.tabs.query({
                windowId: id
            }, tabs => {
                let isTabExists = false,
                    tabId = null;
                tabs.forEach(tab => {
                    tab.url === settingsUrl && (isTabExists = true, tabId = tab.id)
                }), isTabExists ? chrome.tabs.update(tabId, {
                    highlighted: true
                }) : chrome.tabs.create({
                    url: settingsUrl
                })
            });
        });
    }

    updateSettingsPage() {
        chrome.windows.getCurrent(current_window =>  {
            let id = current_window.id;
            chrome.windows.update(id, {focused: true}, () => {})
            const settingsUrl = chrome.runtime.getURL("settings.html");
            chrome.tabs.query({
                windowId: id
            }, tabs => {
                let isTabExists = false,
                    tabId = null;
                tabs.forEach(tab => {
                    tab.url === settingsUrl && (isTabExists = true, tabId = tab.id)
                }),
                isTabExists ? chrome.tabs.reload(tabId) : true
            })
        });
    }

    deletePopupWindowsAfterReloadExtension() {
        chrome.windows.getAll({ populate : true, windowTypes: ["popup"] }, function(window_list) {
            window_list.forEach((i) => {
                chrome.windows.remove(i.id, ()=> {})
            })
        });
    }

    handleAppExistingRequest(sendResp) {
        const isAppWindowExist = this.appWindowId ? true : false;
        sendResp({ isAppWindowExist });
        if (isAppWindowExist) {
            chrome.windows.update(this.appWindowId, { focused: true }, window => {})
        }

        const queryObj = {
            active: true,
            currentWindow: !isAppWindowExist
        };

        chrome.tabs.query( queryObj , tabs => {
            const [ activeTab ] = tabs;
            chrome.tabs.sendMessage(activeTab.id, { action: 'getSelectedText'}, resp => {
                chrome.runtime.sendMessage({action: 'selectedText', selectedText:  resp.selectedText})
            })
        })

    }

    getTl(str) {
        const lang = str.match(/[a-zA-Z]+/);
        //console.log(lang);
        return lang[0]
    }

    checkInstallReason(reason) {
        let configuration;
        if (reason === 'install') {
            configuration = {
                tl: this.getTl(chrome.i18n.getUILanguage()),
                ft: true,
                uid: this.Utils.getUserID(),
                extId: chrome.runtime.id,
                date_install: (new Date()).getTime(),
                double_click: "double_click_true",
                icon_trans: "icon_trans_true",
                languagesList: [
                    {
                        fullName: this.getTlFullName(),
                        shortName: this.getTl(chrome.i18n.getUILanguage())
                    }
                ],
                recentLanguages_from: [],
                recentLanguages_to: []
            };
            //console.log(configuration)
            this.translation.openUrl('./settings.html', true);
        } else if (reason === 'update') {
            configuration = {
                tl: this.storage.tl,//this.getTl(chrome.i18n.getUILanguage()),
                ft: false,
                uid: this.Utils.getUserID(),
                extId: chrome.runtime.id,
                du: (new Date()).getTime(),
                double_click: "double_click_true",
                recentLanguages_from: [],
                recentLanguages_to: [],
                icon_trans: "icon_trans_true",
            };

            this.deletePopupWindowsAfterReloadExtension()
        }
        chrome.storage.local.set(configuration, () => {})
    }

    getTlFullName() {
        const tl = this.getTl(chrome.i18n.getUILanguage());
        let fullName = null;
        LANGUAGES.forEach(languageObj => {
            if (languageObj.short === tl) {
                fullName = languageObj.international;
            }
        })

        return fullName;
    }

    initWebrequestListeners() {
        chrome.webRequest.onHeadersReceived.addListener(this.handleIncomingHeaders, {
            urls: ["*://translate.google.com/*"]
        }, ["blocking", "responseHeaders"]), chrome.webRequest.onBeforeSendHeaders.addListener(this.modifyClientHeaders, {
            urls: ["*://translate.googleapis.com/*"]
        }, ["blocking", "requestHeaders", "extraHeaders"]), chrome.webRequest.onSendHeaders.addListener(() => {}, {
            urls: ["*://translate.googleapis.com/*"]
        }, ["requestHeaders"])
    }

    initStorageListeners() {
        chrome.storage.onChanged.addListener((changes, areaName) => {
            const keys = Object.keys(changes);
            keys.forEach(key => {
                this.storage[key] = changes[key].newValue;
                if (key === 'languagesList') {
                    this.handleMenuListChange();
                }
            })
        })
    }

    handleMenuListChange() {
        chrome.contextMenus.remove('languagesList', () => this.translation.createContextMenu());
    }

    handleIncomingHeaders({
        responseHeaders: a
    }) {
        return {
            responseHeaders: a.filter(a => "x-frame-options" !== a.name.toLowerCase())
        }
    }

    modifyClientHeaders({
        requestHeaders: a
    }) {
        return {
            requestHeaders: a.filter(a => "referer" !== a.name.toLowerCase())
        }
    }

}

const background = new Background;