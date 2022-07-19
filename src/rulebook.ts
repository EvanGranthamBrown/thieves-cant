import { EntityTemplate, EntityTemplateProps } from './entity-template';

export class Rulebook {
  public templates: Record<string, EntityTemplate>;

  constructor(json: Record<string, any>) {
    this.templates = {};
    const raw = new RawRulebook(json);
    for(let name in raw.templates) {
      const rawJson = raw.templates[name].json;
      this.templates[name] = new EntityTemplate(name, {
        attrs: rawJson.attrs || {},
        includes: rawJson.includes || [],
      });
    }
  }
}

interface Inclusion {
  includer: RawTemplate;
  includee: RawTemplate;
  resolved: boolean;
}

class RawTemplate {
  public owner: RawRulebook;
  public json: Record<string, any>;
  public includes: Set<Inclusion>;
  public includedBy: Set<Inclusion>;
  public name: string;
  public resolved: boolean;

  constructor(owner: RawRulebook, name: string, json: any) {
    this.owner = owner;
    this.name = name;
    this.json = json;
    this.resolved = !(json.includes && json.includes.length);
    this.includes = new Set<Inclusion>();
    this.includedBy = new Set<Inclusion>();
  }

  public addIncludes() {
    if(!this.json.includes) {
      return;
    }
    for(let targetName of this.json.includes as String[]) {
      this.addInclude(this.owner.templates[targetName]);
    }
  }

  private addInclude(target: RawTemplate) {
    const inclusion = {
      includer: this,
      includee: target,
      resolved: false,
    };
    this.includes.add(inclusion);
    target.includedBy.add(inclusion);
  }

  public readyToResolve() {
    for(let inclusion of this.includes) {
      if(!inclusion.includee.resolved) {
        return false;
      }
    }
    return true;
  }

  public resolve() {
    for(let inclusion of this.includes) {
      let targetJson = inclusion.includee.json;

      if(targetJson.includes) {
        for(let subinclude of targetJson.includes) {
          if(!this.json.includes.includes(subinclude)) {
            this.json.includes.push(subinclude);
          }
        }
      }

      if(targetJson.attrs) {
        if(!this.json.attrs) {
          this.json.attrs = {};
        }
        for(let prop in targetJson.attrs) {
          if(this.json.attrs[prop] === undefined) {
            this.json.attrs[prop] = JSON.parse(JSON.stringify(targetJson.attrs[prop]));
          } else {
            for(let key in targetJson.attrs[prop]) {
              if(this.json.attrs[prop][key] === undefined) {
                this.json.attrs[prop][key] = targetJson.attrs[prop][key];
              }
            }
          }
        }
      }

      if(targetJson.mods) {
        if(!this.json.mods) {
          this.json.mods = {};
        }
        for(let prop in targetJson.mods) {
          if(this.json.mods[prop] === undefined) {
            this.json.mods[prop] = JSON.parse(JSON.stringify(targetJson.mods[prop]));
          }
        }
      }

      this.resolved = true;
    }
  }
}

// Takes raw rulebook JSON, and resolves all the include statements.
class RawRulebook {
  public readonly templates: Record<string, RawTemplate>;

  constructor(json: Record<string, any>) {
    this.templates = {};
    for(let name in json) {
      this.templates[name] = new RawTemplate(this, name, JSON.parse(JSON.stringify(json[name])));
    }

    for(let name in this.templates) {
      const template = this.templates[name];
      if(template.json.includes) {
        for(let includeName of template.json.includes) {
          const inclusion = {
            includer: template,
            includee: this.templates[includeName],
            resolved: false,
          };
          template.includes.add(inclusion);
          this.templates[includeName].includedBy.add(inclusion);
        }
      }
    }

    let resolved = new Set<any>();
    for(let name in this.templates) {
      const template = this.templates[name];
      if(!template.includes.size) {
        resolved.add(template);
      }
    }

    this.resolveIncludes(resolved);
  }

  resolveIncludes(resolved: Set<any>) {
    let nextResolved = new Set<any>();

    for(let template of resolved) {
      for(let inclusion of template.includedBy) {
        const includer = inclusion.includer;
        if(includer.readyToResolve()) {
          includer.resolve();
          nextResolved.add(includer);
        }
      }
    }

    if(nextResolved.size) {
      this.resolveIncludes(nextResolved);
    }
  }
}
