/**
 * Created by mbinot on 17.05.14.
 */
var Adapter = require('../../index');
var testUtils = require('../support/testutils');
var assert = require('assert');
var Promise = require('bluebird');

Promise.promisifyAll(Adapter);

describe('adapter.update', function () {

    var connection = testUtils.createMockedConnection('fooUpdate');
    var model = {
        id: {
            type: 'number',
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: 'string',
            required: true
        },
        counter: {
            type: 'number',
            autoIncrement: true
        },
        type: {
            type: 'string'
        },
        additional: {
            type: 'string',
            unique: true
        }
    };

    before(function (done) {
        Adapter.registerConnection(connection, {}, done);
    });

    var prepareModel = function () {
        return Promise.resolve()
            .then(function () {
                return Adapter.dropAsync('fooUpdate', 'Model', null)
                    .catch(function (err) {
                        // Ignore exception; Collection did not exist...
                    });
            })
            .then(function () {
                return Adapter.defineAsync('fooUpdate', 'Model', model)
            })
            .then(function () {
                return Adapter.createAsync('fooUpdate', 'Model', { id: 15, name: 'a record', type: 'test' });
            })
            .then(function () {
                return Adapter.createAsync('fooUpdate', 'Model', { id: 16, name: 'another record', type: 'test', additional: 'unique' });
            })
            .then(function () {
                return Adapter.createAsync('fooUpdate', 'Model', { id: 17, name: 'a final record', type: 'test' });
            })
    };

    beforeEach(function (done) {
        prepareModel()
            .nodeify(done);
    });

    it('it should add new index values to the indices', function (done) {
        assert(connection.client.values['waterline:model:indices:additional:unique']);
        assert(connection.client.values['waterline:model:indices:additional:added'] == undefined);
        Adapter.update('fooUpdate', 'Model', { id: 17 }, { name: 'changed', additional: 'added' }, function (err, result) {
            assert(err == undefined);
            assert(connection.client.values['waterline:model:indices:additional:unique'] != undefined);
            assert(connection.client.values['waterline:model:indices:additional:added']);

            done();
        });
    });

    it('should update values', function(done){
        Adapter.update('fooUpdate', 'Model', { type: 'test' }, { type: 'changed' }, function (err, result) {
            assert(err == undefined);
            assert(result != null && result.length == 3);
            assert(result[0].type == 'changed');
            assert(result[1].type == 'changed');
            assert(result[2].type == 'changed');
            done();
        });
    });

    it('should not update primary keys', function(done){
        Adapter.update('fooUpdate', 'Model', { id: 17 }, { id: 20, name: 'changed' }, function (err, result) {
            assert(err != undefined);
            done();
        });
    });

    it('should not update a unique indices', function (done) {
        Adapter.update('fooUpdate', 'Model', { id: 17 }, { additional: 'unique' }, function (err, result) {
            assert(err != undefined);
            assert(err.message == "Record does not satisfy unique constraints");
            done();
        });
    })

    it('should update a record by its primary key', function (done) {
        Adapter.update('fooUpdate', 'Model', { id: 17 }, { name: 'a changed name', additional: 'added'}, function (err, result) {
            assert(err == undefined);
            assert(result != undefined);
            done();
        });
    });

    it('should not update a unique index on multiple records', function (done) {
        Adapter.update('fooUpdate', 'Model', { type: 'test' }, { additional: 'uh oh!' }, function (err, result) {
            assert(err != undefined);
            assert(err.message == "Attempting to update a unique index on multiple records");
            done();
        });
    })

    it('it should replace existing index values', function (done) {
        Adapter.update('fooUpdate', 'Model', { id: 16 }, { name: 'changed', additional: 'changed' }, function (err, result) {
            assert(err == undefined);
            assert(connection.client.values['waterline:model:indices:additional:unique'] == undefined);
            assert(connection.client.values['waterline:model:indices:additional:changed']);
            done();
        });
    });
})
;