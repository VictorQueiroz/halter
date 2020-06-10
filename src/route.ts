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
    return value.replace(/\/{1,}/g,'/').replace(/\/?$/, '').replace(/^\/?/,'/');
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
     * Content used in `contentsMatcher`
     */
    previousContents: string;
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
    public getParams(): ReadonlyMap<number, IRouteParam> {
        return this.params;
    }
    public resolve(params?: Map<string, string>): string | undefined {
        if(!this.params.size) return this.original;
        let final = '';
        const list = Array.from(this.params.values());
        const lastParam = list[list.length - 1];
        /**
         * Difference between param value length and
         * original param expression (i.e. /users/{userId} vs. /users/100)
         */
        let delta = 0;
        for(const p of list) {
            const value = params?.get(p.name) || '';
            if(!p.matcher.test(value)) return undefined;
            final += p.previousContents;
            final += value;
            delta += p.length - value.length;
            if(p === lastParam) {
                final += this.original.substring(
                    final.length + delta
                );
            }
        }
        return sanitize(final);
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
        let nextSlash: number;
        for(i = 0; i < list.length; i++) {
            const [start, p] = list[i];
            /**
             * Current offset we're checking
             */
            const offset = start - delta;
            /**
             * Get next slash index or end of string
             */
            nextSlash = value.indexOf('/', offset);
            if(nextSlash === -1) {
                nextSlash = value.length;
            }
            const n = value.substring(offset, nextSlash);
            /**
             * Check if next slash is pointing to next param slash
            if(i !== (list.length - 1)) {
                const nextParam = list[i + 1];
                console.log(
                    n,
                    nextParam,
                    p
                )
            }
             */
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

            /**
             * If this is the last param, then we're sure there's no more regular expression
             * on the way. Then we need to make sure the rest of the route matches exactly
             * the original route.
             */
            if(i === (list.length - 1)) {
                if(value.substring(p.position.end - delta) !== this.original.substring(p.position.end)) {
                    return undefined;
                }
            }
        }
        /**
         * Here we make sure we went through the whole provided value
         */
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
    private readQuantifierExpression(): string {
        if(this.consume(123)) {
            let quantifier = '{';
            while(!this.eof() && !this.consume(125)) {
                quantifier += this.readQuantifierExpression();
            }
            return quantifier + '}';
        }
        return String.fromCharCode(this.view[this.offset++]);
    }
    private readRegExp(): string {
        let regExpStr = '';
        while(!this.eof() && !this.peek(Character.ParamEnd)) {
            regExpStr += this.readQuantifierExpression();
        }
        return regExpStr;
    }
    private readParam(): IRouteParam {
        const {offset: start} = this;
        this.expect(Character.ParamStart);
        let paramName = '';
        while(!this.eof() && !this.peek(Character.ParamEnd) && !this.peek(Character.ParamNameSeparator)) {
            paramName += String.fromCharCode(this.view[this.offset++]);
        }

        let regExpStr: string;
        if(this.consume(Character.ParamNameSeparator)) {
            regExpStr = this.readRegExp();
        } else {
            regExpStr = '[0-9a-zA-Z\_\-]+';
        }

        this.expect(Character.ParamEnd);
    
        let previousContents: string;
        if(this.params.size === 0) {
            previousContents = this.original.substring(
                0,
                start
            );
        } else {
            const list = Array.from(this.params);
            const prevParam = list[list.length - 1];
            previousContents = this.original.substring(
                prevParam[1].position.end,
                start
            );
        }
        return {
            matcher: new RegExp(`^${regExpStr}$`),
            position: {
                start,
                end: this.offset
            },
            previousContents,
            length: this.offset - start,
            name: paramName,
            contentsMatcher: a => a.startsWith(previousContents)
        };
    }
    private eof() {
        return this.offset === this.view.byteLength;
    }
}
