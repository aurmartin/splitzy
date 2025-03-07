const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

config.resolver.blockList = [/(\/__tests__\/.*)$/, /(\.test\.tsx?)$/];

module.exports = config;
