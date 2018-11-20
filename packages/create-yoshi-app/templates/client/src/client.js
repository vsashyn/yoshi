import React from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { I18nextProvider } from 'react-i18next';
import { wixAxiosConfig } from '@wix/wix-axios-config';
import App from './components/App';
import i18n from './i18n';

const locale = window.__LOCALE__;
const baseURL = window.__BASEURL__;

wixAxiosConfig(axios, { baseURL });

ReactDOM.render(
  <I18nextProvider i18n={i18n(locale)}>
    <App />
  </I18nextProvider>,
  document.getElementById('root'),
);
