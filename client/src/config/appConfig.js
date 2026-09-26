import clientPackage from '../../package.json';

export const APP_VERSION = clientPackage.version || '0.3.2';
export const APP_NAME = 'BOM Manager';
export const APP_STAGE = 'Pre-Production';
export const APP_REPOSITORY = 'https://github.com/alk0v/bom-manager';

export default {
  version: APP_VERSION,
  name: APP_NAME,
  stage: APP_STAGE,
  repository: APP_REPOSITORY
};
