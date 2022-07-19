import { ExprType, ParseNode } from './expr-base';

export interface Dependency {
  readonly attr: AttrBase;
  readonly reverseAttr: AttrBase;
  readonly marked: boolean;
}

export class EntityBase {
  public readonly __name: string;
  public readonly __includes: Array<String>;
  public __attrs: Record<string, AttrBase>;

  constructor(name: string) {
    this.__name = name;
    this.__includes = [];
    this.__attrs = {};
  }

  public unmarkDependencies() {
    for(let prop in this.__attrs) {
      this.__attrs[prop].unmarkDependencies();
    }
  }
}

export class AttrBase {
  public readonly owner: EntityBase;
  public readonly name: string;

  public readonly calc: ParseNode | undefined;
  public readonly valid: ParseNode | undefined;
  public readonly mods: Record<string, ParseNode>;
  public readonly type: ExprType;
  public readonly mutable: boolean;

  public depends: Dependency[];
  public reverseDepends: Dependency[];

  constructor(owner: EntityBase, name: string, typ: ExprType) {
    this.owner = owner;
    this.name = name;
    this.type = typ;
    this.depends = [];
    this.reverseDepends = [];
  }

  public unmarkDependencies() {
    for(let depend of this.depends) {
      depend.marked = false;
    }
  }

  public hasUnmarkedDependencies() {
    for(let depend of this.depends) {
      if(!depend.marked) {
        return true;
      }
    }
    return false;
  }
}
