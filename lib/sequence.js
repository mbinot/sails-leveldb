/**
 * Created by mbinot on 09.05.14.
 */
var Util = require('./util');

/**
 * Sequences represent auto-incrementing values. They are responsible for
 * tracking the last value available and can be incremented only.
 * (Taken from sails-redis)
 */

var Sequence = module.exports = function (collectionName, name, client) {
    this.client = client;
    var result = Util.createNoSqlKeyAndName(collectionName, 'sequences', name);
    this.name = result.name;
    this.keyName = result.key;
    return this;
};

/**
 * Ensures a sequence exists and if not will create one and set the initial
 * value to zero.
 *
 * @param {Function} cb
 * @api private
 */
Sequence.prototype.initialize = function initialize(cb) {
    var self = this;
    if (cb === undefined)
        cb = function(){};

    this.client.get(this.keyName, function (err, sequence) {
        if (err && !err.notFound)
            return cb(err);

        if (sequence) {
            return cb(null, sequence);
        }

        self.client.put(self.keyName, 0, function (err) {
            if (err)
                return cb(err);

            cb(null, 0);
        });
    });
};

/**
 * Get the current value of a sequence.
 *
 * @param {Function} cb Callback
 * @api public
 */
Sequence.prototype.get = function get(cb) {
    this.client.get(this.keyName, function (err, sequence) {
        if (err)
            return cb(err);

        cb(null, sequence);
    });
};

/**
 * Get the current value of a sequence.
 *
 * @api public
 */
Sequence.prototype.getAsync = function get() {
    return this.client.getAsync(this.keyName);
};

/**
 * Increment the value of a sequence.
 *
 * @param {Function} cb Callback
 * @api public
 */
Sequence.prototype.increment = function increment(cb) {
    var self = this;
    self.client.get(self.keyName, function (err, result) {
        if (err)
            return cb(err);

        result = parseInt(result);
        result++;
        self.client.put(self.keyName, result, function(err){
            if (err)
                return cb(err);

            cb(null, result);
        });
    });
};

/**
 * Set a sequence's value.
 *
 * @param {Integer} val
 * @param {Function} cb Callback
 * @api public
 */
Sequence.prototype.set = function set(val, cb) {
    this.client.put(this.keyName, val, cb);
};
