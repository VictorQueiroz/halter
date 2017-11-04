import HistoryBase from '../src/history-base';

class HistoryFake extends HistoryBase {
    constructor(){
        super();

        this.title = '';
        this.state = {};
        this.pathname = '/';
        this.previousHistory = [];
    }

    getAbsolutePath(){
        return this.pathname;
    }

    pushState(state = {}, title = '', path = ''){
        this.previousHistory.push({
            pathname: this.pathname,
            state: this.state,
            title: this.title
        });
        this.pathname = path;
        this.state = state;
        this.title = title;
    }

    replaceState(state = {}, title = '', path = ''){
        this.state = state;
        this.title = title;
        this.pathname = path;
    }

    back() {
        const { pathname, state, title } = this.previousHistory.shift();

        this.pathname = pathname;
        this.state = state;
        this.title = title;
        this.emit('popstate');
    }
}

export default HistoryFake;
