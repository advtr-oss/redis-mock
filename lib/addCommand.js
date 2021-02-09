/**
 *
 * Custom commands
 *
 * Related to @yeahoffline/redis-mock/issue#163
 *
 * Built almost identical to addCommand in the original
 * but the command held back from being added to the prototype
 * unless it is called by addCommand
 * */

const Client = require('./client/redis-client');
const multi = require("./client/multi");

/**
 * Hold all the commands here as they will only populate
 * the prototype when called by 'addCommand'
 * */
const commands = {};

/**
 * @typedef MockCommandCallback
 *
 * @property {RedisClient} client
 * @property {Array} args
 * @property {Function} callback
 * */

/**
 *
 * Add global command to the clients either singular or
 * passing a map object with the key as the name, and the
 * callback as the value
 *
 * @param {string|Object} command
 * @param {MockCommandCallback} [callback]
 * */
const addMockCommand = function (command, callback) {
  if (typeof command === 'object') {
    return Object.keys(command).forEach((cmd) => addMockCommand(cmd, command[cmd]));
  }

  if (commands[command]) {
    throw new Error(`Command [${command}] already registered`);
  }

  commands[command] = callback;
};

const addCommand = function (command) {
  // Some rare Redis commands use special characters in their command name
  // Convert those to a underscore to prevent using invalid function names
  const commandName = command.replace(/(?:^([0-9])|[^a-zA-Z0-9_$])/g, '_$1');

  const callback = commands[command];

  if (!callback) {
    process.emitWarning(`Command [${command}] has not been registered with mock, returning`);
    return;
  }

  if (!Client.prototype[command]) {
    Client.prototype[command.toUpperCase()] = Client.prototype[command] = function () {
      // Should make a customer parser to handle this and not have to mess
      // with preexisting exports??
      const args = Client.$_parser(arguments);
      let cb;
      if (typeof args[args.length - 1] === 'function') {
        cb = args.pop();
      }

      return callback(this, args, cb);
    };

    // Alias special function names (e.g. JSON.SET becomes JSON_SET and json_set)
    if (commandName !== command) {
      Client.prototype[commandName.toUpperCase()] = Client.prototype[commandName] = Client.prototype[command];
    }
  }

  if (!multi.Multi.prototype[command]) {
    multi.Multi.prototype[command.toUpperCase()] = multi.Multi.prototype[command] = function (...args) {
      this._command(command, args);
      //Return this for chaining
      return this;
    };

    // Alias special function names (e.g. JSON.SET becomes JSON_SET and json_set)
    if (commandName !== command) {
      multi.Multi.prototype[commandName.toUpperCase()] =  multi.Multi.prototype[commandName] = multi.Multi.prototype[command];
    }
  }
};

module.exports.addCommand = addCommand;
module.exports.addMockCommand = addMockCommand;
