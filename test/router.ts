import assert from 'assert';
import { createMemoryHistory, History } from 'history';
import { test } from 'sarg';
import sinon from 'sinon';
import Router, { IRouteOnParameter } from '../src/router';

function createRouter(history: History, ...routes: IRouteOnParameter[]) {
    const router = new Router(history);

    for(const route of routes) {
        router.on(route);
    }

    return router.init();
}

test('it should match /', async () => {
    const history = createMemoryHistory();
    const callback = sinon.spy();
    const booksCallback = sinon.spy();

    await createRouter(history, {
        callback,
        path: '/'
    }, {
        callback: booksCallback,
        path: '/books/{id:[0-9]+}',
    });

    assert(callback.called);
    assert(booksCallback.notCalled);
    assert.equal(1, callback.callCount);
});

test('it should match / search', async () => {
    const callback = sinon.spy();
    const booksCallback = sinon.spy();
    const history = createMemoryHistory();
    history.push('/books/1002?q_comments=Title');

    await createRouter(history, {
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
        { id: '1002' },
        { q_comments: 'Title' }
    ));
    assert.equal(1, booksCallback.callCount);
});

test('it should not match /books/100', async () => {
    const indexCallback = sinon.spy();
    const booksCallback = sinon.spy();
    const postsCallback = sinon.spy();
    const history = createMemoryHistory();
    history.push('/books/39990481091');

    await createRouter(history, {
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
});

test('it should support async callback', async () => {
    const indexCallback = sinon.spy();
    const history = createMemoryHistory();

    await createRouter(history, {
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
});

test('it should call callback with route params', async () => {
    const indexCallback = sinon.spy();
    const history = createMemoryHistory();

    await createRouter(history, {
        callback: indexCallback,
        path: '/books/{id:[0-9]+}'
    });
    history.push('/books/3991');

    assert(indexCallback.calledWith(
        '/books/{id:[0-9]+}',
        {
            id: '3991'
        },
        {}
    ));
});

test('it should replace state inside onBefore', async () => {
    const booksCallback = sinon.spy();
    const shortBooksCallback = sinon.spy();
    const history = createMemoryHistory();

    await createRouter(history, {
        callback: booksCallback,
        path: '/books/{id:[0-9]+}',
        onBefore(match, replaceState) {
            replaceState('bRoute', {
                id: match.params.id
            });
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
});

test('it should call onBefore() with match', async () => {
    const onBeforeCallback = sinon.spy();
    const history = createMemoryHistory();

    await createRouter(history, {
        callback: () => undefined,
        onBefore: onBeforeCallback,
        path: '/books/{id:[0-9]+}',
    });
    history.push('/books/100');

    assert.deepEqual(onBeforeCallback.args[0][0], {
        originalRoute: '/books/{id:[0-9]+}',
        params: { id: '100' },
        path: '/books/100',
        query: {}
    });
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

test('it should cancel redirection if pushState/replaceState is called inside onBefore', async () => {
    const history = createMemoryHistory();
    history.push('/');

    const indexCallback = sinon.spy();
    const loginCallback = sinon.spy();

    await createRouter(history, {
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
});
