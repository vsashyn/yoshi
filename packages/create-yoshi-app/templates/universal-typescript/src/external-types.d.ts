
/// <reference types="react" />
/// <reference types="react-dom" />

declare module '*.svg' {
  import * as React from 'react';

  export const ReactComponent: React.SFC<React.SVGProps<SVGSVGElement>>;

  const src: string;
  export default src;
}

declare module 'wix-run-mode';
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
