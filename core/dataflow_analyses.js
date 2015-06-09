/**
 * @fileoverview The class that executes the workspace algorithm.
 * @author thekoalaz@gmail.com (Kevin Lim)
 */
'use strict';

goog.provide('Blockly.DataflowAnalyses');

goog.require('Blockly.Block');
goog.require('Blockly.utils');

Blockly.DataflowAnalyses.SuperConstant = function () { };
Blockly.DataflowAnalyses.SuperString = function () { };
Blockly.DataflowAnalyses.Unknown = function () { };

Blockly.DataflowAnalyses.analyses = {
  /*"reaching_definitions": {
    "flowFunction": ["block", "Blockly.DataflowAnalyses.reaching_definitions_flowFunction(block);"],
    "topFunction": ["workspace", "Blockly.DataflowAnalyses.reaching_definitions_top(workspace);"],
    "bottomFunction": ["workspace", "Blockly.DataflowAnalyses.reaching_definitions_bottom(workspace);"] // this is typically the dataflow on entry
  }
  ,*/
  "constant_propagation": {
    "flowFunction": ["block", "Blockly.DataflowAnalyses.constant_propagation_flowFunction(block);"],
    "topFunction": ["workspace", "Blockly.DataflowAnalyses.constant_propagation_latticeTop(workspace);"],
    "bottomFunction": ["workspace", "Blockly.DataflowAnalyses.constant_propagation_latticeBottom(workspace);"]
  }
};


Blockly.DataflowAnalyses.getDataflowIn = function(block, analysis, bottom) {
  var dataflowIn;

  if (block.previousConnection.targetBlock() == null) {
    dataflowIn = bottom;
  }
  else if (Blockly.deepCompare(block.dataflowIns[analysis],{})) {
    dataflowIn = block.previousConnection.targetBlock().dataflowOuts[analysis];
  }
  else {
    dataflowIn = block.dataflowIns[analysis];
  }
  return Blockly.clone(dataflowIn);
};

Blockly.DataflowAnalyses.dataInChanged = function (block, analysis, dataflowIn) {
  if (Blockly.deepCompare(block.prevDataIns[analysis], dataflowIn)) return false;
  else return true;
};


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
    bottom[variable] = [];
  }
  return bottom;
};

Blockly.DataflowAnalyses.constant_propagation_top = function (workspace) {
  var variables = Blockly.Variables.allVariables(workspace);
  for (variable in variables) {
    top[variable] = [];
  }
  return top;
};

Blockly.DataflowAnalyses.constant_propagation_bottom = function (workspace) {
  var variables = Blockly.Variables.allVariables(workspace);
  for (variable in variables) {
    bottom[variable] = new Blockly.DataflowAnalyses.SuperConstant; // we should just check for this condition manually
  }
  return bottom;
};

