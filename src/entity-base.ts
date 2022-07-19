import { MixinDependGraph, MixinDependNode } from '../src/dependencies';
import { ExprType, ParseNode } from './expr-base';

export const AttrBase = MixinDependNode(class {
  public readonly owner: EntityBase;
  public readonly name: string;

  public readonly calc: ParseNode | undefined;
  public readonly valid: ParseNode | undefined;
  public readonly mods: Record<string, ParseNode>;
  public readonly type: ExprType;
  public readonly mutable: boolean;

  constructor(owner: EntityBase, name: string, typ: ExprType) {
    this.owner = owner;
    this.name = name;
    this.type = typ;
    owner.addDependNode(this);
  }
});

export const EntityBase = MixinDependGraph(AttrBase, class {
  public readonly __name: string;
  public readonly __includes: Array<String>;
  public __attrs: Record<string, AttrBase>;

  constructor(name: string) {
    this.__name = name;
    this.__includes = [];
    this.__attrs = {};
  }
});
