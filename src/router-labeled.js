import Router from './router';

class RouterLabeled extends Router {
    constructor(history) {
        super(history);
        this.isLabeled = true;
    }

    getRouteByLabel(label){
        return this.routes.find(route => route.name === label);
    }

    on({ name, path, callback, onBefore }){
        this.pointer.add(path);
        this.routes.push({
            name,
            path,
            callback,
            onBefore
        });
        return this;
    }

    pushStateByLabel(state, title, label, params, query = ''){
        const route = this.getRouteByLabel(label);
        const newPath = this.pointer.get(route.path).resolve(params);

        return this.pushState(state, title, newPath + (query ? '?' + query : ''));
    }

    replaceStateByLabel(state, title, label, params, query = ''){
        const route = this.getRouteByLabel(label);
        const newPath = this.pointer.get(route.path).resolve(params);

        return this.replaceState(state, title, newPath + (query ? '?' + query : ''));
    }

    async executeOnBefore(onBefore){
        let result,
            cancelled = false;

        const onPushState = (state, title, path, params) => {
            cancelled = true;
            result = this.pushStateByLabel(state, title, path, params);
        };

        const onReplaceState = (state, title, path, params) => {
            cancelled = true;
            result = this.replaceStateByLabel(state, title, path, params);
        };

        await onBefore(onReplaceState, onPushState);

        if(cancelled)
            await result;

        return cancelled;
    }

}

export default RouterLabeled;
