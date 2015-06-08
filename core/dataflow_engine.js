/**
 * @fileoverview The class that executes the worklist algorithm.
 * @author thekoalaz@gmail.com (Kevin Lim)
 */
'use strict';

goog.provide('Blockly.DataflowEngine');

goog.require('Blockly.Block');
goog.require('Blockly.DataflowAnalyses');
goog.require('Blockly.Workspace');

/** Utility Functions **/
function clone(obj) {
  var target = {};
  for (var i in obj) {
    if (obj.hasOwnProperty(i)) {
      target[i] = obj[i];
    }
  }
  return target;
}

function deepCompare () {
  var i, l, leftChain, rightChain;
  function compare2Objects (x, y) {
    var p;

    // remember that NaN === NaN returns false
    // and isNaN(undefined) returns true
    if (isNaN(x) && isNaN(y) && typeof x === 'number' && typeof y === 'number') {
         return true;
    }

    // Compare primitives and functions.     
    // Check if both arguments link to the same object.
    // Especially useful on step when comparing prototypes
    if (x === y) {
        return true;
    }

    // Works in case when functions are created in constructor.
    // Comparing dates is a common scenario. Another built-ins?
    // We can even handle functions passed across iframes
    if ((typeof x === 'function' && typeof y === 'function') ||
       (x instanceof Date && y instanceof Date) ||
       (x instanceof RegExp && y instanceof RegExp) ||
       (x instanceof String && y instanceof String) ||
       (x instanceof Number && y instanceof Number)) {
        return x.toString() === y.toString();
    }

    // At last checking prototypes as good a we can
    if (!(x instanceof Object && y instanceof Object)) {
        return false;
    }

    if (x.isPrototypeOf(y) || y.isPrototypeOf(x)) {
        return false;
    }

    if (x.constructor !== y.constructor) {
        return false;
    }

    if (x.prototype !== y.prototype) {
        return false;
    }

    // Check for infinitive linking loops
    if (leftChain.indexOf(x) > -1 || rightChain.indexOf(y) > -1) {
         return false;
    }

    // Quick checking of one object beeing a subset of another.
    // todo: cache the structure of arguments[0] for performance
    for (p in y) {
        if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
            return false;
        }
        else if (typeof y[p] !== typeof x[p]) {
            return false;
        }
    }

    for (p in x) {
        if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
            return false;
        }
        else if (typeof y[p] !== typeof x[p]) {
            return false;
        }

        switch (typeof (x[p])) {
            case 'object':
            case 'function':

                leftChain.push(x);
                rightChain.push(y);

                if (!compare2Objects (x[p], y[p])) {
                    return false;
                }

                leftChain.pop();
                rightChain.pop();
                break;

            default:
                if (x[p] !== y[p]) {
                    return false;
                }
                break;
        }
    }
    return true;
  }

  if (arguments.length < 1) {
    return true; //Die silently? Don't know how to handle such case, please help...
    // throw "Need two or more arguments to compare";
  }

  for (i = 1, l = arguments.length; i < l; i++) {
      leftChain = []; //Todo: this can be cached
      rightChain = [];

      if (!compare2Objects(arguments[0], arguments[i])) {
          return false;
      }
  }

  return true;
}


/** Dataflow Engine **/
Blockly.DataflowEngine = function () {
};

Blockly.DataflowEngine.computeDataflow = function (workspace) {
  this.workspace = workspace;
  var analyses = Object.keys(Blockly.DataflowAnalyses.analyses);

  for(var analysis, i=0; analysis = analyses[i]; i++) {
    this.computeAnalysis_(analysis);
  }


  var topBlocks = this.workspace.getTopBlocks(true);
  for (var block, i = 0; block = topBlocks[i]; i++) {
    var worklist = this.createWorklist_(block, null);
    worklist.reverse();
    // TEST CODE
    for (var workblock, j =0; workblock = worklist[j]; j++) {
      console.log(workblock.id.toString() + ": " + JSON.stringify(workblock.dataflowOuts));
    }
  }

  var flow_result = "";
  //  flow_result += JSON.stringify(prev);
  //  flow_result += "\n";

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
      var prev = clone(stmt.dataflowOuts);
      analysisFunc(stmt);
      if(!deepCompare(prev, stmt.dataflowOuts)) {
        if(stmt.getSurroundParent() != null &&
          !stmt.nextConnection.targetBlock() &&
          worklist.indexOf(stmt.getSurroundParent()) == -1) {

          worklist.push(stmt.getSurroundParent());
        }
        var childBlocks = stmt.getChildren;
        for(var childBlock, i = 0; childBlock = childBlocks[i]; i++) {
          if(worklist.indexOf(childBlock) == -1) {
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

