import { MixinDependGraph, MixinDependNode } from '../src/depend-graph-mixin';
import { CircularDependencyError } from '../src/errors';

describe('MixinDependGraph', () => {
  it('works properly with other class properties and functions', () => {
    const NodeClass = MixinDependNode(class {
      public foo() {
        return 'foo';
      }
    });

    const GraphClass = MixinDependGraph(NodeClass, class {
      public bar: number;

      constructor(bar) {
        this.bar = bar;
      }
    });

    const nodeInst = new NodeClass();
    expect(nodeInst.foo()).toEqual('foo');

    const graphInst = new GraphClass(13);
    expect(graphInst.bar).toEqual(13);
  });
});

describe('MixinDependGraph.dependsInEvalOrder()', () => {
  const NodeClass = MixinDependNode(class {});
  const GraphClass = MixinDependGraph(NodeClass, class {});
  let graph: GraphClass;
  let node1, node2, node3, node4, node5: NodeClass;

  beforeEach(() => {
    graph = new GraphClass();

    node1 = new NodeClass();
    graph.addDependNode(node1);
    node2 = new NodeClass();
    graph.addDependNode(node2);
    node3 = new NodeClass();
    graph.addDependNode(node3);
    node4 = new NodeClass();
    graph.addDependNode(node4);
    node5 = new NodeClass();
    graph.addDependNode(node5);
  });

  it('correctly orders a list of dependencies', () => {
    node1.addDepend(node2);
    node1.addDepend(node4);
    node2.addDepend(node3);
    node5.addDepend(node3);

    // Our graph in crude ASCII art:
    //
    //    |------>(node4)
    //    |
    // (node1)--->(node2)--->(node3)
    //                    |
    //                    |
    //            (node5)-|

    // So we expect nodes 3 and 4, as the leaf nodes, to evaluate first.
    // Then nodes 2 and 5 are ready; they evaluate next.
    // Finally node 1.

    // We also expect that where two nodes are ready to evaluate at the
    // same time, the initial ordering is preserved (so 3 evaluates before
    // 4).
    graph.findDependCycle();
    const depends = graph.dependsInEvalOrder();
    expect(depends).toEqual([node3, node4, node2, node5, node1]);
  });

  it('updates if changes are made to the graph after the first run', () => {
    node1.addDepend(node2);
    node1.addDepend(node4);
    node2.addDepend(node3);
    node5.addDepend(node3);

    graph.findDependCycle();
    graph.dependsInEvalOrder();

    let node6 = new NodeClass();
    graph.addDependNode(node6);
    node6.addDepend(node3);
    graph.removeDependNode(node5);

    graph.findDependCycle();
    const depends = graph.dependsInEvalOrder();
    expect(depends).toEqual([node3, node4, node2, node6, node1]);
  });

  it('requires findDependCycle() to run first', () => {
    node1.addDepend(node2);
    node1.addDepend(node4);
    node2.addDepend(node3);
    node5.addDepend(node3);

    expect(() => {
      graph.dependsInEvalOrder();
    }).toThrow(CircularDependencyError);
  });

  it('errors if run on a cyclic graph', () => {
    node1.addDepend(node2);
    node1.addDepend(node4);
    node2.addDepend(node3);
    node5.addDepend(node3);
    node3.addDepend(node1); // oops, we made a cycle

    expect(() => {
      graph.findDependCycle();
      graph.dependsInEvalOrder();
    }).toThrow(CircularDependencyError);
  });
});

describe('MixinDependGraph.findDependCycle()', () => {
  const NodeClass = MixinDependNode(class {});
  const GraphClass = MixinDependGraph(NodeClass, class {});
  let graph: GraphClass;
  let node1, node2, node3, node4: NodeClass;

  beforeEach(() => {
    graph = new GraphClass();

    node1 = new NodeClass();
    graph.addDependNode(node1);
    node2 = new NodeClass();
    graph.addDependNode(node2);
    node3 = new NodeClass();
    graph.addDependNode(node3);
    node4 = new NodeClass();
    graph.addDependNode(node4);
  });

  it('detects and returns a cycle', () => {
    node1.addDepend(node2);
    node2.addDepend(node3);
    node3.addDepend(node4);
    node4.addDepend(node2);

    const cycle = graph.findDependCycle();

    expect(cycle).toContain(node2);
    expect(cycle).toContain(node3);
    expect(cycle).toContain(node4);
    expect(cycle).not.toContain(node1);
  });

  it('sets the cyclic, acyclic flags to true, false when a cycle is present', () => {
    node1.addDepend(node2);
    node2.addDepend(node3);
    node3.addDepend(node4);
    node4.addDepend(node2);

    graph.findDependCycle();

    expect(graph.dependsCyclic).toBe(true);
    expect(graph.dependsAcyclic).toBe(false);
  });

  it('returns null if no cycle is present', () => {
    node1.addDepend(node2);
    node2.addDepend(node3);
    node3.addDepend(node4);

    const cycle = graph.findDependCycle();

    expect(cycle).toBe(null);
  });

  it('sets the cyclic, acyclic flags to false, true when no cycle is present', () => {
    node1.addDepend(node2);
    node2.addDepend(node3);
    node3.addDepend(node4);

    graph.findDependCycle();

    expect(graph.dependsCyclic).toBe(false);
    expect(graph.dependsAcyclic).toBe(true);
  });
});