Blockly.DataflowAnalyses.reaching_definitions_flowFunction = function (block) {
  var dataflowOut = {};
  var type = block.type;
  var analysis = "reaching_definitions";

  var dataflowIn = this.getDataflowIn(block, analysis, {});

  if (type == 'variables_set') {
    dataflowOut = dataflowIn;
    dataflowOut[block.getVars()] = [block.id];
  }
  else if (type == 'controls_if') {
    var dataflowInChanged = Blockly.deepCompare(block.prevDataIns[analysis], dataflowIn);
    block.prevDataIns = dataflowIn;
    var inputs = block.inputList;
    var entryBlocks = [];
    for (var i = 0; i < inputs.length; i++) {
      var inputBlock = inputs[i].connection.targetBlock();
      var inputField = inputs[i].name;
      var inputFieldType = inputField.substring(0, 2);
      if (inputFieldType == 'DO' || inputFieldType == "EL") {
        inputBlock.dataflowIns[analysis] = dataflowIn;
        entryBlocks.push(inputBlock);
      }
    }
    if (dataflowInChanged) dataflowOut = {};
    // initiate merging of endBlock dataflowOuts
    var endBlocks = [];
    for (var entryBlock, i = 0; entryBlock = entryBlocks[i]; i++) {
      endBlocks.push(entryBlock.getEndBlock());
    }
    dataflowOut = Blockly.clone(endBlocks[0].dataflowOuts[analysis]);
    var variablesOut = Object.keys(dataflowOut);
    for (var i = 1; i < endBlocks.length; i++) {
      var data = endBlocks[i].dataflowOuts[analysis];
      if (data == null) continue;
      var variables = Object.keys(data);
      for (var variable, j = 0; variable = variables[j]; j++) {
        var currentRDs = dataflowOut[variable];
        var addedRDs = data[variable];
        if (currentRDs == null) dataflowOut[variable] = addedRDs;
        else dataflowOut[variable] = Blockly.arrayUnion(currentRDs, addedRDs);
      }
    }
  }
  else if (type == 'controls_whileUntil') {
    var dataflowInChanged = Blockly.deepCompare(block.prevDataIns[analysis], dataflowIn);
    block.prevDataIns[analysis] = Blockly.clone(dataflowIn);
    var children = block.getChildren();
    var bodyEntryBlock = null;
    for (var child, i = 0; child = children[i];i++) {
      if (child.isStatement()) {
        bodyEntryBlock = child;
        break;
      }
    }
    if (bodyEntryBlock == null) dataflowOut = dataflowIn;
    else {
      var bodyEndBlock = bodyEntryBlock.getEndBlock();
      dataflowOut = bodyEndBlock.dataflowOuts[analysis];
    } // finally, merge dataflowOut with dataflowIn

    var variableIns = Object.keys(dataflowIn);
    var variableOuts = Object.keys(dataflowOut);
    for (variable, i = 0; variable = variableOuts[i]; i++) {
      var currentRDs = dataflowIn[variable];
      var addedRDs = dataflowOut[variable];
      if (currentRDs == null) dataflowIn[variable] = addedRDs;
      else dataflowIn[variable] = Blockly.arrayUnion(currentRDs, addedRDs);
    }
    bodyEntryBlock.dataflowIns[analysis] = dataflowIn;
    if (Blockly.deepCompare(dataflowIn, block.dataflowIns[analysis])) dataflowOut = dataflowIn;
    else {
      block.dataflowIns[analysis] = dataflowIn;
    }
    if (dataflowInChanged) dataflowOut = {};
  }
  else {
    block.dataflowOuts[analysis] = dataflowIn;
  }
  block.dataflowOuts[analysis] = dataflowOut;
};

///////////////////////////////////////////////
///// Constant Propagation Flow Functions /////
///////////////////////////////////////////////

