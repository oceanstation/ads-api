'use strict';

// noinspection JSAnnotator
/** @type Egg.EggPlugin */
module.exports = {
  static: {
    enable: true,
  },
  mysql: {
    enable: true,
    package: 'egg-mysql',
  },
  validate: {
    enable: true,
    package: 'egg-validate',
  },
  cors: {
    enable: true,
    package: 'egg-cors',
  },
};
