class AudioUtils {
    constructor(context) {
        this.context = context;
    }

    // hàm đọc từ. 
    speechWord(text, lang) {
        const encodedWords = encodeURI(text);
        const src = `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=${lang}&q=${encodedWords}`;
        this.context.audioElement.setAttribute('src', src);
        this.context.audioElement.play();
    }

    // tạo câu từ văn bản
    _makeSentencesFromText(text) {
        const MAX_SENTENCE_LENGTH = 200; 
        const wordsArray = text.split(' ');
        const sentencesArr = []; 
        let sentence = '';
        wordsArray.forEach((word, index) => {
            const potentialSentence = `${ sentence } ${ word }`;
            if (potentialSentence.length < MAX_SENTENCE_LENGTH) {
                sentence = potentialSentence;
                if (index === wordsArray.length - 1) {
                    sentencesArr.push(sentence)
                }
            } else {
                sentencesArr.push(sentence);
                sentence = word;
                if (index === wordsArray.length - 1) {
                    sentencesArr.push(word)
                }
            }

        });

        return sentencesArr;
    }

    // tạo 1 câu
    _createSpeechLinks(arr, lang) {
        const linksArr = [];
        arr.forEach(sentence => {
            const url = `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=${lang}&q=${encodeURI(sentence)}`;
            linksArr.push(url);
        })

        return linksArr;
    }

    // đọc văn bản
    speechText(info) {
        this.context.audioElement.setAttribute('src', '')
        const { text, lang } = info;
        const sentences = this._makeSentencesFromText(text);
        const speehLinks = this._createSpeechLinks(sentences, lang);
        this.context.audioElement.onended = () => {
            const audioArray = speehLinks;
            if (audioArray[++currentAudioIndex]) {
                this.context.audioElement.setAttribute('src', audioArray[currentAudioIndex]);
                this.context.audioElement.play();
            }
        };

        let currentAudioIndex = 0;
        const src = speehLinks[0];
        this.context.audioElement.setAttribute('src', src);
        this.context.audioElement.play();
    }

    speechSentences(langLinks) {
        this.context.audioElement.onended = () => {
            const audioArray = this.context.speechLinks[langLinks];
            if (audioArray[++currentAudioIndex]) {
                this.context.audioElement.setAttribute('src', audioArray[currentAudioIndex]);
                this.context.audioElement.play();
            }
        };

        let currentAudioIndex = 0;
        const src = this.context.speechLinks[langLinks][0];
        this.context.audioElement.setAttribute('src', src);
        this.context.audioElement.play();
    }

    createSentacesSpeechLinks(sentences, langs = {}) {
        const lang_from = langs.lang_from || this.context.translatedLang;
        const lang_to = langs.lang_to || this.context.storage.tl
        sentences.forEach(sentence => {
            if (sentence.translit || sentence.src_translit) return;
            this.createSentenceParts(sentence.orig, lang_from, 'originLangLinks');
            this.createSentenceParts(sentence.trans, lang_to, 'targetLangLinks');
        })
    }

    createSentenceParts(sentence, lang, targetArray) {
        const MAX_SENTENCE_CHARACTERS_COUNT = 200;
        let resultedSentence = '';

        if (sentence.length > MAX_SENTENCE_CHARACTERS_COUNT) {
            const sentenseWordsParts = sentence.match(/.*?[\.\s]+?/g);

            for (let i = 0; i < sentenseWordsParts.length; i++) {
                if (resultedSentence.length + sentenseWordsParts[i].length < MAX_SENTENCE_CHARACTERS_COUNT) {
                    resultedSentence += sentenseWordsParts[i];
                } else {
                    const link = `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=${lang}&q=${encodeURI(resultedSentence)}`;
                    this.context.speechLinks[targetArray].push(link);
                    resultedSentence = '';
                }
            }

            if (resultedSentence.length) {
                this.context.speechLinks[targetArray].push(`https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=${lang}&q=${encodeURI(resultedSentence)}`);
            }

        } else {
            this.context.speechLinks[targetArray].push(`https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=${lang}&q=${encodeURI(sentence)}`);
        }
    }
}

// audio_utils -> sử dụng cái link https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q= (từ tiếng anh cần đọc) 
// mấy cái hàm create để tạo câu với văn bản :v