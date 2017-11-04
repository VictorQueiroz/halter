import url from 'url';
import PropTypes from 'prop-types';
import { Component } from 'react';

function getParentRouteProps(current, parent){
    let onBefore = [];
    let onMatchRoute = [];
    let component = [];
    let name = [];
    let path = current.path || '';

    if(parent && parent.hasOwnProperty('path')) {
        path = url.resolve(parent.path, path);
    }

    if(parent && parent.hasOwnProperty('component')){
        component = component.concat(parent.component);
    }

    if(current.hasOwnProperty('name')) {
        name = name.concat(current.name);
    }

    if(current.hasOwnProperty('component')) {
        component = component.concat(current.component);
    }

    if(current.hasOwnProperty('onBefore')){
        onBefore = onBefore.concat(current.onBefore);
    }

    if(parent && parent.hasOwnProperty('onBefore')){
        onBefore = onBefore.concat(parent.onBefore);
    }

    if(parent && parent.hasOwnProperty('name')){
        name = [].concat(parent.name).concat(name);
    }

    return {
        component,
        onBefore,
        path,
        name
    };
}

class RouterView extends Component {
    constructor(props) {
        super(props);
        this.state = {
            children: null
        };
    }

    getChildContext() {
        return {
            router: this.props.router
        };
    }

    componentDidMount() {
        this.createRoutes(this.props.routes, this.props.router, null);
        this._initPromise = this.props.router.init();
    }

    componentWillUnmount() {
        this._destroyPromise = this.props.router.destroy();
    }

    createRoutes(routes, router, parentRoute){
        let i;
        const parentUrl = parentRoute ? parentRoute.path : '';
        const ii = routes.length;

        for(i = 0; i < ii; i++){
            const route = routes[i];
            const url = [parentUrl, route.path];

            if(route.hasOwnProperty('childRoutes')){
                this.createRoutes(route.childRoutes, router, getParentRouteProps(route, parentRoute));
                continue;
            }

            const routeUrl = url.join('/').replace(/\/{1,}/g, '/');

            let component = [];
            let onBefore = [];
            let name = [];

            if(Array.isArray(route.component) || route.component) {
                component = component.concat(route.component);
            }

            if(route.hasOwnProperty('name'))
                name = name.concat(route.name);

            if(Array.isArray(route.onBefore) || route.onBefore)
                onBefore = onBefore.concat(route.onBefore);

            if(parentRoute){
                if(parentRoute.hasOwnProperty('name'))
                    name = parentRoute.name.concat(name);

                if(parentRoute.hasOwnProperty('onBefore'))
                    onBefore = parentRoute.onBefore.concat(onBefore);

                if(parentRoute.hasOwnProperty('component'))
                    component = parentRoute.component.concat(component);
            }

            function getChildren(component, props){
                if(component.length){
                    const Component = component.shift();

                    return <Component {...props}>{getChildren(component, props)}</Component>;
                }
                return null;
            }


            router.on({
                name: name.join('.'),
                path: routeUrl,
                onBefore: async function(...args){
                    const ii = onBefore.length;

                    for(let i = 0; i < ii; i++)
                        await onBefore[i](...args);
                },
                callback: (location) => {
                    const children = getChildren([].concat(component), {
                        location
                    });

                    this.onReceiveChildren(children);
                }
            });
        }
    }

    onReceiveChildren(children) {
        this.setState({
            children
        });
    }

    render() {
        return this.state.children ? this.state.children : <div/>;
    }
}

RouterView.childContextTypes = {
    router: PropTypes.object
};

export default RouterView;
