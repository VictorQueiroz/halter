import React from 'react';
import PropTypes from 'prop-types';

export default function Link({ to, params, children }, { router }) {
    const props = {};

    if(router.isLabeled){
        const route = router.getRouteByLabel(to);

        if(!route)
            throw new Error(`Invalid label for route "${to}"`);

        const path = route.path;

        props.href = path;
        props.onClick = function(e){
            e.preventDefault();

            router.pushStateByLabel(null, null, to, params);
        };
    } else {
        props.href = to;
        props.onClick = function(e){
            e.preventDefault();

            router.pushState(null, null, to);
        }
    }

    return (
        <a {...props}>
            {children}
        </a>
    );
}

Link.contextTypes = {
    router: PropTypes.object
};

Link.propTypes = {
    to: PropTypes.string,
    params: PropTypes.object,
    children: PropTypes.element
};
