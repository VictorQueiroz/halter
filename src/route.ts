interface IPoint {
    start: number;
    end: number;
}

export class Character {
    public static ParamStart = 123; // {
    public static ParamEnd = 125; // }
    public static ParamNameSeparator = 58; // :
}

/**
 * Format URL values in a standard way:
 *     - /a/b/c/d///d/e/f/ to /a/b/c/d/d/e/f/
 *     - users/ to /users
 *     - /users/ to /users
 *     - users to /users
 * @param value 
 */
export function sanitize(value: string) {
    return value.replace(/\/{1,}/,'/').replace(/\/?$/, '').replace(/^\/?/,'/');
}

export interface IRouteParam {
    name: string;
    /**
     * Distance between `position.end` and `position.start`
     */
    length: number;
    position: IPoint;
    matcher: RegExp;
    /**
     * Match the contents from the end of the last param
     * until the start of the current one. If this is the first param,
     * then it'll be the contents until the start of this param.
     */
    contentsMatcher: (value: string) => boolean;
}

export default class Route {
    private readonly view: Buffer;
    private readonly params = new Map<number, IRouteParam>();
    public readonly original: string;
    private offset = 0;
    public constructor(original: string) {
        this.original = original;
        this.view = Buffer.from(sanitize(this.original), 'utf8');
        this.read();
    }
    public resolve(params?: Map<string, string>): string | undefined {
        if(!this.params.size) return this.original;
        let delta = 0;
        let final: string | undefined = '';
        let lastOffset = 0;
        for(const p of this.params.values()) {
            if(!params) return undefined;
            const value = params.get(p.name);
            if(typeof value === 'undefined') return undefined;
            final += this.original.substring(
                lastOffset,
                p.position.start
            ) + value;
            lastOffset = p.position.end + delta;
            delta += (p.length - value.length);
        }
        return final;
    }
    public parse(value: string): Map<string, string> | undefined {
        value = sanitize(value);
        let delta = 0;
        const values = new Map<string, string>();
        const list = Array.from(this.params);
        let i: number;
        if(!list.length) {
            if(this.original !== value) return undefined;
            return values;
        }
        for(i = 0; i < list.length; i++) {
            const [start, p] = list[i];
            const n = value.substring(start - delta);
            if(i === 0) {
                if(!p.contentsMatcher(value)) return undefined;
            } else {
                const previousParam = list[i - 1];
                const n1 = value.substring(
                    previousParam[1].position.end - delta,
                    start
                );
                if(!p.contentsMatcher(n1)) return undefined;
            }
            const matches = n.match(p.matcher);
            if(!matches || !matches.length) return undefined;
            delta += (p.length - matches[0].length);
            values.set(p.name, matches[0]);
        }
        if((delta + value.length) !== this.original.length) {
            return undefined;
        }
        return values;
    }
    private read() {
        while(!this.eof()) {
            if(this.view[this.offset] === Character.ParamStart) { // {
                this.params.set(this.offset, this.readParam());
            } else {
                this.offset++;
            }
        }
    }
    private expect(ch: number) {
        if(this.view[this.offset] !== ch) {
            throw new Error(
                `Expected ${String.fromCharCode(ch)} but got ${String.fromCharCode(this.view[this.offset])} at offset ${this.offset}: ${this.original}`
            );
        }
        this.offset++;
    }
    private consume(ch: number) {
        if(this.view[this.offset] === ch) {
            this.offset++;
            return true;
        }
        return false;
    }
    private peek(c1: number) {
        return this.view[this.offset] === c1;
    }
    private readParam(): IRouteParam {
        const {offset: start} = this;
        this.expect(Character.ParamStart);
        let paramName = '';
        while(!this.eof() && !this.peek(Character.ParamNameSeparator)) {
            paramName += String.fromCharCode(this.view[this.offset++]);
        }
        let regExpStr = '';
        if(this.consume(Character.ParamNameSeparator)) {
            while(!this.eof() && !this.consume(Character.ParamEnd)) {
                regExpStr += String.fromCharCode(this.view[this.offset++]);
            }
        } else {
            regExpStr = '[0-9a-zA-Z\_\-]+';
        }
        let contentsMatcher: (value: string) => boolean;
        if(this.params.size === 0) {
            const b = this.original.substring(
                0,
                start
            );
            contentsMatcher = a => a.startsWith(b);
        } else {
            const list = Array.from(this.params);
            const prevParam = list[list.length - 1];
            const b = this.original.substring(
                prevParam[1].position.end,
                start
            );
            contentsMatcher = a => a.startsWith(b);
        }
        return {
            matcher: new RegExp(`^${regExpStr}`),
            position: {
                start,
                end: this.offset
            },
            length: this.offset - start,
            name: paramName,
            contentsMatcher
        };
    }
    private eof() {
        return this.offset === this.view.byteLength;
    }
}
