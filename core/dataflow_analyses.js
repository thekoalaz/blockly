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

    var childBlocks = block.getChildren();
    var valueBlock; // valueBlock is the block being assigned to the variable
    for (var i = 0; i < childBlocks.length; i++) {
      if (!childBlocks[i].isStatement()) {
        valueBlock = childBlocks[i];
        break;
      }
    }
    if (valueBlock.type == 'math_number') {
      dataflowOut[varBeingSet] = Number(valueBlock.getFieldValue('NUM'));
    }
    else if (valueBlock.type == 'math_arithmetic') {
      dataflowOut = Blockly.DataflowAnalyses.evaluateBlock(valueBlock);
    }
    block.dataflowOuts[analysis_name] = dataflowOut;
  } else {
    block.dataflowOuts[analysis_name] = clone(dataflowIn);
  }
};

Blockly.DataflowAnalyses.evaluateBlock = function (inputBlock) {
  var block = inputBlock;
  var children = block.getChildren();
  var blockStack = [block];
  // initialize the stack by going down the "left side of the tree" first
  while (children.length>0) {
    blockStack.push(children[0]);
    block = children[0];
    children = block.getChildren();
  }
  var blockValue = {}; // JSON dictionary that maps from a block's ID to the computed value of it's contents. Parent block's values will be constructed from it's child's values (recursively)
  while (blockStack.length > 0) {
    //debugger;
    var block = blockStack[blockStack.length - 1]; // get the deepest block in the stack and its ID
    var id = block.id;
    if (block.type == 'math_number') {
      blockValue[id] = Number(block.getFieldValue('NUM'));
    }
    else if (block.type == 'math_arithmetic') {
      children = block.getChildren();
      var allChildrenProcessed = true;
      for (var i=0; i < children.length; i++) {
        var child = children[i];
        if (blockValue[child.id] == null) { // check to see that all children have been processed
          blockStack.push(child); // push the next child into the stack and continue pushing along the left of that child's subtree
          block = child;
          children = block.getChildren();
          while (children.length > 0) {
            blockStack.push(children[0]);
            block = children[0];
            children = block.getChildren();
          }
          allChildrenProcessed = false;
          break;
        }
      }
      if (!allChildrenProcessed) continue;
      // otherwise all children are already processed
      var inputs = block.inputList;
      var blockLeft = inputs[0].connection.targetBlock();
      var blockRight = inputs[1].connection.targetBlock();
      var argLeft = blockValue[blockLeft.id];
      var argRight = blockValue[blockRight.id];
      var operator = block.getFieldValue('OP');
      if (operator == 'ADD') blockValue[id] = argLeft + argRight;
      else if (operator == 'MINUS') blockValue[id] = argLeft - argRight;
      else if (operator == 'MULTIPLY') blockValue[id] = argLeft * argRight;
      else if (operator == 'DIVIDE') blockValue[id] = argLeft / argRight;
      else if (operator == 'POWER') blockValue[id] = Math.pow(argLeft, argRight);
      else return null; // This else is for completeness. Really this should never happen, since the above operators are exhaustive
    }
    blockStack.pop();
  }
  return blockValue[inputBlock.id];
};