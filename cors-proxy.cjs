const cors_proxy = require('cors-anywhere');
cors_proxy.createServer({ originWhitelist: [], requireHeader: [], removeHeaders: [] })
  .listen(8080, 'localhost', () => {
    console.log('CORS Anywhere running on http://localhost:8080');
  }); 