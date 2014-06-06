/**
 * Created by mbinot on 09.05.14.
 */
var Sequence = require('./sequence');
var UniqueIndex = require('./uniqueindex');
var Util = require('./util');
var _ = require('lodash');

var Schema = module.exports = function (client) {
    this._schema = {};
    this._indices = {};
    this._primary = {};
    this._sequences = {};
    this._client = client;
    return this;
};

/**
 * Register a collection regarding sequences and indices.
 *
 * @param collectionName
 * @param schema
 */
Schema.prototype.registerCollection = function registerCollection(collectionName, schema) {
    var name = Util.normalizeName(collectionName);
    schema = schema ? _.cloneDeep(schema) : {};

    this._schema[name] = schema;
    this._indices[name] = [];
    this._sequences[name] = [];

    for(var attr in schema) {
        if (_.has(schema[attr], 'primaryKey')) {
            this._primary[name] = attr;
        }

        if (_.has(schema[attr], 'unique') || _.has(schema[attr], 'primaryKey')) {
            var index = new UniqueIndex(name, attr, this._client);
            this._indices[name].push(index);
        }

        if (_.has(schema[attr], 'autoIncrement')) {
            var sequence = new Sequence(name, attr, this._client);
            this._sequences[name].push(sequence);
            sequence.initialize();
        }
    }
};

/**
 * Return a clone of the previously registered schema.
 *
 * @param {String} collectionName
 * @api public
 */

Schema.prototype.retrieve = function(collectionName) {
    var name = Util.normalizeName(collectionName);
    return _.clone(this._schema[name]);
};

/**
 * Return the name of the primary key attribute for a collection.
 *
 * @param collectionName
 * @returns {*}
 */
Schema.prototype.getPrimaryFor = function(collectionName) {
    return this._primary[collectionName];
};

/**
 * Return the primary key name for a collection.
 *
 * @param collectionName
 * @returns {*}
 */
Schema.prototype.getPrimaryKeyFor = function(collectionName, value) {
    return this.recordKey(collectionName, this._primary[collectionName], value);
};

/***
 * Get all registered indices for a collection.
 *
 * @param collectionName
 */
Schema.prototype.getIndicesFor = function(collectionName) {
    return this._indices[collectionName];
};

/**
 * Return the index key name for a collection.
 *
 * @param collectionName
 * @returns {*}
 */
Schema.prototype.getIndexKeyFor = function getIndexKeyFor (collectionName, indexName) {
    return createIndexKey(collectionName, indexName);
};

/***
 * Get all registered sequences for a collection.
 *
 * @param collectionName
 */
Schema.prototype.getSequencesFor = function getSequencesFor (collectionName) {
    return this._sequences[collectionName];
};

/**
 * Get a sequence for a collection by name.
 *
 * @param collectionName
 * @param sequenceName
 */
Schema.prototype.getSequence = function getSequence (collectionName, sequenceName) {
    var sequences = this._sequences[collectionName];
    return _.find(sequences, function(e) { return e.name == sequenceName; });
};

/**
 * Get a unique index for a collection by name.
 *
 * @param collectionName
 * @param indexName
 */
Schema.prototype.getIndex = function getIndex (collectionName, indexName) {
    var indices = this._indices[collectionName];
    return _.find(indices, function(e) { return e.name == indexName; });
};

/**
 * Return the key name for an index.
 *
 * @param {String} collectionName
 * @param {Number|String} index optional
 * @api public
 */
Schema.prototype.indexKey = function indexKey (collectionName, index) {
    return 'waterline:' + collectionName + ':' + index;
};

/**
 * Return the key name for a record.
 *
 * @param {String} collectionName
 * @param {String} index
 * @param {String} key
 * @api public
 */
Schema.prototype.recordKey = function recordKey (collectionName, index, key) {
    var name = Util.normalizeName(collectionName);
    return Util.sanitize('waterline:' + name + ':' + index + ':' + key);
};

/**
 * Parse and cast data for `collection` based on schema.
 *
 * @param {String} collectionName
 * @param {Object} values
 * @return {Object}
 */
Schema.prototype.parse = function parse (collectionName, values) {
    var name = Util.normalizeName(collectionName);

    if (_.isString(values))
        values = JSON.parse(values);

    if(!this._schema[name])
        return values;

    for(var key in values) {
        if(!this._schema[name][key])
            continue;

        switch(this._schema[name][key].type) {
            case 'date':
            case 'time':
            case 'datetime':
                values[key] = new Date(values[key]);
                break;
        }
    }

    return values;
};

// ---------------------------------------------

/**
 * Creates an index key from collection name and index name.
 *
 * @param collectionName
 * @param indexName
 * @returns {string}
 */
function createIndexKey(collectionName, indexName) {
    return 'waterline:' + collectionName + ':' + indexName;
}

