import RouterLabeled from '../src/router-labeled';
import HistoryFake from './history-fake';
import sinon from 'sinon';
import assert from 'assert';

function createRouter(...routes) {
    const router = new RouterLabeled(new HistoryFake);

    for(let i = 0; i < routes.length; i++)
        router.on(routes[i]);

    return router;
}

exports['it should store route by label'] = async function() {
    const indexCallback = sinon.spy();
    const router = createRouter({
        name: 'app.index',
        path: '/',
        callback: indexCallback
    });

    await router.pushStateByLabel({}, '', 'app.index');

    assert(indexCallback.called);
};

exports['it should support labeled route with params'] = async function() {
    const postsCallback = sinon.spy();

    const router = createRouter({
        name: 'app.posts',
        path: '/posts/{id:[0-9]+}',
        callback: postsCallback
    });

    await router.pushStateByLabel({}, '', 'app.posts', {
        id: '304'
    });

    assert(postsCallback.called);
};

exports['it should support push state by label inside onBefore'] = async function() {
    const newLoginCallback = sinon.spy();
    const router = createRouter({
        name: 'app.login',
        path: '/login',
        onBefore: function(match, replaceState, pushState){
            replaceState(null, null, 'new.login');
        }
    }, {
        name: 'new.login',
        path: '/new/login',
        callback: newLoginCallback
    });

    await router.pushStateByLabel(null, null, 'app.login');

    assert(newLoginCallback.called);
};

exports['it should redirect to route with params'] = async function() {
    const newLoginCallback = sinon.spy();
    const router = createRouter({
        name: 'app.post.detail',
        path: '/p/{id:[0-9]+}',
        onBefore: function(match, replaceState, pushState){
            replaceState(null, null, 'new.post.detail', {
                id: match.params.id
            });
        }
    }, {
        name: 'new.post.detail',
        path: '/posts/{id:[0-9]+}',
        callback: newLoginCallback
    });

    await router.pushStateByLabel(null, null, 'app.post.detail', {
        id: '100'
    });

    assert(newLoginCallback.calledWith({
        path: '/posts/100',
        query: {},
        originalRoute: '/posts/{id:[0-9]+}',
        params: {
            id: '100'
        }
    }));
};
