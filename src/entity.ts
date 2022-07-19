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
    const evalOrder = this.computeEvalOrder();
    for(let attr of evalOrder) {
      attr.initialize(data);
    }
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

    return results;
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
