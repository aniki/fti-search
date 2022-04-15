import { i18n } from './i18n';
import { registerSW } from "virtual:pwa-register";

if ("serviceWorker" in navigator) {
    // && !/localhost/.test(window.location)) {
    registerSW();
}

export default () => {
    const domain = 'https://freepub-api.herokuapp.com';
    // const domain = 'http://0.0.0.0';

    return {
        i18n,
        lang: 'fr-FR', // navigator.language
        api_domain: '',
        books: [], // search results
        q: '', // search query
        queryText: '',
        currentBook: {
            captcha: '',
            code: '',
            downloadUrl: ''
        },
        cookies: [],
        isSearching: false,
        isDownloadable: false,
        isWaitingCaptcha: false,
        isGettingCaptcha: false,

        async init() {
            // localStorage sync
            this.books = JSON.parse(localStorage.getItem('books')) || [];
            this.queryText = JSON.parse(localStorage.getItem('queryText')) || '';
        },
        async query() {
            this.isSearching = true;
            // search query
            const res = await fetch(`${domain}/search?q=${this.q}`)
                .then(
                    async (response) => {
                        const res = await response.json()
                        return res
                    }
                )

            // state update
            this.books = res.results;
            this.queryText = `${i18n[this.lang].for} ${this.q}`;
            this.q = '';
            // localStorage update
            localStorage.setItem('books', JSON.stringify(this.books));
            localStorage.setItem('queryText', JSON.stringify(this.queryText));
            // set cookies for PHPSession
            this.cookies = res.cookies;
            document.cookie = res.cookies;
            this.isSearching = false;
            // scroll to top
            window.scrollTo({
                top: 150,
                behavior: "smooth"
            });
        },
        async captcha(e, filename, directory) {
            this.isGettingCaptcha = true;

            if (e) {
                const res = await fetch(`${domain}/captcha?filename=${filename}&directory=${directory}`, { credentials: "same-origin" })
                    .then(
                        async (response) => {
                            const res = await response.json();
                            return res;
                        }
                    )
                this.currentBook = { ...this.currentBook, filename, directory };
                this.currentBook.captcha = `data:image/png;base64, ${res.captcha}`;
                this.isDownloadable = true;
            }
        },
        async download() {
            this.isWaitingCaptcha = true;

            const { filename, directory, code } = this.currentBook;
            const options = {
                credentials: "same-origin",
                headers: {
                    // 'Access-Control-Allow-Credentials' : 'same-origin'
                }
            }
            const url = await fetch(`${domain}/download?filename=${filename}&directory=${directory}&code=${code}`, options)
                .then(
                    async (response) => {
                        const res = await response.json();
                        return res.fileUrl;
                    }
                )

            this.currentBook.code = '';
            this.currentBook.downloadUrl = url;
            this.isWaitingCaptcha = false;
        },
        close(timeout = 0) {
            const that = this;
            setTimeout(() => {
                this.isDownloadable = false;
            }, timeout);
            setTimeout(() => {
                that.isGettingCaptcha = !that.isGettingCaptcha;
                that.currentBook.downloadUrl = '';
            }, timeout + 1000);
        }
    }
}
