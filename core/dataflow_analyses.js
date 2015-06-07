/**
 * @fileoverview The class that executes the workspace algorithm.
 * @author thekoalaz@gmail.com (Kevin Lim)
 */
'use strict';

goog.provide('Blockly.DataflowAnalyses');
goog.require('Blockly.Block');

Blockly.DataflowAnalyses.analyses = {
  "reaching_definitions": {
    "flowFunction": "function(block) { reaching_definitions_flowFunction(block); }",
    "topFunction": "function(workspace) { reaching_definitions_top(workspace); }",
    "bottomFunction": "function(workspace) { reaching_definitions_bottom(workspace); }"
  },
  "constant_propagation": {
    "flowFunction": "function(block) { constant_propagation_flowFunction(block); }",
    "topFunction": "function(workspace) { constant_propagation_top(workspace); }",
    "bottomFunction": "function(workspace) { constant_propagation_bottom(workspace); }"
  }
};

Blockly.DataflowAnalyses.reaching_definitions_flowFunction = function (block) {
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
