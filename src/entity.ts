import { ExprType, typeFromListType } from './expr-base';
import { EntityBase, AttrBase, Dependency } from './entity-base';
import { EntityTemplate, AttrTemplate } from './entity-template';
import { AttributeTypeError } from './errors';

export class Entity extends EntityBase {
  constructor(template: EntityTemplate, data: Record<string, any>) {
    super(template.__rulebook, template.__name);
    for(let prop in template.__attrs) {
      this.__attrs[prop] = new Attr(this, template.__attrs[prop], data[prop]);
    }
    for(let prop in template.__attrs) {
      this.__attrs[prop].cloneDependencies(template.__attrs[prop]);
    }
    for(let prop in template.__attrs) {
      this.__attrs[prop].initialize(data);
    }
    for(let include in template.__includes) {
      this.__includes.add(include);
    }
  }
}

export class Attr extends AttrBase {
  public value: any;
  public __recomputing: boolean = false;

  constructor(owner: Entity, template: AttrTemplate) {
    super(owner, template.name, template.type);

    this.calc = template.calc;
    this.valid = template.valid;
    this.mods = template.mods;
    this.mutable = template.mutable;
    this.entityTypes = template.entityTypes;

    const self = this;
    if(template.mutable) {
      Object.defineProperty(this.owner, template.name, {
        get() { return self.value; },
        set(value: any) {
          self.validate(value, self.type);
          self.value = value;
          self.recompute();
        },
        enumerable: true,
      });
    } else {
      Object.defineProperty(this.owner, template.name, {
        get() { return self.value; },
        enumerable: true,
      });
    }
  }

  validate(val: any, typ: ExprType) {
    let converted: any = undefined;
    let listType: ExprType;

    switch(typ) {
      case ExprType.Any: {
        converted = val;
        break; // no checks here
      }
      case ExprType.Number: {
        converted = Number(val);
        if(isNaN(converted)) {
          throw new AttributeTypeError(`Can't put "${val}" in "${this.name}" (requires ${typ}).`);
        }
        break;
      }
      case ExprType.Text: {
        if(typeof val !== 'string' && typeof val !== 'number' && typeof val !== 'boolean') {
          throw new AttributeTypeError(`Can't put "${val}" in "${this.name}" (requires ${typ}).`);
        }
        converted = String(val);
        break;
      }
      case ExprType.Entity: {
        if(!(val instanceof Entity)) {
          throw new AttributeTypeError(`Can't put "${val}" in "${this.name}" (requires ${typ}).`);
        }
        converted = val;
        let matched = false;
        for(let entityType of this.entityTypes) {
          if(converted.__is(entityType)) {
            matched = true;
          }
        }
        if(!matched) {
          throw new AttributeTypeError(`Can't put "${val.__name}" in "${this.name}" (must be ${this.entityTypes.length > 1 ? ('one of ' + this.entityTypes.join(', ')) : this.entityTypes[0]}).`);
        }
        break;
      }
      case ExprType.TrueFalse: {
        if(val !== true && val !== false) {
          if(val === "true" || val === "false") {
            throw new AttributeTypeError(`Can't use the text "${val}" in ${this.name} (requires logical ${typ}).`);
          }
          throw new AttributeTypeError(`Can't put "${val}" in "${this.name}" (requires ${typ}).`);
        }
        converted = val;
        break;
      }
      case ExprType.NumberList:
      case ExprType.TextList:
      case ExprType.EntityList:
      case ExprType.TrueFalseList: {
        const arr = Array.isArray(val) ? val : [val];
        // validate each item in the list, then we're done
        for(let item of arr) {
          this.validate(item, typeFromListType(typ));
        }
        return;
      }
      default: {
        throw new Error(`Unknown ExprType: ${typ}`);
      }
    }

    if(this.valid) {
      // apply custom validation here
    }
  }

  public cloneDependencies(template: AttrTemplate) {
    for(let templateDep of template.depends) {
      const attr = this.owner.__attrs[templateDep.to.name];
      this.addDepend(attr);
    }
  }

  public initialize(data: Record<string, any>) {
    if(this.calc) {
      this.recompute();
    } else if(data[this.name] !== undefined) {
      this.value = data[this.name];
    } else {
      switch(this.type) {
        case ExprType.Number: {
          this.value = 0;
          break;
        }
        case ExprType.Text: {
          this.value = '';
          break;
        }
        case ExprType.Entity: {
          this.value = null;
          break;
        }
        case ExprType.TrueFalse: {
          this.value = false;
          break;
        }
        case ExprType.NumberList:
        case ExprType.TextList:
        case ExprType.EntityList:
        case ExprType.TrueFalseList: {
          this.value = [];
          break;
        }
        default: {
          this.value = null;
        }
      }
    }
  }

  public recompute() {
    if(this.__recomputing) {
      // In case of cyclic dependencies.
      return;
    }
    this.__recomputing = true;
    try {
      if(this.calc) {
        this.value = this.calc.eval({ vals: this.owner });
      }
      for(let depend of this.dependedBy) {
        depend.from.recompute();
      }
    } finally {
      this.__recomputing = false;
    }
  }
}
