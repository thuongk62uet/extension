class SettingsHandlers {
    constructor(context) {
        this.context = context;
        this.bindMethods();
    }

    bindMethods() {
        this.handleLanguageAdding = this.handleLanguageAdding.bind(this); //bind là phương pháp tạo ra 1 tính năng mới
        this.deleteSelectedLanguage = this.deleteSelectedLanguage.bind(this);
    }

    _isLanguageAlreadyAdded(checkedLanguage) {
        const { languagesList } = this.context.storage;
        const isLanguageAdded = languagesList.some(languageObj => languageObj.shortName === checkedLanguage);
        return isLanguageAdded;
    }

    _getLanguageFullName(shortName) {
        let fullName = null;
        LANGUAGES.forEach(languageObj => {
            if (languageObj.short === shortName) {
                fullName = languageObj.international;
            }
        })

        return fullName;
    }

    _isLanguagesListFull() {
        const { languagesList } = this.context.storage;
        return (languagesList.length < this.context.MAX_LANGUAGES_AMOUNT) ? false : true;
    }

    handleLanguageAdding(ev) {
        // lang in short format (en, de ...)
        const newLang = ev.currentTarget.value;
        const isLanguageAlreadyAdded = this._isLanguageAlreadyAdded(newLang);
        if (isLanguageAlreadyAdded) {
            return;
        }
        const languageForStoring = {
            shortName: newLang,
            fullName: this._getLanguageFullName(newLang)
        };
        const { languagesList } = this.context.storage;
        const isLanguagesListFull = this._isLanguagesListFull(newLang);
        if (isLanguagesListFull) {
            languagesList[0] = languageForStoring;
            this.context.saveToStorage({ languagesList }, () => {
                this.context.storage.languagesList = languagesList;
                this.context.translate.loadTranslateLanguages()
            });
            return;
        }

        languagesList.push(languageForStoring);
        this.context.saveToStorage({ languagesList }, () => {
            this.context.storage.languagesList = languagesList;
            this.context.translate.loadTranslateLanguages()
        });
    }

    deleteSelectedLanguage(ev) {
        const li = ev.currentTarget.closest('li');
        const shortName = li.dataset.short;
        let { languagesList } = this.context.storage;
        languagesList = languagesList.filter(languageObj => languageObj.shortName !== shortName);
        this.context.storage.languagesList = languagesList;
        this.context.saveToStorage({ languagesList }, () => li.remove());
    }

}