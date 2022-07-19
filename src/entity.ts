import { EntityBase, AttrBase, Dependency } from './entity-base';
import { EntityTemplate, AttrTemplate } from './entity-template';

export class Entity extends EntityBase {
  constructor(template: EntityTemplate, data: Record<string, any>) {
    super(template.__name);
    for(let prop in template.__attrs) {
      this.__attrs[prop] = new Attr(this, template.__attrs[prop], data[prop]);
    }
    for(let prop in template.__attrs) {
      this.__attrs[prop].cloneDependencies(template.__attrs[prop]);
    }
    for(let attr of template.__evalOrder) {
      this.__attrs[attr.name].initialize(data);
    }
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

    const self = this;
    if(template.mutable) {
      Object.defineProperty(this.owner, template.name, {
        get() { return self.value; },
        set(value: any) {
          self.value = value;
          for(let depend of self.reverseDepends) {
            depend.attr.recompute();
          }
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

  public cloneDependencies(template: AttrTemplate) {
    for(let templateDep of template.depends) {
      const attr = this.owner.__attrs[templateDep.attr.name];
      const dep = { attr, reverseAttr: this, marked: false };
      this.depends.push(dep);
      attr.reverseDepends.push(dep);
    }
  }

  public initialize(data: Record<string, any>) {
    if(this.calc) {
      this.recompute();
    } else {
      this.value = data[this.name];
    }
  }

  public recompute() {
    if(this.calc) {
      this.value = this.calc.eval({ vals: this.owner });
    }
  }
}
