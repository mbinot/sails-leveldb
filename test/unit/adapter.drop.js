/**
 * Test dependencies
 */
var Adapter = require('../../index');
var testUtils = require('../support/testutils');
var assert = require('assert');

describe('adapter.dropCollection', function () {

    var connection = testUtils.createMockedConnection('fooDrop');
    var model = {
        id: {
            type: 'number',
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: 'string',
            required: true
        }
    };

    before(function (done) {
        Adapter.registerConnection(connection, {}, done);
    });

    beforeEach(function(done){
        connection.client.reset();
        Adapter.define('fooDrop', 'coll', model, done);
    });

    it('should not hang or encounter any errors', function (done) {
        Adapter.drop('fooDrop', 'coll', null, function (err, result) {
            assert(err == undefined);
            done();
        });
    });

    it('remove all keys', function (done) {
        Adapter.create('fooDrop', 'coll', {name: 'item1' }, function(err, result){
            Adapter.create('fooDrop', 'coll', {name: 'item2' }, function(err, result) {
                var values = connection.client.values;
                Adapter.drop('fooDrop', 'coll', null, function (err, result) {
                    assert(err == undefined);
                    var keys = Object.keys(values);
                    assert(keys.length == 0);
                    done();
                });
            });
        });
    });


});