'use strict';

const Service = require('../core/BaseService');

class EntropyService extends Service {
  async getEntropy(startTime, endTime) {
    const { ctx } = this;
    const sTime = new Date(startTime);
    const eTime = new Date(endTime);
    const sql = 'SELECT * FROM entropy WHERE parsedDate > ? AND parsedDate < ?';
    ctx.logger.info(sql);
    const list = [];
    let max = 0;
    const result = await this.app.mysql.query(sql, [ sTime, eTime ]);
    result.forEach(function(item) {
      list.push({
        score: item.score, // 异常值
        entropy: {
          srcIp: item.srcIp,
          destIp: item.destIp,
          srcPort: item.srcPort,
          destPort: item.destPort,
          duration: item.duration,
          inToOut: item.inToOut,
        }, // 熵值信息
        time: item.parsedDate, // 时间
      });

      max = Math.max(max, item.score);
    });
    return {
      score: list,
      max,
    };
  }
}

module.exports = EntropyService;
