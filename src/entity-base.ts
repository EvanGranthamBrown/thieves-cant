import { MixinDependGraph, MixinDependNode } from './mixin-depend-graph';
import { ExprType, ParseNode } from './expr-base';

export const AttrBase = MixinDependNode(class {
  public readonly owner: EntityBase;
  public readonly name: string;

  public readonly calc: ParseNode | undefined;
  public readonly valid: ParseNode | undefined;
  public readonly mods: Record<string, ParseNode> = {};
  public readonly type: ExprType;
  public readonly entityTypes: Array<string> = [];
  public readonly mutable: boolean = false;

  constructor(owner: EntityBase, name: string, typ: ExprType) {
    this.owner = owner;
    this.name = name;
    this.type = typ;
    owner.addDependNode(this);
  }
});

export const EntityBase = MixinDependGraph(class {
  public readonly __name: string;
  public readonly __includes: Set<string>;
  public __attrs: Record<string, AttrBase>;
  public __rulebook: any;
  // _rulebook type should be Rulebook, but that causes a circular import dependency

  constructor(rulebook: rulebook, name: string) {
    this.__name = name;
    this.__includes = new Set<string>();
    this.__attrs = {};
    this.__rulebook = rulebook;
  }

  public __is(entityType) {
    if(this.__name === entityType) {
      return true;
    }
    if(this.__includes.has(entityType)) {
      return true;
    }
    return false;
  }
});
