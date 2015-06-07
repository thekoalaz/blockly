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
    "bottomFunction": ["workspace", "Blockly.DataflowAnalyses.reaching_definitions_bottom(workspace);"] // this is typically the dataflow on entry
  },
  "constant_propagation": {
    "flowFunction": ["block", "Blockly.DataflowAnalyses.constant_propagation_flowFunction(block);"],
    "topFunction": ["workspace", "Blockly.DataflowAnalyses.constant_propagation_latticeTop(workspace);"],
    "bottomFunction": ["workspace", "Blockly.DataflowAnalyses.constant_propagation_latticeBottom(workspace);"]
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

///////////////////////////////////////
///// LATTICE top/bottom function /////
///////////////////////////////////////

Blockly.DataflowAnalyses.reaching_definitions_top = function (workspace) {
  var top = {};
  var variables = Blockly.Variables.allVariables(workspace);
  var blocks = workspace.getAllBlocks();
  var statementBlocks = [];
  for (block in blocks) {
    if (block.isStatement()) statementBlocks.push(block);
  }
  for (variable in variables) {
    top.push({ variable: statementBlocks });
  }
  return top;
};

Blockly.DataflowAnalyses.reaching_definitions_bottom = function (workspace) {
  var bottom = {};
  var variables = Blockly.Variables.allVariables(workspace);
  var blocks = workspace.getAllBlocks();
  for (variable in variables) {
    bottom.push({ variable: [] });
  }
  return bottom;
};

Blockly.DataflowAnalyses.constant_propagation_top = function (workspace) {
  var variables = Blockly.Variables.allVariables(workspace);
  for (variable in variables) {
    top.push({ variable: [] });
  }
  return top;
};

Blockly.DataflowAnalyses.constant_propagation_bottom = function (workspace) {
  var variables = Blockly.Variables.allVariables(workspace);
  for (variable in variables) {
    bottom.push({ variable: "superConstant" }); // we should just check for this condition manually
  }
  return bottom;
};

Blockly.DataflowAnalyses.reaching_definitions_flowFunction = function (block) {
  var dataflowIn;
  var dataflowOut = {};
  var type = block.type;
  var analysis_name = "reaching_definitions";

  if (block.previousConnection.targetBlock() == null) {
    block.dataflowIns[analysis_name] = [];//[analysis_nameJSON[bottom]];
  }

  if (block.dataflowIns[analysis_name] == null) {
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

//////////////////////////
///// Flow functions /////
//////////////////////////

Blockly.DataflowAnalyses.constant_propagation_flowFunction = function (block) {
  var dataflowIn;
  var dataflowOut = {};
  var type = block.type;
  var analysis_name = "constant_propagation";

  if (block.previousConnection.targetBlock() == null) {
    block.dataflowIns[analysis_name] = [];
  }

  if (block.dataflowIns[analysis_name] == null) {
    dataflowIn = block.previousConnection.targetBlock().dataflowOuts[analysis_name];
  }
  else {
    dataflowIn = block.dataflowIns[analysis_name];
  }

  if (type == 'variables_set') {
    dataflowOut = clone(dataflowIn);
    var varBeingSet = block.getFieldValue('VAR');
    var valueBlock = block.getChildren()[0];
    if (valueBlock.type == 'math_number') {
      dataflowOut[varBeingSet] = valueBlock.getFieldValue('NUM');
    }
    block.dataflowOuts[analysis_name] = dataflowOut;
  } else {
    block.dataflowOuts[analysis_name] = clone(dataflowIn);
  }
};