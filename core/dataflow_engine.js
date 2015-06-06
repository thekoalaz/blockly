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

Blockly.DataflowEngine.computeDataflow = function(workspace) {
  var print_test = "";
  var topBlocks = workspace.getTopBlocks(true);
  debugger;
  for (var block, i = 0; block = topBlocks[i]; i++) {
      print_test += block.toString();
      print_test += "\n";
      while(block.nextConnection.targetBlock() != null) {
          block = block.nextConnection.targetBlock();
          print_test += block.toString();
          print_test += "\n";
      }
  }
  return print_test;
};

