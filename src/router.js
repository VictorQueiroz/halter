import url from 'url';
import querystring from 'querystring';
import Pointer from './pointer';

class Router {
    constructor(history){
        this.history = history;
        this.pointer = new Pointer();
        this.onPopState = this.onPopState.bind(this);
        this.routes = [];
        this.callbackChange = [];
    }

    listen(callback){
        this.callbackChange.push(callback);
    }

    removeListener(callback){
        for(let i = 0; i < this.callbackChange.length; i++){
            if(this.callbackChange[i] !== callback)
                continue;

            this.callbackChange.splice(i, 1);
        }
    }

    on({ path, callback, onBefore }){
        this.pointer.add(path);
        this.routes.push({
            path,
            callback,
            onBefore
        });
        return this;
    }

    onPopState(e) {
        this.onChangePath(this.history.getAbsolutePath());
    }

    async onChangePath(newPath){
        const parsedUrl = url.parse(newPath);

        for(let i = 0; i < this.callbackChange.length; i++)
            this.callbackChange[i](newPath);

        let match = this.pointer.match(parsedUrl.pathname);

        if(!match)
            return false;

        match = Object.assign({}, match, {
            query: querystring.parse(parsedUrl.query)
        });

        const { callback, onBefore } = this.routes.find(route => (
            route.path === match.originalRoute
        ));

        await this.onMatchRoute(() => callback(match), onBefore ? (replaceState, pushState) => (
            onBefore(match, replaceState, pushState)
        ) : null);
    }

    async executeOnBefore(onBefore){
        let result,
            cancelled = false;

        const onPushState = (state, title, path) => {
            if(cancelled) {
                throw new Error(
                    `You can only execute \`pushState\` or \`replaceState\` ` +
                    `once while inside \`onBefore\` statements`
                );
            }

            cancelled = true;
            result = this.pushState(state, title, path);
        };

        const onReplaceState = (state, title, path) => {
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

        if(cancelled)
            await result;

        return cancelled;
    }

    async onMatchRoute(callback, onBefore) {
        let cancelled = false;

        if(onBefore){
            cancelled = await this.executeOnBefore(onBefore);
        }

        if(cancelled)
            return false;

        await callback();
    }

    async pushState(state, title, path){
        this.history.pushState(state, title, path);
        await this.onChangePath(path);
    }

    async replaceState(state, title, path){
        this.history.replaceState(state, title, path);
        await this.onChangePath(path);
    }

    async init() {
        await this.onChangePath(this.history.getAbsolutePath());
        this.history.init();
        this.history.on('popstate', this.onPopState);
    }

    destroy() {
        this.routes.splice(0, this.routes.length);
        this.history.removeListener('popstate', this.onPopState);
        this.history.destroy();
    }
}


export default Router;
