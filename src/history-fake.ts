import HistoryBase from '../src/history-base';

export default class HistoryFake extends HistoryBase {
    private title = '';
    private state = {};
    private pathname = '/';
    private previousHistory: Array<{
        pathname: string;
        state: any;
        title: string;
    }> = [];

    public init() {

    }

    public destroy() {
        
    }

    public getSearch() {
        return '';
    }

    public getAbsolutePath() {
        return this.pathname;
    }

    public pushState(state = {}, title = '', path = '') {
        this.previousHistory.push({
            pathname: this.pathname,
            state: this.state,
            title: this.title
        });
        this.pathname = path;
        this.state = state;
        this.title = title;
    }

    public replaceState(state = {}, title = '', path = '') {
        this.state = state;
        this.title = title;
        this.pathname = path;
    }

    public back() {
        const previous = this.previousHistory.shift();
        if(!previous) {
            throw new Error('Can\'t go back, Bob');
        }

        const { pathname, state, title } = previous;

        this.pathname = pathname;
        this.state = state;
        this.title = title;
        this.emit('popstate');
    }
}
