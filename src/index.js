import * as DataParsers from './data-parsers';
import { parse, validate, evaluate } from './expressions';

export function createTemplate(json) {
  const defns = {};
  const computed = {};

  for(const prop in json.data) {
    const defn = json.data[prop];
    if(!defn.type) {
      throw new Error(`Missing type for data property "${prop}".`);
    }
    if(!DataParsers[defn.type]) {
      throw new Error(`Unknown type for data property "${prop}": "${defn.type}"`);
    }
    defns[prop] = { type: defn.type, parseData: DataParsers[defn.type] };
    if(defn.default) {
      const parsed = parse(defn.default);
      if(validate(json, parsed) !== defn.type) {
        throw new Error(`Invalid default value for data property "${prop}": ${defn.default}" may not evaluate to type "${defn.type}"`);
      }
      defns[prop].default = parsed;
    }
  }

  // for(const prop in json.computed) {
  //   const parsed = parse(json.computed[prop]);
  //   computed[prop] = {
  //     parsed,
  //     type: validate(json, parsed),
  //   };
  // }

  // dynamically create a class which can be instantiated with new
  return function TemplateClass(data) {
    for(const prop in defns) {
      const defn = defns[prop];
      if(data[prop] === undefined) {
        if(!defn.default) {
          throw new Error(`Missing value for data property "${prop}", and no default found.`);
        } else {
          this[prop] = evaluate(data, defn.default);
        }
      } else {
        this[prop] = defn.parseData(data[prop], prop);
      }
    }
  };
}
