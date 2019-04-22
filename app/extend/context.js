'use strict';

module.exports = {
  fResponse(res) {
    return {
      code: 0,
      data: res,
    };
  },
  mapChangeObj(map) {
    const obj = {};
    for (const [ k, v ] of map) {
      obj[k] = v;
    }
    return obj;
  },
};
