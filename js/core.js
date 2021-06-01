class Translation {

    constructor(context) {
        this.Utils = new Config();
        this.context = context;
    }

    save() {
        chrome.storage.local.set({
            vm: $("#view-mode").val(),
            double_click: $("#double-click").val(),
            icon_trans: $("#icon-trans").val(),
            tl: $("#language_default").val()
        });

        $("#notification").attr('class', "notification is-warning");

        $("#message").html(chrome.i18n.getMessage("automatic_save"));

        setTimeout(function () {
            $("#message").html();
            $("#notification").attr('class', "hide");
        }, 2000)

    }

    getTranslateToLanguage() {
        if (this.Utils.config.tl) {
            return this.Utils.config.tl;
        }
        //window.navigator.language trả về ngôn ngữ của trình duyệt
        return this.normalizeLanguageCode(window.navigator.language);
    }

    supportedLocale(e) {
        let t = ["ar", "bg", "ca", "cs", "da", "de", "el", "en", "en-GB", "en-US", "es", "es-419", "et", "fi", "fil",
            "fr", "he", "hi", "hr", "hu", "id", "it", "ja", "ko", "lt", "lv", "nl", "no", "pl", "pt-BR", "pt-PT",
            "ro", "ru", "sk", "sl", "sr", "sv", "th", "tl", "tr", "uk", "vi", "zh-CN", "zh-TW"];
        return t.indexOf(e) !== -1 // trả về vị trí xuất hiện lần đầu tiên trong tập t, nếu ko có thì trả về - 1
    }

    normalizeLanguageCode(e) {
        if (e.toLowerCase() === "zh-tw") {
            return "zh-TW"
        }
        if (e.toLowerCase() === "zh-cn") {
            return "zh-CN"
        }
        if (e.length >= 2 && this.supportedLocale(e)) {
            return e.substr(0, 2)
        } else {
            return "en" // mặc định ban đầu
        }
    }

    setSupportedSelectOptions(selector, optionName) {
        const select = document.querySelector(selector);
        const trueValue = optionName + '_true';
        const falseValue = optionName + '_false';
        const variants = {
            [trueValue]: chrome.i18n.getMessage('double_click_true'),
            [falseValue]: chrome.i18n.getMessage('double_click_false')
        };

        this.populateSelect(select, variants);

        chrome.storage.local.get(optionName, item => {
            this.setSelectedValue(select, item[optionName])
        })
    }

    loadSupportedDblClickOptions() {
        this.setSupportedSelectOptions('#double-click', 'double_click');
    }

    loadSupportedIconTransOptions() {
        this.setSupportedSelectOptions('#icon-trans', 'icon_trans');
    }

    // tự động load các language được chọn mới vào danh sách hiển thị list language trong màn hình setting
    loadTranslateLanguages() {
        chrome.storage.local.get(storage => {
            const { languagesList } = storage;
            this.renderLanguagesList(languagesList);
        })
    }

    // hiển thị list language được add thêm trong màn hình setting
    renderLanguagesList(languages) {
        const list = document.querySelector('.selected-languages');
        list.innerHTML = '';
        languages.forEach(languageObj => {
            const { shortName, fullName } = languageObj;
            const layout = `
                <li class="selected-languages__item" data-short="${shortName}">
                    <span class="selected-languages__fullName">${fullName}</span>
                    <span class="selected-languages__delete"></span>
                </li>
            `;
            list.insertAdjacentHTML('beforeend', layout);
        })
    }

    //lấy list tên languege trong phần setting để phục vụ cho event click chuột trái - > chọn icon - > hiển thị full name list ds
    createContextMenu() {
        chrome.storage.local.get(storage => {
            const langListSettings = {
                title: 'translate on',
                id: 'languagesList',
                contexts: ['selection']
            };
            chrome.contextMenus.create(langListSettings, () => {
                const { languagesList } = storage;

                if (!languagesList.length) {
                    const fullName = this.getTlFullName();
                    const shortName = chrome.i18n.getUILanguage();
                    this.createContextMenuItem(fullName, shortName);
                    return;
                }
                languagesList.forEach(languageObject => {
                    const { fullName, shortName } = languageObject;
                    this.createContextMenuItem(fullName, shortName)
                })
            })
        })

    }

    getTlFullName() {
        const tl = chrome.i18n.getUILanguage(); //Nhận ngôn ngữ giao diện người dùng của trình duyệt
        let fullName = null;
        LANGUAGES.forEach(languageObj => {
            if (languageObj.short === tl) {
                fullName = languageObj.international;
            }
        })

        return fullName;
    }

    //hiển thị menu list language trong setting, thực hiện event khi người dùng click chuột trái chọn list languege để dịch
    createContextMenuItem(title, id) {
        const menuSettings = {
            title, //Văn bản hiển thị trong mục; điều này là bắt buộc trừ khi typelà separator
            id, //ID duy nhất để gán cho mục này. Bắt buộc đối với các trang sự kiện. Không thể giống với một ID khác cho tiện ích mở rộng này
            parentId: 'languagesList', //ID của một mục menu chính; điều này làm cho mục trở thành con của một mục đã được thêm trước đó.
            contexts: ['selection'], //Danh sách các ngữ cảnh mà mục menu này sẽ xuất hiện. Mặc định là ['page'].
            onclick: this.handleContextMenuClick //Một chức năng được gọi lại khi mục menu được nhấp vào
        };
        //chrome.contextMenus.create là tạo một mục menu ngữ cảnh mới
        // có dạng: contextMenus.create(createProperties: object, callback: function): enum
        chrome.contextMenus.create(menuSettings, () => {});
        // callback: () = > {} : Được gọi khi mục đã được tạo trong trình duyệt
    }

    //show popup khi thực hiện click chuột trái chọn list dịch
    handleContextMenuClick(info) {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            const [activeTab] = tabs;
            //console.log('SEND MESSAGE');
            chrome.storage.local.set({tl: info.menuItemId}, ()=> {});
            chrome.tabs.sendMessage(activeTab.id, { action: 'showTranslatePopup', translateTo: info.menuItemId }, () => {})
        })

    }

    openUrl(link, t) {
        chrome.tabs.create({url: link, selected: t});
    }

    setSelectedValue(e, t) {
        for (let n = 0; n < e.children.length; n++) {
            let r = e.children[n];
            if (r.value === t) {
                r.selected = true;
                break
            }
        }
    }

    populateSelect(e, items) {
        for (let item in items) {
            let element = document.createElement("option");
            element.value = item;
            element.textContent = items[item];
            e.appendChild(element);
        }
        return e
    }

    changeElementsVisibility() {
        let e = document.getElementsByTagName("select"),
            t = document.getElementsByTagName("label");
        for (let n = 0; n < e.length; n++) {
            e[n].className = "visible"
        }
        for (let r = 0; r < t.length; r++) {
            t[r].className = "visible"
        }
    }

    translate(e) {
        let t = e.selectionText,
            n = Utils.config.vm;
        let r = t.toLowerCase() !== chrome.i18n.getMessage("name").toLowerCase() ? "auto" : "la";
        if (n !== "tt") {
            let i = "http://translate.google.com/#" + r + "|" + this.getTranslateToLanguage() + "|" + encodeURIComponent(t);
            this.openUrl(i, n === "ognt" ? true : false);
        }
    }
}