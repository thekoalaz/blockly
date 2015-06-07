/**
 * @fileoverview The class that executes the workspace algorithm.
 * @author thekoalaz@gmail.com (Kevin Lim)
 */
'use strict';

goog.provide('Blockly.DataflowEngine');

goog.require('Blockly.Workspace');
goog.require('Blockly.Block');
goog.require('Blockly.DataflowAnalyses');

Blockly.DataflowEngine = function () {
  this.definedAnalyses = JSON.parse({'definedAnalyses':[
    { 'blockType': 'variables_set', 'analyses': [] } ]
  });
};

Blockly.DataflowEngine.dummy = function () { return 0; };

Blockly.DataflowEngine.computeDataflow = function (workspace) {
  var topBlocks = workspace.getTopBlocks(true);
  var firstBlock = topBlocks[0];
  firstBlock.dataflowIn = { "item": [123456789] };
  var dataOut = Blockly.DataflowAnalyses.reaching_definitions(firstBlock);
  var flow_result = dataOut;
  return flow_result;
};