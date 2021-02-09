// TODO: Clean these up

const should = require('should');
const helpers = require('../helpers');
const redismock = require("../../lib");

// Since this is purely for mocking plugins
if (process.env.VALID_TESTS) {
  return;
}

/* eslint-disable-next-line */
const noop = () => {};

// Clean the db after each test
afterEach(function (done) {
  var r = helpers.createClient();
  r.flushdb(function () {
    r.end(true);
    done();
  });
});

describe('addMockCommand()', function () {

  var Redis = redismock.RedisClient;

  it('should exist', function () {
    should.exist(redismock.addMockCommand);
  });

  it('should not populate the prototype', function () {
    redismock.addMockCommand('gh163.addMockCommand', noop);
    should.not.exist(Redis.prototype.gh163_addMockCommand);
  });

});

describe('addCommand()', function () {

  describe('adding command', function () {

    var Redis = redismock.RedisClient;
    var Multi = redismock.Multi;

    it('should exist', function () {
      should.exist(redismock.addCommand);
    });

    it('should populate the prototype', function () {
      redismock.addMockCommand('gh163.addCommand', noop);
      redismock.addCommand('gh163.addCommand');

      should.exist(Redis.prototype.gh163_addCommand);
    });

    it('should convert special characters in functions names to lowercase', function () {
      const command = 'gh163.addCommand.convert';

      redismock.addMockCommand(command, noop);
      redismock.addCommand(command);

      should.exist(Redis.prototype[command]);
      should.exist(Redis.prototype[command.toUpperCase()]);
      should.exist(Redis.prototype.gh163_addCommand_convert);
      should.exist(Redis.prototype.GH163_ADDCOMMAND_CONVERT);
    });

    it('should add to multi', function () {
      const command = 'gh163.addCommand.multi';

      redismock.addMockCommand(command, noop);
      redismock.addCommand(command);

      should.exist(Multi.prototype[command]);
    });
  });

  describe('using new command', function () {

    before(function () {
      // Better functionality but will work
      //
      // The way the mock works just need a little workaround for multi
      redismock.addMockCommand('json.set', (client, args, callback) => {
        if (client instanceof redismock.Multi) {
          client = client._client;
        }

        client.set(args[0], JSON.stringify(args[2]), callback);
      });

      redismock.addMockCommand('json.get', (client, args, callback) => {
        client.get(args[0], callback);
      });

      redismock.addCommand('json.set');
      redismock.addCommand('json.get');
    });

    describe('client', function () {

      let r;

      beforeEach(function () {
        r = redismock.createClient();
      });

      afterEach(function(done) {
        r.flushall();
        r.quit(done);
      });

      it('should set value via working command', function (done) {
        const value = {
          hello: 'world'
        };

        r.json_set('foo', '.', value, function (err, result) {
          result.should.eql('OK');

          r.json_get('foo', function (err, result) {
            JSON.parse(result).should.deepEqual(value);
            done();
          });
        });
      });
    });

    describe('multi', function () {

      let r;

      beforeEach(function () {
        r = redismock.createClient();
      });

      afterEach(function(done) {
        r.flushall();
        r.quit(done);
      });

      it('should set the value with a ttl', function (done) {
        const value = {
          hello: 'world'
        };

        const multi = r.multi();

        multi.json_set('key', 'path', JSON.stringify(value))
          .expire('key', 60)
          .ttl('key')
          .exec((err, results) => {
            should(err).not.be.ok();
            should(results[0]).equal('OK');
            should(results[1]).equal(1);
            (results[2] <= 60).should.be.true();

            done();
          });
      });
    });
  });

});
