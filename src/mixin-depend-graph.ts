import { CircularDependencyError } from './errors';

// mixin logic from https://www.typescriptlang.org/docs/handbook/mixins.html
type Constructor<T = {}> = new (...args: any[]) => T;

interface IDependGraph {
  dependsAcyclic: boolean | undefined;
  dependsCyclic: boolean | undefined;

  addDependNode(node: IDependNode);
  removeDependNode(node: IDependNode);

  unmarkDepends();
  findDependCycle(): Array<IDependNode> | null;
  dependsInEvalOrder(): Array<IDependNode>;

  __nodes: Array<IDependNode>;
  __inEvalOrder: boolean;
}

export function MixinDependGraph<
  TBase extends Constructor, TDependNode extends Constructor<IDependNode>
>(DependNode: TDependNode, Base: TBase) {
  return class DependGraph extends Base implements IDependGraph {
    public __nodes: Array<DependNode> = [];
    public __inEvalOrder: boolean = false;
    public dependGraphReady: boolean;
    public dependsAcyclic: boolean | undefined = undefined;
    public dependsCyclic: boolean | undefined = undefined;

    constructor(...args: any[]) {
      super(...args);
      this.dependGraphReady = true;
      if(this.__graphReadyCallback) {
        this.__graphReadyCallback();
      }
    }

    public onDependGraphReady(callback: Function) {
      this.__graphReadyCallback = callback;
    }

    public addDependNode(node: DependNode) {
      this.__errInConstructor('addDependNode');
      this.__nodes.push(node);
      node.__addToDependGraph(this);
    }

    public removeDependNode(node: DependNode) {
      this.__errInConstructor('removeDependNode');
      const idx = this.__nodes.indexOf(node);
      if(idx >= 0) {
        this.__nodes.splice(idx, 1);
        node.__removeFromDependGraph(this);
      }
    }

    public unmarkDepends() {
      this.__errInConstructor('unmarkDepends');
      for(let node of this.__nodes) {
        for(let depend of node.depends) {
          depend.marked = false;
        }
      }
    }

    public findDependCycle() {
      this.__errInConstructor('findDependCycle');
      if(this.dependsAcyclic) {
        // We have already checked to see if this graph is cyclic. Don't bother.
        return null;
      }
      for(let node of this.__nodes) {
        if(node.hasUnmarkedDepends()) {
          const output = node.__findDependCycle(new Set<DependNode>());
          if(output) {
            this.dependsAcyclic = false;
            this.dependsCyclic = true;
            this.unmarkDepends();
            return output;
          }
        }
      }
      this.unmarkDepends();
      this.dependsAcyclic = true;
      this.dependsCyclic = false;
      return null;
    }

    // Sort the nodes array into the correct evaluation order. Can only be run on a
    // graph which is known to be acyclic.
    public dependsInEvalOrder() {
      this.__errInConstructor('dependsInEvalOrder');
      if(this.__inEvalOrder) {
        return this.__nodes;
      }
      if(this.dependsAcyclic === undefined) {
        throw new CircularDependencyError('Run findDependCycle() before dependsInEvalOrder().');
      }
      if(this.dependsCyclic) {
        throw new CircularDependencyError('dependsInEvalOrder() requires an acyclic graph.');
      }
      const leafNodes = new Set<DependNode>(this.__nodes.filter((x) => !x.hasUnmarkedDepends()));
      const ordering = new Array<DependNode>();
      this.__addToOrdering(ordering, leafNodes);
      this.unmarkDepends();
      this.__inEvalOrder = true;
      this.__nodes = Array.from(ordering);
      return this.__nodes;
    }

    __errInConstructor(funcName: string) {
      if(!this.dependGraphReady) {
        throw new Error(
          `To call ${funcName} in constructor: this.onDependGraphReady(() => ${funcName}(...))`,
        );
      }
    }

    // Recursive function: Add the specified nodes to the ordering. Then find all nodes
    // whose dependencies have now been added, and repeat on those nodes.
    __addToOrdering(ordering: Array<DependNode>, nodes: Set<DependNode>) {
      const nextNodes = new Set<DependNode>();
      for(let node of nodes) {
        ordering.push(node);
        for(let depend of node.dependedBy) {
          depend.marked = true;
          if(!depend.from.hasUnmarkedDepends()) {
            nextNodes.add(depend.from);
          }
        }
      }
      if(nextNodes.size) {
        this.__addToOrdering(ordering, nextNodes);
      }
    }

    public __onDependAdded() {
      if(this.dependsAcyclic) {
        // If this graph was known to be acyclic, it may have become cyclic.
        this.dependsAcyclic = undefined;
        this.dependsCyclic = undefined;
      }
      // Adding a dependency can change the eval order.
      this.__inEvalOrder = undefined;
    }

    public __onDependRemoved() {
      if(this.dependsCyclic) {
        // If this graph was known to be cyclic, it may have become acyclic.
        this.dependsAcyclic = undefined;
        this.dependsCyclic = undefined;
      }
      // Removing a dependency can change the eval order.
      this.__inEvalOrder = undefined;
    }
  }
}

