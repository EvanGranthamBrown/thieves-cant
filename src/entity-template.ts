import * as ExprParse from './expr-parse';
import { ExprType } from './expr-base';
import {
  AttributeTypeError,
  CircularDependencyError,
  ExpressionParseError,
  MalformedTemplateError,
} from './errors';
import { EntityBase, AttrBase } from './entity-base';

export interface EntityTemplateProps {
  readonly attrs: Record<string, AttrTemplateProps>;
  readonly includes?: Array<String>;
}

export class EntityTemplate extends EntityBase {
  public readonly __evalOrder: AttrTemplate[];

  constructor(name: string, props: EntityTemplateProps) {
    super(name);

    if(Object.keys(props.attrs).length === 0) {
      // no properties, nothing to do
      return;
    }

    for(let prop in props.attrs) {
      this.__attrs[prop] = new AttrTemplate(this, prop, props.attrs[prop]);
    }
    for(let prop in this.__attrs) {
      this.__attrs[prop].computeDependencies();
    }
    for(let prop in this.__attrs) {
      this.__attrs[prop].checkDependenciesForCircles(new Array<AttrTemplate>());
    }
    this.unmarkDependencies();

    this.__evalOrder = this.computeEvalOrder();
  }

  public computeEvalOrder() {
    let results = new Set<Attr>();

    // Start with the leaf nodes. Work upward from there.
    let attrs = new Set<Attr>();
    for(let prop in this.__attrs) {
      const attr = this.__attrs[prop];
      if(!attr.depends.length) {
        attrs.add(attr);
      }
    }

    this.addToEvalOrder(attrs, results);
    this.unmarkDependencies();

    return Array.from(results);
  }

  private addToEvalOrder(attrs: Set<Attr>, results: Set<Attr>) {
    let nextAttrs = new Set<Attr>();

    for(let attr of attrs) {
      results.add(attr);
      for(let depend of attr.reverseDepends) {
        depend.marked = true;
        if(!depend.reverseAttr.hasUnmarkedDependencies()) {
          nextAttrs.add(depend.reverseAttr);
        }
      }
    }

    if(nextAttrs.size) {
      this.addToEvalOrder(nextAttrs, results);
    }
  }
}

export interface AttrTemplateProps {
  readonly name: string;
  readonly calc?: string;
  readonly valid?: string;
  readonly type: string;
  readonly mods: Record<string, string>;
  readonly mutable?: boolean;
}

export class AttrTemplate extends AttrBase {
  public readonly owner: EntityTemplate;

  constructor(owner: EntityTemplate, name: string, json: AttrTemplateProps) {
    super(owner, name, json.type as ExprType);

    if(json.calc) {
      if(json.valid) {
        throw new MalformedTemplateError(`Attribute "${this.name}" has both "calc" and "valid" set: ${JSON.stringify(json)}`);
      }
      if(json.mutable) {
        throw new MalformedTemplateError(`Attribute "${this.name}" has "calc" set but is mutable: ${JSON.stringify(json)}`);
      }
      this.calc = ExprParse.parse(json.calc);
      const calcType = this.calc.type();
      if(calcType !== ExprType.Any && calcType !== this.type) {
        throw new AttributeTypeError(`Attribute "${this.name}" has "calc" formula returning wrong type (expected ${this.type}, got ${calcType})`);
      }
      this.mutable = false;
    } else {
      if(json.valid) {
        this.valid = ExprParse.parse(json.valid);
        const validType = this.calc.type();
        if(validType !== ExprType.Any && validType !== this.type) {
          throw new AttributeTypeError(`Attribute "${this.name}" has "valid" formula returning wrong type (expected ${this.type}, got ${validType})`);
        }
      }
      this.mutable = !!json.mutable;
    }
  }

  private addDependency(id: string) {
    const attr = this.owner.__attrs[id];
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
