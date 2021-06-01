
class Content{
    constructor() {
        this.storage = null;
        this.selectedFullObject = null; // result of getSelection()
        this.selectBounding = null; // getBoundingRect of selecting text
        this.selectedText = null;
        this.translateButton = null;
        this.translateTooltip = null;
        this.tooltipHeader = null;
        this.translatedText = null;
        this.dblClickToggleBtn = null;
        this.iconTransToggleBtn = null;
        this.audioElement = null;
        this.translatedLang = null;
        this.speechLinks = {
            originLangLinks: [],
            targetLangLinks: []
        };

        this.translate_utils = new TranslateUtils(this);
        this.audio_utils = new AudioUtils(this);
        this.run();
    }

    run() {
        this.initStorage()
            .then(() => {
                this.insertDOMElements();
                this.bindMethods();
                this.initListeners();
            })
            .catch(err => console.error(err))
    }

    initStorage() {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(storage => {
                this.storage = storage;
                resolve();
            });
        })
    }

    insertDOMElements() {
        this.insertUIElements();
        this.createAudio();
    }

    //thiết lập popup hiển thị dịch select cụm từ được chọn
    insertUIElements() {
        const { double_click, icon_trans } = this.storage;
        const arrow = chrome.runtime.getURL('images/right-arrow.png');
        const translateButton = `<span class="translate-button-mtz hidden"></span>`;
        const doubleClickActive = (double_click === 'double_click_true') ? 'active' : '';
        const iconTransActive = ( icon_trans === "icon_trans_true" ) ? 'active' : '';
        const translateTooltip =
                `<div class="translate-tooltip-mtz hidden">
                    <div class="header">
                        <div class="header-controls">
                            <span class="sound-translate"></span>
                            <span class="settings"></span>
                        </div>
                        <div class="translate-icons">
                            <img class="from" src="" />
                            <img class="arrow" src="${arrow}" />
                            <img class="to" src="" />
                        </div>
                    </div>
                    <div class="translated-text">
                        <div class="words"></div>
                        <div class="sentences"></div>
                    </div>
                    <div class="controls">
                        <div class="controls__control-wrapper">
                            <span class="controls__description">
                                Fast traslate
                            </span>
                            <span class="controls__toggle dbl-click ${doubleClickActive}" data-store="double_click">
                                <div class="controls__inner-circle"></div>
                            </span>
                        </div>
                        <div class="controls__control-wrapper">
                            <span class="controls__description">
                                Icon translate
                            </span>
                            <span class="controls__toggle icon-trans ${iconTransActive}" data-store="icon_trans">
                                <div class="controls__inner-circle"></div>
                            </span>
                        </div>
                    </div>
                </div>`;

        document.body.insertAdjacentHTML('afterbegin', translateButton);
        document.body.insertAdjacentHTML('afterbegin', translateTooltip);
    }

    createAudio() {
        const audio = document.createElement('audio');
        audio.className = 'audio-for-speech';
        this.audioElement = audio;
        this.audioElement.src = '';
        document.body.insertAdjacentElement('afterbegin', audio);
    }

    bindMethods() {
        this.handleSelection = this.handleSelection.bind(this);
        this.handleTranslateClick = this.handleTranslateClick.bind(this);
        this.regulateTooltipVisibility = this.regulateTooltipVisibility.bind(this);
        this.handleHeaderClick = this.handleHeaderClick.bind(this);
        this.handletranslatedTextClick = this.handletranslatedTextClick.bind(this);
        this.handleDblClick = this.handleDblClick.bind(this);
        this.handleOptionToggling = this.handleOptionToggling.bind(this);
        this.handleWindowMessage = this.handleWindowMessage.bind(this);
        this.handleShowOrigin = this.handleShowOrigin.bind(this);
    }

    initListeners() {
        this.initWindowListeners();
        this.initMessageListeners();
        this.initDOMListeners();
        this.initStorageListeners();
    }

    initWindowListeners() {
        window.addEventListener('message', this.handleWindowMessage)
    }

    handleWindowMessage(ev) {
        const { action } = ev.data;
        switch(action) {
            case 'translate-utils-loaded':
                this.performInsertedTranslateElems();
                break;
            default:
                //console.log('Something went wrong')
        }
    }

    //Thuộc tính classList trả về (các) tên lớp của một phần tử, dưới dạng một đối tượng DOMTokenList.
    //element.classList.contains() trả về giá trị bool cho biết liệu một đối tượng có tên chỉ định hay ko
    // hàm thực hiện chức năng nghe những thay đổi setting phần dbclick, icon để update lại setting
    checkToggleBtnActuality(btn, propName) {
        const isPropActive = this.storage[propName].includes('true');
        const isBtnActive = btn.classList.contains('active');
        if (isPropActive === isBtnActive) {
            return;
        }
        //nếu đối tượng ko tồn tại or ko phải tên được chỉ định - > thêm p.tử 'active' cho đối tượng
        btn.classList.toggle('active');
        this.sendMessage({action: 'updateSettings'});
    }

    //hàm xử lý event khi click button dbclick, icon
    //Sử dụng chrome.storageAPI để lưu trữ, truy xuất và theo dõi các thay đổi đối với dữ liệu người dùng.
    //chrome.storage.onChanged.addListener(changes => dùng để Ánh xạ đối tượng từng khóa đã thay đổi thành tương ứng StorageChangevới mục đó.
    //hàm bên dưới thực hiện chức năng truy xuất những thay đổi và theo dõi nó và gọi hàm checkToggleBtnActuality để thực hiện update nhưng thay đổi
    initStorageListeners() {
        chrome.storage.onChanged.addListener(changes => {
            const keys = Object.keys(changes);
            keys.forEach(key => {
                this.storage[key] = changes[key].newValue;
                if (key === 'double_click') {
                    this.checkToggleBtnActuality(this.dblClickToggleBtn, 'double_click');
                }
                if (key === 'icon_trans') {
                    this.checkToggleBtnActuality(this.iconTransToggleBtn, 'icon_trans');
                }
            });
        })
    }

    // chrome.runtime.onMessage.addListener Được kích hoạt khi một tin nhắn được gửi từ một quy trình mở rộng (bởi sendMessage) hoặc một tập lệnh nội dung (bởi tabs.sendMessage).
    
    initMessageListeners() {
        chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
            switch(msg.action) {
                case 'showTranslatePopup':
                    this.handleMessageTranslation(msg.translateTo);
                    break
                case 'translatePage':
                    this.translatePage(msg.tl);
                    break;
                case 'getSelectedText':
                    this.sendSelectedText(sendResponse);
                    break;
                default:
                    //console.log(`There are no handlers for ${msg.action} action!`);
            }

            sendResponse('');
            return true;
        })
    }

    _removeGooglePageTranslate() {
        const skipTranslateBlock = Array.from(document.querySelectorAll('*[class~="skiptranslate"]'));
        if (skipTranslateBlock) {
            skipTranslateBlock.forEach(block => block.remove());
        }

        const scripts = Array.from(document.querySelectorAll('script[src*="//translate.google.com/'));
        if (scripts.length) {
            scripts.forEach(script => script.remove());
        }

        const spinnerPos = Array.from(document.querySelectorAll('.goog-te-spinner-pos'));
        if (spinnerPos.length) {
            spinnerPos.forEach(spinner => spinner.remove());
        }

        const body = document.body;
        body.style.position = 'inherit';
        body.style.top = 'auto';
        body.style.minHeight = 'auto';
    }

    getGoogleTrIframeDoc() {
        const iframe = document.getElementById(':0.container');
        if (!iframe) {
            return null
        }

        return iframe.contentDocument;
    }

    translatePage(lang) {
        this._removeGooglePageTranslate();
        const handlerScript = document.createElement('script');
        handlerScript.innerHTML = `
            function googleTranslateElementInit() {
                const elem = new google.translate.TranslateElement({
                    pageLanguage: "auto",
                    includedLanguages: "${lang}",
                    layout: google.translate.TranslateElement.InlineLayout.HORIZONTAL,
                    autoDisplay: false,
                    multilanguagePage: true,
                    floatPosition: 0
                });
                window.postMessage({action: "translate-utils-loaded"});
                elem.showBanner(false)
            };
        `;
        //console.log(handlerScript);
        document.body.insertAdjacentElement('beforeend', handlerScript);

        const requestScript = document.createElement('script');
        requestScript.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
        document.body.insertAdjacentElement('beforeend', requestScript);
    }

    sendSelectedText(sendResp) {
        sendResp({ selectedText:
            this.selectedText = window.getSelection().toString() })
    }

    handleShowOrigin(ev) {
        const googleIframeDoc = this.getGoogleTrIframeDoc();
        if (googleIframeDoc) {
            const restore = googleIframeDoc.getElementById(":0.restore");
            restore.click();
        }

    }

    addTranslatePageElems(elem) {
       const  customPageTranslateElems = `
            <div class="page-translation">
                <div class="page-translation__controls">
                    <span class="page-translation__show-origin">Show initial</span>
                </div>
            </div>
       `;
       elem.insertAdjacentHTML('beforebegin', customPageTranslateElems);
       const orig = document.querySelector('.page-translation__show-origin');
       orig.addEventListener('click', this.handleShowOrigin)
    }

    performInsertedTranslateElems() {
        const intervalTime = 70;
        const initialItemsInterval = setInterval(() => {
            const bannerFrame = document.querySelector('.goog-te-banner-frame');
            if (bannerFrame) {
                clearInterval(initialItemsInterval);
                bannerFrame.classList.add('hidden');
                const iframeDocInterval = setInterval(() => {
                    const iframe = document.getElementById(':0.container');
                    if (!iframe) {
                        return;
                    }
                    const iframe_doc = iframe.contentDocument;
                    if (!iframe_doc) {
                        return
                    }
                    const confirm = iframe_doc.getElementById(":0.confirm");
                    if (!confirm) {
                        return
                    }
                    clearInterval(iframeDocInterval);
                    this.addTranslatePageElems(bannerFrame, iframe_doc);
                    setTimeout(() => confirm.click(), 100);
                }, intervalTime)

            }
        }, intervalTime)
    }

    //hàm xử lý lấy hình ảnh đại diện quốc gia dịch từ 
    handleMessageTranslation(translateTo) {

        const translateData = {
            translate_from: '',
            translate_to: translateTo
        }
        this.selectedText = this.selectedFullObject.toString();
        const textChunks = this.translate_utils.getTextChunks(this.selectedText);
        this.translate_utils.translateText(textChunks, translateData);
        let to = translateData.translate_to;
        this.translateTooltip.querySelector('img.to').src = chrome.runtime.getURL(`images/flags/${to}@2x.png`);
        this.sendMessage({action: 'updateSettings'});
    }

    initDOMListeners() {
        document.addEventListener('mouseup', this.handleSelection);
        document.addEventListener('mousedown', ev => {
            this.regulateTooltipVisibility(ev);
            this.regulateTranslateButtonVisibility(ev)
        });
        document.addEventListener('dblclick', this.handleDblClick);
        this.initUIListeners();
    }

    initUIListeners() {
        this.translateButton = document.querySelector('.translate-button-mtz');
        this.translateTooltip = document.querySelector('.translate-tooltip-mtz');
        this.tooltipHeader = this.translateTooltip.querySelector('.header')
        this.translatedText = this.translateTooltip.querySelector('.translated-text');
        this.dblClickToggleBtn = this.translateTooltip.querySelector('.dbl-click');
        this.iconTransToggleBtn = this.translateTooltip.querySelector('.icon-trans');


        this.translateButton.addEventListener('mousedown', this.handleTranslateClick);
        this.tooltipHeader.addEventListener('click', this.handleHeaderClick);
        this.translatedText.addEventListener('click', this.handleOptionToggling);
        this.dblClickToggleBtn.addEventListener('click', this.handleOptionToggling);
        this.iconTransToggleBtn.addEventListener('click', this.handleOptionToggling);
        this.translatedText.addEventListener('click', this.handletranslatedTextClick);
    }

    handleTranslateClick() {

        const translateData = {
            translate_from: '',
            translate_to: this.storage.tl
        }

        this.hideElement(this.translateButton);
        this.selectedText = this.selectedFullObject.toString();
        const textChunks = this.translate_utils.getTextChunks(this.selectedText);
        this.translate_utils.translateText(textChunks, translateData);
        this.showTranslatedTextChunk(translateData.translate_from, translateData.translate_to);
    }

    //xử lý hành động khi người dụng click vào icon setting và loa
    handleHeaderClick(ev) {
        const target = ev.target;
        if (target.classList.contains('settings')) {
            this.sendMessage({action: 'openSettings'});
        } else if (target.classList.contains('sound-translate')) {
            this.speechNativeText()
        } else {

        }
    }

    handleOptionToggling(ev) {
        const target = ev.currentTarget;
        const optionForToggling = target.dataset.store;
        target.classList.toggle('active');
        //console.log(optionForToggling, '  optionForToggling');
        const isTargetActive = target.classList.contains('active');
        if (optionForToggling === 'double_click') {
            const valueForSaving = isTargetActive ? 'double_click_true' : 'double_click_false';
            chrome.storage.local.set({ double_click: valueForSaving }, () => {})
        } else if(optionForToggling === 'icon_trans') {
            const valueForSaving = isTargetActive ? 'icon_trans_true' : 'icon_trans_false';
            chrome.storage.local.set({ icon_trans: valueForSaving }, () => {})
        }
    }

    speechNativeText() {
        this.areTranslatedSentences()
            ? this.audio_utils.speechSentences('originLangLinks')
            : this.audio_utils.speechWord(this.selectedText.trim(), this.translatedLang);
    }

    handletranslatedTextClick(ev) {
        const classList = ev.target.classList;
        const text = ev.target.closest('.sound-anchor').querySelector('.word-text').textContent;

        if (classList.contains('sound')) {
            this.areTranslatedSentences()
                ? this.audio_utils.speechSentences('targetLangLinks')
                : this.audio_utils.speechWord(text, this.storage.tl);

        } else if(classList.contains('copy')) {
            if (classList.contains('copied')) return;
            const copiedElem = this.translateTooltip.querySelector('.copied');
            if (copiedElem) copiedElem.classList.remove('copied');
            this.copyTextToClipboard(text);
            classList.add('copied');
        }
    }

    copyTextToClipboard(text) {
        const input = document.createElement('input');
        input.style.position = 'fixed';
        input.style.opacity = 0;
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('Copy');
        document.body.removeChild(input);
    }

    regulateTooltipVisibility(ev) {
        if (!this.translateButton.classList.contains('hidden')) {
            this.hideElement(this.translateButton)
        }
        if (!this.translateTooltip.classList.contains('hidden') && !ev.target.closest('.translate-tooltip-mtz')) {
            this.hideElement(this.translateTooltip);
            this.translateTooltip.querySelector('.words').innerHTML = '';
            this.translateTooltip.querySelector('.sentences').innerHTML = '';
            this.audioElement.pause();
        }
    }

    regulateTranslateButtonVisibility(ev) {
        if (!this.translateButton.classList.contains('hidden')) this.hideElement(this.translateButton);
    }

    handleDblClick(ev) {
        if (this.storage.double_click === "double_click_false") {
            return;
        }
        if (!this.isSelection()) {
            return;
        }
        if(this.isSelectedTextForbidden(ev.target.tagName)) {
            return;
        }
        this.hideElement(this.translateButton);
        this.handleTranslateClick(ev);
    }

    handleSelection(ev) {
        if (!this.isSelection()) return;
        if(this.isSelectedTextForbidden(ev.target.tagName)) return;

        if (this.storage.icon_trans === 'icon_trans_false') {
            return;
        }
        this.showTranslateButton();
    }

    isSelectedTextForbidden(tagName) {
        tagName = tagName.toLowerCase();
        const forbiddenTags = ['input', 'textarea'];
        const isForbidden = forbiddenTags.some(forbiddenTagName => forbiddenTagName === tagName);
        return isForbidden;
    }

    isSelection() {
        this.selectedFullObject = window.getSelection();
        const objectRange = this.selectedFullObject.getRangeAt(0);
        this.selectBounding = objectRange.getBoundingClientRect();
        return this.selectedFullObject.toString().trim() ?  true : false;
    }

    showTranslateButton() {
        this.setButtonPosition();
        this.showElement(this.translateButton);
    }

    setButtonPosition() {
        const {top, left} = this.getTranslateButtonPosition(this.selectedFullObject);
        const stylesToApply = {
            top: top + 'px',
            left: left + 'px'
        }
        this.applyStylesToElement(this.translateButton, stylesToApply);
    }

    getTranslateButtonPosition() {

        let buttonHeight = 25;
        let buttonWidth = buttonHeight;
        let x = this.selectBounding.left + this.selectBounding.width / 2 + window.scrollX - buttonWidth / 2;
        let y;

        if (this.selectBounding.top + this.selectBounding.height + 10 + buttonHeight > window.innerHeight) {
            y = this.selectBounding.top - 10 - buttonHeight + window.scrollY;
        } else {
            y = this.selectBounding.top + this.selectBounding.height + 10 + window.scrollY;
        }
        return {
            top: y,
            left: x
        }
    }

    showElement(element) {
        const classList = element.classList;
        if (!classList.contains('hidden')) return;
        classList.remove('hidden');
    }

    hideElement(element) {
        const classList = element.classList;
        if (classList.contains('hidden')) return;
        classList.add('hidden');
    }

    applyStylesToElement(element, styles) {
        const styleNames = Object.keys(styles);
        let resultStyle = '';
        styleNames.forEach(styleName => resultStyle += `${styleName}: ${styles[styleName]};`);
        element.setAttribute('style', resultStyle);
    }

    showTranslatedTextChunk(data, translateTo) {
        this.translatedLang = data.src;
        this.setFlags(this.translatedLang, translateTo);

        if (data.dict) {
            let layout = this.generateWordsLayout(data);
            const origin = this.translateTooltip.querySelector('.words');
            origin.innerHTML= layout;
        } else if(data.sentences) {
            this.renderSentences(data);
            this.audio_utils.createSentacesSpeechLinks(data.sentences);
        } else {
            //console.log('nothing came back');
        }

        this.setTooltipPosition();
        this.showElement(this.translateTooltip);
    }

    renderSentences(data) {
        // if translate exists and we only want to add translate chunk
        if (this.areTranslatedSentences()) {
            const translatedSentence = this.translateTooltip.querySelector('.translated-sentence');
            translatedSentence.textContent += this.concatSentencesText(data.sentences);
            const translitDiv = this.translateTooltip.querySelector('.translit');
            if (!translitDiv) return;
            const lastArrayIndex = data.sentences.length-1;
            translitDiv.textContent += data.sentences[lastArrayIndex]['translit'] || data.sentences[lastArrayIndex]['src_translit'];
        } else {
            const origin = this.translateTooltip.querySelector('.sentences');
            let layout = this.generateSentencesLayout(data);
            origin.innerHTML = layout;
        }
    }

    setFlags(country, translateTo) {
        const from = country;
        const to = translateTo || this.storage.tl;
        this.translateTooltip.querySelector('img.from').src = chrome.runtime.getURL(`images/flags/${from}@2x.png`);
        this.translateTooltip.querySelector('img.to').src = chrome.runtime.getURL(`images/flags/${to}@2x.png`);
    }

    //xóa button sound dưới button coppy
    generateWordsLayout(translateData) {
        const layout = `
            <div class="main-translate-word sound-anchor">
                <span class="main-word bold word-text">${ translateData.sentences[0]['trans'] }</span>
                <div class="buttons">
                    <span class="copy"></span>
                </div>
            </div>
            ${this.checkForTranslit(translateData.sentences)}
            <div class="translated-categories">${ this.generateWordCategoriesLayout(translateData.dict) }</div>
        `;
        return layout;
    }

    checkForTranslit(sentences) {
        let hasTranslit = false;
        let translitText;
        sentences.forEach(sentenceObject => {
            if (sentenceObject.hasOwnProperty('translit')) {
                hasTranslit = true;
                translitText = sentenceObject.translit
            }
            if (sentenceObject.hasOwnProperty('src_translit')) {
                hasTranslit = true;
                translitText = sentenceObject.src_translit
            }
        })

        return hasTranslit
            ? `<div class="translit">${translitText}</div>`
            : ''
    }

    //phần hiển thị dịch theo cụm từ
    generateSentencesLayout(translateData) {
        const layout = `
            <div class="translated-sentence-wrapper sound-anchor">
                <div class="translated-sentence word-text">${this.concatSentencesText(translateData.sentences)}</div>
                <div class="buttons">
                    <span class="copy"></span>
                </div>
            </div>
            ${this.checkForTranslit(translateData.sentences)}
        `;
        return layout;
    }

    concatSentencesText(sentences) {
        let concatedSentences = '';
        sentences.forEach(sentence => {
            if (sentence.hasOwnProperty('translit') || sentence.hasOwnProperty('src_translit')) return;
            concatedSentences += sentence.trans
        })

        return concatedSentences ? concatedSentences : '';
    }

    //hàm xử lý vị trí xuất hiện của popup
    setTooltipPosition() {
        let x, y;
        const tooltipWidth = 300;
        const tooltipHeight = 370;

        x = window.scrollX +  this.selectBounding.left + this.selectBounding.width / 2 - tooltipWidth / 2;
        if (x < 0) x = 0;
        y = window.scrollY + this.selectBounding.top + 30;
        if (y > document.body.clientHeight - tooltipHeight) {
            y = window.scrollY + this.selectBounding.top - tooltipHeight - 30;
        }

        const pos =  {
            left: x + 'px',
            top: y + 'px'
        }
        this.applyStylesToElement(this.translateTooltip, pos);
    }

    generateWordCategoriesLayout(dictionary) {
        let translatedCategories = '';
        dictionary.forEach(dictionaryItemData => {
            let wordCategory = `<h2 class="word-category">${ dictionaryItemData.pos }</h2>`;

            let translates = '';
            dictionaryItemData.entry.forEach(entry => {
                let reverseTranslates = entry.reverse_translation;
                if (reverseTranslates.length > 3) reverseTranslates = reverseTranslates.slice(3);
                let translatedWord = `
                    <div class="translated-word">
                        <span class="bold word-text">${entry.word}</span>
                        <div class="buttons">
                            <span class="copy"></span>
                        </div>
                    </div>
                    <span class="reverse-translates"> ${ reverseTranslates.join(', ') } </span>`;

                translates += `<div class="translates sound-anchor">${ translatedWord }</div>`
            });
            translatedCategories += `
                <div class="translated-category">
                    ${ wordCategory +  translates}
                </div>`;
        })
        return translatedCategories;
    }

    sendMessage(data, callback = () => {}) {
        chrome.runtime.sendMessage(data, callback);
    }
    areTranslatedSentences() {
        return this.translateTooltip.querySelector('.translated-sentence-wrapper') ? true : false;
    }
}

const content = new Content();