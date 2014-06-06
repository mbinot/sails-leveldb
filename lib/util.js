/**
 * Created by mbinot on 09.05.14.
 */
var _ = require('lodash');
var util = module.exports = exports;

/***
 * Normalizes given name.
 *
 * @param name
 * @returns {string}
 */
util.normalizeName = function normalizeName (name) {
    return name.toLowerCase();
};

/**
 * Strips whitespaces from string.
 *
 * @param str
 * @returns {XML|string|void}
 */
util.sanitize = function sanitize (str) {
    return typeof str === 'string' ? str.replace(/\s+/g, '_') : str;
};

/**
 * Creates a unique NoSql-Key.
 *
 * @param collectionName
 * @param type
 * @param name
 */
util.createNoSqlKeyAndName = function createNoSqlKeyAndName (collectionName, type, name) {
    collectionName = util.normalizeName(collectionName);
    name = util.sanitize(name);
    var key = 'waterline:' + collectionName + ':' + type + ':' + name;
    return { key: key, name: name };
};
