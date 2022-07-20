import * as ExprParse from './expr-parse';

import { ExprType } from './expr-base';
import { EntityBase, AttrBase } from './entity-base';

import {
  AttributeTypeError,
  CircularDependencyError,
  ExpressionParseError,
  MalformedTemplateError,
} from './errors';

export interface EntityTemplateProps {
  readonly attrs?: Record<string, AttrTemplateProps>;
  readonly includes?: Array<String>;
}

export class EntityTemplate extends EntityBase {
  constructor(rulebook: any, name: string, props: EntityTemplateProps) {
    super(rulebook, name);

    if(props.includes) {
      for(let include of props.includes) {
        this.__includes.add(include);
      }
    }

    for(let prop in props.attrs) {
      this.__attrs[prop] = new AttrTemplate(this, prop, props.attrs[prop]);
    }
    for(let prop in this.__attrs) {
      this.__attrs[prop].computeDependencies();
    }
    this.findDependCycle();
    this.dependsInEvalOrder();
  }
}

export interface AttrTemplateProps {
  readonly name: string;
  readonly calc?: string;
  readonly valid?: string;
  readonly type: string;
  readonly entityTypes?: Array<string> | string;
  readonly mods: Record<string, string>;
  readonly mutable?: boolean;
  readonly reverse?: string;
}

export class AttrTemplate extends AttrBase {
  public readonly owner: EntityTemplate;

  constructor(owner: EntityTemplate, name: string, json: AttrTemplateProps) {
    super(owner, name, json.type as ExprType);

    if(json.calc) {
      if(json.valid) {
        throw new MalformedTemplateError(`Attribute "${owner.__name}.${this.name}" has both "calc" and "valid" set.`);
      }
      if(json.mutable) {
        throw new MalformedTemplateError(`Attribute "${owner.__name}.${this.name}" has "calc" set but is mutable.`);
      }
      this.calc = ExprParse.parse(json.calc);
      const calcType = this.calc.type();
      if(calcType !== ExprType.Any && calcType !== this.type) {
        throw new AttributeTypeError(`Attribute "${owner.__name}.${this.name}" has "calc" formula returning wrong type (expected ${this.type}, got ${calcType}).`);
      }
      this.mutable = false;
    } else {
      if(json.valid) {
        this.valid = ExprParse.parse(json.valid);
        const validType = this.calc.type();
        if(validType !== ExprType.Any && validType !== this.type) {
          throw new AttributeTypeError(`Attribute "${owner.__name}.${this.name}" has "valid" formula returning wrong type (expected ${this.type}, got ${validType}).`);
        }
      }
      if(this.type === ExprType.Entity || this.type === ExprType.EntityList) {
        if(!json.entityTypes) {
          throw new AttributeTypeError(`Attribute "${owner.__name}.${this.name}" is type ${this.type} but does not specify entityTypes.`);
        }
        if(typeof json.entityTypes === 'string') {
          this.entityTypes = [json.entityTypes];
        } else if(Array.isArray(json.entityTypes)) {
          this.entityTypes = json.entityTypes;
        } else {
          throw new AttributeTypeError(`Attribute "${owner.__name}.${this.name}" has invalid entityTypes (expected list of template names, got: "${JSON.stringify(json.entityTypes)}").`);
        }
        for(let entityType of this.entityTypes) {
          if(typeof entityType !== "string") {
            throw new AttributeTypeError(`Attribute "${owner.__name}.${this.name}" contains invalid entityType (expected template name, got: "${JSON.stringify(entityType)}").`);
          }
          if(owner.rulebook && !owner.entries[entityType]) {
            throw new AttributeTypeError(`Attribute "${owner.__name}.${this.name}" contains unknown entityType (could not find "${entityType}" in ${owner.rulebook.name}).`);
          }
        }
      }
      this.reverse = json.reverse;
      this.mutable = (json.mutable === false) ? false : true;
    }
  }

  private addDependency(id: string) {
    const attr = this.owner.__attrs[id];
    if(attr === undefined) {
      throw new ExpressionParseError(`Property "${id}" is not defined on entity "${this.owner.name}".`);
    }
    this.addDepend(attr);
  }

  public computeDependencies() {
    let ids = new Set<string>();
    if(this.calc) {
      for(const id of this.calc.identifiers()) {
        // When computing template dependencies, we only look at the first identifier in a member
        // expression.

        // Example: You have a "container" template, with an "inventory" attribute (an list of items) and
        // an "encumbrance" attribute that is calculated as "sum(inventory.weight)".

        // When we get to parsing "inventory.weight", we flag "encumbrance" as having a dependency on
        // "inventory", because that is an attribute of this same container. However, we are not
        // concerned with ".weight", because that reaches into another entity.
        ids.add(id.split('.')[0]);
      }
    }
    for(const id of ids) {
      const attr = this.owner.__attrs[id];
      if(attr === undefined) {
        throw new ExpressionParseError(`Property "${id}" is not defined on entity "${this.owner.name}".`);
      }
      // from DependNode
      this.addDepend(attr);
    }
  }
}
