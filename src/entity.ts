import { ExprType, typeFromListType } from './expr-base';
import { EntityBase, AttrBase, Dependency } from './entity-base';
import { EntityTemplate, AttrTemplate } from './entity-template';
import { AttributeTypeError } from './errors';

let entityId = 1;

export class Entity extends EntityBase {
  public __id: number;
  public __dirty: boolean;

  constructor(template: EntityTemplate, data: Record<string, any>) {
    super(template.__rulebook, template.__name);
    this.__id = entityId;
    entityId++;
    this.__dirty = false;
    for(let include of template.__includes) {
      this.__includes.add(include);
    }
    for(let prop in template.__attrs) {
      this.__attrs[prop] = new Attr(this, template.__attrs[prop], data[prop]);
    }
    for(let prop in template.__attrs) {
      this.__attrs[prop].cloneDependencies(template.__attrs[prop]);
    }
    // use the eval order established in the template; saves time
    for(let attr of template.dependsInEvalOrder()) {
      this.__attrs[attr.name].initialize(data);
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
    let output = this.__dirty;

    for(const prop in this.__attrs) {
      const attr = this.__attrs[prop];
      if(attr.calc) {
        output = attr.__recompute() || output;
      }
    }

    this.__dirty = false;
    return output;
  }
}

export class Attr extends AttrBase {
  public value: any;

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

  assignNewValue(value: any, entityCascade: boolean = true): boolean {
    if(this.__frozen) {
      // We got hit by a cascading recompute. Disregard.
      return false;
    }

    let newValue = this.validate(value, this.type);
    if(this.equals(newValue)) {
      // No change was made.
      return false;
    }

    let linkedEntities: Set<Entity>;

    // The new value is legit different, and it is valid.
    if(entityCascade) {
      // Collect a list of linked entities that might be affected.
      linkedEntities = this.owner.__linkedEntities();

      // If the new value is an entity or list of entities, put them in too.
      if(this.isEntityTyped()) {
        for(let entity of this.asArray(newValue)) {
          linkedEntities.add(entity);
        }
      }
    }

    // Get a list of all our old reverse attributes.
    const oldReverses = this.__reverseAttrs();

    // Now apply the change. Freeze it so it can't be changed by cascading recomputes.
    this.value = newValue;
    this.__frozen = true;

    // Recompute everything that depends on this.
    for(let depend of this.dependedBy) {
      depend.from.__recompute();
    }

    // Get a list of all our new reverse attributes.
    const newReverses = this.__reverseAttrs();

    // Remove ourself from the old reverses.
    for(let attr of oldReverses) {
      attr.__reverseRemove(this.owner);
    }

    // Add ourself to the new reverses.
    for(let attr of newReverses) {
      attr.__reverseAdd(this.owner);
    }

    // Now have all the linked entities recompute.
    if(entityCascade) {
      this.__cascadingRecompute(linkedEntities);
    }

    // Finally, unfreeze.
    this.__frozen = false;

    // A change was made.
    return true;
  }

  // We do a breadth-first recompute to avoid problems with branching cascades.
  public __cascadingRecompute(targets: Set<Entity>) {
    let currentTargets = targets;

    while(currentTargets.size) {
      const nextTargets = new Set<Entity>();
      for(let target of currentTargets) {
        if(target.__recompute()) {
          // Recompute caused this entity to change. Add its links to the
          // recompute list.
          for(let nextTarget of target.__linkedEntities()) {
            nextTargets.add(nextTarget);
          }
        }
      }

      currentTargets = nextTargets;
    }
  }

  public __reverseRemove(entity: Entity) {
    if(this.type === ExprType.Entity && this.value === entity) {
      this.value = null;
      this.owner.__dirty = true;
    } else if(this.type === ExprType.EntityList && this.value) {
      const idx = this.value.indexOf(entity);
      if(idx >= 0) {
        this.value.splice(idx, 1);
        this.owner.__dirty = true;
      }
    }
  }

  public __reverseAdd(entity: Entity) {
    if(this.type === ExprType.Entity && this.value !== entity) {
      if(this.value !== undefined && this.value !== null) {
        const doubleReverse = this.__reverseAttrs()[0];
        doubleReverse.owner.__dirty = true;
        doubleReverse.__reverseRemove(this.owner);
      }
      this.value = entity;
    } else if(this.type === ExprType.EntityList) {
      if(this.value === undefined) {
        this.value = [entity];
      } else if(!this.value.includes(entity)) {
        this.value.push(entity);
      }
    }
    this.owner.__dirty = true;
  }

  public __reverseAttrs() {
    if(!this.isEntityTyped() || this.value === null || this.value === undefined) {
      return [];
    }
    return this.asArray(this.value).map((x) => x.__attrs[this.reverse]);
  }

  public __recompute(): boolean {
    if(this.calc) {
      const oldValue = this.value;
      const newValue = this.calc.eval({ vals: this.owner });
      const output = this.assignNewValue(newValue, false);
      return output;
    }
    return false;
  }

  public isEntityTyped() {
    return this.type === ExprType.Entity || this.type === ExprType.EntityList;
  }

  public asArray(val) {
    return Array.isArray(val) ? val : [val];
  }

  public validate(val: any, typ: ExprType) {
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
      this.__recompute();
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