export interface IDependNode {
  dependNodeId: number;
  depends: Array<DependEdge>;
  dependedBy: Array<DependEdge>;

  addDepend(target: IDependNode);
  removeDepend(target: IDependNode);

  hasUnmarkedDepends();
  hasDependConnections(): boolean;

  __graph: IDependGraph | null;
  __findDependCycle(path: Set<IDependNode>);
  __addToDependGraph(graph: IDependGraph);
  __removeFromDependGraph(graph: IDependGraph);
}

let dependNodeId = 1;

export function MixinDependNode<TBase extends Constructor>(Base: TBase) {
  return class DependNode extends Base implements IDependNode {
    public __graph: IDependGraph | null = null;
    public dependNodeId: number = NaN;
    public depends: Array<DependEdge> = [];
    public dependedBy: Array<DependEdge> = [];

    constructor(...args: any[]) {
      super(...args);
      this.dependNodeId = dependNodeId;
      dependNodeId++;
    }

    public addDepend(target: DependNode) {
      for(let depend of this.depends) {
        if(depend.to === target) {
          return;
        }
      }
      const edge = new DependEdge(this, target);
      this.depends.push(edge);
      target.dependedBy.push(edge);

      if(this.__graph) {
        this.__graph.__onDependAdded();
      }
    }

    public removeDepend(target: DependNode) {
      for(let i = 0; i < this.depends.length; i++) {
        const depend = this.depends[i];
        if(depend.to === target) {
          this.depends.splice(i, 1);
          target.dependedBy.splice(target.dependedBy.indexOf(depend), 1);
          if(this.__graph) {
            this.__graph.__onDependRemoved();
          }
          return;
        }
      }
    }

    public hasUnmarkedDepends() {
      for(let depend of this.depends) {
        if(!depend.marked) {
          return true;
        }
      }
      return false;
    }

    // Given a path through the graph that leads to this node, explores all
    // branches of that path to see if any result in a cycle.
    public __findDependCycle(path: Set<DependNode>) {
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
          const result = depend.to.__findDependCycle(newPath);
          if(result) {
            // One of our dependencies found a cycle. Return it.
            return result;
          }
        }
      }

      return null;
    }

    public hasDependConnections() {
      return !!(
        (this.depends && this.depends.length) ||
        (this.dependedBy && this.dependedBy.length)
      );
    }

    public __addToDependGraph(graph) {
      this.__graph = graph;
      if(this.hasDependConnections()) {
        this.__graph.__onDependAdded();
      }
    }

    public __removeFromDependGraph(graph) {
      if(this.__graph !== graph) {
        throw new Error(`Called __removeFromDependGraph but __graph did not match argument.`);
      }
      this.__graph = null;
      if(this.hasDependConnections()) {
        for(let depend of this.depends) {
          const target = depend.to;
          target.dependedBy.splice(target.dependedBy.indexOf(depend), 1);
        }
        for(let depend of this.dependedBy) {
          const target = depend.from;
          target.depends.splice(target.depends.indexOf(depend), 1);
        }
        graph.__onDependRemoved();
      }
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