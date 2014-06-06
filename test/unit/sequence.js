/**
 * Created by mbinot on 11.05.14.
 */
var assert = require('assert');
var Sequence = require('../../lib/sequence');
var testUtils = require('../support/testutils');

describe('Sequence', function () {

    var connection = testUtils.createMockedConnection('foo');
    beforeEach(function(done){
        connection.client.reset();
        done();
    })

    describe('constructor', function () {
        it('should not fail or hang', function (done) {
            var unit = new Sequence('aTestCollection', 'seq1', connection.client);
            done();
        });

        it('should create a proper keyName and name', function (done) {
            var unit = new Sequence('aTestCollection', 'seq1', connection.client);
            assert(unit.name == 'seq1');
            assert(unit.keyName == 'waterline:atestcollection:sequences:seq1');
            done();
        });
    });

    describe('initialize', function () {
        it('should initialize a new sequence properly', function (done) {
            var client = connection.client;
            var unit = new Sequence('coll', 'seq', client);
            unit.initialize(function () {
                assert(client.values['waterline:coll:sequences:seq'] == 0);
                done();
            });
        });

        it('should not change an existing sequence', function (done) {
            var client = connection.client;
            client.values['waterline:coll:sequences:seq'] = 5;
            var unit = new Sequence('coll', 'seq', client);
            unit.initialize(function () {
                assert(client.values['waterline:coll:sequences:seq'] == 5);
                done();
            });
        });
    });

    describe('get', function () {
        it('should return the proper value', function (done) {
            var client = connection.client;
            client.values['waterline:coll:sequences:seq'] = 6;
            var unit = new Sequence('coll', 'seq', client);
            unit.get(function (err, result) {
                assert(result == 6);
                done();
            });
        });

        it('should fail if not initialized', function (done) {
            var client = connection.client;
            var unit = new Sequence('coll', 'seq', client);
            unit.get(function (err, result) {
                assert(err != undefined);
                assert(err.notFound != undefined);
                done();
            });
        });
    });

    describe('set', function () {
        it('should set a value', function (done) {
            var client = connection.client;
            var unit = new Sequence('coll', 'seq', client);
            unit.initialize(function (err, result) {
                unit.set(10, function(err, value){
                    assert(err == undefined);
                    assert(value == 10);
                    assert(connection.client.values['waterline:coll:sequences:seq'] == 10);
                    done();
                });
            });

        });
    });

    describe('increment', function () {
        it('should increment a value', function (done) {
            var client = connection.client;
            var unit = new Sequence('coll', 'seq', client);
            unit.initialize(function (err, result) {
                unit.increment(function(err, value){
                    assert(err == undefined);
                    assert(value == 1);
                    assert(client.values['waterline:coll:sequences:seq'] == 1);
                    unit.increment(function(err, value){
                        assert(err == undefined);
                        assert(value == 2);
                        assert(client.values['waterline:coll:sequences:seq'] == 2);
                        unit.get(function(err, value){
                            assert(err == undefined);
                            assert(value == 2);
                            assert(client.values['waterline:coll:sequences:seq'] == 2);
                            done();
                        });
                    });
                });
            });
        });

    });
});
