/**
 * Created by mbinot on 08.05.14.
 */
var level = require('level');
var Errors = require('waterline-errors');
var WaterlineCriteria = require('waterline-criteria');
var Schema = require('./schema');
var Aggregate = require('./aggregate');
var Util = require('./util');
var Promise = require('bluebird');
var _ = require('lodash');

/**
 * Constructor. Register connection and given collections.
 *
 * @type {exports}
 */
var Database = module.exports = function (connection, collections) {
    this.connection = connection || {};
    this.connection.options = _.extend({}, connection.options, { valueEncoding: 'json' });

    this.collections = collections || {};
    this.schema = {};
    this.clientIdentifier = Util.sanitize(connection.database);

    return this;
};

/**
 * Initialize all collections.
 *
 * @public
 * @param registeredClients
 * @param cb
 */
Database.prototype.initialize = function (registeredClients, cb) {
    var self = this;

    Promise.resolve()
        .then(function () {
            if (!_.isUndefined(self.connection.client)) {
                self.connection.client = Promise.promisifyAll(self.connection.client);
                return;
            }

            var descriptor = registeredClients[self.clientIdentifier];
            if(descriptor !== undefined) {
                descriptor.counter++;
                self.connection.client = descriptor.client;
                return;
            }

            descriptor = {
                counter: 1,
                client: Promise.promisifyAll(level(self.connection.database, self.connection.options))
            };
            registeredClients[self.clientIdentifier] = descriptor;
            self.connection.client = descriptor.client;
        })
        .then(function () {
            self.schema = new Schema(self.connection.client);
        })
        .then(function () {
            return Object.keys(self.collections);
        })
        .map(function (key) {
            var collection = self.collections[key];
            self.configure(key, collection.definition);
        })
        .nodeify(cb);
};

/**
 * Disconnect connection.
 * 
 */
Database.prototype.disconnect = function disconnect(registeredClients) {
    var descriptor = registeredClients[this.clientIdentifier];
    if (descriptor === null)
        return ;

    if (descriptor.counter > 1) {
        descriptor.counter--;
        return;
    }

    descriptor.client.close(function(){});
    delete registeredClients[this.clientIdentifier];
};

/**
 * Configure a collection.
 *
 * @param collectionName
 * @param schema
 */
Database.prototype.configure = function configure(collectionName, schema) {
    this.schema.registerCollection(collectionName, schema);
};

/**
 * Describe the schema for given collection.
 *
 * @public
 *
 * @param collectionName
 * @param cb
 * @returns {*}
 */
Database.prototype.describeCollection = function describeCollection(collectionName, cb) {
    var name = Util.normalizeName(collectionName);
    var desc = this.schema.retrieve(name);

    if (!desc)
        return cb(Errors.adapter.collectionNotRegistered);

    if (Object.keys(desc).length === 0)
        desc = null;

    cb(null, desc);
};

/**
 * Define the schema for a collection.
 *
 * @public
 *
 * @param collectionName
 * @param definition
 * @param cb
 */
Database.prototype.defineCollection = function defineCollection(collectionName, definition, cb) {
    var name = Util.normalizeName(collectionName);
    this.schema.registerCollection(name, definition);
    this.collections[name] = true;
    cb();
};

/**
 * Drops a collection.
 *
 * @public
 *
 * @param collectionName
 * @param relations
 * @param cb
 */
