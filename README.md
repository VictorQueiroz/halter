# halter ![Travis CI build](https://travis-ci.org/VictorQueiroz/halter.svg?branch=master)

Simple independent JS router

### Usage

First remember to install `history` NPM module of your choice:

```
npm install history
```

Then set up your routes:

```ts
import { createMemoryHistory } from 'history';
import { Router, HistoryBrowser } from 'halter';

async function bootstrap() {
    const router = new Router(createMemoryHistory()).on({
        path: '/',
        callback() {
            // it will be triggered when the browser history match "/"
        }
    });

    // very important to listen to changes on history
    await router.init();

    // Stop listening to changes on history
    router.destroy();
}
```

### Labeled routes

Following an similar approach of Angular UI for Angular 1.x we decided to create labeled routes for convenience, so we can build our app based on labeled routes and not on routes paths it self. For example when you create your `<Link/>` in your React app instead of putting the path to go when the user click the component, you put a convenient label which will match to be the path you need, check the following example:

```ts
import { createBrowserHistory } from 'history';
import { Router } from 'halter';
import PostDetail from './components/PostDetail';
import PostsList from './components/PostsList';
import Link from './components/Link';

const router = new Router(createBrowserHistory()).on({
    name: 'post.detail'
    path: '/posts/{id:[0-9]+}',
    callback: ({ params }) => {
        ReactDOM.render(
            <PostDetail postId={params.get('id')} />,
            document.getElementById('app'));
    }
}).on({
    name: 'post.list',
    path: '/posts/list',
    callback: () => {
        ReactDOM.render(<div>
            <PostsList getContents={posts => posts.map(post => (
                <Link key={post.id} to="post.detail" params={new Map().set('id', 'post.id')}>
                    {post.title}
                </Link>
            ))}
        </div>, document.getElementById('app'));
    }
});

router.pushState('post.detail', new Map().set('id', '1040'));
```

The advantages I see on this approach is that you don't need to keep track of paths itself but the route labels instead. So if you need to change a route path you'll be able to do this without worrying about looking all over through your code searching for that path.

Remember that whenever you don't name your route definitions, it'll be the route path (i.e. if you have /posts/{id:[0-9]+} with no name, the name will automatically be /posts/{id:[0-9]+}).

### Listening to changes

Listening to changes on history API it's pretty simple.

```js
const router = new Router();

router.listen((name, params, query) => (
    console.log('New path is %s, params are %o and query is %o', name, params, query);
));
```
