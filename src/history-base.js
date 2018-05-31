import EventEmitter from 'events';

class HistoryBase extends EventEmitter {
    constructor() {
        super();
    }

    init(){
    }

    destroy(){
    }

    getAbsolutePath(){
    }

    getSearch() {
    }

    pushState(state, title, path){
    }

    replaceState(state, title, path){
    }
}

export default HistoryBase;
