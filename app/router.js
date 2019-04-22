'use strict';

module.exports = app => {
  const { router, controller } = app;
  router.get('/entropy', controller.entropy.index);
  router.get('/chord', controller.analyze.chord);
  router.get('/chordall', controller.analyze.chordAll);
  router.get('/scatter', controller.analyze.scatter);
  router.get('/ips', controller.analyze.ips);
};
