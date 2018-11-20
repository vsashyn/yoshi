import axios from 'axios';
import React from 'react';
import PropTypes from 'prop-types';
import { I18nextProvider } from 'react-i18next';
import { ModuleRegistry } from 'react-module-container';
import { create } from '@wix/fedops-logger';
import { wixAxiosConfig } from '@wix/wix-axios-config';
import { COMPONENT_ID, BI_VIEW_ID, LAZY_COMPONENT_ID } from './config';
import i18n from './i18n';
import App from './components/App';

wixAxiosConfig(axios, {
  baseURL: '/',
});

class AppContainer extends React.Component {
  static propTypes = {
    locale: PropTypes.string,
    config: PropTypes.object,
  };

  constructor(props) {
    super(props);
    ModuleRegistry.notifyListeners(
      'businessManager.viewStartLoading',
      BI_VIEW_ID,
    );
  }

  componentDidMount() {
    // Note: you might want to invoke notify after initial data fetch (to keep BM loader during fetch)
    ModuleRegistry.notifyListeners(
      'businessManager.viewFinishedLoading',
      BI_VIEW_ID,
    );
    const fedopsLogger = create(LAZY_COMPONENT_ID);
    fedopsLogger.appLoaded();
  }

  render() {
    const { locale, config } = this.props;
    return (
      <I18nextProvider
        i18n={i18n({ locale, baseUrl: config.topology.staticsUrl })}
      >
        <App />
      </I18nextProvider>
    );
  }
}

ModuleRegistry.registerComponent(COMPONENT_ID, () => AppContainer);
