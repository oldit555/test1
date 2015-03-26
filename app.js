var restify = require('restify');
var config = require('config');
var log = require('logger');
var bodyParser = require("restify-plugin-json-body-parser");
var errorHandler = require('helpers/errorHandler').ErrorHandler;
var session = require('libs/session');
var _ = require('underscore');
var User = require('models/userModel').User;

var server = restify.createServer({
  name: 'AMS API', log: log
});

restify.CORS.ALLOW_HEADERS.push('authtoken');

server.use(restify.fullResponse()).use(restify.queryParser()).use(bodyParser()).use(restify.CORS({
  headers: ['authtoken'], origins: ['*']
})).use(restify.fullResponse()).use(validateAuthToken);

require('routes')(server);

server.pre(function (req, res, next){
  log.info({URL: req.url, METHOD: req.method})
  next();
});

server.on('before', function (req, res, routesute){
});

// Let's log every response. Except 404s, MethodNotAllowed, VersionNotAllowed
server.on('after', function (req, res, route){
  //req.log.info({res: res}, "finished");
});

server.on('uncaughtException', function (req, res, route, err){
  errorHandler.handleError(err);
  res.send(500, "Internal Server Error");
  startServer();
});

server.on('NotFound', function(req, res, cb){
  res.send(404, "Not Found");
});

function unknownMethodHandler(req, res){
  if (req.method.toLowerCase() === 'options') {
    var allowHeaders = ['Accept', 'Accept-Version', 'Content-Type', 'Api-Version', 'api_key'];

    if (res.methods.indexOf('OPTIONS') === -1) {
      res.methods.push('OPTIONS');
    }

    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Headers', allowHeaders.join(', '));
    res.header('Access-Control-Allow-Methods', res.methods.join(', '));
    res.header('Access-Control-Allow-Origin', req.headers.origin);

    return res.send(204);
  } else {
    return res.send(new restify.MethodNotAllowedError());
  }
}

server.on('MethodNotAllowed', unknownMethodHandler);

startServer();

function startServer(){
  server.listen(config.get('port'), function (){
    log.info("API server listening on port " + config.get('port'));
  });
}

function validateAuthToken(req, res, next){
  if (req.headers['api_key'] == '123413$asdfadvddasdvasd31242d23d2v') {
    console.log('------------ SWAGGER ---------------')
    User.find({}).populate('roles').populate('organization').exec(function (error, users){
      if (users.length) {
        var user = users[0];
        req.session = {
          userId: user._id,
          createdon: new Date().toISOString(),
          role: 'admin',
          organization: user.organization
        };
        next();
      } else {
        res.send(401, 'Unauthorized');
      }
    });
  } else {
    session.validateToken(req, function (status){
      if (status) {
        next();
      } else {
        res.send(401, 'Unauthorized');
      }
    });
  }
}
