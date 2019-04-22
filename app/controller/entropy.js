'use strict';

const Controller = require('egg').Controller;

class EntropyController extends Controller {
  // 获取信息熵
  async index() {
    const { ctx } = this;
    const params = ctx.query;
    const result = await ctx.service.entropy.getEntropy(params.startTime, params.endTime);
    ctx.body = ctx.fResponse(result);
  }
}

module.exports = EntropyController;
