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

    pushState(state, title, path){
    }

    replaceState(state, title, path){
    }
}

export default HistoryBase;
