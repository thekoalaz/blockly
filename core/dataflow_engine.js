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
};

Blockly.DataflowEngine.computeDataflow = function (workspace) {
  var topBlocks = workspace.getTopBlocks(true);
  var flow_result = "";
  for (var block, i = 0; block = topBlocks[i]; i++) {
    this.computeDataflowBlock_(block);
    var prev = block.dataflowOuts;
    flow_result += JSON.stringify(prev);
    flow_result += "\n";
    while(block.nextConnection.targetBlock() != null) {
      block = block.nextConnection.targetBlock();
      this.computeDataflowBlock_(block);
      prev = block.dataflowOuts;
      flow_result += JSON.stringify(prev);
      flow_result += "\n";
    }
  }
  return flow_result;
};

Blockly.DataflowEngine.computeDataflowBlock_ = function(block) {
  var type = this.prototypeName;
  var analyses = Object.keys(Blockly.DataflowAnalyses.analyses);

  for(var analysis, i=0; analysis = analyses[i]; i++) {
    var analysisJSON = Blockly.DataflowAnalyses.analyses[analysis];
    var funcString = analysisJSON["flowFunction"];
    var analysisFunc = new Function(funcString[0], funcString[1]);
    analysisFunc(block);
  }
};

