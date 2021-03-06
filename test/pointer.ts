import { assert } from 'chai';
import { Suite } from 'sarg';
import Pointer from '../src/pointer';
import Route from '../src/route';

const suite = new Suite();
const {test} = suite;

test('/ should match /', () => {
    assert(new Pointer()
                .add('/')
                .test('/'));
});

test('/users/user-name should match param name only', () => {
    assert(new Pointer()
            .add('/users/{id}')
            .test('/users/user-name'));
});

test('/users/user-name should match [a-z\-]+', () => {
    assert(new Pointer()
                .add('/users/{id:[a-z\-]+}')
                .test('/users/user-name'));
});

test('it should resolve route params', () => {
    assert.equal(new Pointer()
            .add('/users/{id:[0-9]+}')
            .getOrFail('/users/{id:[0-9]+}')
            .resolve(new Map().set('id', '100')), '/users/100');
});

test('it should fail when get invalid route', () => {
    assert.throws(() => {
        new Pointer().getOrFail('/users');
    }, /Could not find route/);
});

test('resolve(): it should throw for not found params', () => {
    assert.equal(
        new Pointer()
            .add('/users/{id:[0-9]+}')
            .getOrFail('/users/{id:[0-9]+}')
            .resolve(new Map()),
        undefined
    );
});

test('it should match /posts/{postId:[0-9]+}/comments/{commentId:[0-9]+}/lines/{lineId:[0-9]+}', () => {
    const pointer = new Pointer().add('/posts/{postId:[0-9]+}/comments/{commentId:[0-9]+}/lines/{lineId:[0-9]+}');

    assert(pointer.test('/posts/1/comments/2/lines/3'));
    assert(pointer.test('/posts/0/comments/0/lines/0'));
    assert.equal(pointer.test('/posts/1/comments/2/lines/a'), false);
    assert.equal(pointer.test('/posts/1/comments/a/lines/0'), false);
    assert.equal(pointer.test('/posts/a/comments/2/lines/3'), false);
});

test('it should accept direct Route instances', () => {
    const route = new Route(
        '/{id:[0-9]+}/{id:[0-9]+}'
    );
    assert.equal(
        new Pointer().add(route).getOrFail('/{id:[0-9]+}/{id:[0-9]+}'),
        route
    );
});

test('it should handle unexistent parameters', () => {
    new Pointer().add('/users/{id:[0-9]+}').getOrFail('/users/{id:[0-9]+}').resolve();
});

test('resolve(): it should resolve long routes', () => {
    assert.equal(new Pointer()
                .add('/posts/{id:[0-9]+}/comments/{commentId:[a-zA-Z0-9\-]+}')
                .getOrFail('/posts/{id:[0-9]+}/comments/{commentId:[a-zA-Z0-9\-]+}')
                .resolve(
                    new Map().set('commentId', 'PRmcQOTpaP-7092167576').set('id', '230')
                ), '/posts/230/comments/PRmcQOTpaP-7092167576');
});

test('it should resolve param less routes', () => {
    assert.equal(new Pointer().add('/index').getOrFail('/index').resolve(), '/index');
});

test('it should resolve route / param less routes', () => {
    assert.equal(new Pointer().add('/').getOrFail('/').resolve(), '/');
});

test('/users/user-name should return params for route /[a-z\-]/', () => {
    const pointer = new Pointer();
    pointer.add('/users/{name:[a-z\-]+}/{page:[0-9]+}');

    assert.deepEqual(pointer.match('/users/victor-queiroz/10'), {
        route: pointer.getOrFail('/users/{name:[a-z\-]+}/{page:[0-9]+}'),
        originalRoute: '/users/{name:[a-z\-]+}/{page:[0-9]+}',
        params: new Map().set('name', 'victor-queiroz').set('page', '10'),
        path: '/users/victor-queiroz/10'
    });
});

test('it should throw when route is not found', () => {
    assert.throws(() => {
        new Pointer().resolve('/test', new Map());
    }, /Route not found/);
});

test('/[A-z0-9] should not match /', () => {
    assert.equal(new Pointer().add('/{param:[A-z0-9]+}').test('/'), false);
});

test('/books/[0-9] should not match /books/a', () => {
    assert.equal(new Pointer().add('/books/{bookId:[0-9]+}').test('/books/a'), false);
});

test('it should match /books/[0-9] one route from many', () => {
    const pointer = new Pointer()
                    .add('/')
                    .add('/books/{id:[0-9]+}')
                    .add('/posts/{id:[0-9]+}');
    assert.deepEqual(pointer.match('/books/10'), {
        route: pointer.getOrFail('/books/{id:[0-9]+}'),
        originalRoute: '/books/{id:[0-9]+}',
        params: new Map().set('id', '10'),
        path: '/books/10'
    });
});

test('getPathMatches(): it should get path matches', () => {
    const pointer = new Pointer()
                    .add('/')
                    .add('/books/{id:[0-9]+}');
    assert.deepEqual(pointer.getPathMatches('/books/10'), [{
        route: pointer.getOrFail('/books/{id:[0-9]+}'),
        originalRoute: '/books/{id:[0-9]+}',
        params: new Map().set('id', '10'),
        path: '/books/10'
    }]);
});

test('resolve(): it should resolve route with params', () => {
    const pointer = new Pointer().add('/books/{id:[0-9]+}');

    assert.deepEqual(pointer.resolve('/books/{id:[0-9]+}', new Map().set('id', '100')), '/books/100');
});

test('clear(): it should clear routes', () => {
    const pointer = new Pointer().add('/users').add('/').add('/books/{name:[a-zA-Z\-]{1,16}}');
    assert.equal(
        '/books/victor-queiroz',
        pointer.resolve('/books/{name:[a-zA-Z\-]{1,16}}', new Map().set('name', 'victor-queiroz'))
    );
    pointer.clear();
    assert.throws(() => {
        pointer.resolve('/books/{name:[a-zA-Z\-]{1,16}}', new Map().set('name', 'victor-queiroz'));
    }, /Route not found/);
});

test('it should not accept input parameters that does not pass the regular expression test', () => {
    const pointer = new Pointer().add('/users').add('/').add('/books/{name:^[a-zA-Z]{6,12}$}');
    try {
        pointer.resolve(
            '/books/{name:^[a-zA-Z]{6,12}$}',
            new Map().set('name', 'victor-queiroz')
        );
    } catch(reason) {
        assert.equal(reason.message, (
            `Expected "victor-queiroz" to match regular expression /^[a-zA-Z]{6,12}$/ on param "name"`
        ));
    }
    assert.equal('/books/victorq', pointer.resolve(
        '/books/{name:^[a-zA-Z]{6,12}$}',
        new Map().set('name', 'victorq')
    ));
});

export default suite;
