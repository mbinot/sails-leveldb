/**
 * Created by mbinot on 17.05.14.
 */
var Adapter = require('../../index');
var testUtils = require('../support/testutils');
var assert = require('assert');
var Promise = require('bluebird');

Promise.promisifyAll(Adapter);

describe('adapter.destroy', function () {

    var connection = testUtils.createMockedConnection('fooDestroy');
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
        Adapter.registerConnection(connection, {  }, done);
    });

    var prepareModel = function () {
        return Promise.resolve()
            .then(function () {
                return Adapter.dropAsync('fooDestroy', 'Model', null)
                    .catch(function (err) {
                        // Ignore exception; Collection did not exist...
                    });
            })
            .then(function () {
                return Adapter.defineAsync('fooDestroy', 'Model', model);
            })
            .then(function () {
                return Adapter.createAsync('fooDestroy', 'Model', { id: 15, name: 'a record', type: 'test' });
            })
            .then(function () {
                return Adapter.createAsync('fooDestroy', 'Model', { id: 16, name: 'another record', type: 'test', additional: 'unique' });
            })
            .then(function () {
                return Adapter.createAsync('fooDestroy', 'Model', { id: 17, name: 'a final record', type: 'test' });
            });
    };

    beforeEach(function (done) {
        prepareModel()
            .nodeify(done);
    });

    it('should delete a record by its primary key', function (done) {
        assert(connection.client.values['waterline:model:indices:id:15']);
        assert(connection.client.values['waterline:model:indices:id:16']);
        assert(connection.client.values['waterline:model:indices:id:17']);
        Adapter.destroy('fooDestroy', 'Model', { id: 15 }, function (err, result) {
            assert(err == undefined);
            assert(result !== undefined);
            assert(connection.client.values['waterline:model:indices:id:15'] === undefined);
            assert(connection.client.values['waterline:model:indices:id:16']);
            assert(connection.client.values['waterline:model:indices:id:17']);
            done();
        });
    });
});