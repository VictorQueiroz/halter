import assert from 'assert';
import Pointer from '../src/pointer';

exports['getSlicesFromPath(): it should get slices from path'] = function() {
    assert.deepEqual(new Pointer().getSlicesFromPath('/'), ['/']);
    assert.deepEqual(new Pointer().getSlicesFromPath('/user/{id:[0-9]+}'), ['/user', '/{id:[0-9]+}']);
};

exports['getSlicesFromPath(): it should accept non absolute path'] = function() {
    assert.deepEqual(new Pointer().getSlicesFromPath('user/{id:[0-9]+}'), ['user', '/{id:[0-9]+}']);
};

exports['/ should match /'] = function() {
    assert(new Pointer()
                .add('/')
                .test('/'));
};

exports['/users/user-name should match param name only'] = function() {
    assert(new Pointer()
            .add('/users/{id}')
            .test('/users/user-name'));
};

exports['/users/user-name should match [a-z\-]+'] = function(){
    assert(new Pointer()
                .add('/users/{id:[a-z\-]+}')
                .test('/users/user-name'));
};

exports['it should resolve route params'] = function() {
    assert.equal(new Pointer()
            .add('/users/{id:[0-9]+}')
            .get('/users/{id:[0-9]+}')
            .resolve({
                id: '100'
            }), '/users/100');
};

exports['resolve(): it should throw for not found params'] = function() {
    assert.throws(function() {
        new Pointer()
            .add('/users/{id:[0-9]+}')
            .get('/users/{id:[0-9]+}')
            .resolve({});
    }, /Missing param name \"id\"/);
};

exports['it should match /posts/{postId:[0-9]+}/comments/{commentId:[0-9]+}/lines/{lineId:[0-9]+}'] = function() {
    const pointer = new Pointer().add('/posts/{postId:[0-9]+}/comments/{commentId:[0-9]+}/lines/{lineId:[0-9]+}');

    assert(pointer.test('/posts/1/comments/2/lines/3'));
    assert(pointer.test('/posts/0/comments/0/lines/0'));
    assert.equal(pointer.test('/posts/1/comments/2/lines/a'), false);
    assert.equal(pointer.test('/posts/1/comments/a/lines/0'), false);
    assert.equal(pointer.test('/posts/a/comments/2/lines/3'), false);
};

exports['it should not allow repeated routes'] = function() {
    assert.throws(function() {
        new Pointer().add('/{id:[0-9]+}/{id:[0-9]+');
    }, /Found repeated param \"id\"/);
};

exports['resolve(): it should resolve long routes'] = function() {
    assert.equal(new Pointer()
                .add('/posts/{id:[0-9]+}/comments/{commentId:[A-f0-9\-]+}')
                .get('/posts/{id:[0-9]+}/comments/{commentId:[A-f0-9\-]+}')
                .resolve({
                    id: '230',
                    commentId: 'PRmcQOTpaP-7092167576'
                }), '/posts/230/comments/PRmcQOTpaP-7092167576');
};

exports['it should resolve param less routes'] = function() {
    assert.equal(new Pointer().add('/index').get('/index').resolve(), '/index');
};

exports['it should resolve route / param less routes'] = function() {
    assert.equal(new Pointer().add('/').get('/').resolve(), '/');
};

exports['/users/user-name should return params for route /[a-z\-]/'] = function() {
    const pointer = new Pointer();
    pointer.add('/users/{name:[a-z\-]+}/{page:[0-9]+}');

    assert.deepEqual(pointer.match('/users/victor-queiroz/10'), {
        path: '/users/victor-queiroz/10',
        params: {
            name: 'victor-queiroz',
            page: '10'
        },
        originalRoute: '/users/{name:[a-z\-]+}/{page:[0-9]+}'
    });
};

exports['/[A-z0-9] should not match /'] = function() {
    assert.equal(new Pointer().add('/{param:[A-z0-9]+}').test('/'), false);
};

exports['/books/[0-9] should not match /books/a'] = function() {
    assert.equal(new Pointer().add('/books/{bookId:[0-9]+}').test('/books/a'), false);
};

exports['it should match /books/[0-9] one route from many'] = function() {
    const pointer = new Pointer()
                    .add('/')
                    .add('/books/{id:[0-9]+}')
                    .add('/posts/{id:[0-9]+}');
    assert.deepEqual(pointer.match('/books/10'), {
        path: '/books/10',
        params: {
            id: '10'
        },
        originalRoute: '/books/{id:[0-9]+}'
    });
};

exports['getPathMatches(): it should get path matches'] = function() {
    const pointer = new Pointer()
                    .add('/')
                    .add('/books/{id:[0-9]+}');
    assert.deepEqual(pointer.getPathMatches('/books/10'), [{
        path: '/books/10',
        params: {
            id: '10'
        },
        originalRoute: '/books/{id:[0-9]+}'
    }]);
};

exports['resolve(): it should resolve route with params'] = function(){
    const pointer = new Pointer().add('/books/{id:[0-9]+}');

    assert.deepEqual(pointer.resolve('/books/{id:[0-9]+}', {
        id: 100
    }), '/books/100');
};
