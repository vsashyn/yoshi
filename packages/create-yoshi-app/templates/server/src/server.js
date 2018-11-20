import 'regenerator-runtime/runtime';
import wixExpressCsrf from '@wix/wix-express-csrf';
import wixExpressRequireHttps from '@wix/wix-express-require-https';

module.exports = app => {
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
