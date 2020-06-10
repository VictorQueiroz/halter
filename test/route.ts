import {Suite} from 'sarg';
import Route, {sanitize} from '../src/route';
import {expect} from 'chai';

const suite = new Suite();

suite.test('Route#resolve: it should resolve route string params', () => {
    const route = new Route(
        '/users/{userId:[0-9]+}/query/{query:[a-zA-Z\_]+}'
    );
    const params = (
        new Map<string, string>()
            .set('userId', '1')
            .set('query', 'nice_search_string')
    );
    expect(new Route('/users').resolve()).to.be.equal('/users');
    expect(route.resolve(params)).to.be.equal(
        '/users/1/query/nice_search_string'
    );
});

suite.test('Route#resolve: it should not resolve if param do not match the regex', () => {
    expect(new Route('/users/{userId:[0-9]+}').resolve(new Map([
        ['userId', 'a']
    ]))).to.be.equal(undefined);
});

suite.test('it should sanitize URL', () => {
    expect(sanitize('/a/b//c/d//e/')).to.be.equal('/a/b/c/d/e');
    expect(sanitize('/users/')).to.be.equal('/users');
    expect(sanitize('users/')).to.be.equal('/users');
    expect(sanitize('users')).to.be.equal('/users');
    expect(sanitize('users//a/b/c/e/')).to.be.equal('/users/a/b/c/e');
});

suite.test('Route#parse: it should match routes where param have a value that should not be matched by the regular expression', () => {
    expect(new Route('/users/{userId:[0-9]+}').parse('/users/a')).to.be.equal(undefined);
    expect(new Route('/users/{userId:[a-z\_]+}').parse('/users/this_is_nice_A')).to.be.equal(undefined);
    expect(new Route('/users/{userId:[a-z]+}').parse('/users/0')).to.be.equal(undefined);
    expect(new Route('/users/{userId:[0-9]+}').parse('/users/a')).to.be.equal(undefined);
    expect(new Route('/users/{userId:[0-9]+}/').parse('/users/a/')).to.be.equal(undefined);
});

suite.test('Route: it should throw for unclosed params', () => {
    expect(() => new Route('/users/{userId')).to.throw(/Expected \}/);
});

suite.test('Route#resolve: it should resolve routes from params', () => {
    const route = new Route('/r/{topicId:[0-9]+}/{categoryType:[a-z]{1}}/{postId:[a-f0-9]+}');
    expect(route.resolve(
        new Map([
            ['categoryType', 'g'],
            ['postId', '100'],
            ['topicId', '6'],
        ])
    )).to.be.equal('/r/6/g/100');
    expect(route.resolve(
        new Map([
            ['categoryType', 'aa'],
            ['postId', '100'],
            ['topicId', '6'],
        ])
    )).to.be.equal(undefined);
    expect(route.resolve(
        new Map([
            ['categoryType', '*'],
            ['postId', '100'],
            ['topicId', '6'],
        ])
    )).to.be.equal(undefined);
});

suite.test('Route#parse', () => {
    expect(new Route(
        '/o/{organizationId:[0-9]+}/administration/members'
    ).parse('/o/6/g{peerId:[a-f0-9]+}364')).to.be.equal(undefined);
});

suite.test('Route#resolve: it should resolve routes that do not end with param', () => {
    expect(new Route('/users/{userId}/comments').resolve(
        new Map([
            ['userId', '100']
        ])
    )).to.be.equal('/users/100/comments');
    expect(new Route('/users/{userId}/comments').resolve(
        new Map([
            ['userId', '10000000']
        ])
    )).to.be.equal('/users/10000000/comments');
    expect(new Route('/users/{userId:[0-9]+}/comments').resolve(
        new Map([
            ['userId', '10000000']
        ])
    )).to.be.equal('/users/10000000/comments');

    expect(new Route('/users/{userId:[0-9]+}/comments/{commentId:[0-9]+}/author').resolve(
        new Map([
            ['userId', '10000000'],
            ['commentId', '200000000000'],
        ])
    )).to.be.equal('/users/10000000/comments/200000000000/author');
});

