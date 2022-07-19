import { MixinDependGraph, MixinDependNode } from '../src/dependencies';
import { CircularDependencyError } from '../src/errors';

let GraphClass: any;
let NodeClass: any;

describe('MixinDependGraph', () => {
  it('correctly orders a list of dependencies', () => {
    const NodeClass = MixinDependNode(class {});
    const GraphClass = MixinDependGraph(NodeClass, class {});

    const graph = new GraphClass();

    const node1 = new NodeClass();
    graph.addNode(node1);
    const node2 = new NodeClass();
    graph.addNode(node2);
    const node3 = new NodeClass();
    graph.addNode(node3);
    const node4 = new NodeClass();
    graph.addNode(node4);
    const node5 = new NodeClass();
    graph.addNode(node5);

    node1.addDepend(node2);
    node1.addDepend(node4);

    node2.addDepend(node3);

    node5.addDepend(node3);

    // This must be executed before applyEvalOrder().
    graph.findCycle();

    // our graph in crude ASCII art:
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
    graph.applyEvalOrder();
    expect(graph.nodes).toEqual([node3, node4, node2, node5, node1]);
  });

  it('requires findCycle() to run before applyEvalOrder()', () => {
    const NodeClass = MixinDependNode(class {});
    const GraphClass = MixinDependGraph(NodeClass, class {});

    const graph = new GraphClass();

    const node1 = new NodeClass();
    graph.addNode(node1);
    const node2 = new NodeClass();
    graph.addNode(node2);
    const node3 = new NodeClass();
    graph.addNode(node3);
    const node4 = new NodeClass();
    graph.addNode(node4);
    const node5 = new NodeClass();
    graph.addNode(node5);

    node1.addDepend(node2);
    node1.addDepend(node4);

    node2.addDepend(node3);

    node5.addDepend(node3);

    expect(() => {
      graph.applyEvalOrder();
    }).toThrow(CircularDependencyError);
  });

  it('errors if applyEvalOrder() is run on a cyclic graph', () => {
    const NodeClass = MixinDependNode(class {});
    const GraphClass = MixinDependGraph(NodeClass, class {});

    const graph = new GraphClass();

    const node1 = new NodeClass();
    graph.addNode(node1);
    const node2 = new NodeClass();
    graph.addNode(node2);
    const node3 = new NodeClass();
    graph.addNode(node3);
    const node4 = new NodeClass();
    graph.addNode(node4);
    const node5 = new NodeClass();
    graph.addNode(node5);

    node1.addDepend(node2);
    node1.addDepend(node4);

    node2.addDepend(node3);

    node5.addDepend(node3);

    // oops, we made a cycle
    node3.addDepend(node1);

    expect(() => {
      graph.findCycle();
      graph.applyEvalOrder();
    }).toThrow(CircularDependencyError);
  });

  it('detects and returns a cycle with findCycle()', () => {
    const NodeClass = MixinDependNode(class {});
    const GraphClass = MixinDependGraph(NodeClass, class {});

    const graph = new GraphClass();

    const node1 = new NodeClass();
    graph.addNode(node1);
    const node2 = new NodeClass();
    graph.addNode(node2);
    const node3 = new NodeClass();
    graph.addNode(node3);
    const node4 = new NodeClass();
    graph.addNode(node4);
    const node5 = new NodeClass();
    graph.addNode(node5);

    node1.addDepend(node2);
    node2.addDepend(node3);
    node3.addDepend(node4);
    node4.addDepend(node2);

    const cycle = graph.findCycle();

    expect(cycle).toContain(node2);
    expect(cycle).toContain(node3);
    expect(cycle).toContain(node4);
    expect(cycle).not.toContain(node1);

    expect(graph.acyclic).toBe(false);
    expect(graph.cyclic).toBe(true);
  });

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
