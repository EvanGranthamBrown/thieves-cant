import * as ExprParse from './expr-parse';
import { ExprType, ExprTypeNames, ParseNode } from './expr-base';

export interface AttrProps {
  readonly name: string;
  readonly calc?: string;
  readonly valid?: string;
  readonly type: string;
  readonly mods: Record<string, string>;
  readonly mutable?: boolean;
}

interface Dependency {
  readonly attr: Attr;
  readonly marked: boolean;
}

export class Entity {
  public _attrs: Record<string, Attr>;

  constructor(json) {
    this._attrs = {};
    for(let prop in json) {
      this._attrs[prop] = new Attr(this, prop, json[prop]);
    }
  }
}

export class Attr {
  public readonly owner: Entity;
  public readonly name: string;

  public readonly calc: ParseNode | undefined;
  public readonly valid: ParseNode | undefined;
  public readonly mods: Record<string, ParseNode>;
  public readonly type: ExprType;
  public readonly mutable: boolean;

  public requires: Dependency[];
  public requiredBy: Dependency[];

  require(id: string) {
    const attr = this.owner._attrs[id];
    const dep = { attr, marked: false };
    this.requires.push(dep);
    attr.requiredBy.push(dep);
  }

  constructor(owner: Entity, name: string, json: AttrProps) {
    this.owner = owner;
    this.name = name;
    this.type = json.type as ExprType;

    this.requires = [];
    this.requiredBy = [];

    if(json.calc) {
      if(json.valid) {
        throw new Error(`Attribute "${this.name}" has both "calc" and "valid" set: ${JSON.stringify(json)}`);
      }
      if(json.mutable) {
        throw new Error(`Attribute "${this.name}" has "calc" set but is mutable: ${JSON.stringify(json)}`);
      }
      this.calc = ExprParse.parse(json.calc);
      if(this.calc.type() !== this.type) {
        throw new Error(`Attribute "${this.name}" has "calc" formula returning wrong type (expected ${this.type}, got ${this.calc.type()})`);
      }
      this.mutable = false;
    } else {
      if(json.valid) {
        this.valid = ExprParse.parse(json.valid);
        if(this.valid.type() !== this.type) {
          throw new Error(`Attribute "${this.name}" has "valid" formula returning wrong type (expected ${this.type}, got ${this.valid.type()})`);
        }
      }
      this.mutable = !!json.mutable;
    }
  }

  public computeRequirements() {
    let ids = new Set<string>();
    if(this.calc) {
      for(let id of this.calc.identifiers()) {
        ids.add(id);
      }
    }
    if(this.valid) {
      for(let id of this.valid.identifiers()) {
        ids.add(id);
      }
    }
    this.require(id);
  }

  public get value() {
    return this.myValue;
  }

  public set value(value: any) {
    if(!this.mutable) {
      throw new Error(`Can't altar value of attribute "${this.name}".`);
    }
    this._value = value;
  }
}
