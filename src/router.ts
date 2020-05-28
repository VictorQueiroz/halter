import { EventEmitter } from 'events';
import { History as CompatHistory, UnregisterCallback } from 'history';
import querystring from "querystring";
import url from "url";
import { Overwrite } from 'utility-types';
import Pointer, { IPointerMatch } from "./pointer";

// export type ChangeCallback = (name: string, params?: IRouteInputParams, query?: string) => void;
// export type ChangeStateFunction = (name: string, params?: IRouteInputParams, query?: string) => void;
export type RouteCallback = (name: string, params: Map<string, string>, query: Map<string, string>) => void;

export interface IRoute {
    /**
     * Route unique identifier
     */
    name: string;
    path: string;
    callback: RouteCallback;
    onBefore?: (
        match: IPointerMatch,
        replace: UpdateStateCallback,
        push: UpdateStateCallback
    ) => void;
}

type OnBeforeFunction = (a: UpdateStateCallback, b: UpdateStateCallback) => void;

/**
 * How user should pass query to router
 */
export type IRouteInputQuery = Map<string, string>;

/**
 * Input params for router methods
 */
export type IRouteInputParams = Map<string, string>;

export type UpdateStateCallback = (name: string, params?: IRouteInputParams, query?: IRouteInputParams) => void;

export type IRouteOnParameter = Overwrite<IRoute, {
    name?: string;
}>;

export type IRouteMatch = IPointerMatch & {
    query: Map<string, string>;
};

export enum StateChangeType {
    Push = 1,
    Replace
}

