/**
 * Test dependencies
 */
var Adapter = require('../../index');
var testUtils = require('../support/testutils');
var assert = require('assert');
var Promise = require('bluebird');

describe('adapter.create', function () {

    var connection = testUtils.createMockedConnection('foo');
    before(function (done) {
        var collections = {
            coll: {
                definition: {
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
                        unique: true,
                        autoIncrement: true
                    }
                }
            }
        };

        Adapter.registerConnection(connection, collections, done);
    });

    it('should create a new model instance', function (done) {
        var obj = {
            name: 'a test object',
            counter: 15
        };

        Adapter.create('foo', 'coll', obj, function (err, result) {
            assert(err == undefined);
            assert(result != undefined);
            assert(result.name == obj.name);
            assert(result.id == 1);
            done();
        });
    });

    it('should create increase an autoIncrement attribute', function (done) {
        var obj = {
            name: 'a test object'
        };

        Adapter.create('foo', 'coll', obj, function (err, result) {
            assert(err == undefined);
            assert(result != undefined);
            var counter = result.counter;

            Adapter.create('foo', 'coll', obj, function (err, result) {
                assert(err == undefined);
                assert(result != undefined);
                assert(result.counter == (counter + 1));
                done();
            });
        });
    });

    it('should set an autoIncrement attribute', function (done) {
        var obj = {
            name: 'a test object',
            counter: 99
        };

        Adapter.create('foo', 'coll', obj, function (err, result) {
            assert(err == undefined);
            assert(result != undefined);
            assert(result.counter == 99);
            done();
        });
    });

    it('should update all indices', function (done) {
        var obj = {
            name: 'indexed obj'
        };

        done();
    });

    it('should respect primary keys', function (done) {
        var obj = {
            name: 'a unique entry'
        };

        Adapter.create('foo', 'coll', obj, function (err, result) {
            assert(err == undefined);
            assert(result != undefined);

            var db = connection.client.values;
            obj.id = result.id;
            Adapter.create('foo', 'coll', obj, function (err, result) {
                assert(err != undefined);
                done();
            });
        });
    });

    it('should not create doubles', function (done) {
        var obj = {
            name: 'a test object',
            counter: 10
        };

        Adapter.create('foo', 'coll', obj, function (err, result) {
            assert(err == undefined);
            assert(result != undefined);
            Adapter.create('foo', 'coll', obj, function (err, result) {
                assert(err != undefined);
                done();
            });
        });
    });
});