import Route from "./route";

export interface IPointerRoute {
    params: string[];
    originalRoute: string;
    resolve: (params?: Map<string, string>) => string;
    regularExpression: RegExp;
}

export interface IPointerMatch {
    route: Route;
    /**
     * Current route parameters (i.e. /users/victor = Map { 'id' => victor })
     */
    params: Map<string, string>;
    /**
     * Original route name (i.e. /users/{id:[a-z]+})
     * @deprecated
     */
    originalRoute: string;
    /**
     * Current route name (i.e. /users/victor)
     */
    path: string;
}

class Pointer {
    private readonly routes = new Map<string, Route>();

    /**
     * Get raw route and replace it with params
     */
    public resolve(pathname: string, params = new Map<string, string>()): string | undefined {
        const route = this.routes.get(pathname);

        if(!route) {
            throw new Error('Route not found');
        }

        return route.resolve(params);
    }

    public get(path: string): Route | undefined {
        return this.routes.get(path);
    }

    public getOrFail(path: string): Route {
        const route = this.get(path);
        if(!route) {
            throw new Error('Could not find route');
        }
        return route;
    }

    public add(route: string | Route) {
        if(typeof route === 'string') {
            this.routes.set(route, new Route(route));
        } else {
            this.routes.set(route.original, route);
        }
        return this;
    }

    public test(path: string) {
        if(this.match(path)) {
            return true;
        }

        return false;
    }

    public match(path: string): IPointerMatch | undefined {
        return this.getPathMatches(path)[0];
    }

    public getPathMatches(path: string): IPointerMatch[] {
        const results = new Array<IPointerMatch>();
        for(const route of this.routes.values()) {
            const params = route.parse(path);

            if(!params) {
                continue;
            }

            results.push({
                route,
                originalRoute: route.original,
                params,
                path
            });
        }

        return results;
    }

    public clear() {
        this.routes.clear();
    }
}

export default Pointer;
