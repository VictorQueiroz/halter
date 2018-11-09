import assert from 'assert';
import { test } from 'sarg';
import sinon from 'sinon';
import HistoryFake from '../src/history-fake';
import RouterLabeled, { IRouteLabeled } from '../src/router-labeled';

function createRouter(...routes: IRouteLabeled[]) {
    const router = new RouterLabeled(new HistoryFake());

    for(const route of routes) {
        router.on(route);
    }

    return router;
}

test('it should store route by label', async () => {
    const indexCallback = sinon.spy();
    const router = createRouter({
        callback: indexCallback,
        name: 'app.index',
        path: '/'
    });

    await router.pushStateByLabel({}, '', 'app.index');

    assert(indexCallback.called);
});

test('it should support labeled route with params', async () => {
    const postsCallback = sinon.spy();

    const router = createRouter({
        callback: postsCallback,
        name: 'app.posts',
        path: '/posts/{id:[0-9]+}'
    });

    await router.pushStateByLabel({}, '', 'app.posts', {
        id: '304'
    });

    assert(postsCallback.called);
});

test('it should support push state by label inside onBefore', async () => {
    const newLoginCallback = sinon.spy();
    const router = createRouter({
        callback: () => undefined,
        name: 'app.login',
        path: '/login',
        onBefore(_MATCH, replaceState) {
            replaceState(undefined, undefined, 'new.login');
        }
    }, {
        callback: newLoginCallback,
        name: 'new.login',
        path: '/new/login'
    });

    await router.pushStateByLabel(undefined, undefined, 'app.login');

    assert(newLoginCallback.called);
});

test('it should redirect to route with params', async () => {
    const newLoginCallback = sinon.spy();
    const router = createRouter({
        callback: () => undefined,
        name: 'app.post.detail',
        path: '/p/{id:[0-9]+}',
        onBefore(match, replaceState) {
            replaceState(undefined, undefined, 'new.post.detail', {
                id: match.params.id
            });
        }
    }, {
        callback: newLoginCallback,
        name: 'new.post.detail',
        path: '/posts/{id:[0-9]+}'
    });

    await router.pushStateByLabel(undefined, undefined, 'app.post.detail', {
        id: '100'
    });

    assert(newLoginCallback.calledWith({
        originalRoute: '/posts/{id:[0-9]+}',
        params: {
            id: '100'
        },
        path: '/posts/100',
        query: {}
    }));
});
