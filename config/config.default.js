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

  const loginType = ['sso', 'wx']

  const ssoBaseUrl = 'https://hong97.ltd/sso'
  const sso = {
    baseUrl: ssoBaseUrl,
    api: {
      getUserInfo: {
        path: `${ssoBaseUrl}/api/userInfo`,
        method: 'GET',
      },
      validate: {
        path: `${ssoBaseUrl}/api/validate`,
        method: 'POST',
      },
    },
  }

  const mongoose = {
    client: {
      url: 'mongodb://127.0.0.1:27017',
      options: {
        dbName: 'walkingcalc',
      },
    },
  }

  /** **********************
   ***** Middleware *******
   ************************/
  config.auth = {
    ignore: '/user/login',
  }

  config.traffic = {
    windowSize: 60 * 1000,
    maxRequest: 100,
    ignore: '/user/login',
  }

  return {
    ...config,
    ...userConfig,
    mongoose,
    sso,
    loginType,
  }
}
