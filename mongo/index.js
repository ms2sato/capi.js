var _ = require('underscore')
    , mongoose = require('mongoose')
    , mongo = require('mongodb')
    , mongoStore = require('connect-mongodb');


/**
 * AbstractFactory for DBImplementation
 * @constructor
 */
function MongoDbFactory(options) {
    this.dbname = options.dbname;
    this.host = options.host;
    this.host = options.host;
    this.port = options.port ? options.port : mongo.Connection.DEFAULT_PORT;
    this.user = options.user;
    this.pass = options.pass;
}

_.extend(MongoDbFactory.prototype, {

    createSessionStore: function () {

        return new mongoStore(
            {
                db: new mongo.Db(this.dbname, new mongo.Server(this.host, this.port), {safe: false}),
                username: this.user,
                password: this.pass
            }
        )
    },

    createConnector: function () {

        var self = this;
        return {
            connect: function(){

                mongoose.connect(self.host, self.dbname, self.port, {
                    user: self.user,
                    pass: self.pass
                });

                return mongoose.connect;
            }
        }

    }
});

exports.DbFactory = MongoDbFactory;
