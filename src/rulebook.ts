import { EntityTemplate, EntityTemplateProps } from './entity-template';
import { Entity } from './entity';
import { MixinDependGraph, MixinDependNode } from './mixin-depend-graph';
import { InternalError, MalformedTemplateError } from './errors';

export const RulebookEntry = MixinDependNode(class {
  public name: string;
  public rulebook: Rulebook;
  public baseJson: Record<string, any>;
  public json: Record<string, any> | undefined;
  public template: EntityTemplate | undefined;

  constructor(rulebook: Rulebook, name: string, baseJson: Record<string, any>) {
    this.name = name;
    this.rulebook = rulebook;
    this.__setBaseJson(baseJson);
  }

  // Only call modify() after the rulebook is done building. It will update the
  // baseJson, tear down this entry and every entry that depends on it, then do a
  // rebuild on the rulebook.
  modify(newBaseJson: Record<string, any>) {
    this.__setBaseJson(newBaseJson);
    this.__teardown();
    this.rulebook.__rebuild();
  }

  // Set the baseJson and make sure it contains all the props we expect.
  __setBaseJson(baseJson) {
    this.baseJson = JSON.parse(JSON.stringify(baseJson));
    if(!this.baseJson.attrs) {
      this.baseJson.attrs = {};
    }
    for(const prop in this.baseJson.attrs) {
      const attr = this.baseJson.attrs[prop];
      for(const key of ['entityTypes', 'reverseEntityTypes']) {
        if(attr[key] !== undefined && !Array.isArray(attr[key])) {
          attr[key] = [attr[key]];
        }
      }
    }
    if(!this.baseJson.mods) {
      this.baseJson.mods = {};
    }
    if(!this.baseJson.includes) {
      this.baseJson.includes = [];
    }
  }

  // Tear down the constructed JSON and template for this entry (typically
  // because the baseJson changed). Then do the same for each entry that
  // includes this entry or is attribute-linked to it.
  __teardown(torndown: Set<RulebookEntry> = new Set<RulebookEntry>()) {
    if(torndown.has(this)) {
      return;
    }

    // Make a list of other entries we're gonna have to get rid of.
    const alsoTeardown = new Set<RulebookEntry>();

    if(this.json) {
      for(let prop in this.json.attrs) {
        const attr = this.json.attrs[prop];
        if(attr.type === 'entity' || attr.type === 'entity list') {
          for(let target of attr.entityTypes) {
            alsoTeardown.add(this.rulebook.entries[target]);
          }
        }
      }
    }

    this.json = undefined;
    this.template = undefined;

    // Remove all of this entry's existing dependencies.
    for(let depend of this.depends) {
      this.removeDepend(depend.to);
    }

    // This is now torn down. If you encounter it again, ignore it.
    torndown.add(this);

    // Anything which includes this entry must also be torn down.
    for(let depend of this.dependedBy) {
      alsoTeardown.add(depend.from);
    }

    // Now spread the wealth to everyone else on the teardown list.
    for(let target of alsoTeardown) {
      target.__teardown(torndown);
    }
  }

  // Copy the baseJson into the main JSON for this entry, and reconstruct
  // its dependencies from the baseJson.
  __reset() {
    this.json = JSON.parse(JSON.stringify(this.baseJson));
    for(let include of this.baseJson.includes) {
      this.addDepend(this.rulebook.entries[include]);
    }
  }

  // Create the reverse of each entity-typed attribute, if it doesn't already
  // exist.
  __createReverseAttrs() {
    for(const prop in this.baseJson.attrs) {
      const attr = this.baseJson.attrs[prop];
      if(attr.type === 'entity' || attr.type === 'entity list') {
        if(!attr.reverse) {
          throw new MalformedTemplateError(`${this.name}.${prop} has type ${attr.type} but is missing a "reverse" property.`);
        }
        for(let target of attr.entityTypes) {
          const targetAttrs = this.rulebook.entries[target].json.attrs;
          if(targetAttrs[attr.reverse] === undefined) {
            targetAttrs[attr.reverse] = {};
          }
          this.__mergeReverseAttr(target, prop, attr, targetAttrs[attr.reverse]);
        }
      }
    }
  }

  __mergeReverseAttr(target, name, attr, reverseAttr) {
    const required = {
      type: attr.reverseType,
      entityTypes: attr.reverseEntityTypes,
      reverse: name,
    };
    if(attr.calc) {
      // the reverse of a calculated attribute must be immutable.
      required.mutable = false;
      if(reverseAttr.calc) {
        throw new MalformedTemplateError(`${this.name}.${prop} is calculated; it cannot also specify a calculated attribute as its reverse.`);
      }
    }
    const defaults = {
      type: 'entity',
      entityTypes: [this.name],
      mutable: true,
    };
    for(let prop of ['type', 'entityTypes', 'reverse', 'mutable']) {
      if(reverseAttr[prop] === undefined) {
        reverseAttr[prop] = (required[prop] === undefined) ? defaults[prop] : required[prop];
      } else {
        if(required[prop] !== reverseAttr[prop] && required[prop] !== undefined) {
          throw new MalformedTemplateError(`${this.name}.${prop} sets reverse ${prop} to ${JSON.stringify(required[prop])}, but ${target} specifies ${JSON.stringify(reverseAttr[prop])}.`);
        }
      }
    }
  }

  // Import the JSON from all included entries into the main JSON, then
  // construct an EntityTemplate from the result.
  __rebuild() {
    for(let depend of this.depends) {
      this.__include(depend.to.json);
    }
    this.template = new EntityTemplate(this.rulebook, this.name, this.json);
  }

  __include(json: Record<string, any>) {
    for(let name of json.includes) {
      if(!this.json.includes.includes(name)) {
        this.json.includes.push(name);
      }
    }
    for(let prop in json.mods) {
      if(this.json.mods[prop] === undefined) {
        this.json.mods[prop] = json.mods[prop];
      }
    }
    for(let name in json.attrs) {
      if(this.json.attrs[name] === undefined) {
        this.json.attrs[name] = JSON.parse(JSON.stringify(json.attrs[name]));
      } else {
        for(let key in json.attrs[name]) {
          if(this.json.attrs[name][key] === undefined) {
            this.json.attrs[name][key] = JSON.parse(JSON.stringify(json.attrs[name][key]));
          }
        }
      }
    }
  }
});

