/**
  Skeleton actions needed to support on Dataflow Graph:
  * Insert a new node.
  * Remove a new node.
  * Connect a port to another.
  * Disconnect a port to another.
  * Change the default value on a port.
  * Compute the graph.

  Not done:
  * Accept multiple inputs.
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

  _inputs; // {paramId, {defaultValue: dynamic, connections: [{id: string, paramId: string}]}}
  _outputs; // {paramId, {value: dynamic, connections: [{id: string, paramId: string}]}}
  _transform;

  // sample inputs
  {
    angle: {
      defaultValue: 0,
      connections: [
        {id: 20, paramId: angle}
      ]
    },
    width: {
      defaultValue: 100,
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
      index++;
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

  // can move this to graph class?
  _getNodeById(id) {
    return this.graph.getNodeById(id);
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
    let input = target._inputs[targetParamId];

    output.connections = output.connections.filter((connection) =>
      connection.id !== target.id && connection.paramId !== targetParamId
    );
    input.connections = input.connections.filter((connection) =>
      connection.id !== this.id && connection.paramId !== paramId
    );
  }

  isConnected(target, targetParamId) {
    return Object.keys(this._outputs).some((output) =>
      output.connections.some((connection) =>
        connection.id == target.id && connection.paramId == targetParamId
      )
    );
  }

  getConnected() {
    let childrenIds = Object.keys(this._outputs)
      .reduce((childrenIds, output) => output.connections
        .reduce((childrenIds, connection) => {
          childrenIds[connection.id] = true;
          return childrenIds;
        }, childrenIds), {});

    return Object.keys(childrenIds).map((id) => this._getNodeById(id));
  }

  updateDefault(paramId, value) {
    this._inputs[paramId].defaultValue = value;
  }

  // needs to accept multiple inputs
  // needs to accept <Function|Graph> transforms
  compute() {
    // resolve inputs
    let inputs = Object.keys(this._inputs).reduce((inputs, paramId) => {
      let connection = this._inputs[paramId].connections[0]
      inputs[paramId] = connection
        ? this._getNodeById(connection.id)._outputs[connection.paramId].value
        : inputs[paramId].defaultValue;
      return inputs;
    }, {});

    let result = this._transform(inputs);
    Object.keys(this._outputs).forEach((paramId) => {
      let output = this._outputs[paramId];
      output.value = result[paramId];
    });
  }
}
