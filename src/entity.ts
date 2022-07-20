import { ExprType, typeFromListType } from './expr-base';
import { EntityBase, AttrBase, Dependency } from './entity-base';
import { EntityTemplate, AttrTemplate } from './entity-template';
import { AttributeTypeError } from './errors';

let entityId = 1;

export class Entity extends EntityBase {
  public __id;

  constructor(template: EntityTemplate, data: Record<string, any>) {
    super(template.__rulebook, template.__name);
    this.__id = entityId;
    entityId++;
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

  public __describe() {
    return `(${this.__name} id=${this.__id})`;
  }

  public __linkedEntities() {
    const output = new Set<Entity>();
    for(const attr of this.__attrList()) {
      if(attr.type === ExprType.Entity) {
        if(attr.value) {
          output.add(attr.value);
        }
      } else if(attr.type === ExprType.EntityList) {
        if(attr.value !== undefined) {
          for(let item of attr.value) {
            output.add(item);
          }
        }
      }
    }
    return output;
  }

  public __recompute() {
    for(const attr of this.__attrList()) {
      if(attr.calc) {
        attr.recompute();
      }
    }
  }
}

export class Attr extends AttrBase {
  public value: any;
  public __recomputing: boolean = false;
  public __dirty: boolean = false;

  constructor(owner: Entity, template: AttrTemplate) {
    super(owner, template.name, template.type);

    this.calc = template.calc;
    this.valid = template.valid;
    this.mods = template.mods;
    this.mutable = template.mutable;
    this.entityTypes = template.entityTypes;
    this.reverse = template.reverse;

    const self = this;
    if(template.mutable) {
      Object.defineProperty(this.owner, template.name, {
        get() { return self.value; },
        set(value: any) { self.assignNewValue(value); },
        enumerable: true,
      });
    } else {
      Object.defineProperty(this.owner, template.name, {
        get() { return self.value; },
        enumerable: true,
      });
    }
  }

  assignNewValue(value: any, validation: boolean = true) {
    if(this.__frozen) {
      // We got hit by a cascading recompute. Disregard.
      return;
    }

    const oldValue = this.value;
    let newValue = value;
    if(validation) {
      newValue = this.validate(value, this.type);
    }
    if(this.equals(newValue)) {
      return;
    }

    // The new value is legit different, and it is valid.
    // Collect a list of linked entities that might be affected.
    const linkedEntities = this.owner.__linkedEntities();

    // If the new value is an entity or list of entities, put them in too.
    if(this.isEntityTyped()) {
      for(let entity of this.asArray(newValue)) {
        linkedEntities.add(entity);
      }
    }

    // Get a list of all our old reverse attributes.
    const oldReverses = this.reverseAttrs();

    // Now apply the change. Freeze it so it can't be changed by cascading recomputes.
    this.value = newValue;
    this.__frozen = true;

    // Recompute everything that depends on this.
    for(let depend of this.dependedBy) {
      depend.from.recompute();
    }

    // Get a list of all our new reverse attributes.
    const newReverses = this.reverseAttrs();

    // Remove ourselves from the old reverses.
    for(let attr of oldReverses) {
      attr.reverseRemove(this.owner);
    }

    // Add ourselves to the new reverses.
    for(let attr of newReverses) {
      attr.reverseAdd(this.owner);
    }

    // Now have all the linked entities recompute.
    for(let entity of linkedEntities) {
      entity.__recompute();
    }

    // Finally, unfreeze.
    this.__frozen = false;
  }

  public reverseRemove(entity) {
    if(this.type === ExprType.Entity && this.value === entity) {
      this.assignNewValue(null);
    } else if(this.type === ExprType.EntityList && this.value) {
      const idx = this.value.indexOf(entity);
      if(idx >= 0) {
        this.assignNewValue(this.value.slice(idx, 1));
      }
    }
  }

  public reverseAdd(entity) {
    if(this.type === ExprType.Entity && this.value !== entity) {
      this.assignNewValue(entity);
    } else if(this.type === ExprType.EntityList) {
      if(this.value === undefined) {
        this.assignNewValue([entity]);
      } else if(!this.value.includes(entity)) {
        this.assignNewValue([entity].concat(this.value));
      }
    }
  }

  public recompute() {
    if(this.calc) {
      this.assignNewValue(this.calc.eval({ vals: this.owner }));
    }
  }

  public isEntityTyped() {
    return this.type === ExprType.Entity || this.type === ExprType.EntityList;
  }

  public asArray(val) {
    return Array.isArray(val) ? val : [val];
  }

  public reverseAttrs() {
    if(!this.isEntityTyped() || this.value === null || this.value === undefined) {
      return [];
    }
    return this.asArray(this.value).map((x) => x.__attrs[this.reverse]);
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
        converted = [];
        // validate each item in the list.
        for(let item of arr) {
          converted.push(this.validate(item, typeFromListType(typ)));
        }
        // custom validation, if any, was handled on the item level. we're done.
        return converted;
      }
      default: {
        throw new Error(`Unknown ExprType: ${typ}`);
      }
    }

    if(this.valid) {
      // apply custom validation here
    }

    return converted;
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
      this.validate(data[this.name], this.type);
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

  public equals(val: any) {
    switch(this.type) {
      case ExprType.Number:
      case ExprType.Text:
      case ExprType.Entity:
      case ExprType.TrueFalse: {
        return (this.value === val);
      }
      case ExprType.NumberList:
      case ExprType.TextList:
      case ExprType.EntityList:
      case ExprType.TrueFalseList: {
        if(!Array.isArray(val)) {
          return (this.value.length === 1 && this.value[0] === val);
        }
        if(this.value.length !== val.length) {
          return false;
        }
        for(const i = 0; i < this.value.length; i++) {
          if(this.value[i] !== val[i]) {
            return false;
          }
        }
        return true;
      }
      default: {
        return false;
      }
    }
  }
}
