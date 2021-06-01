class Config {
    constructor(a) {
        this.config = {}, chrome.storage.local.get(null, function (b) {
            this.config = b, a && a()
        }.bind(this)), chrome.storage.onChanged.addListener(function () {
            chrome.storage.local.get(null, function (a) {
                this.config = a
            }.bind(this))
        }.bind(this))
    }
    getUserID() {
        if (this.config.uid) return this.config.uid;
        else {
            let a = new Uint32Array(4),
                b = -1;
            window.crypto.getRandomValues(a);
            let c = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (d) {
                b++;
                let c = 15 & a[b >> 3] >> 4 * (b % 8),
                    e = "x" == d ? c : 8 | 3 & c;
                return e.toString(16)
            }.bind(this));
            return chrome.storage.local.set({
                uid: c
            }), c
        }
    }
}