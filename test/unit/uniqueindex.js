/**
 * Created by mbinot on 10.05.14.
 */
var assert = require('assert');
var UniqueIndex = require('../../lib/uniqueindex');
var testUtils = require('../support/testutils');
var Promise = require('bluebird');

describe('UniqueIndex', function () {

    describe('constructor', function () {
        it('should create a unique index without failures', function (done) {
            var connection = testUtils.createMockedConnection('foo');
            connection.client.reset();
            var unit = new UniqueIndex('aCollection', 'guid', connection.client);
            done();
        });

        it('should create a proper keyName and name', function (done) {
            var name = 'guid';
            var connection = testUtils.createMockedConnection('foo');
            connection.client.reset();
            var unit = new UniqueIndex('aCollection', name, connection.client);
            assert(unit.keyName == 'waterline:acollection:indices:' + name);
            assert(unit.name == name);
            done();
        });
    });

    describe('index', function () {
        it('should create a new index', function (done) {
            var connection = testUtils.createMockedConnection('foo');
            connection.client.reset();
            var unit = new UniqueIndex('aCollection', 'guid', connection.client);
            unit.index('abc', function () {
                assert(connection.client.values['waterline:acollection:indices:guid:abc'] != undefined);
                done();
            });
        });

        it('should return an error if index already exists', function (done) {
            var connection = testUtils.createMockedConnection('foo');
            connection.client.reset();
            var unit = new UniqueIndex('aCollection', 'guid', connection.client);

            unit.index('abc', function (err1) {
                assert(err1 == null);
                assert(connection.client.values['waterline:acollection:indices:guid:abc'] != undefined);

                unit.index('abc', function (err2) {
                    assert(err2 != null);
                    assert(err2.message == 'Record does not satisfy unique constraints');
                    done();
                });
            });
        });
    });

        describe('exists', function () {
            it('should return false if index does not exist', function (done) {
                var connection = testUtils.createMockedConnection('foo');
                connection.client.reset();
                var unit = new UniqueIndex('aCollection', 'guid', connection.client);
                unit.exists('abcde', function (err, result) {
                    assert(err == null);
                    assert(result == false);
                    done();
                });
            });

            it('should return true if index does exist', function (done) {
                var connection = testUtils.createMockedConnection('foo');
                connection.client.reset();
                var unit = new UniqueIndex('aCollection', 'guid', connection.client);
                unit.index('abc', function () {
                    unit.exists('abc', function (err, result) {
                        assert(err == null);
                        assert(result == true);
                        done();
                    });
                });
            });
        });

        describe('remove', function () {
            it('should remove the entry', function (done) {
                var connection = testUtils.createMockedConnection('foo');
                connection.client.reset();
                var unit = new UniqueIndex('coll', 'guid', connection.client);
                unit.index('alpha', function () {
                    unit.index('beta', function () {
                        unit.remove('alpha', function (err) {
                            assert(err == undefined);
                            assert(connection.client.values['waterline:coll:indices:guid:alpha'] == undefined);
                            assert(connection.client.values['waterline:coll:indices:guid:beta'] != undefined);
                            done();
                        });
                    });
                });
            });

            it('should return an error if value does not exist', function (done) {
                var connection = testUtils.createMockedConnection('foo');
                connection.client.reset();
                var unit = new UniqueIndex('coll', 'guid', connection.client);
                unit.index('alpha', function () {
                    unit.index('beta', function () {
                        unit.remove('gamma', function (err) {
                            assert(err != undefined && err.notFound != undefined);
                            done();
                        });
                    });
                });
            });
        });

        describe('drop', function () {
            it('should remove all entries', function (done) {
                var connection = testUtils.createMockedConnection('foo');
                connection.client.reset();
                var unit = new UniqueIndex('coll', 'guid', connection.client);
                unit.index('alpha', function () {
                    unit.index('beta', function () {
                        unit.index('gamma', function () {
                            assert(connection.client.values['waterline:coll:indices:guid:alpha'] != undefined);
                            assert(connection.client.values['waterline:coll:indices:guid:beta'] != undefined);
                            assert(connection.client.values['waterline:coll:indices:guid:gamma'] != undefined);
                            unit.drop(function (err) {
                                assert(err == undefined);
                                assert(connection.client.values['waterline:coll:indices:guid:alpha'] == undefined);
                                assert(connection.client.values['waterline:coll:indices:guid:beta'] == undefined);
                                assert(connection.client.values['waterline:coll:indices:guid:gamma'] == undefined);
                                done();
                            });
                        });
                    });
                });
            });

            it('should leave other entries', function (done) {
                var connection = testUtils.createMockedConnection('foo');
                connection.client.reset();
                var unit = new UniqueIndex('coll', 'guid', connection.client);

                var indexToStay = new UniqueIndex('coll', 'stay', connection.client);
                indexToStay.indexAsync('i stay')
                    .then(function(){
                        unit.index('alpha', function () {
                            unit.index('beta', function () {
                                unit.index('gamma', function () {
                                    unit.drop(function (err) {
                                        assert(err == undefined);
                                        assert(connection.client.values['waterline:coll:indices:guid:alpha'] == undefined);
                                        assert(connection.client.values['waterline:coll:indices:stay:i stay'] != undefined);
                                        done();
                                    });
                                });
                            });
                        });
                    })
            });
        });
});
