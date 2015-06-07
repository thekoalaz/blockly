/**
 * @fileoverview The class that executes the workspace algorithm.
 * @author thekoalaz@gmail.com (Kevin Lim)
 */
'use strict';

goog.provide('Blockly.DataflowAnalyses');
goog.require('Blockly.Block');

Blockly.DataflowAnalyses.analyses = {
  "reaching_definitions": {
    "flowFunction": ["block", "Blockly.DataflowAnalyses.reaching_definitions_flowFunction(block);"],
    "topFunction": ["workspace", "Blockly.DataflowAnalyses.reaching_definitions_top(workspace);"],
    "bottomFunction": ["workspace", "Blockly.DataflowAnalyses.reaching_definitions_bottom(workspace);"]
  },
  "constant_propagation": {
    "flowFunction": ["block", "Blockly.DataflowAnalyses.constant_propagation_flowFunction(block);"],
    "topFunction": ["workspace", "Blockly.DataflowAnalyses.constant_propagation_top(workspace);"],
    "bottomFunction": ["workspace", "Blockly.DataflowAnalyses.constant_propagation_bottom(workspace);"]
  }
};

function clone(obj) {
  var target = {};
  for (var i in obj) {
    if (obj.hasOwnProperty(i)) {
      target[i] = obj[i];
    }
  }
  return target;
}

Blockly.DataflowAnalyses.reaching_definitions_flowFunction = function (block) {
  var dataflowIn;
  var dataflowOut = {};
  var type = block.type;
  var analysis_name = "reaching_definitions";

  if(block.previousConnection.targetBlock() == null) {
      block.dataflowIns[analysis_name] = [];//[analysis_nameJSON[bottom]];
  }

  if(block.dataflowIns[analysis_name] == null) {
      dataflowIn = block.previousConnection.targetBlock().dataflowOuts[analysis_name];
  }
  else {
      dataflowIn = block.dataflowIns[analysis_name];
  }

  if (type == 'variables_set') {
    dataflowOut = clone(dataflowIn);
    dataflowOut[block.getVars()] = [block.id];
    block.dataflowOuts[analysis_name] = dataflowOut;
  } else {
    block.dataflowOuts[analysis_name] = clone(dataflowIn);
  }
};

Blockly.DataflowAnalyses.constant_propagation_flowFunction = function (block) {
}
