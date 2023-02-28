/* eslint valid-jsdoc: "off" */

'use strict'

module.exports = () => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = (exports = {})

  config.security = {
    ...config.security,
    csrf: {
      enable: false, // disable csrf in dev mode
    },
  }

  return {
    ...config,
  }
}
