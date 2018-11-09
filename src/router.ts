import querystring from "querystring";
import url from "url";
import HistoryBase from "./history-base";
import Pointer, { IPointerMatch } from "./pointer";

export type ChangeCallback = (newPath: string) => void;
export type ChangeStateFunction = (state: object | undefined, title: string | undefined, path: string) => void;
export type RouteCallback = (match: IPointerMatch) => void;

export interface IRoute {
    path: string;
    callback: RouteCallback;
    onBefore?: (
        match: IPointerMatch,
        replace: ChangeStateFunction,
        push: ChangeStateFunction
    ) => void;
}

class Router {
    public routes: IRoute[] = [];
    public pointer = new Pointer();
    private callbackChange: ChangeCallback[] = [];
    constructor(private history: HistoryBase) {
    }

    public listen(callback: ChangeCallback) {
        this.callbackChange.push(callback);
    }

    public removeListener(callback: ChangeCallback) {
        for(let i = 0; i < this.callbackChange.length; i++) {
            if(this.callbackChange[i] !== callback) {
                continue;
            }

            this.callbackChange.splice(i, 1);
            break;
        }
    }

    public on({ path, callback, onBefore }: IRoute): this {
        this.pointer.add(path);
        this.routes.push({
            callback,
            onBefore,
            path
        });
        return this;
    }

    public onPopState() {
        this.onChangePath(this.history.getAbsolutePath());
    }

    public async onChangePath(newPath: string) {
        const parsedUrl = url.parse(newPath);

        if(!parsedUrl.pathname) {
            throw new Error('Invalid url');
        }

        for(const onChange of this.callbackChange) {
            onChange(newPath);
        }

        let match: IPointerMatch & {
            query?: any;
        } = this.pointer.match(parsedUrl.pathname);

        if(!match) {
            return false;
        }

        match = {
            ...match,
            query: querystring.parse(parsedUrl.query)
        };

        const route = this.routes.find((r) => (
            r.path === match.originalRoute
        ));
        if(!route) {
            throw new Error('Route not found');
        }

        const { callback, onBefore } = route;

        const wrappedOnBefore = onBefore ? (replaceState: ChangeStateFunction, pushState: ChangeStateFunction) => (
            onBefore(match, replaceState, pushState)
        ) : () => undefined;

        await this.onMatchRoute(() => callback(match), wrappedOnBefore);
    }

    public async executeOnBefore(onBefore: (replace: ChangeStateFunction, push: ChangeStateFunction) => void) {
        let result: Promise<void> | undefined;
        let cancelled = false;

        const onPushState = (state: any, title: string | undefined, path: string) => {
            if(cancelled) {
                throw new Error(
                    `You can only execute \`pushState\` or \`replaceState\` ` +
                    `once while inside \`onBefore\` statements`
                );
            }

            cancelled = true;
            result = this.pushState(state, title, path);
        };

        const onReplaceState = (state: any, title: string | undefined, path: string) => {
            if(cancelled) {
                throw new Error(
                    `You can only execute \`pushState\` or \`replaceState\` ` +
                    `once while inside \`onBefore\` statements`
                );
            }

            cancelled = true;
            result = this.replaceState(state, title, path);
        };

        await onBefore(onReplaceState, onPushState);

        if(cancelled) {
            await result;
        }

        return cancelled;
    }

    public async onMatchRoute(
        callback: () => void,
        onBefore: (replaceState: ChangeStateFunction, pushState: ChangeStateFunction) => void
    ) {
        let cancelled = false;

        if(onBefore) {
            cancelled = await this.executeOnBefore(onBefore);
        }

        if(cancelled) {
            return false;
        }

        await callback();
    }

    public async pushState(state: any, title: string | undefined, path: string) {
        this.history.pushState(state, title, path);
        await this.onChangePath(path);
    }

    public async replaceState(state: any, title: string | undefined, path: string) {
        this.history.replaceState(state, title, path);
        await this.onChangePath(path);
    }

    public async init() {
        await this.onChangePath(this.history.getAbsolutePath());
        this.history.init();
        this.history.on("popstate", this.onPopState);
    }

    public destroy() {
        this.routes.splice(0, this.routes.length);
        this.history.removeListener("popstate", this.onPopState);
        this.history.destroy();
    }
}

export default Router;
