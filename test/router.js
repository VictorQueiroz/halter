import Router from '../src/router';
import assert from 'assert';
import sinon from 'sinon';
import HistoryFake from './history-fake';

function createRouter(...routes){
    const router = new Router(new HistoryFake())

    for(let i = 0; i < routes.length; i++)
        router.on(routes[i]);

    return router;
}

exports['it should match /'] = async function() {
    const callback = sinon.spy();
    const booksCallback = sinon.spy();

    await createRouter({
        path: '/',
        callback
    }, {
        path: '/books/{id:[0-9]+}',
        callback: booksCallback
    }).pushState({}, '', '/');

    assert(callback.called);
    assert(booksCallback.notCalled);
    assert.equal(1, callback.callCount);
};

exports['it should not match /books/100'] = async function() {
    const indexCallback = sinon.spy();
    const booksCallback = sinon.spy();
    const postsCallback = sinon.spy();

    await createRouter({
        path: '/',
        callback: indexCallback
    }, {
        path: '/posts/{id:[0-9]+}',
        callback: postsCallback
    }, {
        path: '/books/{id:[0-9]+}',
        callback: booksCallback
    }).pushState({}, '', '/books/39990481091');

    assert(booksCallback.called);
    assert.equal(1, booksCallback.callCount);

    assert(postsCallback.notCalled);
    assert(indexCallback.notCalled);
};

exports['it should support async callback'] = async function() {
    const indexCallback = sinon.spy();

    await createRouter({
        path: '/',
        callback: function(params){
            return new Promise((resolve) => {
                setTimeout(() => {
                    indexCallback(params);
                    resolve();
                });
            });
        }
    }).pushState({}, '', '/');

    assert(indexCallback.called);
};

exports['it should call callback with route params'] = async function() {
    const indexCallback = sinon.spy();

    await createRouter({
        path: '/books/{id:[0-9]+}',
        callback: indexCallback
    }).pushState({}, '', '/books/3991');

    assert(indexCallback.calledWith({
        path: '/books/3991',
        originalRoute: '/books/{id:[0-9]+}',
        params: {
            id: '3991'
        }
    }));
};

exports['it should replace state inside onBefore'] = async function() {
    const booksCallback = sinon.spy();
    const shortBooksCallback = sinon.spy();

    await createRouter({
        path: '/books/{id:[0-9]+}',
        callback: booksCallback,
        onBefore: function(match, replaceState){
            replaceState({}, '', '/b/' + match.params.id);
        }
    }, {
        path: '/b/{id:[0-9]+}',
        callback: shortBooksCallback
    }).pushState({}, '', '/books/100');

    assert(booksCallback.notCalled);
    assert(shortBooksCallback.called);
    assert.equal(shortBooksCallback.callCount, 1);
};

exports['it should call onBefore() with match'] = async function() {
    const onBeforeCallback = sinon.spy();

    await createRouter({
        path: '/books/{id:[0-9]+}',
        callback: () => {},
        onBefore: onBeforeCallback
    }).pushState({}, '', '/books/100');

    assert.deepEqual(onBeforeCallback.args[0][0], {
        path: '/books/100',
        originalRoute: '/books/{id:[0-9]+}',
        params: { id: '100' }
    });
};

exports['it should allow to execute pushState or replaceState just once inside onBefore'] = async function() {
    const indexCallback = sinon.spy();
    const dashboardOnBefore = sinon.spy();
    const dashboardCallback = sinon.spy();
    const loginCallback = sinon.spy();
    const loginOnBefore = sinon.spy();

    try {
        await createRouter({
            path: '/',
            onBefore: (match, replaceState) => {
                replaceState(null, null, '/login');
                replaceState(null, null, '/dashboard');
            },
            callback: indexCallback
        }, {
            path: '/dashboard',
            onBefore: dashboardOnBefore,
            callback: dashboardCallback
        }, {
            path: '/login',
            callback: loginCallback,
            onBefore: loginOnBefore
        }).pushState(null, null, '/');
    } catch(reason){
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
};