Blockly.DataflowAnalyses.constant_propagation_flowFunction = function (block) {
  var dataflowIn;
  var dataflowOut = {};
  var type = block.type;
  var analysis = "constant_propagation";

  dataflowIn = this.getDataflowIn(block, analysis, {});

  if (type == 'variables_set') {
    var childBlocks = block.getChildren();
    var varBeingSet = block.getVars();
    var valueBlock; // valueBlock is the block being assigned to the variable
    for (var i = 0; i < childBlocks.length; i++) {
      if (!childBlocks[i].isStatement()) {
        valueBlock = childBlocks[i];
        break;
      }
    }
    var varDataflow = Blockly.DataflowAnalyses.evaluateBlock(valueBlock, dataflowIn);
    dataflowOut = Blockly.clone(dataflowIn);
    dataflowOut[varBeingSet] = varDataflow;
  }
  else if (type == 'controls_if') {
    var dataflowInChanged = Blockly.deepCompare(block.prevDataIns[analysis], dataflowIn);
    block.prevDataIns = dataflowIn;
    var inputs = block.inputList;
    var fieldIndex_condBodyBlocks = {};
    for (var i = 0; i < inputs.length; i++) {
      var inputBlock = inputs[i].connection.targetBlock();
      var inputField = inputs[i].name;
      var inputFieldType = inputField.substring(0, 2);
      var inputFieldIndex = inputField.substring(2);
      if (fieldIndex_condBodyBlocks[inputFieldIndex] == null) fieldIndex_condBodyBlocks[inputFieldIndex] = [null, null];
      if (inputFieldType == 'IF') {
        fieldIndex_condBodyBlocks[inputFieldIndex][0] = inputBlock;
      }
      else {
        inputBlock.dataflowIns[analysis] = Blockly.clone(dataflowIn); // initialize first nested Body blocks' dataFlowIns['constant_propagation']
        fieldIndex_condBodyBlocks[inputFieldIndex][1] = inputBlock;
      }
    }
    var nextDataflowIn; // what the dataFlow for the previous bodyblock would have been had it's corresponding conditional been negated
    var fieldIndices = Object.keys(fieldIndex_condBodyBlocks);
    for (var fieldIndex, i = 0; fieldIndex = fieldIndices[i]; i++) {
      var condBlock = fieldIndex_condBodyBlocks[fieldIndex][0];
      var bodyBlock = fieldIndex_condBodyBlocks[fieldIndex][1];
      if (bodyBlock == null) continue;
      if (i > 0) bodyBlock.dataflowIns[analysis] = nextDataflowIn;
      if (fieldIndex == 'SE') break;
      if (condBlock == null || condBlock.type != 'logic_compare') {
        var variables = Object.keys(dataflowIn);
        for (var variable, j = 0; variable = variables[j]; j++) {
          bodyBlock.dataflowIns[analysis][variable] = null;
          nextDataflowIn = Blockly.clone(bodyBlock.dataflowIns[analysis]);
        }
        continue;
      }
      // otherwise condition has type 'logic_compare'. We only handle cases for == and !=
      var comparisonOperator = condBlock.getFieldValue('OP');
      if (comparisonOperator != 'EQ' && comparisonOperator != 'NEQ') {
        var variables = Object.keys(dataflowIn);
        for (var variable, j = 0; variable = variables[j]; j++) {
          bodyBlock.dataflowIns[analysis][variable] = null;
          nextDataflowIn = Blockly.clone(bodyBlock.dataflowIns[analysis]);
        }
        continue;
      }
      var compareBlockInputs = condBlock.inputList;
      var blockLeft = compareBlockInputs[0].connection.targetBlock();
      var blockRight = compareBlockInputs[1].connection.targetBlock();
      if (blockLeft.type == 'variables_get' || blockRight.type == 'variables_get') {
        var variableBlock = blockLeft;
        var valueBlock = blockRight;
        if (blockRight.type == 'variables_get') {
          variableBlock = blockRight;
          valueBlock = blockLeft;
        }
        var variable = variableBlock.getFieldValue('VAR');
        var varDataflowIn = bodyBlock.dataflowIns[analysis][variable];
        var varDataflowEQ = Blockly.DataflowAnalyses.evaluateBlock(valueBlock, bodyBlock.dataflowIns[analysis]);
        var varDataflowNEQ = varDataflowIn;
        if (varDataflowIn == Blockly.DataflowAnalyses.Unknown || varDataflowIn == Blockly.DataflowAnalyses.SuperConstant) varDataflowNEQ = null;
        else if (varDataflowIn == varDataflowEQ) { // x=5, but the check is (x!=5)
          varDataflowNEQ = null;
        }
        else { // otherwise we don't need to change the constant prop for "variable x" on the NEQ branch
          varDataflowNEQ = varDataflowIn;
        }
        if (condBlock.getFieldValue('OP') == 'EQ') {
          bodyBlock.dataflowIns[analysis][variable] = varDataflowEQ;
          nextDataflowIn = Blockly.clone(bodyBlock.dataflowIns[analysis]);
          nextDataflowIn[variable] = varDataflowNEQ;
        }
        else {
          bodyBlock.dataflowIns[anlaysis_name][variable] = varDataflowNEQ;
          nextDataflowIn = Blockly.clone(bodyBlock.dataflowIns[analysis]);
          nextDataflowIn[variable] = varDataflowEQ;
        }
      }
    }
    // initiate merging of dataflowOuts
    if (dataflowInChanged) dataflowOut = {};
    var bodyEndBlocks = [];
    for (var fieldIndex, i = 0; fieldIndex = fieldIndices[i]; i++) {
      var bodyBlock = fieldIndex_condBodyBlocks[fieldIndex][1];
      if (bodyBlock != null) bodyEndBlocks.push(bodyBlock.getEndBlock());
    }
    dataflowOut = Blockly.clone(bodyEndBlocks[0].dataflowOuts[analysis]);
    var variablesOut = Object.keys(dataflowOut);
    for (var i = 1; i < bodyEndBlocks.length; i++) {
      var data = bodyEndBlocks[i].dataflowOuts[analysis];
      if (data == null) continue;
      var variables = Object.keys(data);
      for (var variable, j = 0; variable = variables[j]; j++) {
        if (variablesOut.indexOf(variable) < 0) {
          variablesOut.push(variable);
          dataflowOut[variable] = null;
        }
        else if (dataflowOut[variable] == null || data[variable] == null || dataflowOut[variable] != data[variable]) dataflowOut[variable] = null;
        else dataflowOut[variable] = data[variable];
      }
    }
  }
  else if (type == 'controls_whileUntil') {
    var dataflowInChanged = Blockly.deepCompare(block.prevDataIns[analysis], dataflowIn);
    block.prevDataIns[analysis] = Blockly.clone(dataflowIn);
    var children = block.getChildren();
    var bodyEntryBlock = null;
    for (var child, i = 0; child = children[i];i++) {
      if (child.isStatement()) {
        bodyEntryBlock = child;
        break;
      }
    }
    if (bodyEntryBlock == null) dataflowOut = Blockly.clone(dataflowIn);
    else {
      var bodyEndBlock = bodyEntryBlock.getEndBlock();
      dataflowOut = bodyEndBlock.dataflowOuts[analysis];
    } // finally, merge dataflowOut with dataflowIn
    if (dataflowOut != null) {
      var variableIns = Object.keys(dataflowIn);
      var variableOuts = Object.keys(dataflowOut);
      for (variable, i = 0; variable = variableOuts[i]; i++) {
        if (variableIns.indexOf(variable) < 0) {
          dataflowIn[variable] = null;
        }
        else if (dataflowIn[variable] != dataflowOut[variable]) {
          dataflowIn[variable] = null;
        }
      }
      bodyEntryBlock.dataflowIns[analysis] = Blockly.clone(dataflowIn);
      if (Blockly.deepCompare(dataflowIn, block.dataflowIns[analysis])) dataflowOut = Blockly.clone(dataflowIn);
      else {
        block.dataflowIns[analysis] = Blockly.clone(dataflowIn);
      }
      if (dataflowInChanged) dataflowOut = {};
    }
  }
  else {
    dataflowOut = Blockly.clone(dataflowIn);
  }
  block.dataflowOuts[analysis] = dataflowOut;
};




