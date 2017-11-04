import Router from '../src/router';
import RouterLabeled from '../src/router-labeled';
import HistoryFake from './history-fake';
import RouterView from '../src/ui/react/router-view';
import Adapter from 'enzyme-adapter-react-16';
import Enzyme, { shallow } from 'enzyme';
import assert from 'assert';
import sinon from 'sinon';
import {
    AppWrapper,
    Home,
    Book,
    Admin,
    SpecialWrapper,
    Login,
    HomeWrapper
} from './react-components';

Enzyme.configure({
    adapter: new Adapter
});

const books = {
    '1': {
        title: 'Book 1'
    }
};

function wait() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

exports['it should render index when /'] = async function() {
    const wrapper = shallow(<RouterView
        router={new Router(new HistoryFake())}
        routes={[{
            path: '/',
            component: Home
        }]}
    />);

    await wrapper.instance()._initPromise;

    assert(wrapper.update().first().equals(
        <Home location={{
            path: '/',
            originalRoute: '/',
            params: {}
        }}/>
    ));
};

exports['it should render /books/100'] = async function() {
    const router = new Router(new HistoryFake());

    const wrapper = shallow(<RouterView
        router={router}
        routes={[{
            path: '/books/{id:[0-9]+}',
            component: Book
        }]}
    />);

    await router.pushState({}, '', '/books/100');

    assert(wrapper.update().first().equals(
        <Book
            location={{
                path: '/books/100',
                originalRoute: '/books/{id:[0-9]+}',
                params: {
                    id: '100'
                }
            }}
        />
    ));
};

function redirect(getNextPath){
    return async function(match, replaceState, pushState) {
        replaceState({}, '', getNextPath(match));
    };
}

exports['it should redirect using onBefore() and replace state option'] = async function() {
    const router = new Router(new HistoryFake());

    const wrapper = shallow(<RouterView
        router={router}
        routes={[{
            path: '/books/{id:[0-9]+}',
            component: Book,
            onBefore: redirect(match => '/b/' + match.params.id)
        }, {
            path: '/b/{id:[0-9]+}',
            component: Book
        }]}
    />);

    await router.pushState({}, '', '/books/100');

    assert(wrapper.update().first().equals(
        <Book
            location={{
                originalRoute: '/b/{id:[0-9]+}',
                path: '/b/100',
                params: {
                    id: '100'
                }
            }}
        />
    ));
};

exports['it should support nested routes /admin/books/100'] = async function() {
    const router = new Router(new HistoryFake());

    const routes = [{
        path: '/admin',
        component: AppWrapper,
        childRoutes: [{
            path: 'books/{id:[0-9]+}',
            component: Book
        }]
    }];
    const wrapper = shallow(<RouterView
        router={router}
        routes={routes}
    />);

    await Promise.all([
        router.pushState({}, '', '/admin/books/100'),
        wrapper.instance()._initPromise
    ]);

    const location = {
        originalRoute: '/admin/books/{id:[0-9]+}',
        path: '/admin/books/100',
        params: {
            id: '100'
        }
    };

    assert(wrapper.update().first().equals(
        <AppWrapper location={location}>
            <Book location={location}/>
        </AppWrapper>
    ));
};

exports['it should support labeled routes approach'] = async function() {
    const router = new RouterLabeled(new HistoryFake);
    const wrapper = shallow(<RouterView
        router={router}
        routes={[{
            path: '/',
            name: 'app',
            component: AppWrapper,
            childRoutes: [{
                name: 'index',
                component: Home
            }, {
                name: 'admin',
                path: 'admin',
                component: Admin
            }]
        }]}
    />);

    await wrapper.instance()._initPromise;

    assert(wrapper.update().equals(<AppWrapper location={{originalRoute: '/', path: '/', params:{}}}>
        <Home location={{originalRoute: '/', path: '/', params:{}}}/>
    </AppWrapper>));

    await router.pushStateByLabel({}, '', 'app.admin');

    assert(wrapper.update().equals(<AppWrapper location={{originalRoute: '/admin', path: '/admin', params:{}}}>
        <Admin location={{originalRoute: '/admin', path: '/admin', params:{}}} />
    </AppWrapper>));

    await router.pushStateByLabel({}, '', 'app.index');
    await wait();

    assert(wrapper.update().equals(<AppWrapper location={{originalRoute: '/', path: '/', params:{}}}>
        <Home location={{originalRoute: '/', path: '/', params:{}}}/>
    </AppWrapper>));
};

exports['it should render special parent for particular sets of routes'] = async function() {
    const router = new Router(new HistoryFake);
    const wrapper = shallow(<RouterView
        router={router}
        routes={[{
            path: '/',
            childRoutes: [{
                component: AppWrapper,
                childRoutes: [{
                    component: Home
                }]
            }, {
                component: SpecialWrapper,
                childRoutes: [{
                    path: 'login',
                    component: Login
                }]
            }]
        }]}
    />);

    await wait();

    const location1 = {
        path: '/',
        originalRoute: '/',
        params: {}
    };

    assert(wrapper.update().first().equals(<AppWrapper location={location1}>
        <Home location={location1}/>
    </AppWrapper>));

    await router.pushState(null, null, '/login');

    const location2 = {
        path: '/login',
        originalRoute: '/login',
        params: {}
    };

    assert(wrapper.update().first().equals(<SpecialWrapper location={location2}>
        <Login location={location2} />
    </SpecialWrapper>));
};

exports['it should execute all nested routes `onBefore` functions in the right order'] = async function() {
    const router = new Router(new HistoryFake);

    const indexCallback = sinon.spy();
    const appWrapperCallback = sinon.spy();
    const homeCallback = sinon.spy();

    const wrapper = shallow(<RouterView
        router={router}
        routes={[{
            path: '/',
            onBefore: indexCallback,
            childRoutes: [{
                component: AppWrapper,
                onBefore: appWrapperCallback,
                childRoutes: [{
                    component: Home,
                    onBefore: homeCallback
                }]
            }]
        }]}
    />);

    await wait();

    const argument = {
        path: '/',
        originalRoute: '/',
        params: {}
    };

    assert(indexCallback.calledWith(argument));
    assert(appWrapperCallback.calledWith(argument));
    assert(homeCallback.calledWith(argument));
};

exports['it should support deep nested routes'] = async function() {
    const router = new Router(new HistoryFake);
    const wrapper = shallow(<RouterView
        router={router}
        routes={[{
            path: '/',
            childRoutes: [{
                component: AppWrapper,
                path: 'app',
                childRoutes: [{
                    component: HomeWrapper,
                    childRoutes: [{
                        path: 'home',
                        component: Home
                    }]
                }]
            }]
        }]}
    />);

    await Promise.all([
        wrapper.instance()._initPromise,
        router.pushState(null, null, '/app/home')
    ]);

    const location = {
        path: '/app/home',
        originalRoute: '/app/home',
        params: {}
    };

    assert(wrapper.update().first().equals(
        <AppWrapper location={location}>
            <HomeWrapper location={location}>
                <Home location={location} />
            </HomeWrapper>
        </AppWrapper>
    ));
};
