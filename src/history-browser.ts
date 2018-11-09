import HistoryBase from './history-base';

export default class HistoryBrowser extends HistoryBase {
    private location: any;
    private history: any;
    constructor(private context: any) {
        super();
        this.context = context;
        this.location = context.location;
        this.history = context.history;
        this.onPopState = this.onPopState.bind(this);
    }

    public getSearch() {
        return '';
    }

    public onPopState() {
        this.emit('popstate');
    }

    public init() {
        this.context.addEventListener('popstate', this.onPopState);
    }

    public destroy() {
        this.context.removeEventListener('popstate', this.onPopState);
    }

    public getAbsolutePath() {
        return this.location.pathname + this.location.search;
    }

    public pushState(state: any, title: string, path: string) {
        this.history.pushState(state, title, path);
    }

    public replaceState(state: any, title: string, path: string) {
        this.history.replaceState(state, title, path);
    }
}
