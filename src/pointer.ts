export interface IPointerRoute {
    params: string[];
    originalRoute: string;
    resolve: (params?: Map<string, string>) => string;
    regularExpression: RegExp;
}

export interface IPointerMatch {
    /**
     * Current route parameters (i.e. /users/victor = Map { 'id' => victor })
     */
    params: Map<string, string>;
    /**
     * Original route name (i.e. /users/{id:[a-z]+})
     */
    originalRoute: string;
    /**
     * Current route name (i.e. /users/victor)
     */
    path: string;
}

class Pointer {
    constructor(private routes: IPointerRoute[] = []) {
    }

    /**
     * Get raw route and replace it with params
     */
    public resolve(pathname: string, params: Map<string, string>) {
        const route = this.routes.find((r) => r.originalRoute === pathname);

        if(!route) {
            throw new Error('Route not found');
        }

        return route.resolve(params);
    }

    public createMatchRegularExpression(route: string): {
        params: string[];
        regularExpression: RegExp;
    } {
        const paths = this.getSlicesFromPath(route);
        const exp = ['^'];
        const params = [];

        for(const path of paths) {
            const bracketIndex = path.indexOf('{');

            if(bracketIndex === -1) {
                exp.push(path);
                continue;
            }

            const content = path.substring(bracketIndex + 1, path.length - 1);
            const colonIndex = content.indexOf(':');

            if(colonIndex === -1) {
                params.push(content);
                exp.push('/([0-9A-z\_\-]+)');
                continue;
            }

            params.push(content.substring(0, colonIndex));
            exp.push(
                '/(', content.substring(colonIndex + 1, content.length), ')'
            );
        }
        exp.push('$');

        for(let i = 0; i < params.length; i++) {
            for(let j = 0; j < params.length; j++) {
                if(i === j) {
                    continue;
                }

                if(params[j] === params[i]) {
                    throw new Error(`Found repeated param "${params[j]}" on route "${route}"`);
                }
            }
        }

        return {
            params,
            regularExpression: new RegExp(exp.join(''))
        };
    }

    public get(path: string): IPointerRoute | undefined {
        return this.routes.find((route) => route.originalRoute === path);
    }

    public getOrFail(path: string): IPointerRoute {
        const route = this.get(path);
        if(!route) {
            throw new Error('Could not find route');
        }
        return route;
    }

    public add(route: string) {
        const match = this.createMatchRegularExpression(route);
        const resolveFunction = this.createResolveFunction(route);

        this.routes.push({
            originalRoute: route,
            params: match.params,
            regularExpression: match.regularExpression,
            resolve: resolveFunction
        });
        return this;
    }

    public createResolveFunction(route: string): (params?: Map<string, string>) => string {
        const paths = this.getSlicesFromPath(route);
        const indexes: {
            [s: string]: number;
        } = {};

        let str = '';

        for(const path of paths) {
            const bracketIndex = path.indexOf('{');

            if(bracketIndex > -1) {
                const contents = path.substring(bracketIndex + 1, path.length - 1);
                const commaIndex = contents.indexOf(':');

                let paramName = contents;

                if(commaIndex > -1) {
                    paramName = contents.substring(0, commaIndex);
                }

                str += '/';
                indexes[paramName] = str.length;
                continue;
            }

            str += path;
        }

        return (params) => {
            let resolvedPath = str;
            let delta = 0;

            Object.keys(indexes).forEach((paramName) => {
                if(!params) {
                    return;
                }

                const value = params.get(paramName);

                if(!value) {
                    throw new Error(`Missing param name "${paramName}" for resolving`);
                }

                const paramStartIndex = indexes[paramName] + delta;

                resolvedPath = resolvedPath.substring(0, paramStartIndex) +
                                value +
                                resolvedPath.substring(paramStartIndex, resolvedPath.length);
                delta += value.length;
            });

            return resolvedPath;
        };
    }

    public test(path: string) {
        if(this.match(path)) {
            return true;
        }

        return false;
    }

    public getSlicesFromPath(path: string) {
        const group = [];
        let nextItem = '';
        const ii = path.length;

        for(let i = 0; i < ii; i++) {
            const lastItem = i === path.length - 1;

            if(path[i] === '/' && lastItem) {
                group.push(path[i]);
                continue;
            }

            if(path[i + 1] === '/' || lastItem) {
                group.push(nextItem + path[i]);
                nextItem = '';
                continue;
            }

            nextItem += path[i];
        }

        return group;
    }

    public match(path: string): IPointerMatch | undefined {
        return this.getPathMatches(path)[0];
    }

    public getPathMatches(path: string): IPointerMatch[] {
        const ii = this.routes.length;
        const results: IPointerMatch[] = [];
        let i: number;
        let j: number;

        for(i = 0; i < ii; i++) {
            const matches = path.match(this.routes[i].regularExpression);

            if(!matches) {
                continue;
            }

            const params = new Map<string, string>();
            const paramNames = new Array<string>().concat(this.routes[i].params);
            const jj = matches.length;

            for(j = 1; j < jj; j++) {
                const name = paramNames.shift();
                if(!name) {
                    throw new Error('No param name found');
                }
                params.set(name, matches[j]);
            }

            results.push({
                originalRoute: this.routes[i].originalRoute,
                params,
                path
            });
        }

        return results;
    }
}

export default Pointer;
