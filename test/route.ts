import {Suite} from 'sarg';
import Route, {sanitize} from '../src/route';
import {expect} from 'chai';

const suite = new Suite();

suite.test('Route#resolve: it should resolve route string params', () => {
    const route = new Route(
        '/users/{userId:[0-9]+}/query/{query:[a-zA-Z]+}'
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

suite.test('it should sanitize URL', () => {
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
