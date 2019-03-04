import { assert } from 'chai';
import { createMemoryHistory, History } from 'history';
import { test } from 'sarg';
import sinon from 'sinon';
import Router, { IRouteOnParameter } from '../src/router';

function createRouter(history: History, ...routes: IRouteOnParameter[]) {
    const router = new Router(history);

    for(const route of routes) {
        router.addRoute(route);
    }

    return router.init();
}

test('it should match /', async () => {
    const history = createMemoryHistory();
    const callback = sinon.spy();
    const booksCallback = sinon.spy();

    const router = await createRouter(history, {
        callback,
        path: '/'
    }, {
        callback: booksCallback,
        path: '/books/{id:[0-9]+}',
    });

    assert(callback.called);
    assert(booksCallback.notCalled);
    assert.equal(1, callback.callCount);

    router.destroy();
});

test('it should match / search', async () => {
    const callback = sinon.spy();
    const booksCallback = sinon.spy();
    const history = createMemoryHistory();
    history.push('/books/1002?q_comments=Title');

    const router = await createRouter(history, {
        callback,
        path: '/'
    }, {
        callback: booksCallback,
        name: 'books',
        path: '/books/{id:[0-9]+}'
    });

    assert(callback.notCalled);
    assert(booksCallback.calledWith(
        'books',
        new Map().set('id', '1002'),
        new Map().set('q_comments', 'Title')
    ));
    assert.equal(1, booksCallback.callCount);

    router.destroy();
});

test('it should not match /books/100', async () => {
    const indexCallback = sinon.spy();
    const booksCallback = sinon.spy();
    const postsCallback = sinon.spy();
    const history = createMemoryHistory();
    history.push('/books/39990481091');

    const router = await createRouter(history, {
        callback: indexCallback,
        path: '/'
    }, {
        callback: postsCallback,
        path: '/posts/{id:[0-9]+}'
    }, {
        callback: booksCallback,
        path: '/books/{id:[0-9]+}'
    });

    assert(booksCallback.called);
    assert.equal(1, booksCallback.callCount);

    assert(postsCallback.notCalled);
    assert(indexCallback.notCalled);

    router.destroy();
});

test('it should support async callback', async () => {
    const indexCallback = sinon.spy();
    const history = createMemoryHistory();

    const router = await createRouter(history, {
        path: '/',
        callback(params) {
            return new Promise((resolve) => {
                setTimeout(() => {
                    indexCallback(params);
                    resolve();
                }, 0);
            });
        }
    });
    history.push('/');

    assert(indexCallback.called);

    router.destroy();
});

test('it should call callback with route params', async () => {
    const indexCallback = sinon.spy();
    const history = createMemoryHistory();

    const router = await createRouter(history, {
        callback: indexCallback,
        path: '/books/{id:[0-9]+}'
    });
    history.push('/books/3991');

    assert(indexCallback.calledWith(
        '/books/{id:[0-9]+}',
        new Map().set('id', '3991'),
        new Map()
    ));

    router.destroy();
});

test('it should replace state inside onBefore', async () => {
    const booksCallback = sinon.spy();
    const shortBooksCallback = sinon.spy();
    const history = createMemoryHistory();

    const router = await createRouter(history, {
        callback: booksCallback,
        path: '/books/{id:[0-9]+}',
        onBefore(match, replaceState) {
            replaceState('bRoute', match.params);
        }
    }, {
        callback: shortBooksCallback,
        name: 'bRoute',
        path: '/b/{id:[0-9]+}'
    });
    history.push('/books/100');

    assert(booksCallback.notCalled);
    assert(shortBooksCallback.called);
    assert.equal(shortBooksCallback.callCount, 1);

    router.destroy();
});

