import { EntityTemplate, EntityTemplateProps } from './entity-template';
import { MixinDependGraph, MixinDependNode } from './mixin-depend-graph';

export const RulebookEntry = MixinDependNode(class {
  public name: string;
  public rulebook: Rulebook;
  public baseJson: Record<string, any>;
  public json: Record<string, any> | undefined;
  public template: EntityTemplate | undefined;

  constructor(rulebook, name, baseJson) {
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
    this.rulebook.rebuild();
  }

  // Set the baseJson and make sure it contains all the props we expect.
  __setBaseJson(baseJson) {
    this.baseJson = JSON.parse(JSON.stringify(baseJson));
    if(!this.baseJson.attrs) {
      this.baseJson.attrs = {};
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
  // includes this entry.
  __teardown(torndown: Set<RulebookEntry> = new Set<RulebookEntry>()) {
    if(torndown.has(this)) {
      return;
    }
    this.json = undefined;
    this.template = undefined;

    // Remove all of this entry's existing dependencies.
    for(let depend of this.depends) {
      this.removeDepend(depend.to);
    }

    torndownEntries.add(this);

    // Anything which includes this entry must also teardown.
    // We pass a list of torndown entries in case of circular dependencies.
    for(let depend of this.dependedBy) {
      depend.from.__teardown(torndown);
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

  // Import the JSON from all included entries into the main JSON, then
  // construct an EntityTemplate from the result.
  __rebuild() {
    for(let depend of this.depends) {
      this.__include(depend.to.json);
    }
    this.template = new EntityTemplate(this.name, this.json);
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


export const Rulebook = MixinDependGraph(RulebookEntry, class {
  public name: string;
  public entries: Record<string, RulebookEntry>;

  constructor(name: string, json: Record<string, any>) {
    this.name = name;
    this.entries = {};
    this.onDependGraphReady(() => {
      for(let name in json) {
        this.addEntry(name, new RulebookEntry(this, name, json[name]));
      }
      this.rebuild();
    });
  }

  addEntry(name: string, entry: RulebookEntry) {
    this.entries[name] = entry;
    this.addDependNode(entry);
  }

  rebuild() {
    for(let name in this.entries) {
      const entry = this.entries[name];
      if(!entry.template) {
        // __reset will reconstruct the entry's list of includes,
        // and replace its json with its baseJson.
        entry.__reset();
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