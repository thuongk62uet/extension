class TranslateUtils {
    constructor(context) {
        this.context = context;
    }

    prepareText(initialText) {
        // replace 2 and more spaces by one space
        const text = initialText.replace(/\s{2,}/, ' '); // replace: thay thế giá trị s1 bằng s2 (\s{2} -> " ")
        return text;
    }

    // chia 1 câu thành các từ rồi lưu vào mảng
    getTextChunks(text) {
        const MAX_CHUNK_LENGTH = 1000;
        const words = text.split(' '); // split: chia 1 chuỗi tách thành 1 mảng các phần tử con (VD: Nguyen Lan Huong -> Nguyen, lan, huong)
        const chunks = [''];

        for (let i = 0, len = words.length, j = 0; i < len; ++i) {
            let newWord = chunks[j] + " " + words[i];

            if (newWord.length < MAX_CHUNK_LENGTH) {
                chunks[j] = newWord.trim();
            } else {
                ++j;
                chunks[j] = words[i];
            }
        }

        return chunks;
    }

    // method intended for prearing data for saving to db
    // phương pháp nhằm chuẩn bị dữ liệu để lưu vào db 
    _saveSentencesParts(translatedPlace, initialPlace, arr) {
        const newArr = arr.slice(0, arr.length - 1); // slice: lấy phần từ bắt đầu từ start = 0, đến phần tử end (ko bao gồm end)
        newArr.forEach((item, index) => {
            const origText = item.orig;
            const transText = item.trans;

            if (index === 0 && translatedPlace.length) {
                initialPlace.push(` ${origText}`);
                translatedPlace.push(` ${transText}`);
                return;
            }

            initialPlace.push(origText);
            translatedPlace.push(transText);
        })
    }

    _clearSpeechLinks() {
        const keys = Object.keys(this.context.speechLinks);
        keys.forEach(key => {
            this.context.speechLinks[key] = [];
        })
    }

    translateText(chunks, translateData, action) {
        // for every new translate text we need clear old speech links
        this._clearSpeechLinks();
        const translateAndRenderChunk = num => { // dịch từ phần tử đã tách ra từ chuỗi
            $.ajax({
                url: 'https://translate.googleapis.com/translate_a/single?dt=t&dt=bd&dt=qc&dt=rm&dt=ex', // đọc 
                type: 'GET',
                dataType: 'json',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                },
                data: {
                    client: 'gtx',
                    hl: translate_to || this.context.storage.tl,
                    sl: translate_from || 'auto',
                    tl: translate_to || this.context.storage.tl,
                    q: chunks[num],
                    dj: 1,
                },
                success: data =>  {
                    this.context.showTranslatedTextChunk(data); 
                    if (action && !isLangSetted) {
                        isLangSetted = true;
                        action(data);
                    }

                    requestData.chunksBuffer.push(data);
                    number++;
                    if (!data.dict && data.sentences) {
                        this._saveSentencesParts(requestData.translatedChunks, requestData.initialChunks, data.sentences);
                    }
                    if (number < length) {
                        return translateAndRenderChunk(number);
                    }

                    this.trySaveRequestToHistory(requestData);
                    requestData = null;
                },
                error: error => {
                   //console.log('Trouble has been occured!')
                }
            });
        }
        const { translate_from, translate_to } = translateData;
        const length = chunks.length;
        let number = 0;
        let requestData = {
            translate_from: translate_from || 'auto',
            translate_to: translate_to || this.context.storage.tl,
            chunksBuffer: [],
            initialChunks: [],
            translatedChunks: []
        }

        let isLangSetted = false;
        translateAndRenderChunk(number);
    }

    // https://stackoverflow.com/a/7616484
    _getHash(str) {
        const lowercasedStr = str.toLowerCase(); // toLowerCase: chuyển đổi 1 chuỗi thành chữ thường
        let hash = 0, i, chr;
        for (i = 0; i < lowercasedStr.length; i++) {
          chr   = lowercasedStr.charCodeAt(i); // charCodeAt: trả về mã Unicode của chuỗi
          hash  = ((hash << 5) - hash) + chr;
          hash |= 0;
        }
        return hash;
    }

    trySaveRequestToHistory(requestInfo) {
        if (!requestInfo) {
            return;
        }
        let {
            translate_from,
            translate_to,
            chunksBuffer,
            initialChunks,
            translatedChunks
        } = requestInfo;

        let initialText, translatedText;
        if (initialChunks.length) {
            initialText = initialChunks.join(' ');
            translatedText = translatedChunks.join(' ');
        } else {
            initialText = chunksBuffer[0].sentences[0].orig;
            translatedText = chunksBuffer[0].sentences[0].trans;
        }
        if (translate_from === 'auto') {
            translate_from = chunksBuffer[0].src;
        }
        const dataForSaving = {
            translate_from,
            translate_to,
            initialText,
            translatedText,
            timestamp: null,
            hashCode: null
        };
        dataForSaving.hashCode = this._getHash(JSON.stringify(dataForSaving));
        dataForSaving.timestamp = Date.now();
        chrome.runtime.sendMessage({ action: 'saveToDatabase',  dataForSaving})
    }

    //
    translateTextAndPerformAction(data, action) {
        this.translateText(data.textChunks, data, action);
    }

}