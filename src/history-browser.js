import HistoryBase from './history-base';

class HistoryBrowser extends HistoryBase {
    constructor(context){
        super();
        this.context = context;
        this.location = context.location;
        this.history = context.history;
        this.onPopState = this.onPopState.bind(this);
    }

    onPopState() {
        this.emit('popstate');
    }

    init(){
        this.context.addEventListener('popstate', this.onPopState);
    }

    destroy(){
        this.context.removeEventListener('popstate', this.onPopState);
    }

    getAbsolutePath(){
        return this.location.pathname;
    }

    pushState(state, title, path){
        this.history.pushState(state, title, path);
    }

    replaceState(state, title, path){
        this.history.replaceState(state, title, path);
    }
}

export default HistoryBrowser;
