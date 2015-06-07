/**
 * @fileoverview The class that executes the workspace algorithm.
 * @author thekoalaz@gmail.com (Kevin Lim)
 */
'use strict';

goog.provide('Blockly.DataflowAnalyses');

Blockly.DataflowEngine.prototype.union = function(left,right) {
    var obj = {};
    for (var i = left.length-1; i >= 0; -- i) obj[left[i]] = left[i];
    for (var i = right.length-1; i >= 0; -- i) obj[right[i]] = right[i];
    var res = [];
    for (var k in obj) res.push(obj[k]);
    return res;
};

Blockly.DataflowEngine.prototype.intersection = function(left,right) {
    left.filter(
        function(n) {
            return right.indexOf(n) != -1
        }
    );
};

var latticeTop = JSON.parse({
    'latticeTop': [
        {
            'analysis': 'reaching_definitions',
            'top': top = function (block) {
                var root = block.getRootBlock();
                var variables = Blockly.Variables.allVariables(root);
                var allBlocks = root.getAllBlocks();
                var statements = [];
                for (var i = 0; i < allBlocks.length; i++) {
                    if (allBlocks[i].isStatement()) statements.push(allBlocks[i]);
                }
                var res = [];
                for (var i = 0; i < variables.length; i++) {
                    var rd = { 'variable': variables[i], 'data': [] };
                    for (var j = 0; j < statements.length; j++) rd.definitions.push(statements[j]);
                    res.push(rd);
                }
                return JSON.parse({ 'dataflow': res });
            }
        },
        {
            'analysis': 'constant_propagation',
            'top': top = function (block) {
                var root = block.getRootBlock();
                var variables = Blockly.Variables.allVariables(root);
                var res = [];
                for (var i = 0; i < variables.length; i++) {
                    var rd = { 'variable': variables[i], 'data': [] };
                }
                return JSON.parse({ 'dataflow': res });
            }
        }
    ]
});

var latticeBottom = JSON.parse({
    'latticeBottom': [
    {
        'analysis': 'reaching_definitions',
        'bottom': bottom = function (block) {
            var root = block.getRootBlock();
            var variables = Blockly.Variables.allVariables(root);
            var res = [];
            for (var i = 0; i < variables.length; i++) {
                var rd = { 'variable': variables[i], 'data': [] };
            }
            return JSON.parse({ 'dataflow': res });
        }
    },
    {
        'analysis': 'constant_propagation',
        'bottom': bottom = function (block) {
            var root = block.getRootBlock();
            var variables = Blockly.Variables.allVariables(root);
            var res = [];
            for (var i = 0; i < variables.length; i++) {
                var rd = { 'variable': variables[i], 'data': [0, 1] };
            }
            return JSON.parse({ 'dataflow': res });
        }
    }
    ]
});

var latticeJoin = JSON.parse({
    'latticeJoin': [
        { 'analysis': 'reaching_definitions', 'join': union },
        { 'analysis': 'constant_propagation', 'join': intersection }
    ]
}); // This just returns the MERGE function

var latticeMeet = JSON.parse({
    'latticeMeet': [
        { 'analysis': 'reaching_definitions', 'meet': intersection },
        { 'analysis': 'constant_propagation', 'meet': union }
    ]
});

