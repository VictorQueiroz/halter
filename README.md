# halter

Simple JS router with support for HTML5 history

### Usage

```js
import { Router, HistoryBrowser } from 'halter';

async function bootstrap() {
    const router = new Router(new HistoryBrowser(window)).on({
        path: '/',
        callback: () => {
            // it will be triggered when the browser history match "/"
        }
    });

    // very important to listen to changes on history
    await router.init();
}
```

### Support for labeled routes

Following an similar approach of Angular UI for Angular 1.x we decided to create labeled routes for convenience, so we can build our app based on labeled routes and not on routes paths it self. For example when you create your `<Link/>` in your React app instead of putting the path to go when the user click the component, you put a convenient label which will match to be the path you need, check the following example:

```js
import { RouterLabeled, HistoryBrowser } from 'halter';
import PostDetail from './components/PostDetail';
import PostsList from './components/PostsList';
import Link from './components/Link';

const router = new RouterLabeled(new HistoryBrowser).on({
    name: 'post.detail'
    path: '/posts/{id:[0-9]+}',
    callback: ({ params: { id } }) => {
        ReactDOM.render(
            <PostDetail postId={id} />,
            document.getElementById('app'));
    }
})
.on({
    name: 'post.list',
    path: '/posts/list',
    callback: () => {
        ReactDOM.render(<div>
            <PostsList getContents={posts => posts.map(post => (
                <Link key={post.id} to="post.detail" params={{ id: post.id }}>
                    {post.title}
                </Link>
            ))}
        </div>, document.getElementById('app'));
    }
});

router.pushStateByLabel({}, '', 'post.detail', {
    id: '1040'
});
```

The advantages I see on this approach is that you don't need to keep track of paths itself but the route labels instead. So if you need to change a route path you'll be able to do this without worrying about looking all over through your code searching for that path.

### Listening to changes

Listening to changes on history API it's pretty simple.

```js
const router = new Router();

router.listen(newPath => (
    console.log('New path is %s', newPath);
));
```

But you need to make sure that all changes is going through `Router` instance, for example:

```js
router.pushState({}, 'Page Title 1', '/');
router.replaceState({}, 'Page Title 2', '/login');
```

### Usage with ReactJS

We left a simple component just for convenient usage with React. Not fully tested yet. Here's how you use it, following the React Router v2 approach because I like it best:

The `RouterView` component life cycle will determine what routes should be inside the given `Router` instance using the input `routes`. When `RouterView` is mounted it'll initialize the router instance and when it gets unmounted it'll clear all the routes and so forth

```js
import RouterView from 'halter/lib/ui/react/router-view';
import { HistoryBrowser, Router } from 'halter';
import Login from './components/login/login';
import NavigationBar from './components/navigation-bar/navigation-bar';
import BackendAPI from './services/backend-api';

function Post({ location: { params: { id: postId } } }) {
    return (
        <div>
            <h3>{posts[postId].title}</h3>
            <p>{posts[postId].contents}</p>
        </div>
    );
}

function HomeWrapper({ children }){
    return (
        <div>
            <NavigationBar/>
            <div>
                {children}
            </div>
        </div>
    )
}

const rules = {
    isAuthenticated: async function(match, replaceState, pushState) {
        if(await BackendAPI.isAuthenticated()){
            replaceState({}, null, '/dashboard');
            return true;
        }
    },
    isGuest: async function(match, replaceState, pushState) {
        if(await BackendAPI.isAuthenticated()){
            return true;
        }
        replaceState({}, null, '/login');
    }
}

const routes = [{
    path: '/',
    component: HomeWrapper,
    childRoutes: [{
        path: 'posts/{id:[A-z0-9]+}',
        component: Post
    }, {
        path: 'login',
        component: Login,
        onBefore: rules.isAuthenticated
    }]
}, {
    path: '/dashboard',
    component: Dashboard,
    onBefore: rules.isGuest
}];

ReactDOM.render(<div>
    <h1>My first app</h1>
    <RouterView
        router={new Router(new HistoryBrowser(window))}
        routes={routes}
    />
</div>, document.getElementById('app'));
```

It also has support for *labeled routes*, you just need to add `name` param in each child route and it wil be reduced to `parent.parent.childroute`. If you need examples, check our test cases at test/react-test.js
