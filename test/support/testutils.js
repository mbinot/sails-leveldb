/**
 * Created by mbinot on 11.05.14.
 */
var Promise = require('bluebird');
var Readable = require('stream').Readable;
var _ = require('lodash');
var Util = require('util');

var createMockedConnection = function(name) {
    var client = {
        values: [],
        get: function(k, cb) {
            if (this.values[k] == undefined)
                return cb({ notFound: true});
            cb(null, this.values[k]);
        },
        put: function(k, v, cb) {
            this.values[k] = v;
            cb(null, v);
        },
        del: function(k, cb) {
            delete this.values[k];
            cb(null);
        },
        batch: function(commands, cb){
          commands.forEach(function(c){
              if (c.type == 'put') {
                  client.put(c.key, c.value, function () {});
              }

              if (c.type == 'del') {
                  client.del(c.key, function(){} );
              }
          });
          cb()
        },

        createReadStream: function(options){
            var self = this;

            options = options || {};
            _.extend(options, { objectMode: true });

            Util.inherits(ValueReader, Readable);
            function ValueReader(options) {
                Readable.call(this, options);
                this._keys = _.keys(self.values)
                    .filter(function(k){
                        if (options.start == undefined && options.end == undefined)
                            return true;

                        var start = options.start != undefined ? k >= options.start : true;
                        var end = options.end != undefined ? k <= options.end : true;
                        return start && end;
                    });
                return this;
            }

            ValueReader.prototype._read = function(){
                if (this._keys.length == 0) {
                    this.push(null);
                    return;
                }

                var k = this._keys.shift();
                var v = self.values[k];
                var result = { key: k, value: v };
                this.push(result);
            };

            return new ValueReader(options);
        },

        close: function(cb) {
            this.reset();
            if (_.isFunction(cb))
                cb();
        },

        reset: function(){
            this.values = [];
        }
    };

    return {
        identity: name,
        client: Promise.promisifyAll(client)
    };
};

var utils = module.exports = {
    createMockedConnection : createMockedConnection
};
