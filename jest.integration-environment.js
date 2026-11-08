const ExpoEnvironment = require("jest-expo/src/preset/nativeEnvironment");

module.exports = class IntegrationEnvironment extends ExpoEnvironment {
  constructor(config, context) {
    super(config, context);
    this.global.nodeFetch = fetch;
  }
};
