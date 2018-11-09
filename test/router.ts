import assert from 'assert';
import { test } from 'sarg';
import sinon from 'sinon';
import HistoryFake from '../src/history-fake';
import Router, { IRoute } from '../src/router';

function createRouter(...routes: IRoute[]) {
    const router = new Router(new HistoryFake());

    for(const route of routes) {
        router.on(route);
    }

    return router;
}

test('it should match /', async () => {
    const callback = sinon.spy();
    const booksCallback = sinon.spy();

    await createRouter({
        callback,
        path: '/'
    }, {
        callback: booksCallback,
        path: '/books/{id:[0-9]+}',
    }).pushState({}, '', '/');

    assert(callback.called);
    assert(booksCallback.notCalled);
    assert.equal(1, callback.callCount);
});

test('it should match / search', async () => {
    const callback = sinon.spy();
    const booksCallback = sinon.spy();

    await createRouter({
        callback,
        path: '/'
    }, {
        callback: booksCallback,
        path: '/books/{id:[0-9]+}'
    }).pushState({}, '', '/books/1002?q_comments=Title');

    assert(callback.notCalled);
    assert(booksCallback.calledWith({
        originalRoute: '/books/{id:[0-9]+}',
        params: { id: '1002' },
        path: '/books/1002',
        query: { q_comments: 'Title' }
    }));
    assert.equal(1, booksCallback.callCount);
});

test('it should not match /books/100', async () => {
    const indexCallback = sinon.spy();
    const booksCallback = sinon.spy();
    const postsCallback = sinon.spy();

    await createRouter({
        callback: indexCallback,
        path: '/'
    }, {
        callback: postsCallback,
        path: '/posts/{id:[0-9]+}'
    }, {
        callback: booksCallback,
        path: '/books/{id:[0-9]+}'
    }).pushState({}, '', '/books/39990481091');

    assert(booksCallback.called);
    assert.equal(1, booksCallback.callCount);

    assert(postsCallback.notCalled);
    assert(indexCallback.notCalled);
});

test('it should support async callback', async () => {
    const indexCallback = sinon.spy();

    await createRouter({
        path: '/',
        callback(params) {
            return new Promise((resolve) => {
                setTimeout(() => {
                    indexCallback(params);
                    resolve();
                }, 0);
            });
        }
    }).pushState({}, '', '/');

    assert(indexCallback.called);
});

test('it should call callback with route params', async () => {
    const indexCallback = sinon.spy();

    await createRouter({
        callback: indexCallback,
        path: '/books/{id:[0-9]+}'
    }).pushState({}, '', '/books/3991');

    assert(indexCallback.calledWith({
        originalRoute: '/books/{id:[0-9]+}',
        params: {
            id: '3991'
        },
        path: '/books/3991',
        query: {},
    }));
});

test('it should replace state inside onBefore', async () => {
    const booksCallback = sinon.spy();
    const shortBooksCallback = sinon.spy();

    await createRouter({
        callback: booksCallback,
        path: '/books/{id:[0-9]+}',
        onBefore(match, replaceState) {
            replaceState({}, '', '/b/' + match.params.id);
        }
    }, {
        callback: shortBooksCallback,
        path: '/b/{id:[0-9]+}'
    }).pushState({}, '', '/books/100');

    assert(booksCallback.notCalled);
    assert(shortBooksCallback.called);
    assert.equal(shortBooksCallback.callCount, 1);
});

test('it should call onBefore() with match', async () => {
    const onBeforeCallback = sinon.spy();

    await createRouter({
        callback: () => undefined,
        onBefore: onBeforeCallback,
        path: '/books/{id:[0-9]+}',
    }).pushState({}, '', '/books/100');

    assert.deepEqual(onBeforeCallback.args[0][0], {
        originalRoute: '/books/{id:[0-9]+}',
        params: { id: '100' },
        path: '/books/100',
        query: {}
    });
});

test('it should allow to execute pushState or replaceState just once inside onBefore', async () => {
    const indexCallback = sinon.spy();
    const dashboardOnBefore = sinon.spy();
    const dashboardCallback = sinon.spy();
    const loginCallback = sinon.spy();
    const loginOnBefore = sinon.spy();

    try {
        await createRouter({
            callback: indexCallback,
            onBefore: (_MATCH, replaceState) => {
                replaceState(undefined, undefined, '/login');
                replaceState(undefined, undefined, '/dashboard');
            },
            path: '/',
        }, {
            callback: dashboardCallback,
            onBefore: dashboardOnBefore,
            path: '/dashboard',
        }, {
            callback: loginCallback,
            onBefore: loginOnBefore,
            path: '/login',
        }).pushState(null, undefined, '/');
    } catch(reason) {
        assert.deepEqual(reason, new Error(
            `You can only execute \`pushState\` or \`replaceState\` ` +
            `once while inside \`onBefore\` statements`
        ));
    }

    assert(indexCallback.notCalled);
    assert(dashboardOnBefore.notCalled);
    assert(dashboardCallback.notCalled);
    assert(loginCallback.called);
    assert(loginOnBefore.called);
});
