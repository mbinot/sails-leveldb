/**
 * Created by mbinot on 09.05.14.
 */
var Errors = require('waterline-errors');
var Util = require('./util');
var Promise = require('bluebird');

/**
 * uniqueIndex.js
 *
 * Handles creating an "index" in levelDb.
 * This is really just a set of unique keys that can be checked against to
 * determine if a value is unique or not.
 * (Taken from sails-redis)
 */
var UniqueIndex = module.exports = function (collectionName, name, client) {
    this.client = client;
    var noSqlIdentifier = Util.createNoSqlKeyAndName(collectionName, 'indices', name);
    this.name = noSqlIdentifier.name;
    this.keyName = noSqlIdentifier.key;
    return this;
};

/**
 * Create an index if one doesn't exist or return an error if the
 * value is already indexed.
 *
 * @param {String} value
 * @api public
 */
UniqueIndex.prototype.indexAsync = function indexAsync(value) {
    var self = this;

    return this.existsAsync(value)
        .then(function (indexed) {
            if (indexed)
                return Promise.reject(Errors.adapter.notUnique);

            return Promise.resolve();
        })
        .then(function () {
            var key = self.createIndexKey(value);
            return self.client.putAsync(key, value);
        });
};

/**
 * Create an index if one doesn't exist or return an error if the
 * value is already indexed.
 *
 * @param value
 * @param callback
 */
UniqueIndex.prototype.index = function index(value, callback) {
    this.indexAsync(value)
        .nodeify(callback);
};

/**
 * Remove a value and all of its entries from the index.
 *
 * @param value
 * @param {Function} cb Callback
 * @api public
 */
UniqueIndex.prototype.remove = function remove(value, cb) {
    this.removeAsync(value)
        .nodeify(cb);
};

/**
 * Remove a value and all of its entries from the index.
 *
 * @api public
 */
UniqueIndex.prototype.removeAsync = function removeAsync(value) {
    var self = this;
    if (value === undefined) {
        return Promise.resolve();
    }

    return self.existsAsync(value)
        .then(function (isExisting) {
            if (!isExisting)
                return Promise.reject({ notFound: 'Index ' + self.name + ' with ' + value + ',was not found' });
        })
        .then(function () {
            var key = self.createIndexKey(value);
            return self.client.delAsync(key);
        });
};

/**
 * Drop an index and remove all of its entries.
 *
 * @param {Function} cb Callback
 * @api public
 */
UniqueIndex.prototype.drop = function drop(cb) {
    this.dropAsync()
        .nodeify(cb);
};

/**
 * Drop an index and remove all of its entries.
 *
 * @api public
 */
UniqueIndex.prototype.dropAsync = function dropAsync() {
    var self = this;
    var deferred = Promise.defer();

    // Find all corresponding index-keys and delete them
    var start = self.keyName + ':!';
    var end = self.keyName + ':~';
    var keys = [];
    self.client.createReadStream({ start: start, end: end })
        .on('data', function (data) {
            keys.push(data.key);
        })
        .on('end', function () {
            if (keys.length === 0)
                return deferred.resolve();

            Promise
                .map(keys, function (k) {
                    return self.client.delAsync(k);
                })
                .then(function () {
                    deferred.resolve();
                });
        })
        .on('error', function (err) {
            deferred.reject(err);
        });

    return deferred.promise;
};

/**
 * Check if a value exists in index.
 *
 * @param {String} value
 * @param {Function} cb Callback
 * @api private
 */
UniqueIndex.prototype.exists = function exists(value, cb) {
    this.existsAsync(value)
        .nodeify(cb);
};

/***
 * Check if a value exists in index.
 *
 * @param value
 * @returns {*}
 */
UniqueIndex.prototype.existsAsync = function (value) {
    var key = this.createIndexKey(value);
    return this.client.getAsync(key)
        .then(function (value) {
            return value !== undefined;
        })
        .catch(function (err) {
            if (err.notFound)
                return false;

            return Promise.reject(err);
        });
};

/**
 * Creates an index key based on given name.
 *
 * @param name
 * @returns {string}
 */
UniqueIndex.prototype.createIndexKey = function (name) {
    return this.keyName + ':' + name;
};
