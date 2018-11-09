import EventEmitter from 'events';

abstract class HistoryBase extends EventEmitter {
    public abstract init(): void;
    public abstract destroy(): void;
    public abstract getAbsolutePath(): string;
    public abstract getSearch(): string;
    public abstract pushState(state: any, title: string | undefined, path: string): void;
    public abstract replaceState(state: any, title: string | undefined, path: string): void;
}

export default HistoryBase;