Database.prototype.dropCollection = function dropCollection(collectionName, relations, cb) {
    var self = this;
    collectionName = Util.normalizeName(collectionName);

    if (!self.collections[collectionName])
        return cb(Errors.adapter.collectionNotRegistered);

    var primary = this.schema.getPrimaryFor(collectionName);
    Promise
        .resolve(self.schema.getSequencesFor(collectionName))
        .map(function (sequence) {
            self.connection.client.delAsync(sequence.keyName);
        })
        .then(function () {
            return self.schema.getIndicesFor(collectionName);
        })
        .map(function (idx) {
            return idx.dropAsync();
        })
        .then(function () {
            // Delete all entries
            var deferred = Promise.defer();
            var base = self.schema.getIndexKeyFor(collectionName, primary);
            var start = base + ':!';
            var end = base + ":~";
            self.connection.client.createReadStream({ start: start, end: end})
                .on('data', function(data){
                    self.connection.client.delAsync(data.key);
                })
                .on('end', function(){
                    deferred.resolve();
                })
                .on('error', function(err){
                    deferred.reject(err);
                });

            return deferred.promise;
        })
        .then(function () {
            delete self.schema._schema[collectionName];
            delete self.collections[collectionName];
        })
        .nodeify(cb);
};

/**
 * Create a new record from `data`
 *
 * @public
 *
 * @param {String}   collectionName
 * @param {Object}   obj
 * @param {Function} cb
 * @api public
 */
Database.prototype.insert = function insert(collectionName, obj, cb) {
    var self = this;
    var data = _.cloneDeep(obj);
    collectionName = Util.normalizeName(collectionName);
    var sequences = self.schema.getSequencesFor(collectionName);
    var primary = self.schema.getPrimaryFor(collectionName);

    Promise.resolve()
        .then(self.checkUniqueConstraints(collectionName, data))
        .then(self.checkPrimaryKeyExists(sequences, primary, data))
        .then(function () {
            // Increment sequences
            var sequenceValues = {};
            return Promise
                .map(sequences, function (sequence) {
                    var deferred = Promise.defer();

                    // If a value was set for a sequence, increase the sequence value
                    // to match the set value
                    if (data[sequence.name]) {
                        sequence.set(data[sequence.name], function (err, value) {
                            if (err)
                                return deferred.reject(err);

                            sequenceValues[sequence.name] = value;
                        });

                        return deferred.resolve(sequence);
                    }


                    // If not, increment by one
                    sequence.increment(function (err, value) {
                        if (err)
                            return deferred.reject(err);

                        sequenceValues[sequence.name] = value;
                        data[sequence.name] = parseInt(value, 10);
                        deferred.resolve(sequence);
                    });

                    return deferred.promise;
                });
        })
        .then(function () {
            // Save record
            var recordKey = self.schema.recordKey(collectionName, primary, data[primary]);
            return self.connection.client.putAsync(recordKey, data);
        })
        .then(function () {
            return self.updateIndices(collectionName, data);
        })
        .then(function () {
            // Load record
            var recordKey = self.schema.recordKey(collectionName, primary, data[primary]);
            return self.connection.client.getAsync(recordKey);
        })
        .then(function (values) {
            // Parse values and return result
            return self.schema.parse(collectionName, values);
        })
        .nodeify(cb);
};

/**
 * Find records by criteria.
 *
 * @public
 *
 * @param collectionName
 * @param criteria
 * @param cb
 */
Database.prototype.find = function find(collectionName, criteria, cb) {
    this.findAsync(collectionName, criteria)
        .nodeify(cb);
};

/**
 * Find records by criteria.
 *
 * @public
 *
 * @param collectionName
 * @param criteria
 */
