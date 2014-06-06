/**
 * Test dependencies
 */
var Adapter = require('../../index');
var testUtils = require('../support/testutils');
var assert = require('assert');

describe('adapter.registerConnection', function () {

    var connection = testUtils.createMockedConnection('foo');

    it('should not hang or encounter any errors', function (done) {
        Adapter.registerConnection(connection, {}, done);
    });

    it('should register a schema for all given collections', function (done) {
        var modelA = {
            guid: {
                type: 'string',
                primaryKey: true
            },
            firstName: 'string',
            lastName: {
                type: 'string',
                required: true,
                unique: true
            },
            counter: {
                type: 'integer',
                autoIncrement: true
            },
            email: {
                type: 'string',
                index: true
            }
        };

        var modelB = {
            id: {
                type: 'number',
                primaryKey: true,
                autoIncement: true
            },
            name: {
                type: 'string',
                required: true
            }
        };

        var collections = { modelA: { definition: modelA } , modelB: { definition: modelB } };
        var conn = testUtils.createMockedConnection('foob');

        Adapter.registerConnection(conn, collections, function () {
            Adapter.describe('foob', 'modelA', function (err, test) {
                assert(err == undefined);
                assert(test.guid.type == 'string');
                done();
            })
        });
    });
});