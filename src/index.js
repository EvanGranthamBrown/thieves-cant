import * as DataParsers from "./data-parsers";

export function createTemplate(json) {
  for(const prop in json.data) {
    const defn = json.data[prop];
    if(!defn.type) {
      throw new Error(`Missing type for data property "${prop}".`);
    }
    if(!DataParsers[defn.type]) {
      throw new Error(`Unknown type for data property "${prop}": "${defn.type}"`);
    }
  }

  // dynamically create a class which can be instantiated with new
  return function TemplateClass(data) {
    for(const prop in json.data) {
      const defn = json.data[prop];
      if(data[prop] === undefined) {
        if(!defn.default) {
          throw new Error(`Missing value for data property "${prop}", and no default found.`);
        } else {
          this[prop] = defn.default;
        }
      } else {
        this[prop] = DataParsers[defn.type](data[prop], prop);
      }
    }
  };
}
