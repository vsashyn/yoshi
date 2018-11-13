/// <reference types="react" />
/// <reference types="react-dom" />

declare module '*.scss';
declare module '*.json';

declare module '*.svg' {
  import * as React from 'react';

  export const ReactComponent: React.SFC<React.SVGProps<SVGSVGElement>>;

  const src: string;
  export default src;
}

declare module 'react-module-container' {
  import * as React from 'react';
  import {PageComponentId} from '@wix/business-manager-api';
  export interface ReactLazyComponentOptions {
    files: string[];
    component: string;
    unloadStylesOnDestroy?: boolean;
    resolve?(): Promise<any>;
  }
  export class ReactLazyComponent<P, S = {}> extends React.Component<P, S> {}
  export const ModuleRegistry: {
    registerComponent(pageComponentId: PageComponentId, componentFactory: () => any): void;
    invoke(eventName: string, payload: any): void;
    component(name: string): typeof React.Component;
    addListener(eventName: string, callback: (payload: any) => void): { remove(): void };
    notifyListeners(eventName: string, viewID: string): void;
  };
}
