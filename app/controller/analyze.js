'use strict';

const Controller = require('egg').Controller;

class AnalyzeController extends Controller {
  // 某时间区间的和弦图数据（指定具体IP）
  async chord() {
    const { ctx } = this;
    const params = ctx.query;
    const result = await ctx.service.analyze.getChord(params.startTime, params.endTime, params.ip);
    ctx.body = ctx.fResponse(result);
  }

  // 某时间区间的和弦图数据（所有IP的连接关系）
  async chordAll() {
    const { ctx } = this;
    const params = ctx.query;
    const result = await ctx.service.analyze.getChordAll(params.startTime, params.endTime);
    ctx.body = ctx.fResponse(result);
  }

  // 某时间区间的IP散点图数据
  async scatter() {
    const { ctx } = this;
    const params = ctx.query;
    const result = await ctx.service.analyze.getScatter(params.startTime, params.endTime);
    ctx.body = ctx.fResponse(result);
  }

  // 某时间区间内与某IP相关联的IP
  async ips() {
    const { ctx } = this;
    const params = ctx.query;
    const result = await ctx.service.analyze.getIps(params.startTime, params.endTime, params.ip);
    ctx.body = ctx.fResponse(result);
  }
}

module.exports = AnalyzeController;