Database.prototype.findAsync = function findAsync(collectionName, criteria) {
    var self = this;
    collectionName = Util.normalizeName(collectionName);
    var primary = this.schema.getPrimaryFor(collectionName);

    // If the primary key is contained in the criteria, a NoSQL key can be
    // constructed and we can simply grab the values. This would be a findOne.
    if (!_.isUndefined(criteria[primary])) {
        var primaryKey = this.schema.getPrimaryKeyFor(collectionName, criteria[primary]);

        return self.connection.client.getAsync(primaryKey)
            .then(function (data) {
                var parsed = self.schema.parse(collectionName, data);
                return Promise.resolve(parsed);
            });
    }

    var options = {};
    if (_.has(criteria, 'skip')) {
        options.skip = _.cloneDeep(criteria.skip);
        delete criteria.skip;
    }

    if (_.has(criteria, 'limit')) {
        options.limit = _.cloneDeep(criteria.limit);
        delete criteria.limit;
    }

    if (_.has(criteria, 'sort')) {
        options.sort = _.cloneDeep(criteria.sort);
        delete criteria.sort;
    } else {
        options.sort = {};
        options.sort[primary] = 1;
    }

    var primaryKeyIndex = self.schema.getIndex(collectionName, primary);
    if (primaryKeyIndex === undefined)
        return Promise.reject('Not found');

    return Promise.resolve()
        .then(function () {
            var deferred = Promise.defer();
            var keys = [];
            var base = self.schema.getPrimaryKeyFor(collectionName, '');
            self.connection.client.createReadStream({ start: base + '!', end: base + ':' })
                .on('data', function(data){
                    keys.push(data.key);
                })
                .on('error', function(err){
                    deferred.reject(err);
                })
                .on('end', function(){
                    deferred.resolve(keys);
                });
            return deferred.promise;
        })
        .map(function (key) {
            return self.connection.client.getAsync(key)
                .catch(function(err) {
                    if(err.type == "NotFoundError")
                        return null;
                    throw err;
                });
        })
        .filter(function (record) {
            if (record === null)
                return false;

            record = self.schema.parse(collectionName, record);
            var data = {};
            data[collectionName] = [record];
            try {
                var resultSet = WaterlineCriteria(collectionName, data, criteria);
                return resultSet.results.length > 0;
            } catch (err) {
                Promise.reject(err);
            }
        })
        .then(function (records) {
            if (_.has(options, 'sort') || _.has(options, 'limit') || _.has(options, 'skip')) {
                var data = {};
                data[collectionName] = records;
                options.where = {};
                records = WaterlineCriteria(collectionName, data, options).results || [];
            }

            var aggregate = new Aggregate(criteria, records);
            if (aggregate.error)
                return Promise.reject(aggregate.error);

            return aggregate.results;
        });
};

/**
 * Delete records by criteria.
 *
 * @param collectionName
 * @param criteria
 * @param cb
 */
Database.prototype.destroy = function destroy(collectionName, criteria, cb) {
    var self = this;
    collectionName = Util.normalizeName(collectionName);
    var primary = self.schema.getPrimaryFor(collectionName);
    var indices = self.schema.getIndicesFor(collectionName);

    Promise.resolve()
        .then(function () {
            return self.findAsync(collectionName, criteria)
                .then(function (result) {
                    if (!_.isArray(result))
                        return [result];
                    return result;
                });
        })
        .map(function (record) {
            var primaryKey = self.schema.getPrimaryKeyFor(collectionName, record[primary]);
            return self.connection.client.delAsync(primaryKey)
                .then(function () {
                    return record;
                });
        })
        .map(function (record) {
            return Promise.resolve(indices)
                .filter(function (index) {
                    // Check if indexed attribute exists in record
                    return  record[index.name] !== undefined;
                })
                .map(function (index) {
                    // Remove model's value in index
                    return Promise.resolve(index)
                        .then(function (index) {
                            var indexValue = record[index.name];
                            return index.removeAsync(indexValue);
                        });
                })
                .then(function () {
                    return record;
                });
        })
        .nodeify(cb);
};

/**
 * Update records by criteria.
 *
 * @param collectionName
 * @param criteria
 * @param values
 * @param cb
 */
