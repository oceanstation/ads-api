'use strict';

const Service = require('../core/BaseService');
const TSNE = require('tsne-js');

class AnalyzeService extends Service {
  // 某时间区间的和弦图数据（指定具体IP）
  async getChord(startTime, endTime, ip) {
    const { ctx } = this;
    const sTime = new Date(startTime);
    const eTime = new Date(endTime);
    const sql = `SELECT
    firstSeenSrcIp as srcIp,
    firstSeenDestIp as destIp,
    count(*) as num
    FROM netflowa
    WHERE parsedDate > ? AND parsedDate < ?
    AND (firstSeenSrcIp = ? OR firstSeenDestIp = ?)
    GROUP BY firstSeenSrcIp, firstSeenDestIp`;
    ctx.logger.info(sql);
    let result = await this.app.mysql.query(sql, [ sTime, eTime, ip, ip ]);

    // 当数据量过大时，按照子网聚合
    if (result.length > 150) {
      // 清空临时表
      await this.app.mysql.delete('chord');

      for (let i = 0; i < result.length; i++) {
        const item = {
          srcIp: result[i].srcIp.split('.').splice(0, 3).join('.'),
          destIp: result[i].destIp.split('.').splice(0, 3).join('.'),
          num: result[i].num,
        };
        await this.app.mysql.insert('chord', item);
      }

      result = await this.app.mysql.query('SELECT srcIp, destIp, count(num) as num FROM chord GROUP BY srcIp, destIp');
    }

    // 提取IP
    const set = new Set();
    result.forEach(function(item) {
      set.add(item.srcIp);
      set.add(item.destIp);
    });
    const ips = Array.from(set);

    // 二维矩阵存储边的关系
    const matrix = new Array(ips.length);
    for (let i = 0; i < matrix.length; i++) {
      matrix[i] = new Array(ips.length).fill(0);
    }

    result.forEach(function(item) {
      matrix[ips.indexOf(item.srcIp)][ips.indexOf(item.destIp)] = item.num;
    });

    return { matrix, ips };
  }

  // 某时间区间的和弦图数据（所有IP的连接关系）
  async getChordAll(startTime, endTime) {
    const { ctx } = this;
    const sTime = new Date(startTime);
    const eTime = new Date(endTime);
    const sql = `SELECT
    firstSeenSrcIp as srcIp,
    firstSeenDestIp as destIp,
    count(*) as num
    FROM netflowa
    WHERE parsedDate > ? AND parsedDate < ?
    GROUP BY firstSeenSrcIp, firstSeenDestIp`;
    ctx.logger.info(sql);
    const result = await this.app.mysql.query(sql, [ sTime, eTime ]);

    // 当数据量过大时，按照子网聚合
    if (result.length > 150) {
      // 清空临时表
      await this.app.mysql.delete('chord');

      for (let i = 0; i < result.length; i++) {
        const item = {
          srcIp: result[i].srcIp.split('.').splice(0, 3).join('.'),
          destIp: result[i].destIp.split('.').splice(0, 3).join('.'),
          num: result[i].num,
        };
        await this.app.mysql.insert('chord', item);
      }

      return await this.app.mysql.query('SELECT srcIp, destIp, count(num) as num FROM chord GROUP BY srcIp, destIp');
    }

    return result;
  }

  // 某时间区间的IP散点图数据
  async getScatter(startTime, endTime) {
    const { ctx } = this;
    const sTime = new Date(startTime);
    const eTime = new Date(endTime);

    const ipModel = {
      ip: '',
      srcConnect: 0,
      srcPayloadBytes: 0,
      srcTotalBytes: 0,
      srcPacketCount: 0,
      destConnect: 0,
      destPayloadBytes: 0,
      destTotalBytes: 0,
      destPacketCount: 0,
    };

    const map = new Map();
    let max = 0;
    // 以源IP统计
    const srcSql = `SELECT
      firstSeenSrcIp as ip,
      count(*) as srcConnect,
      sum(firstSeenSrcPayloadBytes) as srcPayloadBytes,
      sum(firstSeenSrcTotalBytes) as srcTotalBytes,
      sum(firstSeenSrcPacketCount) as srcPacketCount
      FROM netflowa
      WHERE parsedDate > ? AND parsedDate < ?
      GROUP BY firstSeenSrcIp`;
    ctx.logger.info(srcSql);
    const srcResult = await this.app.mysql.query(srcSql, [ sTime, eTime ]);
    srcResult.forEach(function(item) {
      map.set(item.ip, Object.assign({}, ipModel, item));
    });

    // 以目的IP统计
    const destSql = `SELECT
      firstSeenDestIp as ip,
      count(*) as destConnect,
      sum(firstSeenSrcPayloadBytes) as destPayloadBytes,
      sum(firstSeenSrcTotalBytes) as destTotalBytes,
      sum(firstSeenSrcPacketCount) as destPacketCount
      FROM netflowa
      WHERE parsedDate > ? AND parsedDate < ?
      GROUP BY firstSeenDestIp`;
    ctx.logger.info(destSql);
    const destDest = await this.app.mysql.query(destSql, [ sTime, eTime ]);
    destDest.forEach(function(item) {
      map.set(item.ip, Object.assign({}, map.has(item.ip) ? map.get(item.ip) : ipModel, item));
    });

    // 求最大值
    map.forEach(
      function(item) {
        max = (item.srcConnect + item.destConnect) > max ? (item.srcConnect + item.destConnect) : max;
      }
    );

    const X = [];
    const ips = [];
    const weight = [];
    map.forEach(function(item) {
      X.push([ item.srcConnect, item.srcPayloadBytes, item.srcTotalBytes, item.srcPacketCount, item.destConnect, item.destPayloadBytes, item.destTotalBytes, item.destPacketCount ]);
      ips.push(item.ip);
      weight.push((item.srcConnect + item.destConnect) / max);
    });

    // TSN降维
    const model = new TSNE({
      dim: 2,
      perplexity: 30.0,
      earlyExaggeration: 4.0,
      learningRate: 100.0,
      nIter: 1000,
      metric: 'euclidean',
    });

    model.init({
      data: X,
      type: 'dense',
    });
    const Y = model.getOutputScaled();

    // [x, y, ip, 内网0/外网1, weight]
    for (let i = 0; i < Y.length; i++) {
      Y[i][2] = ips[i];
      Y[i][3] = ips[i].split('.')[0] === '172' ? 0 : 1;
      Y[i][4] = weight[i];
    }

    return Y;
  }

  // 某时间区间内与某IP相关联的IP
  async getIps(startTime, endTime, ip) {
    const { ctx } = this;
    const sTime = new Date(startTime);
    const eTime = new Date(endTime);
    const sql = `SELECT
      firstSeenSrcIp as srcIp,
      firstSeenDestIp as destIp,
      count(*) as num
      FROM netflowa
      WHERE parsedDate > ? AND parsedDate < ?
      AND (firstSeenSrcIp = ? OR firstSeenDestIp = ?)
      GROUP BY firstSeenSrcIp, firstSeenDestIp`;
    ctx.logger.info(sql);
    const result = await this.app.mysql.query(sql, [ sTime, eTime, ip, ip ]);

    const map = new Map();
    result.forEach(function(item) {
      const anotherIp = (item.srcIp === ip) ? item.destIp : item.srcIp;
      if (map.has(anotherIp)) {
        map.set(anotherIp, map.get(anotherIp) + item.num);
      } else {
        map.set(anotherIp, item.num);
      }
    });
    return ctx.mapChangeObj(map);
  }
}

module.exports = AnalyzeService;
