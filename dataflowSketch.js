/**
  Skeleton actions needed to support on Dataflow Graph:
  * Insert a new node.
  * Remove a new node.
  * Connect a port to another.
  * Disconnect a port to another.
  * Change the default value on a port.
  * Compute the graph.
  * Accept multiple inputs (with list match)

  Not done:
  * Multiple inputs without list matching
  * Set up basic build system with:
    * Framework, ESLint, Tests
  * Collapse subset of nodes.

  Assume nodes are provided externally.
  * Clean up/improve API?
  * Add tests.
  * Set up actions and skeleton UIs for Node, Connector and Graph.
**/

/*
class Graph {
  _nodes;
  _sort();

  insertNode();
  removeNode();
  compute();
}

class Node {
  useCrossProduct;

  _inputs; // {paramId, {values: dynamic, connections: [{id: string, paramId: string}]}}
  _outputs; // {paramId, {values: dynamic, connections: [{id: string, paramId: string}]}}
  _transform;

  // sample inputs
  {
    angle: {
      value: 0,
      connections: [
        {id: 20, paramId: angle}
      ]
    },
    width: {
      value: 100,
      connections: [
        {id: 31, paramId: number},
        {id: 25, paramId: dimension}
      ]
    }
  }

  connect(target, paramType);
  disconnect(target, paramType);

  updateDefault(paramType, value);
  compute();
}
*/

const nextId = (function makeNextId() {
  let counter = 0;
  return (prefix = '') => prefix + counter++;
})();

class Graph {
  constructor() {
    this.id = nextId();
    this._nodes = {};
  }

  toposort() {
    let visited = new Set();
    let cycleDetecting = new Set();

    let unordered = this.nodes;
    let ordered = [];
    let hasCycles = false;

    const visit = (node) => {
      if (hasCycles || cycleDetecting.has(node)) {
        hasCycles = true;
        return;
      }

      if (!visited.has(node)) {
        cycleDetecting.add(node);

        let children = node.getConnected();
        children.forEach((child) => {
          visit(child);
        });

        visited.add(node);
        cycleDetecting.remove(node);
        ordered.push(node);
      }
    }

    while (!hasCycles && ordered.length < this.nodes.length) {
      let index = 0;
      let node = this.nodes[index];
      if (!visited.has(node)) {
        visit(node);
      }
      index += 1;
    }

    return hasCycles ? null : ordered.reverse();
  }

  compute() {
    let nodes = this.toposort();
    nodes.forEach((node) => {
      node.compute();
    });
  }

  insertNode(node) {
    this._nodes[node.id] = node;
    node.graph = this;
  }

  removeNode(node) {
    delete this._nodes[node.id];
    node.graph = null;
  }

  getNodeById(id) {
    return this._nodes[id];
  }
  get nodes() {
    return Object.keys(this._nodes).map((key) => this._nodes[key]);
  }
}

class Node {
  constructor(inputs, outputs, transform) {
    this.id = nextId();
    this.useCrossProduct = false;
    this.graph = null;

    this._inputs = inputs;
    this._outputs = outputs;
    this._transform = transform;
  }

  connect(paramId, target, targetParamId) {
    if (!this.isConnected(target, targetParamId)) {
      let outConnections = this._outputs[paramId].connections;
      outConnections.push({
        id: target.id,
        paramId: targetParamId
      });

      let inConnections = target._inputs[targetParamId].connections;
      inConnections.push({
        id: this.id,
        paramId: paramId
      });
    }
  }

  disconnect(paramId, target, targetParamId) {
    let output = this._outputs[paramId];
    output.connections = output.connections.filter((connection) => {
      return connection.id !== target.id
        && connection.paramId !== targetParamId;
    });

    let input = target._inputs[targetParamId];
    input.connections = input.connections.filter((connection) => {
      return connection.id !== this.id && connection.paramId !== paramId;
    });
  }

  isConnected(target, targetParamId) {
    return Object.keys(this._outputs).some((output) => {
      return output.connections.some((connection) => {
        return connection.id == target.id
          && connection.paramId == targetParamId;
      });
    });
  }

  getConnected() {
    let connectedIds = Object.keys(this._outputs).reduce((ids, paramId) => {
      return this._outputs[paramId].connections.reduce((ids, connection) => {
        ids[connection.id] = true
        return ids;
      }, ids);
    }, {});

    return Object.keys(connectedIds).map((id) => this.graph.getNodeById(id));
  }

  updateValue(paramId, value) {
    this._inputs[paramId].values = [value];
  }

  // needs to accept <Function|Graph> inputs.
  //
  // let parameterSets = [
  //   {a: 1, b: 3},
  //   {a: 2, b: 4}
  // ];
  //
  // _transform = function(paramSet) {
  //   return {
  //     product: paramSet.a * paramSet.b,
  //     sum: paramSet.a + paramSet.b
  //   };
  // }
  //
  compute() {
    let inputs = this._inputs;
    let resolvedInputs = Object.keys(inputs).reduce((resolved, paramId) => {
      let connections = inputs[paramId].connections;
      if (connections.length > 0) {
        resolved[paramId] = [];
        connections.forEach((connection) => {
          let incomingNode = this.graph.getNodeById(connection.id);
          let values = incomingNode._outputs[connection.paramId].values;
          values.forEach((val) => {
            resolved[paramId].push(val);
          });
        });
      } else {
        resolved[paramId] = [inputs[paramId].value];
      }
      return resolved;
    }, {});

    let longestParam = Object.keys(resolvedInputs).reduce((prevId, currId) => {
      let prevLength = resolvedInputs[prevId].length;
      let currLength = resolvedInputs[currId].length;
      return prevLength >= currLength ? prevId : currId;
    });

    let parameterSets = resolvedInputs[longestParam].map((value, index) => {
      let paramSet = {};
      Object.keys(resolvedInputs).forEach((paramId) => {
        let values = resolvedInputs[paramId];
        let currIndex = index % values.length;
        paramSet[paramId] = values[currIndex];
      });
      return paramSet;
    });

    Object.keys(this._outputs).forEach((paramId) => {
      this._outputs[paramId].value = [];
    });

    parameterSets.forEach((paramSet) => {
      let result = this._transform(paramSet);
      Object.keys(this._outputs).forEach((paramId) => {
        let output = this._outputs[paramId];
        output.values.push(result[paramId]);
      });
    });
  }
}
