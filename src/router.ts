import { History as CompatHistory, UnregisterCallback } from 'history';
import querystring from "querystring";
import url from "url";
import { Overwrite } from 'utility-types';
import Pointer, { IPointerMatch } from "./pointer";

export interface IRouteInputQuery {
    [s: string]: string;
}

// export type ChangeCallback = (name: string, params?: IRouteInputParams, query?: string) => void;
// export type ChangeStateFunction = (name: string, params?: IRouteInputParams, query?: string) => void;
export type RouteCallback = (name: string, params?: IRouteInputParams, query?: IRouteInputQuery) => void;

export interface IRoute {
    /**
     * Route unique identifier
     */
    name: string;
    path: string;
    callback: RouteCallback;
    onBefore?: (
        match: IPointerMatch,
        replace: RouteCallback,
        push: RouteCallback
    ) => void;
}

export type IRouteOnParameter = Overwrite<IRoute, {
    name?: string;
}>;

export interface IRouteInputParams {
    [s: string]: string;
}

class Router {
    public routes = new Map<string, IRoute>();
    public pointer = new Pointer();
    /**
     * Pending route changing work
     */
    public pending?: Promise<void>;
    /**
     * Next path changes
     */
    private nextChanges: string[] = [];
    private callbackChange: RouteCallback[] = [];
    private unlistenHistory?: UnregisterCallback;
    constructor(private history: CompatHistory) {
    }

    public listen(callback: RouteCallback) {
        this.callbackChange.push(callback);
    }

    public removeListener(callback: RouteCallback) {
        for(let i = 0; i < this.callbackChange.length; i++) {
            if(this.callbackChange[i] !== callback) {
                continue;
            }

            this.callbackChange.splice(i, 1);
            break;
        }
    }

    public on({ name, path, callback, onBefore }: IRouteOnParameter): this {
        if(!name) {
            name = path;
        }
        if(this.routes.has(name)) {
            throw new Error('Duplication of router identifier');
        }
        this.pointer.add(path);
        this.routes.set(name, {
            callback,
            name,
            onBefore,
            path
        });
        return this;
    }

    public async onChangePath(newPath: string) {
        if(this.pending) {
            this.nextChanges.push(newPath);
            return;
        }
        this.pending = this.changePath(newPath);
        try {
            await this.pending;
        } catch(reason) {
            console.error('Unhandled failure while changing path');
        } finally {
            delete this.pending;
        }
        const nextPath = this.nextChanges.shift();
        if(!nextPath) {
            return;
        }
        await this.onChangePath(nextPath);
    }

    /**
     * Receive a path changing notification and trigger
     * the right callback of the route which it was changed to
     * @param newPath New path
     */
    public async changePath(newPath: string) {
        const parsedUrl = url.parse(newPath);

        if(!parsedUrl.pathname) {
            throw new Error('Invalid url');
        }

        const pointerMatch = this.pointer.match(parsedUrl.pathname);
        if(!pointerMatch) {
            return;
        }

        for(const onChange of this.callbackChange) {
            onChange(newPath, pointerMatch.params, parsedUrl.query);
        }

        const match: IPointerMatch & {
            query: string;
        } = {
            ...pointerMatch,
            query: querystring.parse(parsedUrl.query)
        };

        const route = this.findRouteOrFail(match.originalRoute);

        const { callback, onBefore } = route;

        await this.onMatchRoute(() => (
            callback(route.name, match.params, querystring.parse(parsedUrl.query))
        ), onBefore ? (replaceState, pushState) => (
            onBefore(match, replaceState, pushState)
        ) : undefined);
    }

    public findRouteOrFail(name: string) {
        let route: IRoute | undefined;
        for(const currRoute of this.routes.values()) {
            if(currRoute.path === name) {
                route = currRoute;
                break;
            }
        }
        if(!route) {
            throw new Error('Route not found');
        }
        return route;
    }

    public async executeOnBefore(onBefore: (a: RouteCallback, b: RouteCallback) => void) {
        let result: Promise<void> | undefined;
        let cancelled = false;

        const onPushState: RouteCallback = (name, params, query) => {
            if(cancelled) {
                throw new Error(
                    `You can only execute \`pushState\` or \`replaceState\` ` +
                    `once while inside \`onBefore\` statements`
                );
            }

            cancelled = true;
            result = this.pushState(name, params, query);
        };

        const onReplaceState: RouteCallback = (name, params, query) => {
            if(cancelled) {
                throw new Error(
                    `You can only execute \`pushState\` or \`replaceState\` ` +
                    `once while inside \`onBefore\` statements`
                );
            }

            cancelled = true;
            result = this.replaceState(name, params, query);
        };

        await onBefore(onReplaceState, onPushState);

        if(cancelled) {
            await result;
        }

        return cancelled;
    }

    public async onMatchRoute(
        callback: () => void,
        onBefore?: (replaceState: RouteCallback, pushState: RouteCallback) => void
    ) {
        let cancelled = false;

        if(onBefore) {
            cancelled = await this.executeOnBefore(onBefore);
        }

        if(cancelled) {
            return;
        }

        await callback();
    }

    public async pushState(name: string, params?: IRouteInputParams, query?: IRouteInputQuery) {
        const url = this.resolve(name, params, query);
        if(!url) {
            throw new Error(`No route found for name "${name}"`);
        }
        this.history.push(url);
    }

    public async replaceState(name: string, params?: IRouteInputParams, query?: IRouteInputQuery) {
        const url = this.resolve(name, params, query);
        if(!url) {
            throw new Error(`No route found for name "${name}"`);
        }
        this.history.push(url);
    }

    public resolve(name: string, params?: IRouteInputParams, query?: IRouteInputQuery) {
        const route = this.routes.get(name);
        if(!route) {
            return;
        }
        const match = this.pointer.getOrFail(route.path);
        let url = match.resolve(params);
        if(query) {
            url += '?' + querystring.stringify(query);
        }
        return url;
    }

    public getAbsolutePath() {
        const { pathname, search } = this.history.location;
        return pathname + search;
    }

    public async init() {
        this.unlistenHistory = this.history.listen((location) => {
            this.onChangePath(location.pathname + location.search);
        });
        await this.onChangePath(this.getAbsolutePath());
        return this;
    }

    public destroy() {
        this.routes.clear();
        if(this.unlistenHistory) {
            this.unlistenHistory();
        }
    }
}

export default Router;
