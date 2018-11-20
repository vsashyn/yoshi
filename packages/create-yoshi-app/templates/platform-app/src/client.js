import React from 'react';
import ReactDOM from 'react-dom';
import { I18nextProvider } from 'react-i18next';
import App from './components/App';
import i18n from './i18n';
import { ViewerScriptWrapper } from '@wix/native-components-infra';
import viewerScript from './platform/viewerScript';

const locale = window.__LOCALE__;

const WrappedApp = ViewerScriptWrapper(App, { viewerScript });

ReactDOM.render(
  <I18nextProvider i18n={i18n(locale)}>
    <WrappedApp />
  </I18nextProvider>,
  document.getElementById('root'),
);
