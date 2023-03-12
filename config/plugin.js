'use strict'

/** @type Egg.EggPlugin */
module.exports = {
  validate: {
    enable: true,
    package: 'egg-validate',
  },
  mongoose: {
    enable: true,
    package: 'egg-mongoose',
  },
  auth: {
    enable: true,
    package: '@hong97/egg-auth',
  },
}
