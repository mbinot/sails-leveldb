/**
 * Module Dependencies
 */
var Database = require('./database');
var Errors = require('waterline-errors').adapter;

/**
 * waterline-leveldb
 *
 * Most of the methods below are optional.
 *
 * If you don't need / can't get to every method, just implement
 * what you have time for.  The other methods will only fail if
 * you try to call them!
 *
 * For many adapters, this file is all you need.  For very complex adapters, you may need more flexiblity.
 * In any case, it's probably a good idea to start with one file and refactor only if necessary.
 * If you do go that route, it's conventional in Node to create a `./lib` directory for your private submodules
 * and load them at the top of the file with other dependencies.  e.g. var update = `require('./lib/update')`;
 */
module.exports = (function () {

    // Connections for this adapter.
    var connections = {};

    // Database clients for this adapter.
    var clients = {};

    var adapter = {

        identity: 'sails-leveldb',
        pkFormat: 'integer',
        syncable: false,
        schema: false,

        // Default configuration for connections
        defaults: {
            database: './appdb'
        },

        /**
         * Register a connection.
         *
         * @param  {[type]}   connection  [description]
         * @param  {[type]}   collections [description]
         * @param  {Function} cb          [description]
         * @return {[type]}               [description]
         */
        registerConnection: function (connection, collections, cb) {
            if (!connection.identity)
                return cb(Errors.IdentityMissing);

            if (connections[connection.identity])
                return cb(Errors.IdentityDuplicate);


            connections[connection.identity] = new Database(connection, collections);
            connections[connection.identity].initialize(clients, cb);
        },

        /**
         * Clean up connection and its models.
         *
         * @param  {Connection}   connection    The current connection
         * @param  {Function}     cb            Callback
         */
        teardown: function (connection, cb) {
            if (!connection) {
                return cb();
            }


            if (!connections[connection]) {
                return cb();
            }

            getConnectionByName(connection).disconnect(clients);
            delete connections[connection];

            cb();
        },

        /**
         * Describe a collection.
         *
         * @param connection
         * @param collection
         * @param cb
         * @returns {*}
         */
        describe: function (connection, collection, cb) {
            getConnectionByName(connection).describeCollection(collection, cb);
        },

        /**
         * Define a collection.
         *
         * @param connection
         * @param collection
         * @param definition
         * @param cb
         */
        define: function (connection, collection, definition, cb) {
            getConnectionByName(connection).defineCollection(collection, definition, cb);
        },

        /**
         * Drop a collection.
         *
         * @param connection
         * @param collection
         * @param relations
         * @param cb
         * @returns {*}
         */
        drop: function (connection, collection, relations, cb) {
            getConnectionByName(connection).dropCollection(collection, relations, cb);
        },

        /**
         * Find records based on criteria.
         *
         * @param connection
         * @param collection
         * @param criteria
         * @param cb
         * @returns {*}
         */
        find: function (connection, collection, criteria, cb) {
            getConnectionByName(connection).find(collection, criteria, cb);
        },

        /**
         * Create a new record.
         *
         * @param connection
         * @param collection
         * @param values
         * @param cb
         * @returns {*}
         */
        create: function (connection, collection, values, cb) {
            getConnectionByName(connection).insert(collection, values, cb);
        },

        /**
         * Update records based on criteria.
         *
         * @param connection
         * @param collection
         * @param criteria
         * @param values
         * @param cb
         * @returns {*}
         */
        update: function (connection, collection, criteria, values, cb) {
            getConnectionByName(connection).update(collection, criteria, values, cb);
        },

        /**
         * Destroy records based on criteria.
         *
         * @param connection
         * @param collection
         * @param criteria
         * @param cb
         */
        destroy: function (connection, collection, criteria, cb) {
            getConnectionByName(connection).destroy(collection, criteria, cb);
        }
    };

    /**
     * Get a registered connection by identity.
     *
     * @param name
     */
    function getConnectionByName(name) {
        return connections[name];
    }

    return adapter;
})();

