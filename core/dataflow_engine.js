/**
 * @fileoverview The class that executes the worklist algorithm.
 * @author thekoalaz@gmail.com (Kevin Lim)
 */
'use strict';

goog.provide('Blockly.DataflowEngine');

goog.require('Blockly.Block');
goog.require('Blockly.DataflowAnalyses');
goog.require('Blockly.utils');
goog.require('Blockly.Workspace');

/** Dataflow Engine **/
Blockly.DataflowEngine = function () {
};

Blockly.DataflowEngine.clearAllDataflows = function (workspace) {
  var allBlocks = workspace.getAllBlocks();
  var analyses = Object.keys(Blockly.DataflowAnalyses.analyses);

  for (var block, i = 0; block = allBlocks[i]; i++) {
    block.dataflowIns = {};
    block.dataflowOuts = {};
    for(var analysis, j=0; analysis = analyses[j]; j++) {
      block.dataflowIns[analysis] = {};
      block.dataflowOuts[analysis] = {};
    }
  }
};

Blockly.DataflowEngine.computeDataflow = function (workspace) {
  Blockly.DataflowEngine.clearAllDataflows(workspace);

  this.workspace = workspace;
  var analyses = Object.keys(Blockly.DataflowAnalyses.analyses);

  for(var analysis, i=0; analysis = analyses[i]; i++) {
    this.computeAnalysis_(analysis);
  }


  var topBlocks = this.workspace.getTopBlocks(true);
  for (var block, i = 0; block = topBlocks[i]; i++) {
    var worklist = this.createWorklist_(block, null);
    worklist.reverse();
  }

  var flow_result = "";
  return flow_result;
};

Blockly.DataflowEngine.computeAnalysis_ = function(analysis) {
  var analysisJSON = Blockly.DataflowAnalyses.analyses[analysis];
  var funcString = analysisJSON["flowFunction"];
  var analysisFunc = new Function(funcString[0], funcString[1]);

  var topBlocks = this.workspace.getTopBlocks(true);
  for (var block, i = 0; block = topBlocks[i]; i++) {
    var worklist = this.createWorklist_(block, null);

    while(worklist.length != 0){
      var worklist_id = this.blockIds_(worklist);
      console.log(worklist_id);
      var stmt = worklist.pop();
      var prevOut = Blockly.clone(stmt.dataflowOuts);
      analysisFunc(stmt);

      
      console.log(Blockly.clone(Blockly.Block.getById(3, this.workspace).dataflowOuts["reaching_definitions"]));
      console.log(Blockly.clone(Blockly.Block.getById(7, this.workspace).dataflowIns["reaching_definitions"]));

      if (!Blockly.deepCompare(prevOut, stmt.dataflowOuts)) {
        if(stmt.getSurroundParent() != null &&
          !stmt.nextConnection.targetBlock() &&
          worklist.indexOf(stmt.getSurroundParent()) == -1) {

          worklist.push(stmt.getSurroundParent());
        }
        var childBlocks = stmt.getChildren();
        for(var childBlock, i = 0; childBlock = childBlocks[i]; i++) {
          if(childBlock.isStatement() && worklist.indexOf(childBlock) == -1) {
            worklist.push(childBlock);
          }
        }
      }
    }
  }

};

/**
 *  Creates Depth First Post Order traversal of the program.
 */
Blockly.DataflowEngine.createWorklist_ = function(block) {
  var worklist = [];

  while(block != null) {
    worklist.push(block);
    var to_visit = worklist[worklist.length-1];
    var children = this.getChildStatements_(to_visit);
    if(children.length > 0) {
      worklist.push.apply(worklist, children);
    }
    var block = block.nextConnection.targetBlock();
  }

  worklist.reverse();

  return worklist;
};

Blockly.DataflowEngine.getChildStatements_ = function(block) {
  var childBlocks = block.getChildren();
  var childWorklist = [];
  for (var child, i = 0; child = childBlocks[i]; i++) {
    if(child.isStatement() &&
      child != block.nextConnection.targetBlock()) {

      var curChildWorklist = this.createWorklist_(child, block);
      curChildWorklist.reverse();
      var curChildWorklist_id = this.blockIds_(curChildWorklist);
      childWorklist.push.apply(childWorklist, curChildWorklist);
      var childWorklist_id = this.blockIds_(childWorklist);
    }
  }
  return childWorklist;
};

Blockly.DataflowEngine.blockIds_ = function(blocklist) {
  return blocklist.map(function(block) { return block.id; });
};

