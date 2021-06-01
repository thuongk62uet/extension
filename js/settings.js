class Settings {
    constructor() {
        this.MAX_LANGUAGES_AMOUNT = 5;
        this.storage = null;
        this.pageTitle = null;
        this.$allLanguagesSelect = $('#languages');
        this.$selectedLanguages = $('.selected-languages');
        this.translate = new Translation();
        this.handlers = new SettingsHandlers(this);
        this.run();
    }

    run() {
        this.initStorage().then(() => {
            this.setDefaultLanguage();
            this.initSupportedOptions();
            this.setDocumentTitle();
            this.showCheckedOptions();
            this.initListeners();
            this.translate.changeElementsVisibility();
        })
    }

    initStorage() {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(storage => {
                this.storage = storage;
                resolve();
            })
        })
    }

    setDefaultLanguage() {
        let val = this.storage.tl;
        $('#language_default').val(val);
    }

    initSupportedOptions() {
        this.translate.loadSupportedDblClickOptions();
        this.translate.loadSupportedIconTransOptions();
        this.translate.loadTranslateLanguages();
    }

    setDocumentTitle() {
        this.pageTitle = chrome.i18n.getMessage("name") + " - " + chrome.i18n.getMessage("settings");
        document.title = this.pageTitle;
    }

    showCheckedOptions() {
        $("#link").attr("href", `https://chrome.google.com/webstore/detail/${chrome.runtime.id}`); // link đến cửa hàng tiện ích của gg
        $("#instruction").html(chrome.i18n.getMessage("instruction"));
        $("#description").html(chrome.i18n.getMessage("description"));
        $("#title").html(this.pageTitle);
        $("#lb_translate_to_default").html(chrome.i18n.getMessage("translate_to_default"));
        $("#lb_translate_to_additional").html(chrome.i18n.getMessage("translate_to_additional"));
        $("#lb_view-mode").html(chrome.i18n.getMessage("view_mode"));
        $("#lb_double-click").html(chrome.i18n.getMessage("double_click"));
        $("#lb_icon-trans").html(chrome.i18n.getMessage("icon_trans"));
    }

    initListeners() {
        this.initDOMListeners();
    }

    initDOMListeners() {
        this.$allLanguagesSelect.on('change', this.handlers.handleLanguageAdding);

        document.querySelector("#language_default").addEventListener("change", function () {
            this.translate.save();
        }.bind(this));

        document.querySelector("#double-click").addEventListener("change", function () {
            this.translate.save();
        }.bind(this));

        document.querySelector("#icon-trans").addEventListener("change", function () {
            this.translate.save();
        }.bind(this));

        this.$selectedLanguages.on('click', '.selected-languages__delete', this.handlers.deleteSelectedLanguage);
    }

    saveToStorage(object, cb = () => {}) {
        chrome.storage.local.set(object, () => {
            if (chrome.runtime.lastError) {
                return console.error(`${ chrome.shortName.lastError.message } error has occured!`)
            }
            cb();
        })
    }

}

$(function () {
    new Settings();
});