class Router extends EventEmitter {
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
        super();
    }

    public on(name: 'routeNotFound', callback: (newPath: string) => void): this;
    public on(name: string, callback: (...args: any[]) => void) {
        return super.on(name, callback);
    }

    /**
     * Trigger state change without touching the history itself.
     */
    public reload() {
        this.onChangePath(this.getLocationPath());
    }

    /**
     * Listen to valid changes on route. Meaning, that it'll be called whenever you
     * change from one route to another.
     * @param callback Callback that will be called when route change is received
     */
    public listen(callback: RouteCallback): void {
        this.callbackChange.push(callback);
    }

    /**
     * Removes callback from callback change list.
     * @param callback Callback reference that was added through listen()
     */
    public removeRouteListener(callback: RouteCallback) {
        for(let i = 0; i < this.callbackChange.length; i++) {
            if(this.callbackChange[i] !== callback) {
                continue;
            }

            this.callbackChange.splice(i, 1);
            break;
        }
    }

    public addRoute({ name, path, callback, onBefore }: IRouteOnParameter): this {
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

    public resolve(name: string, params?: IRouteInputParams, query?: IRouteInputQuery): string {
        const route = this.routes.get(name);
        if(!route) {
            return '';
        }
        const match = this.pointer.getOrFail(route.path);
        let resolved = match.resolve(params);
        if(query) {
            const object: { [s: string]: string; } = {};
            for(const [key, value] of query) {
                object[key] = value;
            }
            resolved += '?' + querystring.stringify(object);
        }
        return resolved;
    }

    /**
     * Start listening to history changes and execute
     * callbacks according to current path. Will be resolved when
     * the whole process was performed.
     */
    public async init() {
        this.pending = new Promise((resolve) => {
            this.unlistenHistory = this.history.listen((location) => {
                this.onChangePath(location.pathname + location.search);
            });
            const {location} = this.history;
            resolve(this.onChangePath(location.pathname + location.search));
        });
        await this.pending;
        return this;
    }

    public destroy() {
        this.pointer.clear();
        this.routes.clear();
        if(this.unlistenHistory) {
            this.unlistenHistory();
        }
    }

    /**
     * The same as `history.pushState` but it'll resolve name, params and query
     * into a valid pathname and push it to history
     * @param name Route name
     * @param params Route params
     * @param query Route query
     */
    public pushState(name: string, params?: IRouteInputParams, query?: IRouteInputQuery) {
        return this.changeState(name, params, query, StateChangeType.Push);
    }

    /**
     * The same as `pushState` but it'll replace current state with resolved
     * pathname
     * @param name Route name
     * @param params Route params
     * @param query Route query
     */
    public replaceState(name: string, params?: IRouteInputParams, query?: IRouteInputQuery) {
        return this.changeState(name, params, query, StateChangeType.Replace);
    }

    private async executeOnBefore(onBefore: OnBeforeFunction) {
        let result: Promise<void> | undefined;
        let cancelled = false;
        const alreadyCancelledError = new Error(
            `You can only execute \`pushState\` or \`replaceState\` ` +
            `once while inside \`onBefore\` statements`
        );

        const onPushState: UpdateStateCallback = (name, params, query) => {
            if(cancelled) {
                throw alreadyCancelledError;
            }

            cancelled = true;
            result = this.changeState(name, params, query, StateChangeType.Push);
        };

        const onReplaceState: UpdateStateCallback = (name, params, query) => {
            if(cancelled) {
                throw alreadyCancelledError;
            }

            cancelled = true;
            result = this.changeState(name, params, query, StateChangeType.Replace);
        };

        await onBefore(onReplaceState, onPushState);

        if(cancelled) {
            await result;
        }

        return cancelled;
    }

    private async onChangePath(newPath: string) {
        if(this.pending) {
            this.nextChanges.push(newPath);
            return;
        }
        const pending = this.changePath(newPath);
        this.pending = pending;
        try {
            await pending;
        } catch(reason) {
            console.error('Unhandled failure while changing path. See reason below:');
            console.error(reason);
        } finally {
            delete this.pending;
        }
        const nextPath = this.nextChanges.shift();
        if(!nextPath) {
            return;
        }
        await this.onChangePath(nextPath);
    }

    private getMatchInformation(path: string) {
        const parsedUrl = url.parse(path);

        if(!parsedUrl.pathname) {
            return;
        }

        const pointerMatch = this.pointer.match(parsedUrl.pathname);
        if(!pointerMatch) {
            return;
        }

        const parsedQuery = querystring.parse(parsedUrl.query || '');
        const query = new Map<string, string>();

        for(const property of Object.keys(parsedQuery)) {
            let value = parsedQuery[property];
            if(Array.isArray(value)) {
                value = value.join(',');
            }
            query.set(property, value);
        }

        const match: IRouteMatch = {
            ...pointerMatch,
            query
        };

        const route = this.findRouteOrFail(match.originalRoute);
        return {
            match,
            parsedUrl,
            route
        };
    }

    /**
     * Receive a path changing notification and trigger
     * the right callback of the route which it was changed to
     * @param newPath New path
     */
    private async changePath(newPath: string) {
        const result = this.getMatchInformation(newPath);

        if(!result) {
            this.onRouteNotFound(newPath);
            return;
        }

        const { route, match } = result;

        for(const onChange of this.callbackChange) {
            onChange(route.name, match.params, match.query);
        }

        const { callback, onBefore } = route;

        await this.onMatchRoute(() => (
            callback(route.name, match.params, match.query)
        ), onBefore ? (replaceState, pushState) => (
            onBefore(match, replaceState, pushState)
        ) : undefined);
    }

    private onRouteNotFound(newPath: string) {
        this.emit('routeNotFound', newPath);
    }

    private async onMatchRoute(
        callback: () => void,
        onBefore?: OnBeforeFunction
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

    private async changeState(
        name: string,
        params: IRouteInputParams = new Map(),
        query: IRouteInputQuery = new Map(),
        change: StateChangeType
    ) {
        const resolved = this.resolve(name, params, query);
        if(!resolved) {
            throw new Error(`No route found for name "${name}"`);
        }
        if(change === StateChangeType.Push) {
            this.history.push(resolved);
        } else {
            this.history.replace(resolved);
        }
    }
}

export default Router;