export const Rulebook = MixinDependGraph(class {
  public name: string;
  public entries: Record<string, RulebookEntry>;

  constructor(name: string, json: Record<string, any>) {
    // Mixin disables TypeScript type checking. Sad. We have to do it ourselves.
    if(typeof name !== "string" || typeof json !== "object" || json === null) {
      throw new InternalError(`Invalid params for Rulebook: Expected (string, object), got: (${typeof name}, ${typeof json})`);
    }
    this.name = name;
    this.entries = {};
    this.onDependGraphReady(() => {
      for(let name in json) {
        const entry = new RulebookEntry(this, name, json[name]);
        this.entries[name] = entry;
        this.addDependNode(entry);
      }
      this.__rebuild();
    });
  }

  public addEntry(name: string, json: Record<string, any>) {
    const entry = new RulebookEntry(this, name, json);
    this.entries[name] = entry;
    this.addDependNode(entry);
    this.__rebuild();
  }

  public removeEntry(name: string) {
    if(!this.entries[name]) {
      return;
    }
    this.entries[name].__teardown();
    this.removeDependNode(this.entries[name]);
    delete this.entries[name];
    this.__rebuild();
  }

  public create(name: string, data: Record<string, any> = {}) {
    return new Entity(this.entries[name].template, data);
  }

  __rebuild() {
    for(let name in this.entries) {
      const entry = this.entries[name];
      if(!entry.template) {
        // __reset will reconstruct the entry's list of includes,
        // and replace its json with its baseJson.
        entry.__reset();
      }
    }

    for(let name in this.entries) {
      const entry = this.entries[name];
      if(!entry.template) {
        // Generate our reverse attributes in the json of other
        // entries.
        entry.__createReverseAttrs();
      }
    }

    // Ensure we don't have a cycle of includes anywhere.
    const cycle = this.findDependCycle();
    if(cycle) {
      throw new CircularDependencyError(`Rulebook "${this.name}" can't build: "${cycle.map((x) => x.name).join(" includes ")}".`)
    }

    // Determine the dependency order of the includes, then build the
    // entries.
    const entriesInOrder = this.dependsInEvalOrder();
    for(let entry of entriesInOrder) {
      if(!entry.template) {
        entry.__rebuild();
      }
    }
  }
});