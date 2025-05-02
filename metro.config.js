const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

// TODO: Remove this once supabase fixed the issue
config.resolver.unstable_enablePackageExports = false;

config.resolver.blockList = [/(\/__tests__\/.*)$/, /(\.test\.tsx?)$/];

module.exports = config;
