const googleServicesFile =
  process.env.GOOGLE_SERVICES_JSON || "./google-services.json";

export default ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile,
  },
});