test('it should call onBefore() with match', async () => {
    const onBeforeCallback = sinon.spy();
    const history = createMemoryHistory();

    const router = await createRouter(history, {
        callback: () => undefined,
        onBefore: onBeforeCallback,
        path: '/books/{id:[0-9]+}',
    });
    history.push('/books/100');

    assert.deepEqual(onBeforeCallback.args[0][0], {
        originalRoute: '/books/{id:[0-9]+}',
        params: new Map().set('id', '100'),
        path: '/books/100',
        query: new Map()
    });

    router.destroy();
});

// test('it should allow to execute pushState or replaceState just once inside onBefore', async () => {
//     const indexCallback = sinon.spy();
//     const dashboardOnBefore = sinon.spy();
//     const dashboardCallback = sinon.spy();
//     const loginCallback = sinon.spy();
//     const loginOnBefore = sinon.spy();
//     const history = createMemoryHistory();
//     history.push('/');

//     try {
//         await createRouter(history, {
//             callback: indexCallback,
//             onBefore: (_MATCH, replaceState) => {
//                 replaceState('/login');
//                 replaceState('/dashboard');
//             },
//             path: '/',
//         }, {
//             callback: dashboardCallback,
//             onBefore: dashboardOnBefore,
//             path: '/dashboard',
//         }, {
//             callback: loginCallback,
//             onBefore: loginOnBefore,
//             path: '/login',
//         });
//     } catch(reason) {
//         assert.deepEqual(reason, new Error(
//             `You can only execute \`pushState\` or \`replaceState\` ` +
//             `once while inside \`onBefore\` statements`
//         ));
//     }

//     assert(indexCallback.notCalled);
//     assert(dashboardOnBefore.notCalled);
//     assert(dashboardCallback.notCalled);
//     assert(loginCallback.called);
//     assert(loginOnBefore.called);
// });
test('it should emit routeNotFound event when hit an unexistent URL', async () => {
    const history = createMemoryHistory();
    const router = new Router(history);
    const onRouteNotFound = sinon.spy();
    router.on('routeNotFound', onRouteNotFound);
    await router.init();
    assert.ok(onRouteNotFound.calledWith('/'));
});

test('it should cancel redirection if pushState/replaceState is called inside onBefore', async () => {
    const history = createMemoryHistory();
    history.push('/');

    const indexCallback = sinon.spy();
    const loginCallback = sinon.spy();

    const router = await createRouter(history, {
        callback: indexCallback,
        onBefore: (_MATCH, replaceState) => {
            replaceState('login');
        },
        path: '/',
    }, {
        callback: loginCallback,
        name: 'login',
        path: '/login'
    });

    assert(indexCallback.notCalled);
    assert(loginCallback.calledOnce);

    router.destroy();
});

test('replaceState(): it should throw for unexistent route name', async () => {
    const history = createMemoryHistory();
    history.push('/');

    const router = await createRouter(history);
    try {
        await router.replaceState('app.index');
    } catch(reason) {
        assert.ok(/No route found for name "app\.index"/.test(reason.message));
    }

    router.destroy();
});

test('resolve(): it should resolve route path according to arguments', async () => {
    const history = createMemoryHistory();
    history.push('/');

    const router = await createRouter(history, {
        callback: () => undefined,
        name: 'app.index',
        path: '/users/{username:[a-z0-9\-]+}'
    });

    assert.equal('/users/victor-queiroz?offset=10', router.resolve(
        'app.index',
        new Map().set('username', 'victor-queiroz'),
        new Map().set('offset', '10')
    ));
});

test('pushState(): it should push resolved state to history', async () => {
    const history = createMemoryHistory();
    history.push('/');

    const router = await createRouter(history, {
        callback: () => undefined,
        name: 'app.index',
        path: '/home'
    });
    await router.pushState('app.index');
    assert.equal('/home', history.location.pathname);
});

test('pushState(): it should throw for unexistent routes', async () => {
    const history = createMemoryHistory();
    history.push('/');

    const router = await createRouter(history);
    try {
        await router.pushState('app.index');
    } catch(reason) {
        assert.ok(/No route found for name "app\.index"/.test(reason.message));
    }

    router.destroy();
});
