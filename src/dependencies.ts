import { CircularDependencyError } from './errors';

// mixin logic from https://www.typescriptlang.org/docs/handbook/mixins.html
type Constructor<T = {}> = new (...args: any[]) => T;

interface IDependGraph {
  nodes: Array<DependNode>;
  acyclic: boolean | undefined;
  cyclic: boolean | undefined;

  addDependNode(node: IDependNode);
  removeDependNode(node: IDependNode);
  unmark();
  findCycle();
  applyEvalOrder();
}

export function MixinDependGraph<
  TBase extends Constructor, TDependNode extends Constructor<IDependNode>
>(DependNode: TDependNode, Base: TBase) {
  return class DependGraph extends Base implements IDependGraph {
    public nodes: Array<DependNode> = [];
    public acyclic: boolean | undefined = undefined;
    public cyclic: boolean | undefined = undefined;

    public addDependNode(node: DependNode) {
      node.graph = this;
      node.dependNodeId = this.nodes.length + 1;
      this.nodes.push(node);
      if(this.acyclic && node.depends.length && node.dependedBy.length) {
        // we may have just created a cyclic dependency
        this.acyclic = undefined;
        this.cyclic = undefined;
      }
    }

    public removeDependNode(node: DependNode) {
      const idx = this.nodes.indexOf(node);
      if(idx >= 0) {
        node.graph = null;
        node.dependNodeId = NaN;
        this.nodes.slice(idx);
        if(this.cyclic && node.depends.length && node.dependedBy.length) {
          // we may have just broken a cyclic dependency
          this.acyclic = undefined;
          this.cyclic = undefined;
        }
      }
    }

    public unmark() {
      for(let node of this.nodes) {
        for(let depend of node.depends) {
          depend.marked = false;
        }
      }
    }

    public findCycle() {
      if(this.acyclic) {
        // We have already checked to see if this graph is cyclic. Don't bother.
        return null;
      }
      for(let node of this.nodes) {
        if(node.hasUnmarked()) {
          const output = node.findCycle(new Set<DependNode>());
          if(output) {
            this.acyclic = false;
            this.cyclic = true;
            this.unmark();
            return output;
          }
        }
      }
      this.unmark();
      this.acyclic = true;
      this.cyclic = false;
      return null;
    }

    // Sort the nodes array into the correct evaluation order. Can only be run on a
    // graph which is known to be acyclic.
    public applyEvalOrder() {
      if(this.acyclic === undefined) {
        throw new CircularDependencyError('Run findCycle() before applyEvalOrder().');
      }
      if(this.cyclic) {
        throw new CircularDependencyError('applyEvalOrder() requires an acyclic graph.');
      }
      const leafNodes = new Set<DependNode>(this.nodes.filter((x) => !x.hasUnmarked()));
      const ordering = new Array<DependNode>();
      this.__addToOrdering(ordering, leafNodes);
      this.unmark();
      this.nodes = Array.from(ordering);
    }

    // Recursive function: Add the specified nodes to the ordering. Then find all nodes
    // whose dependencies have now been added, and repeat on those nodes.
    __addToOrdering(ordering: Array<DependNode>, nodes: Set<DependNode>) {
      const nextNodes = new Set<DependNode>();
      for(let node of nodes) {
        ordering.push(node);
        for(let depend of node.dependedBy) {
          depend.marked = true;
          if(!depend.from.hasUnmarked()) {
            nextNodes.add(depend.from);
          }
        }
      }
      if(nextNodes.size) {
        this.__addToOrdering(ordering, nextNodes);
      }
    }
  }
}

export interface IDependNode {
  graph: IDependGraph | null;
  depends: Array<DependEdge>;
  dependedBy: Array<DependEdge>;

  addDepend(target: IDependNode);
  removeDepend(target: IDependNode);
  findCycle(path: Set<IDependNode>);

  hasUnmarked();

  dependNodeId: number;
}

export function MixinDependNode<TBase extends Constructor>(Base: TBase) {
  return class DependNode extends Base implements IDependNode {
    public graph: IDependGraph | null = null;
    public depends: Array<DependEdge> = [];
    public dependedBy: Array<DependEdge> = [];
    public dependNodeId: number = NaN;

    public addDepend(target: DependNode) {
      for(let depend of this.depends) {
        if(depend.to === target) {
          return;
        }
      }
      const edge = new DependEdge(this, target);
      this.depends.push(edge);
      target.dependedBy.push(edge);

      if(this.graph && this.graph.acyclic) {
        // We have just added a dependency. The graph may no longer be acyclic.
        this.graph.acyclic = undefined;
        this.graph.cyclic = undefined;
      }
    }

    public removeDepend(target: DependNode) {
      for(let i = 0; i < this.depends.length; i++) {
        const depend = this.depends[i];
        if(depend.to === target) {
          this.depends.slice(i, 1);
          target.dependedBy.slice(target.dependedBy.indexOf(depend), 1);
          if(this.graph && this.graph.cyclic) {
            // We have just removed a dependency. The graph may no longer be cyclic.
            this.graph.acyclic = undefined;
            this.graph.cyclic = undefined;
          }
          return;
        }
      }
    }

    public hasUnmarked() {
      for(let depend of this.depends) {
        if(!depend.marked) {
          return true;
        }
      }
      return false;
    }

    // Given a path through the graph that leads to this node, explores all
    // branches of that path to see if any result in a cycle.
    public findCycle(path: Set<DependNode>) {
      if(path.has(this)) {
        // We have found a cycle. Return it.
        const pathArr = Array.from(path);
        pathArr.push(this);
        return pathArr.slice(pathArr.indexOf(this));
      }

      const newPath = new Set(path);
      newPath.add(this);

      for(let depend of this.depends) {
        if(!depend.marked) {
          depend.marked = true;
          const result = depend.to.findCycle(newPath);
          if(result) {
            // One of our dependencies found a cycle. Return it.
            return result;
          }
        }
      }

      return null;
    }
  }
}

export class DependEdge {
  public from: IDependNode;
  public to: IDependNode;
  public marked: boolean = false;

  constructor(from: IDependNode, to: IDependNode) {
    this.from = from;
    this.to = to;
  }
}