const toposort = function toposort(graph) {
  var complete = new Set();
  var cycleDetect = new Set();
  var unordered = graph.getNodes().map((node) => node.id);
  var ordered = [];
  var hasCycles = false;

  const visit = function visit(nodeId) {
    if (hasCycles || cycleDetect.has(nodeId)) {
      hasCycles = true;
      return;
    }

    if (!complete.has(nodeId)) {
      cycleDetect.add(nodeId);

      var children = graph.getChildren(nodeId);
      children.forEach((child) => {
        visit(child);
      });

      complete.add(nodeId);
      cycleDetect.remove(nodeId);
      ordered.unshift(nodeId);
    }
  }

  while (!hasCycles && unordered.length > 0) {
    var nodeId = unordered.pop();
    if (!complete.has(nodeId)) {
      visit(nodeId);
    }
  }

  return hasCycles ? null : ordered;
}