Blockly.DataflowAnalyses.evaluateBlock = function (inputBlock, dataflowIn) { // dataflowIn should take in dataflowIns['constant_propagation']
  var block = inputBlock;
  var children = block.getChildren();
  var blockStack = [block];
  // initialize the stack by going down the "left side of the tree" first
  while (children.length > 0) {
    blockStack.push(children[0]);
    block = children[0];
    children = block.getChildren();
  }
  var blockValue = {}; // JSON dictionary that maps from a block's ID to the computed value of it's contents. Parent block's values will be constructed from it's child's values (recursively)
  while (blockStack.length > 0) {
    var block = blockStack[blockStack.length - 1]; // get the deepest block in the stack and its ID
    var id = block.id;
    // VARIABLE-GETTING block
    if (block.type == 'variables_get') {
      var variable = block.getFieldValue('VAR');
      var variableValue = dataflowIn[variable];
      if (variableValue == null) blockValue[id] = new Blockly.DataflowAnalyses.Unknown;
      else if (variableValue instanceof Blockly.DataflowAnalyses.SuperConstant) blockValue[id] = new Blockly.DataflowAnalyses.SuperConstant;
      else if (variableValue instanceof Blockly.DataflowAnalyses.SuperString) blockValue[id] = new Blockly.DataflowAnalyses.SuperString;
      else blockValue[id] = variableValue;
    }
    // MATH blocks
    else if (block.type == 'math_number') {
      blockValue[id] = Number(block.getFieldValue('NUM'));
    }
    else if (block.type == 'math_arithmetic') {
      children = block.getChildren();
      for (var i = 0; i < children.length; i++) { // first check whether either of the children have undefined dataflow (if so, then the blockValue is "unkonwn" and we need not do more processing)
        var child = children[i];
        if (blockValue[child.id] instanceof Blockly.DataflowAnalyses.Unknown) {
          blockValue[id] = new Blockly.DataflowAnalyses.Unknown;
          blockStack.pop();
          continue;
        }
      } // at this point, neither of the blocks have undefined dataflow, so we make sure both children have been processed
      var allChildrenProcessed = true;
      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        if (blockValue[child.id] == null) { // if one of the argument blocks hasn't yet been processed, then...
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
      // otherwise both children are already processed, so we evaluate the arithmetic expression
      var inputs = block.inputList;
      var blockLeft = inputs[0].connection.targetBlock();
      var blockRight = inputs[1].connection.targetBlock();
      var argLeft = blockValue[blockLeft.id];
      var argRight = blockValue[blockRight.id];
      var operator = block.getFieldValue('OP');
      if (argLeft instanceof Blockly.DataflowAnalyses.Unknown || argRight instanceof Blockly.DataflowAnalyses.Unknown) blockValue[id] = new Blockly.DataflowAnalyses.Unknown;
      else if (argLeft instanceof Blockly.DataflowAnalyses.SuperConstant || argRight instanceof Blockly.DataflowAnalyses.SuperConstant) {
        if (operator == 'ADD' || operator == 'MINUS') blockValue[id] = new Blockly.DataflowAnalyses.SuperConstant;
        else if (operator == 'MULTIPLY') {
          if (argLeft == 0 || argRight == 0) blockValue[id] = 0;
          else blockValue[id] = new Blockly.DataflowAnalyses.SuperConstant;
        }
        else if (operator == 'DIVIDE') {
          if (!(argRight instanceof Blockly.DataflowAnalyses.SuperConstant) && argRight != 0) blockValue[id] = new Blockly.DataflowAnalyses.SuperConstant;
          else blockValue[id] = new Blockly.DataflowAnalyses.Unknown;
        }
        else if (operator == 'POWER') {
          if (argRight == 0) blockValue[id] = 1; // A few tests reveal that 0^0=1 in Blockly
          else blockValue[id] = new Blockly.DataflowAnalyses.Unknown;
        }
      }
      else {
        if (operator == 'ADD') blockValue[id] = argLeft + argRight;
        else if (operator == 'MINUS') blockValue[id] = argLeft - argRight;
        else if (operator == 'MULTIPLY') blockValue[id] = argLeft * argRight;
        else if (operator == 'DIVIDE') blockValue[id] = argLeft / argRight;
        else if (operator == 'POWER') blockValue[id] = Math.pow(argLeft, argRight);
      }
    }
    else if (block.type == 'math_single') {
      var operator = block.getFieldValue('OP');
      var arg = blockValue[block.getChildren()[0].id];
      if (arg instanceof Blockly.DataflowAnalyses.Unknown) blockValue[id] = new Blockly.DataflowAnalyses.Unknown;
      else if (arg instanceof Blockly.DataflowAnalyses.SuperConstant) {
        if (operator == 'ABS' || operator == 'NEG') blockValue[id] = new Blockly.DataflowAnalyses.SuperConstant;
        else blockValue[id] = new Blockly.DataflowAnalyses.Unknown;
      }
      else {
        if (operator == 'ROOT') blockValue[id] = Math.sqrt(arg);
        else if (operator == 'ABS') blockValue[id] = Math.abs(arg);
        else if (operator == 'NEG') blockValue[id] = -arg;
        else if (operator == 'LN') blockValue[id] = Math.log(arg);
        else if (operator == 'LOG10') blockValue[id] = Math.log(arg) / Math.log(10);
        else if (operator == 'EXP') blockValue[id] = Math.exp(arg);
        else if (operator == 'POW10') blockValue[id] = Math.pow(10, arg);
      }
    }
    else if (block.type == 'math_trig') {
      var operator = block.getFieldValue('OP');
      var arg = blockValue[block.getChildren()[0].id];
      if (arg instanceof Blockly.DataflowAnalyses.Unknown || arg instanceof Blockly.DataflowAnalyses.SuperConstant) blockValue[id] = new Blockly.DataflowAnalyses.Unknown;
      else {
        if (operator == 'SIN') blockValue[id] = Math.sin(arg);
        else if (operator == 'COS') blockValue[id] = Math.cos(arg);
        else if (operator == 'TAN') blockValue[id] = Math.tan(arg);
        else if (operator == 'ASIN') {
          if (Math.abs(arg) <= 1) {
            blockValue[id] = Math.asin(arg);
          }
          else blockValue[id] = new Blockly.DataflowAnalyses.Unknown;
        }
        else if (operator == 'ACOS') {
          if (Math.abs(arg) <= 1) {
            blockValue[id] = Math.acos(arg);
          }
          else blockValue[id] = new Blockly.DataflowAnalyses.Unknown;
        }
        else if (operator == 'ATAN') blockValue[id] = Math.atan(arg);
      }
    }
    // TEXT blocks
    else if (block.type == 'text') {
      blockValue[id] = block.getFieldValue('TEXT');
    }
    else if (block.type == 'text_length') {
      var arg = blockValue[block.getChildren()[0].id];
      if (arg instanceof Blockly.DataflowAnalyses.Unknown || arg instanceof Blockly.DataflowAnalyses.SuperString) blockValue[id] = new Blockly.DataflowAnalyses.Unknown;
      else blockValue[id] = arg.length;
    }
    else if (block.type == 'text_join') {
      children = block.getChildren();
      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        if (blockValue[child.id] instanceof Blockly.DataflowAnalyses.Unknown) {
          blockValue[id] = new Blockly.DataflowAnalyses.Unknown;
          blockStack.pop();
          continue;
        }
      }
      var allChildrenProcessed = true;
      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        if (blockValue[child.id] == null) {
          blockStack.push(child);
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
      // If we get to this point, proceed with string concatenation
      var inputs = block.inputList;
      var concatenation = '';
      var indexOfLastSuperString = -1; // flag for whether or not all args are superStrings
      for (var i = 0; i < inputs.length; i++) {
        var arg = blockValue[inputs[i].connection.targetBlock().id];
        if (arg instanceof Blockly.DataflowAnalyses.Unknown) {
          concatenation = new Blockly.DataflowAnalyses.Unknown;
          break;
        }
        else if (arg instanceof Blockly.DataflowAnalyses.SuperConstant) {
          concatenation = new Blockly.DataflowAnalyses.Unknown;
          break;
        }
        else if (arg instanceof Blockly.DataflowAnalyses.SuperString) {
          if (indexOfLastSuperString==i-1) {
            concatentation = new Blockly.DataflowAnalyses.SuperString;
            indexOfLastSuperString = i;
          }
          else {
            concatenation = new Blockly.DataflowAnalyses.Unknown;
            break;
          }
        }
        else concatenation += arg.toString();
      }
      blockValue[id] = concatenation;
    }
    blockStack.pop();
  }
  if (blockValue[inputBlock.id] instanceof Blockly.DataflowAnalyses.Unknown) return null;
  else return blockValue[inputBlock.id];
};

