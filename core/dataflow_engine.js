/**
 * @fileoverview The class that executes the workspace algorithm.
 * @author thekoalaz@gmail.com (Kevin Lim)
 */
'use strict';

goog.provide('Blockly.DataflowEngine');

goog.require('Blockly.Block');
goog.require('Blockly.DataflowAnalyses');
goog.require('Blockly.Workspace');

Blockly.DataflowEngine = function () {
  this.definedAnalyses = JSON.parse({'definedAnalyses':[
    { 'blockType': 'variables_set', 'analyses': [] } ]
  });
};

Blockly.DataflowEngine.computeDataflow = function (workspace) {
  var topBlocks = workspace.getTopBlocks(true);
  for (var block, i = 0; block = topBlocks[i]; i++) {
    this.computeDataflowBlock_(block);
    var prev = block.dataFlowOut;
    flow_result += prev.toString();
    flow_result += "\n";
    while(block.nextConnection.targetBlock() != null) {
      block = block.nextConnection.targetBlock();
      this.computeDataflowBlock_(block);
      prev = block.dataFlowOut;
      flow_result += prev.toString();
      flow_result += "\n";
    }
  }
  return flow_result;
};

Blockly.DataflowEngine.prototype.computeDataflowBlock_ = function(block) {
  var type = this.prototypeName;
  var analyses = Object.keys(Block.DataflowAnalyses.analyses);

  for(var analysis, i=0; analysis = analyses[i]; i++) {
    var analysisJSON = Block.DataflowAnalyses.analyses[analysis];
    var analysisFunc = new function(analysisJSON["function"]);
    var dataflowIn = [];
    if(block.previousConnection.targetBlock() == null) {
        block.dataflowIns[analysis] = [analysisJSON[bottom]];
    }

    if(block.dataflowIns[analysis] == null) {
        dataflowIn = block.previousConnection.targetBlock().dataflowOut();
    }
    else {
        dataflowIn = block.dataflowIns[analysis];
    }
    analysisFunc(this, dataflowIn);
  }
};

