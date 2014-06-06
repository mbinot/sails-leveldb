/**
 * Test dependencies
 */
var Adapter = require('../../index');
var testUtils = require('../support/testutils');
var assert = require('assert');
var Promise = require('bluebird');

Promise.promisifyAll(Adapter);

describe('adapter.find', function () {

    var connection = testUtils.createMockedConnection('foo');
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
        }
    };

    before(function (done) {
        Adapter.registerConnection(connection, {}, done);
    });

    var prepareModel = function () {
        return Promise.resolve()
            .then(function () {
                return Adapter.dropAsync('foo', 'Model', null)
                    .catch(function (err) {
                        // Ignore exception; Collection did not exist...
                    });
            })
            .then(function () {
                return Adapter.defineAsync('foo', 'Model', model)
            })
            .then(function () {
                return Adapter.createAsync('foo', 'Model', { id: 15, name: 'a record', type: 'test' });
            })
            .then(function () {
                return Adapter.createAsync('foo', 'Model', { id: 16, name: 'another record', type: 'test' });
            })
            .then(function () {
                return Adapter.createAsync('foo', 'Model', { id: 17, name: 'a final record', type: 'test' });
            })
    };

    beforeEach(function (done) {
        prepareModel()
            .nodeify(done);
    });

    it('should find a record by its primary key', function (done) {
        Adapter.find('foo', 'Model', { id: 15 }, function (err, result) {
            assert(err == undefined);
            assert(result != undefined);
            assert(result.id == 15);
            done();
        });
    });

    it('should return a not found error if record does not exist (primary key)', function (done) {
        Adapter.find('foo', 'Model', { id: 27 }, function (err, result) {
            assert(err != undefined);
            assert(err.notFound != undefined);
            assert(result == undefined);
            done();
        });
    });

    it('it should find all records', function (done) {
        Adapter.find('foo', 'Model', {}, function (err, result) {
            assert(err == undefined);
            assert(result.length == 3);
            done();
        });
    });

    it('it should skip records', function (done) {
        Adapter.find('foo', 'Model', { skip: 1 }, function (err, result) {
            assert(err == undefined);
            assert(result.length == 2);
            assert(result[0].id == 16);
            done();
        });
    });

    it('it should limit records', function (done) {
        Adapter.find('foo', 'Model', { limit: 1 }, function (err, result) {
            assert(err == undefined);
            assert(result.length == 1);
            assert(result[0].id == 15);
            done();
        });
    });

    it('it should group records', function (done) {
        Adapter.find('foo', 'Model', { groupBy: ['type'], sum: ['counter'] }, function (err, result) {
            assert(err == undefined)
            assert(result.length == 1);
            assert(result[0].type == 'test');
            assert(result[0].counter == 6);
            done();
        });
    });

});