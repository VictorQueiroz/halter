class Pointer {
    constructor(routes = []){
        this.routes = routes;
    }

    /**
     * Get raw route and replace it with params
     */
    resolve(pathname, params) {
        const route = this.routes.find(r => r.originalRoute === pathname);

        return route.resolve(params);
    }

    createMatchRegularExpression(route){
        const paths = this.getSlicesFromPath(route);
        const exp = ['^'];
        const params = [];

        for(let j = 0; j < paths.length; j++){
            const bracketIndex = paths[j].indexOf('{');

            if(bracketIndex === -1) {
                exp.push(paths[j]);
                continue;
            }

            const content = paths[j].substring(bracketIndex + 1, paths[j].length - 1);
            const colonIndex = content.indexOf(':');

            if(colonIndex === -1){
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

        for(let i = 0; i < params.length; i++){
            for(let j = 0; j < params.length; j++){
                if(i === j)
                    continue;

                if(params[j] === params[i])
                    throw new Error(`Found repeated param "${params[j]}" on route "${route}"`);
            }
        }

        return {
            regularExpression: new RegExp(exp.join('')),
            params
        };
    }

    get(path){
        return this.routes.find(route => route.originalRoute === path);
    }

    add(route){
        const match = this.createMatchRegularExpression(route);
        const resolveFunction = this.createResolveFunction(route);

        this.routes.push({
            params: match.params,
            resolve: resolveFunction,
            originalRoute: route,
            regularExpression: match.regularExpression
        });
        return this;
    }

    createResolveFunction(route) {
        const paths = this.getSlicesFromPath(route);
        const indexes = {};

        let str = '';

        for(let i = 0; i < paths.length; i++){
            const bracketIndex = paths[i].indexOf('{');

            if(bracketIndex > -1){
                const contents = paths[i].substring(bracketIndex + 1, paths[i].length - 1);
                const commaIndex = contents.indexOf(':');

                let paramName = contents;

                if(commaIndex > -1)
                    paramName = contents.substring(0, commaIndex);

                str += '/';
                indexes[paramName] = str.length;
                continue;
            }

            str += paths[i];
        }

        return function(params) {
            let resolvedPath = str;
            let delta = 0;

            Object.keys(indexes).forEach(paramName => {
                if(!params.hasOwnProperty(paramName))
                    throw new Error(`Missing param name "${paramName}" for resolving`);

                const value = params[paramName];
                const paramStartIndex = indexes[paramName] + delta;

                resolvedPath = resolvedPath.substring(0, paramStartIndex) +
                                value +
                                resolvedPath.substring(paramStartIndex, resolvedPath.length);
                delta += value.length;
            });

            return resolvedPath;
        };
    }

    test(path){
        if(this.match(path))
            return true;

        return false;
    }

    getSlicesFromPath(path){
        const group = [];
        let nextItem = '';
        const ii = path.length;

        for(let i = 0; i < ii; i++){
            const lastItem = i === path.length - 1;

            if(path[i] === '/' && lastItem){
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

    match(path){
        return this.getPathMatches(path)[0];
    }

    getPathMatches(path){
        const ii = this.routes.length;
        const results = [];
        let i, j;

        for(i = 0; i < ii; i++) {
            const matches = path.match(this.routes[i].regularExpression);

            if(!matches)
                continue;

            const params = {};
            const paramNames = [].concat(this.routes[i].params);
            const jj = matches.length;

            for(j = 1; j < jj; j++)
                params[paramNames.shift()] = matches[j];

            results.push({
                params,
                path: path,
                originalRoute: this.routes[i].originalRoute
            });
        }

        return results;
    }
}

export default Pointer;
