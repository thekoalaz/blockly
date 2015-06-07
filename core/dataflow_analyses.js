/**
 * @fileoverview The class that executes the workspace algorithm.
 * @author thekoalaz@gmail.com (Kevin Lim)
 */
'use strict';

goog.provide('Blockly.DataflowAnalyses');

goog.require('Blockly.Block');

Blockly.DataflowAnalyses.reaching_definitions = function (block) {
  var dataflowOut = [];
  var type = block.type;
  if (type == 'variables_set') {
    dataflowOut = block.dataflowIn;
    debugger;
    for (var variable in block.dataflowIn) {
      if (variable == block.getVars()) {
        dataflowOut[variable] = [block.id];
      }
    }
    return dataflowOut;
  }
};

