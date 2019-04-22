'use strict';

const { Controller } = require('egg');
class BaseController extends Controller {

  success(data) {
    this.ctx.body = {
      code: 0,
      data,
    };
  }

  fail(code, data) {
    this.ctx.body = {
      code,
      data,
    };
  }

  notFound(msg) {
    msg = msg || 'not found';
    this.ctx.throw(404, msg);
  }

}

module.exports = BaseController;