Database.prototype.update = function update(collectionName, criteria, values, cb) {
    var self = this;
    collectionName = Util.normalizeName(collectionName);
    var primary = this.schema.getPrimaryFor(collectionName);

    // Don't allow the updating of primary keys
    if (!_.isUndefined(values[primary]) && (
        (_.has(criteria, primary) && criteria[primary] !== values[primary]) ||
        (_.has(criteria, 'where') && criteria.where[primary] !== values[primary]))
        ) {
        return cb(Errors.adapter.primaryKeyUpdate);
    }

    var indices = self.schema.getIndicesFor(collectionName);

    var chain = Promise.resolve()
        .then(function () {
            // Find all records matching criteria
            return self.findAsync(collectionName, criteria);
        })
        .then(function (records) {
            // Ensure that result is an array (even when it's only a single one)
            return !_.isArray(records) ? [records] : records;
        })
        .then(function (records) {
            if (records.length < 2)
                return records;

            // Check if any of the unique indices is being set (which is not valid for more than one record)
            if (_.any(indices, function (index) { return _.has(values, index.name); }))
                return Promise.reject(new Error('Attempting to update a unique index on multiple records'));

            return records;
        })
        .then(function (records) {
            // Check existing indices and use first record as reference
            // if there's more than one record, the previous check ensured that there is no index value used.
            return self.checkUniqueConstraints(collectionName, values, records[0])
                .then(function () {
                    return records;
                });
        })
        .map(function (record) {
            // Update values
            var key = self.schema.recordKey(collectionName, primary, record[primary]);
            var updatedValues = _.assign({}, record, values);
            return self.connection.client.putAsync(key, updatedValues)
                .then(function () {
                    // Update indices
                    var indicesToUpdate = _.filter(indices, function (index) {
                        return _.has(values, index.name) && record[index.name] != updatedValues[index.name];
                    });


                    var subTasks = _.map(indicesToUpdate, function (index) {
                            return Promise.resolve()
                                .then(function () {
                                    var value = record[index.name];
                                    if (value === undefined)
                                        return;

                                    return index.removeAsync(value);
                                })
                                .then(function () {
                                    var value = updatedValues[index.name];
                                    if (value === undefined)
                                        return;

                                    return index.indexAsync(value);
                                });
                        });

                    return Promise.all(subTasks)
                        .then(function () {
                            return updatedValues;
                        });
                });

        });

    chain.nodeify(cb);
};

/**
 *
 *
 * @private
 *
 * @param collectionName              Name of the collection
 * @param data              Data (values) to check against
 * @param existingRecord    Optional existing record as reference for values (used for updates).
 * @returns {*}
 */
Database.prototype.checkUniqueConstraints = function checkUniqueConstraints(collectionName, data, existingRecord) {
    var indices = this.schema.getIndicesFor(collectionName);
    if (indices === null)
        return Promise.resolve(true);

    return Promise
        .filter(indices, function (idx) {
            var value = data[idx.name];
            if (value === undefined)
                return false;

            // if the existing record's value equals the current value,
            // we don't need to check the constraint; it's been done before or we're
            // messed up already
            if (existingRecord !== undefined && _.has(existingRecord, idx.name) &&
                value == existingRecord[idx.name]) {
                return false;
            }

            return idx.existsAsync(value);
        })
        .then(function (result) {
            if (result.length === 0)
                return Promise.resolve();
            return Promise.reject(Errors.adapter.notUnique);
        });
};

/**
 * Checks that primary key exists or is auto-incrementing.
 *
 * @param sequences
 * @param primary
 * @param data
 * @returns {*}
 */
Database.prototype.checkPrimaryKeyExists = function checkPrimaryKeyExists(sequences, primary, data) {
    var sequenceNames = sequences.map(function (sequence) {
        return sequence.name;
    });

    if (_.isUndefined(data[primary]) && !~sequenceNames.indexOf(primary)) {
        return Promise.reject(Errors.adapter.primaryKeyMissing);
    }
};

/**
 * Updates all indices of a collection with given data.
 *
 * @param name
 * @param data
 * @returns {*}
 */
Database.prototype.updateIndices = function updateIndices(name, data) {
    var indices = this.schema.getIndicesFor(name);
    if (indices === null)
        return Promise.resolve();

    return Promise.map(indices, function (idx) {
        var value = data[idx.name];
        if (value === undefined)
            return Promise.resolve();

        return idx.indexAsync(value);
    });
};