suite.test('Route#resolve: it should resolve optional parameters', () => {
    const route1 = new Route('/tabs/{tabId:([a-z]+)?}');
    expect(route1.resolve()).to.be.equal('/tabs');
    expect(route1.resolve(new Map([
        ['tabId', '100']
    ]))).to.be.equal(undefined);
    expect(route1.resolve(new Map([
        ['tabId', 'settings']
    ]))).to.be.equal('/tabs/settings');

    const route2 = new Route('/tabs/{tabId:([a-z]+)?}/sorted-by/{sortBy:(created_at|modified_at){1}}');
    expect(route2.parse('/tabs/settings/sorted-by/modified_at')).to.be.deep.equal(new Map([
        ['tabId', 'settings'],
        ['sortBy', 'modified_at']
    ]));
    // expect(route2.parse('/tabs/sorted-by/modified_at')).to.be.deep.equal(new Map([
    //     ['sortBy', 'modified_at']
    // ]));
    // console.log(route2.resolve(new Map([
    //     ['sortBy', 'created_at']
    // ])))
    // throw 1;
});

suite.test('Route#resolve: it should resolve routes with deep a-z params', () => {
    expect(new Route(
        '/users/{alias:[a-zA-Z\-]+}/{id:[a-z0-9]+}/comments/{commentId:[a-z0-9]+}'
    ).parse('/users/user-name-here/543c05e8b4fb87d9/comments/2d1c0405d4b3b279')).to.be.deep.equal(new Map([
        ['alias', 'user-name-here'],
        ['id', '543c05e8b4fb87d9'],
        ['commentId', '2d1c0405d4b3b279']
    ]));
});

suite.test('Route#resolve: it should resolve routes with deep quantifiers', () => {
    const route1 = new Route('/{prefix:([0-9]{1,2}[a-z]{0,3}){1,2}}');
    const values = [
        '3hz26g',
        '0ai',
        '94tbk83g',
        '85hs90hoh'
    ];
    expect(route1.resolve(new Map([
        ['prefix','xx']
    ]))).to.be.equal(undefined);
    for(const v of values) {
        expect(route1.resolve(new Map([
            ['prefix', v]
        ]))).to.be.equal(`/${v}`);
    }
    expect(route1.resolve(new Map([
        ['prefix','']
    ]))).to.be.equal(undefined);
});

suite.test('Route#parse: it should parse route with no params', () => {
    expect(new Route('/a/b/c/d/e/0').parse('/a/b/x/d/e')).to.be.deep.equal(undefined);
    expect(new Route('/a/b/c/d/f/0').parse('/a/b/c/d/e')).to.be.deep.equal(undefined);
    expect(new Route('/a/b/c/d/f/0').parse('/a/b/c/d/e')).to.be.deep.equal(undefined);
    expect(new Route('/a/b/c/d/e/0').parse('/a/b/c/d/e/0')).to.be.deep.equal(new Map());
    expect(new Route('/posts').parse('/books')).to.be.equal(undefined);
    expect(new Route('/users').parse('/books')).to.be.equal(undefined);
    expect(new Route('/users').parse('/users')).to.be.deep.equal(new Map());
    expect(new Route('/users').parse('/users')).to.be.deep.equal(new Map());
});

suite.test('Route#parse: it should not parse different routes with same name', () => {
    expect(
        new Route('/users/{userId:[0-9]+}').parse('/books/100')
    ).to.be.equal(undefined);
    expect(
        new Route('/users/{userId:[0-9]+}/comments/{commentId:[0-9]+}').parse('/users/100/xxxxxxxx/20')
    ).to.be.equal(undefined);
});

suite.test('Route#parse: it should match params', () => {
    const route = new Route('/users/{userId:[0-9]+}/comments/{commentId:[0-9]+}');
    expect(route.parse('/users/200000000000000/comments/10000000')).to.be.deep.equal(new Map<string, string>([
        ['userId','200000000000000'],
        ['commentId','10000000']
    ]));
    expect(route.parse('/users/1/comments/2')).to.be.deep.equal(new Map<string, string>([
        ['userId','1'],
        ['commentId','2']
    ]));
});

export default suite;
