const nr = require('newrelic');
const bodyParser = require('body-parser');
const express = require('express');
const exphbs = require('express-handlebars');
const passport = require('passport');
const path = require('path');
const session = require('express-session');
const url = require('url');

const config = require('./config');
const logging = require('./lib/logging');
const routes = require('./routes');

const app = express();

// Add the request logger before anything else so that it can
// accurately log requests.
app.use(logging.requestLogger);

// most specific first
app.use(bodyParser.json({ type: 'json/*' }));
app.use(bodyParser.json({ type: '*/json' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '5mb' })); // for parsing application/x-www-form-urlencoded
app.use(bodyParser.text({ type: '*/*' }));

app.disable('etag');

const port = process.env.DOCKER_PORT || config.get('PORT');
const port2 = process.env.DOCKER_PORT2 || 5000;

// handlebars
const setupView = function(app) {
  app.engine('handlebars', exphbs({ defaultLayout: 'main'}));
  app.set('view engine', 'handlebars');
};

const setupSession = function(app) {
  app.set('trust proxy', true);

  // Configure the session and session storage.
  const sessionConfig = {
    resave: false,
    saveUninitialized: false,
    secret: config.get('SESSION_SECRET'),
    signed: true
  };

  app.use(session(sessionConfig));

  // OAuth2
  app.use(passport.initialize());

  // TODO: Use postgres session storage (to prevent session loss due to restarting task)
  app.use(passport.session());
  app.use(require('./lib/oauth2').router);
};

const setupRoutes = function(app) {
  app.use(routes);

  if (process.env.NODE_ENV === 'dev') {
    // Set a catch-all route and proxy the request for static assets
    console.log("Proxying static requests to webpack");
    const proxy = require('proxy-middleware');
    app.use('/', proxy(url.parse('http://localhost:' + port2 + '/')));
  } else {
    // TODO: Serve files from dist/
    app.use('/assets', express.static('app/assets'));
    app.use(express.static('dist'));
  }
};

const setupLogging = function(app) {
  // Add the error logger after all middleware and routes so that
  // it can log errors from the whole application. Any custom error
  // handlers should go after this.
  app.use(logging.errorLogger);

  // Basic 404 handler
  app.use(function (req, res) {
    res.status(404).send('Not Found');
  });

  // Basic error handler
  app.use(function (err, req, res, next) {
    /* jshint unused:false */
    // If our routes specified a specific response, then send that. Otherwise,
    // send a generic message so as not to leak anything.
    res.status(500).send(err.response || 'Something broke!');
  });
}

if (module === require.main) {
  setupView(app);
  setupSession(app);
  setupRoutes(app);
  setupLogging(app);

  // Setup webpack-dev-server & proxy requests
  if (process.env.NODE_ENV === 'dev') {
    var webpack_config = require('./webpack.config');
    var webpack = require('webpack');
    var WebpackDevServer = require('webpack-dev-server');
    var compiler = webpack(webpack_config);
    compiler.plugin("done", function() {
      console.log("DONE");
    });
    var conf = {
      publicPath: webpack_config.output.publicPath,
      contentBase: webpack_config.devServer.contentBase,
      hot: true,
      quiet: false,
      noInfo: false,
      historyApiFallback: true
    };

    if (process.env.WATCH_POLL) { // if WATCH_POLL defined, revert watcher from inotify to polling
      conf.watchOptions = {
        poll: 2000,
        ignored: /node_modules|typings|dist|dll|\.git/,
      };
    }

    // Start the server
    const server = new WebpackDevServer(compiler, conf);
    server.listen(port2, "localhost", () => {});
    console.log('Webpack listening on %s', port2);
  }

  const server = app.listen(port, () => {
    console.log('App listening on port %s', server.address().port);
  });
}

module.exports = app;
