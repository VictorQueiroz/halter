import HistoryBase from './history-base';
import Router, { IRoute } from './router';
import { IPointerMatch } from './pointer';

export interface IRouteLabeled extends IRoute {
    name: string;
    onBefore?: (match: IPointerMatch, replaceState: any, pushState: any) => void;
}

class RouterLabeled extends Router {
    public routes: IRouteLabeled[] = [];
    constructor(history: HistoryBase) {
        super(history);
    }

    public getRouteByLabel(label: string) {
        return this.routes.find((route) => route.name === label);
    }

    public on({ name, path, callback, onBefore }: IRouteLabeled) {
        this.pointer.add(path);
        this.routes.push({
            callback,
            name,
            onBefore,
            path
        });
        return this;
    }

    public pushStateByLabel(state: any, title: string | undefined, label: string, params?: any, query: any = '') {
        const newPath = this.getPathOrFail(label, params);

        return this.pushState(state, title, newPath + (query ? '?' + query : ''));
    }

    public getPathOrFail(label: string, params: any) {
        const route = this.getRouteByLabel(label);
        if(!route) {
            throw new Error('No route found');
        }
        const match = this.pointer.get(route.path);
        if(!match) {
            throw new Error(`No match for route "${route.path}"`);
        }
        return match.resolve(params);
    }

    public replaceStateByLabel(state: any, title: string | undefined, label: string, params: any, query: any = '') {
        const newPath = this.getPathOrFail(label, params);

        return this.replaceState(state, title, newPath + (query ? '?' + query : ''));
    }

    public async executeOnBefore(onBefore: any) {
        let result;
        let cancelled = false;

        const onPushState = (state: any, title: string | undefined, path: string, params: any) => {
            cancelled = true;
            result = this.pushStateByLabel(state, title, path, params);
        };

        const onReplaceState = (state: any, title: string | undefined, path: string, params: any) => {
            cancelled = true;
            result = this.replaceStateByLabel(state, title, path, params);
        };

        await onBefore(onReplaceState, onPushState);

        if(cancelled) {
            await result;
        }

        return cancelled;
    }

}

export default RouterLabeled;
