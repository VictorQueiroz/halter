export function Home() {
    return <div>
        Home
    </div>;
}

export function Book({ location: { params: { id } } }) {
    return <div>
        Book id is "{id}"
    </div>;
}

export function Post({ location: { params: { id } } }) {
    return <div>
        {`Post id is "${id}"`}
    </div>;
}

export function Admin(){
    return (
        <div>
            Welcome to the admin panel!
        </div>
    );
}

export function AppWrapper({ children }){
    return (
        <div>
            {children}
        </div>
    );
}

export function SpecialWrapper({ children }) {
    return (
        <div>
            <h1>This is a special wrapper</h1>
            <div>
                {children}
            </div>
        </div>
    );
}

export function HomeWrapper({ children }) {
    return (
        <div>
            This is the home wrapper
            {children}
        </div>
    );
}

export function Login() {
    return (
        <div>
            Login
            <form action="login.php">
                <input type="text" placeholder="Password" />
            </form>
        </div>
    );
}
