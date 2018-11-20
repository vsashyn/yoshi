import { Router } from 'express';
import * as wixExpressCsrf from '@wix/wix-express-csrf';
import * as wixExpressRequireHttps from '@wix/wix-express-require-https';

module.exports = (app: Router) => {
  app.use(wixExpressCsrf());
  app.use(wixExpressRequireHttps);

  app.get('/', (req, res) => {
    res.json({
      success: true,
      payload: 'Hello world!',
    });
  });

  return app;
};
