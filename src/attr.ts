import * as ExprParse from './expr-parse';
import { ExprType, ExprTypeNames, ParseNode } from './expr-base';
import { AttributeTypeError, CircularDependencyError, ExpressionParseError } from './errors';

export interface AttrTemplateProps {
  readonly name: string;
  readonly calc?: string;
  readonly valid?: string;
  readonly type: string;
  readonly mods: Record<string, string>;
  readonly mutable?: boolean;
}

interface Dependency {
  readonly attr: Attr;
  readonly reverseAttr: Attr;
  readonly marked: boolean;
}

export interface EntityTemplateProps {
  readonly attrs: Record<string, AttrTemplateProps>;
  readonly name: string;
}

export class EntityTemplate {
  public name: string;
  public attrs: Record<string, AttrTemplate>;

  constructor(props: EntityTemplateProps) {
    this.name = props.name;
    this.attrs = {};
    if(Object.keys(props.attrs).length === 0) {
      return;
    }
    for(let prop in props.attrs) {
      this.attrs[prop] = new AttrTemplate(this, prop, props.attrs[prop]);
    }
    for(let prop in this.attrs) {
      this.attrs[prop].computeDependencies();
    }
    for(let prop in this.attrs) {
      this.attrs[prop].checkDependenciesForCircles(new Array<AttrTemplate>());
    }
    this.unmarkDependencies();
  }

  public unmarkDependencies() {
    for(let prop in this.attrs) {
      this.attrs[prop].unmarkDependencies();
    }
  }
}

export class AttrTemplate {
  public readonly owner: EntityTemplate;
  public readonly name: string;

  public readonly calc: ParseNode | undefined;
  public readonly valid: ParseNode | undefined;
  public readonly mods: Record<string, ParseNode>;
  public readonly type: ExprType;
  public readonly mutable: boolean;

  public depends: Dependency[];
  public reverseDepends: Dependency[];

  constructor(owner: EntityTemplate, name: string, json: AttrTemplateProps) {
    this.owner = owner;
    this.name = name;
    this.type = (json.type as ExprType);

    this.depends = [];
    this.reverseDepends = [];

    if(json.calc) {
      if(json.valid) {
        throw new AttributeTypeError(`Attribute "${this.name}" has both "calc" and "valid" set: ${JSON.stringify(json)}`);
      }
      if(json.mutable) {
        throw new AttributeTypeError(`Attribute "${this.name}" has "calc" set but is mutable: ${JSON.stringify(json)}`);
      }
      this.calc = ExprParse.parse(json.calc);
      if(this.calc.type() !== this.type) {
        throw new AttributeTypeError(`Attribute "${this.name}" has "calc" formula returning wrong type (expected ${this.type}, got ${this.calc.type()})`);
      }
      this.mutable = false;
    } else {
      if(json.valid) {
        this.valid = ExprParse.parse(json.valid);
        if(this.valid.type() !== this.type) {
          throw new AttributeTypeError(`Attribute "${this.name}" has "valid" formula returning wrong type (expected ${this.type}, got ${this.valid.type()})`);
        }
      }
      this.mutable = !!json.mutable;
    }
  }

  private addDependency(id: string) {
    const attr = this.owner.attrs[id];
    if(attr === undefined) {
      throw new ExpressionParseError(`Property "${id}" is not defined on entity "${this.owner.name}".`);
    }
    const dep = { attr, reverseAttr: this, marked: false };
    this.depends.push(dep);
    attr.reverseDepends.push(dep);
  }

  public computeDependencies() {
    let ids = new Set<string>();
    if(this.calc) {
      for(const id of this.calc.identifiers()) {
        ids.add(id);
      }
    }
    for(const id of ids) {
      this.addDependency(id);
    }
  }

  public unmarkDependencies() {
    for(let depend of this.depends) {
      depend.marked = false;
    }
  }

  public checkDependenciesForCircles(path: AttrTemplate[]) {
    const newPath = path.slice();
    newPath.push(this);

    for(let i = 0; i < path.length; i++) {
      if(path[i] === this) {
        throw new CircularDependencyError(
          `"${newPath.slice(i).map((x) => x.name).join('" depends on "')}".`
        );
      }
    }

    for(let depend of this.depends) {
      if(!depend.marked) {
        depend.marked = true;
        depend.attr.checkDependenciesForCircles(newPath);
      }
    }
  }
}
