/* eslint valid-jsdoc: "off" */

'use strict'

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = (appInfo) => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = (exports = {})

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1677594531611_3030'

  // add your middleware config here
  config.middleware = ['auth', 'traffic']

  // add your user config here
  const userConfig = {
    // myAppName: 'egg',
  }

  /** **********************
   ***** Middleware *******
   ************************/
  config.auth = {
    ignore: '/',
  }

  config.traffic = {
    windowSize: 60 * 1000,
    maxRequest: 100,
    ignore: '/',
  }

  return {
    ...config,
    ...userConfig,
  }
}
