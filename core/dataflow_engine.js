/**
 * @fileoverview The class that executes the workspace algorithm.
 * @author thekoalaz@gmail.com (Kevin Lim)
 */
'use strict';

goog.provide('Blockly.DataflowEngine');

goog.require('Blockly.Workspace');
goog.require('Blockly.Block');

Blockly.DataflowEngine = function () {
  this.test_ = 5;
};

Blockly.DataflowEngine.prototype.computeDataflow = function(workspace) {
  print_test = '';
  topBlocks = workspace.getTopBlocks(true);
  for (var block, i = 0; child = topBlocks[i]; i++) {
      print_test += block.toString();
      print_test += "\n";
  }
  return print_test;
};

