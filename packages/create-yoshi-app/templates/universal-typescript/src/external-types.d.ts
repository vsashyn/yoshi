declare module '@wix/wix-run-mode';
declare module 'serialize-javascript';
declare module '*.scss';
declare module '*.json';
declare var browser: any;

interface Window {
  __INITIAL_I18N__: any;
  __LOCALE__: string;
  __BASEURL__: string;
}

declare module NodeJS {
  interface Global {
    browser: any;
  }
}
